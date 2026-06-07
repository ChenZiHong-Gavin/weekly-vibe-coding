import { useTheaterStore } from '@/store/theaterStore';
import { scenes } from '@/data/scenes';

export default function SceneSelector() {
  const { selectedSceneId, setSelectedSceneId } = useTheaterStore();

  return (
    <div className="space-y-3">
      <h3 className="theater-title text-lg">选择场景</h3>
      <div className="grid grid-cols-2 gap-2">
        {scenes.map((scene) => {
          const isActive = selectedSceneId === scene.id;
          return (
            <button
              key={scene.id}
              onClick={() => setSelectedSceneId(scene.id)}
              className={`
                relative p-3 rounded-lg transition-all text-center overflow-hidden
                ${isActive
                  ? 'gold-border'
                  : 'border border-[hsl(25_25%_18%)] hover:border-[hsl(var(--gold)/0.3)]'
                }
              `}
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{ background: scene.bgColor }}
              />
              <div className="relative">
                <div
                  className="font-song text-sm mb-1"
                  style={{ color: isActive ? 'hsl(var(--gold))' : 'hsl(var(--foreground))' }}
                >
                  {scene.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {scene.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
