import type { AppState } from '../../App'
import { ChatGPTTemplate } from './ChatGPTTemplate'
import { MidjourneyTemplate } from './MidjourneyTemplate'
import { SDWebUITemplate } from './SDWebUITemplate'
import { ComfyUITemplate } from './ComfyUITemplate'
import { ImageIcon } from 'lucide-react'

interface PreviewCanvasProps {
  state: AppState
  selectedSize: number
}

export function PreviewCanvas({ state, selectedSize }: PreviewCanvasProps) {
  if (!state.image) {
    return (
      <div className="text-center text-neutral-500 space-y-2">
        <ImageIcon className="w-12 h-12 mx-auto" />
        <p>上传一张照片开始</p>
      </div>
    )
  }

  const isMobile = selectedSize === 0

  switch (state.template) {
    case 'chatgpt':
      return <ChatGPTTemplate state={state} mobile={isMobile} />
    case 'midjourney':
      return <MidjourneyTemplate state={state} mobile={isMobile} />
    case 'sd-webui':
      return <SDWebUITemplate state={state} />
    case 'comfyui':
      return <ComfyUITemplate state={state} />
  }
}
