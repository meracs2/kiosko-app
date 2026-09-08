'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Search, BookOpen, PlusCircle, MinusCircle, History, X, Trash2 } from 'lucide-react'

type ClienteCuenta = {
  id: string
  nombre: string
  telefono: string | null
  saldo_actual: number
}

type Movimiento = {
  id: string
  tipo: 'fiado' | 'pago'
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

    // Calcular nuevo saldo (Si es fiado suma, si es pago resta)
    const nuevoSaldo = tipo === 'fiado' 
      ? clienteSeleccionado.saldo_actual + monto 
      : clienteSeleccionado.saldo_actual - monto

    // 1. Actualizar saldo del cliente
    const { error: errorUpdate } = await supabase
      .from('clientes_cuentas')
      .update({ saldo_actual: nuevoSaldo })
      .eq('id', clienteSeleccionado.id)

    if (errorUpdate) {
      alert('Error al actualizar el saldo.')
      return
    }

    // 2. Registrar en el historial
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
      // Actualizar estado localmente
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
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 max-w-xl mx-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-100 transition shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cuentas Corrientes</h1>
            <p className="text-xs text-slate-500 font-medium">Control de deudas con doble columna</p>
          </div>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-semibold text-sm shadow-md shadow-indigo-500/20 transition active:scale-95"
        >
          <UserPlus size={18} />
          <span>Nuevo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition shadow-sm"
        />
      </div>

      {/* Listado en Doble Columna Principal */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden mb-6">
        {/* Cabecera de la Tabla */}
        <div className="grid grid-cols-2 bg-slate-100/70 px-5 py-3 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <div>Cliente</div>
          <div className="text-right">Monto Deudor</div>
        </div>

        {cargando ? (
          <p className="text-center text-sm text-slate-400 py-10 animate-pulse">Cargando cuentas...</p>
        ) : clientesFiltrados.length === 0 ? (
          <div className="p-8 text-center">
            <BookOpen size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">No se encontraron clientes</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {clientesFiltrados.map((cliente) => (
              <div
                key={cliente.id}
                onClick={() => abrirCliente(cliente)}
                className="grid grid-cols-2 px-5 py-3.5 items-center hover:bg-indigo-50/40 transition cursor-pointer"
              >
                <div>
                  <h2 className="font-bold text-slate-800 text-sm">{cliente.nombre}</h2>
                  <p className="text-[11px] text-slate-400">
                    {cliente.telefono || 'Sin teléfono'}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-base font-black ${cliente.saldo_actual > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ${cliente.saldo_actual.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL DETALLE / HISTORIAL / MODIFICAR SALDO */}
      {clienteSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="flex justify-between items-start border-b pb-3 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">{clienteSeleccionado.nombre}</h2>
                <p className="text-xs text-slate-400">Saldo actual: <span className={`font-bold ${clienteSeleccionado.saldo_actual > 0 ? 'text-red-600' : 'text-emerald-600'}`}>${clienteSeleccionado.saldo_actual.toLocaleString('es-AR')}</span></p>
              </div>
              <button
                onClick={() => setClienteSeleccionado(null)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Acciones de Modificación (Sumar Deuda / Registrar Pago) */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 mb-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Registrar Movimiento</p>
              <input
                type="number"
                placeholder="Monto ($)"
                value={montoMovimiento}
                onChange={(e) => setMontoMovimiento(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder="Detalle (Ej: Gaseosa + Pan)"
                value={descripcionMov}
                onChange={(e) => setDescripcionMov(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => registrarMovimiento('fiado')}
                  className="bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1 transition"
                >
                  <PlusCircle size={15} /> + Fiar (Deuda)
                </button>
                <button
                  onClick={() => registrarMovimiento('pago')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1 transition"
                >
                  <MinusCircle size={15} /> Registrar Pago
                </button>
              </div>
            </div>

            {/* Historial de Movimientos */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                <History size={14} /> Historial de Movimientos
              </div>

              {cargandoMovs ? (
                <p className="text-center text-xs text-slate-400 py-4 animate-pulse">Cargando historial...</p>
              ) : movimientos.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4 bg-slate-50 rounded-xl">No hay movimientos registrados.</p>
              ) : (
                movimientos.map((m) => (
                  <div key={m.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-800">{m.descripcion}</p>
                      <p className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleString('es-AR')}</p>
                    </div>
                    <span className={`font-black ${m.tipo === 'fiado' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {m.tipo === 'fiado' ? '+' : '-'}${m.monto.toLocaleString('es-AR')}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-3 border-t flex justify-between items-center">
              <button
                onClick={() => eliminarCliente(clienteSeleccionado.id)}
                className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 p-1"
              >
                <Trash2 size={14} /> Eliminar Cliente
              </button>
              <button
                onClick={() => setClienteSeleccionado(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO CLIENTE */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border border-slate-100">
            <h2 className="text-lg font-black text-slate-800 mb-1">Nuevo Cliente</h2>
            <p className="text-xs text-slate-500 mb-4">Ingresá los datos para abrir su cuenta corriente.</p>
            
            <form onSubmit={crearCliente} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nombre y Apellido</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Teléfono (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: 3512345678"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-2xl font-semibold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl font-semibold text-sm shadow-md shadow-indigo-500/20 transition"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}