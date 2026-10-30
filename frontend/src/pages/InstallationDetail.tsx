import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '../components/ui'
import { api } from '../lib/api'
import { Sun, Zap, Calendar, MapPin, Building2, ArrowLeft, Settings } from 'lucide-react'

export function InstallationDetail() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    try {
      const res = await api.get(`/api/v1/installations/${id}`)
      setData(res)
    } catch {}
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading…</div>
  if (!data) return <div className="text-center py-12">Installation not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/installations"><Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-gray-600">{data.spms_id}</p>
        </div>
        <Link to={`/installations/${id}/edit`} className="ml-auto"><Button variant="outline"><Settings className="h-4 w-4 mr-1" /> Edit</Button></Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InfoCard icon={Zap} label="Capacity" value={`${data.capacity_kw} kW`} />
        <InfoCard icon={Sun} label="Installed" value={data.installed_at ? new Date(data.installed_at).toLocaleDateString() : '—'} />
        <InfoCard icon={MapPin} label="Location" value={`${data.city || ''} ${data.postal_code || ''}`.trim() || '—'} />
        <InfoCard icon={Building2} label="Mode" value={<Badge variant="info">{data.monitoring_mode}</Badge>} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>System Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Address</span><span>{data.address || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">City</span><span>{data.city || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Postal Code</span><span>{data.postal_code || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Coordinates</span><span>{data.latitude?.toFixed(4)}, {data.longitude?.toFixed(4)}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Created</span><span>{data.created_at ? new Date(data.created_at).toLocaleString() : '—'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Link to={`/dashboard?installation=${data.id}`}><Button className="w-full justify-start"><Zap className="h-4 w-4 mr-2" /> View Dashboard</Button></Link>
            <Link to={`/analytics?installation=${data.id}`}><Button variant="outline" className="w-full justify-start"><Calendar className="h-4 w-4 mr-2" /> View Analytics</Button></Link>
            <Link to={`/ai-assistant?installation=${data.id}`}><Button variant="outline" className="w-full justify-start"><Sun className="h-4 w-4 mr-2" /> Ask AI Assistant</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }: any) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="h-12 w-12 rounded-lg bg-solar-100 text-solar-600 flex items-center justify-center"><Icon className="h-6 w-6" /></div>
        <div><p className="text-sm text-gray-500">{label}</p><p className="font-medium text-gray-900">{value}</p></div>
      </CardContent>
    </Card>
  )
}