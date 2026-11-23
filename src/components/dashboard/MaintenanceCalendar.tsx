import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BrainCircuit,
  Wrench,
  CheckCircle2,
  Clock,
  Plus,
  X,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Select } from '../ui'
import { api } from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { MaintenanceEvent, ServiceRequest } from '../../types'

interface MaintenanceCalendarProps {
  installationId: string
  events: MaintenanceEvent[]
  onScheduled?: () => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatShortDate(dateKey: string): string {
  return new Date(dateKey + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function eventOccursOnDate(event: MaintenanceEvent, dateKey: string): boolean {
  if (event.window_end_date) {
    return dateKey >= event.date && dateKey <= event.window_end_date
  }
  return event.date === dateKey
}

export function MaintenanceCalendar({
  installationId,
  events,
  onScheduled,
}: MaintenanceCalendarProps) {
  const { user } = useAuth()
  const todayKey = useMemo(() => toDateKey(new Date()), [])

  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [filterKind, setFilterKind] = useState<'all' | 'scheduled_check' | 'ml_predicted_window'>('all')

  // Quick schedule state
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [schedDate, setSchedDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    return toDateKey(d)
  })
  const [schedCategory, setSchedCategory] = useState('inspection')
  const [schedDesc, setSchedDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formNotice, setFormNotice] = useState('')

  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const firstDayOfWeek = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells: Array<{ dateKey: string; dayNum: number; inCurrentMonth: boolean }> = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i)
      cells.push({
        dateKey: toDateKey(d),
        dayNum: d.getDate(),
        inCurrentMonth: false,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      cells.push({
        dateKey: toDateKey(d),
        dayNum: day,
        inCurrentMonth: true,
      })
    }

    // Next month trailing padding to complete 6 rows or 5 rows cleanly
    const remainder = cells.length % 7
    if (remainder !== 0) {
      const needed = 7 - remainder
      for (let i = 1; i <= needed; i++) {
        const d = new Date(year, month + 1, i)
        cells.push({
          dateKey: toDateKey(d),
          dayNum: i,
          inCurrentMonth: false,
        })
      }
    }

    return cells
  }, [viewMonth])

  const filteredEvents = useMemo(() => {
    if (filterKind === 'all') return events
    if (filterKind === 'scheduled_check') {
      return events.filter(e => e.kind === 'scheduled_check' || e.kind === 'routine_inspection')
    }
    return events.filter(e => e.kind === 'ml_predicted_window')
  }, [events, filterKind])

  const agendaEvents = useMemo(() => {
    if (selectedDate) {
      return filteredEvents.filter(ev => eventOccursOnDate(ev, selectedDate))
    }
    return filteredEvents
  }, [filteredEvents, selectedDate])

