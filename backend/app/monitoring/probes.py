import platform
import re
import subprocess
import time
from typing import Optional, Tuple, Dict, Any
import httpx
from app.core.config import settings
from app.core.logging import logger

SPEED_TEST_URL = "https://speed.cloudflare.com/__down?bytes=2500000"  # 2.5 MB safe sample payload


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
        return http_latency, "http_probe", "connected"

    return None, "unreachable", "disconnected"


def measure_download_speed(timeout_seconds: float = 6.0) -> Tuple[Optional[float], Optional[str]]:
    """
    Performs a controlled, rate-limited download throughput test.
    Downloads a small 2.5MB payload from Cloudflare speed test CDN.
    Calculates throughput in Mbps = (bytes * 8) / (seconds * 1,000,000).
    """
    try:
        start_time = time.perf_counter()
        with httpx.Client(timeout=timeout_seconds, verify=False) as client:
            resp = client.get(SPEED_TEST_URL)
        duration = time.perf_counter() - start_time
        if resp.status_code == 200 and duration > 0:
            bytes_downloaded = len(resp.content)
            mbps = (bytes_downloaded * 8.0) / (duration * 1_000_000.0)
            return round(mbps, 2), None
        return None, f"HTTP status {resp.status_code}"
    except Exception as exc:
        logger.warning(f"Throughput test failed: {exc}")
        return None, str(exc)


def probe_wifi_details() -> Tuple[Optional[str], Optional[float]]:
    """
    Extracts connected Wi-Fi SSID and signal strength percentage.
    Works on Windows (netsh) and Linux (nmcli/iwconfig).
    Returns (ssid, signal_pct).
    """
    system_os = platform.system()

    if system_os == "Windows":
        try:
            proc = subprocess.run(
                ["netsh", "wlan", "show", "interfaces"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=2.0,
            )
            if proc.returncode == 0:
                ssid_match = re.search(r"^\s*SSID\s*:\s*(.+)$", proc.stdout, re.MULTILINE)
                signal_match = re.search(r"^\s*Signal\s*:\s*([0-9]+)%", proc.stdout, re.MULTILINE)

                ssid = ssid_match.group(1).strip() if ssid_match else None
                signal = float(signal_match.group(1)) if signal_match else None
                return ssid, signal
        except Exception as exc:
            logger.debug(f"Failed to read Windows Wi-Fi: {exc}")

    elif system_os == "Linux":
        # Attempt nmcli first
        try:
            proc = subprocess.run(
                ["nmcli", "-t", "-f", "active,ssid,signal", "dev", "wifi"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=2.0,
            )
            if proc.returncode == 0:
                for line in proc.stdout.splitlines():
                    parts = line.strip().split(":")
                    if len(parts) >= 3 and parts[0].lower() in ["yes", "true", "*"]:
                        ssid = parts[1] if parts[1] else None
                        signal = float(parts[2]) if parts[2].isdigit() else None
                        return ssid, signal
        except Exception:
            pass

    return None, None
