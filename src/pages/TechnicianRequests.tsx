import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Select } from '../components/ui'
import { FileText, Wrench, CheckCircle, Clock, User, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { ServiceRequest } from '../types'

export function TechnicianRequests() {
  const [statusFilter, setStatusFilter] = useState('')
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    setLoading(true)
    try {
      const res = await api.get<ServiceRequest[]>('/api/v1/service-requests')
      setRequests(res)
    } catch (e: any) {
      setError(e.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const visibleRequests = requests.filter(r => !statusFilter || r.status === statusFilter)

  if (loading && requests.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading service assignments…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders & Assignments</h1>
          <p className="text-gray-600 text-sm">Review incoming customer requests and manage job progress</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select
            label="Filter by Job Status"
            options={[
              { value: '', label: 'All Assignments' },
              { value: 'assigned', label: 'Assigned to Me' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'requested', label: 'Unassigned Pool' },
            ]}
            className="w-56"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          />
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Assignments List ({visibleRequests.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleRequests.length === 0 && (
              <p className="text-gray-500 text-center py-8 text-sm">
                No assignments match the selected status.
              </p>
            )}
            {visibleRequests.map(r => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-semibold text-gray-500">{r.id}</span>
                    <Badge variant={getStatusVariant(r.status)}>
                      {r.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded capitalize">
                      {r.issue_category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-800 mt-2">{r.description}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-gray-400" />
                      {r.installation_name || 'Home Solar'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Link to={`/technician/requests/${r.id}`}>
                    <Button variant="outline" size="sm">
                      Details & Notes <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
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
