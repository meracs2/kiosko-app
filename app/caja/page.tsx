'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Calendar, Banknote, CreditCard, QrCode, Calculator, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Lock, FileText, TrendingDown, History, Eye } from 'lucide-react'

interface DetalleVenta {
  id: string
  nombre_producto?: string
  producto_nombre?: string
  cantidad: number
  precio_unitario: number
}

interface Venta {
  id: string
  created_at: string
  total: number
  metodo_pago: string
  pago_efectivo?: number
  pago_tarjeta?: number
  pago_transferencia?: number
}

interface Movimiento {
  id: string
  created_at?: string
  fecha?: string
  tipo_movimiento: string
  descripcion: string
  monto: number
}

interface CierreHistorico {
  id: string
  created_at: string
  total_neto: number
  efectivo_manual: number
  diferencia_efectivo: number
  inicio_turno?: string
  fin_turno?: string
}

export default function CajaPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [historialCierres, setHistorialCierres] = useState<CierreHistorico[]>([])
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  
  const [cierreSeleccionado, setCierreSeleccionado] = useState<CierreHistorico | null>(null)
  const [cargando, setCargando] = useState(true)
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null)
  const [kioskoId, setKioskoId] = useState<string | null>(null)
  
  const [detallesMap, setDetallesMap] = useState<{ [key: string]: DetalleVenta[] }>({})
  
  // FUENTE DE LA VERDAD SUPABASE: Almacena el timestamp del último cierre registrado en la base de datos
  const [ultimoCierreTime, setUltimoCierreTime] = useState<number>(0)

  const [manualEfectivo, setManualEfectivo] = useState('')
  const [manualTarjeta, setManualTarjeta] = useState('')
  const [manualTransf, setManualTransf] = useState('')

  // CONSULTAR DATOS DIRECTAMENTE DESDE SUPABASE (Filtrado estricto por kiosko_id)
  const fetchDatosCaja = async (idKiosko: string) => {
    setCargando(true)
    
    const resVentas = await supabase
      .from('ventas')
      .select('*')
      .eq('kiosko_id', idKiosko)
      .order('created_at', { ascending: false })

    const resMovimientos = await supabase
      .from('movimientos_caja')
      .select('*')
      .eq('kiosko_id', idKiosko)
      .order('created_at', { ascending: false }) 

    // Consultamos el historial de cierres ordenados del más reciente al más antiguo
    const resCierres = await supabase
      .from('cierres_caja')
      .select('*')
      .eq('kiosko_id', idKiosko)
      .order('created_at', { ascending: false })

    if (resVentas.data) setVentas(resVentas.data)
    if (resMovimientos.data) setMovimientos(resMovimientos.data)

    if (resCierres.data && resCierres.data.length > 0) {
      setHistorialCierres(resCierres.data)
      
      // El último cierre guardado en Supabase marca el límite del turno actual
      const ultimoCierreReg = resCierres.data[0]
      const tiempoFin = new Date(ultimoCierreReg.fin_turno || ultimoCierreReg.created_at).getTime()
      setUltimoCierreTime(tiempoFin)
    } else {
      setHistorialCierres([])
      
      // Si la tabla cierres_caja está vacía, por seguridad arrancamos a las 00:00 hs de hoy
      // para evitar mostrar meses enteros de pruebas viejas.
      const hoyInicio = new Date()
      hoyInicio.setHours(0, 0, 0, 0)
      setUltimoCierreTime(hoyInicio.getTime())
    }

    setCargando(false)
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
        fetchDatosCaja(perfil.kiosko_id)
      }
    }
    inicializarKiosko()
  }, [])

  // Filtrar datos estrictamente usando el último cierre obtenido de Supabase
  const ventasDelTurno = cierreSeleccionado 
    ? ventas.filter((v) => {
        const t = new Date(v.created_at).getTime()
        const inicio = cierreSeleccionado.inicio_turno ? new Date(cierreSeleccionado.inicio_turno).getTime() : 0
        const fin = new Date(cierreSeleccionado.created_at).getTime()
        return t >= inicio && t <= fin
      })
    : ventas.filter((v) => new Date(v.created_at).getTime() > ultimoCierreTime)

  const gastosDelTurno = cierreSeleccionado
    ? movimientos.filter((m) => {
        const fechaMs = new Date(m.created_at || m.fecha || '').getTime()
        const inicio = cierreSeleccionado.inicio_turno ? new Date(cierreSeleccionado.inicio_turno).getTime() : 0
        const fin = new Date(cierreSeleccionado.created_at).getTime()
        return fechaMs >= inicio && fechaMs <= fin && m.tipo_movimiento === 'gasto'
      })
    : movimientos.filter((m) => {
        const fechaMs = new Date(m.created_at || m.fecha || '').getTime()
        return fechaMs > ultimoCierreTime && m.tipo_movimiento === 'gasto'
      })

  const ventasEfectivo = ventasDelTurno.reduce((acc, v) => acc + Number(v.pago_efectivo ?? (v.metodo_pago === 'efectivo' ? v.total : 0)), 0)
  const sisTarjeta = ventasDelTurno.reduce((acc, v) => acc + Number(v.pago_tarjeta ?? (v.metodo_pago === 'tarjeta' ? v.total : 0)), 0)
  const sisTransf = ventasDelTurno.reduce((acc, v) => acc + Number(v.pago_transferencia ?? (v.metodo_pago === 'transferencia' ? v.total : 0)), 0)
  
  const ingresosBrutos = ventasEfectivo + sisTarjeta + sisTransf
  const totalGastos = gastosDelTurno.reduce((acc, m) => acc + Number(m.monto), 0)

  const sisEfectivo = ventasEfectivo + totalGastos 
  const sisTotal = sisEfectivo + sisTarjeta + sisTransf

  const valEfectivo = parseFloat(manualEfectivo) || 0
  const valTarjeta = parseFloat(manualTarjeta) || 0
  const valTransf = parseFloat(manualTransf) || 0
  const totalManual = valEfectivo + valTarjeta + valTransf

  const diferenciaEfectivo = valEfectivo - sisEfectivo

  const toggleExpandir = async (id: string) => {
    if (ventaExpandida === id) {
      setVentaExpandida(null)
    } else {
      setVentaExpandida(id)
      
      if (!detallesMap[id]) {
        let itemsEncontrados: DetalleVenta[] = []
        const res1 = await supabase.from('detalle_ventas').select('*').eq('venta_id', id)
        
        if (res1.data && res1.data.length > 0) itemsEncontrados = res1.data
        else {
          const res2 = await supabase.from('detalle_ventas').select('*').eq('id_venta', id)
          if (res2.data && res2.data.length > 0) itemsEncontrados = res2.data
          else {
            const res3 = await supabase.from('detalle_ventas').select('*').eq('venta', id)
            if (res3.data && res3.data.length > 0) itemsEncontrados = res3.data
          }
        }
        setDetallesMap((prev) => ({ ...prev, [id]: itemsEncontrados }))
      }
    }
  }

  const descargarReporteExcelLocal = () => {
    const fechaHoraActual = new Date().toLocaleString()
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    csvContent += "REPORTE DE CIERRE DE TURNO - KIOSKO POS\n";
    csvContent += `Fecha y Hora de Cierre:, "${fechaHoraActual}"\n\n`;
    
    csvContent += "RESUMEN DEL SISTEMA\n";
    csvContent += `Ingresos por Ventas,$${ingresosBrutos}\n`;
    csvContent += `Gastos (Proveedores/Retiros),-$${Math.abs(totalGastos)}\n`;
    csvContent += `TOTAL NETO ESPERADO,$${sisTotal}\n\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cierre_Turno_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // CIERRE ESTRICTAMENTE MANUAL: Guarda en Supabase y actualiza leyendo la base de datos
  const handleCerrarTurno = async () => {
    if (ventasDelTurno.length === 0 && gastosDelTurno.length === 0) {
      alert('No hay ventas ni gastos registrados en este turno para cerrar.')
      return
    }
    if (!window.confirm('¿Estás seguro de cerrar el turno actual y guardarlo en Supabase?')) return

    const inicioTurnoFecha = new Date(ultimoCierreTime > 0 ? ultimoCierreTime : (ventas[ventas.length - 1]?.created_at || Date.now())).toISOString()
    const finTurnoFecha = new Date().toISOString()

    const { error } = await supabase.from('cierres_caja').insert({
      kiosko_id: kioskoId,
      ingresos_ventas: ingresosBrutos,
      total_gastos: totalGastos,
      total_neto: sisTotal,
      efectivo_sistema: sisEfectivo,
      tarjeta_sistema: sisTarjeta,
      transferencia_sistema: sisTransf,
      efectivo_manual: valEfectivo,
      tarjeta_manual: valTarjeta,
      transferencia_manual: valTransf,
      diferencia_efectivo: diferenciaEfectivo,
      total_manual: totalManual,
      inicio_turno: inicioTurnoFecha,
      fin_turno: finTurnoFecha
    })

    if (error) {
      alert(`Error al guardar el cierre en Supabase: ${error.message}`)
      return
    }

    setCierreSeleccionado(null)

    // Recargamos los datos directamente desde Supabase para actualizar el último cierre
    if (kioskoId) {
      await fetchDatosCaja(kioskoId)
    }

    alert('¡Turno cerrado y guardado en Supabase con éxito!')
  }

  const handleGuardarExcel = () => {
    if (ventasDelTurno.length === 0 && gastosDelTurno.length === 0) {
      alert('No hay movimientos en este turno para exportar.')
      return
    }
    descargarReporteExcelLocal()
  }

  const handleReiniciarCaja = () => {
    if (!window.confirm('¿Estás seguro de reiniciar los contadores manuales de caja?')) return
    setManualEfectivo('')
    setManualTarjeta('')
    setManualTransf('')
    alert('¡Inputs manuales reiniciados con éxito!')
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8 max-w-md md:max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6 bg-white md:bg-transparent p-4 md:p-0 rounded-2xl shadow-sm md:shadow-none">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Caja Diaria</h1>
            <p className="text-xs text-gray-500">
              {cierreSeleccionado ? `Viendo cierre histórico (${new Date(cierreSeleccionado.created_at).toLocaleString()})` : 'Resumen de ventas y gastos del turno'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {cierreSeleccionado && (
            <button
              onClick={() => setCierreSeleccionado(null)}
              className="bg-amber-100 border border-amber-300 text-amber-800 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-200 transition flex items-center gap-1"
            >
              Volver al Turno Actual
            </button>
          )}
          <button
            onClick={() => kioskoId && fetchDatosCaja(kioskoId)}
            className="bg-white border text-gray-700 p-2.5 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Arqueo, Totales y Cierre */}
        <div className="md:col-span-5 space-y-6">
          
          <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-md">
            <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
              {cierreSeleccionado ? 'Total Neto Histórico' : 'Total Neto en Caja'}
            </div>
            <div className="text-3xl font-extrabold text-green-400 mb-4">
              ${sisTotal.toLocaleString()}
            </div>
            
            <div className="flex flex-col gap-1.5 pb-4 border-b border-gray-800 text-sm">
              <div className="flex justify-between items-center text-gray-300">
                <span>Ingresos por Ventas:</span>
                <span className="font-semibold">${ingresosBrutos.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-red-400">
                <span>Gastos / Proveedores:</span>
                <span className="font-semibold">-${Math.abs(totalGastos).toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
              <div>
                <span className="text-gray-400 block">Efec Neto:</span>
                <span className="font-bold">${sisEfectivo.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Tarj:</span>
                <span className="font-bold">${sisTarjeta.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Transf:</span>
                <span className="font-bold">${sisTransf.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-gray-700 mb-4 border-b pb-3 flex items-center gap-2 text-sm">
              <Calculator size={18} />
              Conteo Manual (Cierre Físico)
            </h2>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <Banknote size={14} className="text-emerald-600" /> Efectivo en caja ($)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={manualEfectivo}
                  onChange={(e) => setManualEfectivo(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-gray-50 text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <CreditCard size={14} className="text-blue-600" /> Total Tarjeta ($)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={manualTarjeta}
                  onChange={(e) => setManualTarjeta(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-gray-50 text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  <QrCode size={14} className="text-purple-600" /> Total Transferencias ($)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={manualTransf}
                  onChange={(e) => setManualTransf(e.target.value)}
                  className="w-full p-3 border rounded-xl bg-gray-50 text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            {(manualEfectivo || manualTarjeta || manualTransf) && (
              <div className="mt-4 pt-3 border-t">
                <div className="flex justify-between items-center mb-2 text-sm">
                  <span className="font-semibold text-gray-600">Total Ingresado:</span>
                  <span className="font-bold text-gray-800">${totalManual.toLocaleString()}</span>
                </div>

                <div
                  className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                    diferenciaEfectivo === 0
                      ? 'bg-green-100 text-green-800'
                      : diferenciaEfectivo > 0
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {diferenciaEfectivo === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>
                      {diferenciaEfectivo === 0
                        ? 'Efectivo cuadrado perfecto'
                        : diferenciaEfectivo > 0
                        ? 'Sobrante efectivo:'
                        : 'Faltante efectivo:'}
                    </span>
                  </div>
                  <span className="text-sm font-extrabold">
                    ${Math.abs(diferenciaEfectivo).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2.5 mt-5">
              {!cierreSeleccionado && (
                <button
                  onClick={handleCerrarTurno}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  <Lock size={16} />
                  Cerrar Turno y Guardar
                </button>
              )}

              <button
                onClick={handleGuardarExcel}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <FileText size={16} />
                Guardar Archivo Excel
              </button>

              <button
                onClick={() => setMostrarHistorial(!mostrarHistorial)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <History size={16} />
                {mostrarHistorial ? 'Ocultar Historial' : `Ver Historial de Cierres (${historialCierres.length})`}
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Historial de Cierres o Ventas del Turno */}
        <div className="md:col-span-7 bg-white rounded-2xl shadow-sm p-5">
          
          {mostrarHistorial ? (
            <div>
              <h2 className="font-bold text-indigo-600 mb-4 border-b pb-3 flex items-center gap-2 text-sm">
                <History size={18} />
                Historial de Cierres Guardados ({historialCierres.length})
              </h2>

              {historialCierres.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">No hay cierres guardados todavía.</p>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {historialCierres.map((cierre) => (
                    <div key={cierre.id} className="p-4 rounded-xl border bg-gray-50 flex justify-between items-center hover:border-indigo-300 transition">
                      <div>
                        <p className="text-xs font-semibold text-gray-500">
                          {new Date(cierre.created_at).toLocaleString('es-AR')}
                        </p>
                        <p className="text-sm font-bold text-gray-800 mt-0.5">
                          Total Neto: ${Number(cierre.total_neto).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-600">
                          Efectivo Físico: ${Number(cierre.efectivo_manual).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`text-xs px-2.5 py-1 rounded-lg font-bold ${Number(cierre.diferencia_efectivo) === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          Dif: ${Number(cierre.diferencia_efectivo).toLocaleString()}
                        </div>
                        <button
                          onClick={() => {
                            setCierreSeleccionado(cierre)
                            setMostrarHistorial(false)
                          }}
                          className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition"
                          title="Ver movimientos de este día"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {cierreSeleccionado && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-semibold text-amber-800">
                    Visualizando ventas del turno cerrado el: {new Date(cierreSeleccionado.created_at).toLocaleString()}
                  </span>
                  <button 
                    onClick={() => setCierreSeleccionado(null)}
                    className="text-amber-900 underline font-bold"
                  >
                    Salir
                  </button>
                </div>
              )}

              {gastosDelTurno.length > 0 && (
                <div className="mb-6">
                  <h2 className="font-bold text-red-600 mb-3 border-b border-red-100 pb-2 flex items-center gap-2 text-sm">
                    <TrendingDown size={18} />
                    Gastos / Salidas del Turno ({gastosDelTurno.length})
                  </h2>
                  <div className="space-y-2">
                    {gastosDelTurno.map(g => (
                      <div key={g.id} className="flex justify-between items-center bg-red-50 p-2.5 rounded-xl border border-red-100">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{g.descripcion}</p>
                          <span className="text-xs text-gray-500">
                            {new Date(g.created_at || g.fecha || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="font-bold text-red-600">
                          ${g.monto.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="font-bold text-gray-700 mb-4 border-b pb-3 flex items-center gap-2 text-sm mt-2">
                <Calendar size={18} />
                {cierreSeleccionado ? 'Ventas en este Cierre' : 'Ventas del Turno'} ({ventasDelTurno.length})
              </h2>

              {ventasDelTurno.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">No hay ventas registradas en este período.</p>
              ) : (
                <div className="divide-y max-h-[520px] overflow-y-auto pr-1">
                  {ventasDelTurno.map((v) => {
                    const estaExpandida = ventaExpandida === v.id
                    const itemsVenta = detallesMap[v.id]

                    return (
                      <div key={v.id} className="py-3">
                        <button
                          onClick={() => toggleExpandir(v.id)}
                          className="w-full flex justify-between items-center text-left focus:outline-none hover:bg-gray-50 p-2 rounded-xl transition"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-800 text-sm">
                                ${Number(v.total).toLocaleString()}
                              </p>
                              <span
                                className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                                  v.metodo_pago === 'efectivo'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : v.metodo_pago === 'tarjeta'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {v.metodo_pago}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(v.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} 
                              {itemsVenta ? ` (${itemsVenta.length} ítems)` : ' (Ver detalle)'}
                            </span>
                          </div>

                          <div className="text-gray-400">
                            {estaExpandida ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </button>

                        {estaExpandida && (
                          <div className="mt-2 ml-2 pl-3 border-l-2 border-blue-500 bg-gray-50 p-3 rounded-r-xl space-y-1.5">
                            {!itemsVenta ? (
                              <p className="text-xs text-gray-400 py-1">Cargando productos...</p>
                            ) : itemsVenta.length === 0 ? (
                              <p className="text-xs text-gray-400 py-1">Esta venta no registró detalle.</p>
                            ) : (
                              itemsVenta.map((item, idx) => (
                                <div key={item.id || idx} className="flex justify-between items-center text-xs">
                                  <span className="text-gray-700 font-medium">
                                    {item.cantidad ?? 1}x {item.nombre_producto ?? item.producto_nombre ?? 'Producto sin nombre'}
                                  </span>
                                  <span className="text-gray-500 font-semibold">
                                    ${((item.precio_unitario || 0) * (item.cantidad || 1)).toLocaleString()}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}