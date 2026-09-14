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
  // 宽屏默认展开（豆包式常驻侧栏），窄屏默认收起；用户可随时手动开合
  const [historyOpen, setHistoryOpen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 768px)').matches,
  )

  return (
    <div className="flex h-full">
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onToggleHistory={() => setHistoryOpen((v) => !v)} />
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
