import { useCallback, useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select } from '../components/ui'
import { MapPin, Search, UserCheck } from 'lucide-react'
import { api } from '../lib/api'

interface Technician {
  user_id: string
  full_name: string | null
  city: string
  skills: string[]
  verification_status: string
  is_available: boolean
  latitude: number | null
  longitude: number | null
  service_area: string
  postal_code: string
}

interface TechniciansPageData {
  technicians: Technician[]
  loading: boolean
  error: string
}

export function Technicians() {
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [skill, setSkill] = useState('')
  const [data, setData] = useState<TechniciansPageData>({
    technicians: [],
    loading: true,
    error: ''
  })

  const loadTechnicians = useCallback(async (city = '', postalCode = '', skill = '') => {
    setData(d => ({ ...d, loading: true, error: '' }))
    try {
      const params = new URLSearchParams()
      if (city) params.set('city', city)
      if (postalCode) params.set('postal_code', postalCode)
      if (skill) params.set('skills', skill)
      const query = params.toString()
      const res = await api.get<Technician[]>(`/api/v1/technicians${query ? `?${query}` : ''}`)
      setData(d => ({ ...d, technicians: res, loading: false }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message, loading: false }))
    }
  }, [])

  useEffect(() => {
    void loadTechnicians()
  }, [loadTechnicians])

  if (data.loading) return <div className="p-8 text-center text-gray-500">Loading technicians…</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Find Technicians</h1>
          <p className="text-gray-600">Search verified solar technicians near you</p>
        </div>
        <Button variant="outline"><MapPin className="h-4 w-4 mr-1" /> Use My Location</Button>
      </div>

      {/* Search filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Input label="City" value={city} onChange={e => setCity(e.target.value)} placeholder="Springfield" leftIcon={<MapPin className="h-5 w-5 text-gray-400" />} />
            <Input label="Postal Code" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="62701" leftIcon={<MapPin className="h-5 w-5 text-gray-400" />} />
            <Select label="Radius" options={[
              { value: '5', label: '5 km' },
              { value: '10', label: '10 km' },
              { value: '25', label: '25 km' },
            ]} defaultValue="10" />
            <Select label="Skill" options={[
              { value: '', label: 'All Skills' },
              { value: 'solar_panel', label: 'Solar Panel' },
              { value: 'inverter', label: 'Inverter' },
              { value: 'electrical', label: 'Electrical' },
            ]} value={skill} onChange={e => setSkill(e.target.value)} />
          </div>
          <Button className="w-full sm:w-auto" onClick={() => loadTechnicians(city, postalCode, skill)}><Search className="h-4 w-4 mr-1" /> Search Technicians</Button>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader><CardTitle>Available Technicians</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.technicians.length === 0 && (
              <p className="text-gray-500 text-center">No technicians found. Adjust filters or ensure demo data is seeded.</p>
            )}
            {data.technicians.map((t, i) => (
              <TechnicianCard key={i} {...t} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TechnicianCard({ full_name, city, skills, verification_status, is_available }: Technician) {
  const name = full_name || 'Technician'
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-deepblue-100 text-deepblue-600 flex items-center justify-center text-xl font-bold">
          {name.split(' ').map((n: string) => n[0]).join('')}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">{name}</h4>
            {verification_status === 'verified' && <Badge variant="success"><UserCheck className="h-3 w-3 mr-1" /> Verified</Badge>}
            {is_available && <Badge variant="info">Available</Badge>}
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {city}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {skills.map((s: string) => <Badge key={s} variant="info" className="text-xs">{s.replace('_', ' ')}</Badge>)}
          </div>
        </div>
      </div>
      <Button>Request Service</Button>
    </div>
  )
}