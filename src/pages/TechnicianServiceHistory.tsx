import { Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui'
import { FileText, Calendar, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { ServiceRequest } from '../types'

export function TechnicianServiceHistory() {
  const [completedJobs, setCompletedJobs] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<ServiceRequest[]>('/api/v1/service-requests')
      .then(res => {
        setCompletedJobs(res.filter(r => r.status === 'completed' || r.records && r.records.length > 0))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500">Loading service history…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Technician Service History</h1>
        <p className="text-gray-600 text-sm">Your completed field work records and customer resolutions</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Completed Work Orders & Records</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completedJobs.length === 0 && (
              <p className="text-gray-500 text-center py-8 text-sm">
                No completed service orders logged yet.
              </p>
            )}
            {completedJobs.map((r, i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-solar-100 text-solar-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{r.description}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {r.id} • {r.installation_name || 'Demo Solar'} • {r.issue_category.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">
                    <CheckCircle className="h-3 w-3 mr-1" /> Completed
                  </Badge>
                </div>
                {r.records && r.records.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600 space-y-1">
                    {r.records.map(rec => (
                      <p key={rec.id}>
                        • <strong>{new Date(rec.performed_at).toLocaleDateString()}:</strong> {rec.description}
                        {rec.findings ? ` — Findings: ${rec.findings}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
