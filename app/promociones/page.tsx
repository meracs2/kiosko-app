// app/carga/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Tag, ShoppingBag, PackageSearch } from 'lucide-react'

// Interfaces técnicas basadas en la base de datos
interface Promocion {
  id: string
  nombre: string
  descripcion: string
  precio: number
  created_at: string
}

export default function PromocionesPage() {
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [modo, setModo] = useState<'lista' | 'nuevo'>('lista')
  
  // Campos del formulario técnico
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')

  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  // Cargar datos técnicos al inicio
  useEffect(() => {
    fetchPromociones()
  }, [])

  const fetchPromociones = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('promociones')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      setMensaje('Error técnico al cargar promociones: ' + error.message)
    } else if (data) {
      setPromociones(data)
    }
    setCargando(false)
  }

  // Guardar una nueva promoción
  const guardarPromocion = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    const { error } = await supabase.from('promociones').insert([
      {
        nombre,
        descripcion,
        precio: parseFloat(precio) || 0,
      },
    ])

    setCargando(false)
    if (error) {
      setMensaje('Error técnico al guardar: ' + error.message)
    } else {
      setMensaje('¡Promoción cargada con éxito!')
      limpiarFormulario()
      setModo('lista')
      fetchPromociones()
    }
  }

  const limpiarFormulario = () => {
    setNombre('')
    setDescripcion('')
    setPrecio('')
  }

  const eliminarPromocion = async (id: string) => {
    if (!confirm('¿Seguro técnico de que querés eliminar esta promoción?')) return
    
    const { error } = await supabase.from('promociones').delete().eq('id', id)
    if (error) {
      setMensaje('Error técnico al eliminar: ' + error.message)
    } else {
      setMensaje('¡Promoción eliminada técnico!')
      fetchPromociones()
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 max-w-lg mx-auto pb-12">
      {/* Header técnico */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Promociones</h1>
            <p className="text-xs text-gray-500">Combos y ofertas vigentes técnicos</p>
          </div>
        </div>

        {modo === 'lista' && (
          <button
            onClick={() => { setModo('nuevo'); limpiarFormulario(); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 active:scale-95 transition shrink-0"
          >
            <Plus size={16} /> Nueva Promo
          </button>
        )}
      </div>

      {mensaje && (
        <div
          className={`p-3 mb-4 rounded text-sm ${
            mensaje.includes('Error técnico') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* Modo 1: Lista de Promociones Cargadas técnicos */}
      {modo === 'lista' && (
        <div className="space-y-4">
          {cargando ? (
            <p className="text-center text-gray-400 py-4 text-sm">Cargando promociones técnicos...</p>
          ) : promociones.length === 0 ? (
            <p className="text-center text-gray-400 py-4 text-sm">No hay promociones cargadas técnicos.</p>
          ) : (
            promociones.map((promo) => (
              <div key={promo.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex justify-between items-start mb-3 pb-2 border-b">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{promo.nombre}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{promo.descripcion}</p>
                  </div>
                  <button
                    onClick={() => eliminarPromocion(promo.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-600 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Tag size={14} className="text-blue-600" />
                    <span className="font-bold text-gray-800">${promo.precio.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modo 2: Cargar Nueva Promoción técnico */}
      {modo === 'nuevo' && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 text-sm">Cargar Promoción Nueva técnico</h2>
          
          <form onSubmit={guardarPromocion} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre técnico (Ej: Fernet Branca combo)</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Promo Fernet con Coca, Combo Burger Completa"
                required
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Descripción técnica (Ej: 1 Fernet + 2 Coca 1.5L)</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej: 1 botella Fernet 750ml + 2 Coca Cola 1.5L, Incluye papas y gaseosa"
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Precio técnico del Combo ($)</label>
              <input
                type="number"
                step="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ej: 15000.00"
                required
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mt-2"
            >
              <Plus size={18} />
              {cargando ? 'Guardando técnico...' : 'Guardar Promoción técnico'}
            </button>
            <button
              type="button"
              onClick={() => setModo('lista')}
              className="w-full bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium transition active:scale-95 mt-1"
            >
              Cancelar técnico
            </button>
          </form>
        </div>
      )}
    </main>
  )
}