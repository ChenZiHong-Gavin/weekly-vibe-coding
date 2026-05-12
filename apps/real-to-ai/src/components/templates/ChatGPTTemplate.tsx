import { useMemo } from 'react'
import type { AppState } from '../../App'

interface Props {
  state: AppState
  mobile?: boolean
}

const CHATGPT_ICON_PATH = "M11.248 18.25q-.825 0-1.568-.314a4.3 4.3 0 0 1-1.32-.874 4 4 0 0 1-1.304.214 4 4 0 0 1-2.046-.544 4.27 4.27 0 0 1-1.518-1.485 4 4 0 0 1-.56-2.095q0-.48.131-1.04A4.4 4.4 0 0 1 2.04 10.71a4.07 4.07 0 0 1 .017-3.4 4.2 4.2 0 0 1 1.056-1.418 3.8 3.8 0 0 1 1.6-.842 3.9 3.9 0 0 1 .76-1.683q.593-.759 1.451-1.188a4.04 4.04 0 0 1 1.832-.429q.825 0 1.567.313.742.314 1.32.875a4 4 0 0 1 1.304-.215q1.106 0 2.046.545a4.14 4.14 0 0 1 1.501 1.485q.578.941.578 2.095 0 .48-.132 1.04.66.61 1.023 1.419.363.792.363 1.666 0 .892-.38 1.717a4.3 4.3 0 0 1-1.072 1.435 3.8 3.8 0 0 1-1.584.825 3.8 3.8 0 0 1-.775 1.683 4.06 4.06 0 0 1-1.436 1.188 4.04 4.04 0 0 1-1.832.429m-4.076-2.062q.825 0 1.435-.347l3.103-1.782a.36.36 0 0 0 .164-.313v-1.42L7.881 14.62a.67.67 0 0 1-.726 0l-3.118-1.798a.5.5 0 0 1-.017.115v.198q0 .841.396 1.551.413.693 1.139 1.089a3.2 3.2 0 0 0 1.617.412m.165-2.69a.4.4 0 0 0 .181.05q.083 0 .165-.05l1.238-.71-3.977-2.31a.7.7 0 0 1-.363-.643v-3.58q-.825.362-1.32 1.122a2.9 2.9 0 0 0-.495 1.65q0 .809.413 1.55.412.743 1.072 1.123zm3.91 3.663q.875 0 1.585-.396a2.96 2.96 0 0 0 1.534-2.64v-3.564a.32.32 0 0 0-.165-.297l-1.254-.726v4.604a.7.7 0 0 1-.363.643l-3.119 1.799a3 3 0 0 0 1.783.577m.627-6.039V8.878L10.01 7.822 8.129 8.878v2.244l1.881 1.056zM7.057 5.859a.7.7 0 0 1 .363-.644l3.119-1.798a3 3 0 0 0-1.782-.578q-.874 0-1.584.396A2.96 2.96 0 0 0 6.05 4.324a3.07 3.07 0 0 0-.396 1.551v3.547q0 .199.165.314l1.237.726zm8.383 7.887q.825-.364 1.303-1.123.495-.758.495-1.65a3.15 3.15 0 0 0-.412-1.55q-.413-.743-1.073-1.123l-3.086-1.782q-.099-.065-.181-.049a.3.3 0 0 0-.165.05l-1.238.692 3.993 2.327a.6.6 0 0 1 .264.264.64.64 0 0 1 .1.363zm-3.317-8.382a.63.63 0 0 1 .726 0l3.135 1.831v-.297q0-.792-.396-1.501a2.86 2.86 0 0 0-1.105-1.155q-.71-.43-1.65-.43-.825 0-1.436.347L8.294 5.941a.36.36 0 0 0-.165.314v1.418z"

const CHAT_HISTORY_RECENT = [
  '照片修正与色彩处理',
  '照片修正与美化',
  '线性循环设计图',
  '传统餐饮AI化梗图',
  'Homelander 演讲插图要求',
  '小狗与罚单',
  'Vibe Coding vs tiktok',
  '梗图创作请求',
  '描述准确性核对',
  'GNN预测偶极矩方法',
  'PyTorch vs NumPy F1',
  '解决模型精度不匹配',
  'Hugging Face checkpoint问题',
  '解决模型保存错误',
  'Code snippet explanation',
  'Loss negative原因分析',
  '画小猫教程',
]

