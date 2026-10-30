import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sun, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button, Input } from '../components/ui'

export function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', role: 'owner' as 'owner' | 'technician' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    const { error: err } = await signUp(form.email, form.password, form.fullName, form.role)
    setLoading(false)
    if (err) setError(err.message)
    else navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-solar-700">
            <Sun className="h-8 w-8" />
            SPMS
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-600">Start monitoring your solar system today</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Input id="fullName" label="Full Name" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} required autoComplete="name" leftIcon={<User className="h-5 w-5 text-gray-400" />} />

            <Input id="email" label="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required autoComplete="email" leftIcon={<Mail className="h-5 w-5 text-gray-400" />} />

            <Input id="password" label="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required autoComplete="new-password" leftIcon={<Lock className="h-5 w-5 text-gray-400" />} />

            <Input id="confirmPassword" label="Confirm Password" type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} required autoComplete="new-password" leftIcon={<Lock className="h-5 w-5 text-gray-400" />} />

            <fieldset className="space-y-3">
              <legend className="label">I am a</legend>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-solar-300 cursor-pointer transition-colors has-[:checked]:border-solar-500 has-[:checked]:bg-solar-50">
                  <input type="radio" name="role" value="owner" checked={form.role === 'owner'} onChange={e => setForm({...form, role: 'owner'})} className="sr-only" />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-solar-100 text-solar-600 flex items-center justify-center"><Sun className="h-5 w-5" /></div>
                    <div><p className="font-medium text-gray-900">Homeowner</p><p className="text-xs text-gray-500">Monitor my solar system</p></div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-solar-300 cursor-pointer transition-colors has-[:checked]:border-solar-500 has-[:checked]:bg-solar-50">
                  <input type="radio" name="role" value="technician" checked={form.role === 'technician'} onChange={e => setForm({...form, role: 'technician'})} className="sr-only" />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-deepblue-100 text-deepblue-600 flex items-center justify-center"><User className="h-5 w-5" /></div>
                    <div><p className="font-medium text-gray-900">Technician</p><p className="text-xs text-gray-500">Service solar installations</p></div>
                  </div>
                </label>
              </div>
            </fieldset>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-solar-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}