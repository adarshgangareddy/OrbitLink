import platform
import re
import subprocess
import time
from typing import Optional, Tuple
import httpx
from app.core.config import settings
from app.core.logging import logger


def probe_http_latency(url: Optional[str] = None) -> Tuple[Optional[float], Optional[str]]:
    """
    Measures HTTP roundtrip time in milliseconds using httpx.
    Returns (latency_ms, error_msg).
    """
    target_url = url or settings.HTTP_PROBE_URL
    try:
        start_time = time.perf_counter()
        with httpx.Client(timeout=2.0, verify=False) as client:
            resp = client.head(target_url)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return round(elapsed_ms, 2), None
    except Exception as exc:
        logger.debug(f"HTTP latency probe failed: {exc}")
        return None, str(exc)


def probe_icmp_ping(target_host: Optional[str] = None) -> Tuple[Optional[float], Optional[str]]:
    """
    Executes a single ICMP ping probe adhering to OS differences.
    Returns (latency_ms, error_msg).
    """
    host = target_host or settings.DEFAULT_PING_TARGET
    is_windows = platform.system() == "Windows"
    cmd = (
        ["ping", "-n", "1", "-w", "1500", host]
        if is_windows
        else ["ping", "-c", "1", "-W", "2", host]
    )

    try:
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=2.5,
        )
        if proc.returncode != 0:
            return None, "Ping timed out or target unreachable"

        output = proc.stdout
        # Windows pattern: time=14ms or time<1ms
        # Linux pattern: time=14.2 ms
        match = re.search(r"time[=<]([0-9.]+)\s*ms", output, re.IGNORECASE)
        if match:
            return round(float(match.group(1)), 2), None

        return None, "Unable to parse ping response time"
    except subprocess.TimeoutExpired:
        return None, "Ping probe timed out"
    except Exception as exc:
        return None, str(exc)


def measure_network_latency() -> Tuple[Optional[float], str, str]:
    """
    Attempts ICMP ping first; if restricted/fails, falls back to HTTP probe.
    Returns: (latency_ms, method_used, status)
    """
    # Try ICMP Ping
    icmp_latency, icmp_err = probe_icmp_ping()
    if icmp_latency is not None:
        return icmp_latency, "icmp_ping", "connected"

    # If ICMP fails (common on college firewalls), fallback to HTTP probe
    http_latency, http_err = probe_http_latency()
    if http_latency is not None:
        return http_latency, "http_probe (icmp restricted)", "connected"

    # Both probes failed -> connection degraded or offline
    return None, "unreachable", "disconnected"
