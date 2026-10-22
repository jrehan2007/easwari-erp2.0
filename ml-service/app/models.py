"""Request and response shapes shared across the scoring endpoints."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SubjectFeature(BaseModel):
    code: str
    name: str = ""
    credits: int = 3
    ia1: Optional[float] = None
    ia2: Optional[float] = None
    percentage: Optional[int] = None
    attendance: Optional[int] = None


class StudentFeatures(BaseModel):
    """Everything Java knows about a student, flattened for scoring."""
    student_id: int
    roll_no: str = ""
    name: str = ""
    cgpa: float = 0.0
    credits_earned: int = 0
    credits_required: int = 168
    current_year: int = 1
    current_semester: int = 1
    overall_attendance: int = 0
    subjects: List[SubjectFeature] = Field(default_factory=list)
    skills: Dict[str, int] = Field(default_factory=dict)


class RiskFactor(BaseModel):
    label: str
    weight: float
    contribution: float
    detail: str


class RiskResponse(BaseModel):
    student_id: int
    risk_score: int
    band: str
    factors: List[RiskFactor]
    headline: str


class ReadinessResponse(BaseModel):
    student_id: int
    overall: int
    skills: Dict[str, int]
    weakest_skill: str
    strongest_skill: str
    narrative: str


class Recommendation(BaseModel):
    topic: str
    status: str
    progress: int
    reason: str
    priority: int


class RecommendationResponse(BaseModel):
    student_id: int
    recommendations: List[Recommendation]


class ChatRequest(BaseModel):
    role: str = "STUDENT"
    message: str
    context: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = Field(default_factory=list)
    intent: str = "unknown"
