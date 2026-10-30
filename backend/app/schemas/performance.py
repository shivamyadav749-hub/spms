from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from enum import Enum


class PerformancePeriod(str, Enum):
    TODAY = "today"
    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    CUSTOM = "custom"


class PerformanceMetrics(BaseModel):
    current_power_w: float
    energy_today_kwh: float
    energy_this_month_kwh: float
    panel_temperature_c: Optional[float]
    performance_ratio: float
    active_alerts: int
    last_updated: datetime
    data_source: str


class DailyGenerationPoint(BaseModel):
    date: date
    energy_kwh: float
    expected_kwh: float
    performance_ratio: float


class WeeklyGenerationPoint(BaseModel):
    date: date
    energy_kwh: float
    expected_kwh: float
    performance_ratio: float


class MonthlyGenerationPoint(BaseModel):
    month: str
    energy_kwh: float
    expected_kwh: float
    performance_ratio: float


class PerformanceComparison(BaseModel):
    period: PerformancePeriod
    actual_kwh: float
    expected_kwh: float
    difference_kwh: float
    difference_percent: float
    status: str


class PerformanceResponse(BaseModel):
    installation_id: UUID
    metrics: PerformanceMetrics
    daily_generation: List[DailyGenerationPoint]
    weekly_generation: List[WeeklyGenerationPoint]
    monthly_generation: List[MonthlyGenerationPoint]
    comparison: PerformanceComparison
    alerts_summary: dict

    model_config = ConfigDict(from_attributes=True)


class ExpectedGenerationParams(BaseModel):
    capacity_kw: float
    location_lat: float
    location_lon: float
    date: date