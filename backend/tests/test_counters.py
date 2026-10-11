from app.monitoring.counters import (
    bytes_to_human,
    bytes_to_decimal_gb,
    bytes_to_binary_gib,
    calculate_counter_deltas,
    _previous_counters,
)


def test_unit_conversions():
    # 1 GB decimal = 10^9 bytes
    one_gb_bytes = 1_000_000_000
    assert bytes_to_decimal_gb(one_gb_bytes) == 1.0

    # 1 GiB binary = 2^30 bytes = 1,073,741,824 bytes
    one_gib_bytes = 1024 ** 3
    assert bytes_to_binary_gib(one_gib_bytes) == 1.0

    # bytes_to_human
    assert bytes_to_human(500) == "500 B"
    assert "KB" in bytes_to_human(1500)
    assert "MB" in bytes_to_human(15_000_000)
    assert "GB" in bytes_to_human(2_500_000_000)


def test_counter_delta_and_reset_prevention():
    _previous_counters.clear()
    iface = "test_iface_0"

    # First sample sets the baseline -> deltas are None
    d_sent, d_recv = calculate_counter_deltas(iface, 1000, 2000)
    assert d_sent is None
    assert d_recv is None

    # Normal increase: 500 bytes sent, 1000 bytes recv
    d_sent, d_recv = calculate_counter_deltas(iface, 1500, 3000)
    assert d_sent == 500
    assert d_recv == 1000

    # System reboot / interface reset: counter drops to 200, 400
    # Must NOT return negative delta
    d_sent, d_recv = calculate_counter_deltas(iface, 200, 400)
    assert d_sent >= 0
    assert d_recv >= 0
    assert d_sent == 200
    assert d_recv == 400
