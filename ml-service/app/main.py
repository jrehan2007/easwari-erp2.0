"""
Easwari ERP scoring service.

Stateless by design: it holds no database connection and stores nothing.
Java owns the data and posts features; this service returns scores. That
boundary is what lets it scale independently once the project is funded.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .assistant import answer
from .models import (ChatRequest, ChatResponse, ReadinessResponse,
                     RecommendationResponse, RiskResponse, StudentFeatures)
from .readiness import score_readiness
from .recommender import recommend
from .scoring import score_risk

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("easwari-ml")

app = FastAPI(
    title="Easwari ERP Scoring Service",
    description="Academic risk, placement readiness, learning recommendations and the assistant.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "UP", "service": "easwari-scoring", "version": "1.0.0"}


@app.post("/risk-score", response_model=RiskResponse)
def risk(features: StudentFeatures):
    """Weighted, explainable risk score. Returns contributing factors, not just a number."""
    return score_risk(features)


@app.post("/placement-readiness", response_model=ReadinessResponse)
def readiness(features: StudentFeatures):
    """Six-dimension readiness computed from marks, attendance and recorded skill scores."""
    return score_readiness(features)


@app.post("/recommendations", response_model=RecommendationResponse)
def recommendations(features: StudentFeatures):
    """Ordered learning path. Every item states why it was recommended."""
    return recommend(features)


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    """Assistant grounded in the student's own record — it computes, it doesn't invent."""
    return answer(req.role, req.message, req.context)
