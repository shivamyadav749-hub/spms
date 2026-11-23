import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../components/ui'
import { FileText, Wrench, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ServiceRequest } from '../types'

export function TechnicianDashboard() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<ServiceRequest[]>('/api/v1/service-requests')
      .then(res => setRequests(res))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading technician assignments…</div>

  const assigned = requests.filter(s => s.status === 'assigned')
  const inProgress = requests.filter(s => s.status === 'in_progress')
  const completed = requests.filter(s => s.status === 'completed')
  const requested = requests.filter(s => s.status === 'requested')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Technician Portal</h1>
          <p className="text-gray-600 text-sm">Manage scheduled maintenance, diagnostics, and field service records</p>
        </div>
        <Link to="/technician/requests" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            View All Work Orders <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Assigned"
          count={assigned.length}
          icon={FileText}
          color="text-blue-500"
          bg="bg-blue-50"
        />
        <StatCard
          title="In Progress"
          count={inProgress.length}
          icon={Wrench}
          color="text-yellow-600"
          bg="bg-yellow-50"
        />
        <StatCard
          title="Completed"
          count={completed.length}
          icon={CheckCircle}
          color="text-green-500"
          bg="bg-green-50"
        />
        <StatCard
          title="Available Pool"
          count={requested.length}
          icon={AlertTriangle}
          color="text-purple-500"
          bg="bg-purple-50"
        />
      </div>

      {/* Recent Assignments list */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Work Orders & Requests</CardTitle>
          <Link to="/technician/requests">
            <Button variant="ghost" size="sm">Manage All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.length === 0 && (
              <p className="text-gray-500 py-6 text-center text-sm">
                No active service requests assigned.
              </p>
            )}
            {requests.slice(0, 5).map(r => (
              <Link
                key={r.id}
                to={`/technician/requests/${r.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-500">{r.id}</span>
                    <span className="font-semibold text-gray-900 text-sm capitalize">
                      {r.issue_category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{r.description}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {r.installation_name || 'Home Solar'} • Logged: {new Date(r.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Badge variant={getStatusVariant(r.status)}>
                    {r.status.replace('_', ' ')}
                  </Badge>
                  <Button variant="outline" size="sm">Open</Button>
                </div>
              </Link>
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
      <CardContent className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5">
        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg ${bg} flex items-center justify-center ${color} flex-shrink-0`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{count}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function getStatusVariant(status: string): string {
  const map: Record<string, string> = {
    requested: 'badge-info',
    assigned: 'badge-warning',
    in_progress: 'badge-info',
    completed: 'badge-success',
    cancelled: 'badge-critical',
  }
  return map[status] || 'badge-info'
}
