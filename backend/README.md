# EduPath Student Profile API

FastAPI + SQLAlchemy starter for the EduPath Class 10 student profile schema.

## Run locally

```bash
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
# Optional: copy .env.example to .env and configure DATABASE_URL
uvicorn main:app --reload
```

Open http://127.0.0.1:8000/docs.

By default, local development uses SQLite and creates `edupath.db`. Set `DATABASE_URL` in the environment to use PostgreSQL, for example:

`postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE`

## Routes

- `POST /api/profiles` — create
- `GET /api/profiles` — list
- `GET /api/profiles/{id}` — retrieve
- `PUT /api/profiles/{id}` — replace/update
- `DELETE /api/profiles/{id}` — delete
- `GET /health` — health check

## Production notes

`Base.metadata.create_all()` is for a starter project; use Alembic migrations for production schema changes. Add authentication and per-user authorization before exposing profile records publicly. Keep database credentials in deployment environment variables. The submitted `interest_description` is stored without AI rewriting.
