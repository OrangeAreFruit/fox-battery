// SPDX-FileCopyrightText: 2026 lanfanqie
// SPDX-License-Identifier: GPL-3.0-or-later
//
// Battery Buddy 充电上限设置窗口（扩展管理器里的齿轮按钮打开）。

import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const LIMIT_SCRIPT = '/usr/local/bin/battery-limit.sh';

// 下拉选项顺序与 ComboRow 的 model 一一对应
const OPTIONS = [
    {label: '禁用（充满 100%）', value: 0},
    {label: '90%', value: 90},
    {label: '80%', value: 80},
];

export default class BatteryBuddyPreferences extends ExtensionPreferences {
    async fillPreferencesWindow(window) {
        window.set_default_size(420, 320);
        window.set_size_request(420, 320);

        const page = new Adw.PreferencesPage({title: '常规'});

        const group = new Adw.PreferencesGroup({
            title: '电池充电上限',
            description:
                '电池充到设定值后停止充电（需要小米/红米笔记本的 WMI 接口支持）。',
        });

        const combo = new Adw.ComboRow({
            title: '充电上限',
            subtitle: '选择电池停止充电的百分比',
            model: new Gtk.StringList({
                strings: OPTIONS.map(o => o.label),
            }),
        });

        const statusRow = new Adw.ActionRow({
            title: '当前状态',
            subtitle: '读取中…',
        });

        group.add(combo);
        group.add(statusRow);
        page.add(group);
        window.add(page);

        this._updating = false;
        this._currentLimitText = '当前上限: 未知';
        this._refreshTimer = 0;
        this._applyDebounce = 0;
        this._applyChain = Promise.resolve();

        combo.connect('notify::selected', () => {
            if (this._updating)
                return;
            // 防抖：快速连续点击只应用最后一次，避免多个 pkexec
            // 排队串行写 EC，导致 fox 图标跟着命令"追着跑"。
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
                    // 乐观更新：先给用户即时反馈，再串行执行命令
                    statusRow.subtitle =
                        `正在设置 ${opt.value === 0 ? '禁用（充满 100%）' : opt.value + '%'}…`;
                    this._applyChain = this._applyChain.then(
                        () => this._apply(opt, combo, statusRow)
                    );
                    return GLib.SOURCE_REMOVE;
                }
            );
        });

        // 窗口打开期间每 2 秒刷新状态行（电量/充放电实时变化），
        // 上限部分由 _refresh() 写入 _currentLimitText 后整体拼接。
        this._refreshTimer = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            2,
            () => {
                this._updateStatusSubtitle(statusRow);
                return GLib.SOURCE_CONTINUE;
            }
        );
        window.connect('close-request', () => {
            if (this._refreshTimer) {
                GLib.source_remove(this._refreshTimer);
                this._refreshTimer = 0;
            }
            if (this._applyDebounce) {
                GLib.source_remove(this._applyDebounce);
                this._applyDebounce = 0;
            }
        });

        await this._refresh(combo, statusRow);
    }

    _updateStatusSubtitle(statusRow) {
        statusRow.subtitle =
            `${this._currentLimitText}    电量: ${this._readBatteryText()}`;
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
            return `${decoder.decode(cap).trim()}% ${decoder.decode(st).trim()}`;
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

        this._currentLimitText =
            `当前上限: ${current > 0 ? `${current}%` : '未启用（充满 100%）'}`;
        this._updateStatusSubtitle(statusRow);
    }

    async _apply(opt, combo, statusRow) {
        const args = opt.value === 0 ? ['disable'] : [String(opt.value)];
        const res = await this._runScript(args);
        await this._refresh(combo, statusRow);

        if (!res.success)
            statusRow.subtitle = '设置失败：请确认 battery-limit.sh 已安装且 polkit 规则生效';
    }
}
