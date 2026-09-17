'use client'

import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { createWorker } from 'tesseract.js'

export default function EscanearProveedor({ onDatosExtraidos }: { onDatosExtraidos: (datos: any) => void }) {
  const [cargando, setCargando] = useState(false)
  const [progreso, setProgreso] = useState('')

  const procesarImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setCargando(true)
    setProgreso('Iniciando motor OCR...')

    try {
      // Creamos el worker de Tesseract configurado para español
      const worker = await createWorker('spa')
      
      setProgreso('Leyendo texto de la imagen...')
      const ret = await worker.recognize(archivo)
      const texto = ret.data.text
      
      await worker.terminate()

      setProgreso('Extrayendo datos...')

      // Truco útil para Argentina: Buscamos patrones de CUIT (XX-XXXXXXXX-X) automáticamente
      const cuitMatch = texto.match(/\b\d{2}-\d{8}-\d{1}\b)
      const cuitEncontrado = cuitMatch ? cuitMatch[0] : ''

      // Le pasamos los datos detectados al formulario principal de tu modal
      onDatosExtraidos({
        cuit: cuitEncontrado,
        observaciones: `Texto detectado:\n${texto.substring(0, 200)}...` // Opcional para revisar
      })

      setCargando(false)
    } catch (error) {
      console.error("Error al procesar la imagen con OCR:", error)
      alert("Hubo un error al leer la imagen. Intenta con otra foto más iluminada.")
      setCargando(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-xs">
        {cargando ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>{progreso}</span>
          </>
        ) : (
          <>
            <Camera size={16} />
            <span>Escanear Factura / CUIT</span>
          </>
        )}
        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          className="hidden" 
          onChange={procesarImagen}
          disabled={cargando}
        />
      </label>
    </div>
  )
}