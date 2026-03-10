import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getDataExample } from "@/utils/data-examples"
import { callLLM } from "@/utils/llmProviders"
import { createKaggleClient } from "@/utils/kaggle-integration"
import * as unzipper from "unzipper"
import * as csv from "csv-parse/sync"

const DataAnalysisSchema = z.object({
  dataType: z.enum(["movies", "companies", "people", "products", "sports", "general"]),
  columns: z.array(z.string()),
  estimatedRows: z.number(),
  searchStrategy: z.enum(["kaggle", "web", "synthetic", "hybrid"]),
  searchTerms: z.array(z.string()),
  reasoning: z.string(),
})

const SyntheticDataSchema = z.object({
  data: z.array(z.record(z.string(), z.string())),
})

async function generateRealisticData(columns: string[], rows: number, dataType: string, userProvider?: string, userModel?: string, userApiKey?: string) {
  const result = await callLLM({
    prompt: `Generate ${rows} realistic rows of ${dataType} data with these columns: ${columns.join(", ")}.

Respond ONLY with a valid JSON object matching this schema:
{
  "data": [
    { ${columns.map(col => `"${col}": "..."`).join(", ")} }
  ]
}

Do NOT include any explanation, markdown, or code block. Only output the JSON.`,
    schema: SyntheticDataSchema,
    userProvider,
    userModel,
    userApiKey,
  })
  return result.data
}

function isRecordStringString(obj: unknown): obj is Record<string, string> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Object.values(obj).every(v => typeof v === "string")
  )
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, dataSource, currentData, userProvider, userModel, userApiKey, kaggleUsername, kaggleApiKey } = await req.json()


    // Step 1: Analyze the user request
    const analysis = await callLLM({
      prompt: `Analyze this data request and determine the structure needed.\n\nRequest: "${prompt}"\nData Source Preference: ${dataSource}\n\nRespond ONLY with a valid JSON object matching this schema:\n{\n  "dataType": "movies | companies | people | products | sports | general",\n  "columns": [string],\n  "estimatedRows": number,\n  "searchStrategy": "kaggle | web | synthetic | hybrid",\n  "searchTerms": [string],\n  "reasoning": string\n}\n\nDo NOT include any explanation, markdown, or code block. Only output the JSON.`,
      schema: DataAnalysisSchema,
      userProvider,
      userModel,
      userApiKey,
    })


    // Step 2: Try to get real data from Kaggle first
    let retrievedData: Record<string, string>[] = []
    let actualSource = "synthetic"

    if (dataSource === "kaggle" || analysis.searchStrategy === "kaggle") {
      const kaggleClient = createKaggleClient(kaggleUsername, kaggleApiKey)

      if (!kaggleClient.hasCredentials()) {
      } else {
        const searchQuery = analysis.searchTerms.join(" ")
        const searchResult = await kaggleClient.searchDatasets(searchQuery)

        if (searchResult.datasets.length > 0) {
          try {
            const datasetRef = searchResult.datasets[0].ref
            const zipBuffer = await kaggleClient.downloadDataset(datasetRef)
            if (zipBuffer) {
              const directory = await unzipper.Open.buffer(zipBuffer)
              const csvFile = directory.files.find((f: any) => f.path.endsWith(".csv"))
              if (csvFile) {
                const csvBuffer = await csvFile.buffer()
                const records = csv.parse(csvBuffer.toString(), { columns: true })
                const kaggleColumns = Object.keys(records[0] || {})
                const requestedColumns = analysis.columns
                const columnsMatch = requestedColumns.every((col: string) => kaggleColumns.includes(col))
                let previewData = records.slice(0, 20)
                if (!columnsMatch) {
                  const transformPrompt = `Transform the following raw data to match the target schema:
Raw Data Sample: ${JSON.stringify(previewData)}
Target Columns: ${requestedColumns.join(", ")}

Rules:
1. Map existing fields to target columns where possible
2. Generate missing data that makes logical sense
3. Ensure data consistency and proper formatting
4. Handle data type conversions appropriately

Return the transformed data as a JSON object with a single property "data" that is an array of objects, where each object has keys matching the target columns.

Do NOT include any explanation, markdown, or code block. Only output the JSON.`
                  const transformed = await callLLM({
                    prompt: transformPrompt,
                    schema: z.object({ data: z.array(z.record(z.string(), z.string())) }),
                    userProvider,
                    userModel,
                    userApiKey,
                  })
                  previewData = Array.isArray(transformed.data)
                    ? (transformed.data as unknown[]).filter(isRecordStringString)
                    : []
                }
                retrievedData = previewData as Record<string, string>[]
                actualSource = "kaggle"
              }
            }
          } catch (err) {
            console.error("Kaggle data download/parse/transform failed:", err)
          }
        }
      }
    }

    // Step 3: Use predefined realistic data or generate synthetic data
    if (retrievedData.length === 0) {
      const predefinedData = getDataExample(
        analysis.dataType,
        analysis.columns,
        Math.min(analysis.estimatedRows, 20),
      )

      if (predefinedData.length > 0) {
        retrievedData = predefinedData
        actualSource = "predefined"
      } else {
        retrievedData = await generateRealisticData(
          analysis.columns,
          Math.min(analysis.estimatedRows, 20),
          analysis.dataType,
          userProvider,
          userModel,
          userApiKey,
        )
        actualSource = "synthetic"
      }
    }


    // Step 4: Format data for spreadsheet (limit to 20 rows for preview)
    const limitedData = retrievedData.slice(0, 20)

    const formattedData = [
      {
        rowId: "1",
        values: analysis.columns,
      },
      ...limitedData.map((row: Record<string, string>, index: number) => ({
        rowId: (index + 2).toString(),
        values: analysis.columns.map((col: string) => row[col] || ""),
      })),
    ]

    const action = {
      type: "ADD_MULTIPLE_DATA",
      payload: formattedData,
    }

    const metadata = {
      source: actualSource,
      recordCount: limitedData.length,
      timestamp: new Date().toISOString(),
      columns: analysis.columns,
      dataType: analysis.dataType,
      reasoning: analysis.reasoning,
      isPreview: limitedData.length === 20,
    }


    return NextResponse.json({ action, metadata })
  } catch (error) {
    console.error("Data generation error:", error)
    let message = "Unknown error"
    if (error && typeof error === "object" && "message" in error && typeof (error as any).message === "string") {
      message = (error as any).message
    }
    return NextResponse.json(
      {
        action: {
          type: "ERROR",
          payload: { message: `Failed to generate data: ${message}` },
        },
      },
      { status: 500 },
    )
  }
}
