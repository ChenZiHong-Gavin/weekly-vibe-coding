import { useState } from 'react'
import { ImageUpload } from './components/upload/ImageUpload'
import { TemplateSelector } from './components/editor/TemplateSelector'
import { PromptEditor } from './components/editor/PromptEditor'
import { PreviewCanvas } from './components/templates/PreviewCanvas'
import { ExportPanel } from './components/export/ExportPanel'

export type TemplateType = 'chatgpt' | 'midjourney' | 'sd-webui' | 'comfyui'

export type SDMode = 'interface' | 'comparison'

export interface ExportSize {
  label: string
  width: number
  height: number
}

export const EXPORT_SIZES: ExportSize[] = [
  { label: '手机截图', width: 1170, height: 2532 },
  { label: '桌面截图', width: 1920, height: 1080 },
]

export interface AppState {
  image: string | null
  template: TemplateType
  prompt: string
  username: string
  timestamp: string
  sdMode: SDMode
}

export default function App() {
  const [state, setState] = useState<AppState>({
    image: null,
    template: 'chatgpt',
    prompt: '',
    username: 'User',
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    sdMode: 'interface',
  })
  const [selectedSize, setSelectedSize] = useState(1)

  const updateState = (partial: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...partial }))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-800 px-6 py-4">
        <h1 className="text-xl font-bold">Real-to-AI</h1>
        <p className="text-sm text-neutral-400">把真实照片变得看起来像 AI 生成的</p>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        <aside className="w-full lg:w-80 space-y-4 shrink-0">
          <ImageUpload
            image={state.image}
            onImageChange={(image) => updateState({ image })}
          />
          <TemplateSelector
            value={state.template}
            onChange={(template) => updateState({ template })}
          />
          {state.template === 'sd-webui' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-300">显示模式</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateState({ sdMode: 'interface' })}
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    state.sdMode === 'interface'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                  }`}
                >
                  界面截图
                </button>
                <button
                  onClick={() => updateState({ sdMode: 'comparison' })}
                  className={`flex-1 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    state.sdMode === 'comparison'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                  }`}
                >
                  对比图
                </button>
              </div>
            </div>
          )}
          <PromptEditor
            prompt={state.prompt}
            onPromptChange={(prompt) => updateState({ prompt })}
            image={state.image}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">自定义信息</label>
            <div className="flex gap-2">
              <input
                value={state.username}
                onChange={(e) => updateState({ username: e.target.value })}
                placeholder="用户名"
                className="flex-1 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
              />
              <input
                value={state.timestamp}
                onChange={(e) => updateState({ timestamp: e.target.value })}
                placeholder="时间"
                className="w-24 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-xs text-neutral-500">显示在 Midjourney 等模板中</p>
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-center overflow-auto min-h-[300px] lg:min-h-[400px] p-4">
            <PreviewCanvas state={state} selectedSize={selectedSize} />
          </div>
          <ExportPanel state={state} selectedSize={selectedSize} onSizeChange={setSelectedSize} />
        </section>
      </main>
    </div>
  )
}
