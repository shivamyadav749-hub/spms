import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../components/ui'
import { Link } from 'react-router-dom'
import { Plus, Building2, MapPin, Zap, X } from 'lucide-react'
import { api } from '../lib/api'
import { useEffect, useState } from 'react'
import { Installation } from '../types'
import { useAuth } from '../hooks/useAuth'

export function Installations() {
  const { user } = useAuth()
  const [installations, setInstallations] = useState<Installation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('6.0')
  const [address, setAddress] = useState('456 Green Valley Rd')
  const [city, setCity] = useState('Springfield')
  const [postalCode, setPostalCode] = useState('62701')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const res = await api.get<{ installations: Installation[] }>('/api/v1/installations')
      setInstallations(res.installations)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    try {
      const created = await api.post<Installation>('/api/v1/installations', {
        name,
        capacity_kw: parseFloat(capacity) || 5.0,
        address,
        city,
        postal_code: postalCode,
        latitude: 39.78,
        longitude: -89.65,
        installed_at: new Date().toISOString().slice(0, 10),
        monitoring_mode: 'simulated',
        owner_id: user?.id || '0ad68548-4c13-4908-8a22-32101f18400b',
      })
      setInstallations(prev => [created, ...prev])
      setShowAddModal(false)
      setName('')
    } catch (err: any) {
      alert(err.message || 'Failed to create installation')
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading installations…</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Installations</h1>
          <p className="text-gray-600 text-sm">Manage your solar installations and hardware configurations</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Add Installation
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {installations.map(inst => (
          <Link
            key={inst.id}
            to={`/installations/${inst.id}`}
            className="card p-4 sm:p-6 hover:shadow-md transition-shadow group border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 group-hover:text-solar-600 transition-colors">
                  {inst.name}
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{inst.spms_id}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-solar-50 text-solar-600 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Rated Capacity: <strong>{inst.capacity_kw} kW</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{inst.city}, {inst.postal_code}</span>
              </div>
            </div>
          </Link>
        ))}

        {installations.length === 0 && (
          <div className="col-span-full card p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No installations yet</h3>
            <p className="text-gray-500 mb-4 text-sm">Add your first solar installation to start monitoring.</p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Installation
            </Button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white shadow-xl relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Add Solar Installation</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              <Input
                label="Installation Name"
                placeholder="e.g. Home Rooftop Solar"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <Input
                label="Rated Capacity (kW)"
                type="number"
                step="0.1"
                min="0.5"
                max="500"
                value={capacity}
                onChange={e => setCapacity(e.target.value)}
                required
              />
              <Input
                label="Address"
                placeholder="123 Solar Way"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="City"
                  placeholder="Springfield"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
                <Input
                  label="Postal Code"
                  placeholder="62701"
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Save Installation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
