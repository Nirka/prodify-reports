import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getServiceStats } from "@/lib/graph"

export async function GET() {
  const session = await getServerSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const stats = await getServiceStats()
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error("Service stats error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
