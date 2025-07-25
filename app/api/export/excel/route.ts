import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json()

    // Convert rows to worksheet data
    const worksheetData = rows.map((row: any) => row.cells.map((cell: any) => cell.value))

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
