"use client"
import { useEffect } from "react"

const TENANT_ID = "ed8c2097-9fa9-4265-96cc-4a640e0ca074"

export default function LogoutPage() {
  useEffect(() => {
    const postLogoutUrl = encodeURIComponent(
      `${window.location.origin}/login?reason=signout`
    )
    window.location.href = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutUrl}`
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1724]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">מתנתק...</p>
      </div>
    </div>
  )
}
