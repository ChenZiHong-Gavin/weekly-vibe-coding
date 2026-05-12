import { useEffect, useMemo, useRef } from 'react'
import type { AppState } from '../../App'

interface Props {
  state: AppState
}

export function Img2ImgTemplate({ state }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prompt = state.prompt || 'photorealistic scene, highly detailed'
  const seed = useMemo(() => Math.floor(Math.random() * 9999999), [])

  useEffect(() => {
    if (!state.image || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height

      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      const grayscale = new Uint8ClampedArray(canvas.width * canvas.height)
      for (let i = 0; i < data.length; i += 4) {
        grayscale[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      }

      for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
          const idx = y * canvas.width + x
          const gx = -grayscale[idx - canvas.width - 1] + grayscale[idx - canvas.width + 1]
            - 2 * grayscale[idx - 1] + 2 * grayscale[idx + 1]
            - grayscale[idx + canvas.width - 1] + grayscale[idx + canvas.width + 1]
          const gy = -grayscale[idx - canvas.width - 1] - 2 * grayscale[idx - canvas.width] - grayscale[idx - canvas.width + 1]
            + grayscale[idx + canvas.width - 1] + 2 * grayscale[idx + canvas.width] + grayscale[idx + canvas.width + 1]

          const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy))
          const pixelIdx = (y * canvas.width + x) * 4
          const val = 255 - magnitude * 1.5
          data[pixelIdx] = val
          data[pixelIdx + 1] = val
          data[pixelIdx + 2] = val
          data[pixelIdx + 3] = 255
        }
      }

      ctx.putImageData(imageData, 0, 0)
    }
    img.src = state.image
  }, [state.image])

  return (
    <div id="preview-output" className="w-full max-w-3xl mx-auto bg-[#0b0f19] rounded-xl overflow-hidden" style={{ fontFamily: '"Source Sans Pro", ui-sans-serif, system-ui, sans-serif' }}>
      {/* Header — consistent with SD WebUI style */}
      <div className="px-4 py-3 border-b border-[#374151] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-[#e5e7eb]">img2img Comparison</span>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#065f46]/60 text-[#34d399] border border-[#065f46]">Denoising: 0.65</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6b7280] font-mono">Seed: {seed}</span>
        </div>
      </div>

      {/* Prompt bar */}
      <div className="px-4 py-2 border-b border-[#374151] bg-[#111827]">
        <p className="text-[12px] text-[#9ca3af]">
          <span className="text-[#6b7280] font-medium">Prompt:</span> {prompt}
        </p>
      </div>

      {/* Side-by-side comparison */}
      <div className="flex flex-col sm:flex-row">
        {/* Input side */}
        <div className="flex-1 p-3 border-b sm:border-b-0 sm:border-r border-[#374151]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px flex-1 bg-[#374151]" />
            <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">Input (Sketch)</span>
            <div className="h-px flex-1 bg-[#374151]" />
          </div>
          <div className="bg-white rounded-lg overflow-hidden border border-[#374151]">
            <canvas
              ref={canvasRef}
              className="w-full h-auto max-h-[350px] object-contain"
            />
          </div>
        </div>

        {/* Arrow indicator between panels */}
        <div className="hidden sm:flex items-center -mx-3 z-10">
          <div className="w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center shadow-lg">
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-white">
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Output side */}
        <div className="flex-1 p-3">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px flex-1 bg-[#374151]" />
            <span className="text-[10px] text-[#6b7280] uppercase tracking-widest font-semibold">Output (Generated)</span>
            <div className="h-px flex-1 bg-[#374151]" />
          </div>
          <div className="bg-[#1f2937] rounded-lg overflow-hidden border border-[#374151]">
            <img
              src={state.image!}
              alt="Output"
              className="w-full max-h-[350px] object-contain"
            />
          </div>
        </div>
      </div>

      {/* Footer — generation info */}
      <div className="px-4 py-2.5 border-t border-[#374151] flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6b7280] font-mono bg-[#111827]">
        <span>Model: realisticVision_v5</span>
        <span>Steps: 30</span>
        <span>CFG: 7.5</span>
        <span>Sampler: Euler a</span>
        <span className="sm:ml-auto text-[#34d399] font-sans font-medium">✓ Complete (8.2s)</span>
      </div>
    </div>
  )
}
