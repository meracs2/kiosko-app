'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Lock, Mail, HeartHandshake } from 'lucide-react'

const FRASES_AMIGABLES = [
  "Un café, tu cuenta y ¡a vender con todo hoy! ☕✨",
  "Listos para abrir las puertas y romperla hoy 🚪🚀",
  "Ingresá a tu espacio para arrancar la jornada 🛍️",
  "Poné primera para empezar a registrar tus ventas de hoy 🔥"
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [frase, setFrase] = useState('')
  const [modoTaparOjos, setModoTaparOjos] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fraseAleatoria = FRASES_AMIGABLES[Math.floor(Math.random() * FRASES_AMIGABLES.length)]
    setFrase(fraseAleatoria)
  }, [])

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    // 1. Iniciar sesión en Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      setMensaje('Credenciales incorrectas o usuario no encontrado.')
      setCargando(false)
      return
    }

    // 2. Traer perfil completo incluyendo horarios
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('rol, hora_inicio, hora_fin')
      .eq('id', authData.user.id)
      .single()

    if (perfilError || !perfil) {
      setMensaje('Error al obtener los permisos del usuario.')
      await supabase.auth.signOut()
      setCargando(false)
      return
    }

    // 3. Libre albedrío para Admins y Super Admins
    if (perfil.rol === 'admin' || perfil.rol === 'super_admin') {
      window.location.href = '/'
      return
    }

    // 4. Bloqueo estricto para Empleados fuera de horario
    if (perfil.rol === 'empleado') {
      const inicio = perfil.hora_inicio || '08:00'
      const fin = perfil.hora_fin || '17:00'

      const ahora = new Date()
      const horas = String(ahora.getHours()).padStart(2, '0')
      const minutos = String(ahora.getMinutes()).padStart(2, '0')
      const horaActualStr = `${horas}:${minutos}`

      let dentroDeHorario = false
      if (inicio <= fin) {
        dentroDeHorario = horaActualStr >= inicio && horaActualStr <= fin
      } else {
        dentroDeHorario = horaActualStr >= inicio || horaActualStr <= fin
      }

      if (!dentroDeHorario) {
        setMensaje(`⏰ Acceso denegado. Tu turno es de ${inicio} a ${fin} hs. Son las ${horaActualStr} hs.`)
        await supabase.auth.signOut()
        setCargando(false)
        return
      }
    }

    // 5. Si todo está correcto, ingresa limpiamente
    window.location.href = '/'
  }

  return (
    <main className="min-h-screen bg-amber-50/60 flex items-center justify-center p-4 selection:bg-orange-200">
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-orange-950/5 overflow-hidden w-full max-w-md border border-orange-100 transition-all">
        
        {/* CABECERA CÁLIDA CON ILUSTRACIÓN SVG ANIMADA */}
        <div className="relative pt-8 pb-4 px-6 bg-gradient-to-b from-orange-100/70 via-amber-50/40 to-white text-center flex flex-col items-center">
          
          {/* MASCOTA KIOSKITO VECTORIAL (SVG) */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
              {/* Toldo */}
              <path d="M40 80 Q100 60 160 80 L170 100 Q100 90 30 100 Z" fill="#F97316" />
              <path d="M40 80 Q70 70 100 80 L100 100 Q70 90 30 100 Z" fill="#FB923C" />
              <path d="M130 80 Q145 75 160 80 L170 100 Q150 95 130 100 Z" fill="#FB923C" />

              {/* Cuerpo / Estructura del Kiosko */}
              <rect x="45" y="95" width="110" height="80" rx="16" fill="#FDBA74" />
              <rect x="52" y="102" width="96" height="66" rx="12" fill="#FFF7ED" />

              {/* Ventanita / Cara del Kiosko */}
              <circle cx="75" cy="125" r="7" fill="#451A03" />
              <circle cx="125" cy="125" r="7" fill="#451A03" />
              
              {/* Ojos tapados si está escribiendo la contraseña */}
              {modoTaparOjos ? (
                <>
                  <path d="M68 125 Q75 120 82 125" stroke="#451A03" strokeWidth="3" strokeLinecap="round" fill="none" />
                  <path d="M118 125 Q125 120 132 125" stroke="#451A03" strokeWidth="3" strokeLinecap="round" fill="none" />
                  {/* Manitas tapando los ojos */}
                  <circle cx="75" cy="125" r="10" fill="#F97316" />
                  <circle cx="125" cy="125" r="10" fill="#F97316" />
                </>
              ) : (
                <>
                  {/* Brillo en ojos */}
                  <circle cx="77" cy="123" r="2" fill="#FFFFFF" />
                  <circle cx="127" cy="123" r="2" fill="#FFFFFF" />
                </>
              )}

              {/* Sonrisa y Mejillas */}
              <path d="M92 135 Q100 143 108 135" stroke="#451A03" strokeWidth="3" strokeLinecap="round" fill="none" />
              <circle cx="65" cy="133" r="4" fill="#FCA5A5" opacity="0.7" />
              <circle cx="135" cy="133" r="4" fill="#FCA5A5" opacity="0.7" />

              {/* Mostrador */}
              <rect x="40" y="150" width="120" height="12" rx="6" fill="#F97316" />
              
              {/* Vapores de café o estrellitas flotando */}
              <path d="M165 110 Q170 100 165 90" stroke="#F97316" strokeWidth="2" strokeLinecap="round" fill="none" className="animate-pulse" />
              <circle cx="35" cy="115" r="3" fill="#FBBF24" />
              <circle cx="168" cy="135" r="2" fill="#FBBF24" />
            </svg>
          </div>

          <span className="bg-orange-100 text-orange-800 text-[11px] font-bold tracking-wide px-3 py-1 rounded-full border border-orange-200/60 mb-1">
            ¡Hola de nuevo! 👋
          </span>
          <h1 className="text-2xl font-black text-amber-950 tracking-tight">Kiosko POS</h1>
          
          <p className="text-xs text-amber-800/80 font-medium max-w-[260px] mt-1 min-h-[32px] flex items-center justify-center">
            {frase || 'Cargando...'}
          </p>
        </div>

        {/* FORMULARIO */}
        <div className="px-6 pb-8 pt-2">
          {mensaje && (
            <div className="p-3.5 mb-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold text-center flex items-center justify-center gap-2">
              <span>😊</span>
              <span>{mensaje}</span>
            </div>
          )}

          <form onSubmit={manejarLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-amber-900/80 mb-1.5 ml-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setModoTaparOjos(false)}
                  required
                  placeholder="hola@tukiosko.com"
                  className="w-full pl-10 pr-4 py-3.5 border border-amber-200/80 rounded-2xl bg-amber-50/30 text-sm text-amber-950 placeholder:text-amber-800/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                />
                <Mail size={18} className="absolute left-3.5 top-4 text-amber-700/40" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-900/80 mb-1.5 ml-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setModoTaparOjos(true)}
                  onBlur={() => setModoTaparOjos(false)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3.5 border border-amber-200/80 rounded-2xl bg-amber-50/30 text-sm text-amber-950 placeholder:text-amber-800/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
                />
                <Lock size={18} className="absolute left-3.5 top-4 text-amber-700/40" />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:from-gray-300 disabled:to-gray-300 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] mt-3"
            >
              {cargando ? 'Entrando al sistema...' : 'Ingresar a mi Kiosko'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-amber-100/60 flex items-center justify-center gap-1.5 text-amber-800/60 text-xs font-medium">
            <HeartHandshake size={15} className="text-orange-500" />
            <span>Que tengas una excelente jornada de ventas</span>
          </div>
        </div>

      </div>
    </main>
  )
}