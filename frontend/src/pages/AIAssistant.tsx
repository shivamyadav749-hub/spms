import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Select } from '../components/ui'
import { Send, Bot, Sparkles, Loader2 } from 'lucide-react'
import { api } from '../lib/api';

export function AIAssistant() {
  const [messages, setMessages] = useState<Array<{role: 'user'|'assistant', content: string}>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [installations, setInstallations] = useState<{id: string; name: string; spms_id: string}[]>([])
  const [selectedInstallation, setSelectedInstallation] = useState<string>('')

  useEffect(() => {
    fetchInstallations()
  }, [])

  async function fetchInstallations() {
    try {
      const res = await api.get<{installations: {id: string; name: string; spms_id: string}[]}>('/api/v1/installations')
      setInstallations(res.installations)
      if (res.installations.length) setSelectedInstallation(res.installations[0].id)
    } catch (e: any) { console.error('Failed to fetch installations', e) }
  }

  async function handleSend() {
    if (!input.trim() || loading || !selectedInstallation) return
    const userMsg = input
    setMessages(m => [...m, { role: 'user', content: userMsg }])
    setInput('')
    setLoading(true)
    try {
      const res = await api.post<{message: string; session_id: string; data_references: any[]}>(`/api/v1/ai/chat`, {
        message: userMsg,
        installation_id: selectedInstallation
      })
      setMessages(m => [...m, { role: 'assistant', content: res.message }])
      if (res.session_id) { /* session tracked on server */ }
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}. Please try again.` }])
    } finally {
      setLoading(false)
    }
  }

  const suggested = [
    "How much electricity did I generate today?",
    "Why might my solar generation be lower?",
    "What does the high temperature alert mean?",
    "When does my inverter warranty expire?",
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Sparkles className="h-6 w-6 text-solar-600" /> AI Solar Assistant</h1>
        <p className="text-gray-600">Ask questions about your solar system in plain English or Hindi</p>
      </div>

      <Card className="flex flex-col h-[calc(100vh-300px)] min-h-[400px]">
        <CardHeader><CardTitle>Chat</CardTitle></CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <Bot className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>Start a conversation by asking a question below</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-solar-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start"><Loader2 className="h-6 w-6 animate-spin text-solar-600" /></div>}
        </CardContent>
        <div className="border-t border-gray-200 p-4 space-y-3">
          <div className="flex gap-2">
            <Select
              value={selectedInstallation}
              onChange={e => setSelectedInstallation(e.target.value)}
              className="w-64"
              options={installations.length
                ? installations.map(inst => ({ value: inst.id, label: `${inst.name} (${inst.spms_id})` }))
                : [{ value: '', label: 'No installations found' }]}
            />
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Ask about generation, alerts, warranties…" className="flex-1" />
            <Button onClick={handleSend} disabled={loading || !input.trim() || !selectedInstallation}><Send className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggested.map((q, i) => (
              <Button key={i} variant="outline" size="sm" onClick={() => { setInput(q); handleSend() }} className="text-xs">{q}</Button>
            ))}
          </div>
        </div>
      </Card>

      {installations.length === 0 && (
        <div className="text-sm text-gray-500 text-center">No installations found. Please ensure demo data is seeded.</div>
      )}

      <div className="text-sm text-gray-500 text-center">
        <Badge variant="info">AI Mode</Badge> Powered by NVIDIA Nemotron via Nebius. Responses use your installation data.
      </div>
    </div>
  )
}