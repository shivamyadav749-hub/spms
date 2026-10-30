import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '../components/ui'
import { FileText, Wrench, Clock, CheckCircle, AlertTriangle, LayoutDashboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

interface ServiceHistoryRequest {
  id: string
  issue_category: string
  installation_name: string | null
  status: 'requested' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'
  created_at: string
}

interface TechnicianDashboardData {
  serviceHistory: ServiceHistoryRequest[]
  loading: boolean
  error: string
}

export function TechnicianDashboard() {
  const [data, setData] = useState<TechnicianDashboardData>({
    serviceHistory: [],
    loading: true,
    error: ''
  })

  useEffect(() => {
    let active = true
    api.get<ServiceHistoryRequest[]>('/api/v1/service-requests')
      .then(serviceHistory => {
        if (active) setData(d => ({ ...d, serviceHistory, loading: false }))
      })
      .catch((e: Error) => {
        if (active) setData(d => ({ ...d, error: e.message, loading: false }))
      })
    return () => { active = false }
  }, [])
  if (data.loading) return <div className="p-8 text-center text-gray-500">Loading assignments…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Technician Dashboard</h1>
        <p className="text-gray-600">Overview of your assigned work</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Assigned" count={data.serviceHistory.filter(s => s.status === 'assigned').length} icon={FileText} color="text-blue-500" bg="bg-blue-50" />
        <StatCard title="In Progress" count={data.serviceHistory.filter(s => s.status === 'in_progress').length} icon={Wrench} color="text-yellow-500" bg="bg-yellow-50" />
        <StatCard title="Completed This Month" count={data.serviceHistory.filter(s => s.status === 'completed').length} icon={CheckCircle} color="text-green-500" bg="bg-green-50" />
        <StatCard title="Pending Review" count={data.serviceHistory.filter(s => s.status === 'requested').length} icon={AlertTriangle} color="text-red-500" bg="bg-red-50" />
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Recent Assignments</CardTitle>
          <Link to="/technician/requests"><Button variant="ghost" size="sm">View All</Button></Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.serviceHistory.length === 0 && (
              <p className="text-gray-500">No assignments yet. Requests will appear here once created.</p>
            )}
            {data.serviceHistory.map((r, i) => (
              <Link key={i} to={`/technician/requests/${r.id}`} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-900">{r.id} • {r.issue_category}</p>
                  <p className="text-sm text-gray-500">{r.installation_name || 'Installation'} • {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <Badge variant={r.status === 'in_progress' ? 'warning' : 'info'}>{r.status.replace('_', ' ')}</Badge>
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
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`h-12 w-12 rounded-lg ${bg} flex items-center justify-center ${color}`}><Icon className="h-6 w-6" /></div>
        <div><p className="text-sm text-gray-500">{title}</p><p className="text-2xl font-bold text-gray-900">{count}</p></div>
      </CardContent>
    </Card>
  )
}