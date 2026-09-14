'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Search, BookOpen, PlusCircle, MinusCircle, History, X, Trash2, Phone, DollarSign, ShoppingCart } from 'lucide-react'

type ClienteCuenta = {
  id: string
  nombre: string
  telefono: string | null
  saldo_actual: number
}

type Movimiento = {
  id: string
  tipo: 'fiado' | 'pago' | 'venta'
  monto: number
  descripcion: string
  created_at: string
}

export default function CuentasCorrientesPage() {
  const [clientes, setClientes] = useState<ClienteCuenta[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  // Modal Nuevo Cliente
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState('')
  const [telefonoNuevo, setTelefonoNuevo] = useState('')

  // Modal Historial / Acciones sobre un cliente
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCuenta | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [descripcionMov, setDescripcionMov] = useState('')
  const [cargandoMovs, setCargandoMovs] = useState(false)

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('clientes_cuentas')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error al cargar cuentas:', error)
    } else {
      setClientes(data || [])
    }
    setCargando(false)
  }

  const crearCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombreNuevo.trim()) return

    const { error } = await supabase
      .from('clientes_cuentas')
      .insert([{ nombre: nombreNuevo, telefono: telefonoNuevo, saldo_actual: 0 }])

    if (error) {
      alert('Error al crear el cliente.')
    } else {
      setNombreNuevo('')
      setTelefonoNuevo('')
      setModalNuevo(false)
      cargarClientes()
    }
  }

  const abrirCliente = async (cliente: ClienteCuenta) => {
    setClienteSeleccionado(cliente)
    setMontoMovimiento('')
    setDescripcionMov('')
    setCargandoMovs(true)

    const { data, error } = await supabase
      .from('historial_cuentas')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })

    if (!error) {
      setMovimientos(data || [])
    }
    setCargandoMovs(false)
  }

  const registrarMovimiento = async (tipo: 'fiado' | 'pago') => {
    if (!clienteSeleccionado) return
    const monto = parseFloat(montoMovimiento)
    if (isNaN(monto) || monto <= 0) {
      alert('Ingresá un monto válido.')
      return
    }

    const nuevoSaldo = tipo === 'fiado' 
      ? clienteSeleccionado.saldo_actual + monto 
      : clienteSeleccionado.saldo_actual - monto

    const { error: errorUpdate } = await supabase
      .from('clientes_cuentas')
      .update({ saldo_actual: nuevoSaldo })
      .eq('id', clienteSeleccionado.id)

    if (errorUpdate) {
      alert('Error al actualizar el saldo.')
      return
    }

    const { error: errorHistorial } = await supabase
      .from('historial_cuentas')
      .insert([{
        cliente_id: clienteSeleccionado.id,
        tipo,
        monto,
        descripcion: descripcionMov.trim() || (tipo === 'fiado' ? 'Nuevo fiado / deuda' : 'Pago parcial o total')
      }])

    if (!errorHistorial) {
      setMontoMovimiento('')
      setDescripcionMov('')
      const clienteActualizado = { ...clienteSeleccionado, saldo_actual: nuevoSaldo }
      setClienteSeleccionado(clienteActualizado)
      abrirCliente(clienteActualizado)
      cargarClientes()
    }
  }

  const eliminarCliente = async (id: string) => {
    if (!confirm('¿Seguro querés eliminar esta cuenta y todo su historial?')) return
    const { error } = await supabase.from('clientes_cuentas').delete().eq('id', id)
    if (!error) {
      setClienteSeleccionado(null)
      cargarClientes()
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono && c.telefono.includes(busqueda))
  )

  const deudaTotalGlobal = clientes.reduce((acc, c) => c.saldo_actual > 0 ? acc + c.saldo_actual : acc, 0)

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
              <BookOpen className="text-indigo-600" size={26} /> Cuentas Corrientes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Control de clientes, deudas y pagos registrados</p>
          </div>
        </div>

        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-sm transition-all"
        >
          <UserPlus size={18} />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* TARJETA DE RESUMEN GLOBAL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Deuda Total Acumulada</p>
            <p className="text-2xl font-black text-rose-600">${deudaTotalGlobal.toLocaleString('es-AR')}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total de Cuentas</p>
            <p className="text-2xl font-black text-slate-800">{clientes.length} clientes</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <BookOpen size={24} />
          </div>
        </div>
      </div>

      {/* LISTADO DE CLIENTES */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
            Listado de Cuentas <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">{clientesFiltrados.length}</span>
          </h2>

          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Buscar por nombre o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          </div>
        </div>

        {cargando ? (
          <div className="text-center py-12">
            <p className="text-sm text-slate-400 animate-pulse font-medium">Cargando cuentas corrientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto text-slate-300 mb-2" size={42} />
            <p className="text-slate-500 text-sm font-medium">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Teléfono</th>
                  <th className="py-3 px-4 text-right">Saldo Deudor</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {clientesFiltrados.map((cliente) => {
                  const tieneDeuda = cliente.saldo_actual > 0
                  return (
                    <tr 
                      key={cliente.id} 
                      onClick={() => abrirCliente(cliente)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-800">{cliente.nombre}</td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {cliente.telefono ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <Phone size={13} className="text-slate-400" /> {cliente.telefono}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Sin teléfono</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-block font-black text-sm sm:text-base ${tieneDeuda ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ${cliente.saldo_actual.toLocaleString('es-AR')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-block bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs">
                          Ver Cuenta &rarr;
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALLE / HISTORIAL / MOVIMIENTOS */}
      {clienteSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{clienteSeleccionado.nombre}</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Saldo actual: <span className={`font-black ${clienteSeleccionado.saldo_actual > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ${clienteSeleccionado.saldo_actual.toLocaleString('es-AR')}
                  </span>
                </p>
              </div>
              <button onClick={() => setClienteSeleccionado(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Registrar Transacción Manual</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Monto ($)"
                  value={montoMovimiento}
                  onChange={(e) => setMontoMovimiento(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none font-semibold"
                />
                <input
                  type="text"
                  placeholder="Detalle (Ej: Varios / Fiado extra)"
                  value={descripcionMov}
                  onChange={(e) => setDescripcionMov(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => registrarMovimiento('fiado')} className="bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                  <PlusCircle size={16} /> + Fiar (Deuda)
                </button>
                <button onClick={() => registrarMovimiento('pago')} className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all">
                  <MinusCircle size={16} /> Registrar Pago
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <History size={14} /> Historial de Movimientos
              </div>

              {cargandoMovs ? (
                <p className="text-center text-xs text-slate-400 py-6 animate-pulse font-medium">Cargando historial...</p>
              ) : movimientos.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-6 bg-slate-50 rounded-xl font-medium">No hay movimientos registrados.</p>
              ) : (
                movimientos.map((m) => {
                  const esVenta = m.tipo === 'venta'
                  return (
                    <div key={m.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {esVenta && <ShoppingCart size={13} className="text-indigo-600" />}
                          {m.descripcion}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{new Date(m.created_at).toLocaleString('es-AR')}</p>
                      </div>
                      <span className={`font-black text-sm ${m.tipo === 'pago' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.tipo === 'pago' ? '-' : '+'}${m.monto.toLocaleString('es-AR')}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
              <button onClick={() => eliminarCliente(clienteSeleccionado.id)} className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1 p-1">
                <Trash2 size={15} /> Eliminar Cliente
              </button>
              <button onClick={() => setClienteSeleccionado(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO CLIENTE */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Nuevo Cliente</h2>
            <p className="text-xs text-slate-500 mb-4 font-medium">Ingresá los datos para abrir su cuenta corriente.</p>
            
            <form onSubmit={crearCliente} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Teléfono (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 3512345678"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setModalNuevo(false)} className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-xs">
                  Cancelar
                </button>
                <button type="submit" className="w-1/2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-xs shadow-sm">
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}