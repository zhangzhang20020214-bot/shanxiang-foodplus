import { createContext, useContext, useState, type ReactNode } from 'react'

export type View =
  | { name: 'home' }
  | { name: 'dish' }
  | { name: 'profiles' }
  | { name: 'profileEdit'; id: string }
  | { name: 'me' }

interface NavContextValue {
  view: View
  navigate: (view: View) => void
  chatKey: number
  newChat: () => void
}

const NavContext = createContext<NavContextValue | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>({ name: 'home' })
  const [chatKey, setChatKey] = useState(0)

  const newChat = () => {
    setChatKey((k) => k + 1)
    setView({ name: 'home' })
  }

  return (
    <NavContext.Provider value={{ view, navigate: setView, chatKey, newChat }}>
      {children}
    </NavContext.Provider>
  )
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav 必须在 NavProvider 内使用')
  return ctx
}
