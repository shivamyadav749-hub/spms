import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Select } from '../components/ui'
import { AlertTriangle, CheckCircle, XCircle, Filter } from 'lucide-react'
import { api } from '../lib/api'

interface Alert {
  id: string
  category: string
  severity: 'info' | 'warning' | 'critical'
  title: string
  message: string
  status: 'active' | 'acknowledged' | 'resolved'
  created_at: string
  acknowledged_at: string | null
  resolved_at: string | null
}

interface AlertsPageData {
  installations: {id: string; name: string; spms_id: string}[]
  selectedInstallation: string
  alerts: Alert[]
  loading: boolean
  error: string
}

export function Alerts() {
  const [data, setData] = useState<AlertsPageData>({
    installations: [],
    selectedInstallation: '',
    alerts: [],
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

  async function loadAlerts(id: string) {
    setData(d => ({ ...d, loading: true, error: '' }))
    try {
      const res = await api.get<{ alerts: Alert[]; total: number; active_count: number }>(`/api/v1/installations/${id}/alerts`)
      setData(d => ({ ...d, alerts: res.alerts, loading: false }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message, loading: false }))
    }
  }

  async function updateAlert(alertId: string, status: Alert['status']) {
    try {
      const updated = await api.patch<Alert>(`/api/v1/installations/alerts/${alertId}`, { status })
      setData(d => ({ ...d, alerts: d.alerts.map(alert => alert.id === alertId ? updated : alert) }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message }))
    }
  }

  useEffect(() => {
    if (data.installations.length > 0) {
      loadAlerts(data.selectedInstallation)
    }
  }, [data.selectedInstallation, data.installations])

  if (data.loading && data.installations.length === 0) return <div className="p-8 text-center text-gray-500">Loading installations…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h1>
          <p className="text-gray-600">Monitor and manage system alerts</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={data.selectedInstallation}
            onChange={e => setData(d => ({ ...d, selectedInstallation: e.target.value }))}
            className="w-64"
            options={data.installations.length
              ? data.installations.map(inst => ({ value: inst.id, label: `${inst.name} (${inst.spms_id})` }))
              : [{ value: '', label: 'No installations' }]}
          />
          <Button variant="outline"><Filter className="h-4 w-4 mr-1" /> Filter</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard title="Active" count={data.alerts.filter(a => a.status === 'active').length} icon={AlertTriangle} color="text-orange-500" bg="bg-orange-50" />
        <StatCard title="Acknowledged" count={data.alerts.filter(a => a.status === 'acknowledged').length} icon={CheckCircle} color="text-blue-500" bg="bg-blue-50" />
        <StatCard title="Resolved" count={data.alerts.filter(a => a.status === 'resolved').length} icon={XCircle} color="text-green-500" bg="bg-green-50" />
      </div>

      <Card>
        <CardHeader><CardTitle>Alert List</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.alerts.length === 0 && (
              <p className="text-gray-500 text-center">No alerts. Your system is running smoothly.</p>
            )}
            {data.alerts.map(alert => (
              <AlertRow key={alert.id} alert={alert} onStatusChange={updateAlert} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ title, count, icon: Icon, color, bg }: any) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`h-12 w-12 rounded-lg ${bg} flex items-center justify-center ${color}`}><Icon className="h-6 w-6" /></div>
        <div><p className="text-sm text-gray-500">{title}</p><p className="text-2xl font-bold text-gray-900">{count}</p></div>
      </CardContent>
    </Card>
  )
}

function AlertRow({ alert, onStatusChange }: { alert: Alert; onStatusChange: (alertId: string, status: Alert['status']) => Promise<void> }) {
  const { id, severity, title, message, created_at, status } = alert
  const severityClass = severity === 'critical' ? 'bg-red-100 text-red-600' : severity === 'warning' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${severityClass}`}>
        <AlertTriangle className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <Badge variant={severity as any}>{severity}</Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">{message}</p>
        <p className="text-xs text-gray-400 mt-1">{created_at}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onStatusChange(id, 'acknowledged')} disabled={status !== 'active'}>Acknowledge</Button>
        <Button variant="ghost" size="sm" onClick={() => onStatusChange(id, 'resolved')} disabled={status === 'resolved'}>Resolve</Button>
      </div>
    </div>
  )
}