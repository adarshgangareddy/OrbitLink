"""
OrbitLink Grounded AI Assistant API Routes
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.optimization import AssistantQueryRequest, AssistantQueryResponse
from app.services.assistant_rag import answer_assistant_query

router = APIRouter(prefix="/assistant", tags=["Grounded AI Assistant"])


@router.post("/query", response_model=AssistantQueryResponse)
def ask_assistant(request: AssistantQueryRequest, db: Session = Depends(get_db)):
    """
    Answers user networking, cost, bandwidth scheduling, and environmental queries
    grounded in real application data, deterministic backend tools, and verified citations.
    """
    return answer_assistant_query(db, question=request.question)
