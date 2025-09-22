"use client"

import { useEffect, useState } from 'react'
import { Toaster } from './toaster'

export function ToasterWrapper() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <Toaster />
}
