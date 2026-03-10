import { z } from "zod"
import { callLLM } from "@/utils/llmProviders"

const CellCommandSchema = z.object({
  type: z.literal("EDIT_CELL"),
  payload: z.object({
    rowId: z.string(),
    cellId: z.string(),
    value: z.string(),
  }),
})

const InputSchema = z.object({
  command: z.string().min(1, "Command cannot be empty"),
})

export async function POST(req: Request) {
  let command: string
  try {
    const body = InputSchema.parse(await req.json())
    command = body.command
  } catch {
    return new Response(
      JSON.stringify({ type: "ERROR", payload: { message: "Invalid request: command is required" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  try {
    const object = await callLLM({
      prompt: `Parse this cell command and return the appropriate action:

Command: "${command}"

For cell-specific commands, extract:
- The cell reference (like A1, B3, etc.)
- The action to perform
- The value to set

Convert cell references to rowId and cellId:
- A1 = rowId: "1", cellId: "1-1"
- B3 = rowId: "3", cellId: "3-2"
- C5 = rowId: "5", cellId: "5-3"

Return a JSON object with type "EDIT_CELL" and the appropriate payload.`,
      schema: CellCommandSchema,
    })

    return new Response(JSON.stringify(object), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error processing cell command:", error)
    return new Response(
      JSON.stringify({
        type: "ERROR",
        payload: { message: "Failed to process the command. Please try again." },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
