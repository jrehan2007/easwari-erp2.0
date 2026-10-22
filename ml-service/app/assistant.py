"""
Grounded assistant.

Answers are computed from the student's own record rather than generated,
so the assistant cannot invent a percentage. Intent is matched on keywords;
every reply is assembled from real figures. If nothing matches, it says so
instead of guessing.
"""
from typing import Dict, List, Optional, Tuple

from .models import ChatResponse, StudentFeatures
from .readiness import score_readiness
from .recommender import recommend
from .scoring import score_risk

INTENTS: List[Tuple[str, List[str]]] = [
    ("attendance", ["attendance", "absent", "present", "75", "eligib", "shortage", "detain"]),
    ("marks", ["marks", "mark", "score", "ia1", "ia2", "grade", "cgpa", "gpa", "result"]),
    ("study", ["study", "learn", "revise", "prepare", "what should i", "focus", "improve"]),
    ("placement", ["placement", "ready", "company", "companies", "job", "offer", "drive", "eligible"]),
    ("risk", ["risk", "danger", "trouble", "flag", "worry", "behind"]),
    ("credits", ["credit", "graduate", "remaining", "roadmap", "year"]),
    ("greeting", ["hello", "hi ", "hey", "good morning", "good evening"]),
]

SUGGESTIONS = {
    "STUDENT": ["What should I study today?", "Am I placement ready?",
                "How is my attendance?", "Which subjects am I weakest in?"],
    "FACULTY": ["Which students need attention?", "Show low attendance in my classes",
                "What is pending today?"],
    "ADMIN": ["Which department has the highest risk?", "Show institution attendance",
              "How many open service requests?"],
}


def detect_intent(message: str) -> str:
    lowered = message.lower()
    for intent, keywords in INTENTS:
        if any(k in lowered for k in keywords):
            return intent
    return "unknown"


def answer(role: str, message: str, context: Optional[Dict]) -> ChatResponse:
    intent = detect_intent(message)
    suggestions = SUGGESTIONS.get(role.upper(), SUGGESTIONS["STUDENT"])

    if context is None:
        return ChatResponse(
            reply=("I can answer questions about attendance, marks, placement readiness "
                   "and what to study next once I have a student record open."),
            suggestions=suggestions, intent=intent,
        )

    f = StudentFeatures(**context)

    if intent == "greeting":
        return ChatResponse(
            reply=f"Hello {f.name.split()[0] if f.name else 'there'}. "
                  f"You're at {f.overall_attendance}% attendance and {f.cgpa:.2f} CGPA. "
                  f"Ask me what to focus on today.",
            suggestions=suggestions, intent=intent)

    if intent == "attendance":
        blocked = [s for s in f.subjects if s.attendance is not None and s.attendance < 75]
        if blocked:
            worst = min(blocked, key=lambda s: s.attendance)
            reply = (f"Overall you're at {f.overall_attendance}%. "
                     f"{worst.code} is the problem at {worst.attendance}% — below the 75% needed to sit that paper. "
                     f"{len(blocked)} subject(s) are currently short.")
        else:
            reply = (f"You're at {f.overall_attendance}% overall and above 75% in every subject, "
                     f"so you're eligible across the board.")
        return ChatResponse(reply=reply, suggestions=suggestions, intent=intent)

    if intent == "marks":
        scored = [s for s in f.subjects if s.percentage is not None]
        if not scored:
            reply = "No marks have been published for you yet."
        else:
            best = max(scored, key=lambda s: s.percentage)
            worst = min(scored, key=lambda s: s.percentage)
            reply = (f"Your CGPA is {f.cgpa:.2f} across {f.credits_earned} credits. "
                     f"Strongest is {best.code} at {best.percentage}%, weakest is {worst.code} at {worst.percentage}%.")
        return ChatResponse(reply=reply, suggestions=suggestions, intent=intent)

    if intent == "study":
        recs = recommend(f).recommendations
        if not recs:
            reply = "Nothing urgent. Keep your current pace."
        else:
            top = recs[0]
            reply = f"Start with {top.topic}. {top.reason}"
            if len(recs) > 1:
                reply += f" After that, {recs[1].topic.lower()}."
        return ChatResponse(reply=reply, suggestions=suggestions, intent=intent)

    if intent == "placement":
        r = score_readiness(f)
        reply = f"Placement readiness is {r.overall}%. {r.narrative}"
        return ChatResponse(reply=reply, suggestions=suggestions, intent=intent)

    if intent == "risk":
        risk = score_risk(f)
        reply = (f"Your risk band is {risk.band} at {risk.risk_score}/100. "
                 f"The largest driver: {risk.factors[0].detail}.")
        return ChatResponse(reply=reply, suggestions=suggestions, intent=intent)

    if intent == "credits":
        remaining = max(0, f.credits_required - f.credits_earned)
        reply = (f"You've earned {f.credits_earned} of {f.credits_required} credits, "
                 f"so {remaining} remain. You're in year {f.current_year}, semester {f.current_semester}.")
        return ChatResponse(reply=reply, suggestions=suggestions, intent=intent)

    return ChatResponse(
        reply=("I didn't follow that. I can help with attendance, marks and CGPA, "
               "placement readiness, or what to study next."),
        suggestions=suggestions, intent="unknown")
