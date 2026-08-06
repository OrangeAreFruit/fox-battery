#!/bin/bash
# Redmi Book Pro 14/16 2025 电池充电上限控制
# 通过 acpi_call 内核模块调用 ACPI WMI 方法 \_SB.PC00.WMID.WMAA
# （与 Windows 端小米 PC Manager 使用的接口相同）
#
# 用法:
#   battery-limit.sh <档位>    设置充电上限: 40 50 60 70 80 90
#   battery-limit.sh disable   关闭充电限制（可充满至 100%）
#   battery-limit.sh auto      套用上次保存的选择（供开机服务/udev 调用）
#   battery-limit.sh status    查看当前状态（人类可读）
#   battery-limit.sh value     输出当前上限数值（0=未启用，供面板/脚本读取）

WMAA='\\_SB.PC00.WMID.WMAA'
CALL='/proc/acpi/call'
CONF='/etc/battery-limit.conf'

# 向 EC 写入/读取: op=0xfb 写入, 0xfa 读取; value=限制值字节
acpi_call() {
    local op="$1" value="$2"
    local buf="0x00 ${op} 0x00 0x10 0x02 0x00 ${value} 0x00 \
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 \
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00 \
0x00 0x00 0x00 0x00 0x00 0x00 0x00 0x00"
    echo "${WMAA} 0x0 0x1 { ${buf} }" > "${CALL}" 2>/dev/null || {
        echo "错误: 无法写入 ${CALL}，acpi_call 模块未加载？" >&2
        exit 1
    }
    cat "${CALL}" 2>/dev/null | tr -d '\0'
}

# 将 EC 返回缓冲区中第 7 个字节（索引 6，即写入时的限制值字节）映射为百分比档位
byte_to_limit() {
    case "$1" in
        0x01) echo "80" ;;
        0x04) echo "90" ;;
        0x05) echo "70" ;;
        0x06) echo "60" ;;
        0x07) echo "50" ;;
        0x08) echo "40" ;;
        *) echo "0" ;;
    esac
}

# 读取当前 EC 中的限制值，输出数字（0=未启用）
read_limit() {
    local result byte7
    result=$(acpi_call "0xfa" "0x00")
    if [ -z "$result" ] || [ "$result" = "Error" ]; then
        echo "错误: ACPI 读取失败: ${result:-空}" >&2
        echo "0"
        return 1
    fi
    byte7=$(echo "$result" | grep -o '0x[0-9a-fA-F]\+' | sed -n '7p')
    byte_to_limit "${byte7:-0x00}"
}

set_charge_limit() {
    local limit_hex
    case "$1" in
        40) limit_hex="0x08" ;;
        50) limit_hex="0x07" ;;
        60) limit_hex="0x06" ;;
        70) limit_hex="0x05" ;;
        80) limit_hex="0x01" ;;
        90) limit_hex="0x04" ;;
        *) echo "无效档位: $1（可选: 40 50 60 70 80 90）" >&2; exit 1 ;;
    esac
    # 与小米官方序列一致: 先清除, 等待 50ms, 再写入目标值
    acpi_call "0xfb" "0x00" > /dev/null
    sleep 0.05
    local result
    result=$(acpi_call "0xfb" "$limit_hex")
    if [ -n "$result" ] && [ "$result" != "Error" ]; then
        echo "已设置: 充电上限 ${1}%"
        save_setting "$1"
    else
        echo "错误: ACPI 调用返回异常: ${result:-空}" >&2
        exit 1
    fi
}

disable_charge_limit() {
    local result
    result=$(acpi_call "0xfb" "0x00")
    if [ -n "$result" ] && [ "$result" != "Error" ]; then
        echo "已关闭充电限制（可充满至 100%）"
        save_setting "disable"
    else
        echo "错误: ACPI 调用返回异常: ${result:-空}" >&2
        exit 1
    fi
}

# 持久化用户选择，供开机/插电时自动套用
save_setting() {
    if ! echo "$1" > "$CONF" 2>/dev/null; then
        echo "警告: 无法写入 $CONF（本次选择重启后不会保留）" >&2
    fi
}

# auto: 读取上次保存的选择并应用（配置文件不存在时回退到默认 80）
apply_setting() {
    local val
    if [ -r "$CONF" ]; then
        val=$(tr -d '[:space:]' < "$CONF")
    fi
    case "${val:-80}" in
        disable) disable_charge_limit ;;
        *)        set_charge_limit "${val:-80}" ;;
    esac
}

show_status() {
    local result limit
    result=$(acpi_call "0xfa" "0x00")
    echo "EC 原始返回: ${result}"
    limit=$(byte_to_limit "$(echo "$result" | grep -o '0x[0-9a-fA-F]\+' | sed -n '7p')")
    if [ "$limit" = "0" ]; then
        echo "状态: 充电上限未启用（可充满至 100%）"
    else
        echo "状态: 充电上限 ${limit}%"
    fi
}

case "$1" in
    disable)        disable_charge_limit ;;
    auto)           apply_setting ;;
    status)         show_status ;;
    value)          read_limit ;;
    40|50|60|70|80|90) set_charge_limit "$1" ;;
    *)
        echo "用法: $0 <档位|disable|auto|status|value>" >&2
        echo "  档位: 40 50 60 70 80 90（% 充电上限）" >&2
        echo "  disable: 关闭充电限制" >&2
        echo "  auto: 套用上次保存的选择（供开机服务/udev 调用）" >&2
        echo "  status: 查看当前状态" >&2
        echo "  value: 输出当前上限数值（0=未启用）" >&2
        exit 1 ;;
esac
