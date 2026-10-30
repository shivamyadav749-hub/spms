import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Select } from '../components/ui'
import { Shield, AlertTriangle, CheckCircle, XCircle, Calendar } from 'lucide-react'
import { api } from '../lib/api'

interface Warranty {
  component_id: string
  component_type: 'panel' | 'inverter' | 'component'
  manufacturer: string
  model: string
  serial_number: string | null
  warranty_start: string | null
  warranty_end: string | null
  status: 'Active' | 'Expiring Soon' | 'Expired' | 'Unknown'
  days_remaining: number | null
}

interface WarrantiesPageData {
  installations: {id: string; name: string; spms_id: string}[]
  selectedInstallation: string
  warranties: Warranty[]
  loading: boolean
  error: string
}

export function Warranties() {
  const [data, setData] = useState<WarrantiesPageData>({
    installations: [],
    selectedInstallation: '',
    warranties: [],
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

  async function loadWarranties(id: string) {
    setData(d => ({ ...d, loading: true, error: '' }))
    try {
      const res = await api.get<Warranty[]>(`/api/v1/installations/${id}/warranties`)
      setData(d => ({ ...d, warranties: res, loading: false }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message, loading: false }))
    }
  }

  useEffect(() => {
    if (data.installations.length > 0) {
      loadWarranties(data.selectedInstallation)
    }
  }, [data.selectedInstallation, data.installations])

  if (data.loading && data.installations.length === 0) return <div className="p-8 text-center text-gray-500">Loading installations…</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Warranty Management</h1>
        <p className="text-gray-600">Track component warranties and expiry dates</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard title="Active" count={data.warranties.filter(w => w.status === 'Active').length} icon={CheckCircle} color="text-green-500" bg="bg-green-50" />
        <StatCard title="Expiring Soon" count={data.warranties.filter(w => w.status === 'Expiring Soon').length} icon={AlertTriangle} color="text-yellow-500" bg="bg-yellow-50" />
        <StatCard title="Expired" count={data.warranties.filter(w => w.status === 'Expired').length} icon={XCircle} color="text-red-500" bg="bg-red-50" />
        <StatCard title="Unknown" count={data.warranties.filter(w => !w.warranty_end).length} icon={Calendar} color="text-gray-500" bg="bg-gray-50" />
      </div>

      <Card>
        <CardHeader><CardTitle>Component Warranties</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.warranties.length === 0 && (
              <p className="text-gray-500 text-center">No warranties found. Seed data may not be loaded.</p>
            )}
            {data.warranties.map((w, i) => (
              <WarrantyCard key={i} {...w} />
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

function WarrantyCard({ component_type, manufacturer, model, serial_number, warranty_start, warranty_end, status }: Warranty) {
  const statusMap: Record<string, any> = { Active: 'badge-success', 'Expiring Soon': 'badge-warning', Expired: 'badge-critical', Unknown: 'badge-info' }
  const variant = statusMap[status] || 'badge-info'
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-bg-solar-100 text-solar-600 flex items-center justify-center">
          {component_type === 'panel' ? <span className="text-2xl">☀️</span> : <span className="text-2xl">⚡</span>}
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{manufacturer} {model}</h4>
          <p className="text-sm text-gray-500">{component_type} • Serial: {serial_number || 'N/A'}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-2 justify-end">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-600">{warranty_start || 'N/A'} → {warranty_end || 'N/A'}</span>
        </div>
        <Badge variant={variant} className="mt-1">{status}</Badge>
      </div>
    </div>
  )
}