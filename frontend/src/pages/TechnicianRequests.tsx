import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Select } from '../components/ui'
import { FileText, Filter, Wrench, CheckCircle, Clock, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

interface ServiceRequest {
  id: string
  issue_category: string
  description: string
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'
  technician_name: string | null
  created_at: string
  installation_id: string
}

interface TechnicianRequestsPageData {
  requests: ServiceRequest[]
  loading: boolean
  error: string
}

export function TechnicianRequests() {
  const [statusFilter, setStatusFilter] = useState('')
  const [data, setData] = useState<TechnicianRequestsPageData>({
    requests: [],
    loading: true,
    error: ''
  })

  useEffect(() => {
    let active = true
    api.get<ServiceRequest[]>('/api/v1/service-requests')
      .then(requests => {
        if (active) setData(d => ({ ...d, requests, loading: false }))
      })
      .catch((e: Error) => {
        if (active) setData(d => ({ ...d, error: e.message, loading: false }))
      })
    return () => { active = false }
  }, [])
  if (data.loading) return <div className="p-8 text-center text-gray-500">Loading requests…</div>

  const visibleRequests = data.requests.filter(request => !statusFilter || request.status === statusFilter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-600">Manage your assigned service requests</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Select label="Filter by Status" options={[
            { value: '', label: 'All' },
            { value: 'assigned', label: 'Assigned' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ]} className="w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Requests</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleRequests.length === 0 && (
              <p className="text-gray-500">No assignments yet.</p>
            )}
            {visibleRequests.map(r => (
              <Link key={r.id} to={`/technician/requests/${r.id}`} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-gray-500">{r.id}</span>
                    <Badge variant={getStatusVariant(r.status)}>{statusString(r.status)}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{r.issue_category.replace('_', ' ')}: {r.description || 'Service request'}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {r.technician_name || 'Unassigned'}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">View</Button>
                  {r.status === 'assigned' && <Button size="sm">Start Work</Button>}
                  {r.status === 'in_progress' && <Button variant="secondary" size="sm">Complete</Button>}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function statusString(status: string): string {
  const map: Record<string, string> = { requested: 'Requested', assigned: 'Assigned', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', rejected: 'Rejected' }
  return map[status] || status
}

function getStatusVariant(status: string): any {
  const map: Record<string, any> = { requested: 'badge-info', assigned: 'badge-warning', in_progress: 'badge-info', completed: 'badge-success', cancelled: 'badge-critical', rejected: 'badge-critical' }
  return map[status] || 'badge-info'
}