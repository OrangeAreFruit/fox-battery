// SPDX-FileCopyrightText: 2026 lanfanqie
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Battery Buddy 设置窗口（扩展管理器里的齿轮按钮打开）。
// 支持语言切换：跟随系统 / 中文 / English。

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const LIMIT_SCRIPT = '/usr/local/bin/battery-limit.sh';
const SCHEMA_ID = 'org.gnome.shell.extensions.battery-buddy';

// 未安装系统脚本时，引导用户安装的提示命令
const INSTALL_CMD =
    'git clone https://github.com/OrangeAreFruit/fox-battery.git && ' +
    'cd fox-battery/battery-limit && sudo bash install.sh';

// 充电上限选项（纯数字，无需翻译）
const OPTIONS = [
    {label: '100%', value: 0},
    {label: '90%', value: 90},
    {label: '80%', value: 80},
];

// 语言选项：value 为 GSettings 存储值，labels 为各语言下的显示名
const LANG_OPTIONS = [
    {value: 'auto', labels: {zh: '跟随系统', en: 'Follow system'}},
    {value: 'zh', labels: {zh: '中文', en: 'Chinese'}},
    {value: 'en', labels: {zh: 'English', en: 'English'}},
];

// 界面文案（简化）
const I18N = {
    zh: {
        pageTitle: '常规',
        groupTitle: '电池充电上限',
        groupDesc: '充到设定值后停止充电',
        limitTitle: '充电上限',
        limitSubtitle: '停止充电的百分比',
        statusTitle: '当前状态',
        langTitle: '语言',
        currentLimit: '当前上限',
        battery: '电量',
        stCharging: '充电中',
        stNotCharging: '未充电',
        stDischarging: '放电中',
        stFull: '已充满',
        setting: '正在设置',
        fail: '设置失败',
        missingTitle: '未安装充电控制脚本',
        missingDesc: '充电上限需要系统脚本，请先安装（见项目 README）',
        missingStatus: '请先安装充电控制脚本',
        copyCmd: '复制安装命令',
        copied: '已复制到剪贴板',
        wifiGroupTitle: 'WiFi 图标',
        wifiGroupDesc: '替换系统 WiFi 图标（切换即时生效）',
        wifiReplaceTitle: '启用自定义 WiFi 图标',
        wifiReplaceSubtitle: '使用狐狸风格的彩色 WiFi 图标',
    },
    en: {
        pageTitle: 'General',
        groupTitle: 'Battery Charge Limit',
        groupDesc: 'Stop charging at the set level',
        limitTitle: 'Charge limit',
        limitSubtitle: 'Stop charging percentage',
        statusTitle: 'Current status',
        langTitle: 'Language',
        currentLimit: 'Current limit',
        battery: 'Battery',
        stCharging: 'Charging',
        stNotCharging: 'Not charging',
        stDischarging: 'Discharging',
        stFull: 'Full',
        setting: 'Setting',
        fail: 'Failed to set',
        missingTitle: 'Charge limit script not installed',
        missingDesc: 'The charge limit needs a system script. Install it first (see the project README).',
        missingStatus: 'Install the charge limit script first',
        copyCmd: 'Copy install command',
        copied: 'Copied to clipboard',
        wifiGroupTitle: 'WiFi Icon',
        wifiGroupDesc: 'Replace the system WiFi icon (takes effect immediately)',
        wifiReplaceTitle: 'Enable custom WiFi icon',
        wifiReplaceSubtitle: 'Use a colorful fox-style WiFi icon',
    },
};

export default class BatteryBuddyPreferences extends ExtensionPreferences {
    async fillPreferencesWindow(window) {
        window.set_default_size(420, 400);
        window.set_size_request(420, 400);

        this._window = window;
        this._settings = this.getSettings(SCHEMA_ID);
        this._lang = this._resolveLang();
        this._page = null;
        this._refreshTimer = 0;
        this._applyDebounce = 0;
        this._applyChain = Promise.resolve();
        this._currentLimitText = '';

        window.connect('close-request', () => this._cleanup());

        await this._build();
    }

    _t(key) {
        return I18N[this._lang][key] ?? key;
    }

