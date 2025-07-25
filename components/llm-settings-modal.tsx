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

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "groq", label: "Groq" },
  { value: "cohere", label: "Cohere" },
  { value: "mistral", label: "Mistral AI" },
  { value: "perplexity", label: "Perplexity" },
  { value: "together", label: "Together AI" },
  { value: "replicate", label: "Replicate" },
  { value: "huggingface", label: "Hugging Face" },
]

const MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o (Latest)" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "o1-preview", label: "O1 Preview (Reasoning)" },
    { value: "o1-mini", label: "O1 Mini (Reasoning)" },
    { value: "custom", label: "Custom..." },
  ],
  anthropic: [
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Latest)" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
    { value: "custom", label: "Custom..." },
  ],
  gemini: [
    { value: "gemini-2.0-flash-exp", label: "Gemini 2.0 Flash (Experimental)" },
    { value: "gemini-1.5-pro-latest", label: "Gemini 1.5 Pro (Latest)" },
    { value: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash (Latest)" },
    { value: "gemini-1.5-flash-8b-latest", label: "Gemini 1.5 Flash 8B" },
    { value: "gemini-1.0-pro", label: "Gemini 1.0 Pro" },
    { value: "custom", label: "Custom..." },
  ],
  groq: [
    { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
    { value: "llama-3.1-70b-versatile", label: "Llama 3.1 70B Versatile" },
    { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
    { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B 32K" },
    { value: "gemma2-9b-it", label: "Gemma 2 9B IT" },
    { value: "custom", label: "Custom..." },
  ],
  cohere: [
    { value: "command-r-plus-08-2024", label: "Command R+ (Aug 2024)" },
    { value: "command-r-08-2024", label: "Command R (Aug 2024)" },
    { value: "command-r-plus", label: "Command R+" },
    { value: "command-r", label: "Command R" },
    { value: "command", label: "Command" },
    { value: "command-light", label: "Command Light" },
    { value: "custom", label: "Custom..." },
  ],
  mistral: [
    { value: "mistral-large-latest", label: "Mistral Large (Latest)" },
    { value: "mistral-medium-latest", label: "Mistral Medium (Latest)" },
    { value: "mistral-small-latest", label: "Mistral Small (Latest)" },
    { value: "codestral-latest", label: "Codestral (Latest)" },
    { value: "mixtral-8x7b-instruct", label: "Mixtral 8x7B Instruct" },
    { value: "custom", label: "Custom..." },
  ],
  perplexity: [
    { value: "llama-3.1-sonar-large-128k-online", label: "Llama 3.1 Sonar Large 128K Online" },
    { value: "llama-3.1-sonar-small-128k-online", label: "Llama 3.1 Sonar Small 128K Online" },
    { value: "llama-3.1-sonar-large-128k-chat", label: "Llama 3.1 Sonar Large 128K Chat" },
    { value: "llama-3.1-sonar-small-128k-chat", label: "Llama 3.1 Sonar Small 128K Chat" },
    { value: "custom", label: "Custom..." },
  ],
  together: [
    { value: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", label: "Llama 3.1 70B Instruct Turbo" },
    { value: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", label: "Llama 3.1 8B Instruct Turbo" },
    { value: "mistralai/Mixtral-8x7B-Instruct-v0.1", label: "Mixtral 8x7B Instruct" },
    { value: "Qwen/Qwen2.5-72B-Instruct-Turbo", label: "Qwen 2.5 72B Instruct Turbo" },
    { value: "custom", label: "Custom..." },
  ],
  replicate: [
    { value: "meta/meta-llama-3.1-405b-instruct", label: "Llama 3.1 405B Instruct" },
    { value: "meta/meta-llama-3.1-70b-instruct", label: "Llama 3.1 70B Instruct" },
    { value: "meta/meta-llama-3.1-8b-instruct", label: "Llama 3.1 8B Instruct" },
    { value: "mistralai/mixtral-8x7b-instruct-v0.1", label: "Mixtral 8x7B Instruct" },
    { value: "custom", label: "Custom..." },
  ],
  huggingface: [
    { value: "meta-llama/Meta-Llama-3.1-70B-Instruct", label: "Llama 3.1 70B Instruct" },
    { value: "meta-llama/Meta-Llama-3.1-8B-Instruct", label: "Llama 3.1 8B Instruct" },
    { value: "mistralai/Mixtral-8x7B-Instruct-v0.1", label: "Mixtral 8x7B Instruct" },
    { value: "microsoft/DialoGPT-large", label: "DialoGPT Large" },
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
      <DialogContent className="max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <DialogHeader>
            <DialogTitle>AI Provider Settings</DialogTitle>
            <DialogDescription>
              Choose your preferred AI provider, model, and enter your API key. Your settings are stored locally and
              never sent to our servers.
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
                  {MODELS[provider].map((m) => (
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
