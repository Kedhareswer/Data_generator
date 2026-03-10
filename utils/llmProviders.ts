import { z } from "zod"
import { GoogleGenerativeAI } from "@google/generative-ai" // Gemini support
import { CohereClient } from "cohere-ai"

// --- Provider wrappers ---

async function tryOpenAI({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("OpenAI API key missing")
  const { createOpenAI } = await import("@ai-sdk/openai")
  const { generateObject } = await import("ai")
  const openai = createOpenAI({ apiKey })
  return (
    await generateObject({
      model: openai(userModel || "gpt-4.1"),
      schema,
      prompt,
    })
  ).object
}

async function tryGroq({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("Groq API key missing")
  const model = userModel || "llama-3.3-70b-versatile"
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
    console.error("[Groq] Error parsing response. Raw content:", content.substring(0, 500))
    throw new Error("Groq returned invalid JSON response")
  }
}

async function tryCohere({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.COHERE_API_KEY
  if (!apiKey) throw new Error("Cohere API key missing")
  const cohere = new CohereClient({ token: apiKey })
  const model = userModel || "command-a-03-2025"
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
    console.error("[Cohere] Error parsing response. Raw content:", content.substring(0, 500))
    throw new Error("Cohere returned invalid JSON response")
  }
}

async function tryAnthropic({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("Anthropic API key missing")
  const model = userModel || "claude-sonnet-4-6-20250610"
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      messages: [
        { role: "user", content: prompt },
      ],
    }),
  })
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`[Anthropic Error]: ${response.status} ${response.statusText} - ${errText}`)
  }
  const data = await response.json()
  const content = data.content?.[0]?.text
  if (!content) throw new Error("Anthropic: No content in response")
  try {
    const parsed = JSON.parse(stripCodeBlock(content))
    return schema.parse(parsed)
  } catch (err) {
    console.error("[Anthropic] Error parsing response. Raw content:", content.substring(0, 500))
    throw new Error("Anthropic returned invalid JSON response")
  }
}

async function tryGemini({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("Gemini API key missing")
  const genAI = new GoogleGenerativeAI(apiKey)
  const modelName = userModel || "gemini-2.0-flash"
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  })
  let result
  try {
    result = await model.generateContent(prompt)
  } catch (err: any) {
    const msg = err?.message || String(err)
    if (msg.includes("not found") || msg.includes("404")) {
      throw new Error(`Gemini model "${modelName}" not found. Try "gemini-2.0-flash" or "gemini-2.5-flash-preview-05-20" instead.`)
    }
    throw new Error(`[Gemini Error]: ${msg}`)
  }
  const text = result.response.text()
  if (!text) throw new Error("Gemini: Empty response")
  try {
    const parsed = JSON.parse(stripCodeBlock(text))
    return schema.parse(parsed)
  } catch (err) {
    console.error("[Gemini] Error parsing or validating response. Raw text:", text.substring(0, 500))
    throw new Error(`Gemini returned invalid JSON. Model: ${modelName}`)
  }
}

async function tryDeepSeek({ prompt, schema, userModel, userApiKey }: { prompt: string; schema: z.ZodTypeAny; userModel?: string; userApiKey?: string }) {
  const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error("DeepSeek API key missing")
  const model = userModel || "deepseek-chat"
  const response = await fetch("https://api.deepseek.com/chat/completions", {
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
    throw new Error(`[DeepSeek Error]: ${response.status} ${response.statusText} - ${errText}`)
  }
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error("DeepSeek: No content in response")
  try {
    const parsed = JSON.parse(stripCodeBlock(content))
    return schema.parse(parsed)
  } catch (err) {
    console.error("[DeepSeek] Error parsing response. Raw content:", content.substring(0, 500))
    throw new Error("DeepSeek returned invalid JSON response")
  }
}

function stripCodeBlock(text: string): string {
  let cleaned = text.trim()
  // Remove opening code fence: ```json, ```JSON, ``` (with or without language tag)
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, "")
  // Remove closing code fence
  cleaned = cleaned.replace(/\n?```\s*$/, "")
  return cleaned.trim()
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
    anthropic: tryAnthropic,
    groq: tryGroq,
    cohere: tryCohere,
    deepseek: tryDeepSeek,
  }
  if (userProvider) {
    if (!Object.prototype.hasOwnProperty.call(providerMap, userProvider)) {
      throw new Error(`Unsupported provider "${userProvider}". Supported: ${Object.keys(providerMap).join(", ")}`)
    }
    return await providerMap[userProvider]({ prompt, schema, userModel, userApiKey })
  }
  // No provider specified — fallback: try all
  const providers = [tryGroq, tryAnthropic, tryDeepSeek, tryCohere, tryGemini, tryOpenAI]
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
