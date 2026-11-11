import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Sun, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button, Input } from '../components/ui'

const LOGO_URL = '/assets/aistudio/WhatsApp_Image_2026-11-11_at_1.59.36_PM_3c8e8888.jpeg'

export function Register() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'owner' as 'owner' | 'technician',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError('')
    setLoading(true)
    const { error: err } = await signUp(form.email, form.password, form.fullName, form.role)
    setLoading(false)
    if (err) setError(err.message)
    else navigate(form.role === 'technician' ? '/technician/dashboard' : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <Link to="/" className="flex items-center gap-3 group" aria-label="SPMS Home">
          <img
            src={LOGO_URL}
            alt="SPMS — Solar Performance Monitoring System"
            className="h-10 w-auto rounded-lg object-contain border border-gray-200 shadow-xs group-hover:opacity-90 transition-opacity"
          />
          <span className="text-lg font-bold text-solar-700">SPMS</span>
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center">
              <img
                src={LOGO_URL}
                alt="SPMS Logo"
                className="h-20 w-auto rounded-xl object-contain border border-gray-200 shadow-sm"
              />
            </Link>
            <h1 className="mt-5 text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="mt-2 text-gray-600 text-sm">Start monitoring your solar system today</p>
          </div>

          <div className="card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Input
                id="fullName"
                label="Full Name"
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                required
                autoComplete="name"
                placeholder="Alex Taylor"
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
              />

              <Input
                id="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                placeholder="alex@example.com"
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
              />

              <Input
                id="password"
                label="Password"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
              />

              <Input
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
              />

              <fieldset className="space-y-2">
                <legend className="label">I am a</legend>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-solar-300 cursor-pointer transition-colors has-[:checked]:border-solar-500 has-[:checked]:bg-solar-50">
                    <input
                      type="radio"
                      name="role"
                      value="owner"
                      checked={form.role === 'owner'}
                      onChange={() => setForm({ ...form, role: 'owner' })}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-solar-100 text-solar-600 flex items-center justify-center">
                        <Sun className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Homeowner</p>
                        <p className="text-[10px] text-gray-500">Monitor system</p>
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 hover:border-solar-300 cursor-pointer transition-colors has-[:checked]:border-solar-500 has-[:checked]:bg-solar-50">
                    <input
                      type="radio"
                      name="role"
                      value="technician"
                      checked={form.role === 'technician'}
                      onChange={() => setForm({ ...form, role: 'technician' })}
                      className="sr-only"
                    />
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-deepblue-100 text-deepblue-600 flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-xs">Technician</p>
                        <p className="text-[10px] text-gray-500">Service systems</p>
                      </div>
                    </div>
                  </label>
                </div>
              </fieldset>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-solar-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