  function handlePrevMonth() {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function handleNextMonth() {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  function handleJumpToday() {
    const now = new Date()
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(null)
  }

  function handleBookFromWindow(ev: MaintenanceEvent) {
    setSchedDate(ev.date)
    setSchedCategory(
      ev.title.toLowerCase().includes('inverter')
        ? 'inverter_error'
        : ev.title.toLowerCase().includes('cleaning')
        ? 'panel_cleaning'
        : 'inspection'
    )
    setSchedDesc(`Preventive service for ${ev.title.replace(/^ML Predicted:\s*/, '')}`)
    setShowScheduleForm(true)
    setFormNotice('')
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!installationId || !schedDate || !schedDesc.trim()) return

    setSubmitting(true)
    setFormNotice('')
    try {
      await api.post<ServiceRequest>('/api/v1/service-requests', {
        installation_id: installationId,
        requested_by: user?.id || '0ad68548-4c13-4908-8a22-32101f18400b',
        issue_category: schedCategory,
        description: schedDesc.trim(),
        scheduled_date: schedDate,
      })
      setShowScheduleForm(false)
      setSchedDesc('')
      setSelectedDate(schedDate)
      setFormNotice(`Scheduled check added for ${formatShortDate(schedDate)}.`)
      onScheduled?.()
    } finally {
      setSubmitting(false)
    }
  }

  const mlCount = events.filter(e => e.kind === 'ml_predicted_window').length
  const scheduledCount = events.filter(e => e.kind !== 'ml_predicted_window').length

  return (
    <Card>
      <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-deepblue-50 text-deepblue-600 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle>Maintenance Calendar</CardTitle>
              <Badge variant="success">{scheduledCount} Scheduled</Badge>
              <Badge variant="info">{mlCount} ML Window{mlCount === 1 ? '' : 's'}</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Upcoming scheduled checks alongside preventive service windows predicted by ML telemetry diagnostics
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full lg:w-auto">
          <div className="grid grid-cols-3 sm:inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterKind('all')}
              className={`px-2.5 py-1.5 sm:py-1 rounded-md font-medium transition-colors text-center ${
                filterKind === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterKind('scheduled_check')}
              className={`px-2.5 py-1.5 sm:py-1 rounded-md font-medium transition-colors text-center ${
                filterKind === 'scheduled_check'
                  ? 'bg-white text-solar-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Scheduled
            </button>
            <button
              type="button"
              onClick={() => setFilterKind('ml_predicted_window')}
              className={`px-2.5 py-1.5 sm:py-1 rounded-md font-medium transition-colors text-center ${
                filterKind === 'ml_predicted_window'
                  ? 'bg-white text-deepblue-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ML Windows
            </button>
          </div>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setShowScheduleForm(prev => !prev)}
            className="gap-1 w-full sm:w-auto justify-center"
          >
            <Plus className="h-3.5 w-3.5" />
            Schedule Check
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-4">
        {formNotice && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {formNotice}
            </span>
            <button type="button" onClick={() => setFormNotice('')} className="text-green-700 hover:text-green-900">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {showScheduleForm && (
          <form
            onSubmit={handleScheduleSubmit}
            className="rounded-xl border border-solar-200 bg-solar-50/40 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">Schedule Preventive Maintenance Check</h4>
              <button
                type="button"
                onClick={() => setShowScheduleForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Target Date"
                type="date"
                value={schedDate}
                onChange={e => setSchedDate(e.target.value)}
                required
              />
              <Select
                label="Check Type"
                value={schedCategory}
                onChange={e => setSchedCategory(e.target.value)}
                options={[
                  { value: 'inspection', label: 'Routine Inspection' },
                  { value: 'panel_cleaning', label: 'Panel Cleaning' },
                  { value: 'performance_drop', label: 'Performance Check' },
                  { value: 'inverter_error', label: 'Inverter & MPPT Check' },
                  { value: 'wiring_check', label: 'Wiring & Thermal Check' },
                ]}
              />
              <Input
                label="Notes / Focus"
                value={schedDesc}
                onChange={e => setSchedDesc(e.target.value)}
                placeholder="e.g., Inspect inverter DC bus & clean panels"
                required
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowScheduleForm(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? 'Saving…' : 'Add to Calendar'}
              </Button>
            </div>
          </form>
        )}

        <div className="grid lg:grid-cols-12 gap-5 sm:gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">{monthLabel}</h3>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <Button type="button" variant="outline" size="sm" onClick={handlePrevMonth} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleJumpToday}>
                  Today
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleNextMonth} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-[10px] sm:text-[11px] font-semibold text-gray-500 pb-1">
              {WEEKDAYS.map(day => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {calendarCells.map(cell => {
                const dayEvents = filteredEvents.filter(ev => eventOccursOnDate(ev, cell.dateKey))
                const hasMl = dayEvents.some(e => e.kind === 'ml_predicted_window')
                const hasScheduled = dayEvents.some(e => e.kind === 'scheduled_check')
                const hasRoutine = dayEvents.some(e => e.kind === 'routine_inspection')
                const isToday = cell.dateKey === todayKey
                const isSelected = cell.dateKey === selectedDate

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() =>
                      setSelectedDate(prev => (prev === cell.dateKey ? null : cell.dateKey))
                    }
                    className={`min-h-[44px] sm:min-h-[64px] rounded-md sm:rounded-lg border p-1 sm:p-1.5 text-left flex flex-col justify-between transition-colors ${
                      isSelected
                        ? 'border-deepblue-600 bg-deepblue-50/70 ring-1 ring-deepblue-500'
                        : isToday
                        ? 'border-solar-500 bg-solar-50/50'
                        : hasMl
                        ? 'border-amber-200 bg-amber-50/35 hover:bg-amber-50/70'
                        : cell.inCurrentMonth
                        ? 'border-gray-200 bg-white hover:bg-gray-50'
                        : 'border-gray-100 bg-gray-50/60 text-gray-400 hover:bg-gray-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-[11px] sm:text-xs font-medium ${
                          isToday
                            ? 'text-solar-700 font-bold'
                            : cell.inCurrentMonth
                            ? 'text-gray-800'
                            : 'text-gray-400'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[9px] sm:text-[10px] font-semibold text-gray-500">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 w-full mt-1">
                      {hasScheduled && (
                        <div className="h-1.5 w-full rounded-full bg-solar-500" title="Scheduled Check" />
                      )}
                      {hasMl && (
                        <div
                          className="h-1.5 w-full rounded-full bg-amber-500"
                          title="ML Predicted Service Window"
                        />
                      )}
                      {hasRoutine && (
                        <div className="h-1.5 w-full rounded-full bg-deepblue-500" title="Routine Inspection" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-solar-500" />
                Scheduled Service Check
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                ML Predicted Service Window
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-deepblue-500" />
                Routine / Warranty Check
              </span>
            </div>
          </div>

          {/* Right-hand Upcoming & Selected Date Agenda */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedDate
                  ? `Events on ${formatShortDate(selectedDate)}`
                  : 'Upcoming Maintenance & ML Windows'}
              </h3>
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="text-xs font-medium text-deepblue-600 hover:text-deepblue-700"
                >
                  Show All
                </button>
              )}
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {agendaEvents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-xs text-gray-500">
                  No scheduled checks or ML service windows on this date.
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedDate) setSchedDate(selectedDate)
                        setShowScheduleForm(true)
                      }}
                    >
                      Schedule Check for {selectedDate ? formatShortDate(selectedDate) : 'Date'}
                    </Button>
                  </div>
                </div>
              ) : (
                agendaEvents.map(ev => {
                  const isMl = ev.kind === 'ml_predicted_window'
                  const isScheduled = ev.kind === 'scheduled_check'
                  return (
                    <div
                      key={ev.id}
                      className={`rounded-lg border p-3 space-y-1.5 ${
                        isMl
                          ? 'border-amber-200 bg-amber-50/40'
                          : isScheduled
                          ? 'border-solar-200 bg-solar-50/35'
                          : 'border-gray-200 bg-gray-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isMl ? (
                            <BrainCircuit className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          ) : isScheduled ? (
                            <Wrench className="h-4 w-4 text-solar-600 flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-deepblue-600 flex-shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {ev.title}
                          </span>
                        </div>
                        <Badge
                          variant={
                            ev.priority === 'high'
                              ? 'warning'
                              : isMl
                              ? 'info'
                              : isScheduled
                              ? 'success'
                              : 'default'
                          }
                        >
                          {isMl ? 'ML Window' : isScheduled ? 'Scheduled' : 'Routine'}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-600">
                        <span>
                          {ev.window_end_date
                            ? `${formatShortDate(ev.date)} – ${formatShortDate(ev.window_end_date)}`
                            : formatShortDate(ev.date)}
                        </span>
                        {ev.technician_name && (
                          <span className="text-solar-700">• Tech: {ev.technician_name}</span>
                        )}
                        {ev.confidence !== undefined && (
                          <span className="text-deepblue-700">
                            • {Math.round(ev.confidence * 100)}% ML confidence
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 leading-relaxed">{ev.description}</p>

                      <div className="pt-1 flex items-center justify-end gap-2">
                        {isMl ? (
                          <button
                            type="button"
                            onClick={() => handleBookFromWindow(ev)}
                            className="text-[11px] font-semibold text-deepblue-700 hover:underline"
                          >
                            Book This Service Window →
                          </button>
                        ) : isScheduled ? (
                          <Link
                            to="/service-requests"
                            className="text-[11px] font-semibold text-solar-700 hover:underline"
                          >
                            Manage Request →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
