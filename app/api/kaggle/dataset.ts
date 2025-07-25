import { NextRequest, NextResponse } from "next/server"
// Import mcp_Neon_run_sql from the global functions namespace
// @ts-expect-error: mcp_Neon_run_sql is injected by the platform
const { mcp_Neon_run_sql } = globalThis.functions || {}

const NEON_PROJECT_ID = "long-breeze-94604644"

export async function POST(req: NextRequest) {
  try {
    const { kaggle_ref } = await req.json()
    const now = new Date().toISOString()
    // Mark the dataset as user_selected
    await mcp_Neon_run_sql({
      params: {
        sql: `UPDATE kaggle_datasets SET user_selected = true, last_used = $2 WHERE kaggle_ref = $1`,
        projectId: NEON_PROJECT_ID,
      },
      args: [kaggle_ref, now],
    })
    // Get the files for this dataset
    const result = await mcp_Neon_run_sql({
      params: {
        sql: `SELECT files FROM kaggle_datasets WHERE kaggle_ref = $1`,
        projectId: NEON_PROJECT_ID,
      },
      args: [kaggle_ref],
    })
    let files: string[] = []
    if (result && result.rows && result.rows[0] && result.rows[0].files) {
      try {
        files = JSON.parse(result.rows[0].files)
      } catch {
        files = []
      }
    }
    // Log audit trail
    await mcp_Neon_run_sql({
      params: {
        sql: `INSERT INTO audit_trail (event_type, event_data, created_at) VALUES ($1, $2, $3)` ,
        projectId: NEON_PROJECT_ID,
      },
      args: ["kaggle_dataset_selected", JSON.stringify({ kaggle_ref, files }), now],
    })
    return NextResponse.json({ files })
  } catch (error) {
    let message = "Unknown error"
    if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      message = (error as any).message
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
} 