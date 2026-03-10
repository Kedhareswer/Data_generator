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
    if (!zipBuffer) {
      return NextResponse.json({ error: `Failed to download dataset "${kaggle_ref}" from Kaggle` }, { status: 502 })
    }
    const directory = await unzipper.Open.buffer(zipBuffer)
    const normalizedName = file_name.toLowerCase()
    const csvFile = directory.files.find((f) => {
      const basename = f.path.split("/").pop() || f.path
      return basename.toLowerCase() === normalizedName || f.path.toLowerCase() === normalizedName
    })
    if (!csvFile) {
      return NextResponse.json({ error: `File "${file_name}" not found in dataset` }, { status: 404 })
    }

    // Stream directly from zip entry — only parse the first 20 rows
    const preview = await new Promise<Record<string, string>[]>((resolve, reject) => {
      const rows: Record<string, string>[] = []
      const parser = csvFile.stream().pipe(csvParse({ columns: true }))
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
