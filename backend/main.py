from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import companies, financials, indicators

Base.metadata.create_all(bind=engine)

print("🔄 Uruchamianie seed...")
from seed import seed

seed()
print("✅ Seed zakończony!")

app = FastAPI(title="Financial Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://financial-analyzer-eight.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(companies.router, prefix="/api/companies", tags=["companies"])
app.include_router(financials.router, prefix="/api/financials", tags=["financials"])
app.include_router(indicators.router, prefix="/api/indicators", tags=["indicators"])


@app.get("/")
def root():
    return {"message": "Financial Analyzer API is running"}
