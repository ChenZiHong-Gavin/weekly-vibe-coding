import { useEffect, useMemo, useRef } from 'react'
import type { AppState } from '../../App'

interface Props {
  state: AppState
}

export function SDWebUITemplate({ state }: Props) {
  return state.sdMode === 'comparison'
    ? <ComparisonView state={state} />
    : <InterfaceView state={state} />
}

/* ===================== INTERFACE VIEW (WebUI screenshot) ===================== */
function InterfaceView({ state }: { state: AppState }) {
  const prompt = state.prompt || 'a beautiful scene, photorealistic, 8k, detailed, masterpiece, best quality'
  const seed = useMemo(() => Math.floor(Math.random() * 4294967295), [])

  return (
    <div id="preview-output" className="w-full max-w-3xl mx-auto bg-[#0b0f19] rounded-xl overflow-hidden text-[13px]" style={{ fontFamily: '"Source Sans Pro", ui-sans-serif, system-ui, sans-serif' }}>
      <div className="flex overflow-x-auto bg-[#0b0f19] border-b border-[#374151]">
        <Tab label="txt2img" active={true} />
        <Tab label="img2img" active={false} />
        <Tab label="Extras" active={false} />
        <Tab label="PNG Info" active={false} />
        <Tab label="Checkpoint Merger" active={false} />
        <Tab label="Train" active={false} />
      </div>

      <div className="flex flex-col sm:flex-row">
        <div className="w-full sm:w-[260px] p-3 space-y-2.5 border-b sm:border-b-0 sm:border-r border-[#374151] shrink-0 bg-[#0b0f19]">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[#9ca3af] text-[11px] font-medium">Prompt</label>
              <div className="flex items-center gap-1">
                <GradioSmallBtn icon="🎴" />
                <GradioSmallBtn icon="📋" />
              </div>
            </div>
            <div className="bg-[#374151] border border-[#4b5563] rounded-lg p-2 min-h-[56px] focus-within:border-[#f97316]">
              <p className="text-[12px] text-[#e5e7eb] leading-relaxed break-all">{prompt}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[#9ca3af] text-[11px] font-medium">Negative prompt</label>
            <div className="bg-[#374151] border border-[#4b5563] rounded-lg p-2 min-h-[32px]">
              <p className="text-[12px] text-[#6b7280]">low quality, blurry, deformed, ugly, bad anatomy</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-[#9ca3af] text-[11px] font-medium">Sampling method</label>
              <div className="bg-[#374151] border border-[#4b5563] rounded-lg px-3 py-1.5 text-[12px] text-[#e5e7eb] flex items-center justify-between cursor-default">
                <span>DPM++ 2M Karras</span>
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-[#9ca3af]">
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            </div>

            <GradioSlider label="Sampling steps" value={28} max={50} />
            <GradioSlider label="CFG Scale" value={7} max={30} />
            <GradioSlider label="Denoising strength" value={0.45} max={1} decimal />

            <div className="flex gap-2">
              <GradioNumberField label="Width" value={512} />
              <GradioNumberField label="Height" value={768} />
            </div>

            <div className="space-y-1">
              <label className="text-[#9ca3af] text-[11px] font-medium">Seed</label>
              <div className="flex gap-1">
                <div className="flex-1 bg-[#374151] border border-[#4b5563] rounded-lg px-3 py-1.5 text-[12px] text-[#e5e7eb]">
                  {seed}
                </div>
                <GradioSmallBtn icon="🎲" />
                <GradioSmallBtn icon="♻️" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[#9ca3af] text-[11px] font-medium">Stable Diffusion checkpoint</label>
              <div className="bg-[#374151] border border-[#4b5563] rounded-lg px-3 py-1.5 text-[12px] text-[#e5e7eb] flex items-center justify-between cursor-default">
                <span className="truncate">realisticVisionV51_v51VAE</span>
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-[#9ca3af] shrink-0 ml-2">
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
              </div>
            </div>
          </div>

          <div className="w-full py-2.5 rounded-lg bg-[#f97316] text-white text-[13px] font-semibold text-center cursor-default shadow-sm">
            Generate
          </div>
        </div>

        <div className="flex-1 p-3 space-y-2 bg-[#0b0f19] min-w-0">
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#9ca3af] font-medium">Output</span>
            <div className="flex-1 h-1 bg-[#374151] rounded-full overflow-hidden">
              <div className="h-full bg-[#f97316] rounded-full" style={{ width: '100%' }} />
            </div>
            <span className="text-[11px] text-[#10b981] font-medium">✓ Done</span>
            <span className="text-[11px] text-[#6b7280]">12.4s</span>
          </div>

          <div className="flex items-center gap-1 pb-1">
            {['📂', '💾', '🗑️', '📤'].map((icon, i) => (
              <span key={i} className="w-7 h-7 flex items-center justify-center text-[12px] rounded bg-[#1f2937] border border-[#374151] cursor-default">{icon}</span>
            ))}
          </div>

          <div className="bg-[#1f2937] border border-[#374151] rounded-lg overflow-hidden">
            <img
              src={state.image!}
              alt="Generated"
              className="w-full max-h-[400px] object-contain"
            />
          </div>

          <div className="bg-[#1f2937] border border-[#374151] rounded-lg p-2">
            <p className="text-[10px] text-[#6b7280] break-all leading-relaxed font-mono">
              {prompt}
              {'\n'}Steps: 28, Sampler: DPM++ 2M Karras, CFG scale: 7, Seed: {seed}, Size: 512x768, Model: realisticVisionV51_v51VAE, Denoising strength: 0.45
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===================== COMPARISON VIEW (img2img sketch vs output) ===================== */
function ComparisonView({ state }: { state: AppState }) {
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
      <div className="px-4 py-3 border-b border-[#374151] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-[#e5e7eb]">img2img Comparison</span>
          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#065f46]/60 text-[#34d399] border border-[#065f46]">Denoising: 0.65</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6b7280] font-mono">Seed: {seed}</span>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-[#374151] bg-[#111827]">
        <p className="text-[12px] text-[#9ca3af]">
          <span className="text-[#6b7280] font-medium">Prompt:</span> {prompt}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row">
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

        <div className="hidden sm:flex items-center -mx-3 z-10">
          <div className="w-6 h-6 rounded-full bg-[#f97316] flex items-center justify-center shadow-lg">
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-white">
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

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

/* ===================== SHARED UI COMPONENTS ===================== */
function Tab({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap cursor-default transition-colors ${
      active
        ? 'text-white border-b-2 border-[#f97316] bg-[#1f2937]/50'
        : 'text-[#6b7280] border-b-2 border-transparent'
    }`}>
      {label}
    </div>
  )
}

function GradioSlider({ label, value, max, decimal }: { label: string; value: number; max: number; decimal?: boolean }) {
  const percent = (value / max) * 100
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[#9ca3af] text-[11px] font-medium">{label}</label>
        <span className="text-[11px] text-[#e5e7eb] bg-[#374151] border border-[#4b5563] rounded px-1.5 py-0.5 min-w-[36px] text-center">
          {decimal ? value.toFixed(2) : value}
        </span>
      </div>
      <div className="relative h-2 bg-[#374151] rounded-full cursor-default">
        <div className="h-full bg-[#f97316] rounded-full" style={{ width: `${percent}%` }} />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#f97316] shadow-sm"
          style={{ left: `calc(${percent}% - 7px)` }}
        />
      </div>
    </div>
  )
}

function GradioNumberField({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1 flex-1">
      <label className="text-[#9ca3af] text-[11px] font-medium">{label}</label>
      <div className="bg-[#374151] border border-[#4b5563] rounded-lg px-3 py-1.5 text-[12px] text-[#e5e7eb]">
        {value}
      </div>
    </div>
  )
}

function GradioSmallBtn({ icon }: { icon: string }) {
  return (
    <span className="w-7 h-7 flex items-center justify-center text-[12px] rounded-md bg-[#374151] border border-[#4b5563] cursor-default">
      {icon}
    </span>
  )
}
