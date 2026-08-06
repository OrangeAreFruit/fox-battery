#!/bin/bash
# 更新: 开机自动加载 acpi_call 模块; 服务/udev 套用上次保存的选择(auto)
# 用法: sudo bash update.sh
set -e

HERE="$(cd "$(dirname "$0")" && pwd)"

echo "==> [1/6] 同步控制脚本到 /usr/local/bin"
install -m 755 "${HERE}/battery-limit.sh" /usr/local/bin/battery-limit.sh

echo "==> [2/6] 配置 acpi_call 开机自动加载"
echo "acpi_call" > /etc/modules-load.d/acpi-call.conf

echo "==> [3/6] 立即加载 acpi_call 模块"
modprobe acpi_call
[ -e /proc/acpi/call ] || { echo "错误: /proc/acpi/call 仍不存在" >&2; exit 1; }

echo "==> [4/6] 安装包装脚本（确保模块加载后套用上次选择）"
cat > /usr/local/bin/battery-limit-apply.sh <<'EOF'
#!/bin/bash
# 供开机服务/udev 调用: 确保 acpi_call 模块加载后套用上次保存的选择
modprobe acpi_call 2>/dev/null
sleep 0.1
exec /usr/local/bin/battery-limit.sh auto
EOF
chmod 755 /usr/local/bin/battery-limit-apply.sh

echo "==> [5/6] 更新开机服务"
cat > /etc/systemd/system/battery-limit.service <<'EOF'
[Unit]
Description=Apply Redmi battery charge limit on boot
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/battery-limit-apply.sh

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload

echo "==> [6/6] 更新插电 udev 规则"
cat > /etc/udev/rules.d/99-battery-limit.rules <<'EOF'
# Redmi Book Pro: 插上/更换充电器时重新应用上次保存的充电上限
ACTION=="add", SUBSYSTEM=="power_supply", ATTR{type}=="Mains", RUN+="/usr/local/bin/battery-limit-apply.sh"
ACTION=="change", SUBSYSTEM=="power_supply", ATTR{type}=="Mains", RUN+="/usr/local/bin/battery-limit-apply.sh"
EOF
udevadm control --reload-rules

echo "==> 应用当前选择: disable（可充满至 100%）"
/usr/local/bin/battery-limit.sh disable

echo ""
echo "当前限制值: $(/usr/local/bin/battery-limit.sh value)（0=未启用）"
echo "电池: $(cat /sys/class/power_supply/BAT0/capacity)% / $(cat /sys/class/power_supply/BAT0/status)"
echo ""
echo "完成。acpi_call 已开机自动加载，开机/插电都会自动保持上次的选择。"
