import pytest
from app.services.quality_diagnostics import (
    compute_interarrival_jitter,
    evaluate_network_quality,
    verify_diagnostic_action,
)


def test_compute_interarrival_jitter():
    # Empty or single sample
    assert compute_interarrival_jitter([]) == 0.0
    assert compute_interarrival_jitter([20.0]) == 0.0

    # Constant latency -> 0 jitter
    assert compute_interarrival_jitter([20.0, 20.0, 20.0]) == 0.0

    # Jitter calculation: |25 - 20| + |22 - 25| = 5 + 3 = 8 / 2 = 4.0
    latencies = [20.0, 25.0, 22.0]
    assert compute_interarrival_jitter(latencies) == 4.0


def test_diagnostics_api_endpoints(client):
    # Test GET diagnostics
    resp = client.get("/api/v1/diagnostics/quality")
    assert resp.status_code == 200
    diagnoses = resp.json()
    assert isinstance(diagnoses, list)
    assert len(diagnoses) >= 1
    d0 = diagnoses[0]
    assert "headline" in d0
    assert "observed_evidence" in d0
    assert "likely_explanation" in d0
    assert "safe_next_action" in d0
    assert "verification_method" in d0

    # Test POST verify action
    verify_resp = client.post(
        "/api/v1/diagnostics/verify",
        json={"action_taken": "Switched to 5 GHz Wi-Fi band"},
    )
    assert verify_resp.status_code == 200
    vdata = verify_resp.json()
    assert vdata["action_taken"] == "Switched to 5 GHz Wi-Fi band"
    assert vdata["outcome"] in ["improved", "unchanged", "degraded", "inconclusive"]
    assert "explanation" in vdata
