// app/login/page.tsx
'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Store } from 'lucide-react'

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
      setMensaje('Error: Credenciales incorrectas o usuario no encontrado.')
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
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-2xl mb-2">
            <Store size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Kiosko POS</h1>
          <p className="text-xs text-gray-500">Ingresá con tu cuenta para comenzar</p>
        </div>

        {mensaje && (
          <div className="p-3 mb-4 rounded-lg bg-red-100 text-red-700 text-xs font-medium text-center">
            {mensaje}
          </div>
        )}

        <form onSubmit={manejarLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Correo Electrónico</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tucorreo@email.com"
                className="w-full pl-9 pr-3 py-2.5 border rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 border rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-bold text-sm shadow-sm transition active:scale-95 mt-2"
          >
            {cargando ? 'Iniciando sesión...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
    </main>
  )
}