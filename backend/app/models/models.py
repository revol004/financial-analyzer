from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    ticker = Column(String, unique=True, index=True)
    market = Column(String, default="GPW")
    description = Column(Text, nullable=True)
    financials = relationship("FinancialData", back_populates="company")


class FinancialData(Base):
    __tablename__ = "financial_data"
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    year = Column(Integer)
    quarter = Column(Integer, nullable=True)
    variable_name = Column(String)
    value = Column(Float)
    company = relationship("Company", back_populates="financials")


class IndicatorDefinition(Base):
    __tablename__ = "indicator_definitions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    display_name = Column(String)
    formula = Column(Text)
    description = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    is_percentage = Column(Integer, default=1)
    agg_type = Column(String, nullable=True)
    agg_years = Column(Integer, nullable=True)
    base_indicator_id = Column(
        Integer, ForeignKey("indicator_definitions.id"), nullable=True
    )
