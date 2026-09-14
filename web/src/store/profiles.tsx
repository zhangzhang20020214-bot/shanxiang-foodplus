import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Profile } from '../types'
import { uid, nowIso } from '../utils'

const PROFILES_KEY = 'foodplus.profiles'
const CURRENT_KEY = 'foodplus.currentProfileId'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export type ProfileInput = Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>

interface ProfilesContextValue {
  profiles: Profile[]
  currentProfile: Profile | null
  sessionProfile: Profile | null
  setCurrentProfileId: (id: string | null) => void
  setSessionProfile: (profile: Profile | null) => void
  addProfile: (input: ProfileInput) => Profile
  updateProfile: (id: string, patch: Partial<ProfileInput>) => void
  deleteProfile: (id: string) => void
}

const ProfilesContext = createContext<ProfilesContextValue | null>(null)

export function ProfilesProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Profile[]>(() =>
    load<Profile[]>(PROFILES_KEY, []),
  )
  const [currentId, setCurrentId] = useState<string | null>(() =>
    load<string | null>(CURRENT_KEY, null),
  )
  // 本会话「临时档案」：无档案用户答一次问卷后复用，刷新即清空
  const [sessionProfile, setSessionProfile] = useState<Profile | null>(null)

  useEffect(() => {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  }, [profiles])

  useEffect(() => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(currentId))
  }, [currentId])

  const currentProfile =
    profiles.find((p) => p.id === currentId) ?? profiles[0] ?? null

  const setCurrentProfileId = (id: string | null) => setCurrentId(id)

  const addProfile = (input: ProfileInput): Profile => {
    const now = nowIso()
    const profile: Profile = { ...input, id: uid(), createdAt: now, updatedAt: now }
    setProfiles((prev) => [...prev, profile])
    setCurrentId(profile.id)
    return profile
  }

  const updateProfile = (id: string, patch: Partial<ProfileInput>) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: nowIso() } : p,
      ),
    )
  }

  const deleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id))
    if (currentId === id) setCurrentId(null)
  }

  return (
    <ProfilesContext.Provider
      value={{
        profiles,
        currentProfile,
        sessionProfile,
        setCurrentProfileId,
        setSessionProfile,
        addProfile,
        updateProfile,
        deleteProfile,
      }}
    >
      {children}
    </ProfilesContext.Provider>
  )
}

export function useProfiles(): ProfilesContextValue {
  const ctx = useContext(ProfilesContext)
  if (!ctx) throw new Error('useProfiles 必须在 ProfilesProvider 内使用')
  return ctx
}
