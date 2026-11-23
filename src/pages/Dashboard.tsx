import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Zap,
  Calendar,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Building2,
  Wind,
  Droplets,
  MapPin,
  LocateFixed,
  Sunrise,
  Sunset,
  BrainCircuit,
  Lightbulb,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { api } from '../lib/api'
import {
  describeWmoWeather,
  fetchLocalSolarWeather,
  getSolarIrradianceStatus,
} from '../lib/weather'
import { generateOptimizationTips, OptimizationCategory } from '../lib/optimizationTips'
import { MaintenanceCalendar } from '../components/dashboard/MaintenanceCalendar'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Select, LoadingScreen } from '../components/ui'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import {
  DashboardData,
  DailyWeatherPoint,
  Installation,
  LocalWeatherReport,
  MLPredictiveReport,
  MaintenanceEvent,
  WeatherIconKind,
} from '../types'

function WeatherIcon({
  kind,
  className = 'h-5 w-5',
}: {
  kind: WeatherIconKind
  className?: string
}) {
  switch (kind) {
    case 'sun':
      return <Sun className={`${className} text-amber-500`} />
    case 'moon':
      return <Moon className={`${className} text-indigo-500`} />
    case 'cloud-sun':
      return <CloudSun className={`${className} text-amber-500`} />
    case 'fog':
      return <CloudFog className={`${className} text-slate-500`} />
    case 'rain':
      return <CloudRain className={`${className} text-blue-500`} />
    case 'snow':
      return <CloudSnow className={`${className} text-sky-400`} />
    case 'storm':
      return <CloudLightning className={`${className} text-purple-600`} />
    default:
      return <Cloud className={`${className} text-gray-500`} />
  }
}

function formatClock(isoDateTime: string): string {
  if (!isoDateTime) return '—'
  const timePart = isoDateTime.split('T')[1]
  return timePart ? timePart.slice(0, 5) : isoDateTime
}

