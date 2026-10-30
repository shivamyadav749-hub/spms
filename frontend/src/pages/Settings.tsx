import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '../components/ui'
import { User, Bell, Shield, Palette, Globe } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export function Settings() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.full_name || '')
    }
  }, [user])

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await api.patch('/api/v1/auth/me/profile', {
        full_name: name,
        phone: phone,
      })
      setSaving(false)
      alert('Profile updated successfully')
    } catch (e: any) {
      setError(e.message || 'Failed to update profile')
      setSaving(false)
      alert('Failed to update profile: ' + (e.message || 'Unknown error'))
    }
  }

  const allSkills = ['solar_panel', 'inverter', 'electrical', 'monitoring', 'battery', 'structural']

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} leftIcon={<User className="h-5 w-5 text-gray-400" />} />
          <Input label="Email" value={user?.email || ''} disabled leftIcon={<User className="h-5 w-5 text-gray-400" />} />
          <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1-555-0100" leftIcon={<User className="h-5 w-5 text-gray-400" />} />
          <div className="flex items-center gap-2">
            <Badge variant="info">{user?.role}</Badge>
            <span className="text-sm text-gray-500">Role cannot be changed here</span>
          </div>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mt-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Bell className="h-5 w-5 text-gray-400" /><span>Email notifications</span></div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-solar-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-solar-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Globe className="h-5 w-5 text-gray-400" /><span>Language</span></div>
            <select className="input w-auto"><option>English</option><option>Hindi</option></select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3"><Palette className="h-5 w-5 text-gray-400" /><span>Theme</span></div>
            <select className="input w-auto"><option>System</option><option>Light</option><option>Dark</option></select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader><CardTitle className="text-red-700">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">Irreversible actions</p>
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  )
}