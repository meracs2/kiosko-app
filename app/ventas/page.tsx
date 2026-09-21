'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Scanner from '@/components/Scanner'
import Link from 'next/link'
import { ArrowLeft, Camera, Plus, Minus, X, ShoppingBag, Banknote, CreditCard, QrCode, Search, Tag, Split, BookUser, UserCheck, Check } from 'lucide-react'

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

interface ClienteCtaCte {
  id: string
  nombre: string
  telefono?: string | null
  saldo_actual: number
}

export default function VentasPage() {
  const [productos, setProductos] = useState<ItemInventario[]>([])
  const [promociones, setPromociones] = useState<ItemInventario[]>([])
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [kioskoId, setKioskoId] = useState<string | null>(null)
  
  // Estados para Cuentas Corrientes / Clientes
  const [clientes, setClientes] = useState<ClienteCtaCte[]>([])
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCtaCte | null>(null)

  // Estados para el Modal de Producto Suelto / Carga Rápida
  const [mostrarModalSuelto, setMostrarModalSuelto] = useState(false)
  const [sueltoNombre, setSueltoNombre] = useState('')
  const [sueltoPrecio, setSueltoPrecio] = useState('')
  const [sueltoGuardarInventario, setSueltoGuardarInventario] = useState(false)

  const [pagoEfectivo, setPagoEfectivo] = useState('')
  const [pagoTarjeta, setPagoTarjeta] = useState('')
  const [pagoTransf, setPagoTransf] = useState('')
  const [pagoCtaCte, setPagoCtaCte] = useState('')

  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('kiosko_id')
        .eq('id', session.user.id)
        .single()

      if (perfil?.kiosko_id) {
        setKioskoId(perfil.kiosko_id)

        // Cargar productos
        const { data: prods } = await supabase
          .from('productos')
          .select('*')
          .eq('kiosko_id', perfil.kiosko_id)

        if (prods) {
          setProductos(prods.map(p => ({ ...p, esPromo: false })))
        }

        // Cargar promos
        const { data: promos } = await supabase
          .from('promociones')
          .select('*')
          .eq('kiosko_id', perfil.kiosko_id)

        if (promos) {
          setPromociones(promos.map(p => ({ ...p, esPromo: true, stock_actual: 999 })))
        }
      }

      // Cargar clientes desde la tabla compartida 'clientes_cuentas'
      const { data: clts } = await supabase
        .from('clientes_cuentas')
        .select('id, nombre, telefono, saldo_actual')
        .order('nombre', { ascending: true })

      if (clts) {
        setClientes(clts)
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

  // Manejador para agregar producto suelto o carga rápida
  const manejarProductoSuelto = async (e: React.FormEvent) => {
    e.preventDefault()
    const precioNum = parseFloat(sueltoPrecio)
    if (!sueltoNombre.trim() || isNaN(precioNum) || precioNum <= 0) {
      setMensaje('⚠️ Ingresá un nombre y un precio válido para el producto suelto.')
      return
    }

    let productoId = 'suelto-' + Date.now()

    // Si el usuario marca la opción de guardarlo permanentemente en el inventario
    if (sueltoGuardarInventario && kioskoId) {
      const { data, error } = await supabase.from('productos').insert([{
        kiosko_id: kioskoId,
        nombre: sueltoNombre.trim(),
        precio: precioNum,
        stock_actual: 0,
        codigo_barras: 'SUELTO-' + Math.floor(Math.random() * 10000),
        categoria: 'Otros'
      }]).select('id').single()

      if (!error && data) {
        productoId = String(data.id)
        // Actualizar estado local de productos
        setProductos(prev => [{
          id: productoId,
          nombre: sueltoNombre.trim(),
          precio: precioNum,
          stock_actual: 0,
          codigo_barras: 'SUELTO'
        }, ...prev])
      }
    }

    agregarAlCarrito({
      id: productoId,
      nombre: sueltoNombre.trim(),
      precio: precioNum,
      esPromo: false,
      stock_actual: 999
    })

    setSueltoNombre('')
    setSueltoPrecio('')
    setSueltoGuardarInventario(false)
    setMostrarModalSuelto(false)
    setMensaje('¡Producto suelto agregado al pedido!')
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
      setMensaje('Artículo no encontrado. Podés agregarlo como "Producto Suelto".')
    }
  }

  const handleScan = (codigo: string) => {
    const item = inventarioTotal.find((p) => p.codigo_barras === codigo)
    if (item) {
      agregarAlCarrito(item)
      setMensaje('')
    } else {
      setMensaje('Código escaneado no encontrado: ' + codigo)
    }
    setMostrarEscaner(false)
  }

  const textoTrim = busqueda.trim()
  const itemsSugeridos = textoTrim.length === 0 ? [] : inventarioTotal.filter((p) =>
    p.nombre.toLowerCase().includes(textoTrim.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.includes(textoTrim))
  )

  const clienteTrim = busquedaCliente.trim()
  const clientesSugeridos = clienteTrim.length === 0 ? [] : clientes.filter((c) =>
    c.nombre.toLowerCase().includes(clienteTrim.toLowerCase()) ||
    (c.telefono && c.telefono.includes(clienteTrim))
  )

  const totalVenta = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

  const valEfectivo = parseFloat(pagoEfectivo) || 0
  const valTarjeta = parseFloat(pagoTarjeta) || 0
  const valTransf = parseFloat(pagoTransf) || 0
  const valCtaCte = parseFloat(pagoCtaCte) || 0
  const totalIngresado = valEfectivo + valTarjeta + valTransf + valCtaCte

  const pagarTodoCon = (tipo: 'efectivo' | 'tarjeta' | 'transferencia' | 'ctacte') => {
    setPagoEfectivo('')
    setPagoTarjeta('')
    setPagoTransf('')
    setPagoCtaCte('')
    if (tipo === 'efectivo') setPagoEfectivo(totalVenta.toString())
    if (tipo === 'tarjeta') setPagoTarjeta(totalVenta.toString())
    if (tipo === 'transferencia') setPagoTransf(totalVenta.toString())
    if (tipo === 'ctacte') {
      if (!clienteSeleccionado) {
        setMensaje('⚠️ Por favor, seleccioná primero un cliente para cargar a su cuenta corriente.')
        return
      }
      setPagoCtaCte(totalVenta.toString())
    }
  }

  const finalizarVenta = async () => {
    if (carrito.length === 0 || !kioskoId) return

    if (Math.abs(totalIngresado - totalVenta) > 0.01) {
      setMensaje('Error: La suma de los pagos debe ser igual al total del carrito ($' + totalVenta.toLocaleString() + ')')
      return
    }

    if (valCtaCte > 0 && !clienteSeleccionado) {
      setMensaje('Error: Estás incluyendo monto en Cuenta Corriente pero no seleccionaste ningún cliente.')
      return
    }

    setCargando(true)
    setMensaje('')

    let metodoFinal = 'mixto'
    if (valEfectivo > 0 && valTarjeta === 0 && valTransf === 0 && valCtaCte === 0) metodoFinal = 'efectivo'
    else if (valTarjeta > 0 && valEfectivo === 0 && valTransf === 0 && valCtaCte === 0) metodoFinal = 'tarjeta'
    else if (valTransf > 0 && valEfectivo === 0 && valTarjeta === 0 && valCtaCte === 0) metodoFinal = 'transferencia'
    else if (valCtaCte > 0 && valEfectivo === 0 && valTarjeta === 0 && valTransf === 0) metodoFinal = 'cuenta_corriente'

    const { data: ventaInsertada, error: errVenta } = await supabase
      .from('ventas')
      .insert([{
        kiosko_id: kioskoId,
        total: totalVenta,
        metodo_pago: metodoFinal,
        pago_efectivo: valEfectivo,
        pago_tarjeta: valTarjeta,
        pago_transferencia: valTransf,
        pago_cta_cte: valCtaCte,
        cliente_id: clienteSeleccionado ? clienteSeleccionado.id : null
      }])
      .select('id')

    if (errVenta || !ventaInsertada || ventaInsertada.length === 0) {
      setMensaje('Error al procesar cobro: ' + (errVenta?.message || 'No se pudo obtener el ID de venta'))
      setCargando(false)
      return
    }

    const ventaId = ventaInsertada[0].id

    // MODIFICADO: Ahora guarda el detalle exacto de los productos en el historial de cuentas
    if (valCtaCte > 0 && clienteSeleccionado) {
      const nuevoSaldo = clienteSeleccionado.saldo_actual + valCtaCte

      await supabase
        .from('clientes_cuentas')
        .update({ saldo_actual: nuevoSaldo })
        .eq('id', clienteSeleccionado.id)

      const detalleProductos = carrito.map(item => `${item.cantidad}x ${item.nombre}`).join(', ')

      await supabase.from('historial_cuentas').insert([{
        cliente_id: clienteSeleccionado.id,
        tipo: 'fiado',
        monto: valCtaCte,
        descripcion: `Compra: ${detalleProductos}`
      }])
    }

    for (const item of carrito) {
      const isCustomSuelto = String(item.id).startsWith('suelto-')
      const idLimpio = (item.esPromo || isCustomSuelto) ? null : parseInt(String(item.id), 10)

      const detalleData = {
        venta_id: ventaId,
        producto_id: isNaN(idLimpio as number) ? null : idLimpio,
        nombre_producto: item.esPromo ? `[PROMO] ${item.nombre}` : item.nombre,
        cantidad: Number(item.cantidad),
        precio_unitario: Number(item.precio),
      }

      const { error: errDetalle } = await supabase.from('detalle_ventas').insert([detalleData])

      if (errDetalle) {
        setMensaje(`Error en detalle: ${errDetalle.message || 'Revisá la consola'}`)
        setCargando(false)
        return
      }

      if (!item.esPromo && !isCustomSuelto && idLimpio !== null) {
        const { data: productoActual } = await supabase
          .from('productos')
          .select('stock_actual')
          .eq('id', idLimpio)
          .eq('kiosko_id', kioskoId)
          .single()

        if (productoActual) {
          const stockActualEnDB = Number(productoActual.stock_actual) || 0
          const nuevoStock = stockActualEnDB - Number(item.cantidad)

          await supabase
            .from('productos')
            .update({ stock_actual: nuevoStock >= 0 ? nuevoStock : 0 })
            .eq('id', idLimpio)
            .eq('kiosko_id', kioskoId)
        }
      }
    }

    setCargando(false)
    setMensaje('¡Venta registrada y stock actualizado con éxito!')
    setCarrito([])
    setPagoEfectivo('')
    setPagoTarjeta('')
    setPagoTransf('')
    setPagoCtaCte('')
    setClienteSeleccionado(null)
    setBusquedaCliente('')
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 max-w-md md:max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6 bg-white md:bg-transparent p-4 md:p-0 rounded-xl shadow-sm md:shadow-none">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Cobrar Cliente</h1>
            <p className="text-xs text-gray-500">Punto de venta y cuentas corrientes</p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-3 mb-4 rounded-xl text-sm font-medium ${
            mensaje.includes('Error') || mensaje.includes('no encontrado') || mensaje.includes('detalle') || mensaje.includes('⚠️')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        <div className="md:col-span-6 space-y-4">
          
          {/* CUENTA CORRIENTE */}
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl shadow-sm p-4 relative overflow-visible">
            <label className="block text-xs font-bold text-indigo-900 mb-1 flex items-center gap-1.5">
              <BookUser size={15} /> Asignar a Cuenta Corriente (Opcional)
            </label>

            {clienteSeleccionado ? (
              <div className="flex items-center justify-between bg-white border-2 border-indigo-400 p-2.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{clienteSeleccionado.nombre}</p>
                    <p className="text-[10px] text-gray-500">Tel: {clienteSeleccionado.telefono || 'Sin teléfono'} | Saldo: ${clienteSeleccionado.saldo_actual?.toLocaleString('es-AR')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClienteSeleccionado(null)}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold hover:bg-red-200 transition"
                >
                  Cambiar / Quitar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  placeholder="Buscá al cliente por nombre o teléfono..."
                  className="w-full pl-9 pr-3 py-2.5 border border-indigo-200 rounded-xl bg-white text-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Search size={15} className="absolute left-3 top-3 text-indigo-400" />

                {clientesSugeridos.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-indigo-300 rounded-xl shadow-2xl max-h-48 overflow-y-auto divide-y">
                    {clientesSugeridos.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => {
                          setClienteSeleccionado(cliente)
                          setBusquedaCliente('')
                        }}
                        className="w-full p-3 text-left hover:bg-indigo-50 flex justify-between items-center text-xs transition"
                      >
                        <div>
                          <p className="font-bold text-gray-800">{cliente.nombre}</p>
                          <p className="text-gray-400 text-[10px]">Saldo: ${cliente.saldo_actual?.toLocaleString('es-AR')} {cliente.telefono ? `| Tel: ${cliente.telefono}` : ''}</p>
                        </div>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-md flex items-center gap-1 shrink-0">
                          <Check size={12} /> Seleccionar
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BUSCADOR DE PRODUCTOS Y BOTÓN DE PRODUCTO SUELTO */}
          <div className="bg-white rounded-2xl shadow-sm p-4 relative">
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
                  className="w-full pl-9 pr-3 py-3 border rounded-xl bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>

              <button
                type="button"
                onClick={() => setMostrarEscaner(true)}
                className="bg-blue-600 text-white p-3 rounded-xl flex items-center justify-center shrink-0 hover:bg-blue-700 transition"
                title="Abrir cámara de escaneo"
              >
                <Camera size={18} />
              </button>

              {/* NUEVO BOTÓN: PRODUCTO SUELTO / CARGA RÁPIDA */}
              <button
                type="button"
                onClick={() => setMostrarModalSuelto(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-3 rounded-xl flex items-center gap-1.5 font-bold text-xs shrink-0 transition active:scale-95 shadow-sm"
                title="Crear producto suelto con nombre y precio"
              >
                <Plus size={16} /> Suelto
              </button>
            </div>

            {itemsSugeridos.length > 0 && (
              <div className="absolute left-4 right-4 z-40 mt-1 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y">
                {itemsSugeridos.map((item) => (
                  <button
                    key={`${item.esPromo ? 'promo' : 'prod'}-${item.id}`}
                    type="button"
                    onClick={() => agregarAlCarrito(item)}
                    className="w-full p-3 text-left hover:bg-blue-50 flex justify-between items-center text-xs transition"
                  >
                    <div className="flex items-center gap-2">
                      {item.esPromo && <Tag size={14} className="text-purple-600 shrink-0" />}
                      <div>
                        <p className="font-bold text-gray-800 text-sm">
                          {item.esPromo ? `[PROMO] ${item.nombre}` : item.nombre}
                        </p>
                        <p className="text-gray-400">
                          {item.esPromo ? 'Combo / Oferta' : `Stock: ${item.stock_actual} un. | Cód: ${item.codigo_barras || 'Sin código'}`}
                        </p>
                      </div>
                    </div>
                    <span className="font-extrabold text-green-600 text-base">${item.precio}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* DETALLE DEL PEDIDO */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex justify-between items-center border-b pb-3 mb-3">
              <h2 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                <ShoppingBag size={18} /> Detalle del Pedido
              </h2>
              <span className="text-xs bg-gray-100 px-2.5 py-1 rounded-full font-bold text-gray-600">
                {carrito.length} ítems
              </span>
            </div>

            {carrito.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-sm">Buscá productos, promos o usá &quot;Suelto&quot; para armar el pedido.</p>
            ) : (
              <div className="divide-y max-h-80 md:max-h-[300px] overflow-y-auto pr-1">
                {carrito.map((item) => (
                  <div key={`${item.esPromo ? 'promo' : 'prod'}-${item.id}`} className="py-3 flex items-center justify-between gap-3">
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

                    <div className="w-20 text-right font-bold text-gray-800 text-sm shrink-0">
                      ${(item.precio * item.cantidad).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: MEDIOS DE PAGO */}
        <div className="md:col-span-6 bg-white rounded-2xl shadow-sm p-5 sticky top-6">
          <div className="flex justify-between items-center mb-3">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <Split size={14} /> Desglose de Medios de Pago
            </label>
            <span className="text-xs font-bold text-gray-700">
              Total: <span className="text-green-600 text-sm">${totalVenta.toLocaleString()}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <button
              type="button"
              onClick={() => pagarTodoCon('efectivo')}
              className="py-2 px-1 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              Todo Efectivo
            </button>
            <button
              type="button"
              onClick={() => pagarTodoCon('tarjeta')}
              className="py-2 px-1 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition"
            >
              Todo Tarjeta
            </button>
            <button
              type="button"
              onClick={() => pagarTodoCon('transferencia')}
              className="py-2 px-1 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition"
            >
              Todo Transf.
            </button>
            <button
              type="button"
              onClick={() => pagarTodoCon('ctacte')}
              className="py-2 px-1 bg-gray-50 border rounded-xl text-xs font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
            >
              Todo Cta. Cte.
            </button>
          </div>

          <div className="space-y-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 w-28 flex items-center gap-1">
                <Banknote size={16} className="text-emerald-600" /> Efectivo:
              </span>
              <input
                type="number"
                placeholder="0"
                value={pagoEfectivo}
                onChange={(e) => setPagoEfectivo(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 w-28 flex items-center gap-1">
                <CreditCard size={16} className="text-blue-600" /> Tarjeta:
              </span>
              <input
                type="number"
                placeholder="0"
                value={pagoTarjeta}
                onChange={(e) => setPagoTarjeta(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 w-28 flex items-center gap-1">
                <QrCode size={16} className="text-purple-600" /> Transf.:
              </span>
              <input
                type="number"
                placeholder="0"
                value={pagoTransf}
                onChange={(e) => setPagoTransf(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600 w-28 flex items-center gap-1">
                <BookUser size={16} className="text-indigo-600" /> Cta. Cte.:
              </span>
              <input
                type="number"
                placeholder="0"
                value={pagoCtaCte}
                onChange={(e) => setPagoCtaCte(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {clienteSeleccionado && (
            <div className="text-xs font-bold text-indigo-700 bg-indigo-50 p-2.5 rounded-xl mb-3 flex items-center justify-between">
              <span>Cliente vinculado: <strong>{clienteSeleccionado.nombre}</strong></span>
              <span className="text-[10px] bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded">Activo</span>
            </div>
          )}

          {totalIngresado !== totalVenta && carrito.length > 0 && (
            <div className="text-xs font-bold text-amber-600 bg-amber-50 p-3 rounded-xl mb-4 text-center">
              Falta cubrir: ${(totalVenta - totalIngresado).toLocaleString()}
            </div>
          )}

          <button
            onClick={finalizarVenta}
            disabled={cargando || carrito.length === 0 || totalIngresado !== totalVenta}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold text-lg shadow-md transition flex items-center justify-between px-5 active:scale-95"
          >
            <span>{cargando ? 'Registrando...' : 'Cobrar Venta'}</span>
            <span className="text-xl font-extrabold">${totalVenta.toLocaleString()}</span>
          </button>
        </div>

      </div>

      {/* MODAL DE PRODUCTO SUELTO / CARGA RÁPIDA */}
      {mostrarModalSuelto && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="font-bold text-gray-800 text-base">Agregar Producto Suelto</h3>
              <button
                onClick={() => setMostrarModalSuelto(false)}
                className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={manejarProductoSuelto} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del ítem o servicio</label>
                <input
                  type="text"
                  value={sueltoNombre}
                  onChange={(e) => setSueltoNombre(e.target.value)}
                  placeholder="Ej: Fotocopia, Café express, Varios..."
                  required
                  className="w-full p-3 border rounded-xl bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Precio ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sueltoPrecio}
                  onChange={(e) => setSueltoPrecio(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full p-3 border rounded-xl bg-gray-50 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="guardarInv"
                  checked={sueltoGuardarInventario}
                  onChange={(e) => setSueltoGuardarInventario(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                />
                <label htmlFor="guardarInv" className="text-xs text-gray-600 font-medium cursor-pointer">
                  Guardar también en el inventario general
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalSuelto(false)}
                  className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 shadow-sm"
                >
                  <Plus size={16} /> Agregar al Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ESCÁNER */}
      {mostrarEscaner && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 relative shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Escaneá el código de barras o QR</h3>
              <button
                onClick={() => setMostrarEscaner(false)}
                className="p-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <Scanner onScan={handleScan} />
          </div>
        </div>
      )}
    </main>
  )
}