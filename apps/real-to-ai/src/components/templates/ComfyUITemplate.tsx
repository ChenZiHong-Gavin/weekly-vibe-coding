import { useMemo } from 'react'
import type { AppState } from '../../App'

interface Props {
  state: AppState
}

const FONT = '"Segoe UI", "Noto Sans", Arial, sans-serif'

const WIRE_COLORS = {
  MODEL: '#a855f7',
  CLIP: '#eab308',
  CONDITIONING: '#f97316',
  LATENT: '#ec4899',
  IMAGE: '#06b6d4',
  VAE: '#ef4444',
}

const NODE_TITLE_COLORS = {
  checkpoint: '#26233a',
  clipEncode: '#233a23',
  ksampler: '#1b2838',
  vaeDecode: '#3a1d1d',
  preview: '#1d3a3a',
  latent: '#23333a',
}

interface Connection {
  x1: number; y1: number
  x2: number; y2: number
  color: string
}

const CONNECTIONS: Connection[] = [
  { x1: 182, y1: 48, x2: 250, y2: 48, color: WIRE_COLORS.MODEL },
  { x1: 182, y1: 64, x2: 12, y2: 148, color: WIRE_COLORS.CLIP },
  { x1: 182, y1: 64, x2: 12, y2: 262, color: WIRE_COLORS.CLIP },
  { x1: 182, y1: 80, x2: 468, y2: 66, color: WIRE_COLORS.VAE },
  { x1: 202, y1: 178, x2: 250, y2: 68, color: WIRE_COLORS.CONDITIONING },
  { x1: 202, y1: 286, x2: 250, y2: 88, color: WIRE_COLORS.CONDITIONING },
  { x1: 182, y1: 356, x2: 250, y2: 108, color: WIRE_COLORS.LATENT },
  { x1: 430, y1: 348, x2: 468, y2: 46, color: WIRE_COLORS.LATENT },
  { x1: 608, y1: 46, x2: 468, y2: 132, color: WIRE_COLORS.IMAGE },
]

function bezierPath(c: Connection) {
  const dx = Math.abs(c.x2 - c.x1)
  const offset = Math.max(40, dx * 0.5)
  return `M${c.x1},${c.y1} C${c.x1 + offset},${c.y1} ${c.x2 - offset},${c.y2} ${c.x2},${c.y2}`
}

