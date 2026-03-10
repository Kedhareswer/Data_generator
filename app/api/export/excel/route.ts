import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { z } from "zod"

const ExportSchema = z.object({
  rows: z.array(z.object({
    cells: z.array(z.object({ value: z.union([z.string(), z.number()]).default("") })),
  })),
})

export async function POST(req: NextRequest) {
  try {
    const { rows } = ExportSchema.parse(await req.json())

    const worksheetData = rows.map((row) => row.cells.map((cell) => cell.value))

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    })

    // Return Excel file
    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=spreadsheet.xlsx",
      },
    })
  } catch (error) {
    console.error("Excel export error:", error)
    return NextResponse.json({ error: "Failed to export Excel file" }, { status: 500 })
  }
}
