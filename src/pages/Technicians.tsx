import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select } from '../components/ui'
import { MapPin, Search, UserCheck, Wrench, X } from 'lucide-react'
import { api } from '../lib/api'
import { TechnicianProfile, Installation } from '../types'
import { useAuth } from '../hooks/useAuth'

export function Technicians() {
  const { user } = useAuth()
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [skill, setSkill] = useState('')
  const [technicians, setTechnicians] = useState<TechnicianProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Service Request Modal state
  const [selectedTech, setSelectedTech] = useState<TechnicianProfile | null>(null)
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedInstId, setSelectedInstId] = useState('')
  const [category, setCategory] = useState('inspection')
  const [description, setDescription] = useState('')
  const [requestSuccess, setRequestSuccess] = useState(false)

  const loadTechnicians = useCallback(async (searchCity = '', searchPostal = '', searchSkill = '') => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (searchCity) params.set('city', searchCity)
      if (searchPostal) params.set('postal_code', searchPostal)
      if (searchSkill) params.set('skills', searchSkill)
      params.set('latitude', '39.7817')
      params.set('longitude', '-89.6501')
      const query = params.toString()
      const res = await api.get<TechnicianProfile[]>(`/api/v1/technicians${query ? `?${query}` : ''}`)
      setTechnicians(res)
    } catch (e: any) {
      setError(e.message || 'Failed to load technicians')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTechnicians()
    api.get<{ installations: Installation[] }>('/api/v1/installations')
      .then(res => {
        setInstallations(res.installations)
        if (res.installations.length) setSelectedInstId(res.installations[0].id)
      })
      .catch(console.error)
  }, [loadTechnicians])

  async function handleCreateRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTech || !selectedInstId || !description.trim()) return

    try {
      await api.post('/api/v1/service-requests', {
        installation_id: selectedInstId,
        requested_by: user?.id || '0ad68548-4c13-4908-8a22-32101f18400b',
        technician_id: selectedTech.user_id,
        issue_category: category,
        description: description.trim(),
      })
      setRequestSuccess(true)
      setTimeout(() => {
        setRequestSuccess(false)
        setSelectedTech(null)
        setDescription('')
      }, 1500)
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch service request')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Solar Technicians</h1>
          <p className="text-gray-600 text-sm">Search certified, verified solar electricians and technicians nearby</p>
        </div>
      </div>

      {/* Search filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Input
              label="City"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Springfield"
              leftIcon={<MapPin className="h-4 w-4 text-gray-400" />}
            />
            <Input
              label="Postal Code"
              value={postalCode}
              onChange={e => setPostalCode(e.target.value)}
              placeholder="e.g. 62701"
              leftIcon={<MapPin className="h-4 w-4 text-gray-400" />}
            />
            <Select
              label="Skill Specialization"
              options={[
                { value: '', label: 'All Skills' },
                { value: 'solar_panel', label: 'Solar Panel' },
                { value: 'inverter', label: 'Inverter' },
                { value: 'electrical', label: 'Electrical' },
                { value: 'battery', label: 'Battery' },
                { value: 'monitoring', label: 'Monitoring' },
              ]}
              value={skill}
              onChange={e => setSkill(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => loadTechnicians(city, postalCode, skill)}
              >
                <Search className="h-4 w-4 mr-1.5" /> Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      <Card>
        <CardHeader><CardTitle>Verified Technicians ({technicians.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-6">Searching technicians…</p>
          ) : technicians.length === 0 ? (
            <p className="text-gray-500 text-center py-6 text-sm">
              No technicians found matching criteria. Clear filters to see all available technicians.
            </p>
          ) : (
            <div className="space-y-4">
              {technicians.map((t, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-gray-200 bg-white hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-deepblue-100 text-deepblue-700 flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {(t.full_name || 'T')
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900 text-sm">{t.full_name || 'Technician'}</h4>
                        {t.verification_status === 'verified' && (
                          <Badge variant="success">
                            <UserCheck className="h-3 w-3 mr-1" /> Verified
                          </Badge>
                        )}
                        {t.is_available && <Badge variant="info">Available</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {t.city} ({t.service_area})
                        {t.distance_km !== null && (
                          <span className="font-medium text-solar-700 ml-1">
                            • ~{t.distance_km} km away
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.skills.map(s => (
                          <Badge key={s} variant="default" className="text-[11px] bg-gray-100">
                            {s.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedTech(t)
                      setDescription(`Please inspect and diagnose system performance for ${t.full_name}.`)
                    }}
                    className="w-full sm:w-auto sm:self-center"
                  >
                    <Wrench className="h-4 w-4 mr-1.5" /> Request Service
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Modal */}
      {selectedTech && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white shadow-xl relative animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Request Service</h2>
                <p className="text-xs text-gray-500">Assigning to: {selectedTech.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTech(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {requestSuccess ? (
              <div className="text-center py-6 text-green-600 font-semibold">
                ✓ Service request created and assigned successfully!
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <Select
                  label="Select Installation"
                  value={selectedInstId}
                  onChange={e => setSelectedInstId(e.target.value)}
                  options={installations.map(i => ({ value: i.id, label: `${i.name} (${i.spms_id})` }))}
                />
                <Select
                  label="Issue Category"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  options={[
                    { value: 'inspection', label: 'Periodic Inspection' },
                    { value: 'performance_drop', label: 'Generation / Output Drop' },
                    { value: 'inverter_error', label: 'Inverter Fault' },
                    { value: 'panel_cleaning', label: 'Panel Cleaning & Dust Removal' },
                    { value: 'wiring_check', label: 'Electrical & Wiring Check' },
                  ]}
                />
                <div>
                  <label className="label">Description of Problem</label>
                  <textarea
                    rows={3}
                    className="input"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3">
                  <Button variant="outline" type="button" onClick={() => setSelectedTech(null)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button type="submit" className="w-full sm:w-auto">
                    Send Service Request
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
