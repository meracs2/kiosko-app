'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Store, Sparkles, HeartHandshake } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const router = useRouter()

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    // 1. Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      setMensaje('Credenciales incorrectas o usuario no encontrado.')
      setCargando(false)
      return
    }

    // 2. Consultar el rol del usuario en la tabla 'perfiles'
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', authData.user.id)
      .single()

    if (perfilError || !perfil) {
      setMensaje('Error al obtener los permisos del usuario.')
      setCargando(false)
      return
    }

    // 3. Redirigir al panel principal
    router.push('/')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-amber-50/60 flex items-center justify-center p-4 selection:bg-orange-200">
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-orange-950/5 overflow-hidden w-full max-w-md border border-orange-100 transition-all">
        
        {/* CABECERA CÁLIDA Y AMIGABLE */}
        <div className="relative pt-10 pb-8 px-6 bg-gradient-to-b from-orange-100/70 via-amber-50/40 to-white text-center flex flex-col items-center">
          
          {/* ÍCONO / LOGO EN CIRCULO FLOTANTE CÁLIDO */}
          <div className="relative mb-3">
            <div className="w-20 h-20 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-3xl rotate-3 flex items-center justify-center shadow-lg shadow-orange-500/25 transition-transform hover:rotate-0">
              <Store size={38} className="text-white -rotate-3 hover:rotate-0 transition-transform" />
            </div>
            <div className="absolute -top-1 -right-1 bg-amber-300 text-orange-900 p-1.5 rounded-full shadow-sm">
              <Sparkles size={14} />
            </div>
          </div>

          <span className="bg-orange-100 text-orange-800 text-[11px] font-bold tracking-wide px-3 py-1 rounded-full border border-orange-200/60 mb-1">
            ¡Hola de nuevo! 👋
          </span>
          <h1 className="text-2xl font-black text-amber-950 tracking-tight">Kiosko POS</h1>
          <p className="text-xs text-amber-800/80 font-medium max-w-[220px] mt-0.5">
            Ingresá los datos de tu negocio para empezar el día
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

          {/* MENSAJE AMISTOSO AL PIE */}
          <div className="mt-6 pt-4 border-t border-amber-100/60 flex items-center justify-center gap-1.5 text-amber-800/60 text-xs font-medium">
            <HeartHandshake size={15} className="text-orange-500" />
            <span>Que tengas una excelente jornada de ventas</span>
          </div>
        </div>

      </div>
    </main>
  )
}