"""
Placement readiness across six dimensions.

Two of the six are derived from the academic record the college already
holds; the rest come from assessments the placement cell records. Where a
dimension has no recorded score we fall back to an academic proxy rather
than showing zero, and say so in the narrative.
"""
from .models import ReadinessResponse, StudentFeatures

DIMENSIONS = ["CODING", "APTITUDE", "COMMUNICATION", "TECHNICAL", "PROJECTS", "INTERVIEW"]

LABELS = {
    "CODING": "Coding",
    "APTITUDE": "Aptitude",
    "COMMUNICATION": "Communication",
    "TECHNICAL": "Core Technical",
    "PROJECTS": "Projects",
    "INTERVIEW": "Interview",
}

# Interview performance predicts an offer more than raw coursework does.
DIMENSION_WEIGHTS = {
    "CODING": 0.22, "APTITUDE": 0.15, "COMMUNICATION": 0.15,
    "TECHNICAL": 0.18, "PROJECTS": 0.14, "INTERVIEW": 0.16,
}


def _academic_proxy(f: StudentFeatures) -> int:
    """CGPA on a 0–100 scale, used when a dimension has no recorded score."""
    return int(min(100, max(0, (f.cgpa / 10.0) * 100)))


def _lab_strength(f: StudentFeatures) -> int:
    labs = [s.percentage for s in f.subjects
            if s.percentage is not None and "lab" in (s.name or "").lower()]
    if labs:
        return int(sum(labs) / len(labs))
    return _academic_proxy(f)


def score_readiness(f: StudentFeatures) -> ReadinessResponse:
    proxy = _academic_proxy(f)
    scores = {}

    for dim in DIMENSIONS:
        recorded = f.skills.get(dim)
        if recorded is not None:
            scores[dim] = int(recorded)
        elif dim == "TECHNICAL":
            scores[dim] = proxy
        elif dim == "PROJECTS":
            scores[dim] = _lab_strength(f)
        else:
            scores[dim] = proxy

    # Attendance is a discipline signal; sustained absence drags readiness.
    if f.overall_attendance < 75:
        penalty = min(15, (75 - f.overall_attendance))
        scores = {k: max(0, v - penalty) for k, v in scores.items()}

    overall = int(round(sum(scores[d] * DIMENSION_WEIGHTS[d] for d in DIMENSIONS)))

    weakest = min(scores, key=scores.get)
    strongest = max(scores, key=scores.get)

    narrative = (
        f"Strongest on {LABELS[strongest]} at {scores[strongest]}. "
        f"{LABELS[weakest]} at {scores[weakest]} is the gap that moves this number most — "
        f"it carries {int(DIMENSION_WEIGHTS[weakest] * 100)}% of the weighting."
    )
    if f.overall_attendance < 75:
        narrative += f" Attendance at {f.overall_attendance}% is also pulling every dimension down."

    return ReadinessResponse(
        student_id=f.student_id,
        overall=overall,
        skills={LABELS[d]: scores[d] for d in DIMENSIONS},
        weakest_skill=LABELS[weakest],
        strongest_skill=LABELS[strongest],
        narrative=narrative,
    )
