# Fox Battery（狐狸电池）

**可爱又实用的 GNOME 电池扩展**

![总览](assets/overview.png)

[![GitHub stars](https://img.shields.io/github/stars/OrangeAreFruit/fox-battery?style=social&label=Stars)](https://github.com/OrangeAreFruit/fox-battery)
[![GitHub issues](https://img.shields.io/github/issues/OrangeAreFruit/fox-battery?style=social&label=Issues)](https://github.com/OrangeAreFruit/fox-battery/issues)
[![License](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.html)

**把顶栏的电池，变成一只会说话的小狐狸**

### 一句话介绍

用可爱的卡通狐狸替换 GNOME 顶栏的默认电池图标，打开电脑的第一眼就是好心情。

### 核心能力

- 🦊 **狐狸电池图标**：顶栏 / 快捷设置 / 锁屏三处统一替换，实时显示电量
- 📶 **自定义 WiFi 图标**：系统默认 / 简约白 / 清新蓝三档下拉选择，信号格实时映射信号强度
- 🎵 **自定义音量图标**：喇叭 + 声纹样式，白色声纹表示当前档位、暗灰表示未达到的档位
- 🅱️ **自定义蓝牙图标**：简约白色蓝牙符号替换顶栏蓝牙图标，蓝牙开启时常显
- 🔋 **硬件级充电上限**：80% / 90% / 100% 三档一键设置，基于 acpi_call + WMI 直接控制 EC 充电，延长电池寿命
- 🌐 **多语言设置面板**：跟随系统 / 中文 / 英文，即时切换

### 适合谁

**狐狸图标对所有笔记本都可用**，开箱即用；**充电上限**功能专为 **小米 / 红米笔记本**（Redmi Book 等）设计，基于 acpi_call + WMI 实现硬件级充电控制。

## 预览

| 电量状态 | 充电中 |
|---|---|
| ![电量状态](assets/contact-sheet.png) | ![充电中](assets/fox-charging.png) |

| 100% | 75% | 50% | 25% |
|---|---|---|---|
| ![100%](assets/fox-100.png) | ![75%](assets/fox-75.png) | ![50%](assets/fox-50.png) | ![25%](assets/fox-25.png) |

### WiFi 信号格图标

顶栏 WiFi 图标在设置面板下拉可选 **系统默认 / 简约白 / 清新蓝** 三种样式，信号格实时映射信号强度。

**简约白（白色实心，与音量声纹配色统一）**

| 信号强（3 格） | 信号中（2 格） | 信号弱（1 格） |
|---|---|---|
| ![信号强](assets/signal-white-strong.svg) | ![信号中](assets/signal-white-medium.svg) | ![信号弱](assets/signal-white-weak.svg) |

**清新蓝（蓝色实心）**

| 信号强（3 格） | 信号中（2 格） | 信号弱（1 格） |
|---|---|---|
| ![信号强](assets/signal-bar-strong.svg) | ![信号中](assets/signal-bar-medium.svg) | ![信号弱](assets/signal-bar-weak.svg) |

### 蓝牙图标

顶栏蓝牙图标替换为简约白色蓝牙符号（蓝牙适配器开启时常显，关闭时隐藏）。

| 简约白（当前使用） | 清新蓝（备用素材） |
|---|---|
| ![简约白](assets/bluetooth-icon-white.svg) | ![清新蓝](assets/bluetooth-icon-blue.svg) |

### 音量图标

顶栏音量图标替换为喇叭 + 声纹样式，白色声纹表示当前音量档位、暗灰表示未达到的档位。

| 静音 | 低音量 | 中音量 | 高音量 |
|---|---|---|---|
| ![静音](assets/volume-muted.svg) | ![低音量](assets/volume-low.svg) | ![中音量](assets/volume-medium.svg) | ![高音量](assets/volume-high.svg) |

## 功能特色

### 开箱即用

| ✅ **一键替换图标** | 启用扩展后，顶栏与快捷设置面板的电池图标立即变成狐狸，无需任何配置 |
|---|---|
| ✅ **锁屏同样生效** | 锁屏界面（Super+L）下顶栏保持显示，狐狸图标照常工作 |
| ✅ **界面语言切换** | 设置面板内置 **跟随系统 / 中文 / 英文** 三档语言，切换即时生效 |

### 狐狸电池图标

| 特性 | 说明 |
|---|---|
| 🦊 **卡通狐狸造型** | 固定 2:1 比例的狐狸电池，充电时绿色填充 + 闪电标识 |
| 🔋 **实时电量** | 直接读取内核 `/sys/class/power_supply/BAT0/`，绕过 UPower 约 20 秒的延迟判定，状态秒级同步 |
| 📱 **随缩放适配** | 自动跟随 HiDPI 缩放因子渲染，面板 / 快捷设置两处尺寸独立适配 |

### 自定义 WiFi 图标

| 特性 | 说明 |
|---|---|
| 📶 **三档样式** | 设置面板下拉选择：**系统默认**（官方图标）/ **简约白**（白色实心）/ **清新蓝**（蓝色实心） |
| 🔄 **实时映射** | 官方信号强度自动映射：`excellent/good → 3 格`、`ok → 2 格`、`weak/none → 1 格` |
| ⚡ **即时切换** | 下拉切换即时生效，选回系统默认即还原官方 WiFi 图标 |

### 充电上限

| 档位 | 说明 |
|---|---|
| **100%** | 不限制（默认充满） |
| **90%** | 充至 90% 停止（延长电池寿命） |
| **80%** | 充至 80% 停止（最长寿命） |

- 设置即时生效，并**持久化保存**到 `/etc/battery-limit.conf`
- **开机自动套用**（systemd 服务）
- **插拔充电器自动重新套用**（udev 规则，EC 在插拔时会重置限制）

## 工作原理

```
┌─────────────────────────────────────────────────────────┐
│ Fox Battery (GNOME Shell 扩展)                          │
├──────────────────────────────┬──────────────────────────┤
│ 狐狸图标渲染                  │ 充电上限控制               │
│ Canvas 绘制 foxicon          │ battery-limit.sh          │
│  ───────────────             │  ─────────────            │
│ 顶栏 / 快捷设置 / 锁屏        │ acpi_call 模块             │
│ 状态读取                      │   └→ /proc/acpi/call      │
│  /sys/class/power_supply/    │       └→ WMI WMAA 方法      │
│      BAT0/{capacity,status}  │           └→ EC 充电控制    │
└──────────────────────────────┴──────────────────────────┘
```

| 层级 | 技术 |
|---|---|
| **扩展框架** | GNOME Shell Extension API（兼容 Shell 45 – 50） |
| **图标绘制** | Clutter Canvas / SVG 矢量狐狸 |
| **充电上限** | [acpi_call](https://github.com/mkottman/acpi_call) 内核模块 + `\_SB.PC00.WMID.WMAA` WMI 方法 |
| **状态读取** | 内核 sysfs（`capacity` / `status`），不依赖 UPower 延迟判定 |
| **持久化** | systemd 服务 + udev 规则 + `/etc/battery-limit.conf` |

> 充电上限原理参考自 [toshka/redmi-charge-limiter](https://github.com/toshka/redmi-charge-limiter)：通过 `acpi_call` 调用 WMI `WMAA` 方法，op=0xfb 写入 / op=0xfa 读取，第 7 字节 `0x00`=禁用、`0x01`=80%、`0x04`=90%。

## 支持机型

- 小米 / 红米笔记本（Redmi Book Pro 14 2025 等）
- 需要内核支持 `acpi_call` 模块，且 WMI 存在 `WMAA` 充电控制方法

⚠️ 其他品牌笔记本可能没有对应的 WMI 方法，充电上限功能不适用（图标功能不受影响）。

## 安装

### 1. 安装充电控制脚本（可选，仅充电上限需要）

```bash
# 克隆仓库，进入配套脚本目录
git clone https://github.com/OrangeAreFruit/fox-battery.git
cd fox-battery/battery-limit

# 一键安装（自动编译 acpi_call、注册开机服务与 udev 规则）
sudo bash install.sh
```

### 2. 安装扩展

```bash
# 回到仓库根目录，将扩展目录复制到用户扩展目录
cd ..
cp -r battery-buddy@lanfanqie ~/.local/share/gnome-shell/extensions/

# 重启 GNOME Shell（Wayland 下注销重新登录）
# 然后启用扩展：
gnome-extensions enable battery-buddy@lanfanqie
```

### 3. 使用

打开 **扩展管理器**（Extension Manager）→ 找到 **Fox Battery** → 点击齿轮按钮打开设置面板：

- **充电上限**：选择 100% / 90% / 80%，立即生效并持久化
- **WiFi 图标**：系统默认 / 简约白 / 清新蓝三档下拉选择，切换即时生效
- **界面语言**：跟随系统 / 中文 / 英文

## 项目结构

```
battery-buddy@lanfanqie/
├── extension.js          # 扩展主逻辑（图标补丁、内核状态读取、轮询兜底）
├── prefs.js              # 设置面板（Adw 窗口：充电上限 + 语言切换）
├── metadata.json         # 扩展元数据（UUID / Shell 版本 / schema）
├── stylesheet.css        # 图标样式
├── modules/
│   ├── fox-widget.js     # 狐狸电池图标组件（顶栏 / 快捷设置）
│   ├── foxicon.js        # 狐狸 SVG 绘制
│   ├── mock.js           # 调试用模拟电源代理
│   ├── sdt/              # 注入工具（InjectionTracker）
│   └── util.js           # 调试开关等工具
├── schemas/              # GSettings schema（语言设置持久化）
├── battery-limit/        # 充电上限配套脚本（install.sh / battery-limit.sh / udev+polkit 规则）
├── assets/               # README 预览素材（电池 / WiFi / 蓝牙 / 音量图标）
└── preview/              # 图标素材源文件（PNG / SVG）
```

配套系统组件（由 `install.sh` 安装）：

```
/usr/local/bin/battery-limit.sh        # 充电上限控制脚本（80|90|disable|value|auto）
/etc/systemd/system/battery-limit.service   # 开机自动套用
/etc/udev/rules.d/99-battery-limit.rules    # 插拔充电器自动套用
/etc/polkit-1/rules.d/49-battery-buddy.rules # 设置面板免密调用脚本
/etc/battery-limit.conf                # 持久化保存当前上限
```

## 路线图

| 功能 | 状态 |
|---|---|
| 🦊 狐狸电池图标（顶栏 / 快捷设置 / 锁屏） | ✅ **已完成** |
| 📶 自定义 WiFi 信号格图标（三档样式） | ✅ **已完成** |
| 🎵 自定义音量图标（声纹档位） | ✅ **已完成** |
| 🅱️ 自定义蓝牙图标（简约白） | ✅ **已完成** |
| 🔋 实时状态（绕过 UPower 延迟） | ✅ **已完成** |
| ⚡ 充电上限 80% / 90% / 100% | ✅ **已完成** |
| 🌐 中英双语界面 | ✅ **已完成** |
| 🔌 开机 / 插电自动套用 | ✅ **已完成** |
| ⏳ 更多品牌机型适配 | *计划中* |

## 反馈与支持

如果这个扩展对你有帮助，欢迎：

- ⭐ **点个 Star**：https://github.com/OrangeAreFruit/fox-battery
- 🐛 **反馈问题**：遇到 Bug、机型不适配或功能建议，请到 [Issues](https://github.com/OrangeAreFruit/fox-battery/issues) 留言，我会尽快回复
- 💡 **机型适配请求**：你的小米/红米笔记本充电上限不生效？到 [Issues](https://github.com/OrangeAreFruit/fox-battery/issues) 带上你的机型信息发帖

## 灵感来源与致谢

本项目站在以下开源/公开项目与设计理念之上：

| 来源 | 说明 |
|---|---|
| 🦊 [Battery Buddy](https://batterybuddy.app/)（Neil Sardesai） | macOS 菜单栏应用。本项目的**名称**与"可爱电池图标"设计理念的**灵感来源**，与本项目**无任何关联**，其代码为闭源，本项目未使用其任何代码或素材 |
| [Deminder/battery-indicator-icon](https://github.com/Deminder/battery-indicator-icon) | GNOME 电池图标扩展。本扩展的**框架结构**参考自该项目（GPL-3.0），狐狸图标与设置面板均为本项目**完全重构** |
| [toshka/redmi-charge-limiter](https://github.com/toshka/redmi-charge-limiter) | 充电上限的 WMI `WMAA` 方法参考（开源） |

## 许可证

本扩展基于 [GPL-3.0-or-later](https://www.gnu.org/licenses/gpl-3.0.html) 开源。扩展框架参考自 [Deminder/battery-indicator-icon](https://github.com/Deminder/battery-indicator-icon)（GPL-3.0，代码版权归原作者），狐狸图标与设置面板均由本项目完全重构。

Copyright © 2026 [OrangeAreFruit](https://github.com/OrangeAreFruit)

*Built with ❤️ by [一颗烂番茄](https://github.com/OrangeAreFruit)*
