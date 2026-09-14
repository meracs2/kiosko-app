// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Sparkles, PackageSearch, ShoppingBag, DollarSign, Store, ArrowRight, LogOut, Users, TrendingUp, BookUser } from 'lucide-react'

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

        // 1. Pedimos el perfil completo con los horarios
        const { data: perfil, error } = await supabase
          .from('perfiles')
          .select('rol, hora_inicio, hora_fin')
          .eq('id', session.user.id)
          .single()

        if (error || !perfil) {
          console.error("Error al obtener perfil:", error)
          setRol('empleado')
          setCargando(false)
          return
        }

        // 2. Si es empleado, validamos el turno estrictamente
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

          // SI ESTÁ FUERA DE TURNO: Expulsión inmediata
          if (!dentroDeHorario) {
            alert(`⏰ Fuera de turno. Tu horario es de ${inicio} a ${fin} hs. Son las ${horaActualStr} hs.`)
            await supabase.auth.signOut()
            window.location.href = '/login'
            return
          }
        }

        setRol(perfil.rol)
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
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-base font-black text-black animate-pulse">Verificando turno y permisos...</p>
      </main>
    )
  }

  // Permisos según el rol
  const esSuperAdminOrAdmin = rol === 'super_admin' || rol === 'admin'
  const puedeVerCaja = rol === 'super_admin' || rol === 'admin' || rol === 'empleado'

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-black">
      {/* Header Estilo Escritorio (Ancho Completo) */}
      <header className="bg-white border-b-2 border-slate-300 px-8 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="bg-blue-600 text-black p-2.5 rounded-2xl shadow-md border-2 border-blue-900">
            <Store size={24} className="text-black" />
          </div>
          <div>
            <h1 className="text-xl font-black text-black tracking-tight">Kiosko POS</h1>
            <p className="text-xs text-black font-extrabold">Gestión inteligente de ventas y stock</p>
          </div>
        </div>

        {/* Badge de rol, estado y botón salir */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full border-2 border-slate-300 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-black font-black">Operativo</span>
            <span className="text-slate-400 font-bold">|</span>
            <span className="text-black font-black uppercase tracking-wider">Rol: {rol || 'Cargando...'}</span>
          </div>

          <button
            onClick={cerrarSesion}
            title="Cerrar Sesión"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-black hover:bg-red-200 hover:text-red-950 border-2 border-slate-300 rounded-xl transition text-xs font-black shadow-2xs"
          >
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      {/* Grilla Principal de Escritorio (Ocupa todo el ancho disponible) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-10 flex flex-col justify-center">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-black tracking-tight">Panel de Control</h2>
          <p className="text-black font-extrabold text-sm mt-0.5">Seleccioná una sección para comenzar a operar.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Punto de Venta */}
          <Link
            href="/ventas"
            className="group relative bg-emerald-400 hover:bg-emerald-500 text-black p-6 rounded-3xl shadow-md flex flex-col justify-between h-48 active:scale-95 transition-all border-2 border-emerald-700 overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/40 rounded-2xl border border-emerald-600">
                <ShoppingBag size={28} className="text-black" />
              </div>
              <ArrowRight size={20} className="text-black group-hover:translate-x-1.5 transition-transform" />
            </div>
            <div>
              <h2 className="font-black text-2xl leading-tight text-black">Punto de Venta</h2>
              <p className="text-xs text-black font-extrabold mt-1">Cobrar e imprimir ticket de forma rápida</p>
            </div>
          </Link>

          {/* Inventario */}
          {esSuperAdminOrAdmin && (
            <Link
              href="/inventario"
              className="group relative bg-amber-400 hover:bg-amber-500 text-black p-6 rounded-3xl shadow-md flex flex-col justify-between h-48 active:scale-95 transition-all border-2 border-amber-700 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white/40 rounded-2xl border border-amber-600">
                  <PackageSearch size={28} className="text-black" />
                </div>
                <ArrowRight size={20} className="text-black group-hover:translate-x-1.5 transition-transform" />
              </div>
              <div>
                <h2 className="font-black text-2xl leading-tight text-black">Inventario</h2>
                <p className="text-xs text-black font-extrabold mt-1">Control de stock y reingreso de mercadería</p>
              </div>
            </Link>
          )}

          {/* Cuentas Corrientes */}
          {puedeVerCaja && (
            <Link
              href="/cuentas-corrientes"
              className="group relative bg-indigo-400 hover:bg-indigo-500 text-black p-6 rounded-3xl shadow-md flex flex-col justify-between h-48 active:scale-95 transition-all border-2 border-indigo-700 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white/40 rounded-2xl border border-indigo-600">
                  <BookUser size={28} className="text-black" />
                </div>
                <ArrowRight size={20} className="text-black group-hover:translate-x-1.5 transition-transform" />
              </div>
              <div>
                <h2 className="font-black text-2xl leading-tight text-black">Cuentas Corrientes</h2>
                <p className="text-xs text-black font-extrabold mt-1">Fiados, deudores y pagos detallados</p>
              </div>
            </Link>
          )}

          {/* Promociones */}
          {esSuperAdminOrAdmin && (
            <Link
              href="/promociones"
              className="group relative bg-purple-400 hover:bg-purple-500 text-black p-6 rounded-3xl shadow-md flex flex-col justify-between h-48 active:scale-95 transition-all border-2 border-purple-700 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white/40 rounded-2xl border border-purple-600">
                  <Sparkles size={28} className="text-black" />
                </div>
                <ArrowRight size={20} className="text-black group-hover:translate-x-1.5 transition-transform" />
              </div>
              <div>
                <h2 className="font-black text-2xl leading-tight text-black">Promos</h2>
                <p className="text-xs text-black font-extrabold mt-1">Combos Fernet, Burgers y más ofertas</p>
              </div>
            </Link>
          )}

          {/* Caja del Día */}
          {puedeVerCaja && (
            <Link
              href="/caja"
              className="group relative bg-teal-400 hover:bg-teal-500 text-black p-6 rounded-3xl shadow-md flex flex-col justify-between h-48 active:scale-95 transition-all border-2 border-teal-700 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white/40 rounded-2xl border border-teal-600">
                  <DollarSign size={28} className="text-black" />
                </div>
                <ArrowRight size={20} className="text-black group-hover:translate-x-1.5 transition-transform" />
              </div>
              <div>
                <h2 className="font-black text-2xl leading-tight text-black">Caja del Día</h2>
                <p className="text-xs text-black font-extrabold mt-1">Totales, arqueos de caja y cierres</p>
              </div>
            </Link>
          )}

          {/* Personal / Usuarios */}
          {esSuperAdminOrAdmin && (
            <Link
              href="/usuarios"
              className="group relative bg-cyan-400 hover:bg-cyan-500 text-black p-6 rounded-3xl shadow-md flex flex-col justify-between h-48 active:scale-95 transition-all border-2 border-cyan-700 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white/40 rounded-2xl border border-cyan-600">
                  <Users size={28} className="text-black" />
                </div>
                <ArrowRight size={20} className="text-black group-hover:translate-x-1.5 transition-transform" />
              </div>
              <div>
                <h2 className="font-black text-2xl leading-tight text-black">Personal</h2>
                <p className="text-xs text-black font-extrabold mt-1">Creación de usuarios y control de turnos</p>
              </div>
            </Link>
          )}

          {/* Métricas */}
          {esSuperAdminOrAdmin && (
            <Link
              href="/metricas"
              className="group relative bg-orange-400 hover:bg-orange-500 text-black p-6 rounded-3xl shadow-md flex flex-col justify-between h-48 active:scale-95 transition-all border-2 border-orange-700 overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white/40 rounded-2xl border border-orange-600">
                  <TrendingUp size={28} className="text-black" />
                </div>
                <ArrowRight size={20} className="text-black group-hover:translate-x-1.5 transition-transform" />
              </div>
              <div>
                <h2 className="font-black text-2xl leading-tight text-black">Métricas</h2>
                <p className="text-xs text-black font-extrabold mt-1">Productos más vendidos y rotación de stock</p>
              </div>
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}