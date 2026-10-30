import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sun,
  Zap,
  Calendar,
  Thermometer,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Building2,
} from 'lucide-react'
import { api } from '../lib/api'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Select, LoadingScreen } from '../components/ui'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { DashboardData, Installation } from '../types'

export function Dashboard() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInstallations()
  }, [])

  useEffect(() => {
    if (selectedId) loadDashboard(selectedId)
  }, [selectedId])

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
      const res = await api.get<DashboardData>(`/api/v1/installations/${id}/dashboard`)
      setData(res)
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !data) return <LoadingScreen />

  const m = data?.metrics
  const fmt = (n: number) => n?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? '0'
  const pct = (n: number) => ((n || 0) * 100).toFixed(0) + '%'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 text-sm">Overview of your solar installation performance</p>
        </div>
        <div className="flex items-center gap-3">
          {installations.length > 0 && (
            <Select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              options={installations.map(i => ({ value: i.id, label: `${i.name} (${i.spms_id})` }))}
              className="w-64"
            />
          )}
          <Button variant="outline" onClick={() => selectedId && loadDashboard(selectedId)}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="bg-solar-50 border border-solar-200 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-solar-800 text-sm">
          <Sun className="h-4 w-4 text-solar-600 flex-shrink-0" />
          <span><strong>DEMO MODE</strong> — Real-time simulated solar telemetry based on solar position algorithms.</span>
        </div>
        <Badge variant="info">{m?.data_source || 'simulated'}</Badge>
      </div>

      {/* Error notification */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2" role="alert">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" className="ml-auto" onClick={() => selectedId && loadDashboard(selectedId)}>Retry</Button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Daily Generation (Last 7 Days)</CardTitle>
            <Badge variant="info">kWh</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.daily_generation || []} layout="vertical">
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
                  <Bar dataKey="energy_kwh" name="Actual" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="expected_kwh" name="Expected" fill="#bbf7d0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-gray-500">Green = actual generation, Light green = expected model generation.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Generation Trend</CardTitle>
            <Badge variant="info">kWh</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.weekly_generation || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={d =>
                      new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    }
                  />
                  <YAxis tickFormatter={v => `${v.toFixed(1)}`} />
                  <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} />
                  <Line type="monotone" dataKey="energy_kwh" name="Actual" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expected_kwh" name="Expected" stroke="#86efac" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-gray-500">Solid line = actual production, Dashed line = baseline expectation.</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly & Performance Comparison */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Monthly Generation</CardTitle>
            <Badge variant="info">kWh</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.monthly_generation || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis type="number" tickFormatter={v => v.toFixed(1)} />
                  <YAxis dataKey="month" type="category" width={80} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} kWh`, '']} />
                  <Bar dataKey="energy_kwh" name="Actual" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="expected_kwh" name="Expected" fill="#bbf7d0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Performance vs Expected Model</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Actual Generated</span>
                <span className="font-semibold text-gray-900">{fmt(data?.comparison.actual_kwh || 0)} kWh</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Model Expected</span>
                <span className="font-semibold text-gray-900">{fmt(data?.comparison.expected_kwh || 0)} kWh</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Variance</span>
                <span className={`font-semibold ${(data?.comparison.difference_kwh || 0) >= 0 ? 'text-solar-600' : 'text-red-600'}`}>
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
      </div>

      {/* Latest Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>System Alerts</CardTitle>
          <Link to="/alerts"><Button variant="ghost" size="sm">View All Alerts</Button></Link>
        </CardHeader>
        <CardContent>
          {data && data.alerts_summary && (data.alerts_summary.active > 0 || data.alerts_summary.warning > 0) ? (
            <div className="flex flex-wrap items-center gap-3">
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
            <p className="text-sm text-gray-500">No active alerts. Your installation is operating inside normal bounds.</p>
          )}
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Last updated: {m ? new Date(m.last_updated).toLocaleString() : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5" />
          <span>Mode: {m?.data_source || 'simulated'}</span>
        </div>
      </div>
    </div>
  )
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
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-[11px] text-gray-400 mt-1 truncate">{sublabel}</p>
          </div>
          <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg ${bgColor} flex items-center justify-center ${iconColor} flex-shrink-0`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
