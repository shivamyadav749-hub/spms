import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Select } from '../components/ui'
import { AlertTriangle, CheckCircle, XCircle, Filter } from 'lucide-react'
import { api } from '../lib/api'
import { Alert, Installation } from '../types'

export function Alerts() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<string>('')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('')
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
    } finally {
      setLoading(false)
    }
  }

  async function loadAlerts(id: string) {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<{ alerts: Alert[]; total: number; active_count: number }>(
        `/api/v1/installations/${id}/alerts`
      )
      setAlerts(res.alerts)
    } catch (e: any) {
      setError(e.message || 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedInstallation) {
      loadAlerts(selectedInstallation)
    }
  }, [selectedInstallation])

  async function updateAlert(alertId: string, status: Alert['status']) {
    try {
      const updated = await api.patch<Alert>(`/api/v1/installations/alerts/${alertId}`, { status })
      setAlerts(prev => prev.map(a => (a.id === alertId ? updated : a)))
    } catch (e: any) {
      setError(e.message || 'Failed to update alert status')
    }
  }

  const visibleAlerts = alerts.filter(a => !statusFilter || a.status === statusFilter)

  if (loading && installations.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading alerts…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts & Notifications</h1>
          <p className="text-gray-600 text-sm">Monitor anomalies, temperature warnings, and system health</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {installations.length > 0 && (
            <Select
              value={selectedInstallation}
              onChange={e => setSelectedInstallation(e.target.value)}
              className="w-56"
              options={installations.map(inst => ({ value: inst.id, label: `${inst.name} (${inst.spms_id})` }))}
            />
          )}
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-40"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'acknowledged', label: 'Acknowledged' },
              { value: 'resolved', label: 'Resolved' },
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          title="Active Alerts"
          count={alerts.filter(a => a.status === 'active').length}
          icon={AlertTriangle}
          color="text-orange-500"
          bg="bg-orange-50"
        />
        <StatCard
          title="Acknowledged"
          count={alerts.filter(a => a.status === 'acknowledged').length}
          icon={CheckCircle}
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <StatCard
          title="Resolved"
          count={alerts.filter(a => a.status === 'resolved').length}
          icon={XCircle}
          color="text-green-500"
          bg="bg-green-50"
        />
      </div>

      {/* Alert List */}
      <Card>
        <CardHeader><CardTitle>Alert List</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleAlerts.length === 0 && (
              <p className="text-gray-500 text-center py-6 text-sm">
                No alerts match the current filter.
              </p>
            )}
            {visibleAlerts.map(alert => (
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
        <div className={`h-12 w-12 rounded-lg ${bg} flex items-center justify-center ${color} flex-shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{count}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function AlertRow({
  alert,
  onStatusChange,
}: {
  alert: Alert
  onStatusChange: (alertId: string, status: Alert['status']) => Promise<void>
}) {
  const { id, severity, title, message, created_at, status } = alert
  const severityClass =
    severity === 'critical'
      ? 'bg-red-100 text-red-600'
      : severity === 'warning'
      ? 'bg-yellow-100 text-yellow-600'
      : 'bg-blue-100 text-blue-600'

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${severityClass} flex-shrink-0 mt-0.5`}>
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
            <Badge variant={severity}>{severity}</Badge>
            <span className="text-xs text-gray-400 font-mono">({status})</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">{message}</p>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Logged: {new Date(created_at).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex gap-2 self-end sm:self-center">
        {status === 'active' && (
          <Button variant="outline" size="sm" onClick={() => onStatusChange(id, 'acknowledged')}>
            Acknowledge
          </Button>
        )}
        {status !== 'resolved' && (
          <Button variant="primary" size="sm" onClick={() => onStatusChange(id, 'resolved')}>
            Resolve
          </Button>
        )}
        {status === 'resolved' && (
          <Badge variant="success">Resolved</Badge>
        )}
      </div>
    </div>
  )
}
