// SPDX-FileCopyrightText: 2023 Deminder <tremminder@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import UPowerGlib from 'gi://UPowerGlib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { InjectionTracker } from './modules/sdt/injection.js';

import {
  FoxBatteryIcon,
} from './modules/fox-widget.js';
import { PowerManagerProxyMock } from './modules/mock.js';
import { debugMode } from './modules/util.js';

export default class BatteryIndicatorIcon extends Extension {
  setupDone = false;

  enable() {
    this.tracker = new InjectionTracker();

    const qs = Main.panel.statusArea.quickSettings;
    if ('_system' in qs) {
      this._setup(qs);
    } else {
      const injection = this.tracker.injectProperty(
        qs,
        '_addItems' in qs ? '_addItems' : '_addItemsBefore',
        (...args) => {
          this._setup(qs);
          injection.clear();
          injection.previous.call(qs, ...args);
        }
      );
    }
  }

  _setup(qs) {
    const sysIndicator = qs._system;
    const { powerToggle } = sysIndicator._systemItem;
    if (debugMode) {
      // Debug: Replace the PowerManagerProxy by a mock with cycling values
      powerToggle._proxy_real = powerToggle._proxy;
      powerToggle._proxy = new PowerManagerProxyMock();
    }

    const proxy = powerToggle._proxy;
    this._proxy = proxy;
    this._theme = St.ThemeContext.get_for_stage(global.stage);

    const update = async () => {
      // 正常模式直接读内核电池状态（绕过 UPower 对"停充"约 20 秒的
      // 延迟判定）；debug 模式沿用 mock proxy 以便观察循环变化。
      const battery = debugMode
        ? this._proxy.IsPresent
          ? {
              percentage: this._proxy.Percentage,
              charging:
                this._proxy.State === UPowerGlib.DeviceState.CHARGING,
            }
          : null
        : await this._readBatteryState();
      if (battery) {
        this._patch(sysIndicator, powerToggle);

        // Debug: 记录状态变化（用于排查"顶栏图标切换慢"）
        const dbgState = battery.charging ? 1 : 4;
        const dbgPct = battery.percentage;
        if (dbgState !== this._lastState || dbgPct !== this._lastPct) {
          log(
            `battery-buddy: update state=${dbgState} pct=${dbgPct}` +
              ` (now=${Date.now()})`
          );
          this._lastState = dbgState;
          this._lastPct = dbgPct;
        }

        // Update properties of the fox battery icons
        const height = this._theme.scaleFactor * 16; // panel.js::PANEL_ICON_SIZE === 16
        // Fixed horizontal cartoon fox icon, aspect ratio 2:1
        const width = Math.round(height * 2);
        const charging = battery.charging;
        const percentage = battery.percentage;

        const props = {
          height,
          width,
          percentage,
          charging,
          visible: true,
        };
        sysIndicator._drawicon.set(props);
        powerToggle._drawicon.set(props);
        // Percentage label visibility is controlled by the system setting
        // "Show battery percentage" (org.gnome.desktop.interface)
        sysIndicator._percentageLabel.set_style('');
        powerToggle._title.set_style('');

        if (debugMode) {
          // Debug: Ensure that text label is updated by the mocked _proxy
          powerToggle._sync();
          // Debug: Show a big debug icon on the primary monitor
          const dbgIcon = sysIndicator._drawicondbg;
          dbgIcon.set({
            ...props,
            charging: true,
            height: 256,
            width: 512,
          });
          const monitor = Main.layoutManager.primaryMonitor;
          dbgIcon.set_position(
            monitor.x + Math.floor(monitor.width / 2 - dbgIcon.width / 2),
            monitor.y + Math.floor(monitor.height / 2 - dbgIcon.height / 2)
          );
        }
      } else {
        this._unpatch(sysIndicator, powerToggle);
      }
    };
    // Connect proxy
    this._proxyId = this._proxy.connect(
      'g-properties-changed',
      update.bind(this)
    );

    // 开机兜底：upowerd 就绪前信号时序可能对不上（proxy 在扩展连接
    // 信号前已更新过属性），2 秒轮询一次确保图标状态尽快就位。
    // 属性未变化时 GObject 不会发 notify，轮询开销可忽略。
    this._pollId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
      update();
      return GLib.SOURCE_CONTINUE;
    });

    // Connect theme
    this._themeId = this._theme.connect(
      'notify::scale-factor',
      update.bind(this)
    );
    this._themeChangedId = this._theme.connect('changed', update.bind(this));

    update();
    this.setupDone = true;
  }

  // 直接读内核 sysfs，绕过 UPower 对"停充"约 20 秒的延迟判定，
  // 保证 fox 图标与设置窗口文字同步更新。
  // 异步读取（Gio.File.load_contents_async），避免在 shell 主进程
  // 做同步 IO（EGO 验证器 EGO-X-004 警告）。
  _readBatteryState() {
    const decoder = new TextDecoder();
    const capFile = Gio.File.new_for_path(
      '/sys/class/power_supply/BAT0/capacity');
    const stFile = Gio.File.new_for_path(
      '/sys/class/power_supply/BAT0/status');

    return new Promise(resolve => {
      let cap = null;
      let st = null;
      let failed = false;

      const finish = () => {
        if (failed) {
          resolve(null);
          return;
        }
        if (cap === null || st === null)
          return;
        try {
          const percentage = parseInt(decoder.decode(cap).trim(), 10);
          const status = decoder.decode(st).trim();
          resolve({
            percentage,
            charging: status === 'Charging',
          });
        } catch (e) {
          log(`battery-buddy: 解析电池状态失败: ${e}`);
          resolve(null);
        }
      };

      const readFile = (file, setter) => {
        file.load_contents_async(null, (src, res) => {
          try {
            const [, contents] = src.load_contents_finish(res);
            setter(contents);
          } catch (e) {
            failed = true;
            log(`battery-buddy: 读取电池状态失败: ${e}`);
          }
          finish();
        });
      };

      readFile(capFile, v => {
        cap = v;
      });
      readFile(stFile, v => {
        st = v;
      });
    });
  }

  disable() {
    // Unlock-dialog session-mode required:
    // since the battery indicator is also visible in the unlock-dialog.
    // The user most likely expects the custom icon to appear in the unlock-dialog.
    this.tracker.clearAll();
    this.tracker = null;
    if (!this.setupDone) {
      return;
    }
    this.setupDone = false;
    const sysIndicator = Main.panel.statusArea.quickSettings._system;
    const { powerToggle } = sysIndicator._systemItem;

    // Disconnect proxy
    this._proxy.disconnect(this._proxyId);
    if ('_proxy_real' in powerToggle) {
      powerToggle._proxy.destroy();
      powerToggle._proxy = powerToggle._proxy_real;
      delete powerToggle._proxy_real;
    }
    this._proxy = null;
    this._proxyId = null;

    // Stop polling
    if (this._pollId) {
      GLib.source_remove(this._pollId);
      this._pollId = null;
    }

    // Disconnect theme
    this._theme.disconnect(this._themeId);
    this._theme.disconnect(this._themeChangedId);
    this._themeChangedId = null;
    this._themeId = null;
    this._theme = null;

    this._unpatch(sysIndicator, powerToggle);
  }

  _patch(sysIndicator, powerToggle) {
    if (!('_drawicon' in sysIndicator)) {
      sysIndicator._drawicon = new FoxBatteryIcon({
        style_class: 'battery-indicator',
      });

      sysIndicator.replace_child(
        sysIndicator._indicator,
        sysIndicator._drawicon
      );

      powerToggle._drawicon = new FoxBatteryIcon({
        style_class: 'battery-quick-toggle',
      });
      powerToggle._box.replace_child(powerToggle._icon, powerToggle._drawicon);

      if (debugMode) {
        sysIndicator._drawicondbg = new FoxBatteryIcon({
          style_class: 'battery-indicator',
        });
        Main.uiGroup.add_child(sysIndicator._drawicondbg);
      }
    }
  }

  _unpatch(sysIndicator, powerToggle) {
    if ('_drawicon' in sysIndicator) {
      // Remove color style from percentage label
      sysIndicator._percentageLabel.set_style('');
      powerToggle._title.set_style('');

      powerToggle._box.replace_child(powerToggle._drawicon, powerToggle._icon);
      powerToggle._drawicon.destroy();
      delete powerToggle['_drawicon'];

      sysIndicator.replace_child(
        sysIndicator._drawicon,
        sysIndicator._indicator
      );
      sysIndicator._drawicon.destroy();
      delete sysIndicator['_drawicon'];

      powerToggle._sync();
      sysIndicator._sync();

      if (debugMode) {
        Main.uiGroup.remove_child(sysIndicator._drawicondbg);
        sysIndicator._drawicondbg.destroy();
        delete sysIndicator['_drawicondbg'];
      }
    }
  }
}
