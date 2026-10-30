import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '../components/ui'
import { User, MapPin, Wrench, Shield, CheckCircle, Check } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { TechnicianProfile as TechProfileType } from '../types'

export function TechnicianProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<TechProfileType | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [available, setAvailable] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const tech = await api.get<TechProfileType>('/api/v1/technicians/profile')
      if (tech) {
        setProfile(tech)
        setFullName(tech.full_name || user?.full_name || '')
        setCity(tech.city || 'Springfield')
        setPostalCode(tech.postal_code || '62701')
        setServiceArea(tech.service_area || 'Metro Area')
        setSkills(tech.skills || ['solar_panel', 'inverter', 'electrical'])
        setAvailable(tech.is_available ?? true)
      }
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSavedSuccess(false)
    try {
      const updated = await api.patch<TechProfileType>('/api/v1/technicians/profile', {
        user_id: user?.id || '1863ce77-a759-40bc-805d-bc75b963be96',
        full_name: fullName,
        city,
        postal_code: postalCode,
        service_area: serviceArea,
        skills,
        is_available: available,
      })
      setProfile(updated)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (e: any) {
      alert('Failed to update profile: ' + (e.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const allSkills = [
    { id: 'solar_panel', label: 'Solar Panel Array' },
    { id: 'inverter', label: 'Inverter & Power Electronics' },
    { id: 'electrical', label: 'Electrical & AC/DC Wiring' },
    { id: 'monitoring', label: 'Telemetry & Monitoring Sensors' },
    { id: 'battery', label: 'Battery Energy Storage' },
    { id: 'structural', label: 'Rooftop & Structural Racking' },
  ]

  if (loading) return <div className="p-8 text-center text-gray-500">Loading profile…</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Technician Profile</h1>
        <p className="text-gray-600 text-sm">Manage your professional credentials, service area, and job availability</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Professional Profile</CardTitle>
          <Badge variant={profile?.verification_status === 'verified' ? 'success' : 'warning'}>
            <Shield className="h-3 w-3 mr-1" /> Verified Professional
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            leftIcon={<User className="h-4 w-4 text-gray-400" />}
          />
          <Input
            label="Email Address"
            value={user?.email || 'demo-tech@example.com'}
            disabled
            leftIcon={<User className="h-4 w-4 text-gray-400" />}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="City"
              value={city}
              onChange={e => setCity(e.target.value)}
              leftIcon={<MapPin className="h-4 w-4 text-gray-400" />}
            />
            <Input
              label="Postal Code"
              value={postalCode}
              onChange={e => setPostalCode(e.target.value)}
              leftIcon={<MapPin className="h-4 w-4 text-gray-400" />}
            />
          </div>
          <Input
            label="Service Area"
            value={serviceArea}
            onChange={e => setServiceArea(e.target.value)}
            placeholder="e.g. Springfield Metro Area & County"
            leftIcon={<MapPin className="h-4 w-4 text-gray-400" />}
          />

          <div>
            <label className="label">Certified Skills & Specialties</label>
            <div className="grid sm:grid-cols-2 gap-2 mt-2">
              {allSkills.map(s => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={skills.includes(s.id)}
                    onChange={e => {
                      if (e.target.checked) setSkills([...skills, s.id])
                      else setSkills(skills.filter(x => x !== s.id))
                    }}
                    className="rounded border-gray-300 text-solar-600 focus:ring-solar-500"
                  />
                  <span className="font-medium text-gray-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-800">Available for customer dispatch</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={available}
                onChange={e => setAvailable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-solar-600"></div>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </Button>
            {savedSuccess && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Updated successfully!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50/40">
        <CardHeader><CardTitle className="text-green-800 text-sm">Certification & Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-7 w-7 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-900 text-sm">SPMS Certified Solar Technician</p>
              <p className="text-xs text-gray-600 mt-0.5">
                Qualified to perform warranty diagnostics, inverter maintenance, and official solar system inspections.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
