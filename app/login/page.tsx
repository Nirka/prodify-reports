"use client"
import Image from "next/image"
import { signIn } from "next-auth/react"
import { ThemeToggle } from "@/components/ThemeToggle"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700 dark:from-gray-950 dark:to-blue-950">
      <ThemeToggle className="absolute top-4 left-4 bg-white/10 border-white/30 text-white hover:bg-white/20 dark:bg-white/5 dark:border-white/20 dark:hover:bg-white/10" />

      <div className="bg-white dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-4 dark:bg-white dark:rounded-full dark:p-2">
            <Image
              src="/logo.png"
              alt="Prodify Software"
              width={128}
              height={128}
              priority
              className="w-full h-full"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Prodify Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">דשבורד ניהולי פנימי</p>
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

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          גישה מוגבלת לעובדי Prodify בלבד
        </p>
      </div>
    </div>
  )
}
