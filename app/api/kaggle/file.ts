import { NextRequest, NextResponse } from "next/server"
import { kaggleClient } from "@/utils/kaggle-integration"
import * as unzipper from "unzipper"
import * as csv from "csv-parse/sync"

export async function POST(req: NextRequest) {
  try {
    const { kaggle_ref, file_name } = await req.json()
    const zipBuffer = await kaggleClient.downloadDataset(kaggle_ref)
    if (!zipBuffer) throw new Error("Failed to download dataset from Kaggle")
    const directory = await unzipper.Open.buffer(zipBuffer)
    const csvFile = directory.files.find((f: any) => f.path === file_name)
    if (!csvFile) throw new Error("File not found in Kaggle dataset")
    const csvBuffer = await csvFile.buffer()
    const records = csv.parse(csvBuffer.toString(), { columns: true })
    const preview = records.slice(0, 20)
    return NextResponse.json({ preview, cached: false })
  } catch (error) {
    let message = "Unknown error"
    if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      message = (error as any).message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
