import { NextRequest, NextResponse } from "next/server"
import { kaggleClient } from "@/utils/kaggle-integration"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    const searchResults = await kaggleClient.searchDatasets(prompt)
    const datasets = searchResults.datasets.slice(0, 5)
    const datasetRows = []
    for (const ds of datasets) {
      const meta = await kaggleClient.getDatasetMetadata(ds.ref)
      const files = meta?.files || []
      const columns = meta?.columns || []
      datasetRows.push({
        kaggle_ref: ds.ref,
        title: ds.title,
        description: ds.description,
        files,
        columns,
      })
    }
    return NextResponse.json({ datasets: datasetRows })
  } catch (error) {
    let message = "Unknown error"
    if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      message = (error as any).message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
