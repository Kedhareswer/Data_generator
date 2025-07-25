import { callLLM } from "@/utils/llmProviders"
import { z } from "zod"

export async function POST(req: Request) {
  const { messages } = await req.json()

  // For now, join messages into a single prompt for callLLM
  const prompt = messages.map((m: any) => m.content).join("\n")

  const schema = z.any() // Accept any JSON object

  const result = await callLLM({
    prompt: `You are an AI assistant that helps users manage a spreadsheet. 
Your task is to interpret user commands and respond with a JSON object 
that represents the action to be taken.

The spreadsheet has 20 rows and 10 columns (A to J).

When adding data about rankings, earnings, or statistics, format the response as follows:
{
  "type": "ADD_MULTIPLE_DATA",
  "payload": [
    { "rowId": "1", "values": ["Rank", "Name", "Earnings (USD)", "Year Peak", "Notable Brands"] },
    { "rowId": "2", "values": ["1", "Gisele Bundchen", "$400 million", "2015", "Victoria's Secret, Chanel"] },
    { "rowId": "3", "values": ["2", "Kendall Jenner", "$350 million", "2022", "Calvin Klein, Estée Lauder"] }
  ]
}

For cell-specific commands, use the following format:
"For cell A1: Set value to 100" should output:
{ "type": "EDIT_CELL", "payload": { "rowId": "1", "cellId": "1-1", "value": "100" } }

"For cell B3: Calculate sum of A1:A5" should output:
{ "type": "EDIT_CELL", "payload": { "rowId": "3", "cellId": "3-2", "value": "=SUM(A1:A5)" } }

For regular cell updates:
"Change A1 to hello" should output:
{ "type": "EDIT_CELL", "payload": { "rowId": "1", "cellId": "1-1", "value": "hello" } }

ALWAYS return a properly formatted JSON response. 
If you're unsure about the data or command, respond with:
{ "type": "ERROR", "payload": { "message": "I couldn't process that request. Please try again." } }

Respond only with the JSON object, no additional text.\n\nUser messages:\n${prompt}`,
    schema,
  })

  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  })
}
