#!/bin/bash
# Redmi Book Pro 电池充电上限 - 一键安装
# 用法: sudo bash install.sh [档位]    档位: 40 50 60 70 80（默认 80）
set -e

LIMIT="${1:-80}"
case "$LIMIT" in
    40|50|60|70|80) ;;
    *) echo "无效档位: $LIMIT（可选: 40 50 60 70 80）" >&2; exit 1 ;;
esac

HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> [1/6] 安装内核头文件与 acpi-call-dkms（编译 acpi_call 模块，请稍候）"
apt-get update -qq
apt-get install -y linux-headers-$(uname -r) acpi-call-dkms

echo "==> [2/6] 加载 acpi_call 模块"
modprobe acpi_call
[ -e /proc/acpi/call ] || { echo "错误: /proc/acpi/call 不存在，模块加载失败" >&2; exit 1; }

echo "==> [3/6] 安装控制脚本 /usr/local/bin/battery-limit.sh"
install -Dm755 "${HERE}/battery-limit.sh" /usr/local/bin/battery-limit.sh

echo "==> [4/6] 注册开机自启服务（每次开机自动套用上次保存的选择）"
cat > /etc/systemd/system/battery-limit.service <<'EOF'
[Unit]
Description=Apply Redmi battery charge limit on boot
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/battery-limit.sh auto

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable battery-limit.service

echo "==> [5/6] 注册插电 udev 规则（EC 在插拔充电器时会重置限制）"
cat > /etc/udev/rules.d/99-battery-limit.rules <<'EOF'
# Redmi Book Pro: 插上/更换充电器时重新应用上次保存的充电上限
ACTION=="add", SUBSYSTEM=="power_supply", ATTR{type}=="Mains", RUN+="/usr/local/bin/battery-limit.sh auto"
ACTION=="change", SUBSYSTEM=="power_supply", ATTR{type}=="Mains", RUN+="/usr/local/bin/battery-limit.sh auto"
EOF
udevadm control --reload

echo "==> [6/6] 立即应用 ${LIMIT}% 充电上限"
/usr/local/bin/battery-limit.sh "${LIMIT}"
/usr/local/bin/battery-limit.sh status
echo "当前电池: $(cat /sys/class/power_supply/BAT0/capacity)% / $(cat /sys/class/power_supply/BAT0/status)"

echo ""
echo "安装完成。日常操作:"
echo "  修改上限: sudo battery-limit.sh 80   （或 90，本次已应用 ${LIMIT}% 并保存）"
echo "  关闭限制: sudo battery-limit.sh disable"
echo "  查看状态: sudo battery-limit.sh status"
echo "  开机/插电时会自动套用上次保存的选择"
