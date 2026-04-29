'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface SwipeableCardProps {
  children: ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  leftLabel?: string
  rightLabel?: string
  leftColor?: string
  rightColor?: string
}

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Cancelar',
  rightLabel = 'Confirmar',
  leftColor = 'bg-red-500',
  rightColor = 'bg-emerald-500',
}: SwipeableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [startX, setStartX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const threshold = 100

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setSwiping(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping) return
    const diff = e.touches[0].clientX - startX
    const clamped = Math.max(-150, Math.min(150, diff))
    setOffset(clamped)
  }

  const handleTouchEnd = () => {
    setSwiping(false)
    if (offset > threshold && onSwipeRight) {
      onSwipeRight()
    } else if (offset < -threshold && onSwipeLeft) {
      onSwipeLeft()
    }
    setOffset(0)
  }

  const opacity = Math.min(Math.abs(offset) / threshold, 1)

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      {/* Left action (swipe right reveals) */}
      <div className={`absolute inset-y-0 left-0 w-24 flex items-center justify-center ${rightColor} text-white text-xs font-bold`} style={{ opacity: offset > 0 ? opacity : 0 }}>
        {rightLabel}
      </div>
      {/* Right action (swipe left reveals) */}
      <div className={`absolute inset-y-0 right-0 w-24 flex items-center justify-center ${leftColor} text-white text-xs font-bold`} style={{ opacity: offset < 0 ? opacity : 0 }}>
        {leftLabel}
      </div>
      {/* Content */}
      <div
        className="relative bg-zinc-900 transition-transform duration-150 ease-out"
        style={{ transform: `translateX(${offset}px)`, transitionDuration: swiping ? '0ms' : '300ms' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  )
}
