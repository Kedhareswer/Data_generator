type CellValue = string | number

export interface CellData {
  id: string
  value: CellValue
  formula: string
}

export interface RowData {
  id: string
  cells: CellData[]
}

function isNumeric(value: string): boolean {
  return !isNaN(Number.parseFloat(value)) && isFinite(Number(value))
}

export function evaluateFormula(formula: string, getCellValue: (cellId: string) => CellValue): CellValue {
  if (!formula.startsWith("=")) {
    return formula
  }

  const expression = formula.slice(1).toUpperCase()
  const cellPattern = /[A-Z]+[0-9]+/g
  const cellReferences = expression.match(cellPattern) || []

  let evaluatedExpression = expression
  for (const cellRef of cellReferences) {
    const cellValue = getCellValue(cellRef)
    evaluatedExpression = evaluatedExpression.replace(cellRef, cellValue.toString())
  }

  try {
    // Use Function constructor to safely evaluate the expression
    const result = new Function(`return ${evaluatedExpression}`)()
    return isNumeric(result) ? Number(result) : result
  } catch (error) {
    console.error("Error evaluating formula:", error)
    return "#ERROR!"
  }
}

export function getCellId(cellReference: string): string {
  const column = cellReference.match(/[A-Z]+/)?.[0] || ""
  const row = cellReference.match(/[0-9]+/)?.[0] || ""
  const colIndex = column.split("").reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0)
  return `${row}-${colIndex}`
}

export function getCellReference(cellId: string): string {
  const [row, col] = cellId.split("-").map(Number)
  let columnName = ""
  let columnNumber = col
  while (columnNumber > 0) {
    columnNumber--
    columnName = String.fromCharCode(65 + (columnNumber % 26)) + columnName
    columnNumber = Math.floor(columnNumber / 26)
  }
  return `${columnName}${row}`
}