function formatCoords(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`
}

export function Dashboard() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [mlReport, setMlReport] = useState<MLPredictiveReport | null>(null)
  const [maintenanceEvents, setMaintenanceEvents] = useState<MaintenanceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [weather, setWeather] = useState<LocalWeatherReport | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState('')
  const [geoOverride, setGeoOverride] = useState<{ lat: number; lon: number; label: string } | null>(null)
  const [geoLocating, setGeoLocating] = useState(false)

  const selectedInstallation = useMemo(
    () => installations.find(i => i.id === selectedId) || null,
    [installations, selectedId]
  )

  useEffect(() => {
    loadInstallations()
  }, [])

  useEffect(() => {
    if (selectedId) {
      setGeoOverride(null)
      loadDashboard(selectedId)
    }
  }, [selectedId])

  const loadWeather = useCallback(
    async (
      lat: number,
      lon: number,
      label: string,
      sourceMode: 'installation' | 'geolocation',
      signal?: AbortSignal
    ) => {
      setWeatherLoading(true)
      setWeatherError('')
      try {
        const report = await fetchLocalSolarWeather(lat, lon, label, sourceMode, signal)
        setWeather(report)
      } catch (e: any) {
        if (e?.name === 'AbortError') return
        setWeatherError(e?.message || 'Unable to fetch live weather telemetry')
      } finally {
        if (!signal?.aborted) {
          setWeatherLoading(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!selectedInstallation && !geoOverride) return
    const controller = new AbortController()
    const target = geoOverride
      ? { lat: geoOverride.lat, lon: geoOverride.lon, label: geoOverride.label, mode: 'geolocation' as const }
      : {
          lat: selectedInstallation!.latitude,
          lon: selectedInstallation!.longitude,
          label: selectedInstallation!.city || selectedInstallation!.name,
          mode: 'installation' as const,
        }

    loadWeather(target.lat, target.lon, target.label, target.mode, controller.signal)
    return () => controller.abort()
  }, [selectedInstallation, geoOverride, loadWeather])

  async function loadInstallations() {
    try {
      const res = await api.get<{ installations: Installation[] }>('/api/v1/installations')
      setInstallations(res.installations)
      if (res.installations.length) {
        setSelectedId(res.installations[0].id)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load installations')
    }
  }

  async function loadDashboard(id: string) {
    setLoading(true)
    setError('')
    try {
      const [res, mlRes, calRes] = await Promise.all([
        api.get<DashboardData>(`/api/v1/installations/${id}/dashboard`),
        api.get<MLPredictiveReport>(`/api/v1/installations/${id}/ml-diagnostics`),
        api.get<MaintenanceEvent[]>(`/api/v1/installations/${id}/maintenance-calendar`),
      ])
      setData(res)
      setMlReport(mlRes)
      setMaintenanceEvents(calRes)
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  function handleRefreshAll() {
    if (selectedId) {
      loadDashboard(selectedId)
    }
    if (geoOverride) {
      loadWeather(geoOverride.lat, geoOverride.lon, geoOverride.label, 'geolocation')
    } else if (selectedInstallation) {
      loadWeather(
        selectedInstallation.latitude,
        selectedInstallation.longitude,
        selectedInstallation.city || selectedInstallation.name,
        'installation'
      )
    }
  }

  function handleToggleGeolocation() {
    if (geoOverride) {
      setGeoOverride(null)
      return
    }
    if (!('geolocation' in navigator)) {
      setWeatherError('Browser geolocation is not supported in this environment.')
      return
    }
    setGeoLocating(true)
    setWeatherError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setGeoLocating(false)
        setGeoOverride({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: 'Current Location',
        })
      },
      err => {
        setGeoLocating(false)
        setWeatherError(err.message || 'Location permission was declined. Showing site coordinates.')
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }

  const dailyWeatherMap = useMemo(() => {
    const map = new Map<string, DailyWeatherPoint>()
    for (const d of weather?.daily || []) {
      map.set(d.date, d)
    }
    return map
  }, [weather])

  const dailyWithWeather = useMemo(() => {
    return (data?.daily_generation || []).map(day => {
      const wx = dailyWeatherMap.get(day.date)
      const desc = wx ? describeWmoWeather(wx.weather_code, true) : null
      return {
        ...day,
        solar_insolation_kwh_m2: wx?.solar_insolation_kwh_m2 ?? null,
        temp_max_c: wx?.temp_max_c ?? null,
        temp_min_c: wx?.temp_min_c ?? null,
        weather_label: desc?.label ?? null,
        weather_icon: desc?.icon ?? null,
      }
    })
  }, [data?.daily_generation, dailyWeatherMap])

  const optimizationTips = useMemo(
    () =>
      generateOptimizationTips({
        installation: selectedInstallation,
        dashboard: data,
        weather,
        mlReport,
      }),
    [selectedInstallation, data, weather, mlReport]
  )

  if (loading && !data) return <LoadingScreen />

  const m = data?.metrics
  const fmt = (n: number) => n?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? '0'
  const pct = (n: number) => ((n || 0) * 100).toFixed(0) + '%'

  const currentWx = weather?.current
  const currentDesc = currentWx ? describeWmoWeather(currentWx.weather_code, currentWx.is_day) : null
  const irradianceStatus = currentWx
    ? getSolarIrradianceStatus(currentWx.shortwave_radiation_w_m2, currentWx.is_day)
    : null
  const todayWx = weather?.daily?.[weather.daily.length - 1]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm">Overview of your solar installation performance</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
          {installations.length > 0 && (
            <Select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              options={installations.map(i => ({ value: i.id, label: `${i.name} (${i.spms_id})` }))}
              wrapperClassName="w-full sm:w-auto"
              className="w-full sm:w-64"
            />
          )}
          <Button variant="outline" onClick={handleRefreshAll} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="bg-solar-50 border border-solar-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center gap-2 text-solar-800 text-xs sm:text-sm">
          <Sun className="h-4 w-4 text-solar-600 flex-shrink-0 mt-0.5 sm:mt-0" />
          <span><strong>DEMO MODE</strong> — Simulated solar telemetry paired with live local weather & solar irradiance data.</span>
        </div>
        <Badge variant="info" className="self-start sm:self-center flex-shrink-0">{m?.data_source || 'simulated'}</Badge>
      </div>

      {/* Proactive ML Early-Warning Notification Banner */}
      {mlReport && mlReport.predictive_alerts.some(a => a.status === 'active') && (
        <div
          className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          role="status"
        >
          <div className="flex items-start gap-2.5 text-amber-950 text-sm min-w-0">
            <BrainCircuit className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold">
                ML Early Warning: Potential{' '}
                {mlReport.predictive_alerts
                  .filter(a => a.status === 'active')
                  .map(a => (a.component_target === 'inverter' ? 'Inverter Issue' : 'Panel Degradation'))
                  .join(' & ')}{' '}
                Detected
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {mlReport.predictive_alerts.find(a => a.status === 'active')?.message}
              </p>
            </div>
          </div>
          <Link to="/alerts" className="w-full sm:w-auto flex-shrink-0">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Inspect ML Diagnostics
            </Button>
          </Link>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex flex-wrap items-center gap-2" role="alert">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm flex-1 min-w-0">{error}</span>
          <Button variant="ghost" className="ml-auto" onClick={() => selectedId && loadDashboard(selectedId)}>Retry</Button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <MetricCard
          icon={Zap}
          label="Current Power"
          value={`${fmt(m?.current_power_w || 0)} W`}
          sublabel="Current generation rate"
          iconColor="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <MetricCard
          icon={Sun}
          label="Energy Today"
          value={`${fmt(m?.energy_today_kwh || 0)} kWh`}
          sublabel="Accumulated today"
          iconColor="text-solar-600"
          bgColor="bg-solar-50"
        />
        <MetricCard
          icon={Calendar}
          label="This Month"
          value={`${fmt(m?.energy_this_month_kwh || 0)} kWh`}
          sublabel="Total this calendar month"
          iconColor="text-deepblue-600"
          bgColor="bg-deepblue-50"
        />
        <MetricCard
          icon={Thermometer}
          label="Panel Temp"
          value={m?.panel_temperature_c != null ? `${m.panel_temperature_c.toFixed(1)}°C` : 'N/A'}
          sublabel="Operating temperature"
          iconColor="text-red-500"
          bgColor="bg-red-50"
        />
        <MetricCard
          icon={Sun}
          label="Performance"
          value={m ? pct(m.performance_ratio) : 'N/A'}
          sublabel="Ratio vs expected output"
          iconColor="text-purple-600"
          bgColor="bg-purple-50"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Active Alerts"
          value={m?.active_alerts || 0}
          sublabel="Issues needing attention"
          iconColor="text-orange-500"
          bgColor="bg-orange-50"
        />
      </div>

      {/* Daily Generation & Real-Time Local Weather / Solar Irradiance Side-by-Side */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle>Daily Generation (Last 7 Days)</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Paired with daily local solar insolation and weather conditions
              </p>
            </div>
            <Badge variant="info" className="flex-shrink-0">kWh</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-56 sm:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyWithWeather} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(1)} />
                  <YAxis
                    dataKey="date"
                    type="category"
                    tick={{ fontSize: 11 }}
                    tickFormatter={d =>
                      new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
                        weekday: 'short',
                        day: 'numeric',
                      })
                    }
                    width={72}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const row = payload[0].payload
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-2.5 text-xs space-y-1">
                          <p className="font-semibold text-gray-900">
                            {new Date(row.date + 'T12:00:00').toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-green-700">Actual: {Number(row.energy_kwh).toFixed(2)} kWh</p>
                          <p className="text-gray-600">Expected: {Number(row.expected_kwh).toFixed(2)} kWh</p>
                          {row.solar_insolation_kwh_m2 !== null && (
                            <div className="pt-1 mt-1 border-t border-gray-100 text-amber-700 space-y-0.5">
                              <p>Solar Insolation: {row.solar_insolation_kwh_m2.toFixed(2)} kWh/m²</p>
                              <p className="text-gray-600">
                                {row.weather_label} • {row.temp_min_c}°–{row.temp_max_c}°C
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="energy_kwh" name="Actual" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="expected_kwh" name="Expected" fill="#bbf7d0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-medium text-gray-500 mb-2">
                <span>Daily Generation vs Local Solar Insolation</span>
                <span className="text-[11px] text-gray-400">Green = actual • Light = expected</span>
              </div>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60">
                {dailyWithWeather.map(day => (
                  <div
                    key={day.date}
                    className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-[78px]">
                      {day.weather_icon ? (
                        <WeatherIcon kind={day.weather_icon} className="h-3.5 w-3.5 flex-shrink-0" />
                      ) : (
                        <Sun className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                      )}
                      <span className="font-medium text-gray-700">
                        {new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, {
                          weekday: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1 text-[11px] sm:text-xs text-gray-500 truncate">
                      {day.weather_label
                        ? `${day.weather_label} (${day.temp_min_c}°/${day.temp_max_c}°C)`
                        : 'No weather match'}
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-3 ml-auto flex-shrink-0">
                      <span className="text-amber-700 font-medium tabular-nums">
                        {day.solar_insolation_kwh_m2 !== null
                          ? `${day.solar_insolation_kwh_m2.toFixed(1)} kWh/m²`
                          : '—'}
                      </span>
                      <span className="font-semibold text-gray-900 tabular-nums text-right">
                        {day.energy_kwh.toFixed(1)} / {day.expected_kwh.toFixed(1)} kWh
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Local Solar Irradiance & Weather Card */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle>Local Solar Irradiance & Weather</CardTitle>
                {irradianceStatus && (
                  <Badge variant={irradianceStatus.variant}>{irradianceStatus.label}</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-solar-600 flex-shrink-0" />
                <span className="truncate">
                  {weather
                    ? `${weather.location_label} (${formatCoords(weather.latitude, weather.longitude)} • ${weather.timezone_abbreviation})`
                    : selectedInstallation
                    ? `${selectedInstallation.city} (${formatCoords(selectedInstallation.latitude, selectedInstallation.longitude)})`
                    : 'Loading location…'}
                </span>
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleGeolocation}
              disabled={geoLocating}
              className="gap-1.5 flex-shrink-0 self-start sm:self-auto"
              title={geoOverride ? 'Switch back to installation coordinates' : 'Use your browser GPS location'}
            >
              <LocateFixed className="h-3.5 w-3.5 text-deepblue-600" />
              {geoLocating ? 'Locating…' : geoOverride ? 'Use Site Coords' : 'Use My GPS'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {weatherError && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 flex items-center justify-between gap-2">
                <span>{weatherError}</span>
                <Button variant="ghost" size="sm" onClick={handleRefreshAll}>
                  Retry
                </Button>
              </div>
            )}

            {weatherLoading && !weather ? (
              <div className="h-64 flex items-center justify-center text-sm text-gray-500">
                Fetching real-time solar irradiance & weather…
              </div>
            ) : currentWx && currentDesc ? (
              <>
                {/* Current Weather & GHI Highlight */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-sky-50 to-white p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Current Conditions</p>
                      <p className="text-2xl font-bold text-gray-900 mt-0.5">
                        {currentWx.temperature_c}°C
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {currentDesc.label} • Feels {currentWx.apparent_temperature_c}°C
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-sky-100 flex items-center justify-center">
                      <WeatherIcon kind={currentDesc.icon} className="h-7 w-7" />
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-amber-800">Global Irradiance (GHI)</p>
                      <Sun className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">
                      {currentWx.shortwave_radiation_w_m2} <span className="text-sm font-medium text-gray-500">W/m²</span>
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Direct: {currentWx.direct_radiation_w_m2} • Diffuse: {currentWx.diffuse_radiation_w_m2} • DNI: {currentWx.direct_normal_irradiance_w_m2} W/m²
                    </p>
                  </div>
                </div>

                {/* Meteorological Factors */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Cloud className="h-3.5 w-3.5 text-gray-400" />
                      <span>Cloud Cover</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {currentWx.cloud_cover_pct}%
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Wind className="h-3.5 w-3.5 text-sky-500" />
                      <span>Wind Speed</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {currentWx.wind_speed_kmh} km/h
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      <span>Humidity</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                      {currentWx.relative_humidity_pct}%
                    </p>
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Sunrise className="h-3.5 w-3.5 text-amber-500" />
                      <span>Daylight / UV</span>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 mt-0.5 flex items-center gap-1">
                      <span>{todayWx ? `${formatClock(todayWx.sunrise)}–${formatClock(todayWx.sunset)}` : '—'}</span>
                    </p>
                    {todayWx && (
                      <p className="text-[10px] text-gray-500">Max UV {todayWx.uv_index_max}</p>
                    )}
                  </div>
                </div>

                {/* Today's Hourly Irradiance Curve */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-gray-500 mb-1.5">
                    <span className="font-medium text-gray-700">Today&apos;s Hourly Solar Irradiance (W/m²)</span>
                    {todayWx && (
                      <span className="text-[11px] flex items-center gap-1 text-amber-700 font-medium">
                        <Sunset className="h-3.5 w-3.5 flex-shrink-0" />
                        Daily Total: {todayWx.solar_insolation_kwh_m2.toFixed(2)} kWh/m²
                      </span>
                    )}
                  </div>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weather.today_hourly}>
                        <defs>
                          <linearGradient id="solarIrradianceFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="hour_label" tick={{ fontSize: 10 }} interval={3} />
                        <YAxis tick={{ fontSize: 10 }} width={36} />
                        <Tooltip
                          formatter={(val: number, name: string) =>
                            name === 'irradiance_w_m2'
                              ? [`${val} W/m²`, 'Solar Irradiance']
                              : [`${val}%`, 'Cloud Cover']
                          }
                          labelFormatter={label => `Local Time: ${label}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="irradiance_w_m2"
                          name="irradiance_w_m2"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          fill="url(#solarIrradianceFill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-1.5 text-[11px] text-gray-400">
                    Live meteorological & radiation feed via Open-Meteo • Observed {formatClock(currentWx.time)} local time
                  </p>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Weekly & Monthly Charts */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Weekly Generation Trend</CardTitle>
            <Badge variant="info">kWh</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.weekly_generation || []} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={d =>
                      new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    }
                  />
                  <YAxis tick={{ fontSize: 11 }} width={42} tickFormatter={v => `${v.toFixed(1)}`} />
                  <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} />
                  <Line type="monotone" dataKey="energy_kwh" name="Actual" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expected_kwh" name="Expected" stroke="#86efac" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-gray-500">Solid line = actual production, Dashed line = baseline expectation.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Monthly Generation</CardTitle>
            <Badge variant="info">kWh</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.monthly_generation || []} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(1)} />
                  <YAxis dataKey="month" type="category" width={64} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} kWh`, '']} />
                  <Bar dataKey="energy_kwh" name="Actual" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="expected_kwh" name="Expected" fill="#bbf7d0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Comparison & System Alerts */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader><CardTitle>Performance vs Expected Model</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-600">Actual Generated</span>
                <span className="font-semibold text-gray-900">{fmt(data?.comparison.actual_kwh || 0)} kWh</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-600">Model Expected</span>
                <span className="font-semibold text-gray-900">{fmt(data?.comparison.expected_kwh || 0)} kWh</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-gray-600">Variance</span>
                <span className={`font-semibold text-right ${(data?.comparison.difference_kwh || 0) >= 0 ? 'text-solar-600' : 'text-red-600'}`}>
                  {(data?.comparison.difference_kwh || 0) >= 0 ? '+' : ''}{fmt(data?.comparison.difference_kwh || 0)} kWh ({(data?.comparison.difference_percent || 0) >= 0 ? '+' : ''}{data?.comparison.difference_percent?.toFixed(1)}%)
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">Evaluation: </span>
                <Badge
                  variant={
                    data?.comparison.status === 'above_expected'
                      ? 'success'
                      : data?.comparison.status === 'below_expected'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {data?.comparison.status?.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Evaluates solar irradiance angle, ambient temperature derating, and rated inverter capacity.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Latest Alerts & ML Predictive Health */}
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle>System Alerts & ML Health</CardTitle>
              {mlReport && (
                <Badge variant={mlReport.overall_health_score >= 80 ? 'success' : 'warning'}>
                  {mlReport.overall_health_score}% Health
                </Badge>
              )}
            </div>
            <Link to="/alerts"><Button variant="ghost" size="sm">View All Alerts</Button></Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {mlReport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[11px] font-medium text-gray-500">Panel Array ML Health</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold text-gray-900">{mlReport.panel_health_score}%</span>
                    <Badge variant={mlReport.panel_risk === 'low' ? 'success' : 'warning'}>
                      {mlReport.panel_risk}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[11px] font-medium text-gray-500">Inverter ML Health</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold text-gray-900">{mlReport.inverter_health_score}%</span>
                    <Badge variant={mlReport.inverter_risk === 'low' ? 'success' : 'warning'}>
                      {mlReport.inverter_risk}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {data && data.alerts_summary && (data.alerts_summary.active > 0 || data.alerts_summary.warning > 0) ? (
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <span className="text-sm text-gray-600">Active status counts:</span>
                {['critical', 'warning', 'info'].map(
                  sev =>
                    (data.alerts_summary[sev] || 0) > 0 && (
                      <Badge key={sev} variant={sev as any}>
                        {sev.toUpperCase()}: {data.alerts_summary[sev]}
                      </Badge>
                    )
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No active alerts. ML anomaly detector reports normal operation.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Personalized Optimization Tips */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Optimization Tips</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Personalized recommendations combining live local weather and historical array performance
              </p>
            </div>
          </div>
          <Badge variant="info" className="self-start sm:self-center flex-shrink-0">{optimizationTips.length} tailored suggestions</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
            {optimizationTips.map(tip => (
              <div
                key={tip.id}
                className={`rounded-xl border p-3.5 sm:p-4 flex flex-col justify-between gap-3 ${
                  tip.priority === 'high'
                    ? 'border-amber-200 bg-amber-50/40'
                    : 'border-gray-200 bg-gray-50/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <TipCategoryIcon category={tip.category} />
                      <h4 className="text-sm font-semibold text-gray-900">{tip.title}</h4>
                    </div>
                    <Badge
                      className="flex-shrink-0"
                      variant={
                        tip.priority === 'high'
                          ? 'warning'
                          : tip.priority === 'medium'
                          ? 'info'
                          : 'success'
                      }
                    >
                      {tip.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{tip.description}</p>
                </div>

                <div className="pt-2.5 border-t border-gray-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-2 text-gray-500 min-w-0">
                    <span className="font-semibold text-solar-700 bg-solar-50 border border-solar-200 px-2 py-0.5 rounded">
                      {tip.estimated_impact}
                    </span>
                    <span>{tip.basis}</span>
                  </div>
                  {tip.action_to && tip.action_label && (
                    <Link
                      to={tip.action_to}
                      className="inline-flex items-center gap-1 font-medium text-deepblue-600 hover:text-deepblue-700"
                    >
                      {tip.action_label}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Calendar */}
      {selectedId && (
        <MaintenanceCalendar
          installationId={selectedId}
          events={maintenanceEvents}
          onScheduled={() => loadDashboard(selectedId)}
        />
      )}

      {/* Footer info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 border-t border-gray-200 pt-4 text-center sm:text-left">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Last updated: {m ? new Date(m.last_updated).toLocaleString() : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Mode: {m?.data_source || 'simulated'}</span>
        </div>
      </div>
    </div>
  )
}

function TipCategoryIcon({ category }: { category: OptimizationCategory }) {
  switch (category) {
    case 'load_shifting':
      return <Clock className="h-4 w-4 text-deepblue-600 flex-shrink-0 mt-0.5" />
    case 'cleaning':
      return <Droplets className="h-4 w-4 text-sky-600 flex-shrink-0 mt-0.5" />
    case 'thermal':
      return <Thermometer className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
    case 'inverter':
      return <Zap className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
    default:
      return <TrendingUp className="h-4 w-4 text-solar-600 flex-shrink-0 mt-0.5" />
  }
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  iconColor,
  bgColor,
}: {
  icon: any
  label: string
  value: string | number
  sublabel: string
  iconColor: string
  bgColor: string
}) {
  return (
    <Card>
      <CardContent className="p-3.5 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{label}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 break-words">{value}</p>
            <p className="text-[11px] text-gray-400 mt-1 truncate">{sublabel}</p>
          </div>
          <div className={`h-9 w-9 sm:h-12 sm:w-12 rounded-lg ${bgColor} flex items-center justify-center ${iconColor} flex-shrink-0`}>
            <Icon className="h-4 w-4 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

