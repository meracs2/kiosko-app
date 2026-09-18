// app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Sun,
  Moon,
  Sparkles, 
  PackageSearch, 
  ShoppingBag, 
  DollarSign, 
  Store, 
  ArrowRight, 
  LogOut, 
  Users, 
  TrendingUp, 
  BookUser, 
  Truck, 
  X, 
  ShoppingCart, 
  ExternalLink,
  Globe,
  LayoutGrid,
  ListOrdered
} from 'lucide-react'

export default function Home() {
  const [rol, setRol] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [esOscuro, setEsOscuro] = useState(false)
  const [estiloVisual, setEstiloVisual] = useState<'colorido' | 'minimalista'>('colorido')
  
  // Estado para modal de supermercados (el de proveedores ya no usa modal)
  const [mostrarModalSupermercados, setMostrarModalSupermercados] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setEsOscuro(localStorage.getItem('theme') === 'dark')

      const estiloGuardado = localStorage.getItem('ui_style') as 'colorido' | 'minimalista' | null
      if (estiloGuardado === 'colorido' || estiloGuardado === 'minimalista') {
        setEstiloVisual(estiloGuardado)
      }
    }, 0)

    // 3. Verificación de Sesión y Turno
    const verificarSesionYRol = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.replace('/login')
          return
        }

        const { data: perfil, error } = await supabase
          .from('perfiles')
          .select('rol, hora_inicio, hora_fin')
          .eq('id', session.user.id)
          .single()

        if (error || !perfil) {
          setRol('empleado')
          setCargando(false)
          return
        }

        if (perfil.rol === 'empleado') {
          const inicio = perfil.hora_inicio || '08:00'
          const fin = perfil.hora_fin || '17:00'
          const ahora = new Date()
          const horaActualStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`

          const dentroDeHorario = inicio <= fin ? (horaActualStr >= inicio && horaActualStr <= fin) : (horaActualStr >= inicio || horaActualStr <= fin)

          if (!dentroDeHorario) {
            alert(`⏰ Fuera de turno. Tu horario es de ${inicio} a ${fin} hs.`)
            await supabase.auth.signOut()
            router.replace('/login')
            return
          }
        }

        setRol(perfil.rol)
      } catch {
        setRol('empleado')
      } finally {
        setCargando(false)
      }
    }

    verificarSesionYRol()
    return () => window.clearTimeout(timeoutId)
  }, [router])

  const cambiarTema = () => {
    const nuevoEstado = !esOscuro
    setEsOscuro(nuevoEstado)
    localStorage.setItem('theme', nuevoEstado ? 'dark' : 'light')
  }

  const cambiarEstilo = () => {
    const nuevoEstilo = estiloVisual === 'minimalista' ? 'colorido' : 'minimalista'
    setEstiloVisual(nuevoEstilo)
    localStorage.setItem('ui_style', nuevoEstilo)
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (cargando) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${esOscuro ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <p className="text-sm font-medium animate-pulse">Cargando sistema...</p>
      </main>
    )
  }

  const esSuperAdminOrAdmin = rol === 'super_admin' || rol === 'admin'
  const puedeVerCaja = rol === 'super_admin' || rol === 'admin' || rol === 'empleado'

  // Variables de estilo dinámicas según modo claro/oscuro
  const bgMain = esOscuro ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
  const bgHeader = esOscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
  const bgCard = esOscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
  const textMuted = esOscuro ? 'text-slate-400' : 'text-slate-500'
  const bgIcon = esOscuro ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800'
  const badgeBg = esOscuro ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-200 ${bgMain}`}>
      
      {/* HEADER */}
      <header className={`border-b px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs ${bgHeader}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl flex items-center justify-center shadow-xs ${esOscuro ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}>
            <Store size={22} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Kiosko POS</h1>
            <p className={`text-[11px] font-medium ${textMuted}`}>Gestión inteligente</p>
          </div>
        </div>

        {/* CONTROLES DERECHA */}
        <div className="flex items-center gap-2.5">
          <div className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs border ${badgeBg}`}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[10px]">Rol: {rol || '...'}</span>
          </div>

          {/* BOTÓN CAMBIO DE ESTILO */}
          <button
            onClick={cambiarEstilo}
            title={estiloVisual === 'minimalista' ? "Cambiar a Estilo Colorido" : "Cambiar a Estilo Minimalista"}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition text-xs font-semibold cursor-pointer ${esOscuro ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
          >
            {estiloVisual === 'minimalista' ? <LayoutGrid size={15} className="text-blue-400" /> : <ListOrdered size={15} className="text-purple-400" />}
            <span className="hidden md:inline capitalize">{estiloVisual}</span>
          </button>

          {/* BOTÓN TEMA (Claro / Oscuro) */}
          <button
            onClick={cambiarTema}
            title={esOscuro ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            className={`p-2.5 border rounded-xl transition cursor-pointer flex items-center justify-center ${esOscuro ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
          >
            {esOscuro ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600" />}
          </button>

          {/* BOTÓN SALIR */}
          <button
            onClick={cerrarSesion}
            title="Cerrar Sesión"
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition text-xs font-semibold cursor-pointer ${esOscuro ? 'bg-slate-800 border-slate-700 hover:bg-red-950/40 hover:text-red-400 text-slate-200' : 'bg-slate-100 border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-700'}`}
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-10 flex flex-col">
        
        {/* ----------------- ESTILO MINIMALISTA ----------------- */}
        {estiloVisual === 'minimalista' && (
          <div className="flex flex-col lg:flex-row gap-8 items-start flex-1">
            
            <aside className={`w-full lg:w-72 rounded-2xl border p-4 shadow-xs shrink-0 ${bgCard}`}>
              <div className="mb-3 px-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Navegación</h2>
              </div>
              <nav className="space-y-1">
                <Link href="/ventas" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag size={16} className="text-slate-400" />
                    <span>Punto de Venta</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-400" />
                </Link>

                {esSuperAdminOrAdmin && (
                  <Link href="/inventario" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <PackageSearch size={16} className="text-slate-400" />
                      <span>Inventario</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                )}

                {puedeVerCaja && (
                  <Link href="/cuentas-corrientes" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <BookUser size={16} className="text-slate-400" />
                      <span>Cuentas Corrientes</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                )}

                {esSuperAdminOrAdmin && (
                  <Link href="/promociones" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <Sparkles size={16} className="text-slate-400" />
                      <span>Promos</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                )}

                {puedeVerCaja && (
                  <Link href="/caja" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <DollarSign size={16} className="text-slate-400" />
                      <span>Caja del Día</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                )}

                {esSuperAdminOrAdmin && (
                  <Link href="/usuarios" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <Users size={16} className="text-slate-400" />
                      <span>Personal</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                )}

                {esSuperAdminOrAdmin && (
                  <Link href="/metricas" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <TrendingUp size={16} className="text-slate-400" />
                      <span>Métricas</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                )}

                <div onClick={() => setMostrarModalSupermercados(true)} className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                  <div className="flex items-center gap-2.5">
                    <ShoppingCart size={16} className="text-slate-400" />
                    <span>Supermercados CBA</span>
                  </div>
                  <ArrowRight size={14} className="text-slate-400" />
                </div>

                {esSuperAdminOrAdmin && (
                  <Link href="/proveedores" className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${esOscuro ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}>
                    <div className="flex items-center gap-2.5">
                      <Truck size={16} className="text-slate-400" />
                      <span>Proveedores</span>
                    </div>
                    <ArrowRight size={14} className="text-slate-400" />
                  </Link>
                )}
              </nav>
            </aside>

            <div className={`flex-1 w-full flex flex-col justify-center items-center p-10 rounded-2xl border border-dashed text-center min-h-[400px] shadow-xs ${bgCard}`} style={{ borderColor: esOscuro ? '#334155' : '#cbd5e1' }}>
              <div className={`p-4 rounded-2xl mb-4 ${bgIcon}`}>
                <Store size={32} />
              </div>
              <h2 className="text-lg font-bold tracking-tight mb-1">Bienvenido al Kiosko POS</h2>
              <p className={`text-xs max-w-sm ${textMuted}`}>
                Seleccioná una opción del menú lateral izquierdo para operar con el sistema de ventas e inventario.
              </p>
            </div>

          </div>
        )}

        {/* ----------------- ESTILO COLORIDO ----------------- */}
        {estiloVisual === 'colorido' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold tracking-tight">Panel de Control</h2>
              <p className={`text-xs mt-0.5 ${textMuted}`}>Seleccioná un módulo para comenzar a operar.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              <Link href="/ventas" className="group bg-emerald-400 hover:brightness-105 p-5 rounded-2xl border-2 border-emerald-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-white/70 rounded-xl"><ShoppingBag size={20} className="text-slate-900" /></div>
                  <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                </div>
                <div><h3 className="font-black text-base text-slate-900">Punto de Venta</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Cobrar e imprimir ticket rápido</p></div>
              </Link>

              {esSuperAdminOrAdmin && (
                <Link href="/inventario" className="group bg-amber-400 hover:brightness-105 p-5 rounded-2xl border-2 border-amber-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/70 rounded-xl"><PackageSearch size={20} className="text-slate-900" /></div>
                    <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div><h3 className="font-black text-base text-slate-900">Inventario</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Control de stock y mercadería</p></div>
                </Link>
              )}

              {puedeVerCaja && (
                <Link href="/cuentas-corrientes" className="group bg-indigo-400 hover:brightness-105 p-5 rounded-2xl border-2 border-indigo-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/70 rounded-xl"><BookUser size={20} className="text-slate-900" /></div>
                    <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div><h3 className="font-black text-base text-slate-900">Cuentas Corrientes</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Fiados, deudores y pagos</p></div>
                </Link>
              )}

              {esSuperAdminOrAdmin && (
                <Link href="/promociones" className="group bg-purple-400 hover:brightness-105 p-5 rounded-2xl border-2 border-purple-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/70 rounded-xl"><Sparkles size={20} className="text-slate-900" /></div>
                    <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div><h3 className="font-black text-base text-slate-900">Promos</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Combos y ofertas especiales</p></div>
                </Link>
              )}

              {puedeVerCaja && (
                <Link href="/caja" className="group bg-teal-400 hover:brightness-105 p-5 rounded-2xl border-2 border-teal-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/70 rounded-xl"><DollarSign size={20} className="text-slate-900" /></div>
                    <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div><h3 className="font-black text-base text-slate-900">Caja del Día</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Totales y arqueos de caja</p></div>
                </Link>
              )}

              {esSuperAdminOrAdmin && (
                <Link href="/usuarios" className="group bg-sky-400 hover:brightness-105 p-5 rounded-2xl border-2 border-sky-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/70 rounded-xl"><Users size={20} className="text-slate-900" /></div>
                    <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div><h3 className="font-black text-base text-slate-900">Personal</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Usuarios y control de turnos</p></div>
                </Link>
              )}

              {esSuperAdminOrAdmin && (
                <Link href="/metricas" className="group bg-orange-400 hover:brightness-105 p-5 rounded-2xl border-2 border-orange-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/70 rounded-xl"><TrendingUp size={20} className="text-slate-900" /></div>
                    <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div><h3 className="font-black text-base text-slate-900">Métricas</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Más vendidos y rotación</p></div>
                </Link>
              )}

              <div onClick={() => setMostrarModalSupermercados(true)} className="group bg-pink-400 hover:brightness-105 p-5 rounded-2xl border-2 border-pink-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900 cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="p-2.5 bg-white/70 rounded-xl"><ShoppingCart size={20} className="text-slate-900" /></div>
                  <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                </div>
                <div><h3 className="font-black text-base text-slate-900">Supermercados CBA</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Precios de referencia locales</p></div>
              </div>

              {esSuperAdminOrAdmin && (
                <Link href="/proveedores" className="group bg-cyan-400 hover:brightness-105 p-5 rounded-2xl border-2 border-cyan-600 transition-all shadow-md flex flex-col justify-between h-40 text-slate-900">
                  <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/70 rounded-xl"><Truck size={20} className="text-slate-900" /></div>
                    <ArrowRight size={16} className="text-slate-900 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div><h3 className="font-black text-base text-slate-900">Proveedores</h3><p className="text-xs font-semibold text-slate-900 opacity-80 mt-0.5">Facturas y costos de compra</p></div>
                </Link>
              )}

            </div>
          </div>
        )}

      </main>

      {/* MODAL SUPERMERCADOS CBA */}
      {mostrarModalSupermercados && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl p-6 relative shadow-xl border max-h-[90vh] overflow-y-auto ${bgCard}`}>
            <div className={`flex justify-between items-center mb-4 pb-3 border-b ${esOscuro ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${bgIcon}`}><Globe size={18} /></div>
                <div>
                  <h3 className="font-bold text-sm">Supermercados Córdoba</h3>
                  <p className={`text-[11px] font-medium ${textMuted}`}>Comparativa rápida</p>
                </div>
              </div>
              <button onClick={() => setMostrarModalSupermercados(false)} className={`p-1.5 rounded-full transition-colors cursor-pointer ${esOscuro ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}><X size={16} /></button>
            </div>
            <p className={`text-xs mb-3 font-normal ${textMuted}`}>Seleccioná un comercio para abrir su plataforma:</p>
            <div className="space-y-2">
              {[
                { name: 'Maxi Carrefour / Carrefour', url: 'https://www.carrefour.com.ar' },
                { name: 'Vea Cencosud', url: 'https://www.vea.com.ar' },
                { name: 'ChangoMâs', url: 'https://www.changomas.com.ar' },
                { name: 'Dinosaurio / Dino Online', url: 'https://www.dinoonline.com.ar' },
                { name: 'Mariano Max', url: 'https://www.marianomax.com.ar' },
                { name: 'La Anónima', url: 'https://www.laanonima.com.ar' },
                { name: 'Supermercados Cordiez', url: 'https://www.supermercadoscordiez.com.ar' },
              ].map((supermercado, idx) => (
                <a key={idx} href={supermercado.url} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-between p-3 border rounded-xl text-xs font-semibold transition-all cursor-pointer group ${esOscuro ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`}>
                  <span>{supermercado.name}</span>
                  <ExternalLink size={14} className="text-slate-400 group-hover:text-slate-200 transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}