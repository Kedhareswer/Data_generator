interface KaggleDataset {
  ref: string
  title: string
  size: number
  lastUpdated: string
  downloadCount: number
  isPrivate: boolean
  description: string
}

interface KaggleSearchResult {
  datasets: KaggleDataset[]
  totalCount: number
}

export class KaggleIntegration {
  private apiKey: string
  private username: string

  constructor(username?: string, apiKey?: string) {
    this.username = username || process.env.KAGGLE_USERNAME || ""
    this.apiKey = apiKey || process.env.KAGGLE_API_KEY || ""
  }

  hasCredentials(): boolean {
    return Boolean(this.username && this.apiKey)
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.apiKey}`).toString("base64")
    return `Basic ${credentials}`
  }

  async searchDatasets(query: string, category?: string): Promise<KaggleSearchResult> {
    if (!this.hasCredentials()) {
      return { datasets: [], totalCount: 0 }
    }

    try {
      const searchParams = new URLSearchParams({
        search: query,
        sortBy: "relevance",
        size: "20",
      })

      if (category) {
        searchParams.append("category", category)
      }

      const response = await fetch(`https://www.kaggle.com/api/v1/datasets/list?${searchParams}`, {
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Kaggle API error: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        datasets: data.datasets || [],
        totalCount: data.totalCount || 0,
      }
    } catch (error) {
      console.error("Kaggle search error:", error)
      return { datasets: [], totalCount: 0 }
    }
  }

  async getDatasetMetadata(datasetRef: string) {
    if (!this.hasCredentials()) return null

    const response = await fetch(`https://www.kaggle.com/api/v1/datasets/metadata/${datasetRef}`, {
      headers: {
        Authorization: this.getAuthHeader(),
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => response.statusText)
      throw new Error(`Kaggle metadata API error (${response.status}): ${detail}`)
    }

    return await response.json()
  }

  async downloadDataset(datasetRef: string): Promise<Buffer | null> {
    if (!this.hasCredentials()) return null

    try {
      const response = await fetch(`https://www.kaggle.com/api/v1/datasets/download/${datasetRef}`, {
        headers: {
          Authorization: this.getAuthHeader(),
        },
      })

      if (!response.ok) {
        throw new Error(`Kaggle download error: ${response.statusText}`)
      }

      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      console.error("Kaggle download error:", error)
      return null
    }
  }
}

export function createKaggleClient(username?: string, apiKey?: string): KaggleIntegration {
  return new KaggleIntegration(username, apiKey)
}
