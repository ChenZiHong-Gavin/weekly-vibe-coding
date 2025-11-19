import { useState, useEffect } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { FaceAnalysis } from "@/components/FaceAnalysis";
import { HistoryChart } from "@/components/HistoryChart";
import { WarningAlert } from "@/components/WarningAlert";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Activity, Trash2 } from "lucide-react";
import { detectFaceLandmarks } from "@/lib/faceDetection";
import { saveMeasurement, getMeasurements, getAverageDistance, clearMeasurements } from "@/lib/storage";
import type { MeasurementRecord } from "@/lib/storage";

const Index = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [records, setRecords] = useState<MeasurementRecord[]>([]);
  const [averageDistance, setAverageDistance] = useState<number>(0);

  useEffect(() => {
    setRecords(getMeasurements());
    setAverageDistance(getAverageDistance());
  }, []);

  const handleImageSelect = async (file: File) => {
    setIsAnalyzing(true);
    toast.info("正在分析照片...");

    try {
      const imageUrl = URL.createObjectURL(file);
      setCurrentImage(imageUrl);

      const distance = await detectFaceLandmarks(imageUrl);
      setCurrentDistance(distance);

      const record = saveMeasurement(distance, imageUrl);
      const updatedRecords = getMeasurements();
      setRecords(updatedRecords);
      setAverageDistance(getAverageDistance());

      toast.success("分析完成！");
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error("分析失败，请确保照片清晰且包含完整面部");
      setCurrentImage(null);
      setCurrentDistance(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("确定要清除所有历史记录吗？")) {
      clearMeasurements();
      setRecords([]);
      setAverageDistance(0);
      setCurrentImage(null);
      setCurrentDistance(null);
      toast.success("历史记录已清除");
    }
  };

  const getPreviousDistance = (): number | undefined => {
    if (records.length < 2) return undefined;
    return records[records.length - 2].distance;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12 space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Activity className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              发际线监测
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            使用 AI 技术追踪你的发际线变化，及早发现潜在问题
          </p>
        </header>

        {/* Warning Alert */}
        {currentDistance && averageDistance > 0 && (
          <div className="mb-6">
            <WarningAlert 
              currentDistance={currentDistance} 
              averageDistance={averageDistance} 
            />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Upload & Analysis */}
          <div className="space-y-6">
            <ImageUpload onImageSelect={handleImageSelect} isAnalyzing={isAnalyzing} />
            
            {currentImage && currentDistance !== null && (
              <FaceAnalysis 
                distance={currentDistance} 
                image={currentImage}
                previousDistance={getPreviousDistance()}
              />
            )}
          </div>

          {/* Right Column - History */}
          <div className="space-y-6">
            <HistoryChart records={records} />
            
            {records.length > 0 && (
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearHistory}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  清除历史记录
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <footer className="mt-12 p-6 rounded-xl bg-card border border-border">
          <h3 className="font-semibold text-foreground mb-3">使用说明</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• 建议在相同光线条件下拍摄正面照片</li>
            <li>• 确保发际线和眉毛清晰可见</li>
            <li>• 定期测量以追踪长期变化趋势</li>
            <li>• 当距离增加超过 15% 时系统会发出警告</li>
          </ul>
        </footer>
      </div>
    </div>
  );
};

export default Index;
