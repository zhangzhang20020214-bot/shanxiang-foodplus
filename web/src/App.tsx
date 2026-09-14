import { useState } from 'react'
import { ProfilesProvider } from './store/profiles'
import { HistoryProvider } from './store/history'
import { NavProvider, useNav } from './store/nav'
import TopBar from './components/TopBar'
import HistoryPanel from './components/HistoryPanel'
import Home from './pages/Home'
import DishSearch from './pages/DishSearch'
import Profiles from './pages/Profiles'
import ProfileEdit from './pages/ProfileEdit'
import Me from './pages/Me'

export default function App() {
  return (
    <ProfilesProvider>
      <HistoryProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </HistoryProvider>
    </ProfilesProvider>
  )
}

function Shell() {
  const { view } = useNav()
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="flex h-full">
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onOpenHistory={() => setHistoryOpen(true)} />
        <main className="min-w-0 flex-1 overflow-hidden">
          {view.name === 'home' && <Home />}
          {view.name === 'dish' && <DishSearch />}
          {view.name === 'profiles' && <Profiles />}
          {view.name === 'profileEdit' && <ProfileEdit id={view.id} />}
          {view.name === 'me' && <Me />}
        </main>
      </div>
    </div>
  )
}
