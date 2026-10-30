import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Select, Badge } from '../components/ui'
import { User, MapPin, Wrench, Shield, CheckCircle } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

interface TechnicianFormState {
  fullName: string
  city: string
  postalCode: string
  serviceArea: string
  skills: string[]
  available: boolean
}

interface TechnicianProfileData {
  technician: {
    user_id: string
    full_name: string | null
    city: string
    postal_code: string | null
    service_area: string
    skills: string[]
    is_available: boolean
    verification_status: string
  } | null
  loading: boolean
  error: string
}

function statusString(status: string): string {
  const map: Record<string, string> = { verified: 'Verified', unverified: 'Unverified' }
  return map[status] || status
}

export function TechnicianProfile() {
  const { user } = useAuth()
  const [data, setData] = useState<TechnicianProfileData>({
    technician: null,
    loading: true,
    error: ''
  })
  const [form, setForm] = useState<TechnicianFormState>({
    fullName: '',
    city: '',
    postalCode: '',
    serviceArea: '',
    skills: [],
    available: false,
  })

  useEffect(() => {
    let active = true
    api.get<TechnicianProfileData['technician']>('/api/v1/technicians/profile')
      .then(technician => {
        if (!active || !technician) return
        setData(d => ({ ...d, technician, loading: false }))
        setForm({
          fullName: technician.full_name || '',
          city: technician.city,
          postalCode: technician.postal_code || '',
          serviceArea: technician.service_area,
          skills: technician.skills,
          available: technician.is_available,
        })
      })
      .catch((e: Error) => {
        if (active) setData(d => ({ ...d, error: e.message, loading: false }))
      })
    return () => { active = false }
  }, [])

  if (data.loading) return <div className="p-8 text-center text-gray-500">Loading profile…</div>

  if (!data.technician) return <div className="text-center text-gray-500">Profile not found</div>

  async function handleSave() {
    const currentTechnician = data.technician
    if (!currentTechnician) return
    setData(d => ({ ...d, loading: true }))
    try {
      await api.patch('/api/v1/technicians/profile', {
        city: form.city,
        postal_code: form.postalCode,
        service_area: form.serviceArea,
        skills: form.skills,
        is_available: form.available,
      })
      if (form.fullName !== (currentTechnician.full_name || '')) {
        await api.patch('/api/v1/auth/me/profile', { full_name: form.fullName })
      }
      const technician = await api.get<TechnicianProfileData['technician']>('/api/v1/technicians/profile')
      setData(d => ({ ...d, technician, loading: false }))
    } catch (e: any) {
      setData(d => ({ ...d, error: e.message, loading: false }))
    }
  }

  const allSkills = ['solar_panel', 'inverter', 'electrical', 'monitoring', 'battery', 'structural']

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Technician Profile</h1>
        <p className="text-gray-600">Manage your professional profile and availability</p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Profile Information</CardTitle>
          <Badge variant={data.technician.verification_status === 'verified' ? 'success' : 'warning'}><Shield className="h-3 w-3 mr-1" /> {statusString(data.technician.verification_status)}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Full Name" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} leftIcon={<User className="h-5 w-5 text-gray-400" />} />
          <Input label="Email" value={user?.email || ''} disabled leftIcon={<User className="h-5 w-5 text-gray-400" />} />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={e => setForm({...form, city: e.target.value})} leftIcon={<MapPin className="h-5 w-5 text-gray-400" />} />
            <Input label="Postal Code" value={form.postalCode} onChange={e => setForm({...form, postalCode: e.target.value})} leftIcon={<MapPin className="h-5 w-5 text-gray-400" />} />
          </div>
          <Input label="Service Area" value={form.serviceArea} onChange={e => setForm({...form, serviceArea: e.target.value})} placeholder="e.g. Metro Area, County" leftIcon={<MapPin className="h-5 w-5 text-gray-400" />} />
          <div>
            <label className="label">Skills</label>
            <div className="flex flex-wrap gap-2">
              {allSkills.map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.skills.includes(s)}
                    onChange={e => setForm({...form, skills: e.target.checked ? [...form.skills, s] : form.skills.filter(x => x !== s)})}
                    className="rounded border-gray-300 text-solar-600 focus:ring-solar-500"
                  />
                  <span className="text-sm">{s.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-gray-400" /><span>Available for new assignments</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.available}
              onChange={e => setForm({...form, available: e.target.checked})}
              className="sr-only peer"
            />
            <div
              className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-solar-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-solar-600"
            />
          </div>
          <Button onClick={handleSave} disabled={data.loading}>Save Profile</Button>
        </CardContent>
      </Card>

      <Card className="border-yellow-200">
        <CardHeader><CardTitle className="text-yellow-700"><Shield className="h-5 w-5 mr-1" /> Verification Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-gray-900">Verified Technician</p>
              <p className="text-sm text-gray-500">Your credentials have been verified by SPMS admin.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}