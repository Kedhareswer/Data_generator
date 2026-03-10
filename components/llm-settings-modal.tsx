"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { toast } from "sonner"

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "groq", label: "Groq" },
  { value: "cohere", label: "Cohere" },
]

const MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o (Latest)" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "custom", label: "Custom..." },
  ],
  anthropic: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Latest)" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    { value: "custom", label: "Custom..." },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro (Latest)" },
    { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash (Latest)" },
    { value: "custom", label: "Custom..." },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B Versatile" },
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B 32K" },
    { value: "custom", label: "Custom..." },
  ],
  cohere: [
    { value: "command-r-plus-08-2024", label: "Command R+ (Aug 2024)" },
    { value: "command-r-08-2024", label: "Command R (Aug 2024)" },
    { value: "command-r-plus", label: "Command R+" },
    { value: "command-r", label: "Command R" },
    { value: "custom", label: "Custom..." },
  ],
}

export function LLMSettingsModal({
  open,
  onOpenChange,
  onSave,
}: { open: boolean; onOpenChange: (v: boolean) => void; onSave?: (settings: any) => void }) {
  const [provider, setProvider] = useState("openai")
  const [model, setModel] = useState(MODELS["openai"][0].value)
  const [apiKey, setApiKey] = useState("")
  const [customModel, setCustomModel] = useState("")
  const [kaggleUsername, setKaggleUsername] = useState("")
  const [kaggleApiKey, setKaggleApiKey] = useState("")

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("llmSettings")
    if (saved) {
      const parsed = JSON.parse(saved)
      setProvider(parsed.provider || "openai")
      const providerModels = MODELS[parsed.provider || "openai"]
      setModel(parsed.model || (providerModels ? providerModels[0].value : "custom"))
      setApiKey(parsed.apiKey || "")
      setCustomModel(parsed.customModel || "")
      setKaggleUsername(parsed.kaggleUsername || "")
      setKaggleApiKey(parsed.kaggleApiKey || "")
    }
  }, [])

  // Update model when provider changes
  useEffect(() => {
    const providerModels = MODELS[provider]
    if (providerModels) {
      setModel(providerModels[0].value)
    }
    setCustomModel("")
  }, [provider])

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("API key is required")
      return
    }

    const settings = {
      provider,
      model: model === "custom" ? customModel : model,
      apiKey,
      kaggleUsername,
      kaggleApiKey,
    }
    localStorage.setItem("llmSettings", JSON.stringify(settings))
    if (onSave) onSave(settings)
    onOpenChange(false)

    const providerLabel = PROVIDERS.find((p) => p.value === provider)?.label || provider
    toast.success(`Settings saved — using ${providerLabel}`)
  }

  const providerModels = MODELS[provider] || [{ value: "custom", label: "Custom..." }]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Configure your AI provider and Kaggle credentials. All settings are stored locally in your browser.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI Provider</h3>
              <div>
                <label className="block mb-1 font-medium">Provider</label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
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
                    {providerModels.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {model === "custom" && (
                  <Input
                    className="mt-2"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="Enter custom model name"
                  />
                )}
              </div>
              <div>
                <label className="block mb-1 font-medium">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Kaggle (Optional)</h3>
              <p className="text-sm text-muted-foreground">
                Add your Kaggle credentials to search and download real datasets. Get your API key from{" "}
                <a
                  href="https://www.kaggle.com/settings/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  kaggle.com/settings/account
                </a>.
              </p>
              <div>
                <label className="block mb-1 font-medium">Kaggle Username</label>
                <Input
                  value={kaggleUsername}
                  onChange={(e) => setKaggleUsername(e.target.value)}
                  placeholder="your-kaggle-username"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="block mb-1 font-medium">Kaggle API Key</label>
                <Input
                  type="password"
                  value={kaggleApiKey}
                  onChange={(e) => setKaggleApiKey(e.target.value)}
                  placeholder="Enter your Kaggle API key"
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
