'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Scanner from '@/components/Scanner'
import Link from 'next/link'
import { Camera, Plus, Trash2, ArrowLeft, Search, AlertTriangle, X, Edit2, Check, Package, DollarSign, Layers } from 'lucide-react'

interface Producto {
  id: string
  codigo_barras: string
  nombre: string
  precio: number
  stock_actual: number
  categoria?: string
}

const CATEGORIAS = [
  'Bebidas',
  'Galletitas',
  'Lácteos',
  'Comida',
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

    const payload: any = {
      kiosko_id: kioskoId,
      nombre,
      codigo_barras: codigoBarras,
      precio: parseFloat(precio),
      stock_actual: parseInt(stock),
      categoria: categoria
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
  }

  const abrirModalEdicion = (prod: Producto) => {
    setProductoEditando(prod)
    setEditCodigo(prod.codigo_barras)
    setEditPrecio(prod.precio.toString())
    setEditStock(prod.stock_actual.toString())
    setEditCategoria(prod.categoria || 'Bebidas')
  }

  const guardarEdicionModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!kioskoId || !productoEditando) return

    const nuevoPrecio = parseFloat(editPrecio)
    const nuevoStock = parseInt(editStock)

    if (isNaN(nuevoPrecio) || isNaN(nuevoStock)) {
      alert('Por favor, ingresá valores válidos.')
      return
    }

    // Verificar si el nuevo código ya lo tiene otro producto diferente
    const codigoOcupado = productos.find(p => p.codigo_barras === editCodigo.trim() && p.id !== productoEditando.id)
    if (codigoOcupado) {
      alert(`⚠️ El código "${editCodigo}" ya está asignado a otro producto: ${codigoOcupado.nombre}`)
      return
    }

    const { error } = await supabase
      .from('productos')
      .update({ 
        codigo_barras: editCodigo.trim(),
        precio: nuevoPrecio,
        stock_actual: nuevoStock,
        categoria: editCategoria
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
    if (filtroCategoria === 'bajo') return coincideTexto && p.stock_actual <= 1
    
    const catProducto = (p.categoria || 'Otros').toLowerCase()
    
    if (filtroCategoria === 'Otros') {
      return coincideTexto && (catProducto === 'otros' || !CATEGORIAS.slice(0, 6).map(c => c.toLowerCase()).includes(catProducto))
    }
    
    const coincideCat = catProducto === filtroCategoria.toLowerCase()
    const coincideEnNombre = p.nombre.toLowerCase().includes(filtroCategoria.toLowerCase())
    
    return coincideTexto && (coincideCat || coincideEnNombre)
  })

  const cantidadStockBajo = productos.filter(p => p.stock_actual <= 1).length

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

      {/* ALERTA DE STOCK BAJO */}
      {cantidadStockBajo > 0 && !cerrarAlertaStock && (
        <div className="mb-6 bg-amber-50 border border-amber-200/80 p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3 transition-all">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2.5 rounded-xl shrink-0 shadow-xs">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-amber-900">¡Atención! Hay {cantidadStockBajo} producto(s) con stock crítico</p>
              <p className="text-xs text-amber-700/90">Te queda 1 unidad o ninguna disponible en inventario.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFiltroCategoria('bajo')}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs active:scale-95"
            >
              Ver stock bajo
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
                placeholder="Ej: Coca Cola 2.25L"
                required
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Categoría</label>
              <div className="relative">
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Precio ($)</label>
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
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Stock Inicial</label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="10"
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
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
              ⚠️ Stock Bajo
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
                    const esStockBajo = prod.stock_actual <= 1
                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div className="max-w-[200px] truncate" title={prod.nombre}>{prod.nombre}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono text-xs">{prod.codigo_barras}</td>
                        <td className="py-3.5 px-4">
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-medium">
                            {prod.categoria || 'Otros'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          ${prod.precio.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-xs ${
                            esStockBajo ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {esStockBajo && <AlertTriangle size={12} />}
                            {prod.stock_actual} un.
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

      {/* MODAL DE EDICIÓN (CÓDIGO, CATEGORÍA, PRECIO Y STOCK) */}
      {productoEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-6 relative shadow-2xl border border-slate-100">
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
                    placeholder="Escaneá o tipeá nuevo código"
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarEscanerModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-xs active:scale-95"
                    title="Escanear con cámara"
                  >
                    <Camera size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoría</label>
                <div className="relative">
                  <select
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value)}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nuevo Precio ($)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={editPrecio}
                    onChange={(e) => setEditPrecio(e.target.value)}
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nuevo Stock (unidades)</label>
                <input
                  type="number"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
                  <Check size={16} /> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE ESCÁNER PARA NUEVO PRODUCTO */}
      {mostrarEscaner && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 relative shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Escaneá el código</h3>
              <button
                onClick={() => setMostrarEscaner(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X size= {18} />
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

      {/* MODAL DE ESCÁNER DENTRO DEL MODAL DE EDICIÓN */}
      {mostrarEscanerModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-4 relative shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-800 text-sm">Escaneá el nuevo código</h3>
              <button
                onClick={() => setMostrarEscanerModal(false)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
              >
                <X size={18} />
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