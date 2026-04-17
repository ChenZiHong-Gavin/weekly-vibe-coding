export function initStars(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!
  let stars: { x: number; y: number; r: number; alpha: number; twinkleSpeed: number; phase: number }[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    generateStars()
  }

  function generateStars() {
    const count = Math.floor((window.innerWidth * window.innerHeight) / 800)
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.6 + 0.2,
      twinkleSpeed: Math.random() * 0.003 + 0.001,
      phase: Math.random() * Math.PI * 2,
    }))
  }

  function draw(time: number) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const star of stars) {
      const a = star.alpha + Math.sin(time * star.twinkleSpeed + star.phase) * 0.2
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(220, 225, 255, ${Math.max(0, Math.min(1, a))})`
      ctx.fill()
    }
  }

  window.addEventListener('resize', resize)
  resize()

  return { draw }
}
