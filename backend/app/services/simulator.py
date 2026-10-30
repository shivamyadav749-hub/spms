import random
import math
from datetime import datetime, timedelta, date
from typing import List, Optional
from uuid import UUID

from app.services.supabase_client import get_supabase_client
from app.models.enums import DataSource
from app.schemas.reading import SimulateRequest


class SolarSimulator:
    def __init__(self, seed: Optional[int] = None):
        self.rng = random.Random(seed)
    
    def generate_daily_profile(self, capacity_kw: float, target_date: date, scenario: str = "normal") -> List[dict]:
        readings = []
        base_capacity_w = capacity_kw * 1000
        
        for hour in range(24):
            timestamp = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=hour)
            timestamp = timestamp.replace(tzinfo=None)
            
            if scenario == "missing" and hour in [10, 11]:
                continue
            
            if hour < 6 or hour > 18:
                power_w = 0
                voltage_v = 0
                current_a = 0
                irradiance = 0
                temp_c = 15 + 5 * (self.rng.random() - 0.5)
            else:
                solar_noon_factor = 1 - ((hour - 12) / 6) ** 2
                solar_noon_factor = max(0, solar_noon_factor)
                
                if scenario == "cloudy":
                    cloud_factor = 0.3 + 0.4 * self.rng.random()
                elif scenario == "decline":
                    days_ago = (date.today() - target_date).days
                    cloud_factor = max(0.3, 1.0 - days_ago * 0.02)
                elif scenario == "high_temp":
                    cloud_factor = 0.8 + 0.2 * self.rng.random()
                elif scenario == "abnormal":
                    cloud_factor = 0.1 + 0.2 * self.rng.random()
                else:
                    cloud_factor = 0.7 + 0.3 * self.rng.random()
                
                power_w = base_capacity_w * solar_noon_factor * cloud_factor * (0.95 + 0.1 * self.rng.random())
                voltage_v = 350 + 20 * (self.rng.random() - 0.5)
                current_a = power_w / voltage_v if voltage_v > 0 else 0
                irradiance = 1000 * solar_noon_factor * cloud_factor
                
                if scenario == "high_temp":
                    temp_c = 35 + 25 * solar_noon_factor + 5 * (self.rng.random() - 0.5)
                else:
                    temp_c = 25 + 15 * solar_noon_factor + 5 * (self.rng.random())
            
            interval_energy_kwh = power_w / 1000.0 if power_w > 0 else 0
            
            readings.append({
                "timestamp": timestamp.isoformat(),
                "voltage_v": round(voltage_v, 2) if voltage_v > 0 else None,
                "current_a": round(current_a, 2) if current_a > 0 else None,
                "power_w": round(power_w, 2),
                "temperature_c": round(temp_c, 2),
                "irradiance_w_m2": round(irradiance, 2),
                "interval_energy_kwh": round(interval_energy_kwh, 4),
                "data_source": DataSource.SIMULATED.value,
            })
        
        return readings
    
    def generate_readings_for_installation(
        self,
        installation_id: UUID,
        days: int = 7,
        scenario: str = "normal"
    ) -> List[dict]:
        supabase = get_supabase_client()
        install_resp = supabase.table("installations").select("capacity_kw").eq("id", str(installation_id)).single().execute()
        
        if not install_resp.data:
            raise ValueError("Installation not found")
        
        capacity_kw = float(install_resp.data["capacity_kw"])
        all_readings = []
        
        for day_offset in range(days):
            target_date = date.today() - timedelta(days=day_offset)
            daily_readings = self.generate_daily_profile(capacity_kw, target_date, scenario)
            
            for reading in daily_readings:
                reading["installation_id"] = str(installation_id)
                all_readings.append(reading)
        
        return all_readings
    
    async def store_readings(self, readings: List[dict]) -> int:
        if not readings:
            return 0
        
        supabase = get_supabase_client()
        result = supabase.table("readings").upsert(readings, on_conflict="installation_id,timestamp").execute()
        return len(result.data) if result.data else 0


async def simulate_installation_readings(
    installation_id: UUID,
    request: SimulateRequest
) -> dict:
    simulator = SolarSimulator(seed=42)
    readings = simulator.generate_readings_for_installation(
        installation_id,
        days=request.days,
        scenario=request.scenario
    )
    stored = await simulator.store_readings(readings)
    return {"generated": len(readings), "stored": stored, "scenario": request.scenario}