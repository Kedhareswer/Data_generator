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

  constructor() {
    this.apiKey = process.env.KAGGLE_API_KEY || ""
    this.username = process.env.KAGGLE_USERNAME || ""
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.apiKey}`).toString("base64")
    return `Basic ${credentials}`
  }

  async searchDatasets(query: string, category?: string): Promise<KaggleSearchResult> {
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
    try {
      const response = await fetch(`https://www.kaggle.com/api/v1/datasets/metadata/${datasetRef}`, {
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Kaggle API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error("Kaggle metadata error:", error)
      return null
    }
  }

  async downloadDataset(datasetRef: string): Promise<Buffer | null> {
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

export const kaggleClient = new KaggleIntegration()
