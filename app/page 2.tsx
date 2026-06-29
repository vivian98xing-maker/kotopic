'use client'

import { useState } from 'react'
import OpenAI from 'openai'

export default function Home() {
  const [image, setImage] = useState<File | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [results, setResults] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }

  const handleSubmit = async () => {
    if (!image || !apiKey) return

    setLoading(true)
    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://dashscope.aliyuncs.com/api/v1',
      dangerouslyAllowBrowser: true,
    })

    try {
      const base64 = await fileToBase64(image)
      const response = await openai.chat.completions.create({
        model: 'qwen-vl-max',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Identify the main items in this image. For each item, provide the English name, the Japanese word (romaji and hiragana/kanji), and a simple conversational sentence in Japanese using that word. Format as a list.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${image.type};base64,${base64}`,
                },
              },
            ],
          },
        ],
      })
      setResults(response.choices?.[0]?.message?.content || 'No response')
    } catch (error) {
      setResults('Error: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '520px', background: '#ffffff', borderRadius: '20px', boxShadow: '0 25px 50px rgba(15, 23, 42, 0.1)', padding: '32px', boxSizing: 'border-box' }}>
        <h1 style={{ margin: 0, marginBottom: '24px', fontSize: '28px', fontWeight: 700, textAlign: 'center' }}>Japanese Study Guide</h1>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>QWen API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Enter your QWen API key"
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: '12px', fontSize: '14px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Upload Image</label>
          <input type="file" accept="image/*" onChange={handleImageChange} style={{ width: '100%' }} />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!image || !apiKey || loading}
          style={{ width: '100%', background: '#2563eb', color: '#ffffff', padding: '14px', borderRadius: '12px', border: 'none', cursor: loading || !image || !apiKey ? 'not-allowed' : 'pointer', opacity: loading || !image || !apiKey ? 0.6 : 1, fontWeight: 700 }}
        >
          {loading ? 'Processing...' : 'Analyze Image'}
        </button>

        {results && (
          <div style={{ marginTop: '24px' }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 700 }}>Results:</h2>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', background: '#f8fafc', padding: '18px', borderRadius: '14px', overflowX: 'auto' }}>{results}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
