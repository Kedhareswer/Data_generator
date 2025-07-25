import { NextRequest, NextResponse } from "next/server"
import { kaggleClient } from "@/utils/kaggle-integration"
// Import mcp_Neon_run_sql from the global functions namespace
// @ts-expect-error: mcp_Neon_run_sql is injected by the platform
const { mcp_Neon_run_sql } = globalThis.functions || {}

const NEON_PROJECT_ID = "long-breeze-94604644"

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()
    // Search Kaggle for datasets
    const searchResults = await kaggleClient.searchDatasets(prompt)
    const datasets = searchResults.datasets.slice(0, 5) // Limit to top 5
    const now = new Date().toISOString()
    const datasetRows = []
    for (const ds of datasets) {
      // Get metadata and files for each dataset
      const meta = await kaggleClient.getDatasetMetadata(ds.ref)
      const files = meta?.files || []
      const columns = meta?.columns || []
      // Upsert in Neon
      await mcp_Neon_run_sql({
        params: {
          sql: `INSERT INTO kaggle_datasets (kaggle_ref, title, description, files, columns, preview, created_at, user_selected) VALUES ($1, $2, $3, $4, $5, $6, $7, false)
          ON CONFLICT (kaggle_ref) DO UPDATE SET last_used = $7, title = $2, description = $3, files = $4, columns = $5 RETURNING id` ,
          projectId: NEON_PROJECT_ID,
        },
        args: [ds.ref, ds.title, ds.description, JSON.stringify(files), JSON.stringify(columns), null, now],
      })
      datasetRows.push({
        kaggle_ref: ds.ref,
        title: ds.title,
        description: ds.description,
        files,
        columns,
      })
    }
    // Log audit trail
    await mcp_Neon_run_sql({
      params: {
        sql: `INSERT INTO audit_trail (event_type, event_data, created_at) VALUES ($1, $2, $3)` ,
        projectId: NEON_PROJECT_ID,
      },
      args: ["kaggle_search", JSON.stringify({ prompt, results: datasetRows }), now],
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