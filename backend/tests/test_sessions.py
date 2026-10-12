from app.schemas.measurement import MeasurementCreate
from app.services.measurement_service import record_measurement
from app.services.session_service import (
    start_session,
    stop_session,
    get_active_session,
    update_active_session_with_measurement,
)
from app.models.measurement import NetworkMeasurement


def test_session_lifecycle(client, db_session):
    # 1. Start a session
    resp = client.post("/api/v1/sessions/start", json={"notes": "Integration test session"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["is_active"] is True
    assert data["status"] == "active"
    assert "sess_" in data["session_id"]
    session_id = data["session_id"]

    # 2. Query active session endpoint
    active_resp = client.get("/api/v1/sessions/active")
    assert active_resp.status_code == 200
    active_data = active_resp.json()
    assert active_data is not None
    assert active_data["session_id"] == session_id
    assert active_data["is_active"] is True

    # 3. Simulate measurement under this session
    meas_in = MeasurementCreate(
        session_id=session_id,
        device_id=data["device_id"],
        interface_name=data["interface_name"],
        bytes_sent=data["start_bytes_sent"] + 5000,
        bytes_recv=data["start_bytes_recv"] + 15000,
        bytes_sent_delta=5000,
        bytes_recv_delta=15000,
        latency_ms=18.5,
        packet_loss_pct=0.0,
        measurement_method="psutil + test",
        status="connected",
    )
    saved = record_measurement(db_session, meas_in)
    assert saved.session_id == session_id

    # Update active session with the measurement
    db_meas = db_session.get(NetworkMeasurement, saved.id)
    active_db_obj = get_active_session(db_session, data["device_id"])
    update_active_session_with_measurement(db_session, db_meas, active_db_obj)

    # Verify session metrics updated
    active_resp2 = client.get("/api/v1/sessions/active")
    assert active_resp2.status_code == 200
    updated = active_resp2.json()
    assert updated["sample_count"] == 1
    assert updated["total_bytes_sent"] == 5000
    assert updated["total_bytes_recv"] == 15000
    assert updated["avg_latency_ms"] == 18.5
    assert updated["min_latency_ms"] == 18.5
    assert updated["peak_latency_ms"] == 18.5

    # 4. Stop session
    stop_resp = client.post("/api/v1/sessions/stop", json={"session_id": session_id, "notes": "Finished test"})
    assert stop_resp.status_code == 200
    stopped = stop_resp.json()
    assert stopped["is_active"] is False
    assert stopped["status"] == "completed"
    assert stopped["end_time"] is not None

    # Verify no active session remaining
    active_after = client.get("/api/v1/sessions/active")
    assert active_after.json() is None

    # 5. List historical sessions
    list_resp = client.get("/api/v1/sessions")
    assert list_resp.status_code == 200
    list_data = list_resp.json()
    assert list_data["total_count"] >= 1
    assert any(s["session_id"] == session_id for s in list_data["sessions"])

    # 6. Get session by ID
    get_resp = client.get(f"/api/v1/sessions/{session_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["session_id"] == session_id