function randomUUID() {
  const hex = '0123456789abcdef'
  let s = ''
  for (let i = 0; i < 32; i++) s += hex[Math.floor(Math.random() * 16)]
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`
}

function ChatGPTIcon({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className={`fill-current ${className}`}>
      <path d={CHATGPT_ICON_PATH} />
    </svg>
  )
}

export function ChatGPTTemplate({ state, mobile }: Props) {
  return mobile ? <MobileLayout state={state} /> : <DesktopLayout state={state} />
}

/* ===================== MOBILE LAYOUT ===================== */
function MobileLayout({ state }: { state: AppState }) {
  const prompt = state.prompt || 'Generate a photorealistic image of this scene'

  return (
    <div id="preview-output" className="w-full max-w-md mx-auto bg-[#212121] rounded-xl overflow-hidden flex flex-col" style={{ fontFamily: '"Söhne", ui-sans-serif, system-ui, -apple-system, sans-serif', height: '720px' }}>
      {/* Mobile header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0">
        <div className="flex items-center gap-4">
          {/* Hamburger menu */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#ececec]">
            <path d="M3 12h18M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {/* ChatGPT title */}
          <div className="flex items-center gap-1">
            <span className="text-[17px] font-semibold text-white">ChatGPT</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#888]">
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-4 pointer-events-none">
          <span className="text-[13px] text-[#999] flex items-center gap-1"><GiftIcon /> 免费试用</span>
          {/* New chat icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#ececec]">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {/* More */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#ececec]">
            <circle cx="12" cy="5" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="19" r="1.5" fill="currentColor"/>
          </svg>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-auto px-4">
        <div className="space-y-5 py-4">
          {/* User message — right-aligned bubble */}
          <div className="flex justify-end">
            <div className="max-w-[85%] px-4 py-2.5 rounded-3xl bg-[#2f2f2f] text-[15px] text-[#ececec] leading-[1.6]">
              {prompt}
            </div>
          </div>

          {/* Assistant response */}
          <div className="space-y-3">
            {/* ChatGPT avatar */}
            <div className="w-6 h-6 rounded-full border border-[#444] flex items-center justify-center bg-[#212121]">
              <ChatGPTIcon size={14} className="text-[#ececec]" />
            </div>

            {/* Generated image — full width on mobile */}
            <div className="rounded-2xl overflow-hidden">
              <img
                src={state.image!}
                alt="Generated"
                className="w-full object-cover"
              />
            </div>

            {/* Long text with "展开" button — mimics the screenshot */}
            <div className="relative">
              <div className="text-[15px] text-[#ececec] leading-[1.6] max-h-[200px] overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}>
                {prompt}
              </div>
              <div className="flex items-center justify-center gap-2 mt-1 pointer-events-none">
                <span className="text-[14px] text-[#ececec]">展开</span>
                <div className="w-7 h-7 rounded-full border border-[#555] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#ececec]">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action icons */}
      <div className="flex justify-end px-4 pb-1 pointer-events-none">
        <div className="flex items-center gap-1">
          <CopySmallIcon />
          <div className="p-1 rounded"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#888]"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
        </div>
      </div>

      {/* Input bar */}
      <div className="px-4 pb-2 shrink-0">
        <div className="rounded-3xl bg-[#2f2f2f] border border-[#424242] flex items-center gap-2 px-3 py-2.5">
          {/* Plus */}
          <div className="w-8 h-8 rounded-full bg-[#424242] flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#ececec]">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="flex-1 text-[15px] text-[#8e8ea0]">有问题，尽管问</span>
          {/* Mic */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#b4b4b4] shrink-0">
            <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M5 10a7 7 0 0014 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 19v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {/* Voice wave */}
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" className="text-black">
              <path d="M2 12h2m3-4v8m3-10v12m3-10v8m3-12v16m3-10v4m3-6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <p className="text-[11px] text-[#808080] text-center mt-2 pb-1">ChatGPT 也可能会犯错。请核查重要信息。查看 Cookie 首选项。</p>
      </div>
    </div>
  )
}

/* ===================== DESKTOP LAYOUT ===================== */
function DesktopLayout({ state }: { state: AppState }) {
  const prompt = state.prompt || 'Generate a photorealistic image of this scene'
  const fakeUrl = useMemo(() => `https://chatgpt.com/c/${randomUUID()}`, [])
  const activeIdx = 1

  return (
    <div id="preview-output" className="w-full max-w-4xl mx-auto bg-[#212121] rounded-xl overflow-hidden text-[14px]" style={{ fontFamily: '"Söhne", ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
      {/* Browser chrome bar */}
      <div className="bg-[#1f1f1f] flex items-center gap-2 px-3 h-9 border-b border-[#333]">
        <div className="flex gap-1.5 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex gap-1 ml-2 shrink-0 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" className="text-[#666]"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <svg width="14" height="14" viewBox="0 0 24 24" className="text-[#666]"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div className="flex-1 mx-2 h-6 rounded-md bg-[#2f2f2f] flex items-center justify-center px-3">
          <span className="text-[12px] text-[#999] truncate">{fakeUrl}</span>
        </div>
        <div className="flex gap-2 shrink-0 pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" className="text-[#666]"><path d="M4 12h16M4 6h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
      </div>

      <div className="flex" style={{ height: '580px' }}>
        {/* Left sidebar */}
        <div className="w-[200px] bg-[#171717] flex flex-col shrink-0 border-r border-[#2a2a2a]">
          <div className="p-2 space-y-0.5">
            <div className="flex items-center justify-between px-2 py-1.5">
              <ChatGPTIcon size={20} className="text-white" />
              <svg width="16" height="16" viewBox="0 0 24 24" className="text-[#999]"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" fill="none"/></svg>
            </div>
            <SidebarItem icon={<PenIcon />} label="新聊天" />
            <SidebarItem icon={<SearchIcon />} label="搜索聊天" />
            <SidebarItem icon={<FolderIcon />} label="项目" />
            <SidebarItem icon={<CodeIcon />} label="Codex" />
            <SidebarItem icon={<DotsIcon />} label="更多" />
          </div>

          <div className="flex-1 overflow-hidden px-2 mt-1">
            <p className="text-[11px] font-medium text-[#777] px-2 py-1">最近</p>
            <div className="space-y-px">
              {CHAT_HISTORY_RECENT.map((title, i) => (
                <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] truncate cursor-default ${i === activeIdx ? 'bg-[#2f2f2f] text-white' : 'text-[#ccc]'}`}>
                  <span className="truncate">{title}</span>
                  {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#5b9cf4] shrink-0 ml-auto" />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-2 border-t border-[#2a2a2a]">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-[#5b5fc7] flex items-center justify-center text-[11px] text-white font-medium shrink-0">
                {state.username[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] text-white truncate">{state.username}</p>
                <p className="text-[11px] text-[#777]">免费版</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#212121]">
          <div className="flex items-center justify-between px-4 h-11 shrink-0">
            <div className="flex items-center gap-1 cursor-default">
              <span className="text-[15px] font-semibold text-white">ChatGPT</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#888]"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div className="flex items-center gap-3 text-[13px] text-[#999] pointer-events-none">
              <span className="flex items-center gap-1"><GiftIcon /> 免费试用</span>
              <span className="flex items-center gap-1"><ShareIcon /> 分享</span>
              <span>···</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-4">
            <div className="max-w-[680px] mx-auto space-y-6 py-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="relative max-w-[85%]">
                  <div className="px-5 py-2.5 rounded-3xl bg-[#2f2f2f] text-[15px] text-[#ececec] leading-[1.6]">
                    {prompt}
                  </div>
                  <div className="absolute -bottom-5 right-2 flex items-center gap-0.5 pointer-events-none">
                    <CopySmallIcon />
                    <EditSmallIcon />
                  </div>
                </div>
              </div>

              {/* Assistant response */}
              <div className="space-y-3 pt-2">
                <div className="w-6 h-6 rounded-full border border-[#444] flex items-center justify-center bg-[#212121]">
                  <ChatGPTIcon size={14} className="text-[#ececec]" />
                </div>
                <div className="rounded-2xl overflow-hidden max-w-[320px]">
                  <img src={state.image!} alt="Generated" className="w-full object-cover" />
                </div>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="px-4 pb-3 shrink-0">
            <div className="max-w-[680px] mx-auto">
              <div className="rounded-3xl bg-[#2f2f2f] border border-[#424242]">
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className="text-[15px] text-[#8e8ea0] flex-1">有问题，尽管问</span>
                </div>
                <div className="flex items-center justify-between px-3 pb-2.5">
                  <div className="flex items-center gap-0.5 pointer-events-none">
                    <div className="p-1.5 rounded-full">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#b4b4b4]"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 pointer-events-none">
                    <div className="p-1.5 rounded-full">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#b4b4b4]"><rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M5 10a7 7 0 0014 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M12 19v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" className="text-black"><path d="M2 12h2m3-4v8m3-10v12m3-10v8m3-12v16m3-10v4m3-6v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#808080] text-center mt-2">ChatGPT 也可能会犯错。请核查重要信息。查看 Cookie 首选项。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---- Shared small components ---- */

function SidebarItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] text-[#ccc] cursor-default">
      {icon}<span>{label}</span>
    </div>
  )
}

function PenIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#ccc] shrink-0"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function SearchIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#ccc] shrink-0"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> }
function FolderIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#ccc] shrink-0"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CodeIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#ccc] shrink-0"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function DotsIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#ccc] shrink-0"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg> }
function GiftIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 110-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 100-5C13 2 12 7 12 7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function ShareIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function CopySmallIcon() { return <div className="p-1 rounded"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#888]"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/></svg></div> }
function EditSmallIcon() { return <div className="p-1 rounded"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#888]"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div> }
