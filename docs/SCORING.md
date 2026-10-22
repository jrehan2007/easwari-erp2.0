# Scoring models

Everything in this document lives in `ml-service/app/`. All of it is
deliberately transparent — the college is making decisions about students, and a
number nobody can interrogate is a number nobody should act on.

## Academic risk — `scoring.py`

A weighted linear model over four factors. Every response carries the factors
and their contributions, not just the total.

| Factor | Weight | What it reads |
|---|---|---|
| Attendance | 0.35 | Overall percentage against the 75% eligibility line |
| Academic | 0.30 | CGPA against placement thresholds |
| Trajectory | 0.20 | IA1 → IA2 movement, averaged across papers |
| Eligibility | 0.15 | How many individual papers sit below 75% |

Attendance carries the most weight because it is the only factor that can bar a
student from the examination hall regardless of how well they know the material.
The risk curve is deliberately steep just below 75% and flat above 85%.

Bands: **LOW** under 35, **MEDIUM** 35–59, **HIGH** 60 and above.

The headline names the single largest driver rather than restating the total —
"Attendance 68% is below the 75% requirement" is actionable; "risk score 66" is
not.

Weights sit in one dictionary at the top of the file so the college can tune
them once real outcome data exists to calibrate against. This is not a trained
model and does not pretend to be. It is a transparent heuristic that encodes what
the academic staff already know, and it is honest about that.

**Verified behaviour** across three profiles:

| Profile | Attendance | CGPA | Score | Band |
|---|---|---|---|---|
| Healthy | 93% | 8.90 | 0 | LOW |
| Borderline | 78% | 7.20 | 36 | MEDIUM |
| Struggling | 71% | 6.40 | 66 | HIGH |

## Placement readiness — `readiness.py`

Six dimensions, weighted:

| Dimension | Weight |
|---|---|
| Coding | 0.22 |
| Core technical | 0.18 |
| Interview | 0.16 |
| Aptitude | 0.15 |
| Communication | 0.15 |
| Projects | 0.14 |

Coding and interview performance carry more than raw coursework because they are
what actually decides an offer.

Where the placement cell has recorded a score, it is used. Where it hasn't, an
academic proxy fills in (CGPA scaled to 100, or laboratory marks for the projects
dimension) rather than showing a zero that would misrepresent the student. The
narrative says which gap matters most and why.

Attendance below 75% applies a penalty across every dimension, capped at 15
points. Sustained absence is a signal about work habits, not only about hours in
a room.

## Recommendations — `recommender.py`

Ordered, and every item carries its reason. A recommendation a student cannot
interrogate is a recommendation they will ignore.

Priority order:

1. **Attendance recovery**, for any paper below 75%. This outranks everything —
   it gates the examination itself, so no amount of revision compensates.
2. **The weakest readiness dimension**, because it moves the overall number most.
3. **The weakest scored subject**, weighted by its credits.
4. **Building on a strength**, where a paper is at 85% or above. Momentum matters
   as much as remediation, and depth is what interview panels probe.
5. **A certification**, for students already above 7.0 CGPA, to widen the set of
   companies they qualify for.

## Assistant — `assistant.py`

Intent-matched on keywords, then **computed from the student's own record**.

The assistant cannot invent a percentage, because it does not generate numbers —
it reads them from the payload and assembles a sentence. Ask about attendance and
it names the specific paper that is short. Ask what to study and it returns the
top recommendation with its reason.

When nothing matches, it says so and lists what it can help with. Given how
readily a generative model would produce a confident wrong figure about a
student's own academic standing, that constraint is the feature.

## Endpoints

| Method | Path | Returns |
|---|---|---|
| GET | `/health` | Service status |
| POST | `/risk-score` | Score, band, contributing factors, headline |
| POST | `/placement-readiness` | Overall, six dimensions, narrative |
| POST | `/recommendations` | Ordered list, each with its reason |
| POST | `/chat` | Reply, suggestions, detected intent |

Interactive documentation is generated at **http://localhost:8000/docs**.
