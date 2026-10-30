import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Sun, Zap, Calendar, Thermometer, Clock } from 'lucide-react'
import { api } from '../lib/api'

interface PerformanceMetrics {
  current_power_w: number
  energy_today_kwh: number
  energy_this_month_kwh: number
  panel_temperature_c: number | null
  performance_ratio: number
  last_updated: string
  data_source: string
}

interface DailyGeneration {
  date: string
  energy_kwh: number
  expected_kwh: number
  performance_ratio: number
}

interface PerformanceData {
  metrics: PerformanceMetrics
  daily_generation: DailyGeneration[]
  weekly_generation: DailyGeneration[]
  monthly_generation: { month: string; energy_kwh: number; expected_kwh: number; performance_ratio: number }[]
  comparison: { period: string; actual_kwh: number; expected_kwh: number; difference_kwh: number; difference_percent: number; status: string }
}

interface AnalyticsPageData {
  installations: {id: string; name: string; spms_id: string}[]
  selectedInstallation: string
  data: PerformanceData | null
  loading: boolean
  error: string
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function pct(n: number): string {
  return (n * 100).toFixed(0) + '%'
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsPageData>({
    installations: [],
    selectedInstallation: '',
    data: null,
    loading: true,
    error: ''
  })

  useEffect(() => {
    fetchInstallations()
  }, [])

  async function fetchInstallations() {
    try {
      const res = await api.get<{installations: {id: string; name: string; spms_id: string}[]}>('/api/v1/installations')
      setData(d => ({ ...d, installations: res.installations, loading: false }))
      if (res.installations.length) setData(d => ({ ...d, selectedInstallation: res.installations[0].id }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message, loading: false }))
    }
  }

  useEffect(() => {
    if (data.installations.length > 0) {
      loadPerformance()
    }
  }, [data.selectedInstallation, data.installations])

  async function loadPerformance() {
    setData(d => ({ ...d, loading: true, error: '' }))
    try {
      const res = await api.get<PerformanceData>(`/api/v1/installations/${data.selectedInstallation}/performance`)
      setData(d => ({ ...d, data: res, loading: false }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message, loading: false }))
    }
  }

  if (data.loading && data.installations.length === 0) return <div className="p-8 text-center text-gray-500">Loading installations…</div>

  if (!data.data) return <div className="p-8 text-center text-gray-500">Loading performance data…</div>

  const m = data.data.metrics
  const daily = data.data.daily_generation || []
  const weekly = data.data.weekly_generation || []
  const monthly = data.data.monthly_generation || []
  const comparison = data.data.comparison || { period: 'last 7 days', actual_kwh: 0, expected_kwh: 0, difference_kwh: 0, difference_percent: 0, status: 'unknown' }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Historical performance analysis and reports</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>Current Power</div><div className="font-medium text-gray-900">{fmt(m.current_power_w || 0)} W</div>
              <div>Energy Today</div><div className="font-medium text-gray-900">{fmt(m.energy_today_kwh || 0)} kWh</div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">Last updated: {new Date(m.last_updated).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>Energy This Month</div><div className="font-medium text-gray-900">{fmt(m.energy_this_month_kwh || 0)} kWh</div>
              <div>Performance Ratio</div><div className="font-medium text-gray-900">{pct(m.performance_ratio)}</div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">Panel Temp: {m.panel_temperature_c !== null ? m.panel_temperature_c.toFixed(1) + '°C' : 'N/A'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={m.data_source === 'simulated' ? 'info' : 'success'}>
              {m.data_source === 'simulated' ? 'Demo Mode' : 'Live Data'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Energy Generation Trends</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" tickFormatter={v => v.toFixed(1)} />
                <YAxis dataKey="date" type="category" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} width={120} />
                <Tooltip formatter={(v: number) => [`${v.toFixed(2)} kWh`, '']} labelFormatter={d => new Date(d).toLocaleDateString()} />
                <Bar dataKey="energy_kwh" name="Actual" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="expected_kwh" name="Expected" fill="#bbf7d0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm text-gray-600">Green = actual generation, Light green = expected. 1 unit = 1 kWh.</p>
        </CardContent>
        </Card>

      <Card>
        <CardHeader><CardTitle>Weekly & Monthly Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Weekly Generation</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weekly}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                    <YAxis tickFormatter={v => `${v.toFixed(1)}`} />
                    <Line type="monotone" dataKey="energy_kwh" name="Actual" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expected_kwh" name="Expected" stroke="#86efac" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
                <p className="mt-3 text-sm text-gray-600">Solid = actual, Dashed = expected.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Performance vs Expected</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Actual</span>
                    <span className="font-medium">{fmt(comparison.actual_kwh || 0)} kWh</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Expected</span>
                    <span className="font-medium">{fmt(comparison.expected_kwh || 0)} kWh</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Difference</span>
                    <span className={`font-medium ${(comparison.difference_kwh || 0) >= 0 ? 'text-solar-600' : 'text-red-600'}`}>
                      {(comparison.difference_kwh || 0) >= 0 ? '+' : ''}{fmt(comparison.difference_kwh || 0)} kWh ({(comparison.difference_percent || 0) >= 0 ? '+' : ''}{comparison.difference_percent?.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-500">Status: </span>
                    <Badge variant={comparison.status === 'above_expected' ? 'success' : comparison.status === 'below_expected' ? 'warning' : 'info'}>
                      {comparison.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">Shows {comparison.period || 'last 7 days'} comparison.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}