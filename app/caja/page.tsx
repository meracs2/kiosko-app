'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Calendar, Banknote, CreditCard, QrCode, Calculator, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Lock, FileText, TrendingDown } from 'lucide-react'

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

// Nueva interfaz para los gastos/movimientos
interface Movimiento {
  id: string
  created_at?: string
  fecha?: string
  tipo_movimiento: string
  descripcion: string
  monto: number
}

export default function CajaPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null)
  const [kioskoId, setKioskoId] = useState<string | null>(null)
  
  const [detallesMap, setDetallesMap] = useState<{ [key: string]: DetalleVenta[] }>({})
  const [ultimoCierre, setUltimoCierre] = useState<number>(0)

  const [manualEfectivo, setManualEfectivo] = useState('')
  const [manualTarjeta, setManualTarjeta] = useState('')
  const [manualTransf, setManualTransf] = useState('')

  const fetchDatosCaja = async (idKiosko: string) => {
    setCargando(true)
    
    // 1. Traemos las ventas
    const resVentas = await supabase
      .from('ventas')
      .select('*')
      .eq('kiosko_id', idKiosko)
      .order('created_at', { ascending: false })

    // 2. Traemos los movimientos
    const resMovimientos = await supabase
      .from('movimientos_caja')
      .select('*')
      .order('created_at', { ascending: false }) 

    if (resVentas.error) {
      console.error('Error al cargar ventas:', resVentas.error)
    } else if (resVentas.data) {
      setVentas(resVentas.data)
    }

    if (resMovimientos.error) {
      console.error('Error al cargar movimientos:', resMovimientos.error)
    } else if (resMovimientos.data) {
      setMovimientos(resMovimientos.data)
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

    // REINICIO AUTOMÁTICO A LAS 00:00 HS DE HOY
    const timeoutId = window.setTimeout(() => {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)
      setUltimoCierre(hoy.getTime())
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [])

  // Filtrar datos por el turno actual
  const ventasDelTurno = ventas.filter((v) => new Date(v.created_at).getTime() > ultimoCierre)
  const gastosDelTurno = movimientos.filter((m) => {
    const fechaMs = new Date(m.created_at || m.fecha || '').getTime()
    return fechaMs > ultimoCierre && m.tipo_movimiento === 'gasto'
  })

  // Cálculos de Ventas (Ingresos)
  const ventasEfectivo = ventasDelTurno.reduce((acc, v) => acc + Number(v.pago_efectivo ?? (v.metodo_pago === 'efectivo' ? v.total : 0)), 0)
  const sisTarjeta = ventasDelTurno.reduce((acc, v) => acc + Number(v.pago_tarjeta ?? (v.metodo_pago === 'tarjeta' ? v.total : 0)), 0)
  const sisTransf = ventasDelTurno.reduce((acc, v) => acc + Number(v.pago_transferencia ?? (v.metodo_pago === 'transferencia' ? v.total : 0)), 0)
  
  const ingresosBrutos = ventasEfectivo + sisTarjeta + sisTransf

  // Cálculos de Gastos
  const totalGastos = gastosDelTurno.reduce((acc, m) => acc + Number(m.monto), 0) // El monto ya viene en negativo

  // Cálculos Netos del Sistema
  const sisEfectivo = ventasEfectivo + totalGastos // Se suma porque totalGastos es negativo
  const sisTotal = sisEfectivo + sisTarjeta + sisTransf

  // Valores del arqueo manual
  const valEfectivo = parseFloat(manualEfectivo) || 0
  const valTarjeta = parseFloat(manualTarjeta) || 0
  const valTransf = parseFloat(manualTransf) || 0
  const totalManual = valEfectivo + valTarjeta + valTransf

  // Diferencia general (Debería ser evaluada principalmente sobre el efectivo físico)
  const diferenciaEfectivo = valEfectivo - sisEfectivo
  const diferenciaTotal = totalManual - sisTotal

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
    
    csvContent += `Efectivo Neto Esperado,$${sisEfectivo} (Ventas: $${ventasEfectivo} - Gastos: $${Math.abs(totalGastos)})\n`;
    csvContent += `Tarjeta Sistema,$${sisTarjeta}\n`;
    csvContent += `Transferencia Sistema,$${sisTransf}\n\n`;

    csvContent += "ARQUEO MANUAL / FISICO\n";
    csvContent += `Efectivo Físico en Caja,$${valEfectivo}\n`;
    csvContent += `Total Tarjeta,$${valTarjeta}\n`;
    csvContent += `Total Transferencias,$${valTransf}\n`;
    csvContent += `Total Ingresado Manualmente,$${totalManual}\n`;
    csvContent += `Diferencia de Efectivo (Sobrante/Faltante),$${diferenciaEfectivo}\n\n`;

    if (gastosDelTurno.length > 0) {
      csvContent += "DETALLE DE GASTOS DEL TURNO\n";
      csvContent += "Descripción,Total\n";
      gastosDelTurno.forEach((g) => {
        csvContent += `"${g.descripcion}",$${g.monto}\n`;
      });
      csvContent += "\n";
    }

    csvContent += "DETALLE DE VENTAS DEL TURNO\n";
    csvContent += "ID Venta,Fecha y Hora,Método,Total\n";
    ventasDelTurno.forEach((v) => {
      const fechaVenta = new Date(v.created_at).toLocaleString();
      csvContent += `"${v.id}","${fechaVenta}","${v.metodo_pago}",$${v.total}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Cierre_Turno_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleCerrarTurno = () => {
    if (ventasDelTurno.length === 0 && gastosDelTurno.length === 0) {
      alert('No hay ventas ni gastos registrados en este turno para cerrar.')
      return
    }
    if (!window.confirm('¿Estás seguro de cerrar el turno actual?')) return

    const ahoraMs = Date.now()
    localStorage.setItem('kiosko_ultimo_cierre', ahoraMs.toString())
    setUltimoCierre(ahoraMs)
    alert('¡Turno cerrado con éxito!')
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
    alert('¡Caja e inputs manuales reiniciados con éxito!')
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
            <p className="text-xs text-gray-500">Resumen de ventas y gastos del turno</p>
          </div>
        </div>

        <button
          onClick={() => kioskoId && fetchDatosCaja(kioskoId)}
          className="bg-white border text-gray-700 p-2.5 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Arqueo, Totales y Cierre */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Resumen del Sistema */}
          <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-md">
            <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Total Neto en Caja
            </div>
            <div className="text-3xl font-extrabold text-green-400 mb-4">
              ${sisTotal.toLocaleString()}
            </div>
            
            {/* Desglose Ingresos / Gastos */}
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

          {/* Arqueo Manual */}
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
              <button
                onClick={handleCerrarTurno}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <Lock size={16} />
                Cerrar Turno
              </button>

              <button
                onClick={handleGuardarExcel}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <FileText size={16} />
                Guardar Archivo Excel
              </button>

              <button
                onClick={handleReiniciarCaja}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2 text-sm"
              >
                <RefreshCw size={16} />
                Reiniciar Inputs
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Historial de Ventas y Gastos */}
        <div className="md:col-span-7 bg-white rounded-2xl shadow-sm p-5">
          
          {/* SECCIÓN DE GASTOS */}
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

          {/* SECCIÓN DE VENTAS */}
          <h2 className="font-bold text-gray-700 mb-4 border-b pb-3 flex items-center gap-2 text-sm mt-2">
            <Calendar size={18} />
            Ventas del Turno ({ventasDelTurno.length})
          </h2>

          {ventasDelTurno.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No hay ventas registradas.</p>
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
                          {new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
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

      </div>
    </main>
  )
}