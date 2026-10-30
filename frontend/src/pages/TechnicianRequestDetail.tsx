import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button
} from '../components/ui'

import {
  ArrowLeft,
  Wrench,
  Calendar,
  MapPin,
  User,
  FileText,
  CheckCircle
} from 'lucide-react'

import { api } from '../lib/api'


type RequestStatus =
  | 'requested'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'rejected'

interface ServiceRecord {
  id: string
  service_request_id: string
  installation_id: string
  description: string
  findings: string | null
  repair_notes: string | null
  performed_at: string
  technician_id: string
}

interface ServiceRequestDetail {
  id: string
  installation_id: string
  requested_by: string
  issue_category: string
  description: string
  status: RequestStatus
  technician_name: string | null
  installation_name: string | null
  created_at: string
  completed_at: string | null
  records: ServiceRecord[]
}

interface TechnicianRequestDetailData {
  request: ServiceRequestDetail | null
  loading: boolean
  error: string
}

interface DetailRowProps {
  label: string
  value: string
  icon?: React.ElementType
}

function DetailRow({ label, value, icon: Icon }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">

      {Icon && (
        <div className="h-8 w-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      )}

      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>

    </div>
  )
}

function statusString(status: string): string {
  const map: Record<string, string> = {
    requested: 'Requested',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    rejected: 'Rejected'
  }

  return map[status] || status
}

export function TechnicianRequestDetail() {

  const { id } = useParams<{ id: string }>()

  const [data, setData] = useState<TechnicianRequestDetailData>({
    request: null,
    loading: true,
    error: ''
  })
  const [recordDescription, setRecordDescription] = useState('')

  useEffect(() => {

    if (!id) {
      setData(d => ({
        ...d,
        loading: false,
        error: 'Request ID is missing'
      }))
      return
    }

    let active = true
    async function fetchRequest() {
      setData(d => ({
        ...d,
        loading: true,
        error: ''
      }))

      try {
        const res = await api.get<ServiceRequestDetail>(
          `/api/v1/service-requests/${id}`
        )
        const history = await api.get<{ service_records: ServiceRecord[] }>(
          `/api/v1/service-requests/installations/${res.installation_id}/service-history`
        )

        if (active) setData(d => ({
          ...d,
          request: { ...res, records: history.service_records.filter(record => record.service_request_id === res.id) },
          loading: false
        }))

      } catch (e: unknown) {
        if (active) setData(d => ({
          ...d,
          error: e instanceof Error ? e.message : 'Failed to load request',
          loading: false
        }))
      }
    }

    void fetchRequest()
    return () => { active = false }

  }, [id])

  async function updateStatus(newStatus: RequestStatus) {
    if (!id || !data.request) return
    try {
      const updated = await api.patch<ServiceRequestDetail>(`/api/v1/service-requests/${id}`, { status: newStatus })
      setData(d => ({ ...d, request: d.request ? { ...updated, records: d.request.records } : null }))
    } catch (e: unknown) {
      setData(d => ({ ...d, error: e instanceof Error ? e.message : 'Failed to update request' }))
    }
  }

  async function addServiceRecord() {
    if (!id || !data.request || !recordDescription.trim()) return
    try {
      const record = await api.post<ServiceRecord>(`/api/v1/service-requests/${id}/records`, {
        service_request_id: id,
        installation_id: data.request.installation_id,
        description: recordDescription.trim(),
        findings: null,
        repair_notes: null,
        performed_at: new Date().toISOString(),
      })
      setData(d => ({
        ...d,
        request: d.request ? { ...d.request, records: [record, ...d.request.records] } : null,
      }))
      setRecordDescription('')
    } catch (e: unknown) {
      setData(d => ({ ...d, error: e instanceof Error ? e.message : 'Failed to add service record' }))
    }
  }


  if (data.loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading request details...
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="p-8 text-center text-red-500">
        {data.error}
      </div>
    )
  }

  if (!data.request) {
    return (
      <div className="text-center text-gray-500 p-8">
        Request not found
      </div>
    )
  }


  return (

    <div className="space-y-6 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-4">

        <Link to="/technician/requests">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {data.request.id}
          </h1>

          <p className="text-gray-600">
            {data.request.issue_category.replace('_', ' ')} • {data.request.installation_name || data.request.installation_id}
          </p>
        </div>

        <Badge
          variant={
            data.request.status === 'completed'
              ? 'success'
              : data.request.status === 'in_progress'
                ? 'warning'
                : 'info'
          }
          className="ml-auto"
        >
          {statusString(data.request.status)}
        </Badge>

      </div>


      {/* Request Details */}
      <div className="grid md:grid-cols-2 gap-6">

        <Card>

          <CardHeader>
            <CardTitle>Request Details</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            <DetailRow
              label="Description"
              value={data.request.description}
            />

            <DetailRow
              label="Customer"
              icon={User}
              value={data.request.requested_by}
            />

            <DetailRow
              label="Installation"
              icon={Wrench}
              value={data.request.installation_name || data.request.installation_id}
            />

            <DetailRow
              label="Created"
              icon={Calendar}
              value={
                new Date(data.request.created_at).toLocaleDateString()
              }
            />

            <DetailRow
              label="Completed"
              icon={Calendar}
              value={
                data.request.completed_at
                  ? new Date(data.request.completed_at).toLocaleDateString()
                  : 'Not completed'
              }
            />

          </CardContent>

        </Card>


        {/* Update Status */}
        <Card>

          <CardHeader>
            <CardTitle>Update Status</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            <DetailRow
              label="Current Status"
              value={statusString(data.request.status)}
            />

            <div>

              <label className="label">
                Add Service Record
              </label>

              <textarea
                className="input min-h-[100px] w-full"
                placeholder="Describe work performed, findings, repair notes..."
                value={recordDescription}
                onChange={e => setRecordDescription(e.target.value)}
              />
              <Button className="mt-2" onClick={addServiceRecord} disabled={!recordDescription.trim()}>
                Add Record
              </Button>

            </div>


            <div className="flex flex-wrap gap-2">

              {data.request.status === 'assigned' && (
                  <Button
                    onClick={() => updateStatus('in_progress')}
                  >
                    <Wrench className="h-4 w-4 mr-1" />
                    Start Work
                  </Button>

              )}
              {data.request.status === 'in_progress' && (
                <Button
                    variant="secondary"
                    onClick={() => updateStatus('completed')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark Complete
                  </Button>
              )}

              {data.request.status === 'completed' && (
                <Badge variant="success">
                  Completed
                </Badge>
              )}

            </div>

          </CardContent>

        </Card>

      </div>


      {/* Service Records */}
      <Card>

        <CardHeader>
          <CardTitle>Service Records</CardTitle>
        </CardHeader>

        <CardContent>

          {data.request.records.length === 0 && (
            <p className="text-gray-500">
              No service records yet.
            </p>
          )}

          {data.request.records.map((rec) => (

            <div
              key={rec.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 mt-2"
            >

              <div className="h-8 w-8 rounded-lg bg-deepblue-100 text-deepblue-600 flex items-center justify-center flex-shrink-0">

                <FileText className="h-4 w-4" />

              </div>

              <div className="flex-1">

                <p className="text-sm text-gray-500">
                  Performed{' '}
                  {new Date(rec.performed_at).toLocaleDateString()}
                </p>

                <p className="font-medium text-gray-900">
                  {rec.description}
                </p>

              </div>

            </div>

          ))}

        </CardContent>

      </Card>

    </div>

  )
}