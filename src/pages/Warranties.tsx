import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Select } from '../components/ui'
import { Shield, AlertTriangle, CheckCircle, XCircle, Calendar, Zap, Sun } from 'lucide-react'
import { api } from '../lib/api'
import { Warranty, Installation } from '../types'

export function Warranties() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<string>('')
  const [warranties, setWarranties] = useState<Warranty[]>([])
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

  async function loadWarranties(id: string) {
    setLoading(true)
    setError('')
    try {
      const res = await api.get<Warranty[]>(`/api/v1/installations/${id}/warranties`)
      setWarranties(res)
    } catch (e: any) {
      setError(e.message || 'Failed to load component warranties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedInstallation) {
      loadWarranties(selectedInstallation)
    }
  }, [selectedInstallation])

  if (loading && installations.length === 0) {
    return <div className="p-8 text-center text-gray-500">Loading warranties…</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warranty Management</h1>
          <p className="text-gray-600 text-sm">Track component warranties, serial numbers, and expiry countdowns</p>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Active"
          count={warranties.filter(w => w.status === 'Active').length}
          icon={CheckCircle}
          color="text-green-500"
          bg="bg-green-50"
        />
        <StatCard
          title="Expiring Soon"
          count={warranties.filter(w => w.status === 'Expiring Soon').length}
          icon={AlertTriangle}
          color="text-yellow-500"
          bg="bg-yellow-50"
        />
        <StatCard
          title="Expired"
          count={warranties.filter(w => w.status === 'Expired').length}
          icon={XCircle}
          color="text-red-500"
          bg="bg-red-50"
        />
        <StatCard
          title="Total Components"
          count={warranties.length}
          icon={Shield}
          color="text-deepblue-500"
          bg="bg-deepblue-50"
        />
      </div>

      <Card>
        <CardHeader><CardTitle>Installed Components & Coverage</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {warranties.length === 0 && (
              <p className="text-gray-500 text-center py-6 text-sm">
                No components or warranties registered for this installation.
              </p>
            )}
            {warranties.map((w, i) => (
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
      <CardContent className="flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5">
        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg ${bg} flex items-center justify-center ${color} flex-shrink-0`}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] sm:text-xs text-gray-500 uppercase tracking-wider font-semibold truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">{count}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function WarrantyCard({
  component_type,
  manufacturer,
  model,
  serial_number,
  warranty_start,
  warranty_end,
  status,
  days_remaining,
}: Warranty) {
  const statusMap: Record<string, string> = {
    Active: 'badge-success',
    'Expiring Soon': 'badge-warning',
    Expired: 'badge-critical',
    Unknown: 'badge-info',
  }
  const variant = statusMap[status] || 'badge-info'

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-white transition-colors">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-solar-100 text-solar-700 flex items-center justify-center flex-shrink-0">
          {component_type === 'panel' ? <Sun className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
        </div>
        <div>
          <h4 className="font-semibold text-gray-900 text-sm">
            {manufacturer} {model}
          </h4>
          <p className="text-xs text-gray-500 capitalize mt-0.5">
            Type: {component_type} • Serial: <span className="font-mono">{serial_number || 'N/A'}</span>
          </p>
        </div>
      </div>

      <div className="sm:text-right">
        <div className="flex items-center sm:justify-end gap-1.5 text-xs text-gray-600">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span>
            {warranty_start || 'N/A'} &rarr; {warranty_end || 'N/A'}
          </span>
        </div>
        <div className="flex items-center sm:justify-end gap-2 mt-1.5">
          {days_remaining !== null && (
            <span className="text-xs text-gray-500">
              {days_remaining >= 0 ? `${days_remaining} days left` : `${Math.abs(days_remaining)} days ago`}
            </span>
          )}
          <Badge variant={variant}>{status}</Badge>
        </div>
      </div>
    </div>
  )
}
