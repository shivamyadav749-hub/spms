import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '../components/ui'
import { api } from '../lib/api'
import { Sun, Zap, Calendar, MapPin, Building2, ArrowLeft, Bot, Shield, Wrench } from 'lucide-react'
import { Installation } from '../types'

export function InstallationDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<Installation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    try {
      const res = await api.get<Installation>(`/api/v1/installations/${id}`)
      setData(res)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading installation…</div>
  if (!data) return <div className="text-center py-12 text-gray-500">Installation not found</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <Link to="/installations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{data.name}</h1>
          <p className="text-sm font-mono text-gray-500">{data.spms_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <InfoCard icon={Zap} label="Rated Capacity" value={`${data.capacity_kw} kW`} />
        <InfoCard icon={Calendar} label="Installed Date" value={data.installed_at ? new Date(data.installed_at).toLocaleDateString() : '—'} />
        <InfoCard icon={MapPin} label="Location" value={`${data.city || ''} ${data.postal_code || ''}`.trim() || '—'} />
        <InfoCard icon={Building2} label="Mode" value={<Badge variant="info">{data.monitoring_mode}</Badge>} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader><CardTitle>System Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 py-1 border-b border-gray-100">
              <span className="text-gray-500 flex-shrink-0">Address</span>
              <span className="font-medium text-gray-900 text-right">{data.address || '—'}</span>
            </div>
            <div className="flex justify-between gap-4 py-1 border-b border-gray-100">
              <span className="text-gray-500 flex-shrink-0">City</span>
              <span className="font-medium text-gray-900 text-right">{data.city || '—'}</span>
            </div>
            <div className="flex justify-between gap-4 py-1 border-b border-gray-100">
              <span className="text-gray-500 flex-shrink-0">Postal Code</span>
              <span className="font-medium text-gray-900 text-right">{data.postal_code || '—'}</span>
            </div>
            <div className="flex justify-between gap-4 py-1 border-b border-gray-100">
              <span className="text-gray-500 flex-shrink-0">Coordinates</span>
              <span className="font-medium text-gray-900 text-right">{data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <span className="text-gray-500 flex-shrink-0">Registered</span>
              <span className="font-medium text-gray-900 text-right">{data.created_at ? new Date(data.created_at).toLocaleDateString() : '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Link to="/dashboard">
              <Button className="w-full justify-start mb-2">
                <Zap className="h-4 w-4 mr-2" /> View Dashboard Telemetry
              </Button>
            </Link>
            <Link to="/analytics">
              <Button variant="outline" className="w-full justify-start mb-2">
                <Calendar className="h-4 w-4 mr-2" /> View Historical Analytics
              </Button>
            </Link>
            <Link to="/ai-assistant">
              <Button variant="outline" className="w-full justify-start mb-2">
                <Bot className="h-4 w-4 mr-2" /> Ask AI Solar Assistant
              </Button>
            </Link>
            <Link to="/warranties">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" /> Check Component Warranties
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="h-12 w-12 rounded-lg bg-solar-100 text-solar-600 flex items-center justify-center flex-shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <div className="font-semibold text-gray-900 mt-0.5">{value}</div>
        </div>
      </CardContent>
    </Card>
  )
}
