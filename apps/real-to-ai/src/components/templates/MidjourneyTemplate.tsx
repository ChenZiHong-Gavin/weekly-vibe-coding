import type { AppState } from '../../App'
import { useFilteredImages } from '../../lib/useFilteredImages'

interface Props {
  state: AppState
  mobile?: boolean
}

const MJ_FILTERS = [
  { filter: 'none' },
  { filter: 'opacity(0.85) saturate(0.8)' },
  { filter: 'brightness(1.1) hue-rotate(15deg)' },
  { filter: 'contrast(1.1) saturate(1.2)' },
]

const FONT = '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'

function MjAvatar() {
  return (
    <div className="w-10 h-10 rounded-full bg-[#1a1a2e] flex items-center justify-center shrink-0 overflow-hidden border border-[#232428]">
      <svg viewBox="0 0 100 100" className="w-8 h-8">
        <rect width="100" height="100" fill="#000"/>
        <path d="M30 70 L35 30 L45 55 L50 25 L55 55 L65 30 L70 70" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

function HashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" className="text-[#80848e] shrink-0">
      <path fill="currentColor" d="M5.88657 21C5.57547 21 5.3399 20.7189 5.39427 20.4126L6.00001 17H2.59511C2.28449 17 2.04905 16.7198 2.10259 16.4138L2.27759 15.4138C2.31946 15.1746 2.52722 15 2.77011 15H6.35001L7.41001 9H4.00511C3.69449 9 3.45905 8.71977 3.51259 8.41381L3.68759 7.41381C3.72946 7.17456 3.93722 7 4.18011 7H7.76001L8.39677 3.41262C8.43914 3.17391 8.64664 3 8.88907 3H9.87344C10.1845 3 10.4201 3.28107 10.3657 3.58738L9.76001 7H15.76L16.3968 3.41262C16.4391 3.17391 16.6466 3 16.8891 3H17.8734C18.1845 3 18.4201 3.28107 18.3657 3.58738L17.76 7H21.1649C21.4755 7 21.711 7.28023 21.6574 7.58619L21.4824 8.58619C21.4406 8.82544 21.2328 9 20.9899 9H17.41L16.35 15H19.7549C20.0655 15 20.301 15.2802 20.2474 15.5862L20.0724 16.5862C20.0306 16.8254 19.8228 17 19.5799 17H16L15.3632 20.5874C15.3209 20.8261 15.1134 21 14.8709 21H13.8866C13.5755 21 13.3399 20.7189 13.3943 20.4126L14 17H8.00001L7.36325 20.5874C7.32088 20.8261 7.11337 21 6.87094 21H5.88657ZM9.41001 15H15.41L16.47 9H10.47L9.41001 15Z"/>
    </svg>
  )
}

function ActionButtons() {
  return (
    <div className="flex flex-wrap gap-1 mt-1 pointer-events-none">
      {['U1', 'U2', 'U3', 'U4'].map(btn => (
        <span key={btn} className="h-8 px-4 rounded bg-[#4e5058] text-[14px] text-[#dbdee1] inline-flex items-center justify-center font-medium">{btn}</span>
      ))}
      <span className="w-0.5 h-6 bg-[#3b3d44] self-center mx-0.5 rounded-full" />
      {['V1', 'V2', 'V3', 'V4'].map(btn => (
        <span key={btn} className="h-8 px-4 rounded bg-[#4e5058] text-[14px] text-[#dbdee1] inline-flex items-center justify-center font-medium">{btn}</span>
      ))}
      <span className="w-0.5 h-6 bg-[#3b3d44] self-center mx-0.5 rounded-full" />
      <span className="h-8 px-4 rounded bg-[#4e5058] text-[14px] text-[#dbdee1] inline-flex items-center justify-center">🔄</span>
    </div>
  )
}

export function MidjourneyTemplate({ state, mobile }: Props) {
  return mobile ? <MobileLayout state={state} /> : <DesktopLayout state={state} />
}

/* ===================== MOBILE LAYOUT ===================== */
function MobileLayout({ state }: { state: AppState }) {
  const prompt = state.prompt || 'a beautiful scene, photorealistic, 8k, detailed'
  const filtered = useFilteredImages(state.image, MJ_FILTERS)

  return (
    <div id="preview-output" className="w-full max-w-md mx-auto bg-[#313338] rounded-xl overflow-hidden flex flex-col" style={{ fontFamily: FONT, height: '720px' }}>
      {/* Mobile Discord header — back arrow + channel name */}
      <div className="flex items-center gap-3 px-4 h-12 bg-[#313338] border-b border-[#232428] shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#b5bac1] shrink-0">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <HashIcon />
        <span className="text-[16px] text-[#f2f3f5] font-semibold">general</span>
        <div className="ml-auto flex items-center gap-3">
          {/* Thread icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#b5bac1]">
            <path d="M4 21V8a3 3 0 013-3h10a3 3 0 013 3v6a3 3 0 01-3 3H8l-4 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
          </svg>
          {/* Members icon */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#b5bac1]">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto py-2">
        {/* User command */}
        <div className="flex gap-3 px-4 py-1">
          <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-sm font-semibold shrink-0 mt-0.5">
            {state.username[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-medium text-[#f2f3f5]">{state.username}</span>
              <span className="text-[11px] text-[#949ba4]">Today at {state.timestamp}</span>
            </div>
            <p className="text-[15px] text-[#dbdee1] leading-[1.375rem] mt-0.5">
              <span className="text-[#00aafc] bg-[#00aafc]/10 rounded px-0.5">/imagine</span>{' '}
              <span className="text-[#949ba4]">prompt:</span> {prompt}
            </p>
          </div>
        </div>

        {/* Bot response */}
        <div className="flex gap-3 px-4 py-1 mt-3">
          <MjAvatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[15px] font-medium text-[#f2f3f5]">Midjourney Bot</span>
              <span className="px-[4px] py-[1px] rounded-sm text-[10px] font-medium bg-[#5865f2] text-white leading-[15px]">BOT</span>
              <span className="text-[11px] text-[#949ba4]">Today at {state.timestamp}</span>
            </div>
            <p className="text-[14px] text-[#dbdee1] mt-1 leading-[1.375rem]">
              <span className="font-medium">{prompt}</span>{' '}
              — <span className="text-[#949ba4]">@{state.username}</span>{' '}
              <span className="text-[#949ba4]">(fast)</span>
            </p>

            {/* 2x2 grid — full width on mobile */}
            <div className="grid grid-cols-2 gap-[3px] rounded-lg overflow-hidden mt-2 border border-[#232428]">
              {filtered.map((src, i) => (
                <img key={i} src={src || state.image!} alt={`V${i + 1}`} className="w-full aspect-square object-cover" />
              ))}
            </div>

            <ActionButtons />
          </div>
        </div>
      </div>

      {/* Mobile input bar */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="flex items-center h-10 rounded-full bg-[#383a40] px-4">
          <svg width="20" height="20" viewBox="0 0 24 24" className="text-[#b5bac1] shrink-0">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
          <span className="flex-1 text-[14px] text-[#6d6f78] ml-3">Message #general</span>
        </div>
      </div>
    </div>
  )
}

/* ===================== DESKTOP LAYOUT ===================== */
function DesktopLayout({ state }: { state: AppState }) {
  const prompt = state.prompt || 'a beautiful scene, photorealistic, 8k, detailed'
  const filtered = useFilteredImages(state.image, MJ_FILTERS)

  return (
    <div id="preview-output" className="w-full max-w-2xl mx-auto bg-[#313338] rounded-xl overflow-hidden" style={{ fontFamily: FONT }}>
      {/* Discord channel header */}
      <div className="flex items-center gap-2 px-4 h-12 bg-[#313338] border-b border-[#232428] shadow-sm">
        <HashIcon />
        <span className="text-[15px] text-[#f2f3f5] font-semibold">general</span>
      </div>

      {/* Message area */}
      <div className="py-1">
        {/* User /imagine command */}
        <div className="flex gap-4 px-4 py-1 hover:bg-[#2e3035] group">
          <div className="w-10 h-10 rounded-full bg-[#5865f2] flex items-center justify-center text-white text-sm font-semibold shrink-0 mt-0.5">
            {state.username[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-medium text-[#f2f3f5] hover:underline cursor-default">{state.username}</span>
              <span className="text-[11px] text-[#949ba4]">Today at {state.timestamp}</span>
            </div>
            <p className="text-[15px] text-[#dbdee1] leading-[1.375rem] mt-0.5">
              <span className="text-[#00aafc] bg-[#00aafc]/10 rounded px-0.5 cursor-default">/imagine</span>{' '}
              <span className="text-[#949ba4]">prompt:</span> {prompt}
            </p>
          </div>
        </div>

        {/* Bot response */}
        <div className="flex gap-4 px-4 py-1 hover:bg-[#2e3035] group mt-4">
          <MjAvatar />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-medium text-[#f2f3f5] hover:underline cursor-default">Midjourney Bot</span>
              <span className="px-[4px] py-[1px] rounded-sm text-[10px] font-medium bg-[#5865f2] text-white leading-[15px] inline-flex items-center" style={{ verticalAlign: 'top' }}>BOT</span>
              <span className="text-[11px] text-[#949ba4]">Today at {state.timestamp}</span>
            </div>
            <p className="text-[15px] text-[#dbdee1] mt-1 leading-[1.375rem]">
              <span className="font-medium text-[#dbdee1]">{prompt}</span>{' '}
              — <span className="text-[#949ba4]">@{state.username}</span>{' '}
              <span className="text-[#949ba4]">(fast)</span>
            </p>

            {/* 2x2 image grid */}
            <div className="grid grid-cols-2 gap-[4px] rounded-lg overflow-hidden max-w-[400px] mt-2 border border-[#232428]">
              {filtered.map((src, i) => (
                <img key={i} src={src || state.image!} alt={`V${i + 1}`} className="w-full aspect-square object-cover" />
              ))}
            </div>

            <ActionButtons />
          </div>
        </div>
      </div>

      {/* Discord input bar */}
      <div className="px-4 pb-6 pt-2">
        <div className="flex items-center h-11 rounded-lg bg-[#383a40] px-4">
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-[#b5bac1] shrink-0 cursor-default">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
          <span className="flex-1 text-[15px] text-[#6d6f78] ml-3">Message #general</span>
          <div className="flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-[#b5bac1] cursor-default">
              <path fill="currentColor" d="M2 16.5C2 19.538 4.462 22 7.5 22s5.5-2.462 5.5-5.5c0-.144-.011-.284-.024-.424L15.2 14.8a2.5 2.5 0 003.48-3.48l2.276-2.276A5.476 5.476 0 0022 6.5C22 3.462 19.538 1 16.5 1S11 3.462 11 6.5c0 .144.011.284.024.424L8.8 9.2a2.5 2.5 0 00-3.48 3.48L3.044 14.956A5.476 5.476 0 002 16.5z"/>
            </svg>
            <svg width="24" height="24" viewBox="0 0 24 24" className="text-[#b5bac1] cursor-default">
              <path fill="currentColor" d="M12 2a9.65 9.65 0 016.832 2.818A9.65 9.65 0 0121.65 12a9.65 9.65 0 01-2.818 6.832A9.65 9.65 0 0112 21.65a9.65 9.65 0 01-6.832-2.818A9.65 9.65 0 012.35 12a9.65 9.65 0 012.818-6.832A9.65 9.65 0 0112 2zm0 18.6c4.774 0 8.6-3.826 8.6-8.6S16.774 3.4 12 3.4 3.4 7.226 3.4 12s3.826 8.6 8.6 8.6zm-2.8-10.6a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8zm5.6 0a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8zM8.6 14.4a3.4 3.4 0 006.8 0H8.6z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
