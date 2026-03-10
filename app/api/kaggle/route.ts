import { NextRequest, NextResponse } from "next/server"
import { createKaggleClient } from "@/utils/kaggle-integration"

export async function POST(req: NextRequest) {
  try {
    const { prompt, kaggleUsername, kaggleApiKey } = await req.json()
    const kaggleClient = createKaggleClient(kaggleUsername, kaggleApiKey)

    if (!kaggleClient.hasCredentials()) {
      return NextResponse.json({ error: "Kaggle credentials not configured. Add them in Settings." }, { status: 400 })
    }

    const searchResults = await kaggleClient.searchDatasets(prompt)
    const datasets = searchResults.datasets.slice(0, 5)
    const metadataResults = await Promise.all(
      datasets.map((ds) => kaggleClient.getDatasetMetadata(ds.ref).catch(() => null))
    )
    const datasetRows = datasets.map((ds, i) => {
      const meta = metadataResults[i]
      return {
        kaggle_ref: ds.ref,
        title: ds.title,
        description: ds.description,
        files: meta?.files || [],
        columns: meta?.columns || [],
      }
    })
    return NextResponse.json({ datasets: datasetRows })
  } catch (error) {
    let message = "Unknown error"
    if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      message = (error as any).message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
