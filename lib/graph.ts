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
