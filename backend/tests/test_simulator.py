import pytest
from uuid import uuid4
from app.services.simulator import SolarSimulator
from app.services.performance_engine import performance_engine
from app.schemas.reading import SimulateRequest
from datetime import date, timedelta


def test_simulator_normal():
    sim = SolarSimulator(seed=42)
    readings = sim.generate_daily_profile(5.0, date.today(), "normal")
    assert len(readings) == 24
    # night hours should have zero power
    for r in readings[:6]:
        assert r["power_w"] == 0
    # day hours should have positive power
    day_readings = [r for r in readings if r["power_w"] > 0]
    assert len(day_readings) > 0


def test_simulator_cloudy():
    sim = SolarSimulator(seed=42)
    readings = sim.generate_daily_profile(5.0, date.today(), "cloudy")
    day_power = [r["power_w"] for r in readings if r["power_w"] > 0]
    # cloudy should be lower than normal max
    assert max(day_power) < 5000 * 0.8  # less than 80% capacity


def test_performance_calculations():
    # This test would need a real DB; we skip integration here
    pass