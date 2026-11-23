import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Select } from '../components/ui'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  BrainCircuit,
  Activity,
  Cpu,
  Sun,
  Wrench,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../lib/api'
import { Alert, Installation, MLPredictiveReport, RiskLevel } from '../types'

function riskBadgeVariant(risk: RiskLevel): 'success' | 'info' | 'warning' | 'critical' {
  switch (risk) {
    case 'high':
      return 'critical'
    case 'elevated':
      return 'warning'
    case 'moderate':
      return 'info'
    default:
      return 'success'
  }
}

export function Alerts() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<string>('')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [mlReport, setMlReport] = useState<MLPredictiveReport | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sourceFilter, setSourceFilter] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanNotice, setScanNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchInstallations()
  }, [])

  useEffect(() => {
    if (!scanNotice) return
    const timer = window.setTimeout(() => setScanNotice(''), 5000)
    return () => window.clearTimeout(timer)
  }, [scanNotice])

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

  async function loadAlertsAndML(id: string) {
    setLoading(true)
    setError('')
    try {
      const mlRes = await api.get<MLPredictiveReport>(`/api/v1/installations/${id}/ml-diagnostics`)
      setMlReport(mlRes)
      const alertsRes = await api.get<{ alerts: Alert[]; total: number; active_count: number }>(
        `/api/v1/installations/${id}/alerts`
      )
      setAlerts(alertsRes.alerts)
    } catch (e: any) {
      setError(e.message || 'Failed to load alerts & ML diagnostics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedInstallation) {
      loadAlertsAndML(selectedInstallation)
    }
  }, [selectedInstallation])

  async function runMLScan(scenario?: 'panel_degradation' | 'inverter_issue' | 'reset') {
    if (!selectedInstallation) return
    setScanning(true)
    setError('')
    try {
      const mlRes = await api.post<MLPredictiveReport>(
        `/api/v1/installations/${selectedInstallation}/ml-diagnostics/scan`,
        scenario ? { scenario } : {}
      )
      setMlReport(mlRes)
      const alertsRes = await api.get<{ alerts: Alert[]; total: number; active_count: number }>(
        `/api/v1/installations/${selectedInstallation}/alerts`
      )
      setAlerts(alertsRes.alerts)

      if (scenario === 'reset') {
        setScanNotice('Telemetry reset to healthy baseline and re-evaluated by ML anomaly model.')
      } else if (mlRes.newly_triggered_alerts.length > 0) {
        setScanNotice(
          `ML scan raised ${mlRes.newly_triggered_alerts.length} early-warning predictive alert(s) before critical failure.`
        )
      } else {
        setScanNotice('ML telemetry scan completed — health scores and feature vectors updated.')
      }
    } catch (e: any) {
      setError(e.message || 'Failed to run ML diagnostic scan')
    } finally {
      setScanning(false)
    }
  }

  async function updateAlert(alertId: string, status: Alert['status']) {
    try {
      const updated = await api.patch<Alert>(`/api/v1/installations/alerts/${alertId}`, { status })
      setAlerts(prev => prev.map(a => (a.id === alertId ? updated : a)))
    } catch (e: any) {
      setError(e.message || 'Failed to update alert status')
    }
  }

  const visibleAlerts = alerts.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false
    if (sourceFilter === 'ml_predictive' && a.source !== 'ml_predictive') return false
    if (sourceFilter === 'system' && a.source === 'ml_predictive') return false
    return true
  })

  if (loading && installations.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading alerts…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alerts & ML Predictive Diagnostics</h1>
          <p className="text-gray-600 text-sm">
            Machine learning early-warning detection for panel degradation, inverter instability, and thermal anomalies
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
          {installations.length > 0 && (
            <Select
              value={selectedInstallation}
              onChange={e => setSelectedInstallation(e.target.value)}
              wrapperClassName="col-span-2 sm:w-auto"
              className="w-full sm:w-56"
              options={installations.map(inst => ({ value: inst.id, label: `${inst.name} (${inst.spms_id})` }))}
            />
          )}
          <Select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            wrapperClassName="w-full sm:w-auto"
            className="w-full sm:w-40"
            options={[
              { value: '', label: 'All Sources' },
              { value: 'ml_predictive', label: 'ML Predictive' },
              { value: 'system', label: 'System Alerts' },
            ]}
          />
          <Select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            wrapperClassName="w-full sm:w-auto"
            className="w-full sm:w-36"
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'active', label: 'Active' },
              { value: 'acknowledged', label: 'Acknowledged' },
              { value: 'resolved', label: 'Resolved' },
            ]}
          />
        </div>
      </div>

      {scanNotice && (
        <div className="bg-solar-50 border border-solar-200 rounded-lg px-4 py-2.5 text-solar-900 text-sm flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-solar-600 flex-shrink-0" />
          <span>{scanNotice}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* ML Predictive Health Panel */}
      {mlReport && (
        <Card className="border-deepblue-200">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-deepblue-50 text-deepblue-600 flex items-center justify-center flex-shrink-0">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle>ML Predictive Maintenance Engine</CardTitle>
                  <Badge variant="info">OLS + EWMA + Robust Z-Score</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Analyzed {mlReport.readings_analyzed} telemetry intervals • Last scan{' '}
                  {new Date(mlReport.analyzed_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => runMLScan()}
                disabled={scanning}
                className="gap-1.5 w-full sm:w-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${scanning ? 'animate-spin' : ''}`} />
                {scanning ? 'Scanning…' : 'Run ML Scan'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runMLScan('panel_degradation')}
                disabled={scanning}
                title="Inject subtle 3.8%/day efficiency decay to test early panel degradation alerts"
                className="w-full sm:w-auto"
              >
                Simulate Panel Decay
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runMLScan('inverter_issue')}
                disabled={scanning}
                title="Inject pre-fault DC voltage ripple and MPPT residual loss to test inverter warnings"
                className="w-full sm:w-auto"
              >
                Simulate Inverter Drift
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => runMLScan('reset')}
                disabled={scanning}
                className="gap-1 w-full sm:w-auto"
                title="Restore baseline telemetry and clear simulated ML alerts"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            {/* Predictive Component Health Scores */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sun className="h-3.5 w-3.5 text-amber-500" />
                    Panel Array Health
                  </span>
                  <Badge variant={riskBadgeVariant(mlReport.panel_risk)}>
                    {mlReport.panel_risk} risk
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {mlReport.panel_health_score}%
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  OLS Trend: {mlReport.degradation_slope_pct_per_day >= 0 ? '+' : ''}
                  {mlReport.degradation_slope_pct_per_day}%/day
                  {mlReport.estimated_days_to_critical !== null
                    ? ` • ~${mlReport.estimated_days_to_critical}d to critical`
                    : ' • No critical slope'}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-deepblue-600" />
                    Inverter & MPPT Health
                  </span>
                  <Badge variant={riskBadgeVariant(mlReport.inverter_risk)}>
                    {mlReport.inverter_risk} risk
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {mlReport.inverter_health_score}%
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  DC Bus CV: {mlReport.inverter_voltage_instability_pct}% • MPPT Residual Loss:{' '}
                  {mlReport.inverter_residual_loss_pct}%
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-solar-600" />
                    Overall Health Index
                  </span>
                  <Badge variant={mlReport.overall_health_score >= 80 ? 'success' : mlReport.overall_health_score >= 60 ? 'warning' : 'critical'}>
                    {mlReport.overall_health_score >= 80 ? 'Optimal' : mlReport.overall_health_score >= 60 ? 'Watch' : 'Action Needed'}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {mlReport.overall_health_score}%
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Thermal Stress Index: {mlReport.thermal_stress_index.toFixed(2)}σ
                </p>
              </div>
            </div>

            {/* Chart & Feature Vector Breakdown */}
            <div className="grid lg:grid-cols-2 gap-5">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Irradiance-Normalized Efficiency (%) vs. Anomaly Score
                </p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mlReport.daily_health_series}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={d =>
                          new Date(d + 'T12:00:00').toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })
                        }
                      />
                      <YAxis domain={[0, 115]} tick={{ fontSize: 11 }} width={34} />
                      <Tooltip
                        labelFormatter={d => new Date(String(d) + 'T12:00:00').toLocaleDateString()}
                      />
                      <Bar
                        dataKey="anomaly_score"
                        name="Anomaly Score"
                        fill="#fbbf24"
                        radius={[3, 3, 0, 0]}
                        barSize={18}
                      />
                      <Line
                        type="monotone"
                        dataKey="efficiency_pct"
                        name="Actual Efficiency (%)"
                        stroke="#16a34a"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="expected_baseline_pct"
                        name="ML Baseline (%)"
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Telemetry Feature Attribution Signals
                </p>
                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
                  {mlReport.feature_contributions.map(feat => (
                    <div
                      key={feat.feature}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{feat.feature}</p>
                        <p className="text-[11px] text-gray-400">Baseline: {feat.baseline}</p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2.5 flex-shrink-0">
                        <span className="font-semibold text-gray-800 tabular-nums">{feat.value}</span>
                        <Badge
                          variant={
                            feat.status === 'warning'
                              ? 'warning'
                              : feat.status === 'watch'
                              ? 'info'
                              : 'success'
                          }
                        >
                          {feat.z_score.toFixed(1)}σ
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Alert List</CardTitle>
          <span className="text-xs text-gray-500">{visibleAlerts.length} alert(s)</span>
        </CardHeader>
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
  const {
    id,
    severity,
    title,
    message,
    created_at,
    status,
    source,
    confidence,
    predicted_days_to_critical,
    recommended_action,
    model_signals,
  } = alert

  const isPredictive = source === 'ml_predictive'
  const severityClass =
    severity === 'critical'
      ? 'bg-red-100 text-red-600'
      : severity === 'warning'
      ? 'bg-yellow-100 text-yellow-600'
      : 'bg-blue-100 text-blue-600'

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg border ${
        isPredictive ? 'bg-amber-50/40 border-amber-200' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isPredictive ? 'bg-deepblue-100 text-deepblue-700' : severityClass
          }`}
        >
          {isPredictive ? <BrainCircuit className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
            <Badge variant={severity}>{severity}</Badge>
            {isPredictive && <Badge variant="info">ML Predictive</Badge>}
            {confidence !== undefined && (
              <span className="text-[11px] font-medium text-deepblue-700 bg-deepblue-50 px-2 py-0.5 rounded">
                {Math.round(confidence * 100)}% confidence
              </span>
            )}
            {predicted_days_to_critical != null && (
              <span className="text-[11px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                ~{predicted_days_to_critical}d lead time
              </span>
            )}
            <span className="text-xs text-gray-400 font-mono">({status})</span>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed">{message}</p>
          {model_signals && model_signals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {model_signals.map(sig => (
                <span
                  key={sig}
                  className="text-[11px] text-gray-600 bg-white border border-gray-200 rounded px-2 py-0.5"
                >
                  {sig}
                </span>
              ))}
            </div>
          )}
          {recommended_action && (
            <p className="text-xs text-deepblue-800 mt-2 font-medium">
              Recommended action: {recommended_action}
            </p>
          )}
          <p className="text-[11px] text-gray-400 mt-1.5">
            Logged: {new Date(created_at).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end sm:self-center flex-shrink-0">
        {isPredictive && status !== 'resolved' && (
          <Link to="/service-requests">
            <Button variant="outline" size="sm" className="gap-1">
              <Wrench className="h-3.5 w-3.5" />
              Request Service
            </Button>
          </Link>
        )}
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
        {status === 'resolved' && <Badge variant="success">Resolved</Badge>}
      </div>
    </div>
  )
}

