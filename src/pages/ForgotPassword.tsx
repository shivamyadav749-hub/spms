import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button, Input } from '../components/ui'

const LOGO_URL = '/assets/aistudio/WhatsApp_Image_2026-11-11_at_1.59.36_PM_3c8e8888.jpeg'

export function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)
    if (err) setError(err.message)
    else setSuccess(true)
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
            <h1 className="mt-5 text-2xl font-bold text-gray-900">{success ? 'Check your email' : 'Reset password'}</h1>
            <p className="mt-2 text-gray-600 text-sm">
              {success ? "We've sent password reset instructions to your email." : 'Enter your email to receive a reset link'}
            </p>
          </div>

          <div className="card p-6">
            {success ? (
              <div className="text-center py-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <p className="text-gray-600 text-sm mb-6">
                  If an account exists for that email, you'll receive a password reset link shortly.
                </p>
                <Link to="/login">
                  <Button className="w-full">Back to sign in</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <Input
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            )}

            {!success && (
              <p className="mt-6 text-center text-sm text-gray-600">
                <Link to="/login" className="text-solar-600 hover:underline">Back to sign in</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
