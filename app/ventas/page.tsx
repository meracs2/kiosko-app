// app/ventas/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Scanner from '@/components/Scanner'
import Link from 'next/link'
import { ArrowLeft, Camera, Plus, Minus, X, ShoppingBag, Banknote, CreditCard, QrCode } from 'lucide-react'

interface Producto {
  id: string
  codigo_barras: string
  nombre: string
  precio: number
  stock_actual: number
}

interface ItemCarrito extends Producto {
  cantidad: number
}

export default function VentasPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [codigoIngresado, setCodigoIngresado] = useState('')
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const fetchProductos = async () => {
      const { data } = await supabase.from('productos').select('*')
      if (data) setProductos(data)
    }
    fetchProductos()
  }, [])

  // Agregar producto al carrito
  const agregarAlCarrito = (producto: Producto) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.id === producto.id)
      if (existe) {
        return prev.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      }
      return [...prev, { ...producto, cantidad: 1 }]
    })
  }

  // Modificar cantidad (+)
  const incrementarCantidad = (id: string) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, cantidad: item.cantidad + 1 } : item
      )
    )
  }

  // Modificar cantidad (-)
  const decrementarCantidad = (id: string) => {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item
        )
        .filter((item) => item.cantidad > 0)
    )
  }

  // Eliminar renglón (X)
  const eliminarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id))
  }

  // Buscar por código tipeado o escaneado
  const buscarYAgregar = (codigo: string) => {
    const prod = productos.find((p) => p.codigo_barras === codigo)
    if (prod) {
      agregarAlCarrito(prod)
      setCodigoIngresado('')
      setMensaje('')
    } else {
      setMensaje('Producto no encontrado en inventario')
    }
  }

  const handleScan = (codigo: string) => {
    buscarYAgregar(codigo)
    setMostrarEscaner(false)
  }

  // Total acumulado de la venta actual
  const totalVenta = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

  // Confirmar y cobrar la venta al cliente
  const finalizarVenta = async () => {
    if (carrito.length === 0) return
    setCargando(true)
    setMensaje('')

    // 1. Crear el registro general de la venta
    const { data: venta, error: errVenta } = await supabase
      .from('ventas')
      .insert([{ total: totalVenta, metodo_pago: metodoPago }])
      .select()
      .single()

    if (errVenta || !venta) {
      setMensaje('Error al procesar cobro: ' + errVenta?.message)
      setCargando(false)
      return
    }

    // 2. Guardar el detalle de los productos vendidos y descontar stock
    for (const item of carrito) {
      await supabase.from('detalle_ventas').insert([
        {
          venta_id: venta.id,
          producto_id: item.id,
          nombre_producto: item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
        },
      ])

      // Descontar del stock actual del producto
      const nuevoStock = item.stock_actual - item.cantidad
      await supabase
        .from('productos')
        .update({ stock_actual: nuevoStock })
        .eq('id', item.id)
    }

    setCargando(false)
    setMensaje('¡Venta registrada con éxito!')
    setCarrito([])
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 max-w-lg mx-auto pb-12">
      {/* Header Integrado */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Cobrar Cliente</h1>
            <p className="text-xs text-gray-500">Punto de venta y control de orden</p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-3 mb-4 rounded text-sm ${
            mensaje.includes('Error') || mensaje.includes('no encontrado')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* Buscador y Lector de Cámara */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Escanear o Tipear Código
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={codigoIngresado}
            onChange={(e) => setCodigoIngresado(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarYAgregar(codigoIngresado)}
            placeholder="Ej: 779123456"
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

        {mostrarEscaner && (
          <div className="mt-3">
            <Scanner onScan={handleScan} />
          </div>
        )}
      </div>

      {/* Detalle del Carrito de la Venta actual (Control con botones +, - y X) */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <h2 className="font-bold text-gray-700 text-sm flex items-center gap-2">
            <ShoppingBag size={18} /> Detalle del Pedido
          </h2>
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-600">
            {carrito.length} ítems
          </span>
        </div>

        {carrito.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">Escaneá o buscá productos para armar el pedido.</p>
        ) : (
          <div className="divide-y max-h-64 overflow-y-auto">
            {carrito.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{item.nombre}</p>
                  <p className="text-xs text-gray-400">${item.precio} c/u</p>
                </div>

                {/* Botones de Control (+ , - y X) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => decrementarCantidad(item.id)}
                    className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold flex items-center justify-center active:scale-95 transition"
                  >
                    <Minus size={14} />
                  </button>

                  <span className="w-6 text-center text-sm font-extrabold text-gray-800">
                    {item.cantidad}
                  </span>

                  <button
                    onClick={() => incrementarCantidad(item.id)}
                    className="w-7 h-7 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold flex items-center justify-center active:scale-95 transition"
                  >
                    <Plus size={14} />
                  </button>

                  <button
                    onClick={() => eliminarDelCarrito(item.id)}
                    className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg flex items-center justify-center ml-1 active:scale-95 transition"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="w-16 text-right font-bold text-gray-800 text-sm shrink-0">
                  ${(item.precio * item.cantidad).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selección de Pago y Confirmación */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <label className="block text-xs font-semibold text-gray-600 mb-2">Medio de Pago</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMetodoPago('efectivo')}
            className={`py-2 px-1 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition ${
              metodoPago === 'efectivo'
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <Banknote size={16} /> Efectivo
          </button>

          <button
            type="button"
            onClick={() => setMetodoPago('tarjeta')}
            className={`py-2 px-1 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition ${
              metodoPago === 'tarjeta'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <CreditCard size={16} /> Tarjeta
          </button>

          <button
            type="button"
            onClick={() => setMetodoPago('transferencia')}
            className={`py-2 px-1 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition ${
              metodoPago === 'transferencia'
                ? 'bg-purple-50 border-purple-500 text-purple-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <QrCode size={16} /> Transf.
          </button>
        </div>

        <button
          onClick={finalizarVenta}
          disabled={cargando || carrito.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold text-lg shadow-sm transition flex items-center justify-between px-4 active:scale-95"
        >
          <span>{cargando ? 'Registrando...' : 'Cobrar'}</span>
          <span className="text-xl font-extrabold">${totalVenta.toLocaleString()}</span>
        </button>
      </div>
    </main>
  )
}