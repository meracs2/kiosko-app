// app/promociones/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Tag, Edit2, Sparkles, AlertCircle } from 'lucide-react'

// Interfaces basadas en la base de datos
interface Promocion {
  id: string
  nombre: string
  descripcion: string
  precio: number
}

export default function PromocionesPage() {
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [modo, setModo] = useState<'lista' | 'nuevo'>('lista')
  const [kioskoId, setKioskoId] = useState<string | null>(null)
  
  // Campos del formulario
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')

  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const fetchPromociones = async (idKiosko: string) => {
    setCargando(true)
    const { data, error } = await supabase
      .from('promociones')
      .select('*')
      .eq('kiosko_id', idKiosko)
      .order('id', { ascending: false })
    
    if (error) {
      setMensaje('Error al cargar promociones: ' + error.message)
    } else if (data) {
      setPromociones(data)
    }
    setCargando(false)
  }

  // Cargar datos al inicio y resolver el kiosko_id del usuario logueado
  useEffect(() => {
    const inicializarKiosko = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('kiosko_id')
        .eq('id', session.user.id)
        .single()

      if (perfil?.kiosko_id) {
        setKioskoId(perfil.kiosko_id)
        fetchPromociones(perfil.kiosko_id)
      }
    }
    inicializarKiosko()
  }, [])

  // Guardar una nueva promoción incluyendo el kiosko_id
  const guardarPromocion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kioskoId) return

    setCargando(true)
    setMensaje('')

    const { error } = await supabase.from('promociones').insert([
      {
        kiosko_id: kioskoId,
        nombre,
        descripcion,
        precio: parseFloat(precio) || 0,
      },
    ])

    setCargando(false)
    if (error) {
      setMensaje('Error al guardar: ' + error.message)
    } else {
      setMensaje('¡Promoción cargada con éxito!')
      limpiarFormulario()
      setModo('lista')
      fetchPromociones(kioskoId)
    }
  }

  // FUNCIÓN PARA EDITAR EL PRECIO DE LA PROMOCIÓN DIRECTAMENTE
  const editarPrecioPromo = async (promo: Promocion) => {
    if (!kioskoId) return

    const nuevoPrecioStr = prompt(`Actualizar precio para "${promo.nombre}" (Actual: $${promo.precio}):`, promo.precio.toString())
    if (nuevoPrecioStr === null) return
    
    const nuevoPrecio = parseFloat(nuevoPrecioStr)
    if (isNaN(nuevoPrecio)) {
      alert('El precio ingresado no es válido.')
      return
    }

    const { error } = await supabase
      .from('promociones')
      .update({ precio: nuevoPrecio })
      .eq('id', promo.id)
      .eq('kiosko_id', kioskoId)

    if (error) {
      alert('Error al actualizar la promoción: ' + error.message)
    } else {
      fetchPromociones(kioskoId)
    }
  }

  const limpiarFormulario = () => {
    setNombre('')
    setDescripcion('')
    setPrecio('')
  }

  const eliminarPromocion = async (id: string) => {
    if (!kioskoId) return
    if (!confirm('¿Seguro de que querés eliminar esta promoción?')) return
    
    const { error } = await supabase
      .from('promociones')
      .delete()
      .eq('id', id)
      .eq('kiosko_id', kioskoId)

    if (error) {
      setMensaje('Error al eliminar: ' + error.message)
    } else {
      setMensaje('¡Promoción eliminada con éxito!')
      fetchPromociones(kioskoId)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8 max-w-7xl mx-auto pb-16 font-sans antialiased text-slate-800">
      
      {/* HEADER GENERAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl shadow-xs border border-slate-100">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 border border-slate-200"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Sparkles className="text-blue-600" size={26} /> Promociones
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Combos y ofertas vigentes para tus clientes</p>
          </div>
        </div>

        {modo === 'lista' && (
          <button
            onClick={() => { setModo('nuevo'); limpiarFormulario(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs shrink-0"
          >
            <Plus size={18} /> Nueva Promo
          </button>
        )}
      </div>

      {mensaje && (
        <div
          className={`p-4 mb-6 rounded-xl text-sm font-medium flex items-center gap-2.5 border shadow-xs ${
            mensaje.includes('Error') 
              ? 'bg-red-50 text-red-700 border-red-100' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}
        >
          <AlertCircle size={18} className="shrink-0" />
          {mensaje}
        </div>
      )}

      {/* MODO 1: LISTA DE PROMOCIONES (GRILLA ADAPTABLE) */}
      {modo === 'lista' && (
        <div>
          {cargando ? (
            <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-100 text-center">
              <p className="text-sm text-slate-400 font-semibold animate-pulse">Cargando promociones...</p>
            </div>
          ) : promociones.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-100 text-center">
              <Sparkles className="mx-auto text-slate-300 mb-2" size={42} />
              <p className="text-sm font-medium text-slate-700">No hay promociones cargadas todavía.</p>
              <p className="text-xs text-slate-400 mt-0.5">Creá tu primer combo para empezar a ofrecerlo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {promociones.map((promo) => (
                <div key={promo.id} className="bg-white rounded-2xl shadow-xs p-5 border border-slate-100 flex flex-col justify-between transition-all hover:shadow-md">
                  <div>
                    <div className="flex justify-between items-start mb-2.5 pb-2.5 border-b border-slate-100 gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-snug">{promo.nombre}</h3>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{promo.descripcion || 'Sin descripción detallada.'}</p>
                      </div>
                      <button
                        onClick={() => eliminarPromocion(promo.id)}
                        className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                        title="Eliminar promoción"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                      <Tag size={15} className="text-blue-600" />
                      <span className="font-extrabold text-slate-900 text-sm">${promo.precio.toLocaleString()}</span>
                    </div>

                    <button
                      onClick={() => editarPrecioPromo(promo)}
                      className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200/60 shadow-xs"
                      title="Editar precio"
                    >
                      <Edit2 size={13} /> Editar Precio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODO 2: CARGAR NUEVA PROMOCIÓN */}
      {modo === 'nuevo' && (
        <div className="bg-white rounded-2xl shadow-xs p-6 md:p-8 max-w-xl mx-auto border border-slate-100">
          <h2 className="font-bold text-slate-900 mb-5 border-b border-slate-100 pb-3 text-base flex items-center gap-2">
            <Sparkles size={18} className="text-blue-600" /> Cargar Promoción Nueva
          </h2>
          
          <form onSubmit={guardarPromocion} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Nombre (Ej: Combo Fernet)</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Promo Fernet con Coca, Combo Burger Completa"
                required
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Descripción (Ej: 1 Fernet + 2 Coca 1.5L)</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: 1 botella Fernet 750ml + 2 Coca Cola 1.5L"
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Precio del Combo ($)</label>
              <input
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ej: 15000.00"
                required
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 text-sm"
              >
                <Plus size={18} />
                {cargando ? 'Guardando...' : 'Guardar Promoción'}
              </button>
              <button
                type="button"
                onClick={() => setModo('lista')}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  )
}