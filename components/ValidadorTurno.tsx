// components/ValidadorTurno.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePathname } from 'next/navigation'

export default function ValidadorTurno({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [bloqueado, setBloqueado] = useState(false)

  useEffect(() => {
    if (pathname === '/login') return

    const chequear = async () => {
      // 1. Obtenemos usuario directo
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/login'
        return
      }

      // 2. Traemos el perfil
      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('rol, hora_inicio, hora_fin')
        .eq('id', user.id)
        .single()

      if (error || !perfil) {
        console.error("Error leyendo perfil:", error)
        return
      }

      // Si es admin, libre acceso
      if (perfil.rol === 'admin' || perfil.rol === 'super_admin') return

      // Si es empleado, verificamos horario
      if (perfil.rol === 'empleado') {
        const inicio = perfil.hora_inicio || '08:00'
        const fin = perfil.hora_fin || '17:00'

        const ahora = new Date()
        const horaActual = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`

        let dentro = false
        if (inicio <= fin) {
          dentro = horaActual >= inicio && horaActual <= fin
        } else {
          dentro = horaActual >= inicio || horaActual <= fin
        }

        if (!dentro) {
          setBloqueado(true)
          alert(`⏰ Fuera de turno. Tu horario es ${inicio} a ${fin}. Son las ${horaActual}.`)
          await supabase.auth.signOut()
          localStorage.clear() // Limpiamos todo token guardado
          window.location.href = '/login'
        }
      }
    }

    chequear()
  }, [pathname])

  if (bloqueado) {
    return null
  }

  return <>{children}</>
}