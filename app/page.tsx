'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, PackageSearch, ShoppingBag, DollarSign, Store, ArrowRight, LogOut, Users, TrendingUp } from 'lucide-react'

export default function Home() {
  const [rol, setRol] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const verificarSesionYRol = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.replace('/login')
          return
        }

        const { data: perfil, error } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', session.user.id)
          .single()

        if (error || !perfil) {
          setRol('empleado')
        } else {
          setRol(perfil.rol)
        }
      } catch (err) {
        console.error('Error al verificar sesión:', err)
        setRol('empleado')
      } finally {
        setCargando(false)
      }
    }

    verificarSesionYRol()
  }, [router])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Cargando sistema...</p>
      </main>
    )
  }

  // Permisos según el rol
  const esSuperAdminOrAdmin = rol === 'super_admin' || rol === 'admin'
  const puedeVerCaja = rol === 'super_admin' || rol === 'admin' || rol === 'empleado'

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 max-w-xl mx-auto flex flex-col justify-center">
      {/* Header & Branding */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 text-center relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <button
            onClick={cerrarSesion}
            title="Cerrar Sesión"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 text-white p-4 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 transition-transform hover:scale-105">
          <Store size={32} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Kiosko POS</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Gestión inteligente de ventas y stock</p>

        {/* Badge de rol y estado */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200/60">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Operativo
          </div>
          <div className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            Rol: {rol || 'Cargando...'}
          </div>
        </div>
      </div>

      {/* Grilla Principal */}
      <div className="grid grid-cols-2 gap-4">
        {/* Punto de Venta */}
        <Link
          href="/ventas"
          className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-md shadow-emerald-500/20 flex flex-col justify-between h-44 active:scale-95 transition-all hover:shadow-lg hover:shadow-emerald-500/30 overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
              <ShoppingBag size={26} />
            </div>
            <ArrowRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <h2 className="font-bold text-xl leading-tight">Punto de Venta</h2>
            <p className="text-xs text-emerald-100 font-medium mt-1">Cobrar e imprimir ticket</p>
          </div>
        </Link>

        {/* Inventario */}
        {esSuperAdminOrAdmin && (
          <Link
            href="/inventario"
            className="group relative bg-white border border-slate-200/80 text-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-44 active:scale-95 transition-all hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl group-hover:bg-slate-800 group-hover:text-white transition-colors">
                <PackageSearch size={26} />
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <h2 className="font-bold text-xl leading-tight text-slate-900">Inventario</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Control de stock y reingreso</p>
            </div>
          </Link>
        )}

        {/* Promociones */}
        {esSuperAdminOrAdmin && (
          <Link
            href="/promociones"
            className="group relative bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-5 rounded-3xl shadow-md shadow-purple-500/20 flex flex-col justify-between h-44 active:scale-95 transition-all hover:shadow-lg hover:shadow-purple-500/30 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
                <Sparkles size={26} />
              </div>
              <ArrowRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <h2 className="font-bold text-xl leading-tight">Promos</h2>
              <p className="text-xs text-purple-100 font-medium mt-1">Combos Fernet, Burgers y +</p>
            </div>
          </Link>
        )}

        {/* Caja del Día */}
        {puedeVerCaja && (
          <Link
            href="/caja"
            className="group relative bg-white border border-slate-200/80 text-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-44 active:scale-95 transition-all hover:border-slate-300 hover:shadow-md"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <DollarSign size={26} />
              </div>
              <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <h2 className="font-bold text-xl leading-tight text-slate-900">Caja del Día</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Totales, arqueo y cierres</p>
            </div>
          </Link>
        )}

        {/* Personal / Usuarios (Solo Admin / Super Admin) */}
        {esSuperAdminOrAdmin && (
          <Link
            href="/usuarios"
            className="group relative bg-gradient-to-br from-blue-600 to-cyan-600 text-white p-5 rounded-3xl shadow-md shadow-blue-500/20 flex flex-col justify-between h-44 active:scale-95 transition-all hover:shadow-lg hover:shadow-blue-500/30 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
                <Users size={26} />
              </div>
              <ArrowRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <h2 className="font-bold text-xl leading-tight">Personal</h2>
              <p className="text-xs text-blue-100 font-medium mt-1">Crear usuarios y turnos</p>
            </div>
          </Link>
        )}

        {/* Métricas & Popularidad (Solo Admin / Super Admin) */}
        {esSuperAdminOrAdmin && (
          <Link
            href="/metricas"
            className="group relative bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 rounded-3xl shadow-md shadow-amber-500/20 flex flex-col justify-between h-44 active:scale-95 transition-all hover:shadow-lg hover:shadow-amber-500/30 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
                <TrendingUp size={26} />
              </div>
              <ArrowRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
            <div>
              <h2 className="font-bold text-xl leading-tight">Métricas</h2>
              <p className="text-xs text-amber-100 font-medium mt-1">Más vendidos y rotación</p>
            </div>
          </Link>
        )}
      </div>
    </main>
  )
}