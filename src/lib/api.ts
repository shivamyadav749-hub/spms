import { appStore } from '../services/store'
import {
  Installation,
  DashboardData,
  Alert,
  TechnicianProfile,
  ServiceRequest,
  ServiceRecord,
  Warranty,
  ComponentItem,
} from '../types'

// Simulated network delay helper
const delay = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms))

export const api = {
  get: async <T>(path: string): Promise<T> => {
    await delay(30)

    // /api/v1/installations
    if (path === '/api/v1/installations' || path.startsWith('/api/v1/installations?')) {
      const list = appStore.getInstallations()
      return { installations: list, total: list.length } as unknown as T
    }

    // /api/v1/installations/:id/dashboard
    const dashMatch = path.match(/^\/api\/v1\/installations\/([^/?]+)\/dashboard/)
    if (dashMatch) {
      return appStore.getDashboardData(dashMatch[1]) as unknown as T
    }

    // /api/v1/installations/:id/performance
    const perfMatch = path.match(/^\/api\/v1\/installations\/([^/?]+)\/performance/)
    if (perfMatch) {
      return appStore.getDashboardData(perfMatch[1]) as unknown as T
    }

    // /api/v1/installations/:id/alerts
    const alertsMatch = path.match(/^\/api\/v1\/installations\/([^/?]+)\/alerts/)
    if (alertsMatch) {
      const list = appStore.getAlerts(alertsMatch[1])
      return {
        alerts: list,
        total: list.length,
        active_count: list.filter(a => a.status === 'active').length,
      } as unknown as T
    }

    // /api/v1/installations/:id/warranties
    const warMatch = path.match(/^\/api\/v1\/installations\/([^/?]+)\/warranties/)
    if (warMatch) {
      return appStore.getWarranties(warMatch[1]) as unknown as T
    }

    // /api/v1/installations/:id/components
    const compMatch = path.match(/^\/api\/v1\/installations\/([^/?]+)\/components/)
    if (compMatch) {
      return appStore.getComponents(compMatch[1]) as unknown as T
    }

    // /api/v1/service-requests/installations/:id/service-history
    const histMatch = path.match(/^\/api\/v1\/service-requests\/installations\/([^/?]+)\/service-history/)
    if (histMatch) {
      return appStore.getServiceHistory(histMatch[1]) as unknown as T
    }

    // /api/v1/service-requests/:id
    const singleReqMatch = path.match(/^\/api\/v1\/service-requests\/([^/?]+)$/)
    if (singleReqMatch) {
      const req = appStore.getServiceRequestById(singleReqMatch[1])
      if (!req) throw new Error('Service request not found')
      return req as unknown as T
    }

    // /api/v1/service-requests
    if (path.startsWith('/api/v1/service-requests')) {
      return appStore.getServiceRequests() as unknown as T
    }

    // /api/v1/technicians/profile
    if (path === '/api/v1/technicians/profile') {
      const tech = appStore.getTechnicianProfile('1863ce77-a759-40bc-805d-bc75b963be96')
      return (tech || null) as unknown as T
    }

    // /api/v1/technicians
    if (path.startsWith('/api/v1/technicians')) {
      const url = new URL(path, 'http://localhost')
      const city = url.searchParams.get('city') || undefined
      const postal_code = url.searchParams.get('postal_code') || undefined
      const skills = url.searchParams.get('skills') || undefined
      const lat = url.searchParams.has('latitude') ? parseFloat(url.searchParams.get('latitude')!) : undefined
      const lon = url.searchParams.has('longitude') ? parseFloat(url.searchParams.get('longitude')!) : undefined
      const radius = url.searchParams.has('radius_km') ? parseFloat(url.searchParams.get('radius_km')!) : undefined

      return appStore.getTechnicians({
        city,
        postal_code,
        skills,
        latitude: lat,
        longitude: lon,
        radius_km: radius,
      }) as unknown as T
    }

    // /api/v1/installations/:id
    const singleInstMatch = path.match(/^\/api\/v1\/installations\/([^/?]+)$/)
    if (singleInstMatch) {
      const inst = appStore.getInstallation(singleInstMatch[1])
      if (!inst) throw new Error('Installation not found')
      return inst as unknown as T
    }

    throw new Error(`Unhandled GET path: ${path}`)
  },

  post: async <T>(path: string, body?: any): Promise<T> => {
    await delay(50)

    // /api/v1/ai/chat
    if (path === '/api/v1/ai/chat') {
      const { installation_id, message } = body || {}
      const res = appStore.chatAI(installation_id, message)
      return {
        message: res.message,
        session_id: res.session_id,
        data_references: [],
      } as unknown as T
    }

    // /api/v1/installations
    if (path === '/api/v1/installations') {
      return appStore.createInstallation(body) as unknown as T
    }

    // /api/v1/service-requests
    if (path === '/api/v1/service-requests') {
      return appStore.createServiceRequest(body) as unknown as T
    }

    // /api/v1/service-requests/:id/records
    const recMatch = path.match(/^\/api\/v1\/service-requests\/([^/?]+)\/records/)
    if (recMatch) {
      return appStore.createServiceRecord({
        ...body,
        service_request_id: recMatch[1],
      }) as unknown as T
    }

    // /api/v1/installations/:id/components
    const compMatch = path.match(/^\/api\/v1\/installations\/([^/?]+)\/components/)
    if (compMatch) {
      return appStore.createComponent({
        ...body,
        installation_id: compMatch[1],
      }) as unknown as T
    }

    throw new Error(`Unhandled POST path: ${path}`)
  },

  patch: async <T>(path: string, body?: any): Promise<T> => {
    await delay(40)

    // /api/v1/installations/alerts/:id
    const alertMatch = path.match(/^\/api\/v1\/installations\/alerts\/([^/?]+)/)
    if (alertMatch) {
      return appStore.updateAlertStatus(alertMatch[1], body.status) as unknown as T
    }

    // /api/v1/service-requests/:id
    const reqMatch = path.match(/^\/api\/v1\/service-requests\/([^/?]+)/)
    if (reqMatch) {
      return appStore.updateServiceRequest(reqMatch[1], body) as unknown as T
    }

    // /api/v1/technicians/profile
    if (path === '/api/v1/technicians/profile') {
      return appStore.updateTechnicianProfile(
        body.user_id || '1863ce77-a759-40bc-805d-bc75b963be96',
        body
      ) as unknown as T
    }

    // /api/v1/auth/me/profile
    if (path === '/api/v1/auth/me/profile') {
      return appStore.updateUserProfile(
        body.id || '0ad68548-4c13-4908-8a22-32101f18400b',
        body
      ) as unknown as T
    }

    // /api/v1/installations/:id
    const instMatch = path.match(/^\/api\/v1\/installations\/([^/?]+)/)
    if (instMatch) {
      return appStore.updateInstallation(instMatch[1], body) as unknown as T
    }

    throw new Error(`Unhandled PATCH path: ${path}`)
  },

  delete: async <T>(path: string): Promise<T> => {
    await delay(30)
    return undefined as T
  },
}
