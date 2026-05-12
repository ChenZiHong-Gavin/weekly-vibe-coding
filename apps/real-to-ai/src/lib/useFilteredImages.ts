import { useEffect, useState } from 'react'

type FilterSpec = {
  filter: string
}

function applyFilter(src: string, spec: FilterSpec, size: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size

      const ctx = canvas.getContext('2d')!
      ctx.filter = spec.filter
      const scale = Math.max(size / img.width, size / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)

      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    img.src = src
  })
}

export function useFilteredImages(src: string | null, filters: FilterSpec[], size = 512): (string | null)[] {
  const [images, setImages] = useState<(string | null)[]>(() => filters.map(() => null))

  useEffect(() => {
    if (!src) {
      setImages(filters.map(() => null))
      return
    }

    let cancelled = false
    Promise.all(filters.map((f) => applyFilter(src, f, size))).then((results) => {
      if (!cancelled) setImages(results)
    })
    return () => { cancelled = true }
  }, [src, size])

  return images
}
