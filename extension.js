// SPDX-FileCopyrightText: 2023 Deminder <tremminder@gmail.com>
// SPDX-License-Identifier: GPL-3.0-or-later

import St from 'gi://St';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Rsvg from 'gi://Rsvg';
import UPowerGlib from 'gi://UPowerGlib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { InjectionTracker } from './modules/sdt/injection.js';

import {
  FoxBatteryIcon,
} from './modules/fox-widget.js';
import { PowerManagerProxyMock } from './modules/mock.js';
import { debugMode } from './modules/util.js';

// ===== WiFi 图标（信号格样式，3 级信号）=====
// 3 根柱子外框始终存在（未填充的镂空），
// 状态区别在于蓝色填充数量：weak=1格、medium=2格、strong=3格
// 蓝色 #38BDF8 与狐狸电池图标一致，外框黑色
const WIFI_SVGS = {
  strong: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1052 1024">
      <path d="M154.566038 1024A154.566038 154.566038 0 0 1 0 869.433962V647.245283a154.566038 154.566038 0 0 1 309.132075 0v222.188679a154.566038 154.566038 0 0 1-154.566037 154.566038z m0-473.358491a96.603774 96.603774 0 0 0-96.603774 96.603774v222.188679a96.603774 96.603774 0 0 0 193.207548 0V647.245283a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#000000"/>
      <path d="M154.566038 550.641509a96.603774 96.603774 0 0 0-96.603774 96.603774v222.188679a96.603774 96.603774 0 0 0 193.207548 0V647.245283a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#38BDF8"/>
      <path d="M526.490566 1024a154.566038 154.566038 0 0 1-154.566038-154.566038V405.735849a154.566038 154.566038 0 0 1 309.132076 0v463.698113a154.566038 154.566038 0 0 1-154.566038 154.566038z m0-714.867925a96.603774 96.603774 0 0 0-96.603774 96.603774v463.698113a96.603774 96.603774 0 0 0 193.207548 0V405.735849a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#000000"/>
      <path d="M526.490566 309.132075a96.603774 96.603774 0 0 0-96.603774 96.603774v463.698113a96.603774 96.603774 0 0 0 193.207548 0V405.735849a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#38BDF8"/>
      <path d="M898.415094 1024a154.566038 154.566038 0 0 1-154.566037-154.566038V154.566038a154.566038 154.566038 0 0 1 309.132075 0v714.867924a154.566038 154.566038 0 0 1-154.566038 154.566038zM898.415094 57.962264a96.603774 96.603774 0 0 0-96.603773 96.603774v714.867924a96.603774 96.603774 0 0 0 193.207547 0V154.566038A96.603774 96.603774 0 0 0 898.415094 57.962264z" fill="#000000"/>
      <path d="M898.415094 57.962264a96.603774 96.603774 0 0 0-96.603773 96.603774v714.867924a96.603774 96.603774 0 0 0 193.207547 0V154.566038A96.603774 96.603774 0 0 0 898.415094 57.962264z" fill="#38BDF8"/>
    </svg>
  `,
  medium: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1052 1024">
      <path d="M154.566038 1024A154.566038 154.566038 0 0 1 0 869.433962V647.245283a154.566038 154.566038 0 0 1 309.132075 0v222.188679a154.566038 154.566038 0 0 1-154.566037 154.566038z m0-473.358491a96.603774 96.603774 0 0 0-96.603774 96.603774v222.188679a96.603774 96.603774 0 0 0 193.207548 0V647.245283a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#000000"/>
      <path d="M154.566038 550.641509a96.603774 96.603774 0 0 0-96.603774 96.603774v222.188679a96.603774 96.603774 0 0 0 193.207548 0V647.245283a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#38BDF8"/>
      <path d="M526.490566 1024a154.566038 154.566038 0 0 1-154.566038-154.566038V405.735849a154.566038 154.566038 0 0 1 309.132076 0v463.698113a154.566038 154.566038 0 0 1-154.566038 154.566038z m0-714.867925a96.603774 96.603774 0 0 0-96.603774 96.603774v463.698113a96.603774 96.603774 0 0 0 193.207548 0V405.735849a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#000000"/>
      <path d="M526.490566 309.132075a96.603774 96.603774 0 0 0-96.603774 96.603774v463.698113a96.603774 96.603774 0 0 0 193.207548 0V405.735849a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#38BDF8"/>
      <path d="M898.415094 1024a154.566038 154.566038 0 0 1-154.566037-154.566038V154.566038a154.566038 154.566038 0 0 1 309.132075 0v714.867924a154.566038 154.566038 0 0 1-154.566038 154.566038zM898.415094 57.962264a96.603774 96.603774 0 0 0-96.603773 96.603774v714.867924a96.603774 96.603774 0 0 0 193.207547 0V154.566038A96.603774 96.603774 0 0 0 898.415094 57.962264z" fill="#000000"/>
    </svg>
  `,
  weak: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1052 1024">
      <path d="M154.566038 1024A154.566038 154.566038 0 0 1 0 869.433962V647.245283a154.566038 154.566038 0 0 1 309.132075 0v222.188679a154.566038 154.566038 0 0 1-154.566037 154.566038z m0-473.358491a96.603774 96.603774 0 0 0-96.603774 96.603774v222.188679a96.603774 96.603774 0 0 0 193.207548 0V647.245283a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#000000"/>
      <path d="M154.566038 550.641509a96.603774 96.603774 0 0 0-96.603774 96.603774v222.188679a96.603774 96.603774 0 0 0 193.207548 0V647.245283a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#38BDF8"/>
      <path d="M526.490566 1024a154.566038 154.566038 0 0 1-154.566038-154.566038V405.735849a154.566038 154.566038 0 0 1 309.132076 0v463.698113a154.566038 154.566038 0 0 1-154.566038 154.566038z m0-714.867925a96.603774 96.603774 0 0 0-96.603774 96.603774v463.698113a96.603774 96.603774 0 0 0 193.207548 0V405.735849a96.603774 96.603774 0 0 0-96.603774-96.603774z" fill="#000000"/>
      <path d="M898.415094 1024a154.566038 154.566038 0 0 1-154.566037-154.566038V154.566038a154.566038 154.566038 0 0 1 309.132075 0v714.867924a154.566038 154.566038 0 0 1-154.566038 154.566038zM898.415094 57.962264a96.603774 96.603774 0 0 0-96.603773 96.603774v714.867924a96.603774 96.603774 0 0 0 193.207547 0V154.566038A96.603774 96.603774 0 0 0 898.415094 57.962264z" fill="#000000"/>
    </svg>
  `,
};

// 自定义蓝牙顶栏图标（静态样式：通高圆角矩形 + 内部蓝色填满 + 黑色 B 符号）。
// 蓝牙 icon_name 固定不变，官方只按"是否有已连接设备"切换 visible，
// 因此无需按状态分档，替换时同步显隐即可。
// 容器直接铺满 1024 视口（不再用 scale 纵向拉伸，避免四角被裁切）。
const BLUETOOTH_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
    <rect x="170.67" y="32" width="682.67" height="960" rx="170.67" fill="#38BDF8"/>
    <g transform="translate(512 512) scale(1.22) translate(-512 -512)">
      <path d="M528 314.133333L628.906667 384 528 453.866667V314.133333m0-64a64 64 0 0 0-64 64V576l201.333333-139.36a64 64 0 0 0 0-105.28L564.426667 261.333333A62.986667 62.986667 0 0 0 528 250.026667z" fill="#000000"/>
      <path d="M528 570.133333l100.906667 69.866667L528 709.866667v-139.733334M464 448v261.866667a64 64 0 0 0 64 64 62.986667 62.986667 0 0 0 36.213333-11.52l100.906667-69.813334a64 64 0 0 0 0-105.28L464 448z" fill="#000000"/>
      <path d="M361.013333 382.773333a32 32 0 0 0-18.4 58.24L464 525.813333a32 32 0 1 0 36.693333-52.426666l-121.333333-84.8a31.68 31.68 0 0 0-18.346667-5.813334z" fill="#000000"/>
      <path d="M483.306667 491.786667a32 32 0 0 0-18.346667 5.76l-122.346667 85.706666a32 32 0 0 0-7.84 44.533334 32 32 0 0 0 44.586667 7.893333l122.293333-85.706667a32 32 0 0 0-18.346666-58.186666z" fill="#000000"/>
    </g>
    <rect x="170.67" y="32" width="682.67" height="960" rx="170.67" fill="none" stroke="#000000" stroke-width="64"/>
  </svg>
`;

// 自定义 WiFi 图标组件（St.DrawingArea + Rsvg，与 FoxBatteryIcon 同路线）
const WifiIcon = GObject.registerClass(
  class WifiIcon extends St.DrawingArea {
    _init(params = {}) {
      super._init({
        y_align: Clutter.ActorAlign.CENTER,
        // 必须透传 width/height：St.DrawingArea 无样式类时固有尺寸为 0，
        // 若丢掉构造参数，图标会被分配 0×0 区域而完全不可见。
        ...params,
      });
      this._level = 'weak';
      this.connect('style-changed', () => this.queue_repaint());
    }

    set_level(level) {
      if (this._level !== level) {
        this._level = level;
        this.queue_repaint();
      }
    }

    vfunc_repaint() {
      const [w, h] = this.get_surface_size();
      if (w <= 0 || h <= 0)
        return;
      const cr = this.get_context();
      try {
        // 将 SVG 固有尺寸动态匹配到 surface，避免 HiDPI/缩放下溢出裁切
        const svg = (WIFI_SVGS[this._level] ?? WIFI_SVGS.weak).replace(
          'width="24" height="24"',
          `width="${w}" height="${h}"`
        );
        const handle = Rsvg.Handle.new_from_data(new TextEncoder().encode(svg));
        handle.render_cairo(cr);
      } catch (e) {
        // 渲染失败静默，不影响其它功能
      } finally {
        cr.$dispose();
      }
    }
  }
);

// 自定义蓝牙顶栏图标组件（静态 SVG，无状态分档）
const BluetoothIcon = GObject.registerClass(
  class BluetoothIcon extends St.DrawingArea {
    _init(params = {}) {
      super._init({
        y_align: Clutter.ActorAlign.CENTER,
        ...params,
      });
      this.connect('style-changed', () => this.queue_repaint());
    }

    vfunc_repaint() {
      const [w, h] = this.get_surface_size();
      if (w <= 0 || h <= 0)
        return;
      const cr = this.get_context();
      try {
        const svg = BLUETOOTH_SVG.replace(
          'width="24" height="24"',
          `width="${w}" height="${h}"`
        );
        const handle = Rsvg.Handle.new_from_data(new TextEncoder().encode(svg));
        handle.render_cairo(cr);
      } catch (e) {
        // 渲染失败静默，不影响其它功能
      } finally {
        cr.$dispose();
      }
    }
  }
);

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

    // WiFi 图标替换（顶栏），开关在面板设置里，实时监听设置变化：
    // 关闭时立即还原系统原图标，开启时（重新）替换
    this._settings = this.getSettings();
    this._wifiSettingsId = this._settings.connect(
      'changed::replace-wifi-icon',
      () => {
        // disable() 置空 _settings 后，已排队的 changed 信号仍可能触发，需防御
        if (!this._settings)
          return;
        if (this._settings.get_boolean('replace-wifi-icon')) {
          this._wifiRetries = 0;
          this._initWifiIcon(qs);
        } else {
          this._unpatchWifiIcon();
        }
      }
    );
    if (this._settings.get_boolean('replace-wifi-icon')) {
      this._wifiRetries = 0;
      this._initWifiIcon(qs);
    }

    // 蓝牙图标替换（顶栏），同样实时监听设置变化
    this._btSettingsId = this._settings.connect(
      'changed::replace-bluetooth-icon',
      () => {
        // disable() 置空 _settings 后，已排队的 changed 信号仍可能触发，需防御
        if (!this._settings)
          return;
        if (this._settings.get_boolean('replace-bluetooth-icon')) {
          this._btRetries = 0;
          this._initBluetoothIcon(qs);
        } else {
          this._unpatchBluetoothIcon();
        }
      }
    );
    if (this._settings.get_boolean('replace-bluetooth-icon')) {
      this._btRetries = 0;
      this._initBluetoothIcon(qs);
    }

  }

  // WiFi 顶栏图标替换：qs._network 是异步初始化的（_setupIndicators），
  // 因此轮询重试直到其就绪，避免 GNOME 50 中启用时序问题。
  _initWifiIcon(qs) {
    const network = qs._network;
    if (!network || !network._primaryIndicator) {
      this._wifiRetries += 1;
      if (this._wifiRetries > 15) {
        log('battery-buddy: WiFi icon: qs._network 未就绪，放弃替换');
        return;
      }
      const delay = this._wifiRetries <= 2 ? 300 : this._wifiRetries <= 6 ? 600 : 1000;
      this._wifiRetryId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        delay,
        () => {
          this._wifiRetryId = null;
          this._initWifiIcon(qs);
          return GLib.SOURCE_REMOVE;
        }
      );
      return;
    }
    this._patchWifiIcon(network);
  }

  // 保守替换：不 replace_child（避免破坏 icon-name binding），
  // 而是隐藏原图标 + 追加自定义图标 + 监听 icon-name 驱动等级。
  // 注意：必须先 add_child 再隐藏原图标——官方 _addIndicator() 里每个
  // icon 的 notify::visible 都会触发 _syncIndicatorsVisible()，若先隐藏
  // 原图标，父容器会判定"没有可见 child"而把整个 network 指示器隐藏。
  _patchWifiIcon(network) {
    const indicator = network._primaryIndicator;
    const parent = indicator?.get_parent();
    if (this._wifiIcon || !indicator || !parent) {
      return;
    }
    const size = this._theme ? this._theme.scaleFactor * 16 : 16;
    this._wifiIcon = new WifiIcon({
      width: size,
      height: size,
    });
    this._wifiIndicator = indicator;
    // 先加入父容器：确保 _syncIndicatorsVisible() 始终有可见 child
    parent.add_child(this._wifiIcon);
    // 兜底：若初始原图标不可见导致父容器被隐藏，这里恢复（wifiIcon 是可见 child）
    if (!parent.visible)
      parent.visible = true;
    // 原图标 visible 会被 _updateIcon() 动态控制，这里强制保持隐藏；
    // 替换模式下 wifiIcon 保持可见（无信号时显示黄色弱图标）
    this._wifiVisibleId = indicator.connect('notify::visible', () => {
      indicator.visible = false;
    });
    indicator.visible = false;

    const syncLevel = () => {
      this._wifiIcon.set_level(this._wifiIconNameToLevel(indicator.icon_name));
    };
    this._wifiIconNameId = indicator.connect('notify::icon-name', syncLevel);
    syncLevel();

    // 跟随顶栏缩放比例
    if (this._theme) {
      this._wifiThemeId = this._theme.connect('notify::scale-factor', () => {
        const s = this._theme.scaleFactor * 16;
        this._wifiIcon.set({ width: s, height: s });
      });
    }
    log('battery-buddy: WiFi 顶栏图标替换已启用');
  }

  // 官方信号强度映射（panel icon-name 后缀，见 network.js::signalToIcon）：
  // excellent/good → strong，ok → medium，weak/none → weak
  _wifiIconNameToLevel(iconName) {
    if (!iconName)
      return 'weak';
    if (iconName.includes('excellent') || iconName.includes('good'))
      return 'strong';
    if (iconName.includes('ok'))
      return 'medium';
    return 'weak';
  }

  _unpatchWifiIcon() {
    if (this._wifiRetryId) {
      GLib.source_remove(this._wifiRetryId);
      this._wifiRetryId = null;
    }
    if (this._wifiIconNameId && this._wifiIndicator) {
      this._wifiIndicator.disconnect(this._wifiIconNameId);
      this._wifiIconNameId = null;
    }
    if (this._wifiVisibleId && this._wifiIndicator) {
      this._wifiIndicator.disconnect(this._wifiVisibleId);
      this._wifiVisibleId = null;
    }
    if (this._wifiThemeId && this._theme) {
      this._theme.disconnect(this._wifiThemeId);
      this._wifiThemeId = null;
    }
    if (this._wifiIcon) {
      this._wifiIcon.destroy();
      this._wifiIcon = null;
    }
    if (this._wifiIndicator) {
      this._wifiIndicator.visible = true;
      this._wifiIndicator = null;
    }
  }

  // 蓝牙顶栏图标替换：qs._bluetooth 同样由 _setupIndicators() 异步创建，
  // 沿用 WiFi 的轮询重试模式。蓝牙 icon_name 固定，只需同步显隐。
  _initBluetoothIcon(qs) {
    const bluetooth = qs._bluetooth;
    if (!bluetooth || !bluetooth._indicator) {
      this._btRetries += 1;
      if (this._btRetries > 15) {
        log('battery-buddy: Bluetooth icon: qs._bluetooth 未就绪，放弃替换');
        return;
      }
      const delay = this._btRetries <= 2 ? 300 : this._btRetries <= 6 ? 600 : 1000;
      this._btRetryId = GLib.timeout_add(
        GLib.PRIORITY_DEFAULT,
        delay,
        () => {
          this._btRetryId = null;
          this._initBluetoothIcon(qs);
          return GLib.SOURCE_REMOVE;
        }
      );
      return;
    }
    this._patchBluetoothIcon(bluetooth);
  }

  // 保守替换：隐藏原图标 + 追加自定义图标 + 同步显隐。
  // 官方 _sync() 按"是否有已连接设备"设置 _indicator.visible，父容器
  // （_syncIndicatorsVisible）以任一可见 child 决定显隐，因此必须先把
  // 自定义图标 add_child 进父容器，再接管原图标的 visible。
  _patchBluetoothIcon(bluetooth) {
    const indicator = bluetooth._indicator;
    const parent = indicator?.get_parent();
    if (this._btIcon || !indicator || !parent) {
      return;
    }
    const size = this._theme ? this._theme.scaleFactor * 16 : 16;
    this._btIcon = new BluetoothIcon({
      width: size,
      height: size,
    });
    this._bt = bluetooth;
    this._btIndicator = indicator;
    // 先加入父容器：确保 _syncIndicatorsVisible() 始终有可见 child
    parent.add_child(this._btIcon);

    // 把官方 visible 语义转发给自定义图标，原图标始终保持隐藏。
    // 注意：设置 indicator.visible = false 会同步再次触发 notify::visible，
    // 若不做守卫会递归执行导致自定义图标被误设为隐藏（图标永远不显示）。
    let syncing = false;
    const syncVisible = () => {
      if (syncing)
        return;
      syncing = true;
      this._btIcon.visible = indicator.visible;
      indicator.visible = false;
      syncing = false;
    };
    this._btVisibleId = indicator.connect('notify::visible', syncVisible);
    syncVisible();

    // 跟随顶栏缩放比例
    if (this._theme) {
      this._btThemeId = this._theme.connect('notify::scale-factor', () => {
        const s = this._theme.scaleFactor * 16;
        this._btIcon.set({ width: s, height: s });
      });
    }
    log('battery-buddy: 蓝牙顶栏图标替换已启用');
  }

  _unpatchBluetoothIcon() {
    if (this._btRetryId) {
      GLib.source_remove(this._btRetryId);
      this._btRetryId = null;
    }
    if (this._btVisibleId && this._btIndicator) {
      this._btIndicator.disconnect(this._btVisibleId);
      this._btVisibleId = null;
    }
    if (this._btThemeId && this._theme) {
      this._theme.disconnect(this._btThemeId);
      this._btThemeId = null;
    }
    if (this._btIcon) {
      this._btIcon.destroy();
      this._btIcon = null;
    }
    if (this._bt && this._btIndicator) {
      // 恢复官方 _sync() 对原图标显隐的接管
      this._bt._sync();
    }
    this._btIndicator = null;
    this._bt = null;
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
    // WiFi 顶栏图标清理（不依赖 setupDone，enable 后随时可能已 patch）
    this._unpatchWifiIcon();
    // 蓝牙顶栏图标清理
    this._unpatchBluetoothIcon();
    if (this._settings) {
      if (this._wifiSettingsId) {
        this._settings.disconnect(this._wifiSettingsId);
        this._wifiSettingsId = null;
      }
      if (this._btSettingsId) {
        this._settings.disconnect(this._btSettingsId);
        this._btSettingsId = null;
      }
      this._settings = null;
    }

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
