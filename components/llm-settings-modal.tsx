"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "anthropic", label: "Anthropic" },
  { value: "groq", label: "Groq" },
]

const MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o (May/Nov 2024, March 2025)" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4.5", label: "GPT-4.5 (Preview)" },
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "o1", label: "O1 (Reasoning, Azure)" },
    { value: "o3-mini", label: "O3 Mini (Reasoning/Coding)" },
    { value: "custom", label: "Custom..." },
  ],
  gemini: [
    { value: "gemini-2-5-pro", label: "Gemini 2.5 Pro (Preview, 2025)" },
    { value: "gemini-2-5-flash", label: "Gemini 2.5 Flash (Reasoning, 2025)" },
    { value: "gemini-2-0-pro-experimental-02-05", label: "Gemini 2.0 Pro Experimental (Feb '25)" },
    { value: "gemini-2-0-flash", label: "Gemini 2.0 Flash (Feb '25)" },
    { value: "gemini-1-5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1-5-flash", label: "Gemini 1.5 Flash" },
    { value: "gemini-1-0-pro", label: "Gemini 1.0 Pro" },
    { value: "gemini-1-0-ultra", label: "Gemini 1.0 Ultra" },
    { value: "custom", label: "Custom..." },
  ],
  groq: [
    { value: "llama3-70b-8192", label: "Llama 3 70B 8K" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B 32K" },
    { value: "custom", label: "Custom..." },
  ],
  cohere: [
    { value: "command-r-plus", label: "Command R+" },
    { value: "command-r", label: "Command R" },
    { value: "command", label: "Command" },
    { value: "command-light", label: "Command Light" },
    { value: "command-nightly", label: "Command Nightly" },
    { value: "custom", label: "Custom..." },
  ],
}

export function LLMSettingsModal({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (v: boolean) => void; onSave?: (settings: any) => void }) {
  const [provider, setProvider] = useState("openai")
  const [model, setModel] = useState(MODELS["openai"][0].value)
  const [apiKey, setApiKey] = useState("")
  const [customModel, setCustomModel] = useState("")

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("llmSettings")
    if (saved) {
      const parsed = JSON.parse(saved)
      setProvider(parsed.provider || "openai")
      setModel(parsed.model || MODELS[parsed.provider || "openai"][0].value)
      setApiKey(parsed.apiKey || "")
      setCustomModel(parsed.customModel || "")
    }
  }, [])

  // Update model when provider changes
  useEffect(() => {
    setModel(MODELS[provider][0].value)
    setCustomModel("")
  }, [provider])

  const handleSave = () => {
    const settings = { provider, model: model === "custom" ? customModel : model, apiKey }
    localStorage.setItem("llmSettings", JSON.stringify(settings))
    if (onSave) onSave(settings)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <DialogHeader>
            <DialogTitle>AI Provider Settings</DialogTitle>
            <DialogDescription>
              Choose your preferred AI provider, model, and enter your API key. Your settings are stored locally and never sent to our servers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block mb-1 font-medium">Provider</label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Model</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS[provider].map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {model === "custom" && (
                <Input
                  className="mt-2"
                  value={customModel}
                  onChange={e => setCustomModel(e.target.value)}
                  placeholder="Enter custom model name"
                />
              )}
            </div>
            <div>
              <label className="block mb-1 font-medium">API Key</label>
              <Input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
} 