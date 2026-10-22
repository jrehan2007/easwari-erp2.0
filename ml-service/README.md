# Scoring service

Stateless FastAPI service. No database connection, no storage, no session — it
receives features and returns scores.

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Interactive docs at http://localhost:8000/docs

| File | Holds |
|---|---|
| `models.py` | Pydantic request and response shapes |
| `scoring.py` | Academic risk — weighted, and returns its factors |
| `readiness.py` | Placement readiness across six dimensions |
| `recommender.py` | Ordered learning path, each item with its reason |
| `assistant.py` | Grounded assistant — computes, does not generate |
| `main.py` | Endpoints |

See `../docs/SCORING.md` for how the models work and why.
