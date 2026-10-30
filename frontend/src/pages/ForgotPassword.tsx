import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sun, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button, Input } from '../components/ui'

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-solar-700">
            <Sun className="h-8 w-8" />
            SPMS
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">{success ? 'Check your email' : 'Reset password'}</h1>
          <p className="mt-2 text-gray-600">{success ? 'We\'ve sent password reset instructions to your email.' : 'Enter your email to receive a reset link'}</p>
        </div>

        <div className="card p-6">
          {success ? (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">If an account exists for that email, you'll receive a reset link shortly.</p>
              <Link to="/login" className="mt-6 inline-block text-solar-600 hover:underline">Back to sign in</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Input id="email" label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" leftIcon={<Mail className="h-5 w-5 text-gray-400" />} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-gray-600">
            <Link to="/login" className="text-solar-600 hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}