import {
  AuthUser,
  Installation,
  ComponentItem,
  Warranty,
  SolarReading,
  PerformanceMetrics,
  DailyGenerationPoint,
  WeeklyGenerationPoint,
  MonthlyGenerationPoint,
  PerformanceComparison,
  DashboardData,
  Alert,
  TechnicianProfile,
  ServiceRequest,
  ServiceRecord,
  ChatMessage,
  ChatSession,
} from '../types'

const STORAGE_KEY = 'spms_solar_app_db_v1'

interface DBState {
  users: AuthUser[]
  installations: Installation[]
  components: ComponentItem[]
  readings: SolarReading[]
  alerts: Alert[]
  technicians: TechnicianProfile[]
  serviceRequests: ServiceRequest[]
  serviceRecords: ServiceRecord[]
  chatSessions: ChatSession[]
  chatMessages: ChatMessage[]
}

// Haversine calculation for technician distance
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0
  const dlat = ((lat2 - lat1) * Math.PI) / 180
  const dlon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dlat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dlon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export class SolarSimulator {
  private rngSeed: number

  constructor(seed = 42) {
    this.rngSeed = seed
  }

  private random(): number {
    const x = Math.sin(this.rngSeed++) * 10000
    return x - Math.floor(x)
  }

  generateDailyProfile(
    installationId: string,
    capacityKw: number,
    targetDate: Date,
    scenario: 'normal' | 'cloudy' | 'high_temp' | 'abnormal' | 'decline' | 'missing' = 'normal'
  ): SolarReading[] {
    const readings: SolarReading[] = []
    const baseCapacityW = capacityKw * 1000
    const today = new Date()

    for (let hour = 0; hour < 24; hour++) {
      if (scenario === 'missing' && (hour === 10 || hour === 11)) {
        continue
      }

      const readingDate = new Date(targetDate)
      readingDate.setHours(hour, 0, 0, 0)
      const timestamp = readingDate.toISOString()

      let powerW = 0
      let voltageV: number | null = 0
      let currentA: number | null = 0
      let irradiance: number | null = 0
      let tempC = 15 + 5 * (this.random() - 0.5)

      if (hour >= 6 && hour <= 18) {
        let solarNoonFactor = 1 - Math.pow((hour - 12) / 6, 2)
        solarNoonFactor = Math.max(0, solarNoonFactor)

        let cloudFactor = 0.7 + 0.3 * this.random()
        if (scenario === 'cloudy') {
          cloudFactor = 0.3 + 0.4 * this.random()
        } else if (scenario === 'decline') {
          const daysAgo = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 3600 * 24))
          cloudFactor = Math.max(0.3, 1.0 - daysAgo * 0.02)
        } else if (scenario === 'high_temp') {
          cloudFactor = 0.8 + 0.2 * this.random()
        } else if (scenario === 'abnormal') {
          cloudFactor = 0.1 + 0.2 * this.random()
        }

        powerW = baseCapacityW * solarNoonFactor * cloudFactor * (0.95 + 0.1 * this.random())
        voltageV = 350 + 20 * (this.random() - 0.5)
        currentA = voltageV > 0 ? powerW / voltageV : 0
        irradiance = 1000 * solarNoonFactor * cloudFactor

        if (scenario === 'high_temp') {
          tempC = 35 + 25 * solarNoonFactor + 5 * (this.random() - 0.5)
        } else {
          tempC = 25 + 15 * solarNoonFactor + 5 * this.random()
        }
      } else {
        voltageV = null
        currentA = null
        irradiance = 0
        powerW = 0
      }

      const intervalEnergyKwh = powerW > 0 ? powerW / 1000.0 : 0

      readings.push({
        id: `${installationId}-${timestamp}`,
        installation_id: installationId,
        timestamp,
        voltage_v: voltageV !== null ? Number(voltageV.toFixed(2)) : null,
        current_a: currentA !== null ? Number(currentA.toFixed(2)) : null,
        power_w: Number(powerW.toFixed(2)),
        temperature_c: Number(tempC.toFixed(2)),
        irradiance_w_m2: irradiance !== null ? Number(irradiance.toFixed(2)) : null,
        interval_energy_kwh: Number(intervalEnergyKwh.toFixed(4)),
        data_source: 'simulated',
      })
    }

    return readings
  }
}