    // 解析生效语言：auto 时跟随系统 locale
    _resolveLang() {
        const pref = this._settings.get_string('language');
        if (pref === 'en' || pref === 'zh')
            return pref;
        const first = (GLib.get_language_names()[0] || '').toLowerCase();
        return first.startsWith('zh') ? 'zh' : 'en';
    }

    _cleanup() {
        if (this._refreshTimer) {
            GLib.source_remove(this._refreshTimer);
            this._refreshTimer = 0;
        }
        if (this._applyDebounce) {
            GLib.source_remove(this._applyDebounce);
            this._applyDebounce = 0;
        }
    }

    async _build() {
        this._cleanup();
        if (this._page) {
            this._window.remove(this._page);
            this._page = null;
        }
        const t = key => this._t(key);

        const page = new Adw.PreferencesPage({title: t('pageTitle')});

        const group = new Adw.PreferencesGroup({
            title: t('groupTitle'),
            description: t('groupDesc'),
        });

        const combo = new Adw.ComboRow({
            title: t('limitTitle'),
            subtitle: t('limitSubtitle'),
            model: new Gtk.StringList({
                strings: OPTIONS.map(o => o.label),
            }),
        });

        const statusRow = new Adw.ActionRow({
            title: t('statusTitle'),
            subtitle: '…',
        });

        group.add(combo);
        group.add(statusRow);

        // 检测系统脚本是否安装（prefs 是独立进程，同步检测无阻塞问题）
        this._scriptMissing =
            !Gio.File.new_for_path(LIMIT_SCRIPT).query_exists(null);
        if (this._scriptMissing) {
            // 未安装：禁用充电上限，引导用户先装脚本
            combo.sensitive = false;
            const installRow = new Adw.ActionRow({
                title: t('missingTitle'),
                subtitle: t('missingDesc'),
            });
            const copyBtn = new Gtk.Button({
                label: t('copyCmd'),
                valign: Gtk.Align.CENTER,
            });
            copyBtn.connect('clicked', () => {
                this._window.get_display()
                    .get_clipboard()
                    .set_text(INSTALL_CMD);
                copyBtn.label = t('copied');
            });
            installRow.add_suffix(copyBtn);
            group.add(installRow);
        }

        const langCombo = new Adw.ComboRow({
            title: t('langTitle'),
            model: new Gtk.StringList({
                strings: LANG_OPTIONS.map(o => o.labels[this._lang]),
            }),
        });
        langCombo.selected = LANG_OPTIONS.findIndex(
            o => o.value === this._settings.get_string('language'));

        const langGroup = new Adw.PreferencesGroup();
        langGroup.add(langCombo);

        // WiFi 图标替换开关
        const wifiGroup = new Adw.PreferencesGroup({
            title: t('wifiGroupTitle'),
            description: t('wifiGroupDesc'),
        });

        const wifiSwitch = new Adw.SwitchRow({
            title: t('wifiReplaceTitle'),
            subtitle: t('wifiReplaceSubtitle'),
            active: this._settings.get_boolean('replace-wifi-icon'),
        });

        wifiSwitch.connect('notify::active', () => {
            this._settings.set_boolean('replace-wifi-icon', wifiSwitch.active);
        });

        wifiGroup.add(wifiSwitch);

        page.add(group);
        page.add(wifiGroup);
        page.add(langGroup);
        this._window.add(page);
        this._page = page;

        // 语言切换：保存后立即重建界面
        langCombo.connect('notify::selected', () => {
            const opt = LANG_OPTIONS[langCombo.selected];
            if (!opt)
                return;
            this._settings.set_string('language', opt.value);
            this._lang = this._resolveLang();
            this._build();
        });

        if (this._scriptMissing) {
            // 未安装脚本：状态行显示引导提示（仍刷新电量），不调用 pkexec
            statusRow.subtitle = t('missingStatus');
            this._refreshTimer = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                2,
                () => {
                    statusRow.subtitle =
                        `${t('missingStatus')}    ` +
                        `${t('battery')}: ${this._readBatteryText()}`;
                    return GLib.SOURCE_CONTINUE;
                }
            );
        } else {
            // 充电上限：防抖（350ms）+ 串行执行，避免多个 pkexec 排队写 EC
            combo.connect('notify::selected', () => {
                if (this._updating)
                    return;
                if (this._applyDebounce)
                    GLib.source_remove(this._applyDebounce);
                this._applyDebounce = GLib.timeout_add(
                    GLib.PRIORITY_DEFAULT,
                    350,
                    () => {
                        this._applyDebounce = 0;
                        const opt = OPTIONS[combo.selected];
                        if (!opt)
                            return GLib.SOURCE_REMOVE;
                        // 乐观更新：先给即时反馈，再串行执行命令
                        statusRow.subtitle = `${t('setting')} ${opt.label}…`;
                        this._applyChain = this._applyChain.then(
                            () => this._apply(opt, combo, statusRow)
                        );
                        return GLib.SOURCE_REMOVE;
                    }
                );
            });

            // 2 秒刷新状态行（电量/充放电实时变化）
            this._refreshTimer = GLib.timeout_add_seconds(
                GLib.PRIORITY_DEFAULT,
                2,
                () => {
                    this._updateStatusSubtitle(statusRow);
                    return GLib.SOURCE_CONTINUE;
                }
            );

            await this._refresh(combo, statusRow);
        }
    }

    _updateStatusSubtitle(statusRow) {
        statusRow.subtitle =
            `${this._t('currentLimit')}: ${this._currentLimitText}    ` +
            `${this._t('battery')}: ${this._readBatteryText()}`;
    }

    // 注意：GJS 1.88 中 await communicate_utf8_async() 的 Promise 化失效，
    // 必须显式传回调并用 communicate_utf8_finish() 取结果。
    _runScript(args) {
        return new Promise(resolve => {
            let proc;
            try {
                proc = Gio.Subprocess.new(
                    ['pkexec', LIMIT_SCRIPT, ...args],
                    Gio.SubprocessFlags.STDOUT_PIPE |
                        Gio.SubprocessFlags.STDERR_PIPE);
            } catch (e) {
                console.error(`Battery Buddy: 无法启动 ${LIMIT_SCRIPT}: ${e}`);
                resolve({success: false, stdout: '', stderr: String(e)});
                return;
            }

            proc.communicate_utf8_async(null, null, (p, res) => {
                let stdout = '';
                let stderr = '';
                try {
                    [, stdout, stderr] = p.communicate_utf8_finish(res);
                } catch (e) {
                    console.error(`Battery Buddy: 读取 ${LIMIT_SCRIPT} 输出失败: ${e}`);
                }
                // 进程退出码才是成败的唯一依据（ok 只代表 I/O 成功）
                resolve({
                    success: p.get_exit_status() === 0,
                    stdout: (stdout ?? '').trim(),
                    stderr: (stderr ?? '').trim(),
                });
            });
        });
    }

    _readBatteryText() {
        try {
            const decoder = new TextDecoder();
            const [, cap] = GLib.file_get_contents(
                '/sys/class/power_supply/BAT0/capacity');
            const [, st] = GLib.file_get_contents(
                '/sys/class/power_supply/BAT0/status');
            const status = decoder.decode(st).trim();
            const map = {
                Charging: 'stCharging',
                'Not charging': 'stNotCharging',
                Discharging: 'stDischarging',
                Full: 'stFull',
            };
            const statusText = map[status] ? this._t(map[status]) : status;
            return `${decoder.decode(cap).trim()}% ${statusText}`;
        } catch (e) {
            return '--';
        }
    }

    async _refresh(combo, statusRow) {
        const res = await this._runScript(['value']);
        let current = 0;
        if (res.success) {
            const parsed = parseInt(res.stdout, 10);
            current = Number.isNaN(parsed) ? 0 : parsed;
        }

        const idx = OPTIONS.findIndex(o => o.value === current);
        if (idx >= 0 && combo.selected !== idx) {
            this._updating = true;
            combo.selected = idx;
            this._updating = false;
        }

        this._currentLimitText = current > 0 ? `${current}%` : '100%';
        this._updateStatusSubtitle(statusRow);
    }

    async _apply(opt, combo, statusRow) {
        const args = opt.value === 0 ? ['disable'] : [String(opt.value)];
        const res = await this._runScript(args);
        await this._refresh(combo, statusRow);

        if (!res.success)
            statusRow.subtitle = this._t('fail');
    }
}
