// SPDX-FileCopyrightText: 2023 Deminder <tremminder@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';
import UPowerGlib from 'gi://UPowerGlib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { InjectionTracker } from './modules/sdt/injection.js';

import {
  BatteryDrawIcon,
  BInner,
  BStatusStyle,
} from './modules/drawicon.js';
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

    const update = () => {
      if (this._proxy.IsPresent) {
        this._patch(sysIndicator, powerToggle);

        // Update properties of BatteryDrawIcons
        const height = this._theme.scaleFactor * 16; // panel.js::PANEL_ICON_SIZE === 16
        // Fixed horizontal cartoon fox icon, aspect ratio 2:1
        const width = Math.round(height * 2);
        const charging = this._proxy.State === UPowerGlib.DeviceState.CHARGING;
        const percentage = this._proxy.Percentage;

        const props = {
          height,
          width,
          percentage,
          statusStyle: BStatusStyle.BUDDY,
          inner: charging ? BInner.CHARGING : BInner.EMPTY,
          visible: true,
          vertical: false,
        };
        sysIndicator._drawicon.set(props);
        powerToggle._drawicon.set({
          ...props,
          // Percentage text is always shown next to powerToggle
          inner: charging ? BInner.CHARGING : BInner.EMPTY,
        });
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
            inner: BInner.CHARGING,
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

    // Connect theme
    this._themeId = this._theme.connect(
      'notify::scale-factor',
      update.bind(this)
    );
    this._themeChangedId = this._theme.connect('changed', update.bind(this));

    update();
    this.setupDone = true;
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
      sysIndicator._drawicon = new BatteryDrawIcon({
        style_class: 'battery-indicator',
        idolWidget: sysIndicator._indicator,
      });

      sysIndicator.replace_child(
        sysIndicator._indicator,
        sysIndicator._drawicon
      );

      powerToggle._drawicon = new BatteryDrawIcon({
        style_class: 'battery-quick-toggle',
        idolWidget: powerToggle._icon,
      });
      powerToggle._box.replace_child(powerToggle._icon, powerToggle._drawicon);

      if (debugMode) {
        sysIndicator._drawicondbg = new BatteryDrawIcon({
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