export class PerformanceEngine {
  calculateSolarPosition(lat: number, lon: number, dt: Date) {
    const startOfYear = new Date(dt.getFullYear(), 0, 0)
    const diff = dt.getTime() - startOfYear.getTime()
    const oneDay = 1000 * 60 * 60 * 24
    const dayOfYear = Math.floor(diff / oneDay)

    const declination = -23.44 * Math.cos(((360 / 365) * (dayOfYear + 10) * Math.PI) / 180)
    const hourAngle = 15 * (dt.getHours() + dt.getMinutes() / 60 - 12)

    const latRad = (lat * Math.PI) / 180
    const decRad = (declination * Math.PI) / 180
    const haRad = (hourAngle * Math.PI) / 180

    const elevation = Math.asin(
      Math.sin(latRad) * Math.sin(decRad) +
        Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
    )

    const azimuth = Math.atan2(
      Math.sin(haRad),
      Math.cos(haRad) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad)
    )

    return {
      elevation: (elevation * 180) / Math.PI,
      azimuth: (azimuth * 180) / Math.PI,
      is_daylight: elevation > 0,
    }
  }

  calculateIncidenceAngle(
    solarElevation: number,
    solarAzimuth: number,
    panelTilt: number,
    panelAzimuth: number
  ): number {
    const seRad = (solarElevation * Math.PI) / 180
    const saRad = (solarAzimuth * Math.PI) / 180
    const ptRad = (panelTilt * Math.PI) / 180
    const paRad = (panelAzimuth * Math.PI) / 180

    const cosIncidence =
      Math.sin(seRad) * Math.cos(ptRad) +
      Math.cos(seRad) * Math.sin(ptRad) * Math.cos(saRad - paRad)

    const incidence = (Math.acos(Math.max(-1, Math.min(1, cosIncidence))) * 180) / Math.PI
    return incidence
  }

  estimateExpectedGeneration(
    capacityKw: number,
    lat: number,
    lon: number,
    targetDate: Date,
    panelOrientation = 180,
    panelTilt = 30
  ): number {
    let totalKwh = 0.0

    for (let hour = 0; hour < 24; hour++) {
      const dt = new Date(targetDate)
      dt.setHours(hour, 0, 0, 0)
      const solar = this.calculateSolarPosition(lat, lon, dt)

      if (!solar.is_daylight) continue

      const incidenceAngle = this.calculateIncidenceAngle(
        solar.elevation,
        solar.azimuth,
        panelTilt,
        panelOrientation
      )

      if (incidenceAngle > 90) continue

      let irradiance = 1000 * Math.cos((incidenceAngle * Math.PI) / 180)
      irradiance = Math.max(0, irradiance)

      let tempFactor = 1.0
      const panelTemp = 25 + (irradiance / 800) * 25
      if (panelTemp > 25) {
        tempFactor = 1 - 0.004 * (panelTemp - 25)
      }

      const hourlyKwh = capacityKw * (irradiance / 1000) * tempFactor * 1.0
      totalKwh += Math.max(0, hourlyKwh)
    }

    return totalKwh
  }
}

