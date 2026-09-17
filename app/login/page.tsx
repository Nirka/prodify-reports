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

function PeriodPanel({ stats, isHighlight }: { stats: PeriodStats; isHighlight?: boolean }) {
  const maxClient = stats.byClient[0]?.count || 1
  return (
    <div className={`rounded-2xl p-6 ${isHighlight ? "bg-blue-50 border-2 border-blue-200" : "bg-white border border-gray-100"} shadow-sm`}>
      <h2 className={`text-lg font-bold mb-5 ${isHighlight ? "text-blue-800" : "text-gray-700"}`}>
        {isHighlight && "⭐ "}{stats.label}
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{stats.inbound}</div>
          <div className="text-xs text-gray-500 mt-1">פניות נכנסות</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-600">{stats.outbound}</div>
          <div className="text-xs text-gray-500 mt-1">תגובות יוצאות</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{stats.newThreads}</div>
          <div className="text-xs text-gray-500 mt-1">שרשורים חדשים</div>
        </div>
        <div className="bg-white rounded-xl p-4 text-center shadow-sm">
          <div className={`text-2xl font-bold ${stats.unansweredThreads > 0 ? "text-red-500" : "text-gray-400"}`}>
            {stats.unansweredThreads}
          </div>
          <div className="text-xs text-gray-500 mt-1">ללא מענה</div>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 mb-5">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">זמני תגובה</div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-gray-800">{formatMinutes(stats.avgResponseMinutes)}</div>
            <div className="text-xs text-gray-400">ממוצע</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800">{formatMinutes(stats.medianResponseMinutes)}</div>
            <div className="text-xs text-gray-400">חציון</div>
          </div>
          <div>
            <div className={`text-lg font-bold ${(stats.pct30min || 0) >= 80 ? "text-green-600" : (stats.pct30min || 0) >= 60 ? "text-yellow-600" : "text-red-500"}`}>
              {stats.pct30min !== null ? `${stats.pct30min}%` : "—"}
            </div>
            <div className="text-xs text-gray-400">בתוך 30 דק'</div>
          </div>
        </div>
      </div>
      {stats.byClient.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">פניות לפי לקוח</div>
          <div className="space-y-2">
            {stats.byClient.slice(0, 6).map((c) => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{c.name}</span>
                  <span className="font-semibold text-gray-900">{c.count}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(c.count / maxClient) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats.byAgent.length > 0 && (
        <div className="mb-5">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">עומס נציגים</div>
          <div className="flex flex-wrap gap-2">
            {stats.byAgent.map((a) => (
              <div key={a.name} className="bg-white rounded-lg px-3 py-1.5 text-sm shadow-sm border border-gray-100">
                <span className="text-gray-700">{a.name}</span>
                <span className="font-bold text-blue-600 mr-1"> {a.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats.topSubjects.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">נושאים נפוצים</div>
          <div className="space-y-1">
            {stats.topSubjects.slice(0, 5).map((s, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-600 truncate ml-2">{s.subject}</span>
                <span className="text-gray-400 shrink-0">×{s.count}</span>
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
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (status !== "authenticated") return
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/login?reason=idle" })
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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">טוען נתוני שירות...</p>
          <p className="text-xs text-gray-400 mt-1">שולף נתונים מ-helsinki@prodify.com</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-3">⚠️</div>
          <h2 className="font-bold text-red-700 mb-2">שגיאה בטעינת הנתונים</h2>
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700">
            נסה שוב
          </button>
        </div>
      </div>
    )
  }

  const generatedDate = stats ? new Date(stats.generatedAt).toLocaleString("he-IL") : ""

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/prodify-logo.png" alt="Prodify" width={36} height={36} className="rounded-lg" />
            <div>
              <h1 className="font-bold text-gray-900 text-lg">Prodify Reports</h1>
              <p className="text-xs text-gray-400">דשבורד שירות לקוחות — helsinki@prodify.com</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm text-gray-700">{session?.user?.name}</div>
              <div className="text-xs text-gray-400">עודכן: {generatedDate}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5"
            >
              יציאה
            </button>
          </div>
        </div>
      </header>
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="max-w-7xl mx-auto flex gap-6">
          <button className="py-3 text-sm font-semibold text-blue-600 border-b-2 border-blue-600">
            🎧 שירות לקוחות
          </button>
          <button className="py-3 text-sm text-gray-400 cursor-not-allowed" disabled>
            💰 כספים (בקרוב)
          </button>
          <button className="py-3 text-sm text-gray-400 cursor-not-allowed" disabled>
            📊 לקוחות (בקרוב)
          </button>
        </div>
      </div>
      {stats && (
        <div className="bg-blue-700 text-white px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-6 text-sm">
            <span>📬 אתמול: <strong>{stats.yesterday.inbound}</strong> פניות</span>
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
            <PeriodPanel stats={stats.yesterday} isHighlight />
            <PeriodPanel stats={stats.week} />
            <PeriodPanel stats={stats.month} />
          </div>
          <div className="mt-8 text-center text-xs text-gray-400">
            מקור נתונים: תיבת helsinki@prodify.com | עדכון אחרון: {generatedDate}<br/>
            ימי עבודה: א׳-ה׳ (שישי ושבת מוחרגים)
          </div>
        </main>
      )}
    </div>
  )
}
