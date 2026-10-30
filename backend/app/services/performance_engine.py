from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID
import math
import statistics

from app.services.supabase_client import get_supabase_client
from app.models.enums import AlertSeverity, AlertStatus
from app.schemas.performance import (
    PerformanceMetrics,
    DailyGenerationPoint,
    WeeklyGenerationPoint,
    MonthlyGenerationPoint,
    PerformanceComparison,
    PerformancePeriod,
)
from app.schemas.alert import AlertCreate


class PerformanceEngine:
    # Configurable thresholds
    LOW_GENERATION_THRESHOLD = 0.7
    TEMPERATURE_THRESHOLD_C = 65
    STALE_DATA_HOURS = 24
    PERFORMANCE_DROP_THRESHOLD = 0.3
    
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def calculate_solar_position(self, lat: float, lon: float, dt: datetime) -> Dict[str, float]:
        day_of_year = dt.timetuple().tm_yday
        declination = -23.44 * math.cos(math.radians(360/365 * (day_of_year + 10)))
        hour_angle = 15 * (dt.hour + dt.minute/60 - 12)
        
        lat_rad = math.radians(lat)
        dec_rad = math.radians(declination)
        ha_rad = math.radians(hour_angle)
        
        elevation = math.asin(
            math.sin(lat_rad) * math.sin(dec_rad) +
            math.cos(lat_rad) * math.cos(dec_rad) * math.cos(ha_rad)
        )
        
        azimuth = math.atan2(
            math.sin(ha_rad),
            math.cos(ha_rad) * math.sin(lat_rad) - math.tan(dec_rad) * math.cos(lat_rad)
        )
        
        return {
            "elevation": math.degrees(elevation),
            "azimuth": math.degrees(azimuth),
            "is_daylight": elevation > 0
        }
    
    def estimate_expected_generation(
        self,
        capacity_kw: float,
        lat: float,
        lon: float,
        target_date: date,
        panel_orientation: float = 180,
        panel_tilt: float = 30
    ) -> float:
        total_kwh = 0.0
        
        for hour in range(24):
            dt = datetime.combine(target_date, datetime.min.time()) + timedelta(hours=hour)
            solar = self.calculate_solar_position(lat, lon, dt)
            
            if not solar["is_daylight"]:
                continue
            
            incidence_angle = self.calculate_incidence_angle(
                solar["elevation"], solar["azimuth"], panel_tilt, panel_orientation
            )
            
            if incidence_angle > 90:
                continue
            
            irradiance = 1000 * math.cos(math.radians(incidence_angle))
            irradiance = max(0, irradiance)
            
            temp_factor = 1.0
            panel_temp = 25 + (irradiance / 800) * 25
            if panel_temp > 25:
                temp_factor = 1 - 0.004 * (panel_temp - 25)
            
            hourly_kwh = capacity_kw * (irradiance / 1000) * temp_factor * 1.0
            total_kwh += max(0, hourly_kwh)
        
        return total_kwh
    
    def calculate_incidence_angle(
        self,
        solar_elevation: float,
        solar_azimuth: float,
        panel_tilt: float,
        panel_azimuth: float
    ) -> float:
        se_rad = math.radians(solar_elevation)
        sa_rad = math.radians(solar_azimuth)
        pt_rad = math.radians(panel_tilt)
        pa_rad = math.radians(panel_azimuth)
        
        cos_incidence = (
            math.sin(se_rad) * math.cos(pt_rad) +
            math.cos(se_rad) * math.sin(pt_rad) * math.cos(sa_rad - pa_rad)
        )
        
        incidence = math.degrees(math.acos(max(-1, min(1, cos_incidence))))
        return incidence
    
    def get_readings(
        self,
        installation_id: UUID,
        start_date: date,
        end_date: date
    ) -> List[Dict[str, Any]]:
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(end_date, datetime.max.time())
        
        result = self.supabase.table("readings") \
            .select("*") \
            .eq("installation_id", str(installation_id)) \
            .gte("timestamp", start_dt.isoformat()) \
            .lte("timestamp", end_dt.isoformat()) \
            .order("timestamp", desc=False) \
            .execute()
        
        return result.data or []
    
    def get_latest_reading(self, installation_id: UUID) -> Optional[Dict[str, Any]]:
        result = self.supabase.table("readings") \
            .select("*") \
            .eq("installation_id", str(installation_id)) \
            .order("timestamp", desc=True) \
            .limit(1) \
            .execute()
        
        return result.data[0] if result.data else None
    
    def calculate_daily_energy(self, readings: List[Dict[str, Any]]) -> float:
        total = 0.0
        for r in readings:
            if r.get("interval_energy_kwh"):
                total += float(r["interval_energy_kwh"])
        return total
    
    def calculate_performance(
        self,
        installation_id: UUID,
        period: PerformancePeriod = PerformancePeriod.LAST_7_DAYS,
        custom_start: Optional[date] = None,
        custom_end: Optional[date] = None
    ) -> Dict[str, Any]:
        install_resp = self.supabase.table("installations").select("*").eq("id", str(installation_id)).single().execute()
        if not install_resp.data:
            raise ValueError("Installation not found")
        
        installation = install_resp.data
        capacity_kw = float(installation["capacity_kw"])
        lat = float(installation["latitude"]) if installation.get("latitude") else 0
        lon = float(installation["longitude"]) if installation.get("longitude") else 0
        
        end_date = date.today()
        if period == PerformancePeriod.TODAY:
            start_date = end_date
        elif period == PerformancePeriod.LAST_7_DAYS:
            start_date = end_date - timedelta(days=6)
        elif period == PerformancePeriod.LAST_30_DAYS:
            start_date = end_date - timedelta(days=29)
        elif period == PerformancePeriod.CUSTOM and custom_start and custom_end:
            start_date = custom_start
            end_date = custom_end
        else:
            start_date = end_date - timedelta(days=6)
        
        readings = self.get_readings(installation_id, start_date, end_date)
        latest = self.get_latest_reading(installation_id)
        
        daily_data = {}
        for r in readings:
            dt = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
            d = dt.date()
            if d not in daily_data:
                daily_data[d] = []
            daily_data[d].append(r)
        
        daily_points = []
        total_actual = 0.0
        total_expected = 0.0
        
        for d in sorted(daily_data.keys()):
            day_readings = daily_data[d]
            actual = self.calculate_daily_energy(day_readings)
            expected = self.estimate_expected_generation(capacity_kw, lat, lon, d)
            
            total_actual += actual
            total_expected += expected
            
            daily_points.append(DailyGenerationPoint(
                date=d,
                energy_kwh=round(actual, 2),
                expected_kwh=round(expected, 2),
                performance_ratio=round(actual / expected, 3) if expected > 0 else 0
            ))
        
        weekly_points = []
        for i in range(0, len(daily_points), 7):
            week_points = daily_points[i:i+7]
            if week_points:
                week_actual = sum(p.energy_kwh for p in week_points)
                week_expected = sum(p.expected_kwh for p in week_points)
                weekly_points.append(WeeklyGenerationPoint(
                    date=week_points[0].date,
                    energy_kwh=round(week_actual, 2),
                    expected_kwh=round(week_expected, 2),
                    performance_ratio=round(week_actual / week_expected, 3) if week_expected > 0 else 0
                ))
        
        monthly_points = []
        current_month = None
        month_points = []
        for p in daily_points:
            if current_month != p.date.strftime("%Y-%m"):
                if month_points:
                    month_actual = sum(x.energy_kwh for x in month_points)
                    month_expected = sum(x.expected_kwh for x in month_points)
                    monthly_points.append(MonthlyGenerationPoint(
                        month=current_month,
                        energy_kwh=round(month_actual, 2),
                        expected_kwh=round(month_expected, 2),
                        performance_ratio=round(month_actual / month_expected, 3) if month_expected > 0 else 0
                    ))
                current_month = p.date.strftime("%Y-%m")
                month_points = [p]
            else:
                month_points.append(p)
        
        if month_points:
            month_actual = sum(x.energy_kwh for x in month_points)
            month_expected = sum(x.expected_kwh for x in month_points)
            monthly_points.append(MonthlyGenerationPoint(
                month=current_month,
                energy_kwh=round(month_actual, 2),
                expected_kwh=round(month_expected, 2),
                performance_ratio=round(month_actual / month_expected, 3) if month_expected > 0 else 0
            ))
        
        current_power = float(latest["power_w"]) if latest else 0
        energy_today = daily_points[-1].energy_kwh if daily_points else 0
        energy_month = sum(p.energy_kwh for p in daily_points if p.date.month == date.today().month)
        panel_temp = float(latest["temperature_c"]) if latest and latest.get("temperature_c") else None
        
        overall_ratio = total_actual / total_expected if total_expected > 0 else 0
        
        active_alerts = self.get_active_alerts_count(installation_id)
        
        metrics = PerformanceMetrics(
            current_power_w=round(current_power, 2),
            energy_today_kwh=round(energy_today, 2),
            energy_this_month_kwh=round(energy_month, 2),
            panel_temperature_c=round(panel_temp, 2) if panel_temp else None,
            performance_ratio=round(overall_ratio, 3),
            active_alerts=active_alerts,
            last_updated=datetime.fromisoformat(latest["timestamp"].replace("Z", "+00:00")) if latest else datetime.now(),
            data_source=latest.get("data_source", "simulated") if latest else "simulated"
        )
        
        diff_kwh = total_actual - total_expected
        diff_pct = (diff_kwh / total_expected * 100) if total_expected > 0 else 0
        
        if diff_pct > 10:
            status = "above_expected"
        elif diff_pct < -10:
            status = "below_expected"
        else:
            status = "as_expected"
        
        comparison = PerformanceComparison(
            period=period,
            actual_kwh=round(total_actual, 2),
            expected_kwh=round(total_expected, 2),
            difference_kwh=round(diff_kwh, 2),
            difference_percent=round(diff_pct, 1),
            status=status
        )
        
        alerts_summary = self.get_alerts_summary(installation_id)
        
        return {
            "metrics": metrics,
            "daily_generation": daily_points,
            "weekly_generation": weekly_points,
            "monthly_generation": monthly_points,
            "comparison": comparison,
            "alerts_summary": alerts_summary
        }
    
    def get_active_alerts_count(self, installation_id: UUID) -> int:
        result = self.supabase.table("alerts") \
            .select("id", count="exact") \
            .eq("installation_id", str(installation_id)) \
            .eq("status", "active") \
            .execute()
        return result.count or 0
    
    def get_alerts_summary(self, installation_id: UUID) -> Dict[str, int]:
        result = self.supabase.table("alerts") \
            .select("severity,status", count="exact") \
            .eq("installation_id", str(installation_id)) \
            .execute()
        
        summary = {"active": 0, "acknowledged": 0, "resolved": 0, "critical": 0, "warning": 0, "info": 0}
        for alert in result.data or []:
            summary[alert["status"]] = summary.get(alert["status"], 0) + 1
            summary[alert["severity"]] = summary.get(alert["severity"], 0) + 1
        return summary
    
    def check_anomalies(self, installation_id: UUID) -> List[AlertCreate]:
        alerts = []
        latest = self.get_latest_reading(installation_id)
        
        if not latest:
            return alerts
        
        install_resp = self.supabase.table("installations").select("*").eq("id", str(installation_id)).single().execute()
        if not install_resp.data:
            return alerts
        
        installation = install_resp.data
        capacity_kw = float(installation["capacity_kw"])
        
        if latest.get("temperature_c") and float(latest["temperature_c"]) > self.TEMPERATURE_THRESHOLD_C:
            alerts.append(AlertCreate(
                installation_id=installation_id,
                category="temperature",
                severity=AlertSeverity.WARNING,
                title="High Panel Temperature",
                message=f"Panel temperature reached {latest['temperature_c']}°C, exceeding the {self.TEMPERATURE_THRESHOLD_C}°C threshold. Check ventilation and cleaning."
            ))
        
        if latest.get("power_w"):
            current_power = float(latest["power_w"])
            expected_power = capacity_kw * 1000 * 0.8
            if current_power < expected_power * self.LOW_GENERATION_THRESHOLD and current_power > 0:
                alerts.append(AlertCreate(
                    installation_id=installation_id,
                    category="performance",
                    severity=AlertSeverity.WARNING,
                    title="Low Generation Detected",
                    message=f"Current power output ({current_power/1000:.1f} kW) is significantly below expected ({expected_power/1000:.1f} kW). Check for shading, dirt, or equipment issues."
                ))
        
        if latest.get("timestamp"):
            last_ts = datetime.fromisoformat(latest["timestamp"].replace("Z", "+00:00"))
            if datetime.now(last_ts.tzinfo) - last_ts > timedelta(hours=self.STALE_DATA_HOURS):
                alerts.append(AlertCreate(
                    installation_id=installation_id,
                    category="data",
                    severity=AlertSeverity.WARNING,
                    title="Stale Monitoring Data",
                    message=f"No new readings for over {self.STALE_DATA_HOURS} hours. Check monitoring connection."
                ))
        
        return alerts
    
    def create_alerts_if_needed(self, installation_id: UUID) -> List[Dict]:
        new_alerts = self.check_anomalies(installation_id)
        created = []
        
        for alert in new_alerts:
            existing = self.supabase.table("alerts") \
                .select("id") \
                .eq("installation_id", str(installation_id)) \
                .eq("category", alert.category) \
                .eq("status", "active") \
                .execute()
            
            if not existing.data:
                result = self.supabase.table("alerts").insert(alert.model_dump()).execute()
                if result.data:
                    created.append(result.data[0])
        
        return created


performance_engine = PerformanceEngine()