// Initial default seed state matching supabase/seed.sql
function createInitialSeed(): DBState {
  const simulator = new SolarSimulator(42)
  const installationId = 'inst-demo-solar-001'
  const ownerId = '0ad68548-4c13-4908-8a22-32101f18400b'
  const techId = '1863ce77-a759-40bc-805d-bc75b963be96'

  // Generate 7 days of readings
  const allReadings: SolarReading[] = []
  const today = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    let scenario: 'normal' | 'cloudy' | 'high_temp' = 'normal'
    if (i === 1) scenario = 'high_temp'
    if (i === 2) scenario = 'cloudy'

    const daily = simulator.generateDailyProfile(installationId, 5.0, d, scenario)
    allReadings.push(...daily)
  }

  const users: AuthUser[] = [
    {
      id: ownerId,
      email: 'demo-owner@example.com',
      role: 'owner',
      full_name: 'Demo Homeowner',
      phone: '+1-555-0100',
    },
    {
      id: techId,
      email: 'demo-tech@example.com',
      role: 'technician',
      full_name: 'Demo Technician',
      phone: '+1-555-0200',
    },
  ]

  const installations: Installation[] = [
    {
      id: installationId,
      spms_id: 'SPMS-DEMO-001',
      owner_id: ownerId,
      name: 'Demo Home Solar',
      address: '123 Solar Lane',
      city: 'Springfield',
      postal_code: '62701',
      latitude: 39.7817,
      longitude: -89.6501,
      capacity_kw: 5.0,
      installed_at: '2024-01-15',
      monitoring_mode: 'simulated',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  ]

  const components: ComponentItem[] = [
    {
      id: 'comp-panel-01',
      installation_id: installationId,
      component_type: 'panel',
      manufacturer: 'SunPower',
      model: 'Maxeon 3',
      serial_number: 'SP-DEMO-PANEL-001',
      warranty_start: '2024-01-15',
      warranty_end: '2049-01-15',
    },
    {
      id: 'comp-inv-01',
      installation_id: installationId,
      component_type: 'inverter',
      manufacturer: 'Enphase',
      model: 'IQ7+',
      serial_number: 'SP-DEMO-INV-001',
      warranty_start: '2024-01-15',
      warranty_end: '2034-01-15',
    },
  ]

  const alerts: Alert[] = [
    {
      id: 'alert-001',
      installation_id: installationId,
      category: 'temperature',
      severity: 'warning',
      title: 'High Panel Temperature',
      message:
        'Panel temperature reached 75°C at 2:00 PM yesterday. This is above the recommended operating threshold of 65°C. Consider checking for proper ventilation or cleaning.',
      status: 'active',
      created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      acknowledged_at: null,
      resolved_at: null,
    },
    {
      id: 'alert-002',
      installation_id: installationId,
      category: 'performance',
      severity: 'info',
      title: 'Reduced Generation Detected',
      message:
        'Generation 2 days ago was lower than expected. This was likely due to heavy cloud cover. No action needed unless this persists.',
      status: 'acknowledged',
      created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      acknowledged_at: new Date(Date.now() - 36 * 3600000).toISOString(),
      resolved_at: null,
    },
    {
      id: 'alert-003',
      installation_id: installationId,
      category: 'maintenance',
      severity: 'info',
      title: 'Scheduled Maintenance Reminder',
      message:
        'Annual system inspection recommended. Your system has been operating for over 12 months.',
      status: 'resolved',
      created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
      acknowledged_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      resolved_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    },
  ]

  const technicians: TechnicianProfile[] = [
    {
      user_id: techId,
      full_name: 'Demo Technician',
      city: 'Springfield',
      postal_code: '62701',
      latitude: 39.7817,
      longitude: -89.6501,
      service_area: 'Metro Area',
      skills: ['solar_panel', 'inverter', 'electrical'],
      is_available: true,
      verification_status: 'verified',
    },
    {
      user_id: 'tech-sarah-jenkins',
      full_name: 'Sarah Jenkins',
      city: 'Springfield',
      postal_code: '62702',
      latitude: 39.801,
      longitude: -89.642,
      service_area: 'County & Surrounds',
      skills: ['inverter', 'battery', 'monitoring'],
      is_available: true,
      verification_status: 'verified',
    },
    {
      user_id: 'tech-marcus-vance',
      full_name: 'Marcus Vance',
      city: 'Chatham',
      postal_code: '62629',
      latitude: 39.675,
      longitude: -89.704,
      service_area: 'Regional Central',
      skills: ['solar_panel', 'structural', 'electrical'],
      is_available: true,
      verification_status: 'verified',
    },
  ]

  const serviceRequests: ServiceRequest[] = [
    {
      id: 'SR-001',
      installation_id: installationId,
      requested_by: ownerId,
      technician_id: techId,
      issue_category: 'inspection',
      description:
        'Annual inspection requested. Please check panel cleaning and inverter connections.',
      status: 'assigned',
      technician_name: 'Demo Technician',
      installation_name: 'Demo Home Solar',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      completed_at: null,
    },
    {
      id: 'SR-002',
      installation_id: installationId,
      requested_by: ownerId,
      technician_id: null,
      issue_category: 'performance_drop',
      description: 'Noticed lower generation last week. Please investigate.',
      status: 'requested',
      technician_name: null,
      installation_name: 'Demo Home Solar',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      completed_at: null,
    },
  ]

  const serviceRecords: ServiceRecord[] = [
    {
      id: 'rec-001',
      service_request_id: 'SR-001',
      installation_id: installationId,
      technician_id: techId,
      description: 'Annual inspection and panel cleaning',
      findings:
        'Panels had moderate dust accumulation. Inverter connections secure. No damage found.',
      repair_notes:
        'Cleaned all panels with deionized water. Verified inverter output. System performing at 98% of expected.',
      performed_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ]

  const chatSessions: ChatSession[] = [
    {
      id: 'sess-001',
      user_id: ownerId,
      installation_id: installationId,
      title: 'Demo Chat - Performance Questions',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ]

  const chatMessages: ChatMessage[] = [
    {
      id: 'msg-001',
      session_id: 'sess-001',
      role: 'user',
      content: 'How much electricity did I generate yesterday?',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'msg-002',
      session_id: 'sess-001',
      role: 'assistant',
      content:
        'Based on your simulated data, you generated approximately 18.2 kWh yesterday. This is 94% of your expected 19.4 kWh for a clear day in this season. The slight variation was within normal operating range.',
      created_at: new Date(Date.now() - 86400000 + 5000).toISOString(),
    },
  ]

  return {
    users,
    installations,
    components,
    readings: allReadings,
    alerts,
    technicians,
    serviceRequests,
    serviceRecords,
    chatSessions,
    chatMessages,
  }
}

class AppStore {
  private state: DBState
  private perfEngine = new PerformanceEngine()

  constructor() {
    this.state = this.loadState()
  }

  private loadState(): DBState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    } catch (e) {
      console.warn('Failed to parse state from localStorage, initializing fresh demo data', e)
    }
    const fresh = createInitialSeed()
    this.saveState(fresh)
    return fresh
  }

  private saveState(state: DBState) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.warn('Failed to save state to localStorage', e)
    }
    this.state = state
  }

  resetToDemo() {
    const fresh = createInitialSeed()
    this.saveState(fresh)
    return fresh
  }

  // --- Users & Profiles ---
  getUsers(): AuthUser[] {
    return this.state.users
  }

  getUserById(id: string): AuthUser | undefined {
    return this.state.users.find(u => u.id === id)
  }

  getUserByEmail(email: string): AuthUser | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase())
  }

  addUser(user: AuthUser) {
    const updated = { ...this.state, users: [...this.state.users, user] }
    this.saveState(updated)
    return user
  }

  updateUserProfile(userId: string, updates: Partial<AuthUser>) {
    const users = this.state.users.map(u => (u.id === userId ? { ...u, ...updates } : u))
    const updated = { ...this.state, users }
    this.saveState(updated)
    return users.find(u => u.id === userId)
  }

  // --- Installations ---
  getInstallations(ownerId?: string): Installation[] {
    if (ownerId) {
      return this.state.installations.filter(i => i.owner_id === ownerId)
    }
    return this.state.installations
  }

  getInstallation(id: string): Installation | undefined {
    return this.state.installations.find(i => i.id === id)
  }

  createInstallation(data: Omit<Installation, 'id' | 'spms_id' | 'created_at'>): Installation {
    const id = `inst-${Date.now()}`
    const spmsId = `SPMS-${Math.floor(1000 + Math.random() * 9000)}`
    const newInst: Installation = {
      ...data,
      id,
      spms_id: spmsId,
      created_at: new Date().toISOString(),
    }
    // Automatically generate seed readings for new installation
    const sim = new SolarSimulator(Date.now())
    const readings: SolarReading[] = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      readings.push(...sim.generateDailyProfile(id, newInst.capacity_kw, d, 'normal'))
    }

    const updated = {
      ...this.state,
      installations: [newInst, ...this.state.installations],
      readings: [...this.state.readings, ...readings],
    }
    this.saveState(updated)
    return newInst
  }

  updateInstallation(id: string, updates: Partial<Installation>): Installation {
    const installations = this.state.installations.map(i =>
      i.id === id ? { ...i, ...updates } : i
    )
    const updated = { ...this.state, installations }
    this.saveState(updated)
    return installations.find(i => i.id === id)!
  }

  // --- Components & Warranties ---
  getComponents(installationId: string): ComponentItem[] {
    return this.state.components.filter(c => c.installation_id === installationId)
  }

  createComponent(data: Omit<ComponentItem, 'id'>): ComponentItem {
    const newComp: ComponentItem = {
      ...data,
      id: `comp-${Date.now()}`,
    }
    const updated = { ...this.state, components: [...this.state.components, newComp] }
    this.saveState(updated)
    return newComp
  }

  getWarranties(installationId: string): Warranty[] {
    const comps = this.getComponents(installationId)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return comps.map(c => {
      let status: Warranty['status'] = 'Unknown'
      let daysRemaining: number | null = null

      if (c.warranty_end) {
        const end = new Date(c.warranty_end)
        daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 3600 * 24))
        if (daysRemaining < 0) {
          status = 'Expired'
        } else if (daysRemaining <= 30) {
          status = 'Expiring Soon'
        } else {
          status = 'Active'
        }
      }

      return {
        component_id: c.id,
        component_type: c.component_type,
        manufacturer: c.manufacturer,
        model: c.model,
        serial_number: c.serial_number,
        warranty_start: c.warranty_start,
        warranty_end: c.warranty_end,
        status,
        days_remaining: daysRemaining,
      }
    })
  }

  // --- Performance & Dashboard ---
  getDashboardData(installationId: string): DashboardData {
    const inst = this.getInstallation(installationId)
    if (!inst) {
      throw new Error('Installation not found')
    }

    const readings = this.state.readings
      .filter(r => r.installation_id === installationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    const latest = readings.length > 0 ? readings[readings.length - 1] : null

    // Group by day
    const dailyMap = new Map<string, SolarReading[]>()
    for (const r of readings) {
      const dayStr = r.timestamp.slice(0, 10)
      if (!dailyMap.has(dayStr)) dailyMap.set(dayStr, [])
      dailyMap.get(dayStr)!.push(r)
    }

    const dailyPoints: DailyGenerationPoint[] = []
    let totalActual = 0
    let totalExpected = 0

    const sortedDays = Array.from(dailyMap.keys()).sort()
    for (const day of sortedDays) {
      const dayReadings = dailyMap.get(day)!
      const actualKwh = dayReadings.reduce((sum, r) => sum + (r.interval_energy_kwh || 0), 0)
      const targetDate = new Date(day + 'T12:00:00')
      const expectedKwh = this.perfEngine.estimateExpectedGeneration(
        inst.capacity_kw,
        inst.latitude || 39.78,
        inst.longitude || -89.65,
        targetDate
      )

      totalActual += actualKwh
      totalExpected += expectedKwh

      dailyPoints.push({
        date: day,
        energy_kwh: Number(actualKwh.toFixed(2)),
        expected_kwh: Number(expectedKwh.toFixed(2)),
        performance_ratio: expectedKwh > 0 ? Number((actualKwh / expectedKwh).toFixed(3)) : 0,
      })
    }

    // Weekly generation grouping
    const weeklyPoints: WeeklyGenerationPoint[] = []
    for (let i = 0; i < dailyPoints.length; i += 7) {
      const slice = dailyPoints.slice(i, i + 7)
      if (slice.length > 0) {
        const wActual = slice.reduce((s, p) => s + p.energy_kwh, 0)
        const wExpected = slice.reduce((s, p) => s + p.expected_kwh, 0)
        weeklyPoints.push({
          date: slice[0].date,
          energy_kwh: Number(wActual.toFixed(2)),
          expected_kwh: Number(wExpected.toFixed(2)),
          performance_ratio: wExpected > 0 ? Number((wActual / wExpected).toFixed(3)) : 0,
        })
      }
    }

    // Monthly generation grouping
    const monthlyMap = new Map<string, { actual: number; expected: number }>()
    for (const p of dailyPoints) {
      const monthStr = p.date.slice(0, 7) // YYYY-MM
      const current = monthlyMap.get(monthStr) || { actual: 0, expected: 0 }
      current.actual += p.energy_kwh
      current.expected += p.expected_kwh
      monthlyMap.set(monthStr, current)
    }

    const monthlyPoints: MonthlyGenerationPoint[] = Array.from(monthlyMap.entries()).map(
      ([month, val]) => ({
        month,
        energy_kwh: Number(val.actual.toFixed(2)),
        expected_kwh: Number(val.expected.toFixed(2)),
        performance_ratio: val.expected > 0 ? Number((val.actual / val.expected).toFixed(3)) : 0,
      })
    )

    const activeAlerts = this.state.alerts.filter(
      a => a.installation_id === installationId && a.status === 'active'
    ).length

    const todayStr = new Date().toISOString().slice(0, 10)
    const todayPoint = dailyPoints.find(p => p.date === todayStr) || dailyPoints[dailyPoints.length - 1]
    const energyToday = todayPoint ? todayPoint.energy_kwh : 0

    const currentMonthStr = todayStr.slice(0, 7)
    const energyThisMonth = dailyPoints
      .filter(p => p.date.startsWith(currentMonthStr))
      .reduce((sum, p) => sum + p.energy_kwh, 0)

    const currentPower = latest ? latest.power_w : 0
    const panelTemp = latest ? latest.temperature_c : null
    const overallRatio = totalExpected > 0 ? totalActual / totalExpected : 0

    const metrics: PerformanceMetrics = {
      current_power_w: Number(currentPower.toFixed(1)),
      energy_today_kwh: Number(energyToday.toFixed(1)),
      energy_this_month_kwh: Number(energyThisMonth.toFixed(1)),
      panel_temperature_c: panelTemp !== null ? Number(panelTemp.toFixed(1)) : null,
      performance_ratio: Number(overallRatio.toFixed(3)),
      active_alerts: activeAlerts,
      last_updated: latest ? latest.timestamp : new Date().toISOString(),
      data_source: 'simulated',
    }

    const diffKwh = totalActual - totalExpected
    const diffPct = totalExpected > 0 ? (diffKwh / totalExpected) * 100 : 0
    let compStatus = 'as_expected'
    if (diffPct > 10) compStatus = 'above_expected'
    else if (diffPct < -10) compStatus = 'below_expected'

    const comparison: PerformanceComparison = {
      period: 'last 7 days',
      actual_kwh: Number(totalActual.toFixed(2)),
      expected_kwh: Number(totalExpected.toFixed(2)),
      difference_kwh: Number(diffKwh.toFixed(2)),
      difference_percent: Number(diffPct.toFixed(1)),
      status: compStatus,
    }

    const alertsSummary: Record<string, number> = {
      active: 0,
      acknowledged: 0,
      resolved: 0,
      critical: 0,
      warning: 0,
      info: 0,
    }

    for (const a of this.state.alerts.filter(x => x.installation_id === installationId)) {
      alertsSummary[a.status] = (alertsSummary[a.status] || 0) + 1
      alertsSummary[a.severity] = (alertsSummary[a.severity] || 0) + 1
    }

    return {
      metrics,
      daily_generation: dailyPoints,
      weekly_generation: weeklyPoints,
      monthly_generation: monthlyPoints,
      comparison,
      alerts_summary: alertsSummary,
    }
  }

  // --- Alerts ---
  getAlerts(installationId: string, status?: string): Alert[] {
    return this.state.alerts.filter(
      a => a.installation_id === installationId && (!status || a.status === status)
    )
  }

  updateAlertStatus(alertId: string, status: Alert['status']): Alert {
    const now = new Date().toISOString()
    const alerts = this.state.alerts.map(a => {
      if (a.id === alertId) {
        return {
          ...a,
          status,
          acknowledged_at: status === 'acknowledged' ? now : a.acknowledged_at,
          resolved_at: status === 'resolved' ? now : a.resolved_at,
        }
      }
      return a
    })
    const updated = { ...this.state, alerts }
    this.saveState(updated)
    return alerts.find(a => a.id === alertId)!
  }

  // --- Technicians ---
  getTechnicians(params: {
    city?: string
    postal_code?: string
    skills?: string
    latitude?: number
    longitude?: number
    radius_km?: number
  } = {}): TechnicianProfile[] {
    let list = this.state.technicians.filter(t => t.verification_status === 'verified')

    if (params.city) {
      const q = params.city.toLowerCase()
      list = list.filter(t => t.city.toLowerCase().includes(q))
    }

    if (params.postal_code) {
      list = list.filter(t => t.postal_code === params.postal_code)
    }

    if (params.skills) {
      list = list.filter(t => t.skills.includes(params.skills!))
    }

    const enriched = list.map(t => {
      let distance: number | null = null
      if (
        params.latitude !== undefined &&
        params.longitude !== undefined &&
        t.latitude &&
        t.longitude
      ) {
        distance = haversine(params.latitude, params.longitude, t.latitude, t.longitude)
      }
      return {
        ...t,
        distance_km: distance !== null ? Number(distance.toFixed(1)) : null,
      }
    })

    if (params.radius_km !== undefined && params.latitude !== undefined) {
      return enriched.filter(t => t.distance_km === null || t.distance_km <= params.radius_km!)
    }

    return enriched
  }

  getTechnicianProfile(userId: string): TechnicianProfile | undefined {
    return this.state.technicians.find(t => t.user_id === userId)
  }

  updateTechnicianProfile(userId: string, updates: Partial<TechnicianProfile>): TechnicianProfile {
    let exists = false
    const technicians = this.state.technicians.map(t => {
      if (t.user_id === userId) {
        exists = true
        return { ...t, ...updates }
      }
      return t
    })

    if (!exists) {
      const user = this.getUserById(userId)
      technicians.push({
        user_id: userId,
        full_name: user?.full_name || 'Technician',
        city: updates.city || 'Springfield',
        postal_code: updates.postal_code || '62701',
        latitude: updates.latitude || 39.78,
        longitude: updates.longitude || -89.65,
        service_area: updates.service_area || 'Metro Area',
        skills: updates.skills || ['solar_panel', 'inverter'],
        is_available: updates.is_available ?? true,
        verification_status: 'verified',
      })
    }

    const updated = { ...this.state, technicians }
    this.saveState(updated)
    return technicians.find(t => t.user_id === userId)!
  }

  // --- Service Requests & Records ---
  getServiceRequests(filter?: {
    userId?: string
    role?: 'owner' | 'technician'
    status?: string
    installationId?: string
  }): ServiceRequest[] {
    let list = this.state.serviceRequests

    if (filter?.role === 'owner' && filter.userId) {
      list = list.filter(r => r.requested_by === filter.userId)
    } else if (filter?.role === 'technician' && filter.userId) {
      list = list.filter(r => r.technician_id === filter.userId || !r.technician_id)
    }

    if (filter?.installationId) {
      list = list.filter(r => r.installation_id === filter.installationId)
    }

    if (filter?.status) {
      list = list.filter(r => r.status === filter.status)
    }

    return list.map(r => ({
      ...r,
      records: this.state.serviceRecords.filter(rec => rec.service_request_id === r.id),
    }))
  }

  getServiceRequestById(id: string): ServiceRequest | undefined {
    const r = this.state.serviceRequests.find(x => x.id === id)
    if (!r) return undefined
    return {
      ...r,
      records: this.state.serviceRecords.filter(rec => rec.service_request_id === r.id),
    }
  }

  createServiceRequest(data: {
    installation_id: string
    requested_by: string
    issue_category: string
    description: string
    technician_id?: string | null
  }): ServiceRequest {
    const inst = this.getInstallation(data.installation_id)
    const tech = data.technician_id ? this.getTechnicianProfile(data.technician_id) : null
    const id = `SR-${Math.floor(100 + Math.random() * 900)}`

    const newReq: ServiceRequest = {
      id,
      installation_id: data.installation_id,
      requested_by: data.requested_by,
      technician_id: data.technician_id || null,
      issue_category: data.issue_category,
      description: data.description,
      status: data.technician_id ? 'assigned' : 'requested',
      technician_name: tech?.full_name || null,
      installation_name: inst?.name || 'Solar Installation',
      created_at: new Date().toISOString(),
      completed_at: null,
      records: [],
    }

    const updated = {
      ...this.state,
      serviceRequests: [newReq, ...this.state.serviceRequests],
    }
    this.saveState(updated)
    return newReq
  }

  updateServiceRequest(
    id: string,
    updates: Partial<ServiceRequest>
  ): ServiceRequest {
    const serviceRequests = this.state.serviceRequests.map(r => {
      if (r.id === id) {
        const completedAt =
          updates.status === 'completed' && !r.completed_at
            ? new Date().toISOString()
            : r.completed_at
        return { ...r, ...updates, completed_at: completedAt }
      }
      return r
    })
    const updated = { ...this.state, serviceRequests }
    this.saveState(updated)
    return this.getServiceRequestById(id)!
  }

  createServiceRecord(data: {
    service_request_id: string
    installation_id: string
    technician_id: string
    description: string
    findings?: string | null
    repair_notes?: string | null
    performed_at?: string
  }): ServiceRecord {
    const newRecord: ServiceRecord = {
      id: `rec-${Date.now()}`,
      service_request_id: data.service_request_id,
      installation_id: data.installation_id,
      technician_id: data.technician_id,
      description: data.description,
      findings: data.findings || null,
      repair_notes: data.repair_notes || null,
      performed_at: data.performed_at || new Date().toISOString(),
    }

    const updated = {
      ...this.state,
      serviceRecords: [newRecord, ...this.state.serviceRecords],
    }
    this.saveState(updated)
    return newRecord
  }

  getServiceHistory(installationId: string): {
    service_requests: ServiceRequest[]
    service_records: ServiceRecord[]
  } {
    const reqs = this.state.serviceRequests.filter(r => r.installation_id === installationId)
    const recs = this.state.serviceRecords.filter(r => r.installation_id === installationId)
    return {
      service_requests: reqs,
      service_records: recs,
    }
  }

  // --- AI Solar Assistant ---
  chatAI(installationId: string, question: string): { message: string; session_id: string } {
    const dash = this.getDashboardData(installationId)
    const q = question.toLowerCase()
    const m = dash.metrics
    const alerts = this.getAlerts(installationId, 'active')
    const warranties = this.getWarranties(installationId)
    const history = this.getServiceHistory(installationId)

    let reply = ''
    if (q.includes('generate') || q.includes('electricity') || q.includes('power') || q.includes('kwh') || q.includes('today')) {
      reply = `Based on your simulated data, your system has generated approximately ${m.energy_today_kwh} kWh today. Current power output is ${m.current_power_w} W (${(m.current_power_w / 1000).toFixed(2)} kW), performing at ${(m.performance_ratio * 100).toFixed(0)}% of theoretical optimum for current sunshine levels. (DEMO MODE - simulated data)`
    } else if (q.includes('temperature') || q.includes('hot') || q.includes('heat')) {
      const temp = m.panel_temperature_c
      if (temp) {
        reply = `Your solar panel temperature is currently ${temp}°C. ${
          temp > 65
            ? 'This is above the standard 65°C operating threshold. Consider ensuring clear ventilation around the inverter and panels.'
            : 'This is well within normal safe operating temperatures (under 65°C).'
        } (DEMO MODE - simulated data)`
      } else {
        reply = 'Panel temperature telemetry is not currently reported in the latest simulated interval.'
      }
    } else if (q.includes('alert') || q.includes('problem') || q.includes('warning') || q.includes('issue')) {
      if (alerts.length > 0) {
        const list = alerts.map(a => `• [${a.severity.toUpperCase()}] ${a.title}: ${a.message}`).join('\n')
        reply = `You have ${alerts.length} active alert(s):\n${list}\n\nYou can review or resolve them in the Alerts tab or request technician assistance.`
      } else {
        reply = 'Good news! Your solar system has 0 active alerts. Inverter communication and generation are operating smoothly.'
      }
    } else if (q.includes('warranty') || q.includes('expire') || q.includes('inverter') || q.includes('panel')) {
      if (warranties.length > 0) {
        const list = warranties
          .map(w => `• ${w.manufacturer} ${w.model} (${w.component_type}): Status ${w.status}, expires ${w.warranty_end || 'N/A'} (${w.days_remaining} days left)`)
          .join('\n')
        reply = `Here is your component warranty breakdown:\n${list}`
      } else {
        reply = 'No component warranty details are logged for this installation.'
      }
    } else if (q.includes('technician') || q.includes('service') || q.includes('repair') || q.includes('check')) {
      const past = history.service_records[0]
      if (past) {
        reply = `Your most recent recorded service was on ${new Date(past.performed_at).toLocaleDateString()}: "${past.description}". Findings: ${past.findings || 'All normal'}. You can also browse verified local technicians under the Technicians tab to request a new checkup.`
      } else {
        reply = 'No previous service records are registered yet. You can search verified technicians under the "Technicians" tab.'
      }
    } else if (q.includes('compare') || q.includes('week') || q.includes('month') || q.includes('history')) {
      reply = `In the ${dash.comparison.period}, actual generation was ${dash.comparison.actual_kwh} kWh vs ${dash.comparison.expected_kwh} kWh expected (${dash.comparison.difference_percent >= 0 ? '+' : ''}${dash.comparison.difference_percent}%). Status is evaluated as: "${dash.comparison.status.replace('_', ' ')}".`
    } else {
      reply = `I can help analyze your solar installation! Today you generated ${m.energy_today_kwh} kWh with current power at ${m.current_power_w} W (${(m.performance_ratio * 100).toFixed(0)}% performance ratio). You can ask me about generation, panel temperatures, active alerts, warranty coverage, or service requests.`
    }

    return {
      message: reply,
      session_id: 'sess-' + Date.now(),
    }
  }
}

export const appStore = new AppStore()
