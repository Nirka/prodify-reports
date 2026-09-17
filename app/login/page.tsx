"use client"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Suspense } from "react"

function LoginContent() {
  const params = useSearchParams()
  const reason = params.get("reason")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        <div className="mb-8">
          <Image
            src="/prodify-logo.png"
            alt="Prodify Software"
            width={120}
            height={120}
            className="mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">Prodify Reports</h1>
          {reason === "idle" ? (
            <p className="text-amber-600 bg-amber-50 rounded-lg px-4 py-2 mt-2 text-sm">
              פג תוקף החיבור עקב חוסר פעילות. אנא התחבר מחדש.
            </p>
          ) : reason === "signout" ? (
            <p className="text-gray-500 mt-2">התנתקת בהצלחה.</p>
          ) : (
            <p className="text-gray-500 mt-2">דשבורד ניהולי פנימי</p>
          )}
        </div>

        <button
          onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard/service" })}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          כניסה עם Microsoft
        </button>

        <p className="text-xs text-gray-400 mt-6">
          גישה מוגבלת לעובדי Prodify בלבד
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
