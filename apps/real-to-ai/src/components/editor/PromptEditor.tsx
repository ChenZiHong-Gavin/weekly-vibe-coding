import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'

interface PromptEditorProps {
  prompt: string
  onPromptChange: (prompt: string) => void
  image: string | null
}

const EXAMPLE_PROMPTS = [
  'A serene mountain landscape at golden hour, 8k, photorealistic, cinematic lighting',
  'Street photography of a bustling city at night, neon lights reflecting on wet pavement, Sony A7III',
  'A fluffy orange cat lounging on a windowsill, warm afternoon light, detailed fur texture, bokeh background',
  'Minimalist interior design, Scandinavian style living room, natural light, architectural digest',
]

export function PromptEditor({ prompt, onPromptChange, image }: PromptEditorProps) {
  const [generating, setGenerating] = useState(false)

  const generatePrompt = async () => {
    if (!image) return
    setGenerating(true)
    // MVP: use a random example prompt. In production, call Claude Vision API.
    await new Promise(resolve => setTimeout(resolve, 800))
    const randomPrompt = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)]
    onPromptChange(randomPrompt)
    setGenerating(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-300">Prompt</label>
        <button
          onClick={generatePrompt}
          disabled={!image || generating}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-300 transition-colors"
        >
          {generating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          自动生成
        </button>
      </div>
      <textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder="输入或自动生成一段 AI 风格的 prompt..."
        className="w-full h-24 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500 resize-none"
      />
      <p className="text-xs text-neutral-500">
        这段文字会显示在模板的 prompt 输入框中
      </p>
    </div>
  )
}
