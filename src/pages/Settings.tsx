import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '../components/ui'
import { User, Bell, Palette, Globe, RefreshCcw, Check, Phone } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { appStore } from '../services/store'

export function Settings() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || '+1-555-0100')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.full_name || '')
      if (user.phone) setPhone(user.phone)
    }
  }, [user])

  async function handleSave() {
    setSaving(true)
    setSavedSuccess(false)
    try {
      await api.patch('/api/v1/auth/me/profile', {
        id: user?.id,
        full_name: name,
        phone,
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2500)
    } catch (e: any) {
      alert('Failed to update profile: ' + (e.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  function handleResetDemo() {
    if (window.confirm('Reset all simulated data, readings, alerts, and service requests back to factory defaults?')) {
      appStore.resetToDemo()
      setResetMessage('All demo telemetry and records reset successfully.')
      setTimeout(() => {
        setResetMessage('')
        window.location.reload()
      }, 1000)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 text-sm">Manage your profile, alerts preferences, and simulated environment</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            leftIcon={<User className="h-4 w-4 text-gray-400" />}
          />
          <Input
            label="Email Address"
            value={user?.email || ''}
            disabled
            leftIcon={<User className="h-4 w-4 text-gray-400" />}
          />
          <Input
            label="Contact Phone"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1-555-0100"
            leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
          />
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="info">{user?.role?.toUpperCase()}</Badge>
            <span className="text-xs text-gray-500">Current assigned account role</span>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            {savedSuccess && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Saved successfully!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications & Display</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-3 min-w-0">
              <Bell className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">Email alerts & notifications</p>
                <p className="text-xs text-gray-500">Receive alerts when generation falls below 70% threshold</p>
              </div>
            </div>
            <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-solar-600 focus:ring-solar-500 flex-shrink-0" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Language</p>
                <p className="text-xs text-gray-500">Interface language</p>
              </div>
            </div>
            <select className="input w-full sm:w-36 text-xs">
              <option>English</option>
              <option>Hindi</option>
              <option>Spanish</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Theme</p>
                <p className="text-xs text-gray-500">Color scheme</p>
              </div>
            </div>
            <select className="input w-full sm:w-36 text-xs">
              <option>Light Clean</option>
              <option>System</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-solar-200 bg-solar-50/50">
        <CardHeader><CardTitle className="text-solar-800">Simulated Environment</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-gray-600 leading-relaxed">
            The database runs locally in your browser storage. If you want to reset all simulated readings,
            alerts, and service records back to the fresh demo state, click below.
          </p>
          <Button variant="outline" onClick={handleResetDemo}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Reset Demo Seed Data
          </Button>
          {resetMessage && (
            <p className="text-xs text-green-700 font-medium">{resetMessage}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
