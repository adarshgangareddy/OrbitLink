import pytest
from app.services.assistant_rag import (
    answer_assistant_query,
    retrieve_relevant_documents,
)
from app.services.ml_forecasting import (
    evaluate_forecast_baseline,
    generate_usage_forecast,
)


def test_rag_document_retrieval():
    docs = retrieve_relevant_documents("Why is my latency high?")
    assert len(docs) >= 1
    assert "Latency" in docs[0]["title"] or "Bufferbloat" in docs[0]["title"]

    cost_docs = retrieve_relevant_documents("Can I switch to a cheaper plan?")
    assert len(cost_docs) >= 1
    assert "Cost" in cost_docs[0]["title"] or "Plan" in cost_docs[0]["title"]


def test_assistant_api_queries(client):
    # Query 1: Latency & instability
    r1 = client.post("/api/v1/assistant/query", json={"question": "Why was my latency high?"})
    assert r1.status_code == 200
    d1 = r1.json()
    assert "answer" in d1
    assert len(d1["citations"]) >= 1
    assert "get_recent_measurements" in d1["tools_executed"]

    # Query 2: Cheaper plan
    r2 = client.post("/api/v1/assistant/query", json={"question": "Could my household use a cheaper plan?"})
    assert r2.status_code == 200
    d2 = r2.json()
    assert "plan" in d2["answer"].lower() or "cost" in d2["answer"].lower()
    assert "calculate_monthly_usage" in d2["tools_executed"]

    # Query 3: Scheduling large download
    r3 = client.post("/api/v1/assistant/query", json={"question": "When is the best time to schedule a large download?"})
    assert r3.status_code == 200
    d3 = r3.json()
    assert "schedule" in d3["answer"].lower() or "window" in d3["answer"].lower()
    assert "get_scheduling_recommendation" in d3["tools_executed"]

    # Query 4: Environmental formula
    r4 = client.post("/api/v1/assistant/query", json={"question": "How is environmental energy calculated?"})
    assert r4.status_code == 200
    d4 = r4.json()
    assert "0.015" in d4["answer"]
    assert "get_environmental_assumptions" in d4["tools_executed"]


def test_ml_forecasting_endpoint(client):
    resp = client.get("/api/v1/ml/forecast?horizon_days=7")
    assert resp.status_code == 200
    data = resp.json()
    assert data["horizon_days"] == 7
    assert len(data["projected_daily_gb"]) == 7
    assert "historical_mae_gb" in data
    assert "historical_rmse_gb" in data
    assert "confidence_interval_95_pct" in data
    assert "disclaimer" in data
