"""
Learning path recommendations.

Every suggestion carries the reason it was made. A recommendation a student
cannot interrogate is a recommendation they will ignore, so the reason is
part of the contract rather than a nicety.
"""
from typing import List

from .models import Recommendation, RecommendationResponse, StudentFeatures
from .readiness import score_readiness

CATALOGUE = {
    "COMMUNICATION": ("Communication & Interview Skills", 40),
    "INTERVIEW": ("Mock Interview Practice", 25),
    "APTITUDE": ("Quantitative Aptitude & Reasoning", 30),
    "CODING": ("Data Structures & Algorithms", 55),
    "TECHNICAL": ("Core Subject Revision", 45),
    "PROJECTS": ("Portfolio Project Build", 20),
}

LABEL_TO_KEY = {
    "Communication": "COMMUNICATION", "Interview": "INTERVIEW", "Aptitude": "APTITUDE",
    "Coding": "CODING", "Core Technical": "TECHNICAL", "Projects": "PROJECTS",
}


def recommend(f: StudentFeatures) -> RecommendationResponse:
    recs: List[Recommendation] = []
    priority = 1

    # 1. Attendance recovery outranks everything — it gates the exam itself.
    blocked = [s for s in f.subjects if s.attendance is not None and s.attendance < 75]
    for s in sorted(blocked, key=lambda x: x.attendance)[:2]:
        recs.append(Recommendation(
            topic=f"Attendance recovery — {s.code}",
            status="Urgent",
            progress=int(s.attendance),
            reason=(f"At {s.attendance}% you cannot sit the {s.name} examination. "
                    f"This blocks {s.credits} credits regardless of your marks."),
            priority=priority,
        ))
        priority += 1

    # 2. The weakest readiness dimension, because it moves the number most.
    readiness = score_readiness(f)
    weak_key = LABEL_TO_KEY.get(readiness.weakest_skill, "COMMUNICATION")
    topic, progress = CATALOGUE[weak_key]
    recs.append(Recommendation(
        topic=topic,
        status="In Progress" if progress > 0 else "Not Started",
        progress=progress,
        reason=(f"{readiness.weakest_skill} at {readiness.skills[readiness.weakest_skill]} "
                f"is your lowest placement dimension."),
        priority=priority,
    ))
    priority += 1

    # 3. Weakest academic subject with published marks.
    scored = [s for s in f.subjects if s.percentage is not None]
    if scored:
        weakest = min(scored, key=lambda s: s.percentage)
        if weakest.percentage < 75:
            recs.append(Recommendation(
                topic=f"{weakest.name} — targeted revision",
                status="Recommended",
                progress=int(weakest.percentage),
                reason=(f"Internal average {weakest.percentage}% is your lowest, "
                        f"and the paper carries {weakest.credits} credits."),
                priority=priority,
            ))
            priority += 1

    # 4. Build on strength — momentum matters as much as remediation.
    if scored:
        strongest = max(scored, key=lambda s: s.percentage)
        if strongest.percentage >= 85:
            recs.append(Recommendation(
                topic=f"Advanced {strongest.name}",
                status="Recommended",
                progress=10,
                reason=(f"At {strongest.percentage}% this is your strongest paper. "
                        f"Depth here is what interview panels probe."),
                priority=priority,
            ))
            priority += 1

    # 5. Broaden the match list.
    if f.cgpa >= 7.0:
        recs.append(Recommendation(
            topic="Cloud Fundamentals — AWS Practitioner",
            status="Recommended", progress=0,
            reason="A recognised certification widens the set of companies you qualify for.",
            priority=priority,
        ))

    return RecommendationResponse(student_id=f.student_id, recommendations=recs)
