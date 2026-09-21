// components/RecordatorioCierre.tsx
'use client'

import { useEffect } from 'react'

export default function RecordatorioCierre() {
  useEffect(() => {
    const intervalo = setInterval(() => {
      const ahora = new Date()
      const hora = ahora.getHours()
      const minuto = ahora.getMinutes()

      // Se dispara a las 23:30 hs
      if (hora === 23 && minuto === 30) {
        const hoyStr = ahora.toDateString()
        const ultimoAviso = localStorage.getItem('aviso_cierre_2330')

        // Condición para que salte una sola vez por día
        if (ultimoAviso !== hoyStr) {
          alert('⚠️ ¡ATENCIÓN! Son las 23:30 hs. Recordá guardar el archivo Excel y cerrar el turno del día.')
          localStorage.setItem('aviso_cierre_2330', hoyStr)
        }
      }
    }, 30000) // Revisa el reloj cada 30 segundos

    return () => clearInterval(intervalo)
  }, [])

  return null // Este componente no muestra nada visual en pantalla, solo corre en segundo plano
}