'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './auth-context'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth()
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Carregar tema do Firestore quando usuário estiver autenticado
  useEffect(() => {
    if (user && userProfile?.theme) {
      setTheme(userProfile.theme)
      document.documentElement.classList.toggle('dark', userProfile.theme === 'dark')
      setMounted(true)
      return
    }
    
    // Se não estiver autenticado ou não tiver tema salvo, usar localStorage ou preferência do sistema
    setMounted(true)
    const stored = localStorage.getItem('theme') as Theme
    if (stored) {
      setTheme(stored)
      document.documentElement.classList.toggle('dark', stored === 'dark')
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
      document.documentElement.classList.add('dark')
    }
  }, [user, userProfile?.theme])

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    
    // Salvar no localStorage como fallback
    localStorage.setItem('theme', newTheme)
    
    // Se usuário estiver autenticado, salvar no Firestore
    if (user) {
      try {
        await fetch('/api/user/theme', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ theme: newTheme }),
        })
      } catch (error) {
        console.error('Erro ao salvar tema no Firestore:', error)
      }
    }
  }

  // Sempre fornecer o contexto, mesmo durante SSR
  // Durante SSR, o theme será 'light' por padrão
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
