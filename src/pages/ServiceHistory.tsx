import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Select } from '../components/ui'
import { FileText, Wrench, Calendar, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'
import { ServiceRecord, Installation } from '../types'

export function ServiceHistory() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<string>('')
  const [records, setRecords] = useState<ServiceRecord[]>([])
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

  useEffect(() => {
    if (selectedInstallation) {
      loadHistory(selectedInstallation)
    }
  }, [selectedInstallation])

  async function loadHistory(id: string) {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<{ service_records: ServiceRecord[] }>(
        `/api/v1/service-requests/installations/${id}/service-history`
      )
      setRecords(res.service_records)
    } catch (e: any) {
      setError(e.message || 'Failed to load service records')
    } finally {
      setLoading(false)
    }
  }

  if (loading && installations.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading service history…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
          <p className="text-gray-600 text-sm">Official maintenance, inspection, and repair logs</p>
        </div>
        {installations.length > 0 && (
          <Select
            value={selectedInstallation}
            onChange={e => setSelectedInstallation(e.target.value)}
            wrapperClassName="w-full sm:w-auto"
            className="w-full sm:w-64"
            options={installations.map(inst => ({ value: inst.id, label: `${inst.name} (${inst.spms_id})` }))}
          />
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Historical Service Records ({records.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {records.length === 0 && (
              <p className="text-gray-500 text-center py-8 text-sm">
                No past service records logged for this installation.
              </p>
            )}
            {records.map((r, i) => (
              <div key={i} className="p-4 sm:p-5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-solar-100 text-solar-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{r.description}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="h-3 w-3" /> Performed on{' '}
                        {new Date(r.performed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" className="self-start sm:self-center flex-shrink-0">
                    <CheckCircle className="h-3 w-3 mr-1" /> Verified Record
                  </Badge>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm pt-1">
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                      Technician Findings
                    </span>
                    <p className="text-gray-700 text-sm bg-white p-3 rounded border border-gray-200">
                      {r.findings || 'No anomalies detected. Operations nominal.'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                      Repair & Action Notes
                    </span>
                    <p className="text-gray-700 text-sm bg-white p-3 rounded border border-gray-200">
                      {r.repair_notes || 'Preventative inspection completed.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
