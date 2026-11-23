export type UserRole = 'owner' | 'technician'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  full_name?: string
  phone?: string
}

export interface Installation {
  id: string
  spms_id: string
  owner_id: string
  name: string
  address: string
  city: string
  postal_code: string
  latitude: number
  longitude: number
  capacity_kw: number
  installed_at: string
  monitoring_mode: 'simulated' | 'live'
  created_at: string
}

export interface ComponentItem {
  id: string
  installation_id: string
  component_type: 'panel' | 'inverter' | 'battery' | 'component'
  manufacturer: string
  model: string
  serial_number: string
  warranty_start: string
  warranty_end: string
}

export interface Warranty {
  component_id: string
  component_type: 'panel' | 'inverter' | 'battery' | 'component'
  manufacturer: string
  model: string
  serial_number: string | null
  warranty_start: string | null
  warranty_end: string | null
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Unknown'
  days_remaining: number | null
}

export interface SolarReading {
  id: string
  installation_id: string
  timestamp: string
  voltage_v: number | null
  current_a: number | null
  power_w: number
  temperature_c: number | null
  irradiance_w_m2: number | null
  interval_energy_kwh: number
  data_source: 'simulated' | 'live'
}

export interface PerformanceMetrics {
  current_power_w: number
  energy_today_kwh: number
  energy_this_month_kwh: number
  panel_temperature_c: number | null
  performance_ratio: number
  active_alerts: number
  last_updated: string
  data_source: string
}

export interface DailyGenerationPoint {
  date: string
  energy_kwh: number
  expected_kwh: number
  performance_ratio: number
}

export interface WeeklyGenerationPoint {
  date: string
  energy_kwh: number
  expected_kwh: number
  performance_ratio: number
}

export interface MonthlyGenerationPoint {
  month: string
  energy_kwh: number
  expected_kwh: number
  performance_ratio: number
}

export interface PerformanceComparison {
  period: string
  actual_kwh: number
  expected_kwh: number
  difference_kwh: number
  difference_percent: number
  status: 'above_expected' | 'below_expected' | 'as_expected' | string
}

export interface DashboardData {
  metrics: PerformanceMetrics
  daily_generation: DailyGenerationPoint[]
  weekly_generation: WeeklyGenerationPoint[]
  monthly_generation: MonthlyGenerationPoint[]
  comparison: PerformanceComparison
  alerts_summary: Record<string, number>
}

export interface GenerationVsConsumptionPoint {
  date: string
  generated_kwh: number
  consumed_kwh: number
  net_kwh: number
}

export interface GenerationVsConsumptionReport {
  installation_id: string
  period_days: number
  total_generated_kwh: number
  total_consumed_kwh: number
  net_balance_kwh: number
  self_sufficiency_pct: number
  daily_series: GenerationVsConsumptionPoint[]
}

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'
export type AlertSource = 'system' | 'ml_predictive'
export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'high'

export interface Alert {
  id: string
  installation_id: string
  category: string
  severity: AlertSeverity
  title: string
  message: string
  status: AlertStatus
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  source?: AlertSource
  component_target?: 'panel' | 'inverter' | 'thermal'
  confidence?: number
  risk_score?: number
  predicted_days_to_critical?: number | null
  recommended_action?: string
  model_signals?: string[]
}

export interface MLDiagnosticFeature {
  feature: string
  component: 'panel' | 'inverter' | 'thermal'
  value: string
  baseline: string
  z_score: number
  status: 'normal' | 'watch' | 'warning'
}

export interface MLAnomalyPoint {
  date: string
  efficiency_pct: number
  expected_baseline_pct: number
  anomaly_score: number
  voltage_stability_pct: number
}

export interface MLPredictiveReport {
  installation_id: string
  analyzed_at: string
  readings_analyzed: number
  overall_health_score: number
  panel_health_score: number
  inverter_health_score: number
  panel_risk: RiskLevel
  inverter_risk: RiskLevel
  degradation_slope_pct_per_day: number
  estimated_days_to_critical: number | null
  inverter_voltage_instability_pct: number
  inverter_residual_loss_pct: number
  thermal_stress_index: number
  feature_contributions: MLDiagnosticFeature[]
  daily_health_series: MLAnomalyPoint[]
  newly_triggered_alerts: Alert[]
  predictive_alerts: Alert[]
}

export interface TechnicianProfile {
  user_id: string
  full_name: string | null
  city: string
  postal_code: string | null
  latitude: number | null
  longitude: number | null
  service_area: string
  skills: string[]
  is_available: boolean
  verification_status: 'verified' | 'unverified'
  distance_km?: number | null
}

export type RequestStatus =
  | 'requested'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export interface ServiceRecord {
  id: string
  service_request_id: string
  installation_id: string
  technician_id: string
  description: string
  findings: string | null
  repair_notes: string | null
  performed_at: string
}

export interface ServiceRequest {
  id: string
  installation_id: string
  requested_by: string
  technician_id?: string | null
  issue_category: string
  description: string
  status: RequestStatus
  technician_name: string | null
  installation_name: string | null
  created_at: string
  scheduled_date?: string | null
  completed_at: string | null
  records?: ServiceRecord[]
}

export type MaintenanceEventKind =
  | 'scheduled_check'
  | 'ml_predicted_window'
  | 'routine_inspection'

export interface MaintenanceEvent {
  id: string
  installation_id: string
  date: string
  window_end_date?: string
  kind: MaintenanceEventKind
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status?: string
  technician_name?: string | null
  confidence?: number
  source_id?: string
}

export interface ChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  installation_id: string
  title: string
  created_at: string
}

export type WeatherIconKind =
  | 'sun'
  | 'moon'
  | 'cloud-sun'
  | 'cloud'
  | 'fog'
  | 'rain'
  | 'snow'
  | 'storm'

export interface CurrentWeatherData {
  time: string
  temperature_c: number
  apparent_temperature_c: number
  relative_humidity_pct: number
  wind_speed_kmh: number
  cloud_cover_pct: number
  precipitation_mm: number
  weather_code: number
  is_day: boolean
  shortwave_radiation_w_m2: number
  direct_radiation_w_m2: number
  diffuse_radiation_w_m2: number
  direct_normal_irradiance_w_m2: number
}

export interface DailyWeatherPoint {
  date: string
  weather_code: number
  temp_max_c: number
  temp_min_c: number
  uv_index_max: number
  solar_radiation_mj_m2: number
  solar_insolation_kwh_m2: number
  sunrise: string
  sunset: string
}

export interface HourlySolarWeatherPoint {
  time: string
  hour_label: string
  irradiance_w_m2: number
  cloud_cover_pct: number
  temperature_c: number
}

export interface LocalWeatherReport {
  latitude: number
  longitude: number
  timezone: string
  timezone_abbreviation: string
  location_label: string
  source_mode: 'installation' | 'geolocation'
  fetched_at: string
  current: CurrentWeatherData
  daily: DailyWeatherPoint[]
  today_hourly: HourlySolarWeatherPoint[]
}

