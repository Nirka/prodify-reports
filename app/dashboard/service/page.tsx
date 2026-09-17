"use client"
import { useSession, signOut } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

const IDLE_TIMEOUT_MS = 30 * 60 * 1000

interface PeriodStats {
  label: string
  inbound: number
  outbound: number
  newThreads: number
  avgResponseMinutes: number | null
  medianResponseMinutes: number | null
  pct30min: number | null
  unansweredThreads: number
  byClient: { name: string; count: number }[]
  byAgent: { name: string; count: number }[]
  topSubjects: { subject: string; count: number }[]
}

interface ServiceStats {
  generatedAt: string
  yesterday: PeriodStats
  week: PeriodStats
  month: PeriodStats
}

function formatMinutes(min: number | null): string {
  if (min === null) return "—"
  if (min < 60) return `${min} דק'`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}ש' ${m}ד'` : `${h} שעות`
}

function PeriodPanel({ stats, isHighlight, dark }: { stats: PeriodStats; isHighlight?: boolean; dark: boolean }) {
  const maxClient = stats.byClient[0]?.count || 1
  const card = dark ? "bg-[#1e2a3a]" : "bg-white"
  const panelBg = isHighlight
    ? dark ? "bg-[#1a2535] border-2 border-blue-500" : "bg-blue-50 border-2 border-blue-200"
    : dark ? "bg-[#151f2e] border border-[#2a3a4a]" : "bg-white border border-gray-100"
  const titleColor = isHighlight
    ? dark ? "text-blue-300" : "text-blue-800"
    : dark ? "text-gray-200" : "text-gray-700"
  const labelColor = dark ? "text-gray-400" : "text-gray-500"
  const sectionBg = dark ? "bg-[#1e2a3a]" : "bg-gray-50"
  const sectionLabel = dark ? "text-gray-400" : "text-gray-500"
  const barBg = dark ? "bg-[#2a3a4a]" : "bg-gray-100"
  const clientName = dark ? "text-gray-300" : "text-gray-700"
  const clientCount = dark ? "text-gray-100" : "text-gray-900"
  const agentBadge = dark ? "bg-[#1e2a3a] border-[#2a3a4a]" : "bg-white border-gray-100"
  const agentName = dark ? "text-gray-300" : "text-gray-700"
  const subjectText = dark ? "text-gray-400" : "text-gray-600"
  const subjectCount = dark ? "text-gray-500" : "text-gray-400"

  const pct30Color = (stats.pct30min || 0) >= 80
    ? "text-green-400"
    : (stats.pct30min || 0) >= 60
    ? "text-yellow-400"
    : "text-red-400"

  return (
    <div className={`rounded-2xl p-6 ${panelBg} shadow-sm`}>
      <h2 className={`text-lg font-bold mb-5 ${titleColor}`}>
        {isHighlight && "⭐ "}{stats.label}
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className={`${card} rounded-xl p-4 text-center shadow-sm`}>
          <div className="text-2xl font-bold text-blue-400">{stats.inbound}</div>
          <div className={`text-xs ${labelColor} mt-1`}>פניות נכנסות</div>
        </div>
        <div className={`${card} rounded-xl p-4 text-center shadow-sm`}>
          <div className="text-2xl font-bold text-green-400">{stats.outbound}</div>
          <div className={`text-xs ${labelColor} mt-1`}>תגובות יוצאות</div>
        </div>
        <div className={`${card} rounded-xl p-4 text-center shadow-sm`}>
          <div className="text-2xl font-bold text-purple-400">{stats.newThreads}</div>
          <div className={`text-xs ${labelColor} mt-1`}>שרשורים חדשים</div>
        </div>
        <div className={`${card} rounded-xl p-4 text-center shadow-sm`}>
          <div className={`text-2xl font-bold ${stats.unansweredThreads > 0 ? "text-red-400" : dark ? "text-gray-500" : "text-gray-400"}`}>
            {stats.unansweredThreads}
          </div>
          <div className={`text-xs ${labelColor} mt-1`}>ללא מענה</div>
        </div>
      </div>

      <div className={`${sectionBg} rounded-xl p-4 mb-5`}>
        <div className={`text-xs font-semibold ${sectionLabel} uppercase tracking-wide mb-3`}>זמני תגובה</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className={`text-lg font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>{formatMinutes(stats.avgResponseMinutes)}</div>
            <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>ממוצע</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${dark ? "text-gray-200" : "text-gray-800"}`}>{formatMinutes(stats.medianResponseMinutes)}</div>
            <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>חציון</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${pct30Color}`}>
              {stats.pct30min !== null ? `${stats.pct30min}%` : "—"}
            </div>
            <div className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>בתוך 30 דק'</div>
          </div>
        </div>
      </div>

      {stats.byClient.length > 0 && (
        <div className="mb-5">
          <div className={`text-xs font-semibold ${sectionLabel} uppercase tracking-wide mb-3`}>פניות לפי לקוח</div>
          <div className="space-y-2">
            {stats.byClient.slice(0, 6).map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={clientName}>{c.name}</span>
                  <span className={`font-semibold ${clientCount}`}>{c.count}</span>
                </div>
                <div className={`h-1.5 ${barBg} rounded-full overflow-hidden`}>
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.count / maxClient) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.byAgent.length > 0 && (
        <div className="mb-5">
          <div className={`text-xs font-semibold ${sectionLabel} uppercase tracking-wide mb-2`}>עומס נציגים</div>
          <div className="flex flex-wrap gap-2">
            {stats.byAgent.map((a) => (
              <div key={a.name} className={`${agentBadge} rounded-lg px-3 py-1.5 text-sm shadow-sm border`}>
                <span className={agentName}>{a.name}</span>
                <span className="font-bold text-blue-400 mr-1"> {a.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.topSubjects.length > 0 && (
        <div>
          <div className={`text-xs font-semibold ${sectionLabel} uppercase tracking-wide mb-2`}>נושאים נפוצים</div>
          <div className="space-y-1">
            {stats.topSubjects.slice(0, 5).map((s, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className={`${subjectText} truncate ml-2`}>{s.subject}</span>
                <span className={`${subjectCount} shrink-0`}>×{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ServiceDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<ServiceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dark, setDark] = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/logout" })}
      }, IDLE_TIMEOUT_MS)
    }
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"]
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [status])

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/service-stats")
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error)
          setStats(data)
        })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }
  }, [status])

  const bg = dark ? "bg-[#0f1724]" : "bg-gray-50"
  const headerBg = dark ? "bg-[#111c2d] border-[#1e2a3a]" : "bg-white border-gray-200"
  const headerTitle = dark ? "text-white" : "text-gray-900"
  const headerSub = dark ? "text-gray-400" : "text-gray-400"
  const tabActive = dark ? "text-blue-400 border-blue-400" : "text-blue-600 border-blue-600"
  const tabInactive = dark ? "text-gray-500" : "text-gray-400"
  const navBorder = dark ? "bg-[#111c2d] border-[#1e2a3a]" : "bg-white border-gray-200"
  const userName = dark ? "text-gray-200" : "text-gray-700"
  const userDate = dark ? "text-gray-500" : "text-gray-400"
  const logoutBtn = dark ? "text-gray-400 hover:text-gray-200 border-[#2a3a4a]" : "text-gray-500 hover:text-gray-700 border-gray-200"
  const footerText = dark ? "text-gray-600" : "text-gray-400"

  if (status === "loading" || loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className={dark ? "text-gray-400" : "text-gray-500"}>טוען נתוני שירות...</p>
          <p className={`text-xs mt-1 ${dark ? "text-gray-600" : "text-gray-400"}`}>שולף נתונים מ-helsinki@prodify.com</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg}`}>
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-6 max-w-md text-center">
          <div className="text-red-400 text-4xl mb-3">⚠️</div>
          <h2 className="font-bold text-red-300 mb-2">שגיאה בטעינת הנתונים</h2>
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  const generatedDate = stats ? new Date(stats.generatedAt).toLocaleString("he-IL") : ""

  return (
    <div className={`min-h-screen ${bg}`} dir="rtl">
      <header className={`${headerBg} border-b px-6 py-4 sticky top-0 z-10`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/prodify-logo.png" alt="Prodify" width={40} height={40} className="rounded-lg" />
            <div>
              <h1 className={`font-bold text-lg ${headerTitle}`}>Prodify Reports</h1>
              <p className={`text-xs ${headerSub}`}>דשבורד שירות לקוחות — helsinki@prodify.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className={`text-sm ${userName}`}>{session?.user?.name}</div>
              <div className={`text-xs ${userDate}`}>עודכן: {generatedDate}</div>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className={`p-2 rounded-lg border ${logoutBtn} transition-colors`}
              title={dark ? "מצב בהיר" : "מצב כהה"}
            >
              {dark ? "☀️" : "🌙"}
            </button>
            <button
             onClick={() => signOut({ callbackUrl: "/logout" })}
              className={`text-sm border rounded-lg px-3 py-1.5 transition-colors ${logoutBtn}`}
            >
              יציאה
            </button>
          </div>
        </div>
      </header>

      <div className={`${navBorder} border-b px-6`}>
        <div className="max-w-7xl mx-auto flex gap-6">
          <button className={`py-3 text-sm font-semibold border-b-2 ${tabActive}`}>
            🎧 שירות לקוחות
          </button>
          <button className={`py-3 text-sm cursor-not-allowed ${tabInactive}`} disabled>
            💰 כספים (בקרוב)
          </button>
          <button className={`py-3 text-sm cursor-not-allowed ${tabInactive}`} disabled>
            📊 לקוחות (בקרוב)
          </button>
        </div>
      </div>

      {stats && (
        <div className="bg-blue-700 text-white px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-6 text-sm">
            <span>📬 היום ואתמול: <strong>{stats.yesterday.inbound}</strong> פניות</span>
            <span>⚡ חציון תגובה: <strong>{formatMinutes(stats.yesterday.medianResponseMinutes)}</strong></span>
            <span>✅ בתוך 30 דק': <strong>{stats.yesterday.pct30min !== null ? `${stats.yesterday.pct30min}%` : "—"}</strong></span>
            {stats.yesterday.unansweredThreads > 0 && (
              <span className="text-yellow-300">⚠️ ללא מענה: <strong>{stats.yesterday.unansweredThreads}</strong></span>
            )}
          </div>
        </div>
      )}

      {stats && (
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PeriodPanel stats={stats.yesterday} isHighlight dark={dark} />
            <PeriodPanel stats={stats.week} dark={dark} />
            <PeriodPanel stats={stats.month} dark={dark} />
          </div>
          <div className={`mt-8 text-center text-xs ${footerText}`}>
            מקור נתונים: תיבת helsinki@prodify.com | עדכון אחרון: {generatedDate}<br/>
            ימי עבודה: א׳-ה׳ (שישי ושבת מוחרגים)
          </div>
        </main>
      )}
    </div>
  )
}
