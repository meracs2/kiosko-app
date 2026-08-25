// app/ventas/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Scanner from '@/components/Scanner'
import Link from 'next/link'
import { ArrowLeft, Camera, Plus, Minus, X, ShoppingBag, Banknote, CreditCard, QrCode, Search, Tag, Split } from 'lucide-react'

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
  const [kioskoId, setKioskoId] = useState<string | null>(null)
  
  // Referencia para abrir la cámara nativa directamente en dispositivos móviles
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Estados para montos de pago dividido
  const [pagoEfectivo, setPagoEfectivo] = useState('')
  const [pagoTarjeta, setPagoTarjeta] = useState('')
  const [pagoTransf, setPagoTransf] = useState('')

  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      // Obtenemos la sesión actual para sacar el kiosko_id del usuario
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('kiosko_id')
        .eq('id', session.user.id)
        .single()

      if (perfil?.kiosko_id) {
        setKioskoId(perfil.kiosko_id)

        // Consultamos productos filtrados por el kiosko del usuario
        const { data: prods } = await supabase
          .from('productos')
          .select('*')
          .eq('kiosko_id', perfil.kiosko_id)

        if (prods) {
          setProductos(prods.map(p => ({ ...p, esPromo: false })))
        }

        // Consultamos promos filtradas por el kiosko del usuario
        const { data: promos } = await supabase
          .from('promociones')
          .select('*')
          .eq('kiosko_id', perfil.kiosko_id)

        if (promos) {
          setPromociones(promos.map(p => ({ ...p, esPromo: true, stock_actual: 999 })))
        }
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

    const itemPorCodigo = inventarioTotal.find((p) => p.codigo_barras === textoLimpio)
    if (itemPorCodigo) {
      agregarAlCarrito(itemPorCodigo)
      return
    }

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

  // Manejador para la captura directa con la cámara nativa del celular
  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMensaje('Imagen de cámara capturada correctamente.')
    }
  }

  const textoTrim = busqueda.trim()
  const itemsSugeridos = textoTrim.length === 0 ? [] : inventarioTotal.filter((p) =>
    p.nombre.toLowerCase().includes(textoTrim.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(textoTrim))
  )

  const totalVenta = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

  // Totales ingresados en los inputs de pago
  const valEfectivo = parseFloat(pagoEfectivo) || 0
  const valTarjeta = parseFloat(pagoTarjeta) || 0
  const valTransf = parseFloat(pagoTransf) || 0
  const totalIngresado = valEfectivo + valTarjeta + valTransf

  // Funciones de autopago rápido
  const pagarTodoCon = (tipo: 'efectivo' | 'tarjeta' | 'transferencia') => {
    setPagoEfectivo('')
    setPagoTarjeta('')
    setPagoTransf('')
    if (tipo === 'efectivo') setPagoEfectivo(totalVenta.toString())
    if (tipo === 'tarjeta') setPagoTarjeta(totalVenta.toString())
    if (tipo === 'transferencia') setPagoTransf(totalVenta.toString())
  }

  const finalizarVenta = async () => {
    if (carrito.length === 0 || !kioskoId) return

    // Validamos que el total ingresado coincida exactamente con el carrito
    if (Math.abs(totalIngresado - totalVenta) > 0.01) {
      setMensaje('Error: La suma de los pagos debe ser igual al total del carrito ($' + totalVenta.toLocaleString() + ')')
      return
    }

    setCargando(true)
    setMensaje('')

    // Determinamos el método principal o si fue mixto
    let metodoFinal = 'mixto'
    if (valEfectivo > 0 && valTarjeta === 0 && valTransf === 0) metodoFinal = 'efectivo'
    else if (valTarjeta > 0 && valEfectivo === 0 && valTransf === 0) metodoFinal = 'tarjeta'
    else if (valTransf > 0 && valEfectivo === 0 && valTarjeta === 0) metodoFinal = 'transferencia'

    // INSERTamos la venta incluyendo obligatoriamente el kiosko_id
    const { data: venta, error: errVenta } = await supabase
      .from('ventas')
      .insert([{
        kiosko_id: kioskoId,
        total: totalVenta,
        metodo_pago: metodoFinal,
        pago_efectivo: valEfectivo,
        pago_tarjeta: valTarjeta,
        pago_transferencia: valTransf
      }])
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

      // Si no es promo, consultamos y restamos el stock asegurando compatibilidad en el ID y el kiosko
      if (!item.esPromo) {
        const { data: productoActual } = await supabase
          .from('productos')
          .select('stock_actual')
          .eq('id', String(item.id))
          .eq('kiosko_id', kioskoId)
          .single()

        if (productoActual) {
          const stockActualEnDB = Number(productoActual.stock_actual) || 0
          const nuevoStock = stockActualEnDB - Number(item.cantidad)

          const { error: errorStock } = await supabase
            .from('productos')
            .update({ stock_actual: nuevoStock >= 0 ? nuevoStock : 0 })
            .eq('id', String(item.id))
            .eq('kiosko_id', kioskoId)

          if (errorStock) {
            console.error('Error al actualizar stock de:', item.nombre, errorStock.message)
          }
        } else {
          console.error('No se encontró el producto en la DB con ID:', item.id)
        }
      }
    }

    setCargando(false)
    setMensaje('¡Venta registrada y stock actualizado con éxito!')
    setCarrito([])
    setPagoEfectivo('')
    setPagoTarjeta('')
    setPagoTransf('')
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 max-w-lg mx-auto pb-12">
      {/* Input de archivo oculto para forzar la cámara trasera directamente en móviles */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileCapture}
      />

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
            <p className="text-xs text-gray-500">Punto de venta y pagos mixtos</p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-3 mb-4 rounded text-sm font-medium ${
            mensaje.includes('Error') || mensaje.includes('no encontrado')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {mensaje}
        </div>
      )}

      {/* Barra de búsqueda unificada */}
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
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white p-2.5 rounded-lg flex items-center justify-center shrink-0 hover:bg-blue-700 transition"
            title="Abrir cámara directamente"
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

      {/* Sección de Pagos Mixtos y Cobro */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
            <Split size={14} /> Desglose de Medios de Pago
          </label>
          <span className="text-xs font-bold text-gray-700">
            Total: <span className="text-green-600">${totalVenta.toLocaleString()}</span>
          </span>
        </div>

        {/* Botones rápidos para llenar 100% con un método */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            type="button"
            onClick={() => pagarTodoCon('efectivo')}
            className="py-1.5 px-1 bg-gray-50 border rounded text-[11px] font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
          >
            Todo Efectivo
          </button>
          <button
            type="button"
            onClick={() => pagarTodoCon('tarjeta')}
            className="py-1.5 px-1 bg-gray-50 border rounded text-[11px] font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            Todo Tarjeta
          </button>
          <button
            type="button"
            onClick={() => pagarTodoCon('transferencia')}
            className="py-1.5 px-1 bg-gray-50 border rounded text-[11px] font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition"
          >
            Todo Transf.
          </button>
        </div>

        {/* Inputs numéricos divididos */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 w-24 flex items-center gap-1">
              <Banknote size={14} className="text-emerald-600" /> Efectivo:
            </span>
            <input
              type="number"
              placeholder="0"
              value={pagoEfectivo}
              onChange={(e) => setPagoEfectivo(e.target.value)}
              className="w-full p-2 border rounded-lg bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 w-24 flex items-center gap-1">
              <CreditCard size={14} className="text-blue-600" /> Tarjeta:
            </span>
            <input
              type="number"
              placeholder="0"
              value={pagoTarjeta}
              onChange={(e) => setPagoTarjeta(e.target.value)}
              className="w-full p-2 border rounded-lg bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 w-24 flex items-center gap-1">
              <QrCode size={14} className="text-purple-600" /> Transf.:
            </span>
            <input
              type="number"
              placeholder="0"
              value={pagoTransf}
              onChange={(e) => setPagoTransf(e.target.value)}
              className="w-full p-2 border rounded-lg bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Alerta si el monto ingresado no empareja con el carrito */}
        {totalIngresado !== totalVenta && carrito.length > 0 && (
          <div className="text-[11px] font-bold text-amber-600 bg-amber-50 p-2 rounded mb-3 text-center">
            Falta cubrir: ${(totalVenta - totalIngresado).toLocaleString()}
          </div>
        )}

        <button
          onClick={finalizarVenta}
          disabled={cargando || carrito.length === 0 || totalIngresado !== totalVenta}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-bold text-lg shadow-sm transition flex items-center justify-between px-4 active:scale-95"
        >
          <span>{cargando ? 'Registrando...' : 'Cobrar Venta'}</span>
          <span className="text-xl font-extrabold">${totalVenta.toLocaleString()}</span>
        </button>
      </div>
    </main>
  )
}