// components/Scanner.tsx
'use client'

import { useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface ScannerProps {
  onScan: (decodedText: string) => void
}

export default function Scanner({ onScan }: ScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    // Evitamos duplicar instancias si ya está creado
    if (scannerRef.current) return

    const scanner = new Html5QrcodeScanner(
      'reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.0,
      },
      false
    )

    scannerRef.current = scanner

    scanner.render(
      (decodedText) => {
        // Éxito al escanear
        try {
          onScan(decodedText)
          if (scannerRef.current) {
            scannerRef.current.clear().catch(() => {})
            scannerRef.current = null
          }
        } catch (err) {
          console.error("Error al procesar escaneo:", err)
        }
      },
      (errorMessage) => {
        // IMPORTANTE: Aquí caen los errores continuos de cuando la imagen sale borrosa, 
        // no hay código a la vista o está enfocando mal. 
        // Al dejarlo en blanco o solo en console.debug, EVITAMOS que la PWA crashee.
        console.debug("Buscando código de barras...", errorMessage)
      }
    )

    return () => {
      // Limpieza segura al desmontar el componente (cuando cerrás el modal)
      if (scannerRef.current) {
        scannerRef.current
          .clear()
          .catch((error) => {
            console.warn('Advertencia al limpiar la cámara:', error)
          })
        scannerRef.current = null
      }
    }
  }, [onScan])

  return (
    <div className="w-full max-w-sm mx-auto p-4 bg-white rounded-lg shadow-md">
      <div id="reader" className="w-full"></div>
    </div>
  )
}