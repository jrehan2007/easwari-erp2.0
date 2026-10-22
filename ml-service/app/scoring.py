"""
Academic risk model.

Deliberately transparent rather than a black box: a weighted linear model
whose contributing factors are returned alongside the score. A faculty
member seeing a flagged student can see exactly why, which matters more
in an academic setting than a marginally better AUC.

Weights are held in one place so the college can tune them without a
code change once real outcome data exists to calibrate against.
"""
from typing import List

from .models import RiskFactor, RiskResponse, StudentFeatures

WEIGHTS = {
    "attendance": 0.35,
    "academic": 0.30,
    "trajectory": 0.20,
    "eligibility": 0.15,
}

ELIGIBILITY_THRESHOLD = 75


def _attendance_risk(f: StudentFeatures) -> tuple[float, str]:
    """Risk climbs steeply below the 75% exam-eligibility line."""
    a = f.overall_attendance
    if a >= 85:
        return 0.0, f"Attendance {a}% is comfortable"
    if a >= ELIGIBILITY_THRESHOLD:
        # Linear ramp across the 75–85 band.
        return (85 - a) / 10 * 0.4, f"Attendance {a}% has little margin above the 75% requirement"
    if a >= 65:
        return 0.4 + (ELIGIBILITY_THRESHOLD - a) / 10 * 0.4, f"Attendance {a}% is below the 75% requirement"
    return 1.0, f"Attendance {a}% is critically short of the requirement"


def _academic_risk(f: StudentFeatures) -> tuple[float, str]:
    if f.cgpa <= 0:
        return 0.3, "No published results yet"
    if f.cgpa >= 8.5:
        return 0.0, f"CGPA {f.cgpa:.2f} is strong"
    if f.cgpa >= 7.0:
        return (8.5 - f.cgpa) / 1.5 * 0.5, f"CGPA {f.cgpa:.2f} is steady"
    if f.cgpa >= 6.0:
        return 0.5 + (7.0 - f.cgpa) * 0.3, f"CGPA {f.cgpa:.2f} limits placement eligibility"
    return 1.0, f"CGPA {f.cgpa:.2f} is below most company thresholds"


def _trajectory_risk(f: StudentFeatures) -> tuple[float, str]:
    """IA1 to IA2 movement, averaged across subjects with both recorded."""
    deltas = [s.ia2 - s.ia1 for s in f.subjects if s.ia1 is not None and s.ia2 is not None]
    if not deltas:
        return 0.2, "Not enough assessments to read a trend"
    avg = sum(deltas) / len(deltas)
    if avg >= 2:
        return 0.0, f"Scores improving by {avg:.1f} marks between assessments"
    if avg >= 0:
        return 0.3, "Scores holding flat between assessments"
    if avg >= -3:
        return 0.65, f"Scores slipping by {abs(avg):.1f} marks between assessments"
    return 1.0, f"Sharp decline of {abs(avg):.1f} marks between assessments"


def _eligibility_risk(f: StudentFeatures) -> tuple[float, str]:
    """Any single subject below 75% blocks that paper's examination."""
    blocked = [s for s in f.subjects if s.attendance is not None and s.attendance < ELIGIBILITY_THRESHOLD]
    if not blocked:
        return 0.0, "Eligible to sit every paper"
    ratio = len(blocked) / max(1, len(f.subjects))
    codes = ", ".join(s.code for s in blocked[:3])
    return min(1.0, 0.5 + ratio), f"{len(blocked)} subject(s) below 75%: {codes}"


def score_risk(f: StudentFeatures) -> RiskResponse:
    parts = {
        "attendance": _attendance_risk(f),
        "academic": _academic_risk(f),
        "trajectory": _trajectory_risk(f),
        "eligibility": _eligibility_risk(f),
    }

    factors: List[RiskFactor] = []
    total = 0.0
    for key, (raw, detail) in parts.items():
        weight = WEIGHTS[key]
        contribution = raw * weight
        total += contribution
        factors.append(RiskFactor(
            label=key.replace("_", " ").title(),
            weight=weight,
            contribution=round(contribution * 100, 1),
            detail=detail,
        ))

    score = int(round(total * 100))
    band = "HIGH" if score >= 60 else "MEDIUM" if score >= 35 else "LOW"

    # Headline names the single largest driver rather than the aggregate.
    driver = max(factors, key=lambda x: x.contribution)
    headline = (
        f"{f.name or f.roll_no} is low risk" if band == "LOW"
        else f"{driver.detail}"
    )

    factors.sort(key=lambda x: x.contribution, reverse=True)
    return RiskResponse(
        student_id=f.student_id, risk_score=score, band=band,
        factors=factors, headline=headline,
    )
