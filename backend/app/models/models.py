"""
SQLAlchemy ORM models for Financial Analyzer database.

This module defines all database models (tables) used in the application:
- Company: Stores information about analyzed companies
- FinancialData: Stores financial metrics (annual and quarterly) for companies
- IndicatorDefinition: Defines financial indicators (formulas and metadata)
- IndicatorGroup: Groups indicators for batch selection and calculation
"""

from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database import Base


class Company(Base):
    """
    Company model - represents a company to be analyzed.

    Attributes:
        id: Unique identifier (primary key)
        name: Full company name (unique)
        ticker: Stock ticker symbol (unique)
        market: Stock market (default: "GPW" for Polish market)
        description: Optional company description
        financials: Relationship to FinancialData records
    """

    __tablename__ = "companies"

    # Unikalne ID spółki w bazie
    id = Column(Integer, primary_key=True, index=True)

    # Nazwa spółki - unikalna i indeksowana dla szybkiego wyszukiwania
    name = Column(String, unique=True, index=True)

    # Ticker giełdowy - unikalne oznaczenie na giełdzie
    ticker = Column(String, unique=True, index=True)

    # Rynek giełdowy (domyślnie GPW - Giełda Papierów Wartościowych)
    market = Column(String, default="GPW")

    # Opcjonalny opis spółki
    description = Column(Text, nullable=True)

    # Relacja one-to-many z FinancialData (jedna spółka → wiele danych finansowych)
    financials = relationship("FinancialData", back_populates="company")


class FinancialData(Base):
    """
    FinancialData model - stores financial metrics for companies.

    Supports both annual data (quarter=NULL) and quarterly data (quarter=1,2,3,4).

    Attributes:
        id: Unique identifier
        company_id: Foreign key to Company
        year: Year of the financial data
        quarter: Quarter (1-4) for quarterly data, NULL for annual data
        variable_name: Name of the financial variable (e.g., "REVENUE", "NET_INCOME")
        value: Numerical value of the financial metric
        company: Relationship back to Company
    """

    __tablename__ = "financial_data"

    # Unikalne ID rekordu w bazie
    id = Column(Integer, primary_key=True, index=True)

    # Klucz obcy do spółki - każdy rekord należy do konkretnej spółki
    company_id = Column(Integer, ForeignKey("companies.id"))

    # Rok dla którego są dane (np. 2023, 2024)
    year = Column(Integer)

    # Kwartał (1-4) dla danych kwartalnych, NULL dla danych rocznych
    quarter = Column(Integer, nullable=True)

    # Nazwa zmiennej finansowej (np. "REVENUE", "COST_OF_GOODS_SOLD", "NET_INCOME")
    variable_name = Column(String)

    # Wartość liczbowa zmiennej finansowej
    value = Column(Float)

    # Relacja many-to-one z Company (wiele danych finansowych → jedna spółka)
    company = relationship("Company", back_populates="financials")


class IndicatorDefinition(Base):
    """
    IndicatorDefinition model - stores financial indicator definitions.

    Indicators are calculated formulas based on financial variables.
    Supports:
    - Basic indicators: direct calculations from variables
    - Aggregate indicators: calculated from other indicators across years

    Attributes:
        id: Unique identifier
        name: Internal name (unique), used in formulas
        display_name: User-friendly display name
        formula: Python expression for calculation (uses variables/indicators)
        description: Explanation of what the indicator measures
        category: Category for grouping (e.g., "Profitability", "Liquidity")
        is_percentage: Whether result should be displayed as percentage
        agg_type: For aggregate indicators ("sum", "avg", "max", etc.)
        agg_years: Number of years to aggregate over
        base_indicator_id: For aggregate indicators, ID of base indicator being aggregated
    """

    __tablename__ = "indicator_definitions"

    # Unikalne ID wskaźnika w bazie
    id = Column(Integer, primary_key=True, index=True)

    # Wewnętrzna nazwa wskaźnika - unikalna, używana w formułach
    name = Column(String, unique=True, index=True)

    # Nazwa wyświetlana użytkownikowi (np. "Return on Assets")
    display_name = Column(String)

    # Formuła do obliczenia wskaźnika (np. "NET_INCOME / TOTAL_ASSETS")
    formula = Column(Text)

    # Opis wskaźnika - co mierzy i jak interpretować wyniki
    description = Column(Text, nullable=True)

    # Kategoria wskaźnika (np. "Rentowność", "Płynność", "Sprawność")
    category = Column(String, nullable=True)

    # Czy wynik należy wyświetlać jako procent (1=tak, 0=nie)
    is_percentage = Column(Integer, default=1)

    # Typ agregacji dla wskaźników agregujących (np. "suma", "średnia", "max")
    agg_type = Column(String, nullable=True)

    # Liczba lat do agregacji (np. 3 dla średniej z 3 lat)
    agg_years = Column(Integer, nullable=True)

    # Dla wskaźników agregujących: ID wskaźnika bazowego
    base_indicator_id = Column(
        Integer, ForeignKey("indicator_definitions.id"), nullable=True
    )


class IndicatorGroup(Base):
    """
    IndicatorGroup model - groups indicators for batch selection and calculation.

    Allows users to create custom groups of indicators that can be selected
    and calculated together, improving workflow efficiency.

    Attributes:
        id: Unique identifier
        name: Group name (unique)
        description: Optional description of the group's purpose
        indicator_ids: JSON list of indicator IDs in this group
    """

    __tablename__ = "indicator_groups"

    # Unikalne ID grupy wskaźników w bazie
    id = Column(Integer, primary_key=True, index=True)

    # Nazwa grupy - unikalna, wyświetlana użytkownikowi
    name = Column(String, unique=True, index=True)

    # Opcjonalny opis grupy (np. "Wskaźniki oceny rentowności")
    description = Column(Text, nullable=True)

    # JSON lista ID wskaźników należących do tej grupy
    # Przykład: [1, 5, 8, 12]
    indicator_ids = Column(JSON, default=list)
