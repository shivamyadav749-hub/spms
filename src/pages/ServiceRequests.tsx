import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select } from '../components/ui'
import { Plus, FileText, Clock, Wrench, Search, X } from 'lucide-react'
import { api } from '../lib/api'
import { ServiceRequest, Installation } from '../types'
import { useAuth } from '../hooks/useAuth'

export function ServiceRequests() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // New Request modal
  const [showModal, setShowModal] = useState(false)
  const [selectedInstId, setSelectedInstId] = useState('')
  const [category, setCategory] = useState('inspection')
  const [description, setDescription] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const [reqs, insts] = await Promise.all([
        api.get<ServiceRequest[]>('/api/v1/service-requests'),
        api.get<{ installations: Installation[] }>('/api/v1/installations'),
      ])
      setRequests(reqs)
      setInstallations(insts.installations)
      if (insts.installations.length) {
        setSelectedInstId(insts.installations[0].id)
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load service requests')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !selectedInstId) return

    try {
      const newReq = await api.post<ServiceRequest>('/api/v1/service-requests', {
        installation_id: selectedInstId,
        requested_by: user?.id || '0ad68548-4c13-4908-8a22-32101f18400b',
        issue_category: category,
        description: description.trim(),
      })
      setRequests(prev => [newReq, ...prev])
      setShowModal(false)
      setDescription('')
    } catch (err: any) {
      alert(err.message || 'Failed to create request')
    }
  }

  const visibleRequests = requests.filter(
    r =>
      (!statusFilter || r.status === statusFilter) &&
      (r.description.toLowerCase().includes(search.toLowerCase()) ||
        r.issue_category.toLowerCase().includes(search.toLowerCase()) ||
        (r.technician_name && r.technician_name.toLowerCase().includes(search.toLowerCase())))
  )

  if (loading && requests.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading service requests…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Requests</h1>
          <p className="text-gray-600 text-sm">Track and schedule maintenance, cleanings, and repairs</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1.5" /> New Service Request
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Filter by Status"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'requested', label: 'Requested' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            <Input
              label="Search Requests"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by description or category…"
              leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Service Log ({visibleRequests.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleRequests.length === 0 && (
              <p className="text-gray-500 text-center py-8 text-sm">
                No service requests found. Click "New Service Request" to create one.
              </p>
            )}
            {visibleRequests.map(r => (
              <div
                key={r.id}
                className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-gray-500">{r.id}</span>
                    <Badge variant={getStatusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                      {r.issue_category.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-800 mt-2 font-medium">{r.description}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                    {r.installation_name || 'Home Solar'}
                  </span>
                  {r.technician_name && (
                    <span className="flex items-center gap-1 text-solar-700 font-medium">
                      <Wrench className="h-3.5 w-3.5" /> Assigned: {r.technician_name}
                    </span>
                  )}
                  {r.completed_at && (
                    <span className="text-green-600">
                      Completed: {new Date(r.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white shadow-xl relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Create Service Request</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Select
                label="Solar Installation"
                value={selectedInstId}
                onChange={e => setSelectedInstId(e.target.value)}
                options={installations.map(i => ({ value: i.id, label: `${i.name} (${i.spms_id})` }))}
              />
              <Select
                label="Issue Category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                options={[
                  { value: 'inspection', label: 'Periodic Routine Inspection' },
                  { value: 'performance_drop', label: 'Generation / Output Drop' },
                  { value: 'inverter_error', label: 'Inverter Fault' },
                  { value: 'panel_cleaning', label: 'Panel Cleaning & Dust Removal' },
                  { value: 'wiring_check', label: 'Electrical & Wiring Check' },
                ]}
              />
              <div>
                <label className="label">Problem Description</label>
                <textarea
                  rows={3}
                  className="input"
                  placeholder="Describe what needs servicing or inspection..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
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
