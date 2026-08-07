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

// 顶栏图标初始化重试上限：qs 的指示器（_volume/_network/_bluetooth）由
// _setupIndicators() 异步创建，音量还依赖 PulseAudio/MixerControl 就绪，
// 开机初期可能长时间未就绪；60 次 ×（300/600/1000ms 递增）≈ 60 秒窗口，
// 足够覆盖最慢的开机场景，超时即放弃避免空转。
const MAX_ICON_RETRIES = 60;

// 自定义音量顶栏图标（水容量样式，4 档状态）。
// 官方 icon_name 为 audio-volume-{muted,low,medium,high,overamplified}-symbolic，
// 映射到 muted / low / medium / high 四档：muted 无水，其余按水位线高度区分。
// 外框保持正方形圆角矩形（等比放大 1.37 至接近最大，不拉伸不变形），与预览 svg 一致。
const VOLUME_SVGS = {
  muted: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
      <g transform="translate(512 512) scale(1.37) translate(-512 -512)">
        <path d="M489.6 265.6a22.4 22.4 0 1 1 44.8 0V758.4a22.4 22.4 0 1 1-44.8 0V265.6zM595.2 355.2a22.4 22.4 0 1 1 44.8 0V668.8a22.4 22.4 0 1 1-44.8 0V355.2zM384 355.2a22.4 22.4 0 1 1 44.8 0V668.8a22.4 22.4 0 1 1-44.8 0V355.2zM278.4 444.8a22.4 22.4 0 1 1 44.8 0V579.2a22.4 22.4 0 1 1-44.8 0V444.8zM700.8 444.8a22.4 22.4 0 1 1 44.8 0V579.2a22.4 22.4 0 1 1-44.8 0V444.8z" fill="#000000"/>
        <path fill-rule="evenodd" d="M661.9 856H362.1c-116.1 0-194-81.5-194-202.7V370.8c0-121.2 78-202.7 194-202.7H662c116.1 0 194 81.5 194 202.7v282.5C856 774.5 778 856 661.9 856zM362.1 216c-88.7 0-146 60.7-146 154.7v282.5c0 94 57.3 154.7 146 154.7H662c88.7 0 146.1-60.7 146.1-154.7V370.7c0-94-57.3-154.7-146-154.7h-300z" fill="#000000"/>
      </g>
    </svg>
  `,
  low: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
      <defs>
        <clipPath id="vol-inner">
          <path d="M362.1 216c-88.7 0-146 60.7-146 154.7v282.5c0 94 57.3 154.7 146 154.7H662c88.7 0 146.1-60.7 146.1-154.7V370.7c0-94-57.3-154.7-146-154.7h-300z"/>
        </clipPath>
      </defs>
      <g transform="translate(512 512) scale(1.37) translate(-512 -512)">
        <g clip-path="url(#vol-inner)">
          <path d="M170.67 588.67 q53 -55 118 0 q41 40 94 0 q59 -45 129 0 q35 30 82 0 q47 -50 112 0 q41 35 88 0 q35 -25 60 0 L853.67 890 L170.67 890 z" fill="#38BDF8"/>
        </g>
        <path d="M489.6 265.6a22.4 22.4 0 1 1 44.8 0V758.4a22.4 22.4 0 1 1-44.8 0V265.6zM595.2 355.2a22.4 22.4 0 1 1 44.8 0V668.8a22.4 22.4 0 1 1-44.8 0V355.2zM384 355.2a22.4 22.4 0 1 1 44.8 0V668.8a22.4 22.4 0 1 1-44.8 0V355.2zM278.4 444.8a22.4 22.4 0 1 1 44.8 0V579.2a22.4 22.4 0 1 1-44.8 0V444.8zM700.8 444.8a22.4 22.4 0 1 1 44.8 0V579.2a22.4 22.4 0 1 1-44.8 0V444.8z" fill="#000000"/>
        <path fill-rule="evenodd" d="M661.9 856H362.1c-116.1 0-194-81.5-194-202.7V370.8c0-121.2 78-202.7 194-202.7H662c116.1 0 194 81.5 194 202.7v282.5C856 774.5 778 856 661.9 856zM362.1 216c-88.7 0-146 60.7-146 154.7v282.5c0 94 57.3 154.7 146 154.7H662c88.7 0 146.1-60.7 146.1-154.7V370.7c0-94-57.3-154.7-146-154.7h-300z" fill="#000000"/>
      </g>
    </svg>
  `,
  medium: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
      <defs>
        <clipPath id="vol-inner">
          <path d="M362.1 216c-88.7 0-146 60.7-146 154.7v282.5c0 94 57.3 154.7 146 154.7H662c88.7 0 146.1-60.7 146.1-154.7V370.7c0-94-57.3-154.7-146-154.7h-300z"/>
        </clipPath>
      </defs>
      <g transform="translate(512 512) scale(1.37) translate(-512 -512)">
        <g clip-path="url(#vol-inner)">
          <path d="M170.67 369.33 q53 -55 118 0 q41 40 94 0 q59 -45 129 0 q35 30 82 0 q47 -50 112 0 q41 35 88 0 q35 -25 60 0 L853.67 890 L170.67 890 z" fill="#38BDF8"/>
        </g>
        <path d="M489.6 265.6a22.4 22.4 0 1 1 44.8 0V758.4a22.4 22.4 0 1 1-44.8 0V265.6zM595.2 355.2a22.4 22.4 0 1 1 44.8 0V668.8a22.4 22.4 0 1 1-44.8 0V355.2zM384 355.2a22.4 22.4 0 1 1 44.8 0V668.8a22.4 22.4 0 1 1-44.8 0V355.2zM278.4 444.8a22.4 22.4 0 1 1 44.8 0V579.2a22.4 22.4 0 1 1-44.8 0V444.8zM700.8 444.8a22.4 22.4 0 1 1 44.8 0V579.2a22.4 22.4 0 1 1-44.8 0V444.8z" fill="#000000"/>
        <path fill-rule="evenodd" d="M661.9 856H362.1c-116.1 0-194-81.5-194-202.7V370.8c0-121.2 78-202.7 194-202.7H662c116.1 0 194 81.5 194 202.7v282.5C856 774.5 778 856 661.9 856zM362.1 216c-88.7 0-146 60.7-146 154.7v282.5c0 94 57.3 154.7 146 154.7H662c88.7 0 146.1-60.7 146.1-154.7V370.7c0-94-57.3-154.7-146-154.7h-300z" fill="#000000"/>
      </g>
    </svg>
  `,
  high: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1024 1024">
      <defs>
        <clipPath id="vol-inner">
          <path d="M362.1 216c-88.7 0-146 60.7-146 154.7v282.5c0 94 57.3 154.7 146 154.7H662c88.7 0 146.1-60.7 146.1-154.7V370.7c0-94-57.3-154.7-146-154.7h-300z"/>
        </clipPath>
      </defs>
      <g transform="translate(512 512) scale(1.37) translate(-512 -512)">
        <g clip-path="url(#vol-inner)">
          <path d="M170.67 150 q53 -55 118 0 q41 40 94 0 q59 -45 129 0 q35 30 82 0 q47 -50 112 0 q41 35 88 0 q35 -25 60 0 L853.67 890 L170.67 890 z" fill="#38BDF8"/>
        </g>
        <path d="M489.6 265.6a22.4 22.4 0 1 1 44.8 0V758.4a22.4 22.4 0 1 1-44.8 0V265.6zM595.2 355.2a22.4 22.4 0 1 1 44.8 0V668.8a22.4 22.4 0 1 1-44.8 0V355.2zM384 355.2a22.4 22.4 0 1 1 44.8 0V668.8a22.4 22.4 0 1 1-44.8 0V355.2zM278.4 444.8a22.4 22.4 0 1 1 44.8 0V579.2a22.4 22.4 0 1 1-44.8 0V444.8zM700.8 444.8a22.4 22.4 0 1 1 44.8 0V579.2a22.4 22.4 0 1 1-44.8 0V444.8z" fill="#000000"/>
        <path fill-rule="evenodd" d="M661.9 856H362.1c-116.1 0-194-81.5-194-202.7V370.8c0-121.2 78-202.7 194-202.7H662c116.1 0 194 81.5 194 202.7v282.5C856 774.5 778 856 661.9 856zM362.1 216c-88.7 0-146 60.7-146 154.7v282.5c0 94 57.3 154.7 146 154.7H662c88.7 0 146.1-60.7 146.1-154.7V370.7c0-94-57.3-154.7-146-154.7h-300z" fill="#000000"/>
      </g>
    </svg>
  `,
};

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

