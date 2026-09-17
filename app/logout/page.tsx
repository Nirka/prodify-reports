"use client"
import { useEffect } from "react"

export default function LogoutPage() {
  useEffect(() => {
    const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID
    const postLogoutUrl = encodeURIComponent(
      `${window.location.origin}/login?reason=signout`
    )
    // Redirect to Microsoft's logout endpoint to clear SSO session
    window.location.href = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/logout?post_logout_redirect_uri=${postLogoutUrl}`
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm">מתנתק...</p>
      </div>
    </div>
  )
}
