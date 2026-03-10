import { NextRequest, NextResponse } from "next/server"
import { createKaggleClient } from "@/utils/kaggle-integration"

export async function POST(req: NextRequest) {
  try {
    const { kaggle_ref, kaggleUsername, kaggleApiKey } = await req.json()
    const kaggleClient = createKaggleClient(kaggleUsername, kaggleApiKey)

    if (!kaggleClient.hasCredentials()) {
      return NextResponse.json({ error: "Kaggle credentials not configured. Add them in Settings." }, { status: 400 })
    }

    const meta = await kaggleClient.getDatasetMetadata(kaggle_ref)
    const files = meta?.files || []
    return NextResponse.json({ files })
  } catch (error) {
    let message = "Unknown error"
    if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      message = (error as any).message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
