import type { TemplateType } from '../../App'
import { MessageSquare, Grid2x2, SlidersHorizontal, Workflow } from 'lucide-react'

interface TemplateSelectorProps {
  value: TemplateType
  onChange: (value: TemplateType) => void
}

const templates: { id: TemplateType; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chatgpt', label: 'ChatGPT 对话', icon: MessageSquare },
  { id: 'midjourney', label: 'Midjourney', icon: Grid2x2 },
  { id: 'sd-webui', label: 'Stable Diffusion', icon: SlidersHorizontal },
  { id: 'comfyui', label: 'ComfyUI', icon: Workflow },
]

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-300">选择模板</label>
      <div className="grid grid-cols-2 gap-2">
        {templates.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              value === id
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
