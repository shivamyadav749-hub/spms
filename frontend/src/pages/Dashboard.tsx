import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Zap, Calendar, Thermometer, AlertTriangle, ChevronDown, RefreshCw, ExternalLink, Building2, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { Button, Card, CardHeader, CardTitle, CardContent, Badge, Select, LoadingScreen } from '../components/ui'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'

interface Installation { id: string; spms_id: string; name: string; capacity_kw: number }
interface DashboardData {
  metrics: {
    current_power_w: number
    energy_today_kwh: number
    energy_this_month_kwh: number
    panel_temperature_c: number | null
    performance_ratio: number
    active_alerts: number
    last_updated: string
    data_source: string
  }
  daily_generation: { date: string; energy_kwh: number; expected_kwh: number; performance_ratio: number }[]
  weekly_generation: { date: string; energy_kwh: number; expected_kwh: number; performance_ratio: number }[]
  monthly_generation: { month: string; energy_kwh: number; expected_kwh: number; performance_ratio: number }[]
  comparison: { period: string; actual_kwh: number; expected_kwh: number; difference_kwh: number; difference_percent: number; status: string }
  alerts_summary: Record<string, number>
}

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
      if (res.installations.length) setSelectedId(res.installations[0].id)
    } catch (e: any) { setError(e.message) }
  }

  async function loadDashboard(id: string) {
    setLoading(true); setError('')
    try {
      const res = await api.get<DashboardData>(`/api/v1/installations/${id}/dashboard`)
      setData(res)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  if (loading && !data) return <LoadingScreen />

  const m = data?.metrics
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 })
  const pct = (n: number) => (n * 100).toFixed(0) + '%'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Overview of your solar installation performance</p>
        </div>
        <div className="flex items-center gap-3">
          {installations.length > 1 && (
            <Select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              options={installations.map(i => ({ value: i.id, label: `${i.name} (${i.spms_id})` }))}
              className="w-64"
            />
          )}
          <Button variant="outline" onClick={() => selectedId && loadDashboard(selectedId)}><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
        </div>
      </div>

      {/* Demo banner */}
      <div className="bg-solar-50 border border-solar-200 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-solar-800 text-sm">
          <Sun className="h-4 w-4" />
          <span><strong>DEMO MODE</strong> — Simulated solar data. Not live hardware measurements.</span>
        </div>
        <Badge variant="info">{m?.data_source || 'simulated'}</Badge>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-center gap-2" role="alert">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" className="ml-auto" onClick={() => selectedId && loadDashboard(selectedId)}>Retry</Button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard icon={Zap} label="Current Power" value={`${fmt(m?.current_power_w || 0)} W`} sublabel="Electricity currently being produced" iconColor="text-yellow-500" bgColor="bg-yellow-50" />
        <MetricCard icon={Sun} label="Energy Today" value={`${fmt(m?.energy_today_kwh || 0)} kWh`} sublabel="Electricity generated today" iconColor="text-solar-600" bgColor="bg-solar-50" />
        <MetricCard icon={Calendar} label="Energy This Month" value={`${fmt(m?.energy_this_month_kwh || 0)} kWh`} sublabel="Electricity generated this month" iconColor="text-deepblue-600" bgColor="bg-deepblue-50" />
        <MetricCard icon={Thermometer} label="Panel Temperature" value={m?.panel_temperature_c != null ? `${m.panel_temperature_c.toFixed(1)}°C` : 'N/A'} sublabel="Solar panel temperature" iconColor="text-red-500" bgColor="bg-red-50" />
        <MetricCard icon={Sun} label="Performance" value={m ? pct(m.performance_ratio) : 'N/A'} sublabel="How your system is performing vs expected" iconColor="text-purple-600" bgColor="bg-purple-50" />
        <MetricCard icon={AlertTriangle} label="Active Alerts" value={m?.active_alerts || 0} sublabel="Issues needing attention" iconColor="text-orange-500" bgColor="bg-orange-50" />
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Weekly Generation</CardTitle>
            <Badge variant="info">kWh</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.weekly_generation || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                  <YAxis tickFormatter={v => `${v.toFixed(1)}`} />
                  <Tooltip labelFormatter={d => new Date(d).toLocaleDateString()} />
                  <Line type="monotone" dataKey="energy_kwh" name="Actual" stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expected_kwh" name="Expected" stroke="#86efac" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm text-gray-600">Solid = actual, Dashed = expected.</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly & Performance */}
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
          <CardHeader><CardTitle>Performance vs Expected</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Actual</span>
                <span className="font-medium">{fmt(data?.comparison.actual_kwh || 0)} kWh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Expected</span>
                <span className="font-medium">{fmt(data?.comparison.expected_kwh || 0)} kWh</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Difference</span>
                <span className={`font-medium ${(data?.comparison.difference_kwh || 0) >= 0 ? 'text-solar-600' : 'text-red-600'}`}>
                  {(data?.comparison.difference_kwh || 0) >= 0 ? '+' : ''}{fmt(data?.comparison.difference_kwh || 0)} kWh ({(data?.comparison.difference_percent || 0) >= 0 ? '+' : ''}{data?.comparison.difference_percent?.toFixed(1)}%)
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-500">Status: </span>
                <Badge variant={data?.comparison.status === 'above_expected' ? 'success' : data?.comparison.status === 'below_expected' ? 'warning' : 'info'}>
                  {data?.comparison.status?.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">Shows {data?.comparison.period || 'last 7 days'} comparison.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Latest Alerts</CardTitle>
          <Link to="/alerts"><Button variant="ghost" size="sm">View all</Button></Link>
        </CardHeader>
        <CardContent>
          {data && data.alerts_summary && Object.keys(data.alerts_summary).length ? (
            <div className="flex flex-wrap gap-2">
              {['critical','warning','info'].map(sev => data.alerts_summary[sev] > 0 && (
                <Badge key={sev} variant={sev as any}>{sev}: {data.alerts_summary[sev]}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No active alerts. Your system is running smoothly.</p>
          )}
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500 border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          <span>Last updated: {m ? new Date(m.last_updated).toLocaleString() : '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>Data source: {m?.data_source || 'simulated'}</span>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, sublabel, iconColor, bgColor }: any) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
          </div>
          <div className={`h-12 w-12 rounded-lg ${bgColor} flex items-center justify-center ${iconColor}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}