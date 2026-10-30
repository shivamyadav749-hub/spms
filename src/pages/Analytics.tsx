import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Select } from '../components/ui'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../lib/api'
import { DashboardData, Installation } from '../types'

function fmt(n: number): string {
  return n?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? '0'
}

function pct(n: number): string {
  return ((n || 0) * 100).toFixed(0) + '%'
}

export function Analytics() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<string>('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInstallations()
  }, [])

  async function fetchInstallations() {
    try {
      const res = await api.get<{ installations: Installation[] }>('/api/v1/installations')
      setInstallations(res.installations)
      if (res.installations.length) {
        setSelectedInstallation(res.installations[0].id)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch installations')
    }
  }

  useEffect(() => {
    if (selectedInstallation) {
      loadPerformance(selectedInstallation)
    }
  }, [selectedInstallation])

  async function loadPerformance(id: string) {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<DashboardData>(`/api/v1/installations/${id}/performance`)
      setData(res)
    } catch (e: any) {
      setError(e.message || 'Failed to load performance analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) return <div className="p-8 text-center text-gray-500">Loading analytics…</div>

  const m = data?.metrics
  const daily = data?.daily_generation || []
  const weekly = data?.weekly_generation || []
  const comparison = data?.comparison || {
    period: 'last 7 days',
    actual_kwh: 0,
    expected_kwh: 0,
    difference_kwh: 0,
    difference_percent: 0,
    status: 'unknown',
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Performance</h1>
          <p className="text-gray-600 text-sm">Historical performance models, comparisons, and solar telemetry</p>
        </div>
        {installations.length > 0 && (
          <Select
            value={selectedInstallation}
            onChange={e => setSelectedInstallation(e.target.value)}
            className="w-64"
            options={installations.map(inst => ({ value: inst.id, label: `${inst.name} (${inst.spms_id})` }))}
          />
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Top 3 Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today's Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Current Power:</span>
                <span className="font-semibold text-gray-900">{fmt(m?.current_power_w || 0)} W</span>
              </div>
              <div className="flex justify-between">
                <span>Energy Today:</span>
                <span className="font-semibold text-gray-900">{fmt(m?.energy_today_kwh || 0)} kWh</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
              Last interval: {m ? new Date(m.last_updated).toLocaleTimeString() : '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Total Month Output:</span>
                <span className="font-semibold text-gray-900">{fmt(m?.energy_this_month_kwh || 0)} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Performance Ratio:</span>
                <span className="font-semibold text-gray-900">{pct(m?.performance_ratio || 0)}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              Panel Temp: {m?.panel_temperature_c !== null ? `${m?.panel_temperature_c?.toFixed(1)}°C` : 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Data Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <Badge variant={m?.data_source === 'simulated' ? 'info' : 'success'}>
                {m?.data_source === 'simulated' ? 'Simulated Model Data' : 'Live Inverter Hardware'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500">
              Calculates incidence angle, solar zenith, cloud dampening, and cell heat derating.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader><CardTitle>Daily Energy Generation Trends</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" tickFormatter={v => v.toFixed(1)} />
                <YAxis
                  dataKey="date"
                  type="category"
                  tickFormatter={d =>
                    new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
                  }
                  width={110}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(2)} kWh`, '']}
                  labelFormatter={d => new Date(d).toLocaleDateString()}
                />
                <Bar dataKey="energy_kwh" name="Actual Production" fill="#22c55e" radius={[0, 4, 4, 0]} />
                <Bar dataKey="expected_kwh" name="Expected Optimum" fill="#bbf7d0" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs text-gray-500">Green = actual production, Light green = theoretical expected.</p>
        </CardContent>
      </Card>

      {/* Weekly Trend and Comparison */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Weekly Generation Curve</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tickFormatter={v => `${v.toFixed(1)}`} />
                  <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} />
                  <Line type="monotone" dataKey="energy_kwh" name="Actual" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expected_kwh" name="Expected" stroke="#86efac" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-gray-500">Solid = actual, Dashed = target model expectation.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expected vs Actual Variance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Actual Total</span>
                <span className="font-semibold text-gray-900">{fmt(comparison.actual_kwh)} kWh</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Expected Total</span>
                <span className="font-semibold text-gray-900">{fmt(comparison.expected_kwh)} kWh</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Difference</span>
                <span className={`font-semibold ${comparison.difference_kwh >= 0 ? 'text-solar-600' : 'text-red-600'}`}>
                  {comparison.difference_kwh >= 0 ? '+' : ''}{fmt(comparison.difference_kwh)} kWh ({comparison.difference_percent >= 0 ? '+' : ''}{comparison.difference_percent?.toFixed(1)}%)
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-500">Performance Status: </span>
                <Badge
                  variant={
                    comparison.status === 'above_expected'
                      ? 'success'
                      : comparison.status === 'below_expected'
                      ? 'warning'
                      : 'info'
                  }
                >
                  {comparison.status?.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                Period evaluated: {comparison.period}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
