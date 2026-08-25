// components/Scanner.tsx
'use client'

import { useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface ScannerProps {
  onScan: (decodedText: string) => void
}

export default function Scanner({ onScan }: ScannerProps) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
      },
      false
    )

    scanner.render(
      (decodedText) => {
        onScan(decodedText)
        scanner.clear()
      },
      () => {}
    )

    return () => {
      scanner.clear().catch((error) => console.error('Error al cerrar cámara', error))
    }
  }, [onScan])

  return (
    <div className="w-full max-w-sm mx-auto p-4 bg-white rounded-lg shadow-md">
      <div id="reader" className="w-full"></div>
    </div>
  )
}