export function ComfyUITemplate({ state }: Props) {
  const prompt = state.prompt || 'a beautiful scene, photorealistic, 8k, highly detailed'
  const seed = useMemo(() => Math.floor(Math.random() * 4294967295), [])

  return (
    <div
      id="preview-output"
      className="w-full max-w-4xl mx-auto rounded-xl overflow-hidden"
      style={{ fontFamily: FONT, background: '#202020' }}
    >
      {/* Top menu bar */}
      <div className="flex items-center gap-2 px-3 h-9 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <span className="text-[11px] text-[#999] cursor-default">Queue size: 0</span>
        <button className="px-3 py-1 rounded text-[11px] font-semibold bg-[#336633] text-[#cfc] cursor-default">
          Queue Prompt
        </button>
        <span className="text-[11px] text-[#666] cursor-default">Extra options</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[11px] text-[#666]">ComfyUI</span>
        </div>
      </div>

      {/* Canvas area with dot grid */}
      <div
        className="relative"
        style={{
          height: 400,
          backgroundImage: 'radial-gradient(circle, #2a2a2a 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {/* SVG connection wires */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
          {CONNECTIONS.map((c, i) => (
            <path key={i} d={bezierPath(c)} stroke={c.color} strokeWidth="2" fill="none" opacity="0.85" />
          ))}
          {/* Connection dots at endpoints */}
          {CONNECTIONS.map((c, i) => (
            <g key={`dots-${i}`}>
              <circle cx={c.x1} cy={c.y1} r="4" fill={c.color} />
              <circle cx={c.x2} cy={c.y2} r="4" fill={c.color} />
            </g>
          ))}
        </svg>

        {/* ===== NODES ===== */}

        {/* Load Checkpoint */}
        <ComfyNode title="Load Checkpoint" titleColor={NODE_TITLE_COLORS.checkpoint} x={12} y={12} w={170}>
          <div className="space-y-1">
            <NodeLabel text="ckpt_name" />
            <NodeDropdown value="realisticV51_v51VAE" />
            <div className="flex justify-end gap-1 mt-1">
              <NodeOutputLabel text="MODEL" color={WIRE_COLORS.MODEL} />
            </div>
            <div className="flex justify-end">
              <NodeOutputLabel text="CLIP" color={WIRE_COLORS.CLIP} />
            </div>
            <div className="flex justify-end">
              <NodeOutputLabel text="VAE" color={WIRE_COLORS.VAE} />
            </div>
          </div>
        </ComfyNode>

        {/* CLIP Text Encode (positive) */}
        <ComfyNode title="CLIP Text Encode" titleColor={NODE_TITLE_COLORS.clipEncode} x={12} y={118} w={190}>
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-1">
              <NodeInputLabel text="clip" color={WIRE_COLORS.CLIP} />
              <NodeOutputLabel text="CONDITIONING" color={WIRE_COLORS.CONDITIONING} />
            </div>
            <div className="bg-[#2a2a2a] rounded p-1.5 min-h-[36px] border border-[#444]">
              <p className="text-[9px] text-[#ccc] leading-tight break-all line-clamp-3">{prompt}</p>
            </div>
          </div>
        </ComfyNode>

        {/* CLIP Text Encode (negative) */}
        <ComfyNode title="CLIP Text Encode" titleColor={NODE_TITLE_COLORS.clipEncode} x={12} y={240} w={190}>
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-1">
              <NodeInputLabel text="clip" color={WIRE_COLORS.CLIP} />
              <NodeOutputLabel text="CONDITIONING" color={WIRE_COLORS.CONDITIONING} />
            </div>
            <div className="bg-[#2a2a2a] rounded p-1.5 border border-[#444]">
              <p className="text-[9px] text-[#888] leading-tight">low quality, blurry, bad</p>
            </div>
          </div>
        </ComfyNode>

        {/* Empty Latent Image */}
        <ComfyNode title="Empty Latent Image" titleColor={NODE_TITLE_COLORS.latent} x={12} y={332} w={170}>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 text-[9px] text-[#aaa]">
              <span>512×768</span>
              <span>batch:1</span>
            </div>
            <NodeOutputLabel text="LATENT" color={WIRE_COLORS.LATENT} />
          </div>
        </ComfyNode>

        {/* KSampler */}
        <ComfyNode title="KSampler" titleColor={NODE_TITLE_COLORS.ksampler} x={250} y={12} w={180}>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <NodeInputLabel text="model" color={WIRE_COLORS.MODEL} />
            </div>
            <div className="flex justify-between">
              <NodeInputLabel text="positive" color={WIRE_COLORS.CONDITIONING} />
            </div>
            <div className="flex justify-between">
              <NodeInputLabel text="negative" color={WIRE_COLORS.CONDITIONING} />
            </div>
            <div className="flex justify-between">
              <NodeInputLabel text="latent_image" color={WIRE_COLORS.LATENT} />
            </div>
            <NodeRow label="seed" value={String(seed)} />
            <NodeRow label="control_after_generate" value="randomize" />
            <NodeRow label="steps" value="28" />
            <NodeRow label="cfg" value="7.0" />
            <NodeRow label="sampler_name" value="euler" />
            <NodeRow label="scheduler" value="normal" />
            <NodeRow label="denoise" value="1.00" />
            <div className="flex justify-end mt-1">
              <NodeOutputLabel text="LATENT" color={WIRE_COLORS.LATENT} />
            </div>
          </div>
        </ComfyNode>

        {/* VAE Decode */}
        <ComfyNode title="VAE Decode" titleColor={NODE_TITLE_COLORS.vaeDecode} x={468} y={12} w={140}>
          <div className="space-y-1">
            <div className="flex justify-between">
              <NodeInputLabel text="samples" color={WIRE_COLORS.LATENT} />
              <NodeOutputLabel text="IMAGE" color={WIRE_COLORS.IMAGE} />
            </div>
            <div className="flex justify-start">
              <NodeInputLabel text="vae" color={WIRE_COLORS.VAE} />
            </div>
          </div>
        </ComfyNode>

        {/* Preview Image */}
        <ComfyNode title="Preview Image" titleColor={NODE_TITLE_COLORS.preview} x={468} y={100} w={280}>
          <div className="space-y-1">
            <NodeInputLabel text="images" color={WIRE_COLORS.IMAGE} />
            <div className="bg-[#1a1a1a] rounded overflow-hidden border border-[#444]">
              <img
                src={state.image!}
                alt="Preview"
                className="w-full max-h-[200px] object-contain"
              />
            </div>
          </div>
        </ComfyNode>
      </div>
    </div>
  )
}

function ComfyNode({ title, titleColor, x, y, w, children }: {
  title: string
  titleColor: string
  x: number; y: number; w: number
  children: React.ReactNode
}) {
  return (
    <div
      className="absolute rounded-lg overflow-hidden shadow-lg"
      style={{ left: x, top: y, width: w, zIndex: 1, border: '1px solid #444' }}
    >
      <div
        className="px-2 py-1 text-[10px] font-bold text-[#ddd] tracking-wide"
        style={{ background: titleColor }}
      >
        {title}
      </div>
      <div className="bg-[#353535] p-1.5">
        {children}
      </div>
    </div>
  )
}

function NodeRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-1 h-[16px]">
      <span className="text-[9px] text-[#999]">{label}</span>
      <span className="text-[9px] text-[#ccc] bg-[#2a2a2a] rounded px-1.5 py-px border border-[#444] truncate max-w-[90px]">{value}</span>
    </div>
  )
}

function NodeInputLabel({ text, color }: { text: string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-[6px] h-[6px] rounded-full" style={{ background: color }} />
      <span className="text-[8px] text-[#aaa]">{text}</span>
    </div>
  )
}

function NodeOutputLabel({ text, color }: { text: string; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[8px] text-[#aaa]">{text}</span>
      <div className="w-[6px] h-[6px] rounded-full" style={{ background: color }} />
    </div>
  )
}

function NodeLabel({ text }: { text: string }) {
  return <span className="text-[9px] text-[#999]">{text}</span>
}

function NodeDropdown({ value }: { value: string }) {
  return (
    <div className="flex items-center justify-between bg-[#2a2a2a] rounded px-1.5 py-0.5 border border-[#444] cursor-default">
      <span className="text-[9px] text-[#ccc] truncate">{value}</span>
      <svg width="8" height="8" viewBox="0 0 8 8" className="text-[#888] shrink-0 ml-1">
        <path d="M1 3l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" />
      </svg>
    </div>
  )
}
