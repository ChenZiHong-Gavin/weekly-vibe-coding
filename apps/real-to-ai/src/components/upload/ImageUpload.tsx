import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, ImageIcon } from 'lucide-react'

interface ImageUploadProps {
  image: string | null
  onImageChange: (image: string | null) => void
}

export function ImageUpload({ image, onImageChange }: ImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onImageChange(reader.result as string)
    }
    reader.readAsDataURL(file)
  }, [onImageChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  })

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-neutral-300">上传照片</label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-neutral-700 hover:border-neutral-500'
        }`}
      >
        <input {...getInputProps()} />
        {image ? (
          <div className="space-y-2">
            <img src={image} alt="Preview" className="max-h-32 mx-auto rounded" />
            <p className="text-xs text-neutral-400">点击或拖拽替换</p>
          </div>
        ) : (
          <div className="py-6 space-y-2">
            {isDragActive ? (
              <ImageIcon className="w-8 h-8 mx-auto text-blue-400" />
            ) : (
              <Upload className="w-8 h-8 mx-auto text-neutral-500" />
            )}
            <p className="text-sm text-neutral-400">
              {isDragActive ? '松开上传' : '点击或拖拽上传图片'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
