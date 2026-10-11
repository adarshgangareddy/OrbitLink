import os
import platform
import socket
from typing import Dict, Optional, Tuple
import psutil

# Previous baseline in-memory cache to compute delta between samples
_previous_counters: Dict[str, Tuple[int, int]] = {}


def bytes_to_human(byte_count: int, use_binary: bool = False) -> str:
    """
    Format bytes cleanly.
    Distinguish decimal GB (10^9) vs binary GiB (2^30).
    """
    if byte_count < 0:
        return "0 B"

    unit_base = 1024 if use_binary else 1000
    suffix = "iB" if use_binary else "B"
    units = ["", "K", "M", "G", "T", "P"]

    val = float(byte_count)
    for u in units:
        if val < unit_base or u == "P":
            if u == "":
                return f"{int(val)} B"
            return f"{val:.2f} {u}{suffix}"
        val /= unit_base
    return f"{val:.2f} P{suffix}"


def bytes_to_decimal_gb(byte_count: int) -> float:
    """1 GB = 1,000,000,000 bytes (decimal standard)"""
    return round(byte_count / 1_000_000_000, 4)


def bytes_to_binary_gib(byte_count: int) -> float:
    """1 GiB = 1,073,741,824 bytes (binary standard)"""
    return round(byte_count / (1024 ** 3), 4)


def get_device_id() -> str:
    """Returns local host name or user identifier"""
    try:
        return socket.gethostname()
    except Exception:
        return "device-local"


def get_all_interfaces_counters() -> Dict[str, Dict[str, int]]:
    """
    Retrieves network byte counters across all interfaces using psutil.
    """
    result = {}
    counters = psutil.net_io_counters(pernic=True)
    for iface_name, stat in counters.items():
        result[iface_name] = {
            "bytes_sent": stat.bytes_sent,
            "bytes_recv": stat.bytes_recv,
            "packets_sent": stat.packets_sent,
            "packets_recv": stat.packets_recv,
            "errin": stat.errin,
            "errout": stat.errout,
            "dropin": stat.dropin,
            "dropout": stat.dropout,
        }
    return result


def find_primary_interface() -> Optional[str]:
    """
    Discovers the most active non-loopback network interface.
    Prefers Wi-Fi / wlan / ethernet interfaces with non-zero traffic.
    """
    all_counters = psutil.net_io_counters(pernic=True)
    stats = psutil.net_if_stats()

    best_iface = None
    max_traffic = -1

    # Typical loopback identifiers
    loopbacks = {"lo", "loopback", "Loopback Pseudo-Interface 1"}

    for iface, counter in all_counters.items():
        if iface.lower() in [l.lower() for l in loopbacks]:
            continue

        # Check if interface is reported as up (if stats available)
        is_up = True
        if iface in stats:
            is_up = stats[iface].isup

        total_traffic = counter.bytes_sent + counter.bytes_recv
        if is_up and total_traffic > max_traffic:
            max_traffic = total_traffic
            best_iface = iface

    # Fallback to any non-loopback if available
    if not best_iface and all_counters:
        for iface in all_counters:
            if iface.lower() not in [l.lower() for l in loopbacks]:
                return iface
        return list(all_counters.keys())[0]

    return best_iface


def calculate_counter_deltas(
    interface_name: str,
    bytes_sent: int,
    bytes_recv: int,
) -> Tuple[Optional[int], Optional[int]]:
    """
    Calculates incremental byte deltas since the last reading for this interface.
    Never treats negative counter deltas as negative data usage (e.g. system reboot or counter rollover).
    """
    global _previous_counters
    if interface_name not in _previous_counters:
        _previous_counters[interface_name] = (bytes_sent, bytes_recv)
        return None, None

    prev_sent, prev_recv = _previous_counters[interface_name]
    _previous_counters[interface_name] = (bytes_sent, bytes_recv)

    # Detect counter reset or reboot
    if bytes_sent < prev_sent or bytes_recv < prev_recv:
        # Counter was reset or rolled over; avoid negative usage
        delta_sent = bytes_sent if bytes_sent >= 0 else 0
        delta_recv = bytes_recv if bytes_recv >= 0 else 0
        return delta_sent, delta_recv

    delta_sent = bytes_sent - prev_sent
    delta_recv = bytes_recv - prev_recv
    return delta_sent, delta_recv


def read_linux_proc_net_dev() -> Optional[Dict[str, Dict[str, int]]]:
    """
    Inspects /proc/net/dev on Linux systems where available.
    """
    if platform.system() != "Linux" or not os.path.exists("/proc/net/dev"):
        return None

    results = {}
    try:
        with open("/proc/net/dev", "r") as f:
            lines = f.readlines()
        for line in lines[2:]:
            parts = line.strip().split(":")
            if len(parts) == 2:
                iface = parts[0].strip()
                fields = parts[1].split()
                if len(fields) >= 16:
                    results[iface] = {
                        "bytes_recv": int(fields[0]),
                        "packets_recv": int(fields[1]),
                        "bytes_sent": int(fields[8]),
                        "packets_sent": int(fields[9]),
                    }
        return results
    except Exception:
        return None
