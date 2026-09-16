import type { Metadata } from "next"
import { cookies } from "next/headers"
import "./globals.css"
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "Prodify Reports",
  description: "דשבורד ניהולי - Prodify Software",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Theme is saved in a cookie so the server renders the right theme with no flash
  const theme = (await cookies()).get("theme")?.value

  return (
    <html lang="he" dir="rtl" className={theme === "dark" ? "dark" : undefined} suppressHydrationWarning>
      <body className="bg-gray-50 dark:bg-gray-950 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
