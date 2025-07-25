"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useChat } from "ai/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ChevronRight, ChevronDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { SocialLinks } from "./social-links"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { type RowData, evaluateFormula, getCellId, getCellReference } from "@/utils/spreadsheet"
import { Download, Database, Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { LLMSettingsModal } from "@/components/llm-settings-modal"
import { Settings } from "lucide-react"

const COLUMNS = 10
const ROWS = 20

export function IntelligentSpreadsheet() {
  const [rows, setRows] = useState<RowData[]>(
    Array.from({ length: ROWS }, (_, rowIndex) => ({
      id: (rowIndex + 1).toString(),
      cells: Array.from({ length: COLUMNS }, (_, colIndex) => ({
        id: `${rowIndex + 1}-${colIndex + 1}`,
        value: "",
        formula: "",
      })),
    })),
  )

  const [activeCell, setActiveCell] = useState<string | null>(null)
  const [cellCommandModalOpen, setCellCommandModalOpen] = useState(false)
  const [cellCommand, setCellCommand] = useState("")
  const [cellCommandLoading, setCellCommandLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const inputRef = useRef<HTMLInputElement>(null)

  const [dataSource, setDataSource] = useState<string>("auto")
  const [isGeneratingData, setIsGeneratingData] = useState(false)
  const [lastDataQuery, setLastDataQuery] = useState<string>("")
  const [dataMetadata, setDataMetadata] = useState<any>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [examplePromptsExpanded, setExamplePromptsExpanded] = useState(false)
  const [llmSettings, setLLMSettings] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("llmSettings")
      return saved ? JSON.parse(saved) : null
    }
    return null
  })

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, error } = useChat({
    api: "/api/spreadsheet",
    onResponse: (response) => {
      if (!response.ok) {
        toast.error("Failed to process command")
      }
    },
    onFinish: (message) => {
      try {
        const action = JSON.parse(message.content)
        if (Object.keys(action).length === 0) {
          throw new Error("Empty response from AI")
        }
        executeAction(action)
        if (action.type !== "ERROR") {
          toast.success("Command executed successfully")
        }
      } catch (error) {
        console.error("Failed to parse AI response:", error)
        toast.error(`Failed to parse AI response: ${error instanceof Error ? error.message : String(error)}`)
      }
    },
  })

  const getCellValue = (cellReference: string): string | number => {
    const cellId = getCellId(cellReference)
    const [rowIndex, colIndex] = cellId.split("-").map((num) => Number.parseInt(num) - 1)
    const cell = rows[rowIndex]?.cells[colIndex]
    return cell ? evaluateFormula(cell.formula || cell.value.toString(), getCellValue) : "#REF!"
  }

  const executeAction = (action: { type: string; payload: any }) => {
    console.log("Executing action:", action) // Debug log
    switch (action.type) {
      case "EDIT_CELL":
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.id === action.payload.rowId
              ? {
                  ...row,
                  cells: row.cells.map((cell) =>
                    cell.id === action.payload.cellId
                      ? { ...cell, value: action.payload.value, formula: action.payload.value }
                      : cell,
                  ),
                }
              : row,
          ),
        )
        break
      case "ADD_DATA":
        setRows((prevRows) =>
          prevRows.map((row) =>
            row.id === action.payload.rowId
              ? {
                  ...row,
                  cells: row.cells.map((cell, index) =>
                    index === action.payload.columnIndex
                      ? { ...cell, value: action.payload.value, formula: action.payload.value }
                      : cell,
                  ),
                }
              : row,
          ),
        )
        break
      case "ADD_MULTIPLE_DATA":
        setRows((prevRows) => {
          const newRows = [...prevRows]
          action.payload.forEach((rowData: { rowId: string; values: string[] }) => {
            const rowIndex = Number.parseInt(rowData.rowId) - 1
            if (rowIndex >= 0 && rowIndex < newRows.length) {
              newRows[rowIndex] = {
                ...newRows[rowIndex],
                cells: newRows[rowIndex].cells.map((cell, index) => ({
                  ...cell,
                  value: index < rowData.values.length ? rowData.values[index] : cell.value,
                  formula: index < rowData.values.length ? rowData.values[index] : cell.formula,
                })),
              }
            }
          })
          return newRows
        })
        break
      case "ERROR":
        toast.error(action.payload.message)
        break
      default:
        console.error("Unknown action type:", action.type)
        toast.error("Unknown action type")
    }
  }

  const handleCellClick = (cellId: string) => {
    setActiveCell(cellId)
    setCellCommandModalOpen(true)
    const [rowIndex, colIndex] = cellId.split("-").map((num) => Number.parseInt(num) - 1)
    const cell = rows[rowIndex]?.cells[colIndex]
    setCellCommand(cell?.formula || cell?.value?.toString() || "")
  }

  const handleCellChange = (cellId: string, value: string) => {
    setRows((prevRows) =>
      prevRows.map((row) => ({
        ...row,
        cells: row.cells.map((cell) => (cell.id === cellId ? { ...cell, value, formula: value } : cell)),
      })),
    )
  }

  const handleMainInputSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmit(e)
  }

  const handleCellCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (activeCell) {
      const cellReference = getCellReference(activeCell)
      const command = `For cell ${cellReference}: ${cellCommand}`

      setCellCommandLoading(true)
      setDebugInfo("")

      try {
        const response = await fetch("/api/cell-command", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ command }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const responseText = await response.text()
        setDebugInfo(`Raw response: ${responseText}`)

        try {
          const action = JSON.parse(responseText)
          if (action.type && action.payload) {
            executeAction(action)
            toast.success("Cell command executed successfully")
          } else {
            throw new Error("Invalid response format from server")
          }
        } catch (parseError) {
          throw new Error(
            `Failed to parse response: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          )
        }
      } catch (error) {
        console.error("Failed to execute cell command:", error)
        setDebugInfo(`Error: ${error instanceof Error ? error.message : String(error)}`)
        toast.error(`Failed to execute cell command: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setCellCommandLoading(false)
        setCellCommandModalOpen(false)
        setCellCommand("")
      }
    }
  }

  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus()
    }
  }, [activeCell])

  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }, [error])

  const exportToCSV = () => {
    const csvContent = rows.map((row) => row.cells.map((cell) => `"${cell.value}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "spreadsheet.csv"
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success("Exported to CSV successfully")
  }

  const exportToExcel = async () => {
    try {
      const response = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "spreadsheet.xlsx"
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("Exported to Excel successfully")
    } catch (error) {
      toast.error("Failed to export to Excel")
    }
  }

  const handleDataGeneration = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGeneratingData(true)
    setLastDataQuery(input)

    try {
      const response = await fetch("/api/data-generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: input,
          dataSource,
          currentData: rows,
          userProvider: llmSettings?.provider,
          userModel: llmSettings?.model,
          userApiKey: llmSettings?.apiKey,
        }),
      })

      if (!response.ok) throw new Error("Data generation failed")

      const result = await response.json()
      if (result.action) {
        executeAction(result.action)
        setDataMetadata(result.metadata)
        setIsPreviewMode(result.metadata?.isPreview || false)
        toast.success(
          result.metadata?.isPreview
            ? "Data preview generated successfully (20 rows shown)"
            : "Data generated successfully",
        )
      }
    } catch (error) {
      console.error("Data generation error:", error)
      toast.error("Failed to generate data")
    } finally {
      setIsGeneratingData(false)
    }
  }

  const examplePrompts = [
    "Netflix movies with IMDB_ID, title, genre, and release year",
    "Top 100 tech companies with revenue and employee count",
    "Olympic athletes with medals and countries from 2020",
    "Stock market data for FAANG companies with prices",
    "Popular books with ISBN, author, genre, and publication year",
    "World's largest cities with population and country",
    "Cryptocurrency prices with market cap and volume",
    "Fortune 500 companies with industry and headquarters",
    "Premier League football players with goals and assists",
    "Nobel Prize winners with category and year",
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto p-4">
      <motion.h1 initial={{ y: -20 }} animate={{ y: 0 }} className="text-2xl font-bold mb-4 text-center">
        Data Generator
      </motion.h1>
      <LLMSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} onSave={setLLMSettings} />
      <SocialLinks />

      <motion.div
        className="space-y-4 mb-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex gap-2 items-center">
          <Select value={dataSource} onValueChange={setDataSource}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select data source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-detect</SelectItem>
              <SelectItem value="kaggle">Kaggle</SelectItem>
              <SelectItem value="web">Web Search</SelectItem>
              <SelectItem value="synthetic">AI Generated</SelectItem>
            </SelectContent>
          </Select>
          {llmSettings && (
            <Badge variant="secondary">
              {llmSettings.provider.charAt(0).toUpperCase() + llmSettings.provider.slice(1)}
              {llmSettings.model ? ` • ${llmSettings.model}` : ""}
            </Badge>
          )}
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)} aria-label="Settings">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <form onSubmit={handleDataGeneration} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Enter your data request (e.g., 'Netflix movies with IMDB_ID, title, genre, and release year')"
            className="flex-grow"
            disabled={isLoading || isGeneratingData}
          />
          <Button type="submit" disabled={isLoading || isGeneratingData}>
            {isGeneratingData ? (
              <>
                <Database className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Generate Data
              </>
            )}
          </Button>
        </form>

        {dataMetadata && (
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">Source: {dataMetadata.source}</Badge>
            <Badge variant="secondary">Records: {dataMetadata.recordCount}</Badge>
            {dataMetadata.isPreview && <Badge variant="outline">Preview (20 rows max)</Badge>}
            <Badge variant="secondary">Last Updated: {new Date(dataMetadata.timestamp).toLocaleString()}</Badge>
          </div>
        )}
      </motion.div>

      <motion.div
        className="mb-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h2
          className="text-xl font-semibold mb-2 flex items-center cursor-pointer hover:text-gray-600 transition-colors"
          onClick={() => setExamplePromptsExpanded(!examplePromptsExpanded)}
        >
          {examplePromptsExpanded ? <ChevronDown className="mr-2" /> : <ChevronRight className="mr-2" />}
          Example Prompts
        </h2>
        <AnimatePresence>
          {examplePromptsExpanded && (
            <motion.ul
              className="space-y-2 max-h-60 overflow-y-auto"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {examplePrompts.map((example, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-muted p-2 rounded flex items-center cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => setInput(example)}
                >
                  <ChevronRight className="mr-2 flex-shrink-0" />
                  <span>{example}</span>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className="overflow-x-auto rounded-lg border shadow-lg"
      >
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-10"></th>
              {Array.from({ length: COLUMNS }, (_, i) => (
                <motion.th
                  key={i}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="w-24 h-8 bg-gray-100 border text-center font-semibold"
                >
                  {String.fromCharCode(65 + i)}
                </motion.th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: rowIndex * 0.03 }}
              >
                <td className="w-10 h-8 bg-gray-100 border text-center font-semibold">{rowIndex + 1}</td>
                {row.cells.map((cell) => (
                  <td
                    key={cell.id}
                    className="w-24 h-8 border relative cursor-pointer hover:bg-gray-50"
                    onClick={() => handleCellClick(cell.id)}
                  >
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-full p-1 overflow-hidden"
                    >
                      {getCellValue(getCellReference(cell.id))}
                    </motion.div>
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <Dialog open={cellCommandModalOpen} onOpenChange={setCellCommandModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter command for cell {activeCell ? getCellReference(activeCell) : ""}</DialogTitle>
            <DialogDescription>
              Enter a command or formula for this cell (e.g., "Set value to 100" or "=A1+B1")
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCellCommandSubmit} className="flex flex-col gap-4">
            <Input
              value={cellCommand}
              onChange={(e) => setCellCommand(e.target.value)}
              placeholder="Enter formula or value"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCellCommandModalOpen(false)}
                disabled={cellCommandLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={cellCommandLoading}>
                {cellCommandLoading ? "Processing..." : "Execute"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {debugInfo && (
        <div className="mt-4 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Debug Information:</h3>
          <pre className="whitespace-pre-wrap">{debugInfo}</pre>
        </div>
      )}
    </motion.div>
  )
}
