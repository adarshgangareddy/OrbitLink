from app.monitoring.collector import collector_daemon


def test_collector_api_endpoints(client):
    # 1. Get collector status
    status_resp = client.get("/api/v1/collector/status")
    assert status_resp.status_code == 200
    status_data = status_resp.json()
    assert "is_running" in status_data
    assert "interval_seconds" in status_data
    assert "run_count" in status_data

    # 2. Configure collector interval
    config_resp = client.post(
        "/api/v1/collector/config",
        json={"interval_seconds": 25, "include_speed_test": False},
    )
    assert config_resp.status_code == 200
    assert config_resp.json()["interval_seconds"] == 25

    # 3. Trigger manual collection
    collect_resp = client.post("/api/v1/collector/collect-now")
    assert collect_resp.status_code == 200
    after_data = collect_resp.json()
    assert after_data["run_count"] >= 1

    # 4. Stop and Start daemon endpoints
    stop_resp = client.post("/api/v1/collector/stop")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["is_running"] is False

    start_resp = client.post("/api/v1/collector/start", json={"interval_seconds": 20})
    assert start_resp.status_code == 200
    assert start_resp.json()["is_running"] is True
    assert start_resp.json()["interval_seconds"] == 20

    # Clean up stop
    client.post("/api/v1/collector/stop")


def test_collector_daemon_methods(db_session):
    collector_daemon.stop()
    assert collector_daemon.is_running is False

    collector_daemon.set_interval(10)
    assert collector_daemon.interval_seconds == 10

    # Single collection execution
    meas_id = collector_daemon.run_single_collection(db=db_session)
    status = collector_daemon.get_status()
    assert status["run_count"] >= 1
    assert status["last_run"] is not None
