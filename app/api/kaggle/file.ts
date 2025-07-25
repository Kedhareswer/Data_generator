import { NextRequest, NextResponse } from "next/server"
import { kaggleClient } from "@/utils/kaggle-integration"
import * as unzipper from "unzipper"
import * as csv from "csv-parse/sync"
import crypto from "crypto"
// Import mcp_Neon_run_sql from the global functions namespace
// @ts-expect-error: mcp_Neon_run_sql is injected by the platform
const { mcp_Neon_run_sql } = globalThis.functions || {}

const NEON_PROJECT_ID = "long-breeze-94604644"

export async function POST(req: NextRequest) {
  try {
    const { kaggle_ref, file_name } = await req.json()
    const now = new Date().toISOString()
    // Check cache in Neon
    let cachedPreview = null
    const cacheResult = await mcp_Neon_run_sql({
      params: {
        sql: `SELECT data_preview FROM kaggle_file_cache WHERE kaggle_ref = $1 AND file_name = $2 ORDER BY created_at DESC LIMIT 1`,
        projectId: NEON_PROJECT_ID,
      },
      args: [kaggle_ref, file_name],
    })
    if (cacheResult && cacheResult.rows && cacheResult.rows[0] && cacheResult.rows[0].data_preview) {
      try {
        cachedPreview = JSON.parse(cacheResult.rows[0].data_preview)
      } catch {
        cachedPreview = null
      }
    }
    // If cache hit, return preview
    if (cachedPreview) {
      await mcp_Neon_run_sql({
        params: {
          sql: `INSERT INTO audit_trail (event_type, event_data, created_at) VALUES ($1, $2, $3)` ,
          projectId: NEON_PROJECT_ID,
        },
        args: ["kaggle_file_cache_hit", JSON.stringify({ kaggle_ref, file_name }), now],
      })
      return NextResponse.json({ preview: cachedPreview, cached: true })
    }
    // Download dataset
    const zipBuffer = await kaggleClient.downloadDataset(kaggle_ref)
    if (!zipBuffer) throw new Error("Failed to download dataset from Kaggle")
    // Unzip and find the requested file
    const directory = await unzipper.Open.buffer(zipBuffer)
    const csvFile = directory.files.find((f: any) => f.path === file_name)
    if (!csvFile) throw new Error("File not found in Kaggle dataset")
    const csvBuffer = await csvFile.buffer()
    const records = csv.parse(csvBuffer.toString(), { columns: true })
    const preview = records.slice(0, 20)
    // Store in cache
    const fileHash = crypto.createHash("sha256").update(csvBuffer).digest("hex")
    await mcp_Neon_run_sql({
      params: {
        sql: `INSERT INTO kaggle_file_cache (kaggle_ref, file_name, file_hash, data_preview, created_at) VALUES ($1, $2, $3, $4, $5)` ,
        projectId: NEON_PROJECT_ID,
      },
      args: [kaggle_ref, file_name, fileHash, JSON.stringify(preview), now],
    })
    // Log audit trail
    await mcp_Neon_run_sql({
      params: {
        sql: `INSERT INTO audit_trail (event_type, event_data, created_at) VALUES ($1, $2, $3)` ,
        projectId: NEON_PROJECT_ID,
      },
      args: ["kaggle_file_preview_generated", JSON.stringify({ kaggle_ref, file_name, fileHash }), now],
    })
    return NextResponse.json({ preview, cached: false })
  } catch (error) {
    let message = "Unknown error"
    if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      message = (error as any).message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
