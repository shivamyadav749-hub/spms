import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select } from '../components/ui'
import { Plus, FileText, Filter, Clock, Wrench, CheckCircle, XCircle, Search } from 'lucide-react'
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

interface ServiceRequestsPageData {
  installations: {id: string; name: string; spms_id: string}[]
  selectedInstallation: string
  requests: ServiceRequest[]
  loading: boolean
  error: string
}

export function ServiceRequests() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [data, setData] = useState<ServiceRequestsPageData>({
    installations: [],
    selectedInstallation: '',
    requests: [],
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

  async function loadRequests() {
    setData(d => ({ ...d, loading: true, error: '' }))
    try {
      const res = await api.get<ServiceRequest[]>('/api/v1/service-requests')
      setData(d => ({ ...d, requests: res, loading: false }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message, loading: false }))
    }
  }

  useEffect(() => {
    if (data.installations.length > 0) {
      loadRequests()
    }
  }, [data.selectedInstallation, data.installations])

  if (data.loading && data.installations.length === 0) return <div className="p-8 text-center text-gray-500">Loading installations…</div>

  const visibleRequests = data.requests.filter(request =>
    (!statusFilter || request.status === statusFilter) &&
    request.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-600">Track and manage service requests for your installations</p>
        </div>
        <div className="flex gap-2">
          <Link to="/service-requests/new"><Button><Plus className="h-4 w-4 mr-1" /> New Request</Button></Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={[
              { value: '', label: 'All Status' },
              { value: 'requested', label: 'Requested' },
              { value: 'assigned', label: 'Assigned' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
              { value: 'rejected', label: 'Rejected' },
            ]} />
            <Input label="Search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by description…" leftIcon={<Search className="h-5 w-5 text-gray-400" />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your Requests</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleRequests.length === 0 && (
              <p className="text-gray-500 text-center">No service requests. Create a new request or ensure demo data is seeded.</p>
            )}
            {visibleRequests.map(request => (
              <RequestRow key={request.id} {...request} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RequestRow({ id, issue_category, description: desc, status, technician_name: tech, created_at: created }: ServiceRequest) {
  const variants: Record<string, string> = { requested: 'badge-info', assigned: 'badge-warning', in_progress: 'badge-info', completed: 'badge-success', cancelled: 'badge-critical', rejected: 'badge-critical' }
  return (
    <Link to={`/service-requests/${id}`} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-white transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-gray-500">{id}</span>
          <Badge variant={variants[status] || 'badge-info'}>{status.replace('_', ' ')}</Badge>
        </div>
        <p className="text-sm text-gray-600 mt-1">{desc}</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {issue_category.replace('_', ' ')}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {created}</span>
          {tech && <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> {tech}</span>}
        </div>
      </div>
      <Button variant="outline" size="sm">View Details</Button>
    </Link>
  )
}