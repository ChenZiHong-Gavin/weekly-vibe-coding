import { useState } from 'react'
import { Download, Share2, Copy, Check } from 'lucide-react'
import type { AppState } from '../../App'
import { EXPORT_SIZES } from '../../App'

interface ExportPanelProps {
  state: AppState
  selectedSize: number
  onSizeChange: (idx: number) => void
}

async function captureToCanvas(el: HTMLElement, targetWidth: number, targetHeight: number, watermark: boolean): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas')
  const raw = await html2canvas(el, {
    backgroundColor: '#000',
    scale: 2,
    useCORS: true,
  })

  const final = document.createElement('canvas')
  final.width = targetWidth
  final.height = targetHeight
  const ctx = final.getContext('2d')!

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, targetWidth, targetHeight)

  const scale = Math.min(targetWidth / raw.width, targetHeight / raw.height)
  const drawW = raw.width * scale
  const drawH = raw.height * scale
  const offsetX = (targetWidth - drawW) / 2
  const offsetY = (targetHeight - drawH) / 2
  ctx.drawImage(raw, offsetX, offsetY, drawW, drawH)

  if (watermark) {
    const fontSize = Math.max(12, Math.round(targetWidth * 0.012))
    ctx.font = `${fontSize}px sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.textAlign = 'right'
    ctx.fillText('Made with Real-to-AI', targetWidth - fontSize, targetHeight - fontSize * 0.8)
  }

  return final
}

export function ExportPanel({ state, selectedSize, onSizeChange }: ExportPanelProps) {
  const [exporting, setExporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [watermark, setWatermark] = useState(true)

  const getCanvas = async () => {
    const el = document.getElementById('preview-output')
    if (!el) return null
    const size = EXPORT_SIZES[selectedSize]
    return captureToCanvas(el, size.width, size.height, watermark)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const canvas = await getCanvas()
      if (!canvas) return
      const link = document.createElement('a')
      link.download = `real-to-ai-${state.template}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleCopy = async () => {
    try {
      const canvas = await getCanvas()
      if (!canvas) return
      canvas.toBlob(async (blob) => {
        if (!blob) return
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }, 'image/png')
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleShare = async () => {
    try {
      const canvas = await getCanvas()
      if (!canvas) return
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
      if (!blob) return
      const file = new File([blob], `real-to-ai-${state.template}.png`, { type: 'image/png' })
      await navigator.share({ files: [file], title: 'Real-to-AI', text: '这张照片是真实拍摄的，还是 AI 生成的？' })
    } catch (err) {
      if ((err as Error).name !== 'AbortError') console.error('Share failed:', err)
    }
  }

  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-neutral-900 rounded-lg border border-neutral-800">
      <div className="flex gap-2">
        {EXPORT_SIZES.map((size, i) => (
          <button
            key={size.label}
            onClick={() => onSizeChange(i)}
            className={`px-3 py-1.5 rounded text-xs transition-colors ${
              selectedSize === i
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {size.label}
          </button>
        ))}
      </div>

      <span className="text-xs text-neutral-500">
        {EXPORT_SIZES[selectedSize].width} × {EXPORT_SIZES[selectedSize].height}
      </span>

      <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={watermark}
          onChange={(e) => setWatermark(e.target.checked)}
          className="accent-blue-600 w-3.5 h-3.5"
        />
        水印
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={handleCopy}
          disabled={!state.image}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-neutral-300 transition-colors"
          title="复制到剪贴板"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? '已复制' : '复制'}
        </button>

        {canShare && (
          <button
            onClick={handleShare}
            disabled={!state.image}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs text-neutral-300 transition-colors"
            title="分享"
          >
            <Share2 className="w-3.5 h-3.5" />
            分享
          </button>
        )}

        <button
          onClick={handleExport}
          disabled={!state.image || exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          {exporting ? '导出中...' : '导出 PNG'}
        </button>
      </div>
    </div>
  )
}
