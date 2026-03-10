import { NextRequest, NextResponse } from "next/server"
import { createKaggleClient } from "@/utils/kaggle-integration"
import * as unzipper from "unzipper"
import { parse as csvParse } from "csv-parse"

export async function POST(req: NextRequest) {
  try {
    const { kaggle_ref, file_name, kaggleUsername, kaggleApiKey } = await req.json()

    if (typeof kaggle_ref !== "string" || kaggle_ref.trim() === "") {
      return NextResponse.json({ error: "Missing or invalid kaggle_ref" }, { status: 400 })
    }
    if (typeof file_name !== "string" || file_name.trim() === "") {
      return NextResponse.json({ error: "Missing or invalid file_name" }, { status: 400 })
    }

    const kaggleClient = createKaggleClient(kaggleUsername, kaggleApiKey)

    if (!kaggleClient.hasCredentials()) {
      return NextResponse.json({ error: "Kaggle credentials not configured. Add them in Settings." }, { status: 400 })
    }

    const zipBuffer = await kaggleClient.downloadDataset(kaggle_ref)
    if (!zipBuffer) throw new Error("Failed to download dataset from Kaggle")
    const directory = await unzipper.Open.buffer(zipBuffer)
    const csvFile = directory.files.find((f: any) => f.path === file_name)
    if (!csvFile) throw new Error("File not found in Kaggle dataset")
    const csvBuffer = await csvFile.buffer()

    // Stream-parse only the first 20 rows instead of loading everything
    const preview = await new Promise<Record<string, string>[]>((resolve, reject) => {
      const rows: Record<string, string>[] = []
      const parser = csvParse(csvBuffer.toString(), { columns: true })
      parser.on("data", (row: Record<string, string>) => {
        rows.push(row)
        if (rows.length >= 20) parser.destroy()
      })
      parser.on("end", () => resolve(rows))
      parser.on("close", () => resolve(rows))
      parser.on("error", reject)
    })

    return NextResponse.json({ preview })
  } catch (error) {
    let message = "Unknown error"
    if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      message = (error as any).message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
