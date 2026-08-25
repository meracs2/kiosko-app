// app/inventario/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Scanner from '@/components/Scanner'
import Link from 'next/link'
import { Camera, Plus, Trash2, ArrowLeft, Search, PackagePlus } from 'lucide-react'

interface Producto {
  id: string
  codigo_barras: string
  nombre: string
  precio: number
  stock_actual: number
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [modo, setModo] = useState<'nuevo' | 'restock'>('nuevo')
  
  // Campos del formulario
  const [nombre, setNombre] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  
  const [busquedaStock, setBusquedaStock] = useState('')
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const fetchProductos = async () => {
    const { data } = await supabase.from('productos').select('*').order('id', { ascending: false })
    if (data) setProductos(data)
  }

  useEffect(() => {
    fetchProductos()
  }, [])

  // 1. Crear producto desde cero
  const guardarProductoNuevo = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    const existente = productos.find((p) => p.codigo_barras === codigoBarras)
    if (existente) {
      setMensaje('Error: Ese código de barras ya pertenece a ' + existente.nombre)
      setCargando(false)
      return
    }

    const { error } = await supabase.from('productos').insert([
      {
        nombre,
        codigo_barras: codigoBarras,
        precio: parseFloat(precio),
        stock_actual: parseInt(stock),
      },
    ])

    setCargando(false)
    if (error) {
      setMensaje('Error al guardar: ' + error.message)
    } else {
      setMensaje('¡Producto nuevo guardado con éxito!')
      limpiarFormulario()
      fetchProductos()
    }
  }

  // 2. Solo reponer unidades a un producto existente
  const reponerStock = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    const productoTarget = productos.find((p) => p.codigo_barras === codigoBarras)
    if (!productoTarget) {
      setMensaje('Error: No se encontró ningún producto con ese código.')
      setCargando(false)
      return
    }

    const nuevoStock = productoTarget.stock_actual + parseInt(stock)
    const { error } = await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', productoTarget.id)

    setCargando(false)
    if (error) {
      setMensaje('Error al reponer stock: ' + error.message)
    } else {
      setMensaje(`¡Se sumaron ${stock} unidades a ${productoTarget.nombre}! Total: ${nuevoStock}`)
      limpiarFormulario()
      fetchProductos()
    }
  }

  const limpiarFormulario = () => {
    setNombre('')
    setCodigoBarras('')
    setPrecio('')
    setStock('')
  }

  const sumarUnidadesDirecto = async (prod: Producto) => {
    const ingreso = prompt(`¿Cuántas unidades ingresaron para "${prod.nombre}"?`, '10')
    if (!ingreso || isNaN(Number(ingreso))) return

    const nuevoStock = prod.stock_actual + parseInt(ingreso)
    await supabase.from('productos').update({ stock_actual: nuevoStock }).eq('id', prod.id)
    fetchProductos()
  }

  const eliminarProducto = async (id: string) => {
    if (!confirm('¿Seguro que querés eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    fetchProductos()
  }

  const handleScan = (codigo: string) => {
    setCodigoBarras(codigo)
    setMostrarEscaner(false)

    if (modo === 'restock') {
      const prod = productos.find((p) => p.codigo_barras === codigo)
      if (prod) {
        setNombre(prod.nombre)
      } else {
        setMensaje('Código no encontrado en la base de datos.')
      }
    }
  }

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busquedaStock.toLowerCase()) ||
    p.codigo_barras.includes(busquedaStock)
  )

  return (
    <main className="min-h-screen bg-gray-100 p-4 max-w-lg mx-auto pb-12">
      {/* Header sin el botón de cobrar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Inventario</h1>
            <p className="text-xs text-gray-500">Gestión y control de mercadería</p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-3 mb-4 rounded text-sm ${
            mensaje.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* Selectores de Modo */}
      <div className="flex bg-gray-200 p-1 rounded-xl mb-4 text-xs font-bold">
        <button
          onClick={() => { setModo('nuevo'); limpiarFormulario(); setMensaje(''); }}
          className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
            modo === 'nuevo' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600'
          }`}
        >
          <Plus size={16} /> Crear Producto Nuevo
        </button>
        <button
          onClick={() => { setModo('restock'); limpiarFormulario(); setMensaje(''); }}
          className={`flex-1 py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
            modo === 'restock' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600'
          }`}
        >
          <PackagePlus size={16} /> Reponer Stock
        </button>
      </div>

      {/* Formulario 1: Crear Producto Nuevo */}
      {modo === 'nuevo' && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 text-sm">Cargar Producto Nuevo</h2>
          
          <form onSubmit={guardarProductoNuevo} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Código de Barras</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="Escaneá o tipeá el código"
                  required
                  className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setMostrarEscaner(!mostrarEscaner)}
                  className="bg-blue-600 text-white p-2.5 rounded-lg flex items-center justify-center shrink-0"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>

            {mostrarEscaner && (
              <div className="my-2">
                <Scanner onScan={handleScan} />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre del Producto</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Galletitas Pepsi 200g"
                required
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Precio ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Stock Inicial</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="10"
                  required
                  className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mt-2"
            >
              <Plus size={18} />
              {cargando ? 'Guardando...' : 'Guardar Producto Nuevo'}
            </button>
          </form>
        </div>
      )}

      {/* Formulario 2: Reponer Stock a Producto Existente */}
      {modo === 'restock' && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 text-sm">Ingreso / Reposición de Mercadería</h2>
          
          <form onSubmit={reponerStock} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Código de Barras del Producto</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => {
                    setCodigoBarras(e.target.value)
                    const prod = productos.find((p) => p.codigo_barras === e.target.value)
                    if (prod) setNombre(prod.nombre)
                  }}
                  placeholder="Escaneá o tipeá el código"
                  required
                  className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setMostrarEscaner(!mostrarEscaner)}
                  className="bg-emerald-600 text-white p-2.5 rounded-lg flex items-center justify-center shrink-0"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>

            {mostrarEscaner && (
              <div className="my-2">
                <Scanner onScan={handleScan} />
              </div>
            )}

            {nombre && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                Producto detectado: {nombre}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-500 mb-1">Cantidad que ingresa (unidades)</label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Ej: 12"
                required
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mt-2"
            >
              <PackagePlus size={18} />
              {cargando ? 'Sumando...' : 'Sumar al Stock Actual'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de Productos con Buscador */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 text-sm">Lista de Stock Actual</h2>

        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busquedaStock}
            onChange={(e) => setBusquedaStock(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        </div>

        {productosFiltrados.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">
            {busquedaStock ? 'No se encontraron productos.' : 'No hay productos cargados.'}
          </p>
        ) : (
          <div className="divide-y max-h-80 overflow-y-auto">
            {productosFiltrados.map((prod) => (
              <div key={prod.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{prod.nombre}</p>
                  <p className="text-xs text-gray-400">Cód: {prod.codigo_barras}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-bold">
                      Stock: {prod.stock_actual} un.
                    </span>
                    <button
                      onClick={() => sumarUnidadesDirecto(prod)}
                      className="text-xs text-emerald-600 font-bold hover:underline"
                    >
                      + Sumar rápidas
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600 text-sm">${prod.precio}</span>
                  <button
                    onClick={() => eliminarProducto(prod.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}