import { useMemo } from 'react'
import type { AppState } from '../../App'
import { useFilteredImages } from '../../lib/useFilteredImages'

interface Props {
  state: AppState
}

const MODELS = [
  { name: 'DALL·E 3', badge: 'OpenAI', badgeBg: 'bg-[#10a37f]/15', badgeText: 'text-[#10a37f]', badgeBorder: 'border-[#10a37f]/30' },
  { name: 'Stable Diffusion XL', badge: 'Stability AI', badgeBg: 'bg-[#a855f7]/15', badgeText: 'text-[#a855f7]', badgeBorder: 'border-[#a855f7]/30' },
  { name: 'Flux.1 Pro', badge: 'Black Forest Labs', badgeBg: 'bg-[#3b82f6]/15', badgeText: 'text-[#3b82f6]', badgeBorder: 'border-[#3b82f6]/30' },
  { name: 'Midjourney v6', badge: 'Midjourney', badgeBg: 'bg-[#f97316]/15', badgeText: 'text-[#f97316]', badgeBorder: 'border-[#f97316]/30' },
]

const MODEL_FILTERS = [
  { filter: 'saturate(1.15) contrast(1.05)' },
  { filter: 'saturate(0.85) brightness(1.05) hue-rotate(-5deg)' },
  { filter: 'none' },
  { filter: 'contrast(1.1) saturate(1.1) brightness(0.95)' },
]

export function ModelCompareTemplate({ state }: Props) {
  const prompt = state.prompt || 'a stunning photorealistic scene, highly detailed, 8k resolution'
  const genTimes = useMemo(() => MODELS.map(() => (8 + Math.random() * 20).toFixed(1)), [])
  const genTimestamp = useMemo(() => new Date().toISOString().slice(0, 19).replace('T', ' '), [])
  const filtered = useFilteredImages(state.image, MODEL_FILTERS)

  return (
    <div id="preview-output" className="w-full max-w-3xl mx-auto bg-[#0c0d14] rounded-xl overflow-hidden" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1e2130]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[14px] font-semibold text-[#e5e7eb] flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" className="text-[#818cf8]">
              <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
              <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            </svg>
            Model Comparison
          </h2>
          <span className="text-[11px] text-[#4b5563] font-mono">{genTimestamp}</span>
        </div>
        <div className="bg-[#111827] rounded-lg px-3 py-2 border border-[#1e2130]">
          <p className="text-[12px] text-[#9ca3af]">
            <span className="text-[#6b7280] font-medium">Prompt:</span> {prompt}
          </p>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-[1px] bg-[#1e2130]">
        {MODELS.map((model, i) => (
          <div key={model.name} className="bg-[#0c0d14] p-3 space-y-2">
            {/* Model label */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-[#e5e7eb] truncate">{model.name}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium shrink-0 ${model.badgeBg} ${model.badgeText} ${model.badgeBorder}`}>
                {model.badge}
              </span>
            </div>

            {/* Image */}
            <div className="bg-[#111827] rounded-lg overflow-hidden aspect-square border border-[#1e2130]">
              <img
                src={filtered[i] || state.image!}
                alt={model.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between text-[10px] text-[#4b5563]">
              <span className="font-mono">{genTimes[i]}s</span>
              <span className="font-mono">1024 × 1024</span>
              {i === 2 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#818cf8]/15 text-[#818cf8] border border-[#818cf8]/30 font-medium">Best</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1e2130] flex items-center justify-between">
        <span className="text-[11px] text-[#4b5563]">Same prompt · Same seed · 4 models</span>
        <span className="text-[11px] text-[#34d399] font-medium">4/4 complete</span>
      </div>
    </div>
  )
}
