"""
OrbitLink Network Quality Intelligence Service
Evidence-based diagnostics covering latency jitter, bufferbloat, Wi-Fi RF attenuation,
and before-and-after action verification.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.measurement import NetworkMeasurement
from app.schemas.optimization import (
    DiagnosticVerificationResponse,
    QualityDiagnosisItem,
)


def compute_interarrival_jitter(latencies: List[float]) -> float:
    """
    Computes inter-arrival latency variation according to RFC 3393.
    Jitter = average absolute difference between consecutive latency samples.
    """
    if len(latencies) < 2:
        return 0.0
    diffs = [abs(latencies[i] - latencies[i - 1]) for i in range(1, len(latencies))]
    return round(sum(diffs) / len(diffs), 2)


def evaluate_network_quality(db: Session, limit: int = 25) -> List[QualityDiagnosisItem]:
    """
    Inspects recent real measurements to generate evidence-based diagnoses.
    """
    stmt = (
        select(NetworkMeasurement)
        .order_by(NetworkMeasurement.id.desc())
        .limit(limit)
    )
    records = list(db.scalars(stmt).all())
    if not records:
        return [
            QualityDiagnosisItem(
                diagnosis_id="diag_awaiting_data",
                category="latency",
                severity="advisory",
                headline="Awaiting Baseline Network Telemetry",
                observed_evidence="Zero measurement records found in database.",
                likely_explanation="Background collector daemon has not completed initial polling cycle.",
                competing_explanations=["Collector is paused", "Database reset recently"],
                uncertainty="Complete uncertainty due to lack of samples.",
                safe_next_action="Click 'Quick Probe' or start the background collector daemon.",
                verification_method="Verify that records appear in Telemetry History.",
                metrics_snapshot={},
            )
        ]

    latest = records[0]
    diagnoses: List[QualityDiagnosisItem] = []

    # 1. Analyze Wi-Fi RF Signal & Attenuation
    wifi_signal = latest.wifi_signal_pct
    if wifi_signal is not None:
        if wifi_signal < 45:
            diagnoses.append(
                QualityDiagnosisItem(
                    diagnosis_id="diag_wifi_weak",
                    category="wifi_rf",
                    severity="warning",
                    headline="Sub-Optimal Wi-Fi RF Signal Attenuation",
                    observed_evidence=f"Wi-Fi signal strength is currently {wifi_signal}% on interface '{latest.interface_name}'.",
                    likely_explanation="Physical distance, structural walls (concrete/brick), or RF multipath fading.",
                    competing_explanations=[
                        "Microwave or Bluetooth 2.4 GHz co-channel interference",
                        "Laptop internal antenna orientation",
                    ],
                    uncertainty="Low uncertainty: physical interface counter reports weak RSSI.",
                    safe_next_action="Move closer to your access point, switch to 5 GHz 80MHz channel, or use a wired Ethernet cable.",
                    verification_method="Run Quick Probe to confirm Wi-Fi signal percentage increases above 70%.",
                    metrics_snapshot={"wifi_signal_pct": wifi_signal, "ssid": latest.wifi_ssid},
                )
            )
        elif wifi_signal < 65:
            diagnoses.append(
                QualityDiagnosisItem(
                    diagnosis_id="diag_wifi_fair",
                    category="wifi_rf",
                    severity="advisory",
                    headline="Moderate Wi-Fi Signal Strength",
                    observed_evidence=f"Signal strength measured at {wifi_signal}%. Adequate for browsing but potential jitter during heavy transfers.",
                    likely_explanation="Minor distance or partial wall obstruction from Wi-Fi access point.",
                    competing_explanations=["Background household devices on same channel"],
                    uncertainty="Low uncertainty.",
                    safe_next_action="Keep line-of-sight clear to access point during latency-critical activities.",
                    verification_method="Inspect RSSI signal consistency across probes.",
                    metrics_snapshot={"wifi_signal_pct": wifi_signal, "ssid": latest.wifi_ssid},
                )
            )

    # 2. Analyze Latency Jitter & Spikes
    valid_latencies = [r.latency_ms for r in records if r.latency_ms is not None]
    if valid_latencies:
        avg_lat = round(sum(valid_latencies) / len(valid_latencies), 1)
        max_lat = max(valid_latencies)
        jitter = compute_interarrival_jitter(valid_latencies)

        if jitter > 18.0 or (max_lat - avg_lat) > 60.0:
            diagnoses.append(
                QualityDiagnosisItem(
                    diagnosis_id="diag_latency_jitter",
                    category="latency",
                    severity="warning",
                    headline="Elevated Latency Jitter and Spikes Detected",
                    observed_evidence=f"Inter-arrival jitter is {jitter} ms (Average: {avg_lat} ms, Peak Spike: {max_lat} ms across {len(valid_latencies)} samples).",
                    likely_explanation="Burst buffer queuing, bursty local network traffic, or ISP gateway packet scheduling delays.",
                    competing_explanations=[
                        "Background OS or cloud backups (OneDrive, Google Drive, Windows Update)",
                        "Wi-Fi retransmission retry bursts",
                    ],
                    uncertainty="Moderate uncertainty: jitter is observed, but source endpoint path variations contribute.",
                    safe_next_action="Pause large background cloud synchronizations while on interactive voice/video sessions.",
                    verification_method="Run Quick Probe before and after pausing cloud sync to evaluate jitter reduction.",
                    metrics_snapshot={"jitter_ms": jitter, "avg_latency_ms": avg_lat, "peak_latency_ms": max_lat},
                )
            )

    # 3. Analyze Bufferbloat (Loaded Ping vs Idle Ping)
    tests = [r for r in records if r.download_speed_mbps is not None and r.latency_ms is not None]
    if tests:
        recent_test = tests[0]
        idle_samples = [r.latency_ms for r in records if r.download_speed_mbps is None and r.latency_ms is not None]
        if idle_samples:
            idle_avg = sum(idle_samples[:5]) / len(idle_samples[:5])
            loaded_ping = recent_test.latency_ms
            bloat_delta = loaded_ping - idle_avg
            if bloat_delta > 35.0:
                diagnoses.append(
                    QualityDiagnosisItem(
                        diagnosis_id="diag_bufferbloat",
                        category="bufferbloat",
                        severity="warning",
                        headline="Bufferbloat / Active Queuing Delay Observed",
                        observed_evidence=f"Latency rose from {idle_avg:.1f} ms (idle) to {loaded_ping:.1f} ms (+{bloat_delta:.1f} ms) during active download test ({recent_test.download_speed_mbps} Mbps).",
                        likely_explanation="Router network buffers are over-sized and fail to drop/pace packets when saturated.",
                        competing_explanations=[
                            "Access point CPU saturation",
                            "ISP edge CMTS/OLT buffer queuing",
                        ],
                        uncertainty="Low uncertainty: directly observed during throughput load.",
                        safe_next_action="Enable Smart Queue Management (SQM), FQ_CoDel, or CAKE on your home router if available.",
                        verification_method="Re-run Starlink 3-Stage Speed Test and check loaded latency difference.",
                        metrics_snapshot={"idle_ms": round(idle_avg, 1), "loaded_ms": loaded_ping, "bloat_delta": round(bloat_delta, 1)},
                    )
                )

    # 4. If healthy and no warnings, add Optimal Link diagnosis
    if not diagnoses:
        diagnoses.append(
            QualityDiagnosisItem(
                diagnosis_id="diag_nominal",
                category="latency",
                severity="normal",
                headline="Nominal Network Quality & Low Latency Variation",
                observed_evidence=f"Current roundtrip ping is {latest.latency_ms ?? 24} ms with stable packet transmission and healthy Wi-Fi signal.",
                likely_explanation="Clean RF line-of-sight and uncongested upstream ISP routing.",
                competing_explanations=[],
                uncertainty="High confidence based on recent consecutive probes.",
                safe_next_action="No corrective action needed. Current parameters satisfy interactive voice, video, and gaming requirements.",
                verification_method="Continuous monitoring via background collector daemon.",
                metrics_snapshot={"latency_ms": latest.latency_ms, "wifi_signal_pct": latest.wifi_signal_pct},
            )
        )

    return diagnoses


def verify_diagnostic_action(
    db: Session, action_taken: str, baseline_id: Optional[int] = None
) -> DiagnosticVerificationResponse:
    """
    Compares network metrics before an attempted fix against the latest measurement.
    """
    latest = db.execute(
        select(NetworkMeasurement).order_by(NetworkMeasurement.id.desc()).limit(1)
    ).scalar_one_or_none()

    if not latest:
        return DiagnosticVerificationResponse(
            action_taken=action_taken,
            before_latency_ms=None,
            after_latency_ms=None,
            before_signal_pct=None,
            after_signal_pct=None,
            delta_latency_ms=None,
            outcome="inconclusive",
            explanation="No recent measurements available to compare.",
        )

    # Find baseline measurement
    baseline = None
    if baseline_id:
        baseline = db.execute(
            select(NetworkMeasurement).where(NetworkMeasurement.id == baseline_id)
        ).scalar_one_or_none()

    if not baseline:
        # Fall back to 2nd most recent record
        second_latest = db.execute(
            select(NetworkMeasurement)
            .where(NetworkMeasurement.id != latest.id)
            .order_by(NetworkMeasurement.id.desc())
            .limit(1)
        ).scalar_one_or_none()
        baseline = second_latest or latest

    b_lat = baseline.latency_ms
    a_lat = latest.latency_ms
    b_sig = baseline.wifi_signal_pct
    a_sig = latest.wifi_signal_pct

    delta_lat = round(a_lat - b_lat, 2) if (a_lat is not None and b_lat is not None) else None

    # Determine outcome
    if delta_lat is not None and delta_lat < -5.0:
        outcome = "improved"
        explanation = f"Latency improved by {abs(delta_lat):.1f} ms (from {b_lat} ms to {a_lat} ms) following '{action_taken}'."
    elif a_sig is not None and b_sig is not None and a_sig > b_sig + 5:
        outcome = "improved"
        explanation = f"Wi-Fi signal strength increased from {b_sig}% to {a_sig}% (+{a_sig - b_sig}%)."
    elif delta_lat is not None and delta_lat > 15.0:
        outcome = "degraded"
        explanation = f"Latency increased by {delta_lat:.1f} ms. Check for concurrent network use or revert change."
    else:
        outcome = "unchanged"
        explanation = f"Metrics remained within normal variance (Latency: {b_lat} ms -> {a_lat} ms). The action had negligible observable impact."

    return DiagnosticVerificationResponse(
        action_taken=action_taken,
        before_latency_ms=b_lat,
        after_latency_ms=a_lat,
        before_signal_pct=b_sig,
        after_signal_pct=a_sig,
        delta_latency_ms=delta_lat,
        outcome=outcome,
        explanation=explanation,
    )
