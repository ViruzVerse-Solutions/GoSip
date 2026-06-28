'use client'

import { useEffect } from 'react'

export default function ZoomBlocker() {
  useEffect(() => {
    // Prevent mouse wheel / trackpad zooming (Ctrl + wheel)
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault()
      }
    }

    // Prevent pinch-to-zoom gestures (touchstart & touchmove with multi-touch)
    const handleTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    // Prevent browser zooming keyboard shortcuts (Ctrl + '+', Ctrl + '-', Ctrl + '0')
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '=' ||
          e.key === '-' ||
          e.key === '+' ||
          e.key === '0' ||
          e.keyCode === 61 ||
          e.keyCode === 107 ||
          e.keyCode === 173 ||
          e.keyCode === 109 ||
          e.keyCode === 187 ||
          e.keyCode === 189)
      ) {
        e.preventDefault()
      }
    }

    // iOS Safari specific gesture handlers to prevent pinch-to-zoom
    const handleGesture = (e: Event) => {
      e.preventDefault()
    }

    document.addEventListener('wheel', handleWheel, { passive: false })
    document.addEventListener('touchstart', handleTouch, { passive: false })
    document.addEventListener('touchmove', handleTouch, { passive: false })
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('gesturestart', handleGesture, { passive: false })
    document.addEventListener('gesturechange', handleGesture, { passive: false })
    document.addEventListener('gestureend', handleGesture, { passive: false })

    return () => {
      document.removeEventListener('wheel', handleWheel)
      document.removeEventListener('touchstart', handleTouch)
      document.removeEventListener('touchmove', handleTouch)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('gesturestart', handleGesture)
      document.removeEventListener('gesturechange', handleGesture)
      document.removeEventListener('gestureend', handleGesture)
    }
  }, [])

  return null
}
