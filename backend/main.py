from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import companies, financials, indicators
import sys
import traceback

# Tworzy wszystkie tabele w bazie
Base.metadata.create_all(bind=engine)

# Seed danych - z obsługą błędów
print("🔄 Uruchamianie seed...")
try:
    from seed import seed

    seed()
    print("✅ Seed zakończony!")
except Exception as e:
    print(f"⚠️ Błąd podczas seed: {e}")
    traceback.print_exc()
    print("⚠️ Aplikacja będzie działać bez seedu")

# Tworzy aplikację FastAPI
app = FastAPI(title="Financial Analyzer API")

# CORS middleware - zezwala na requesty z frontend'u
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
