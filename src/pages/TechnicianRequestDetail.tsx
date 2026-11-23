import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input } from '../components/ui'
import { ArrowLeft, Wrench, Calendar, User, FileText, CheckCircle, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { ServiceRequest, ServiceRecord, RequestStatus } from '../types'

export function TechnicianRequestDetail() {
  const { id } = useParams<{ id: string }>()
  const [request, setRequest] = useState<ServiceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [recordDesc, setRecordDesc] = useState('')
  const [findings, setFindings] = useState('')
  const [repairNotes, setRepairNotes] = useState('')
  const [submittingRecord, setSubmittingRecord] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get<ServiceRequest>(`/api/v1/service-requests/${id}`)
      setRequest(res)
    } catch (e: any) {
      setError(e.message || 'Failed to load request')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(newStatus: RequestStatus) {
    if (!id || !request) return
    try {
      const updated = await api.patch<ServiceRequest>(`/api/v1/service-requests/${id}`, {
        status: newStatus,
      })
      setRequest(prev => (prev ? { ...prev, status: updated.status, completed_at: updated.completed_at } : null))
    } catch (e: any) {
      alert(e.message || 'Failed to update status')
    }
  }

  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !request || !recordDesc.trim()) return

    setSubmittingRecord(true)
    try {
      const record = await api.post<ServiceRecord>(`/api/v1/service-requests/${id}/records`, {
        service_request_id: id,
        installation_id: request.installation_id,
        technician_id: request.technician_id || '1863ce77-a759-40bc-805d-bc75b963be96',
        description: recordDesc.trim(),
        findings: findings.trim() || null,
        repair_notes: repairNotes.trim() || null,
        performed_at: new Date().toISOString(),
      })
      setRequest(prev => (prev ? { ...prev, records: [record, ...(prev.records || [])] } : null))
      setRecordDesc('')
      setFindings('')
      setRepairNotes('')
    } catch (e: any) {
      alert(e.message || 'Failed to add service record')
    } finally {
      setSubmittingRecord(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Loading work order details…</div>
  if (!request) return <div className="p-8 text-center text-red-500">Service request not found</div>

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
          <Link to="/technician/requests" className="flex-shrink-0">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{request.id}</h1>
              <Badge variant={getStatusVariant(request.status)}>
                {request.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Category: <span className="font-semibold text-gray-700">{request.issue_category.replace('_', ' ')}</span> • {request.installation_name}
            </p>
          </div>
        </div>

        {/* Quick Lifecycle Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {request.status === 'assigned' && (
            <Button onClick={() => updateStatus('in_progress')} className="w-full sm:w-auto">
              <Wrench className="h-4 w-4 mr-1.5" /> Start Work
            </Button>
          )}
          {request.status === 'in_progress' && (
            <Button variant="secondary" onClick={() => updateStatus('completed')} className="w-full sm:w-auto">
              <CheckCircle className="h-4 w-4 mr-1.5" /> Mark Completed
            </Button>
          )}
          {request.status === 'requested' && (
            <Button onClick={() => updateStatus('assigned')} className="w-full sm:w-auto">
              Accept Assignment
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Request Details */}
        <Card>
          <CardHeader><CardTitle>Work Order Overview</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                Customer Problem Description
              </span>
              <p className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-gray-800 leading-relaxed font-medium">
                {request.description}
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex justify-between gap-3 py-1 border-b border-gray-100">
                <span className="text-gray-500 flex-shrink-0">Installation:</span>
                <span className="font-medium text-gray-900 text-right">{request.installation_name || 'Home Solar'}</span>
              </div>
              <div className="flex justify-between gap-3 py-1 border-b border-gray-100">
                <span className="text-gray-500 flex-shrink-0">Requested By:</span>
                <span className="font-mono text-xs text-gray-600 truncate text-right">{request.requested_by}</span>
              </div>
              <div className="flex justify-between gap-3 py-1 border-b border-gray-100">
                <span className="text-gray-500 flex-shrink-0">Created:</span>
                <span className="font-medium text-gray-900 text-right">{new Date(request.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-3 py-1">
                <span className="text-gray-500 flex-shrink-0">Completion Status:</span>
                <span className="font-medium text-gray-900 text-right">
                  {request.completed_at ? new Date(request.completed_at).toLocaleString() : 'In field'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Service Record */}
        <Card>
          <CardHeader><CardTitle>Log Performed Maintenance</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAddRecord} className="space-y-3">
              <div>
                <label className="label">Work Description *</label>
                <Input
                  placeholder="e.g. Cleared panel array and tightened DC terminals"
                  value={recordDesc}
                  onChange={e => setRecordDesc(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Findings</label>
                <textarea
                  rows={2}
                  className="input text-xs"
                  placeholder="e.g. High ambient temperature due to leaves under inverter"
                  value={findings}
                  onChange={e => setFindings(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Repair & Tuning Notes</label>
                <textarea
                  rows={2}
                  className="input text-xs"
                  placeholder="e.g. Cleaned heat sink and verified output restored to 5 kW"
                  value={repairNotes}
                  onChange={e => setRepairNotes(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={submittingRecord || !recordDesc.trim()} className="w-full">
                <Plus className="h-4 w-4 mr-1.5" /> Save Official Record
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Existing Service Records for this request */}
      <Card>
        <CardHeader><CardTitle>Logged Work Records ({request.records?.length || 0})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(!request.records || request.records.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-6">
                No technician field records logged for this ticket yet.
              </p>
            )}
            {request.records?.map(rec => (
              <div key={rec.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-semibold text-gray-900 text-sm">{rec.description}</h4>
                  <span className="text-xs text-gray-400">
                    {new Date(rec.performed_at).toLocaleString()}
                  </span>
                </div>
                {rec.findings && (
                  <p className="text-xs text-gray-600">
                    <strong>Findings:</strong> {rec.findings}
                  </p>
                )}
                {rec.repair_notes && (
                  <p className="text-xs text-gray-600">
                    <strong>Action:</strong> {rec.repair_notes}
                  </p>
                )}
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
