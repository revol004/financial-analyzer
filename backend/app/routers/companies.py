"""
FastAPI router for company management endpoints.

Provides CRUD operations for companies:
- GET /companies/ - List all companies
- POST /companies/ - Create new company
- PUT /companies/{id} - Update company details
- DELETE /companies/{id} - Delete company and its related data
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Company, FinancialData
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class CompanyCreate(BaseModel):
    """
    Request model for creating/updating company.

    Attributes:
        name: Full company name (required)
        ticker: Stock ticker symbol (required)
        market: Stock market code (default: "GPW")
        description: Optional description
    """

    name: str
    ticker: str
    market: str = "GPW"
    description: Optional[str] = None


class CompanyResponse(BaseModel):
    """
    Response model for company data returned from API.

    Uses from_attributes=True for SQLAlchemy ORM compatibility.
    """

    id: int
    name: str
    ticker: str
    market: str
    description: Optional[str]

    class Config:
        from_attributes = True


@router.get("/", response_model=list[CompanyResponse])
def get_companies(db: Session = Depends(get_db)):
    """
    Retrieve all companies from database.

    Returns:
        List of all company records
    """
    return db.query(Company).all()


@router.post("/", response_model=CompanyResponse)
def create_company(company: CompanyCreate, db: Session = Depends(get_db)):
    """
    Create a new company.

    Validates that ticker symbol is unique before creating.

    Args:
        company: CompanyCreate object with company details
        db: Database session (injected)

    Returns:
        Created company with assigned ID

    Raises:
        HTTPException 400: If ticker already exists
    """
    # Sprawdzenie czy ticker już istnieje w bazie
    existing = db.query(Company).filter(Company.ticker == company.ticker).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ticker already exists")

    # Tworzenie nowego rekordu spółki
    db_company = Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


@router.delete("/{company_id}")
def delete_company(company_id: int, db: Session = Depends(get_db)):
    """
    Delete a company and all its related financial data.

    Cascade delete ensures referential integrity - removes all
    financial data records associated with the company.

    Args:
        company_id: ID of company to delete
        db: Database session (injected)

    Returns:
        Success message

    Raises:
        HTTPException 404: If company not found
    """
    # Szukanie spółki w bazie
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Kasowanie wszystkich danych finansowych związanych ze spółką
    db.query(FinancialData).filter(FinancialData.company_id == company_id).delete()

    # Kasowanie spółki
    db.delete(company)
    db.commit()
    return {"message": "Company deleted"}


@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int, company: CompanyCreate, db: Session = Depends(get_db)
):
    """
    Update company details.

    Args:
        company_id: ID of company to update
        company: CompanyCreate object with updated details
        db: Database session (injected)

    Returns:
        Updated company record

    Raises:
        HTTPException 404: If company not found
    """
    # Znalezienie spółki do aktualizacji
    db_company = db.query(Company).filter(Company.id == company_id).first()
    if not db_company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Aktualizacja pól spółki
    for key, value in company.model_dump().items():
        setattr(db_company, key, value)

    # Zapis zmian
    db.commit()
    db.refresh(db_company)
    return db_company
