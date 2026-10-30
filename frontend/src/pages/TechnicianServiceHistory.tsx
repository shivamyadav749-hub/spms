import { Card, CardHeader, CardTitle, CardContent, Badge } from '../components/ui'
import { FileText, Calendar, Wrench, User, CheckCircle } from 'lucide-react'

export function TechnicianServiceHistory() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service History</h1>
        <p className="text-gray-600">Your completed service records</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Completed Records</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { date: '2024-01-08', request: 'SR-001', type: 'Annual Inspection', installation: 'Demo Home Solar', findings: 'Panels cleaned, inverter verified. System at 98% expected.' },
              { date: '2023-12-15', request: 'SR-005', type: 'Inverter Repair', installation: 'Office Solar', findings: 'Replaced faulty communication module. Restored monitoring.' },
            ].map((r, i) => (
              <RecordRow key={i} {...r} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RecordRow({ date, request, type, installation, findings }: any) {
  return (
    <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-solar-100 text-solar-600 flex items-center justify-center"><FileText className="h-6 w-6" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{type}</h4>
              <Badge variant="success">Completed</Badge>
            </div>
            <p className="text-sm text-gray-500">{request} • {installation} • {new Date(date).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
      <div className="mt-3"><span className="text-gray-500">Findings: </span><span className="text-gray-900">{findings}</span></div>
    </div>
  )
}