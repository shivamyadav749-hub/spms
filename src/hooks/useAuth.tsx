import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { AuthUser, UserRole } from '../types'
import { appStore } from '../services/store'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: Error }>
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ error?: Error }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error?: Error }>
  loginAsDemo: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const SESSION_STORAGE_KEY = 'spms_current_user_session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const fresh = appStore.getUserById(parsed.id)
        setUser(fresh || parsed)
      } else {
        // Default to Demo Homeowner so the app is immediately explorable
        const demoOwner = appStore.getUserByEmail('demo-owner@example.com')
        if (demoOwner) {
          setUser(demoOwner)
          localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(demoOwner))
        }
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveUserSession = (u: AuthUser | null) => {
    setUser(u)
    if (u) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(u))
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    }
  }

  async function signIn(email: string, _password: string) {
    const existing = appStore.getUserByEmail(email)
    if (existing) {
      saveUserSession(existing)
      return { error: undefined }
    }
    // If user signs in with any email, automatically create/log in demo profile
    const isTech = email.toLowerCase().includes('tech')
    const newUser: AuthUser = {
      id: `usr-${Date.now()}`,
      email,
      role: isTech ? 'technician' : 'owner',
      full_name: email.split('@')[0],
    }
    appStore.addUser(newUser)
    saveUserSession(newUser)
    return { error: undefined }
  }

  async function signUp(email: string, _password: string, fullName: string, role: UserRole) {
    const newUser: AuthUser = {
      id: `usr-${Date.now()}`,
      email,
      role,
      full_name: fullName,
    }
    appStore.addUser(newUser)
    if (role === 'technician') {
      appStore.updateTechnicianProfile(newUser.id, {
        full_name: fullName,
        city: 'Springfield',
        skills: ['solar_panel', 'inverter'],
      })
    }
    saveUserSession(newUser)
    return { error: undefined }
  }

  async function signOut() {
    saveUserSession(null)
  }

  async function resetPassword(_email: string) {
    return { error: undefined }
  }

  function loginAsDemo(role: UserRole) {
    const email = role === 'technician' ? 'demo-tech@example.com' : 'demo-owner@example.com'
    const demo = appStore.getUserByEmail(email)
    if (demo) {
      saveUserSession(demo)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
