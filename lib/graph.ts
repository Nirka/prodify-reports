// Microsoft Graph API client using Client Credentials flow
// This gives us access to helsinki@prodify.com mailbox server-side

const TENANT_ID = process.env.AZURE_AD_TENANT_ID!
const CLIENT_ID = process.env.AZURE_AD_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_AD_CLIENT_SECRET!
const MAILBOX = "helsinki@prodify.com"

// Known client domains → display names
const CLIENT_MAP: Record<string, string> = {
  "clalit.org.il": "כללית",
  "sheba.health.gov.il": "שיבא",
  "szmc.org.il": "שערי צדק",
  "rambam.health.gov.il": "רמב\"ם",
  "tlvmc.gov.il": "איכילוב",
  "hadassah.org.il": "הדסה",
  "barzilaihc.org.il": "ברזילי",
  "bnaiziongmc.org.il": "בני ציון",
  "ziv.org.il": "זיו",
  "galilee-medical.co.il": "גליל מדיקל",
  "poria.health.gov.il": "פוריה",
  "soraski.org.il": "סורוקי",
  "sha.org.il": "שמיר אסף הרופא",
  "kaplanhosp.co.il": "קפלן",
  "hy.health.gov.il": "הלל יפה",
  "nahariyahos.co.il": "נהריה",
  "emms.org": "ספרא נצרת",
  "prodify.com": "פנימי - Prodify",
  "prodify.co.il": "פנימי - Prodify",
}

let cachedToken: { token: string; expires: number } | null = null

async function getAppToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
      }),
    }
  )

  const data = await res.json()
  if (!data.access_token) throw new Error("Failed to get app token: " + JSON.stringify(data))

  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  }
  return cachedToken.token
}

