import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://data-generator.netlify.app'

export const metadata: Metadata = {
  title: {
    default: 'Data Generator — AI-Powered Spreadsheet & Dataset Builder',
    template: '%s | Data Generator',
  },
  description:
    'Generate realistic datasets instantly with AI. Use natural language prompts to create, edit, and export spreadsheet data powered by multiple LLM providers including OpenAI, Gemini, Groq, Cohere, and Anthropic.',
  keywords: [
    'data generator',
    'AI spreadsheet',
    'dataset builder',
    'synthetic data',
    'LLM data generation',
    'CSV generator',
    'Excel generator',
    'Kaggle datasets',
    'OpenAI',
    'Gemini',
    'Groq',
    'Cohere',
    'Anthropic',
  ],
  authors: [{ name: 'Kedhareswer' }],
  creator: 'Kedhareswer',
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Data Generator',
    title: 'Data Generator — AI-Powered Spreadsheet & Dataset Builder',
    description:
      'Generate realistic datasets instantly with AI. Natural language prompts, multiple LLM providers, CSV/Excel export, and Kaggle integration.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Data Generator — AI-Powered Spreadsheet & Dataset Builder',
    description:
      'Generate realistic datasets instantly with AI. Natural language prompts, multiple LLM providers, CSV/Excel export, and Kaggle integration.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
