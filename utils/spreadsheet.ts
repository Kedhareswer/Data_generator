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

// Safe math expression evaluator — only allows numbers, arithmetic operators, parentheses, and whitespace
function safeEvaluateMath(expression: string): number {
  const sanitized = expression.replace(/\s+/g, "")
  // Only allow digits, decimal points, +, -, *, /, parentheses
  if (!/^[\d.+\-*/()]+$/.test(sanitized)) {
    throw new Error("Invalid characters in expression")
  }
  // Validate no empty parentheses or double operators
  if (/\(\)/.test(sanitized) || /[+\-*/]{2,}/.test(sanitized.replace(/[+\-](?=[+\-])/g, ""))) {
    throw new Error("Invalid expression syntax")
  }
  // Use Function with strict validation — expression is guaranteed to only contain math tokens
  const result = new Function(`"use strict"; return (${sanitized})`)()
  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error("Expression did not evaluate to a finite number")
  }
  return result
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
    const result = safeEvaluateMath(evaluatedExpression)
    return result
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