async function graphGet(path: string) {
  const token = await getAppToken()
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Graph error ${res.status}: ${err}`)
  }
  return res.json()
}

// Date helpers
function workdaysAgo(days: number): string {
  const date = new Date()
  let count = 0
  while (count < days) {
    date.setDate(date.getDate() - 1)
    const dow = date.getDay()
    if (dow !== 5 && dow !== 6) count++ // Skip Friday (5) and Saturday (6) — Israel
  }
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

function getClientName(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() || ""
  return CLIENT_MAP[domain] || domain
}

function isInternal(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() || ""
  return domain === "prodify.com" || domain === "prodify.co.il"
}

function isHelsinki(email: string): boolean {
  return email.toLowerCase() === "helsinki@prodify.com"
}

// Parse response time in minutes from two dates
function minutesBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 60000
}

export interface PeriodStats {
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

export interface ServiceStats {
  generatedAt: string
  yesterday: PeriodStats
  week: PeriodStats
  month: PeriodStats
}

async function fetchMessagesForPeriod(afterDate: string): Promise<any[]> {
  const messages: any[] = []
  let url = `/users/${MAILBOX}/messages?$top=100&$select=id,subject,from,toRecipients,receivedDateTime,conversationId,sender&$filter=receivedDateTime ge ${afterDate}&$orderby=receivedDateTime desc`

  // Fetch up to 1000 messages (10 pages)
  let pages = 0
  while (url && pages < 10) {
    const data = await graphGet(url)
    if (data.value) messages.push(...data.value)
    url = data["@odata.nextLink"]?.replace("https://graph.microsoft.com/v1.0", "") || ""
    pages++
  }
  return messages
}

async function fetchSentForPeriod(afterDate: string): Promise<any[]> {
  const messages: any[] = []
  let url = `/users/${MAILBOX}/mailFolders/sentItems/messages?$top=100&$select=id,subject,from,toRecipients,receivedDateTime,conversationId,sender&$filter=receivedDateTime ge ${afterDate}&$orderby=receivedDateTime desc`

  let pages = 0
  while (url && pages < 10) {
    const data = await graphGet(url)
    if (data.value) messages.push(...data.value)
    url = data["@odata.nextLink"]?.replace("https://graph.microsoft.com/v1.0", "") || ""
    pages++
  }
  return messages
}

function computeStats(
  label: string,
  inboxMessages: any[],
  sentMessages: any[]
): PeriodStats {
  // Inbound: messages FROM external clients TO helsinki
  const inbound = inboxMessages.filter((m) => {
    const from = m.from?.emailAddress?.address || ""
    return !isHelsinki(from) && !isInternal(from)
  })

  // Outbound: sent messages FROM helsinki TO external
  const outbound = sentMessages.filter((m) => {
    const recipients = m.toRecipients || []
    return recipients.some((r: any) => {
      const addr = r.emailAddress?.address || ""
      return !isInternal(addr) && !isHelsinki(addr)
    })
  })

  // New threads: unique conversationIds in inbound not seen before
  const conversationIds = new Set(inbound.map((m) => m.conversationId))
  const newThreads = conversationIds.size

  // Response times: for each inbound, find earliest outbound reply in same conversation
  const sentByConversation: Record<string, string[]> = {}
  for (const s of sentMessages) {
    const cid = s.conversationId
    if (!sentByConversation[cid]) sentByConversation[cid] = []
    sentByConversation[cid].push(s.receivedDateTime)
  }

  const responseTimes: number[] = []
  const answeredConversations = new Set<string>()

  for (const msg of inbound) {
    const cid = msg.conversationId
    const replies = sentByConversation[cid] || []
    // Find first reply AFTER this message
    const afterMsg = replies
      .filter((d) => new Date(d) > new Date(msg.receivedDateTime))
      .sort()[0]
    if (afterMsg) {
      responseTimes.push(minutesBetween(msg.receivedDateTime, afterMsg))
      answeredConversations.add(cid)
    }
  }

  const unansweredThreads = [...conversationIds].filter(
    (cid) => !answeredConversations.has(cid)
  ).length

  const avgResponseMinutes =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null

  const sorted = [...responseTimes].sort((a, b) => a - b)
  const medianResponseMinutes =
    sorted.length > 0
      ? Math.round(sorted[Math.floor(sorted.length / 2)])
      : null

  const pct30min =
    responseTimes.length > 0
      ? Math.round(
          (responseTimes.filter((t) => t <= 30).length / responseTimes.length) * 100
        )
      : null

  // By client
  const clientCounts: Record<string, number> = {}
  for (const msg of inbound) {
    const from = msg.from?.emailAddress?.address || ""
    const name = getClientName(from)
    clientCounts[name] = (clientCounts[name] || 0) + 1
  }
  const byClient = Object.entries(clientCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // By agent (who sent the reply)
  const agentCounts: Record<string, number> = {}
  for (const msg of sentMessages) {
    const name = msg.sender?.emailAddress?.name || msg.from?.emailAddress?.name || "Unknown"
    if (name && name !== "Helsinki" && name !== "helsinki") {
      agentCounts[name] = (agentCounts[name] || 0) + 1
    }
  }
  const byAgent = Object.entries(agentCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Top subjects
  const subjectCounts: Record<string, number> = {}
  for (const msg of inbound) {
    const subject = (msg.subject || "ללא נושא")
      .replace(/^(Re:|Fwd:|FW:|RE:|FWD:)\s*/gi, "")
      .trim()
    subjectCounts[subject] = (subjectCounts[subject] || 0) + 1
  }
  const topSubjects = Object.entries(subjectCounts)
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  return {
    label,
    inbound: inbound.length,
    outbound: outbound.length,
    newThreads,
    avgResponseMinutes,
    medianResponseMinutes,
    pct30min,
    unansweredThreads,
    byClient,
    byAgent,
    topSubjects,
  }
}

export async function getServiceStats(): Promise<ServiceStats> {
  const yesterdayDate = workdaysAgo(1)
  const weekDate = workdaysAgo(5)
  const monthDate = workdaysAgo(22)

  // Fetch all data in parallel from month start (covers all periods)
  const [inboxMessages, sentMessages] = await Promise.all([
    fetchMessagesForPeriod(monthDate),
    fetchSentForPeriod(monthDate),
  ])

  // Filter per period
  const filterAfter = (msgs: any[], after: string) =>
    msgs.filter((m) => new Date(m.receivedDateTime) >= new Date(after))

  return {
    generatedAt: new Date().toISOString(),
    yesterday: computeStats("היום ואתמול", filterAfter(inboxMessages, yesterdayDate), filterAfter(sentMessages, yesterdayDate)),
    week: computeStats("7 ימים אחרונים", filterAfter(inboxMessages, weekDate), filterAfter(sentMessages, weekDate)),
    month: computeStats("22 ימי עבודה אחרונים", inboxMessages, sentMessages),
  }
}
