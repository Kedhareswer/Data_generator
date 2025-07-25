import { z } from "zod"
import { GoogleGenerativeAI } from "@google/generative-ai" // Gemini support
import { CohereClient } from "cohere-ai"

// Example: import { openai } from "@ai-sdk/openai"
// Add imports for other SDKs/providers as needed

// --- Provider wrappers ---

async function tryOpenAI({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  // If userApiKey is provided, temporarily override process.env.OPENAI_API_KEY
  let restoreKey: string | undefined
  if (userApiKey) {
    restoreKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = userApiKey
  }
  try {
    if (!process.env.OPENAI_API_KEY) throw new Error("OpenAI API key missing")
    const { openai } = await import("@ai-sdk/openai")
    const { generateObject } = await import("ai")
    return (
      await generateObject({
        model: openai(userModel || "gpt-4o"),
        schema,
        prompt,
      })
    ).object
  } finally {
    if (userApiKey) process.env.OPENAI_API_KEY = restoreKey
  }
}

async function tryGroq({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("Groq API key missing")
  const model = userModel || "llama3-70b-8192"
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "You are a helpful assistant. Respond ONLY with valid JSON." },
        { role: "user", content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.7,
    }),
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`[Groq Error]: ${response.status} ${response.statusText} - ${errText}`)
  }
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("Groq: No content in response")
  try {
    const parsed = JSON.parse(stripCodeBlock(content))
    return schema.parse(parsed)
  } catch (err) {
    console.error("[Groq] Error parsing or validating response:", err)
    throw err
  }
}

async function tryCohere({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.COHERE_API_KEY
  if (!apiKey) throw new Error("Cohere API key missing")
  const cohere = new CohereClient({ token: apiKey })
  const model = userModel || "command-r-plus"
  const response = await cohere.chat({
    model,
    message: prompt,
    temperature: 0.7,
    maxTokens: 2048,
  })
  const content = response.text
  if (!content) throw new Error("Cohere: No content in response")
  try {
    const parsed = JSON.parse(stripCodeBlock(content))
    return schema.parse(parsed)
  } catch (err) {
    console.error("[Cohere] Error parsing or validating response:", err)
    throw err
  }
}

async function tryCerebus({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.CEREBUS_API_KEY
  if (!apiKey) throw new Error("Cerebus API key missing")
  // TODO: Add actual Cerebus SDK/model call here
  throw new Error("Cerebus provider not implemented yet")
}

async function tryGemini({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  console.log("[Gemini] Called with prompt:", prompt)
  const apiKey = userApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key missing")
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: userModel || "gemini-pro" })
  const result = await model.generateContent(prompt)
  const text = await result.response.text()
  console.log("[Gemini] Raw response:", text)
  try {
    const parsed = JSON.parse(text)
    const validated = schema.parse(parsed)
    return validated
  } catch (err) {
    console.error("[Gemini] Error parsing or validating response:", err)
    throw err
  }
}

function stripCodeBlock(text: string): string {
  return text.replace(/^```json[\s\r\n]*|```$/g, "").trim()
}

// --- Main auto-selection logic ---

type CallLLMOptions = {
  prompt: string
  schema: z.ZodTypeAny
  userProvider?: string
  userModel?: string
  userApiKey?: string
}

type ProviderMap = {
  [key: string]: ({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) => Promise<any>
}

export async function callLLM({ prompt, schema, userProvider, userModel, userApiKey }: CallLLMOptions) {
  const providerMap: ProviderMap = {
    openai: tryOpenAI,
    gemini: tryGemini,
    anthropic: tryCerebus,
    groq: tryGroq,
    cohere: tryCohere,
    cerebus: tryCerebus,
  }
  if (userProvider && Object.prototype.hasOwnProperty.call(providerMap, userProvider)) {
    return await providerMap[userProvider]({ prompt, schema, userModel, userApiKey })
  }
  // fallback: try all
  const providers = [tryGroq, tryCerebus, tryCohere, tryGemini, tryOpenAI]
  for (const provider of providers) {
    try {
      const result = await provider({ prompt, schema, userModel, userApiKey })
      if (result) return result
    } catch (e) {
      // Optionally log: console.warn(`Provider failed: ${e}`)
    }
  }
  throw new Error("No available LLM provider succeeded.")
} 