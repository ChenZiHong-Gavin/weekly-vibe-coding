import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  onImageUpload: (imageUrl: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('请选择有效的图片文件');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('图片大小不能超过10MB');
      return;
    }

    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      onImageUpload(imageUrl);
      setIsProcessing(false);
      toast.success('图片上传成功！');
    };
    
    reader.onerror = () => {
      setIsProcessing(false);
      toast.error('图片读取失败，请重试');
    };
    
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`upload-area border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-300 ${
        isDragActive ? 'drag-over' : ''
      }`}
    >
      <input {...getInputProps()} />
      
      <div className="space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          {isProcessing ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? '释放以上传图片' : '上传您的图片'}
          </h3>
          <p className="text-muted-foreground mb-4">
            拖拽图片到此处，或点击选择文件
          </p>
          
          <Button 
            type="button" 
            variant="outline"
            disabled={isProcessing}
            className="mb-4"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            选择图片
          </Button>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>支持 PNG、JPG、WEBP 格式</p>
            <p>建议图片大小小于 10MB</p>
          </div>
        </div>
      </div>
    </div>
  );
};