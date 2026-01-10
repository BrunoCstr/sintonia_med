'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

interface AvailabilityData {
  periods: Record<string, boolean>
  subjects: Record<string, Record<string, boolean>>
}

export function AvailabilityNotice() {
  const [availability, setAvailability] = useState<AvailabilityData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const response = await fetch('/api/availability')
        const data = await response.json()
        if (data.success) {
          setAvailability(data.availability)
        }
      } catch (error) {
        console.error('Erro ao buscar disponibilidade:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAvailability()
  }, [])

  if (loading) {
    return (
      <div className="group flex h-full items-center justify-center rounded-2xl border bg-background p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!availability) return null

  const periods = Array.from({ length: 8 }, (_, i) => i + 1)

  return (
    <div className="group flex h-full flex-col rounded-2xl border bg-background p-8 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <div className="mb-3 w-fit rounded-xl bg-primary/10 p-4 transition-colors group-hover:bg-primary">
        <Calendar className="h-8 w-8 text-primary transition-colors group-hover:text-primary-foreground" />
      </div>
      <h3 className="mb-2 text-xl font-bold">Conteúdo Disponível</h3>
      <p className="mb-3 shrink-0 text-sm text-muted-foreground">
        Confira os períodos e matérias já disponíveis na plataforma
      </p>
      
      <div className="min-h-0 flex-1 overflow-y-auto pr-2 scrollbar-thin">
        <div className="space-y-2.5">
          {/* Períodos */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold text-foreground">Períodos</h4>
            <div className="grid grid-cols-4 gap-1.5">
              {periods.map((period) => {
                const isAvailable = availability.periods[period.toString()] ?? false
                return (
                  <div
                    key={period}
                    className={`flex items-center justify-between rounded-md border px-1.5 py-1 ${
                      isAvailable
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <span className="text-xs font-medium text-foreground">{period}º</span>
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${
                        isAvailable
                          ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
                          : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]'
                      }`}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Matérias */}
          <div>
            <h4 className="mb-1.5 text-xs font-semibold text-foreground">Matérias</h4>
            <div className="space-y-1.5">
              {/* 1º ao 5º */}
              <div>
                <div className="mb-1 text-xs text-muted-foreground">1º ao 5º</div>
                <div className="grid grid-cols-4 gap-1">
                  {['SOI', 'HAM', 'IESC', 'MCM'].map((subject) => {
                    const isAvailable = availability.subjects['1-5']?.[subject] ?? false
                    return (
                      <div
                        key={subject}
                        className={`flex items-center justify-between rounded border px-1.5 py-0.5 ${
                          isAvailable
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                        }`}
                      >
                        <span className="text-xs font-medium">{subject}</span>
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${
                            isAvailable
                              ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
                              : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]'
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 6º ao 8º */}
              <div>
                <div className="mb-1 text-xs text-muted-foreground">6º ao 8º</div>
                <div className="grid grid-cols-4 gap-1">
                  {['CI', 'HAM', 'IESC', 'MCM'].map((subject) => {
                    const isAvailable = availability.subjects['6-8']?.[subject] ?? false
                    return (
                      <div
                        key={subject}
                        className={`flex items-center justify-between rounded border px-1.5 py-0.5 ${
                          isAvailable
                            ? 'border-green-500/30 bg-green-500/5'
                            : 'border-red-500/30 bg-red-500/5'
                        }`}
                      >
                        <span className="text-xs font-medium">{subject}</span>
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${
                            isAvailable
                              ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]'
                              : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]'
                          }`}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Legenda */}
          <div className="flex items-center justify-center gap-3 border-t pt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
              <span className="text-muted-foreground">Disponível</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]" />
              <span className="text-muted-foreground">Em breve</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


