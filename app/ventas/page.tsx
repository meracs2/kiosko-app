// app/ventas/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Scanner from '@/components/Scanner'
import Link from 'next/link'
import { ArrowLeft, Camera, Plus, Minus, X, ShoppingBag, Banknote, CreditCard, QrCode, Search, Tag } from 'lucide-react'

interface ItemInventario {
  id: string
  codigo_barras?: string
  nombre: string
  precio: number
  stock_actual?: number
  esPromo?: boolean
}

interface ItemCarrito extends ItemInventario {
  cantidad: number
}

export default function VentasPage() {
  const [productos, setProductos] = useState<ItemInventario[]>([])
  const [promociones, setPromociones] = useState<ItemInventario[]>([])
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>('efectivo')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: prods } = await supabase.from('productos').select('*')
      if (prods) {
        setProductos(prods.map(p => ({ ...p, esPromo: false })))
      }

      const { data: promos } = await supabase.from('promociones').select('*')
      if (promos) {
        setPromociones(promos.map(p => ({ ...p, esPromo: true, stock_actual: 999 })))
      }
    }
    fetchData()
  }, [])

  const inventarioTotal = [...productos, ...promociones]

  const agregarAlCarrito = (item: ItemInventario) => {
    setCarrito((prev) => {
      const existe = prev.find((i) => i.id === item.id && i.esPromo === item.esPromo)
      if (existe) {
        return prev.map((i) =>
          i.id === item.id && i.esPromo === item.esPromo ? { ...i, cantidad: i.cantidad + 1 } : i
        )
      }
      return [...prev, { ...item, cantidad: 1 }]
    })
    setBusqueda('')
    setMensaje('')
  }

  const incrementarCantidad = (id: string, esPromo?: boolean) => {
    setCarrito((prev) =>
      prev.map((item) =>
        item.id === id && item.esPromo === esPromo ? { ...item, cantidad: item.cantidad + 1 } : item
      )
    )
  }

  const decrementarCantidad = (id: string, esPromo?: boolean) => {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.id === id && item.esPromo === esPromo ? { ...item, cantidad: item.cantidad - 1 } : item
        )
        .filter((item) => item.cantidad > 0)
    )
  }

  const eliminarDelCarrito = (id: string, esPromo?: boolean) => {
    setCarrito((prev) => prev.filter((item) => !(item.id === id && item.esPromo === esPromo)))
  }

  const manejarBusquedaOEnter = (texto: string) => {
    const textoLimpio = texto.trim()
    if (!textoLimpio) return

    // 1. Buscar por coincidencia exacta de código de barras o QR
    const itemPorCodigo = inventarioTotal.find((p) => p.codigo_barras === textoLimpio)
    if (itemPorCodigo) {
      agregarAlCarrito(itemPorCodigo)
      return
    }

    // 2. Si hay coincidencias parciales por nombre o número, tomar el primer resultado
    const coincidencias = inventarioTotal.filter((p) =>
      p.nombre.toLowerCase().includes(textoLimpio.toLowerCase()) ||
      (p.codigo_barras && p.codigo_barras.includes(textoLimpio))
    )

    if (coincidencias.length > 0) {
      agregarAlCarrito(coincidencias[0])
    } else {
      setMensaje('Artículo no encontrado')
    }
  }

  const handleScan = (codigo: string) => {
    const item = inventarioTotal.find((p) => p.codigo_barras === codigo)
    if (item) {
      agregarAlCarrito(item)
      setMensaje('')
    } else {
      setMensaje('Código escaneado no encontrado')
    }
    setMostrarEscaner(false)
  }

  // Sugerencias abiertas: busca tanto por nombre como por número de código/QR si tiene al menos 1 caracter
  const textoTrim = busqueda.trim()
  const itemsSugeridos = textoTrim.length === 0 ? [] : inventarioTotal.filter((p) =>
    p.nombre.toLowerCase().includes(textoTrim.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(textoTrim))
  )

  const totalVenta = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

  const finalizarVenta = async () => {
    if (carrito.length === 0) return
    setCargando(true)
    setMensaje('')

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

    for (const item of carrito) {
      await supabase.from('detalle_ventas').insert([
        {
          venta_id: venta.id,
          producto_id: item.esPromo ? null : item.id,
          nombre_producto: item.esPromo ? `[PROMO] ${item.nombre}` : item.nombre,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
        },
      ])

      if (!item.esPromo && item.stock_actual !== undefined) {
        const nuevoStock = item.stock_actual - item.cantidad
        await supabase
          .from('productos')
          .update({ stock_actual: nuevoStock })
          .eq('id', item.id)
      }
    }

    setCargando(false)
    setMensaje('¡Venta registrada con éxito!')
    setCarrito([])
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 max-w-lg mx-auto pb-12">
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

      {/* Barra de búsqueda unificada (Texto, Código de Barras o QR) */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 relative">
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Buscar por Nombre, Código de Barras o QR
        </label>
        <div className="flex gap-2 relative">
          <div className="relative w-full">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && manejarBusquedaOEnter(busqueda)}
              placeholder="Escaneá, tipeá código/QR o buscá por nombre..."
              className="w-full pl-9 pr-3 py-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          </div>

          <button
            type="button"
            onClick={() => setMostrarEscaner(!mostrarEscaner)}
            className="bg-blue-600 text-white p-2.5 rounded-lg flex items-center justify-center shrink-0"
          >
            <Camera size={18} />
          </button>
        </div>

        {itemsSugeridos.length > 0 && (
          <div className="absolute left-4 right-4 z-10 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y">
            {itemsSugeridos.map((item) => (
              <button
                key={`${item.esPromo ? 'promo' : 'prod'}-${item.id}`}
                type="button"
                onClick={() => agregarAlCarrito(item)}
                className="w-full p-2.5 text-left hover:bg-blue-50 flex justify-between items-center text-xs transition"
              >
                <div className="flex items-center gap-2">
                  {item.esPromo && <Tag size={14} className="text-purple-600 shrink-0" />}
                  <div>
                    <p className="font-bold text-gray-800">
                      {item.esPromo ? `[PROMO] ${item.nombre}` : item.nombre}
                    </p>
                    <p className="text-gray-400">
                      {item.esPromo ? 'Combo / Oferta' : `Stock: ${item.stock_actual} un. | Cód: ${item.codigo_barras || 'Sin código'}`}
                    </p>
                  </div>
                </div>
                <span className="font-extrabold text-green-600 text-sm">${item.precio}</span>
              </button>
            ))}
          </div>
        )}

        {mostrarEscaner && (
          <div className="mt-3">
            <Scanner onScan={handleScan} />
          </div>
        )}
      </div>

      {/* Carrito de Compras */}
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
          <p className="text-center text-gray-400 py-6 text-sm">Buscá productos o promos para armar el pedido.</p>
        ) : (
          <div className="divide-y max-h-64 overflow-y-auto">
            {carrito.map((item) => (
              <div key={`${item.esPromo ? 'promo' : 'prod'}-${item.id}`} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.esPromo && <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-bold">PROMO</span>}
                    <p className="font-semibold text-gray-800 text-sm truncate">{item.nombre}</p>
                  </div>
                  <p className="text-xs text-gray-400">${item.precio} c/u</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => decrementarCantidad(item.id, item.esPromo)}
                    className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold flex items-center justify-center active:scale-95 transition"
                  >
                    <Minus size={14} />
                  </button>

                  <span className="w-6 text-center text-sm font-extrabold text-gray-800">
                    {item.cantidad}
                  </span>

                  <button
                    onClick={() => incrementarCantidad(item.id, item.esPromo)}
                    className="w-7 h-7 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-bold flex items-center justify-center active:scale-95 transition"
                  >
                    <Plus size={14} />
                  </button>

                  <button
                    onClick={() => eliminarDelCarrito(item.id, item.esPromo)}
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

      {/* Métodos de Pago y Cobro */}
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