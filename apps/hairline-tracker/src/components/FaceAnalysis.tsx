import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ruler, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface FaceAnalysisProps {
  distance: number;
  image: string;
  previousDistance?: number;
}

export const FaceAnalysis = ({ distance, image, previousDistance }: FaceAnalysisProps) => {
  const getTrend = () => {
    if (!previousDistance) return null;
    const diff = distance - previousDistance;
    const percentChange = ((diff / previousDistance) * 100).toFixed(1);
    
    if (Math.abs(diff) < 2) {
      return { icon: Minus, text: "稳定", variant: "secondary" as const, change: percentChange };
    } else if (diff > 0) {
      return { icon: TrendingUp, text: "上升", variant: "destructive" as const, change: `+${percentChange}` };
    } else {
      return { icon: TrendingDown, text: "下降", variant: "default" as const, change: percentChange };
    }
  };

  const trend = getTrend();

  return (
    <Card className="overflow-hidden shadow-lg">
      <div className="relative">
        <img 
          src={image} 
          alt="Face analysis" 
          className="w-full h-auto max-h-96 object-contain bg-muted"
        />
        <div className="absolute top-4 right-4">
          <Badge className="bg-primary text-primary-foreground shadow-lg">
            分析完成
          </Badge>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Ruler className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">发际线距离</p>
              <p className="text-3xl font-bold text-foreground">{distance.toFixed(1)} px</p>
            </div>
          </div>
          
          {trend && (
            <Badge variant={trend.variant} className="flex items-center gap-1 px-3 py-1">
              <trend.icon className="w-4 h-4" />
              <span>{trend.text} {trend.change}%</span>
            </Badge>
          )}
        </div>

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            测量说明：距离是从发际线最低点到眉毛中心的像素距离
          </p>
        </div>
      </div>
    </Card>
  );
};
