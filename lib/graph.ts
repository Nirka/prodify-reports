async function fetchMessagesForPeriod(afterDate: string): Promise<any[]> {
  const messages: any[] = []
  let url = `/users/${MAILBOX}/messages?$top=50&$select=id,subject,from,toRecipients,receivedDateTime,conversationId,sender&$filter=receivedDateTime ge ${afterDate}&$orderby=receivedDateTime desc`

  let pages = 0
  while (url && pages < 5) {  // max 250 messages
    const data = await graphGet(url)
    if (data.value) messages.push(...data.value)
    url = data["@odata.nextLink"]?.replace("https://graph.microsoft.com/v1.0", "") || ""
    pages++
  }
  return messages
}

export async function fetchSentForPeriod(afterDate: string): Promise<any[]> {
  const messages: any[] = []
  let url = `/users/${MAILBOX}/mailFolders/sentItems/messages?$top=50&$select=id,subject,from,toRecipients,receivedDateTime,conversationId,sender&$filter=receivedDateTime ge ${afterDate}&$orderby=receivedDateTime desc`

  let pages = 0
  while (url && pages < 5) {  // max 250 messages
    const data = await graphGet(url)
    if (data.value) messages.push(...data.value)
    url = data["@odata.nextLink"]?.replace("https://graph.microsoft.com/v1.0", "") || ""
    pages++
  }
  return messages
}
export async function getServiceStats(): Promise<ServiceStats> {
  const yesterdayDate = workdaysAgo(1)
  const weekDate = workdaysAgo(5)
  const monthDate = workdaysAgo(22)

  const [inboxMessages, sentMessages] = await Promise.all([
    fetchMessagesForPeriod(monthDate),
    fetchSentForPeriod(monthDate),
  ])

  const filterAfter = (msgs: any[], after: string) =>
    msgs.filter((m) => new Date(m.receivedDateTime) >= new Date(after))

  return {
    generatedAt: new Date().toISOString(),
    yesterday: computeStats("היום ואתמול", filterAfter(inboxMessages, yesterdayDate), filterAfter(sentMessages, yesterdayDate)),
    week: computeStats("7 ימים אחרונים", filterAfter(inboxMessages, weekDate), filterAfter(sentMessages, weekDate)),
    month: computeStats("22 ימי עבודה אחרונים", inboxMessages, sentMessages),
  }
}