// 自定义音量顶栏图标组件（按 icon-name 切换 4 档水位）
const VolumeIcon = GObject.registerClass(
  class VolumeIcon extends St.DrawingArea {
    _init(params = {}) {
      super._init({
        y_align: Clutter.ActorAlign.CENTER,
        ...params,
      });
      this._level = 'muted';
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
        const svg = (VOLUME_SVGS[this._level] ?? VOLUME_SVGS.muted).replace(
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

    // 音量图标替换（顶栏），同样实时监听设置变化
    this._volSettingsId = this._settings.connect(
      'changed::replace-volume-icon',
      () => {
        // disable() 置空 _settings 后，已排队的 changed 信号仍可能触发，需防御
        if (!this._settings)
          return;
        if (this._settings.get_boolean('replace-volume-icon')) {
          this._volRetries = 0;
          this._initVolumeIcon(qs);
        } else {
          this._unpatchVolumeIcon();
        }
      }
    );
    if (this._settings.get_boolean('replace-volume-icon')) {
      this._volRetries = 0;
      this._initVolumeIcon(qs);
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
    const ok =
      bluetooth && bluetooth._indicator && bluetooth._indicator.get_parent()
        ? this._patchBluetoothIcon(bluetooth)
        : false;
    if (ok)
      return;
    this._btRetries += 1;
    if (this._btRetries > MAX_ICON_RETRIES) {
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
  }

  // 保守替换：隐藏原图标 + 追加自定义图标 + 同步显隐。
  // 官方 _sync() 按"是否有已连接设备"设置 _indicator.visible，父容器
  // （SystemIndicator，初始 visible=false）的显隐由官方 _syncIndicatorsVisible()
  // 驱动；这里不依赖其调用时序，直接接管父容器显隐，并定时兜底重同步，
  // 避免"patch 成功但图标不显示"的时序问题。
  _patchBluetoothIcon(bluetooth) {
    const indicator = bluetooth._indicator;
    const parent = indicator?.get_parent();
    if (!indicator || !parent) {
      return false;
    }
    if (this._btIcon)
      return true;
    const size = this._theme ? this._theme.scaleFactor * 16 : 16;
    this._btIcon = new BluetoothIcon({
      width: size,
      height: size,
    });
    this._bt = bluetooth;
    this._btIndicator = indicator;
    this._btParent = parent;
    // 先加入父容器：确保 _syncIndicatorsVisible() 始终有可见 child
    parent.add_child(this._btIcon);

    // 把官方 visible 语义转发给自定义图标，原图标始终保持隐藏；
    // 同时直接接管父容器显隐，不依赖官方回调的执行时序。
    // 注意：设置 indicator.visible = false 会同步再次触发 notify::visible，
    // 若不加守卫，重入的 handler 会重读（已被强置 false 的）indicator.visible，
    // 把刚显示的 _btIcon 误设为隐藏（图标永远不显示）。
    let syncing = false;
    const syncVisible = () => {
      if (syncing)
        return;
      syncing = true;
      this._btIcon.visible = indicator.visible;
      indicator.visible = false;
      parent.visible = this._btIcon.visible;
      syncing = false;
    };
    this._btVisibleId = indicator.connect('notify::visible', syncVisible);
    syncVisible();

    // 兜底：开机时设备连接事件（devices-changed）可能早在 patch 之前就已
    // 派发完毕，此后不再有新事件，我们的 notify 转发链路从未触发，图标
    // 永远隐藏（表现为"必须点 2 次开关才恢复"——unpatch 时 _sync() 会
    // 按当前设备状态重写 visible）。因此每 3 秒强制调用官方 _sync()，
    // 它按当前 daemon 设备状态重新设置 indicator.visible，随后我们已
    // 连接的 notify::visible handler 自动完成转发（异步、开销可忽略），
    // 直到图标被撤销（_unpatchBluetoothIcon 会 source_remove）。
    this._btSyncId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
      if (!this._btIcon || !this._btIndicator || !this._btParent ||
          !this._bt) {
        this._btSyncId = null;
        return GLib.SOURCE_REMOVE;
      }
      const before = this._btIcon.visible;
      try {
        this._bt._sync();
      } catch (e) {
        log(`battery-buddy: 蓝牙 _sync() 异常: ${e}`);
      }
      if (before !== this._btIcon.visible)
        log(`battery-buddy: 蓝牙兜底同步: icon.visible ${before} -> ${this._btIcon.visible}`);
      return GLib.SOURCE_CONTINUE;
    });

    // 跟随顶栏缩放比例
    if (this._theme) {
      this._btThemeId = this._theme.connect('notify::scale-factor', () => {
        const s = this._theme.scaleFactor * 16;
        this._btIcon.set({ width: s, height: s });
      });
    }
    log('battery-buddy: 蓝牙顶栏图标替换已启用');
    return true;
  }

  _unpatchBluetoothIcon() {
    if (this._btRetryId) {
      GLib.source_remove(this._btRetryId);
      this._btRetryId = null;
    }
    if (this._btSyncId) {
      GLib.source_remove(this._btSyncId);
      this._btSyncId = null;
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
    this._btParent = null;
    this._bt = null;
  }

  // 音量顶栏图标替换：GNOME 50 中快速设置的音量指示器属性为
  // qs._volumeOutput（OutputIndicator，见 panel.js _setupIndicators），
  // 由 _setupIndicators() 异步创建并依赖 PulseAudio/MixerControl 就绪，
  // 沿用 WiFi/蓝牙的轮询重试模式。音量按 icon-name 分 4 档。
  _initVolumeIcon(qs) {
    const volume = qs._volumeOutput ?? qs._volume;
    const ok =
      volume && volume._indicator && volume._indicator.get_parent()
        ? this._patchVolumeIcon(volume)
        : false;
    if (ok)
      return;
    this._volRetries += 1;
    if (this._volRetries > MAX_ICON_RETRIES) {
      log('battery-buddy: Volume icon: qs._volumeOutput 未就绪，放弃替换');
      return;
    }
    const delay = this._volRetries <= 2 ? 300 : this._volRetries <= 6 ? 600 : 1000;
    this._volRetryId = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      delay,
      () => {
        this._volRetryId = null;
        this._initVolumeIcon(qs);
        return GLib.SOURCE_REMOVE;
      }
    );
  }

  // 保守替换：隐藏原图标 + 追加自定义图标 + 同步显隐与音量档位。
  // 原图标的 icon_name 由官方 stream-updated 更新为
  // audio-volume-{muted,low,medium,high,overamplified}-symbolic，
  // 这里监听 notify::icon-name 映射到自定义 4 档 SVG。
  _patchVolumeIcon(volume) {
    const indicator = volume._indicator;
    const parent = indicator?.get_parent();
    if (!indicator || !parent) {
      return false;
    }
    if (this._volIcon)
      return true;
    const size = this._theme ? this._theme.scaleFactor * 16 : 16;
    this._volIcon = new VolumeIcon({
      width: size,
      height: size,
    });
    this._vol = volume;
    this._volIndicator = indicator;
    this._volParent = parent;
    // 先加入父容器：确保 _syncIndicatorsVisible() 始终有可见 child
    parent.add_child(this._volIcon);

    // 把官方 visible 语义转发给自定义图标，原图标始终保持隐藏；
    // 同时直接接管父容器显隐，不依赖官方回调的执行时序。
    // 注意：设置 indicator.visible = false 会同步再次触发 notify::visible，
    // 若不加守卫，重入的 handler 会重读（已被强置 false 的）indicator.visible，
    // 把刚显示的 _volIcon 误设为隐藏（图标永远不显示）。
    let syncing = false;
    const syncVisible = () => {
      if (syncing)
        return;
      syncing = true;
      this._volIcon.visible = indicator.visible;
      indicator.visible = false;
      parent.visible = this._volIcon.visible;
      syncing = false;
    };
    this._volVisibleId = indicator.connect('notify::visible', syncVisible);
    syncVisible();

    // 兜底：音量依赖 PipeWire/Gvc 就绪，官方 visible 的 notify 链路在
    // 开机或调音量（键盘音量键/面板滑杆）时可能失效，图标卡在隐藏。
    // 因此同时接入官方 stream-updated 信号（官方 handler 先执行，这里
    // 直接从 _output 重读真实状态，调音量即刻恢复）+ 每 1 秒轮询兜底，
    // 双重保证图标在任意时刻都能收敛到正确显隐与档位（异步、开销可忽略）。
    // getIcon() 为 null 即无输出流（应隐藏），否则按档位显示。
    // 注意：必须带 syncing 守卫——设置 indicator.visible = false 会同步
    // 触发 notify::visible 重入，把刚显示的图标误设为隐藏。
    const applyOutputState = () => {
      if (syncing)
        return;
      if (!this._vol?._output)
        return;
      syncing = true;
      const icon = this._vol._output.getIcon();
      if (icon)
        this._volIcon.set_level(this._volumeIconNameToLevel(icon));
      const show = icon !== null;
      this._volIcon.visible = show;
      this._volIndicator.visible = false;
      this._volParent.visible = show;
      syncing = false;
    };
    this._volStreamId = this._vol._output.connect('stream-updated', applyOutputState);
    this._volSyncId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
      if (!this._volIcon || !this._volIndicator || !this._volParent ||
          !this._vol || !this._vol._output) {
        this._volSyncId = null;
        return GLib.SOURCE_REMOVE;
      }
      const before = this._volIcon.visible;
      applyOutputState();
      if (before !== this._volIcon.visible)
        log(`battery-buddy: 音量兜底同步: icon.visible ${before} -> ${this._volIcon.visible}`);
      return GLib.SOURCE_CONTINUE;
    });

    const syncLevel = () => {
      this._volIcon.set_level(this._volumeIconNameToLevel(indicator.icon_name));
    };
    this._volIconNameId = indicator.connect('notify::icon-name', syncLevel);
    syncLevel();

    // 跟随顶栏缩放比例
    if (this._theme) {
      this._volThemeId = this._theme.connect('notify::scale-factor', () => {
        const s = this._theme.scaleFactor * 16;
        this._volIcon.set({ width: s, height: s });
      });
    }
    log('battery-buddy: 音量顶栏图标替换已启用');
    return true;
  }

  // 官方音量档位映射（见 volume.js 的 icon_name 规则）：
  // muted / low / medium / high / overamplified
  _volumeIconNameToLevel(iconName) {
    if (!iconName)
      return 'muted';
    if (iconName.includes('muted'))
      return 'muted';
    if (iconName.includes('low'))
      return 'low';
    if (iconName.includes('medium'))
      return 'medium';
    return 'high'; // high / overamplified
  }

  _unpatchVolumeIcon() {
    if (this._volRetryId) {
      GLib.source_remove(this._volRetryId);
      this._volRetryId = null;
    }
    if (this._volSyncId) {
      GLib.source_remove(this._volSyncId);
      this._volSyncId = null;
    }
    if (this._volStreamId && this._vol?._output) {
      this._vol._output.disconnect(this._volStreamId);
      this._volStreamId = null;
    }
    if (this._volIconNameId && this._volIndicator) {
      this._volIndicator.disconnect(this._volIconNameId);
      this._volIconNameId = null;
    }
    if (this._volVisibleId && this._volIndicator) {
      this._volIndicator.disconnect(this._volVisibleId);
      this._volVisibleId = null;
    }
    if (this._volThemeId && this._theme) {
      this._theme.disconnect(this._volThemeId);
      this._volThemeId = null;
    }
    if (this._volIcon) {
      this._volIcon.destroy();
      this._volIcon = null;
    }
    if (this._vol && this._volIndicator) {
      // 恢复官方对原图标 icon_name / 显隐的接管
      this._volIndicator.visible = true;
      this._vol._sync?.();
    }
    this._volIndicator = null;
    this._volParent = null;
    this._vol = null;
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
    // 音量顶栏图标清理
    this._unpatchVolumeIcon();
    if (this._settings) {
      if (this._wifiSettingsId) {
        this._settings.disconnect(this._wifiSettingsId);
        this._wifiSettingsId = null;
      }
      if (this._btSettingsId) {
        this._settings.disconnect(this._btSettingsId);
        this._btSettingsId = null;
      }
      if (this._volSettingsId) {
        this._settings.disconnect(this._volSettingsId);
        this._volSettingsId = null;
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
