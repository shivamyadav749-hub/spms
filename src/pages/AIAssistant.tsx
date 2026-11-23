import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Select } from '../components/ui'
import { Send, Bot, Sparkles, Loader2, Info } from 'lucide-react'
import { api } from '../lib/api'
import { Installation } from '../types'

export function AIAssistant() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content:
        'Hello! I am your SPMS Solar Assistant. I have live access to your installation parameters, telemetry readings, alerts, and warranty statuses. How can I help you today?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [installations, setInstallations] = useState<Installation[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<string>('')

  useEffect(() => {
    fetchInstallations()
  }, [])

  async function fetchInstallations() {
    try {
      const res = await api.get<{ installations: Installation[] }>('/api/v1/installations')
      setInstallations(res.installations)
      if (res.installations.length) {
        setSelectedInstallation(res.installations[0].id)
      }
    } catch (e: any) {
      console.error('Failed to fetch installations', e)
    }
  }

  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim()
    if (!query || loading || !selectedInstallation) return

    setMessages(m => [...m, { role: 'user', content: query }])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const res = await api.post<{ message: string; session_id: string }>(`/api/v1/ai/chat`, {
        message: query,
        installation_id: selectedInstallation,
      })
      setMessages(m => [...m, { role: 'assistant', content: res.message }])
    } catch (e: any) {
      setMessages(m => [
        ...m,
        { role: 'assistant', content: `Error processing query: ${e.message || 'Please try again'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  const suggested = [
    'How much electricity did I generate today?',
    'What does the high temperature alert mean?',
    'When does my inverter warranty expire?',
    'Show me my latest service record',
    'Compare this week with expected generation',
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-solar-600" /> AI Solar Assistant
        </h1>
        <p className="text-gray-600 text-sm">
          Ask questions about your solar generation, active alerts, warranties, or service history
        </p>
      </div>

      <Card className="flex flex-col h-[calc(100dvh-13rem)] min-h-[440px] max-h-[620px] shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-solar-600 flex-shrink-0" /> System Telemetry Chat
          </CardTitle>
          {installations.length > 0 && (
            <Select
              value={selectedInstallation}
              onChange={e => setSelectedInstallation(e.target.value)}
              wrapperClassName="w-full sm:w-auto"
              className="w-full sm:w-56 text-xs"
              options={installations.map(inst => ({ value: inst.id, label: `${inst.name} (${inst.spms_id})` }))}
            />
          )}
        </CardHeader>

        {/* Message Log */}
        <CardContent className="flex-1 overflow-y-auto space-y-4 p-3 sm:p-4 bg-gray-50/50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] sm:max-w-[85%] p-3 sm:p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-solar-600 text-white rounded-br-xs'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-gray-500 text-sm p-2">
              <Loader2 className="h-5 w-5 animate-spin text-solar-600" />
              <span>Analyzing solar telemetry…</span>
            </div>
          )}
        </CardContent>

        {/* Input Bar */}
        <div className="border-t border-gray-200 p-3 sm:p-4 bg-white space-y-3">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about current power, alerts, warranties..."
              className="flex-1"
              disabled={loading || !selectedInstallation}
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading || !input.trim() || !selectedInstallation}
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>

          {/* Quick Suggested Prompts */}
          <div>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-1.5 font-medium">
              <Info className="h-3 w-3" /> Suggested queries:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggested.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(q)}
                  disabled={loading || !selectedInstallation}
                  className="text-xs bg-gray-100 hover:bg-solar-50 hover:text-solar-700 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="text-xs text-gray-500 text-center flex flex-wrap items-center justify-center gap-2">
        <Badge variant="info">Grounded Context</Badge>
        <span>Responses use your simulated inverter power readings, ambient temperature, warranty tables, and service history.</span>
      </div>
    </div>
  )
}
