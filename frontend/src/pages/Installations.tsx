import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui'
import { Link } from 'react-router-dom'
import { Plus, Building2 } from 'lucide-react'
import { api } from '../lib/api'
import { useEffect, useState } from 'react'

interface Installation {
  id: string
  spms_id: string
  name: string
  capacity_kw: number
}

export function Installations() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const res = await api.get<{ installations: Installation[] }>('/api/v1/installations')
      setInstallations(res.installations)
    } catch {}
    finally { setLoading(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64">Loading…</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Installations</h1>
          <p className="text-gray-600">Manage your solar installations</p>
        </div>
        <Link to="/installations/new"><Button><Plus className="h-4 w-4 mr-2" /> Add Installation</Button></Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {installations.map(inst => (
          <Link key={inst.id} to={`/installations/${inst.id}`} className="card p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{inst.name}</h3>
                <p className="text-sm text-gray-500">{inst.spms_id}</p>
              </div>
              <Building2 className="h-8 w-8 text-solar-500" />
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Capacity: {inst.capacity_kw} kW</p>
            </div>
          </Link>
        ))}
        {installations.length === 0 && (
          <div className="col-span-full card p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No installations yet</h3>
            <p className="text-gray-500 mb-4">Add your first solar installation to start monitoring.</p>
            <Link to="/installations/new"><Button><Plus className="h-4 w-4 mr-2" /> Add Installation</Button></Link>
          </div>
        )}
      </div>
    </div>
  )
}