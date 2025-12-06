from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ORICALO AI Backend", version="0.1.0")

# CORS Configuration
origins = [
    "http://localhost:3000",  # Next.js Frontend
    "http://127.0.0.1:3000",
    "http://localhost:8000",  # FastAPI Backend
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.endpoints import stt, dialogue, valuation

app.include_router(stt.router)
app.include_router(dialogue.router)
app.include_router(valuation.router)

@app.get("/")
async def root():
    return {"message": "ORICALO AI Backend is running", "status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
