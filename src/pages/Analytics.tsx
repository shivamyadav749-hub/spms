import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Select, Button } from '../components/ui'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { FileSpreadsheet, FileText, Check } from 'lucide-react'
import { api } from '../lib/api'
import { exportPerformanceCSV, exportPerformancePDF } from '../lib/exportReport'
import { DashboardData, GenerationVsConsumptionReport, Installation } from '../types'

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
  const [energyBalance, setEnergyBalance] = useState<GenerationVsConsumptionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)
  const [exportNotice, setExportNotice] = useState('')

  useEffect(() => {
    fetchInstallations()
  }, [])

  useEffect(() => {
    if (!exportNotice) return
    const timer = window.setTimeout(() => setExportNotice(''), 4000)
    return () => window.clearTimeout(timer)
  }, [exportNotice])

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
      const [res, balanceRes] = await Promise.all([
        api.get<DashboardData>(`/api/v1/installations/${id}/performance`),
        api.get<GenerationVsConsumptionReport>(`/api/v1/installations/${id}/energy-balance?days=30`),
      ])
      setData(res)
      setEnergyBalance(balanceRes)
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

  const currentInstallation = installations.find(inst => inst.id === selectedInstallation)

  function handleExportCSV() {
    if (!data) return
    setExporting('csv')
    setError('')
    try {
      const filename = exportPerformanceCSV(data, currentInstallation)
      setExportNotice(`Exported ${filename}`)
    } catch (e: any) {
      setError(e?.message || 'Failed to export CSV report')
    } finally {
      setExporting(null)
    }
  }

  function handleExportPDF() {
    if (!data) return
    setExporting('pdf')
    setError('')
    try {
      const filename = exportPerformancePDF(data, currentInstallation)
      setExportNotice(`Exported ${filename}`)
    } catch (e: any) {
      setError(e?.message || 'Failed to export PDF report')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics & Performance</h1>
          <p className="text-gray-600 text-sm">Historical performance models, comparisons, and solar telemetry</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5 w-full lg:w-auto">
          {installations.length > 0 && (
            <Select
              value={selectedInstallation}
              onChange={e => setSelectedInstallation(e.target.value)}
              wrapperClassName="w-full sm:w-auto"
              className="w-full sm:w-64"
              options={installations.map(inst => ({ value: inst.id, label: `${inst.name} (${inst.spms_id})` }))}
            />
          )}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleExportCSV}
              disabled={!data || loading || exporting !== null}
              title="Download performance data as CSV"
              className="gap-1.5 w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4 text-solar-600 flex-shrink-0" />
              {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleExportPDF}
              disabled={!data || loading || exporting !== null}
              title="Download formatted performance report as PDF"
              className="gap-1.5 w-full sm:w-auto"
            >
              <FileText className="h-4 w-4 flex-shrink-0" />
              {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      {exportNotice && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-green-800 text-sm">
          <Check className="h-4 w-4 text-green-600 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

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

      {/* 30-Day Generated Energy vs Home Consumption Line Chart */}
      {energyBalance && (
        <Card>
          <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <CardTitle>Generated Energy vs. Home Consumption (Last 30 Days)</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Daily solar production compared against actual household electricity demand
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="success">
                Generated: {fmt(energyBalance.total_generated_kwh)} kWh
              </Badge>
              <Badge variant="info">
                Consumed: {fmt(energyBalance.total_consumed_kwh)} kWh
              </Badge>
              <Badge variant={energyBalance.net_balance_kwh >= 0 ? 'success' : 'warning'}>
                Net: {energyBalance.net_balance_kwh >= 0 ? '+' : ''}
                {fmt(energyBalance.net_balance_kwh)} kWh ({energyBalance.self_sufficiency_pct}% Solar Offset)
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={energyBalance.daily_series} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    interval={5}
                    tickFormatter={d =>
                      new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} width={46} unit=" kWh" />
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
                          <p className="text-green-700 font-medium">
                            Generated Energy: {Number(row.generated_kwh).toFixed(2)} kWh
                          </p>
                          <p className="text-blue-700 font-medium">
                            Home Consumption: {Number(row.consumed_kwh).toFixed(2)} kWh
                          </p>
                          <p
                            className={`pt-1 border-t border-gray-100 font-semibold ${
                              row.net_kwh >= 0 ? 'text-solar-700' : 'text-amber-700'
                            }`}
                          >
                            Net Balance: {row.net_kwh >= 0 ? '+' : ''}
                            {Number(row.net_kwh).toFixed(2)} kWh (
                            {row.net_kwh >= 0 ? 'Surplus' : 'Grid Draw'})
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="generated_kwh"
                    name="Generated Energy (kWh)"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="consumed_kwh"
                    name="Home Consumption (kWh)"
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Green = solar energy generated, Blue = household energy consumed over the rolling 30-day window.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bar Chart */}
      <Card>
        <CardHeader><CardTitle>Daily Energy Generation Trends</CardTitle></CardHeader>
        <CardContent>
          <div className="h-60 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daily} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(1)} />
                <YAxis
                  dataKey="date"
                  type="category"
                  tick={{ fontSize: 11 }}
                  tickFormatter={d =>
                    new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
                  }
                  width={72}
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
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader><CardTitle>Weekly Generation Curve</CardTitle></CardHeader>
          <CardContent>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weekly} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <YAxis tick={{ fontSize: 11 }} width={42} tickFormatter={v => `${v.toFixed(1)}`} />
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
