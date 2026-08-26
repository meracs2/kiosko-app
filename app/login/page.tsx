'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Store, ArrowRight, ShieldCheck } from 'lucide-react'

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
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden w-full max-w-md border border-slate-100 transition-all">
        
        {/* HERO HEADER CON ILUSTRACIÓN DE UNSPASH */}
        <div className="relative h-44 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex flex-col justify-end text-white overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1556742049-0a67daf4005a?auto=format&fit=crop&q=80&w=800" 
            alt="Punto de Venta Kiosko"
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
          />
          <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md p-2 rounded-2xl border border-white/20">
            <Store size={24} className="text-white" />
          </div>

          <div className="relative z-10">
            <span className="bg-blue-500/40 text-blue-100 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-300/30">
              Gestión Comercial
            </span>
            <h1 className="text-2xl font-black tracking-tight mt-1 leading-none">Kiosko POS</h1>
            <p className="text-xs text-blue-100/90 font-medium mt-1">Iniciá sesión para administrar tu comercio</p>
          </div>
        </div>

        {/* CUERPO DEL FORMULARIO */}
        <div className="p-6 md:p-8">
          {mensaje && (
            <div className="p-3.5 mb-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-center flex items-center justify-center gap-2">
              <span>⚠️</span>
              <span>{mensaje}</span>
            </div>
          )}

          <form onSubmit={manejarLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="ejemplo@kiosko.com"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                <Lock size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
            >
              {cargando ? (
                'Iniciando sesión...'
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* PIE DE PÁGINA / SEGURIDAD */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-slate-400 text-xs">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Acceso seguro mediante Supabase Auth</span>
          </div>
        </div>

      </div>
    </main>
  )
}