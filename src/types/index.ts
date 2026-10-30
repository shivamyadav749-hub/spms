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

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'

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
  completed_at: string | null
  records?: ServiceRecord[]
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
