'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Scanner from '@/components/Scanner'
import Link from 'next/link'
import { Camera, Plus, Trash2, ArrowLeft, Search, AlertTriangle, X, Edit2, Check, Package, DollarSign, Layers, RotateCcw } from 'lucide-react'

interface Producto {
  id: string
  codigo_barras: string
  nombre: string
  precio: number
  stock_actual: number
  categoria?: string
  es_fraccionable?: boolean
  precio_costo_100g?: number
  precio_venta_100g?: number
}

const CATEGORIAS = [
  'Bebidas',
  'Galletitas',
  'Lácteos',
  'Comida',
  'Fiambres y Quesos',
  'Higiene Personal',
  'Limpieza',
  'Otros'
]

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [kioskoId, setKioskoId] = useState<string | null>(null)
  
  const [nombre, setNombre] = useState('')
  const [codigoBarras, setCodigoBarras] = useState('')
  const [precio, setPrecio] = useState('')
  const [stock, setStock] = useState('')
  const [categoria, setCategoria] = useState('Bebidas')
  
  // ESTADOS PARA PRODUCTOS FRACCIONABLES
  const [esFraccionable, setEsFraccionable] = useState(false)
  const [precioCostoGramo, setPrecioCostoGramo] = useState('') 
  const [precioVenta100g, setPrecioVenta100g] = useState('')
  const [precioVentaModificadoManual, setPrecioVentaModificadoManual] = useState(false)
  
  const [busquedaStock, setBusquedaStock] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [mostrarEscaner, setMostrarEscaner] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  const [cerrarAlertaStock, setCerrarAlertaStock] = useState(false)

  // ESTADOS PARA EL MODAL DE EDICIÓN
  const [productoEditando, setProductoEditando] = useState<Producto | null>(null)
  const [editCodigo, setEditCodigo] = useState('')
  const [editPrecio, setEditPrecio] = useState('')
  const [editStock, setEditStock] = useState('')
  const [editCategoria, setEditCategoria] = useState('Bebidas')
  const [editEsFraccionable, setEditEsFraccionable] = useState(false)
  const [editPrecioCostoGramo, setEditPrecioCostoGramo] = useState('') 
  const [editPrecioVenta100g, setEditPrecioVenta100g] = useState('')
  const [editPrecioVentaModificadoManual, setEditPrecioVentaModificadoManual] = useState(false)
  const [mostrarEscanerModal, setMostrarEscanerModal] = useState(false)

  const fetchProductos = async (idKiosko: string) => {
    const { data } = await supabase
      .from('productos')
      .select('*')
      .eq('kiosko_id', idKiosko)
      .order('id', { ascending: false })
      
    if (data) setProductos(data)
  }

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
        fetchProductos(perfil.kiosko_id)
      }
    }
    inicializarKiosko()
  }, [])

  // EFECTO DE CÁLCULO AUTOMÁTICO PARA NUEVO PRODUCTO
  useEffect(() => {
    if (esFraccionable && !precioVentaModificadoManual) {
      const costoG = parseFloat(precioCostoGramo)
      if (!isNaN(costoG) && costoG > 0) {
        // Multiplicamos por 100 para sacar el precio sugerido de 100g
        const sugerido = (costoG * 100).toFixed(2)
        setPrecioVenta100g(sugerido)
      } else {
        setPrecioVenta100g('')
      }
    }
  }, [precioCostoGramo, esFraccionable, precioVentaModificadoManual])

  // EFECTO DE CÁLCULO AUTOMÁTICO PARA EL MODAL DE EDICIÓN
  useEffect(() => {
    if (editEsFraccionable && !editPrecioVentaModificadoManual) {
      const costoG = parseFloat(editPrecioCostoGramo)
      if (!isNaN(costoG) && costoG > 0) {
        const sugerido = (costoG * 100).toFixed(2)
        setEditPrecioVenta100g(sugerido)
      } else {
        setEditPrecioVenta100g('')
      }
    }
  }, [editPrecioCostoGramo, editEsFraccionable, editPrecioVentaModificadoManual])

  const guardarProductoNuevo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kioskoId) return

    setCargando(true)
    setMensaje('')

    const existente = productos.find((p) => p.codigo_barras === codigoBarras)
    if (existente) {
      setMensaje('Error: Ese código de barras ya pertenece a ' + existente.nombre)
      setCargando(false)
      return
    }

    const esFiambreValido = categoria === 'Fiambres y Quesos' && esFraccionable
    const costo100gCalculado = esFiambreValido ? parseFloat(precioCostoGramo || '0') * 100 : null

    const payload = {
      kiosko_id: kioskoId,
      nombre,
      codigo_barras: codigoBarras,
      precio: esFiambreValido ? parseFloat(precioVenta100g || '0') : parseFloat(precio),
      stock_actual: parseInt(stock),
      categoria: categoria,
      es_fraccionable: esFiambreValido,
      precio_costo_100g: costo100gCalculado,
      precio_venta_100g: esFiambreValido ? parseFloat(precioVenta100g || '0') : null
    }

    const { error } = await supabase.from('productos').insert([payload])

    setCargando(false)
    if (error) {
      setMensaje('Error al guardar: ' + error.message)
    } else {
      setMensaje('¡Producto guardado exitosamente!')
      limpiarFormulario()
      fetchProductos(kioskoId)
    }
  }

  const limpiarFormulario = () => {
    setNombre('')
    setCodigoBarras('')
    setPrecio('')
    setStock('')
    setCategoria('Bebidas')
    setEsFraccionable(false)
    setPrecioCostoGramo('')
    setPrecioVenta100g('')
    setPrecioVentaModificadoManual(false)
  }

  const abrirModalEdicion = (prod: Producto) => {
    setProductoEditando(prod)
    setEditCodigo(prod.codigo_barras)
    setEditPrecio(prod.precio.toString())
    setEditStock(prod.stock_actual.toString())
    setEditCategoria(prod.categoria || 'Bebidas')
    setEditEsFraccionable(prod.es_fraccionable || false)
    
    const costoGramoActual = prod.precio_costo_100g ? (prod.precio_costo_100g / 100).toString() : ''
    setEditPrecioCostoGramo(costoGramoActual)
    setEditPrecioVenta100g(prod.precio_venta_100g ? prod.precio_venta_100g.toString() : '')
    setEditPrecioVentaModificadoManual(true) // Al abrir un producto existente, tratamos el precio como establecido
  }

  const guardarEdicionModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kioskoId || !productoEditando) return

    const esFiambreValidoModal = editCategoria === 'Fiambres y Quesos' && editEsFraccionable
    const nuevoStock = parseInt(editStock)
    const nuevoPrecio = esFiambreValidoModal ? parseFloat(editPrecioVenta100g) : parseFloat(editPrecio)

    if (isNaN(nuevoStock) || isNaN(nuevoPrecio)) {
      alert('Por favor, ingresá valores válidos.')
      return
    }

    const codigoOcupado = productos.find(p => p.codigo_barras === editCodigo.trim() && p.id !== productoEditando.id)
    if (codigoOcupado) {
      alert(`⚠️ El código "${editCodigo}" ya está asignado a otro producto: ${codigoOcupado.nombre}`)
      return
    }

    const costo100gModalCalculado = esFiambreValidoModal ? parseFloat(editPrecioCostoGramo || '0') * 100 : null

    const { error } = await supabase
      .from('productos')
      .update({ 
        codigo_barras: editCodigo.trim(),
        precio: nuevoPrecio,
        stock_actual: nuevoStock,
        categoria: editCategoria,
        es_fraccionable: esFiambreValidoModal,
        precio_costo_100g: costo100gModalCalculado,
        precio_venta_100g: esFiambreValidoModal ? parseFloat(editPrecioVenta100g || '0') : null
      })
      .eq('id', productoEditando.id)
      .eq('kiosko_id', kioskoId)

    if (error) {
      alert('Error al actualizar: ' + error.message)
    } else {
      setProductoEditando(null)
      fetchProductos(kioskoId)
    }
  }

  const eliminarProducto = async (id: string) => {
    if (!kioskoId) return
    if (!confirm('¿Seguro que querés eliminar este producto?')) return
    
    await supabase
      .from('productos')
      .delete()
      .eq('id', id)
      .eq('kiosko_id', kioskoId)

    fetchProductos(kioskoId)
  }

  const productosFiltrados = productos.filter((p) => {
    const coincideTexto =
      p.nombre.toLowerCase().includes(busquedaStock.toLowerCase()) ||
      p.codigo_barras.includes(busquedaStock)

    if (filtroCategoria === 'todos') return coincideTexto
    if (filtroCategoria === 'bajo') return coincideTexto && p.stock_actual <= 0
    
    const catProducto = (p.categoria || 'Otros').toLowerCase()
    
    if (filtroCategoria === 'Otros') {
      return coincideTexto && (catProducto === 'otros' || !CATEGORIAS.slice(0, 7).map(c => c.toLowerCase()).includes(catProducto))
    }
    
    const coincideCat = catProducto === filtroCategoria.toLowerCase()
    const coincideEnNombre = p.nombre.toLowerCase().includes(filtroCategoria.toLowerCase())
    
    return coincideTexto && (coincideCat || coincideEnNombre)
  })

  const cantidadStockBajo = productos.filter(p => p.stock_actual <= 0).length

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
              <Package className="text-blue-600" size={26} /> Gestión de Inventario
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Administración completa de mercadería, precios y stock</p>
          </div>
        </div>
      </div>

      {/* ALERTA DE SIN STOCK */}
      {cantidadStockBajo > 0 && !cerrarAlertaStock && (
        <div className="mb-6 bg-amber-50 border border-amber-200/80 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2.5 rounded-xl shrink-0 shadow-xs">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-900">¡Atención! Hay {cantidadStockBajo} producto(s) sin stock</p>
              <p className="text-xs text-amber-700/90">Se quedaron sin unidades disponibles en inventario (0 un.).</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFiltroCategoria('bajo')}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
            >
              Ver sin stock
            </button>
            <button
              onClick={() => setCerrarAlertaStock(true)}
              className="text-amber-400 hover:text-amber-700 p-1.5 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {mensaje && (
        <div className={`p-4 mb-6 rounded-2xl text-xs sm:text-sm font-semibold shadow-xs ${
          mensaje.includes('Error') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        }`}>
          {mensaje}
        </div>
      )}

      {/* LAYOUT PRINCIPAL DE ESCRITORIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-slate-100 p-6 lg:sticky lg:top-6">
          <h2 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 text-sm sm:text-base flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Plus size={18} />
            </div> 
            Nuevo Producto
          </h2>
          
          <form onSubmit={guardarProductoNuevo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Código de Barras</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="Escaneá o tipeá"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setMostrarEscaner(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-xs active:scale-95"
                  title="Escanear con cámara"
                >
                  <Camera size={18} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre del Producto</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Jamón Cocido / Queso Tybo"
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoría</label>
              <div className="relative">
                <select
                  value={categoria}
                  onChange={(e) => {
                    const nuevaCat = e.target.value
                    setCategoria(nuevaCat)
                    if (nuevaCat === 'Fiambres y Quesos') {
                      setEsFraccionable(true)
                    } else {
                      setEsFraccionable(false)
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Layers size={16} />
                </div>
              </div>
            </div>

            {categoria === 'Fiambres y Quesos' && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center gap-2.5 animate-fadeIn">
                <input
                  type="checkbox"
                  id="esFraccionable"
                  checked={esFraccionable}
                  onChange={(e) => setEsFraccionable(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="esFraccionable" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Se vende por peso / porción (ej. Fiambrería)
                </label>
              </div>
            )}

            {/* PRECIOS DIFERENCIADOS: COSTO POR GRAMO Y VENTA POR 100G (CON CÁLCULO AUTOMÁTICO) */}
            {categoria === 'Fiambres y Quesos' && esFraccionable ? (
              <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-blue-900 mb-1" title="Costo exacto por cada 1 gramo">Costo x 1g ($)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={precioCostoGramo}
                      onChange={(e) => setPrecioCostoGramo(e.target.value)}
                      placeholder="Ej: 10"
                      className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white text-slate-800 text-xs focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-blue-900">Venta x 100g ($)</label>
                      {precioVentaModificadoManual && (
                        <button
                          type="button"
                          onClick={() => setPrecioVentaModificadoManual(false)}
                          className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                          title="Volver a calcular automáticamente según el costo"
                        >
                          <RotateCcw size={10} /> Auto
                        </button>
                      )}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={precioVenta100g}
                      onChange={(e) => {
                        setPrecioVenta100g(e.target.value)
                        setPrecioVentaModificadoManual(true) // Permitir sobreescribir libremente (ej. poner 1100)
                      }}
                      placeholder="Ej: 1000"
                      required
                      className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
                {!precioVentaModificadoManual && precioCostoGramo && (
                  <p className="text-[10px] text-blue-600/90 font-medium italic">
                    💡 Calculado automáticamente (x100g). Podés modificarlo manualmente si deseás sumar un extra.
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Precio Unitario ($)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0.00"
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                {categoria === 'Fiambres y Quesos' && esFraccionable ? 'Stock Inicial en Gramos (ej. 4000g de horma)' : 'Stock Inicial (Unidades)'}
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder={categoria === 'Fiambres y Quesos' && esFraccionable ? '4000' : '10'}
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white py-3 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
            >
              <Plus size={18} />
              {cargando ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </form>
        </div>

        {/* COLUMNA DERECHA: TABLA Y BUSCADOR */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-xs border border-slate-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              Inventario Actual <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{productosFiltrados.length}</span>
            </h2>

            {/* Barra de Búsqueda */}
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={busquedaStock}
                onChange={(e) => setBusquedaStock(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            </div>
          </div>

          {/* FILTROS */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 text-xs scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <button
              onClick={() => setFiltroCategoria('todos')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all shadow-xs shrink-0 ${
                filtroCategoria === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroCategoria('bajo')}
              className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all shadow-xs shrink-0 ${
                filtroCategoria === 'bajo' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/50'
              }`}
            >
              ⚠️️ Sin Stock (0)
            </button>
            {CATEGORIAS.map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all shadow-xs shrink-0 ${
                  filtroCategoria === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* TABLA DE PRODUCTOS */}
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto text-slate-300 mb-2" size={42} />
              <p className="text-slate-500 text-sm font-medium">No se encontraron productos</p>
              <p className="text-xs text-slate-400 mt-0.5">Intentá cambiar el filtro o el término de búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[550px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Producto</th>
                    <th className="py-3 px-4">Código</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Precio</th>
                    <th className="py-3 px-4">Stock</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {productosFiltrados.map((prod) => {
                    const sinStock = prod.stock_actual <= 0
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div className="max-w-[200px] truncate flex items-center gap-1.5" title={prod.nombre}>
                            {prod.nombre}
                            {prod.es_fraccionable && (
                              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">Peso</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{prod.codigo_barras}</td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium">
                            {prod.categoria || 'Otros'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {prod.es_fraccionable ? (
                            <span title="Precio de venta por cada 100 gramos">
                              ${prod.precio_venta_100g?.toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">/100g</span>
                            </span>
                          ) : (
                            `$${prod.precio.toFixed(2)}`
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                            sinStock ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {sinStock && <AlertTriangle size={12} />}
                            {prod.es_fraccionable ? `${prod.stock_actual}g` : `${prod.stock_actual} un.`}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => abrirModalEdicion(prod)}
                              className="p-2 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl transition-all shadow-xs border border-slate-200 active:scale-95"
                              title="Modificar datos, categoría y stock"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => eliminarProducto(prod.id)}
                              className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all shadow-xs border border-slate-200 active:scale-95"
                              title="Eliminar producto"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE EDICIÓN */}
      {productoEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 relative shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Modificar Producto</h3>
                <p className="text-xs text-slate-500 truncate max-w-[240px] font-medium">{productoEditando.nombre}</p>
              </div>
              <button
                onClick={() => setProductoEditando(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={guardarEdicionModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Código de Barras</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editCodigo}
                    onChange={(e) => setEditCodigo(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarEscanerModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 rounded-xl flex items-center justify-center shrink-0 active:scale-95"
                  >
                    <Camera size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoría</label>
                <select
                  value={editCategoria}
                  onChange={(e) => {
                    const nuevaCat = e.target.value
                    setEditCategoria(nuevaCat)
                    if (nuevaCat === 'Fiambres y Quesos') {
                      setEditEsFraccionable(true)
                    } else {
                      setEditEsFraccionable(false)
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {editCategoria === 'Fiambres y Quesos' && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="editEsFraccionable"
                    checked={editEsFraccionable}
                    onChange={(e) => setEditEsFraccionable(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  />
                  <label htmlFor="editEsFraccionable" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Se vende por peso / porción (gramos)
                  </label>
                </div>
              )}

              {editCategoria === 'Fiambres y Quesos' && editEsFraccionable ? (
                <div className="bg-blue-50/40 p-3 rounded-xl border border-blue-100 space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-blue-900 mb-1">Costo x 1g ($)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={editPrecioCostoGramo}
                        onChange={(e) => setEditPrecioCostoGramo(e.target.value)}
                        className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white text-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-blue-900">Venta x 100g ($)</label>
                        {editPrecioVentaModificadoManual && (
                          <button
                            type="button"
                            onClick={() => setEditPrecioVentaModificadoManual(false)}
                            className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                            title="Volver a calcular automáticamente según el costo"
                          >
                            <RotateCcw size={10} /> Auto
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={editPrecioVenta100g}
                        onChange={(e) => {
                          setEditPrecioVenta100g(e.target.value)
                          setEditPrecioVentaModificadoManual(true)
                        }}
                        required
                        className="w-full px-3 py-2 border border-blue-200 rounded-xl bg-white text-slate-800 text-xs font-semibold"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nuevo Precio Unitario ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {editCategoria === 'Fiambres y Quesos' && editEsFraccionable ? 'Stock en Gramos (g)' : 'Stock (unidades)'}
                </label>
                <input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setProductoEditando(null)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Check size5 size={16} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ESCÁNER NUEVO */}
      {mostrarEscaner && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 relative shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Escaneá el código</h3>
              <button onClick={() => setMostrarEscaner(false)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl">
              <Scanner
                onScan={(codigoLeido) => {
                  if (!codigoLeido) return
                  setCodigoBarras(codigoLeido.trim())
                  setMostrarEscaner(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ESCÁNER EDICIÓN */}
      {mostrarEscanerModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 relative shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Escaneá el nuevo código</h3>
              <button onClick={() => setMostrarEscanerModal(false)} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600">
                <X size5 size={18} />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl">
              <Scanner
                onScan={(codigoLeido) => {
                  if (!codigoLeido) return
                  setEditCodigo(codigoLeido.trim())
                  setMostrarEscanerModal(false)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  )
}