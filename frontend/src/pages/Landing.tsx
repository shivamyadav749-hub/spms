import { Link } from 'react-router-dom'
import { Sun, Zap, Bot, Shield, Users, ArrowRight, CheckCircle, AlertTriangle, FileText } from 'lucide-react'
import { Button } from '../components/ui'

export function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-solar-50 to-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-solar-100 text-solar-700 text-sm font-medium mb-6">
              <Sun className="h-4 w-4" />
              <span>DEMO MODE — Simulated solar data. Not live hardware measurements.</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight mb-6">
              Your Solar Energy.<br />
              <span className="text-solar-600">Simplified.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              SPMS helps homeowners monitor solar generation, understand performance,
              identify issues, manage warranties, and find nearby technicians — all in one simple dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register"><Button size="lg" className="w-full sm:w-auto"><span className="mr-2">Get Started</span><ArrowRight className="h-5 w-5" /></Button></Link>
              <Link to="/dashboard"><Button variant="outline" size="lg" className="w-full sm:w-auto">Explore Dashboard</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything you need to understand your solar system</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Real-time Generation', desc: 'See current power, daily & monthly energy with clear charts. All values labelled as simulated.' },
              { icon: Bot, title: 'AI Solar Assistant', desc: 'Ask questions in plain English or Hindi. Get grounded explanations based on your data.' },
              { icon: Shield, title: 'Warranty Tracking', desc: 'Component-level warranties with expiry alerts. Never miss a coverage deadline.' },
              { icon: Users, title: 'Technician Network', desc: 'Search verified technicians by city, distance, and skills. Create service requests in one click.' },
              { icon: AlertTriangle, title: 'Smart Alerts', desc: 'Automatic detection of low generation, high temperature, and stale data with actionable recommendations.' },
              { icon: FileText, title: 'Service History', desc: 'Complete maintenance records with findings, repair notes, and technician details.' },
            ].map((f, i) => (
              <div key={i} className="card p-6 hover:shadow-md transition-shadow">
                <div className="h-12 w-12 rounded-lg bg-solar-100 text-solar-600 flex items-center justify-center mb-4">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up as a homeowner. Verify your email and set up your profile.' },
              { step: '02', title: 'Add Installation', desc: 'Enter system details (capacity, panels, inverter). SPMS generates a unique SPMS-ID.' },
              { step: '03', title: 'Monitor & Act', desc: 'View simulated generation, get AI insights, manage warranties, and request service.' },
            ].map((s, i) => (
              <div key={i} className="relative card p-6">
                <span className="absolute -top-3 left-6 bg-white px-2 text-2xl font-bold text-solar-600">{s.step}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-4 mb-2">{s.title}</h3>
                <p className="text-gray-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo notice */}
      <section className="py-12 bg-solar-50 border-t border-solar-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-solar-800 font-medium">
            <strong>Demo Notice:</strong> This version uses simulated solar readings for demonstration.
            No real hardware is connected. All data is clearly labelled as simulated.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4">SPMS</h4>
              <p className="text-sm">Solar Performance Monitoring System — Making solar energy simple for everyone.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/dashboard" className="hover:text-white">Dashboard</Link></li>
                <li><Link to="/ai-assistant" className="hover:text-white">AI Assistant</Link></li>
                <li><Link to="/technicians" className="hover:text-white">Technicians</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            © 2026 SPMS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}