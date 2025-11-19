import { Upload, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRef } from "react";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  isAnalyzing: boolean;
}

export const ImageUpload = ({ onImageSelect, isAnalyzing }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <Card className="p-8 border-2 border-dashed border-border hover:border-primary transition-colors">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Camera className="w-10 h-10 text-primary-foreground" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">
            上传面部照片
          </h3>
          <p className="text-muted-foreground max-w-sm">
            上传清晰的正面照片，确保发际线和眉毛清晰可见
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isAnalyzing}
        />

        <Button
          size="lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          <Upload className="mr-2 h-5 w-5" />
          {isAnalyzing ? "分析中..." : "选择照片"}
        </Button>
      </div>
    </Card>
  );
};
