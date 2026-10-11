def test_ingest_and_retrieve_latest(client):
    payload = {
        "device_id": "test-laptop-1",
        "interface_name": "wlan0",
        "bytes_sent": 5000000,
        "bytes_recv": 12000000,
        "bytes_sent_delta": 50000,
        "bytes_recv_delta": 120000,
        "latency_ms": 24.5,
        "packet_loss_pct": 0.0,
        "download_speed_mbps": None,
        "upload_speed_mbps": None,
        "wifi_ssid": "Test-Campus-Wifi",
        "wifi_signal_pct": 82.0,
        "measurement_method": "psutil_counters + icmp_ping",
        "status": "connected",
        "is_simulated": False,
        "notes": "Automated test ingestion",
    }

    create_resp = client.post("/api/v1/measurements/ingest", json=payload)
    assert create_resp.status_code == 201
    created_data = create_resp.json()
    assert created_data["id"] is not None
    assert created_data["device_id"] == "test-laptop-1"
    assert created_data["interface_name"] == "wlan0"
    assert created_data["bytes_sent_human"] is not None

    # Retrieve latest
    latest_resp = client.get("/api/v1/measurements/latest?device_id=test-laptop-1")
    assert latest_resp.status_code == 200
    latest_data = latest_resp.json()
    assert latest_data["id"] == created_data["id"]
    assert latest_data["bytes_sent"] == 5000000


def test_measurement_history_pagination(client):
    for i in range(5):
        payload = {
            "device_id": f"device-{i}",
            "interface_name": "eth0",
            "bytes_sent": 1000 * (i + 1),
            "bytes_recv": 2000 * (i + 1),
            "measurement_method": "psutil_counters",
            "status": "connected",
            "is_simulated": False,
        }
        client.post("/api/v1/measurements/ingest", json=payload)

    history_resp = client.get("/api/v1/measurements/history?limit=3&offset=0")
    assert history_resp.status_code == 200
    history_data = history_resp.json()
    assert history_data["total_count"] >= 5
    assert len(history_data["measurements"]) == 3
    assert history_data["limit"] == 3
    assert history_data["offset"] == 0


def test_collect_live_measurement_endpoint(client):
    # Tests the live collection vertical slice endpoint
    resp = client.post("/api/v1/measurements/collect")
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert "device_id" in data
    assert "interface_name" in data
    assert data["bytes_sent"] >= 0
    assert data["bytes_recv"] >= 0
    assert data["is_simulated"] is False
