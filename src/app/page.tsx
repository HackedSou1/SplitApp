"use client"

import { useCallback, useEffect, useState, useSyncExternalStore } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  CalendarClock,
  History,
  Home,
  LogOut,
  Mic,
  Moon,
  Sun,
  Trophy,
  User,
  Vote,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api, avatarClass, initials } from "@/lib/client-utils"
import type { AppData, View } from "@/lib/client-types"
import { LoginView } from "@/components/app/login-view"
import { HomeView } from "@/components/app/home-view"
import { MeetingView } from "@/components/app/meeting-view"
import { HistoryView } from "@/components/app/history-view"
import { VotingView } from "@/components/app/voting-view"
import { AdminView } from "@/components/app/admin-view"

const NAV: { key: View; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
  { key: "home", label: "Home", icon: <Home className="size-4" /> },
  { key: "meeting", label: "Next Meeting", icon: <CalendarClock className="size-4" /> },
  { key: "history", label: "History", icon: <History className="size-4" /> },
  { key: "voting", label: "Voting", icon: <Vote className="size-4" /> },
  { key: "admin", label: "Admin", icon: <User className="size-4" />, adminOnly: true },
]

type LoadState = { status: "loading" } | { status: "signedOut" } | { status: "ok"; data: AppData }

async function loadAppData(): Promise<LoadState> {
  try {
    const res = await fetch("/api/app-data")
    if (res.status === 401) return { status: "signedOut" }
    if (res.ok) return { status: "ok", data: (await res.json()) as AppData }
    return { status: "signedOut" }
  } catch {
    return { status: "signedOut" }
  }
}

export default function Page() {
  const [state, setState] = useState<LoadState>({ status: "loading" })
  const [view, setView] = useState<View>("home")

  const refresh = useCallback(async () => {
    const result = await loadAppData()
    setState(result)
  }, [])

  useEffect(() => {
    let active = true
    loadAppData().then((result) => {
      if (active) setState(result)
    })
    return () => {
      active = false
    }
  }, [])

  // Keep everyone's screen in sync: quietly re-fetch every 10s while the tab is visible,
  // and straight away when someone comes back to the tab.
  const signedIn = state.status === "ok"
  useEffect(() => {
    if (!signedIn) return
    const silentRefresh = async () => {
      if (document.visibilityState !== "visible") return
      try {
        const res = await fetch("/api/app-data")
        if (res.status === 401) setState({ status: "signedOut" })
        else if (res.ok) setState({ status: "ok", data: (await res.json()) as AppData })
      } catch {
        // offline for a moment — keep showing what we have
      }
    }
    const t = setInterval(silentRefresh, 10000)
    document.addEventListener("visibilitychange", silentRefresh)
    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", silentRefresh)
    }
  }, [signedIn])

  const goTo = useCallback((v: View) => {
    setView(v)
    window.scrollTo({ top: 0 })
  }, [])

  async function logout() {
    try {
      await api("/api/auth/logout", "POST")
    } catch {
      // ignore
    }
    setState({ status: "signedOut" })
    setView("home")
  }

  if (state.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Mic className="size-6 animate-pulse text-primary" />
          <span className="text-sm">Loading ClubHub…</span>
        </div>
      </div>
    )
  }

  if (state.status === "signedOut") {
    return <LoginView onSuccess={refresh} />
  }

  const data = state.data

  const nav = NAV.filter((n) => !n.adminOnly || data.user.isAdmin)
  const votingOpen = data.meetings.some((m) => m.status === "completed")
  const activeView = view === "admin" && !data.user.isAdmin ? "home" : view

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Mic className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight">ClubHub</p>
              <p className="hidden max-w-64 truncate text-xs text-muted-foreground sm:block">{data.club.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3 transition hover:bg-muted"
                  aria-label="Account menu"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className={`text-[10px] font-semibold ${avatarClass(data.user.name)}`}>
                      {initials(data.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-28 truncate text-sm font-medium sm:block">
                    {data.user.name.split(" ")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate">{data.user.name}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{data.user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {data.user.isAdmin && (
                  <DropdownMenuItem onClick={() => goTo("admin")}>
                    <User className="size-4" /> Admin panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout} variant="destructive">
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="mx-auto hidden max-w-6xl gap-1 px-4 pb-2 md:flex" aria-label="Main">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => goTo(n.key)}
              className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                activeView === n.key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              aria-current={activeView === n.key ? "page" : undefined}
            >
              {n.icon}
              {n.label}
              {n.key === "voting" && votingOpen && (
                <span className="absolute -right-0.5 -top-0.5 flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 md:pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {activeView === "home" && <HomeView data={data} refresh={refresh} goTo={goTo} />}
            {activeView === "meeting" && <MeetingView data={data} refresh={refresh} />}
            {activeView === "history" && <HistoryView data={data} />}
            {activeView === "voting" && <VotingView data={data} refresh={refresh} />}
            {activeView === "admin" && <AdminView data={data} refresh={refresh} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mt-auto hidden border-t bg-background py-4 md:block">
        <p className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 text-xs text-muted-foreground">
          <Trophy className="size-3.5 text-amber-500" />
          ClubHub — built for Toastmasters clubs. All data lives on your club&apos;s server.
        </p>
      </footer>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
        aria-label="Main mobile"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => goTo(n.key)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
                activeView === n.key ? "text-primary" : "text-muted-foreground"
              }`}
              aria-current={activeView === n.key ? "page" : undefined}
            >
              {n.icon}
              {n.label === "Next Meeting" ? "Meeting" : n.label}
              {n.key === "voting" && votingOpen && (
                <span className="absolute right-1/2 top-1.5 translate-x-4">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  )
}

const emptySubscribe = () => () => {}
