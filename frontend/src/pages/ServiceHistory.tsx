import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui'
import { FileText } from 'lucide-react'
import { api } from '../lib/api'

interface ServiceRecord {
  id: string
  description: string
  performed_at: string
  findings: string | null
  technician_id: string
}

interface ServiceHistoryData {
  installations: {id: string; name: string; spms_id: string}[]
  selectedInstallation: string
  records: ServiceRecord[]
  loading: boolean
  error: string
}

export function ServiceHistory() {
  const [data, setData] = useState<ServiceHistoryData>({
    installations: [],
    selectedInstallation: '',
    records: [],
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

  useEffect(() => {
    if (data.installations.length > 0) {
      loadHistory()
    }
  }, [data.selectedInstallation, data.installations])

  async function loadHistory() {
    setData(d => ({ ...d, loading: true, error: '' }))
    try {
      const res = await api.get<{ service_records: ServiceRecord[] }>(`/api/v1/service-requests/installations/${data.selectedInstallation}/service-history`)
      setData(d => ({ ...d, records: res.service_records, loading: false }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message, loading: false }))
    }
  }

  if (data.loading && data.installations.length === 0) return <div className="p-8 text-center text-gray-500">Loading installations…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
        <p className="text-gray-600">Complete maintenance and service records</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Service Records</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.records.length === 0 && (
              <p className="text-gray-500 text-center">No service records found. Create service requests to generate records.</p>
            )}
            {data.records.map((r, i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-solar-100 text-solar-600 flex items-center justify-center"><FileText className="h-6 w-6" /></div>
                    <div>
                      <h4 className="font-medium text-gray-900">{r.description}</h4>
                      <p className="text-sm text-gray-500">{new Date(r.performed_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge variant="success">Recorded</Badge>
                </div>
                <div className="mt-3 grid md:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Technician ID: </span><span className="font-medium">{r.technician_id}</span></div>
                  <div><span className="text-gray-500">Findings: </span><span>{r.findings || '—'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}