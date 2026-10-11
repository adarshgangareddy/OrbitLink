from typing import Dict, Any, Optional
import psutil
from app.monitoring.counters import (
    find_primary_interface,
    get_device_id,
    calculate_counter_deltas,
)
from app.monitoring.probes import measure_network_latency
from app.core.logging import logger


def collect_live_measurement() -> Dict[str, Any]:
    """
    Performs a real, live measurement on the local host.
    Reads actual interface byte counters and probes network latency.
    """
    device_id = get_device_id()
    iface = find_primary_interface()

    if not iface:
        return {
            "device_id": device_id,
            "interface_name": "none",
            "bytes_sent": 0,
            "bytes_recv": 0,
            "bytes_sent_delta": None,
            "bytes_recv_delta": None,
            "latency_ms": None,
            "packet_loss_pct": None,
            "download_speed_mbps": None,
            "upload_speed_mbps": None,
            "wifi_ssid": None,
            "wifi_signal_pct": None,
            "measurement_method": "no_active_interface_detected",
            "status": "disconnected",
            "is_simulated": False,
            "notes": "No active network interface discovered on system",
        }

    counters = psutil.net_io_counters(pernic=True).get(iface)
    bytes_sent = counters.bytes_sent if counters else 0
    bytes_recv = counters.bytes_recv if counters else 0

    delta_sent, delta_recv = calculate_counter_deltas(iface, bytes_sent, bytes_recv)
    latency_ms, latency_method, status = measure_network_latency()

    method_desc = f"psutil_counters + {latency_method}"
    notes = None
    if status == "disconnected":
        notes = "Network probe targets unreachable; device appears offline or ICMP/HTTP blocked."

    return {
        "device_id": device_id,
        "interface_name": iface,
        "bytes_sent": bytes_sent,
        "bytes_recv": bytes_recv,
        "bytes_sent_delta": delta_sent,
        "bytes_recv_delta": delta_recv,
        "latency_ms": latency_ms,
        "packet_loss_pct": 0.0 if latency_ms is not None else 100.0,
        "download_speed_mbps": None,  # Active speed test is opt-in and rate-limited
        "upload_speed_mbps": None,
        "wifi_ssid": None,
        "wifi_signal_pct": None,
        "measurement_method": method_desc,
        "status": status,
        "is_simulated": False,
        "notes": notes,
    }
