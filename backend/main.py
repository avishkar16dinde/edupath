import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from profile_routes import router as profile_router
from graph_routes import router as graph_router

Base.metadata.create_all(bind=engine)  # Use Alembic migrations for production.

app = FastAPI(title="EduPath Student Profile API", version="1.0.0")
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if os.getenv("FRONTEND_ORIGIN"):
    origins.append(os.environ["FRONTEND_ORIGIN"].rstrip("/"))
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(profile_router, prefix="/api")
app.include_router(graph_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "EduPath Student Profile API"}

@app.get("/health")
def health():
    return {"status": "ok"}
