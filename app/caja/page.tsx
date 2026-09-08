// app/caja/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Calendar, Banknote, CreditCard, QrCode, Calculator, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Lock } from 'lucide-react'

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

export default function CajaPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cargando, setCargando] = useState(true)
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null)
  const [kioskoId, setKioskoId] = useState<string | null>(null)
  
  // Mapeo seguro para guardar los ítems de cada venta según su ID
  const [detallesMap, setDetallesMap] = useState<{ [key: string]: DetalleVenta[] }>({})

  // Fecha del último cierre guardada en el navegador (en milisegundos)
  const [ultimoCierre, setUltimoCierre] = useState<number>(0)

  // Estados para el ingreso manual de arqueo
  const [manualEfectivo, setManualEfectivo] = useState('')
  const [manualTarjeta, setManualTarjeta] = useState('')
  const [manualTransf, setManualTransf] = useState('')

  const fetchVentas = async (idKiosko: string) => {
    setCargando(true)
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .eq('kiosko_id', idKiosko)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar ventas:', error)
    } else if (data) {
      setVentas(data)
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
        fetchVentas(perfil.kiosko_id)
      }
    }
    inicializarKiosko()

    const cierreGuardado = localStorage.getItem('kiosko_ultimo_cierre')
    if (cierreGuardado) {
      setUltimoCierre(Number(cierreGuardado))
    }
  }, [])

  // Filtramos las ventas ocurridas DESPUÉS del último cierre de caja
  const ventasDelTurno = ventas.filter((v) => {
    const fechaVentaMs = new Date(v.created_at).getTime()
    return fechaVentaMs > ultimoCierre
  })

  // Totales del sistema
  const sisEfectivo = ventasDelTurno.reduce(
    (acc, v) => acc + Number(v.pago_efectivo ?? (v.metodo_pago === 'efectivo' ? v.total : 0)),
    0
  )
  const sisTarjeta = ventasDelTurno.reduce(
    (acc, v) => acc + Number(v.pago_tarjeta ?? (v.metodo_pago === 'tarjeta' ? v.total : 0)),
    0
  )
  const sisTransf = ventasDelTurno.reduce(
    (acc, v) => acc + Number(v.pago_transferencia ?? (v.metodo_pago === 'transferencia' ? v.total : 0)),
    0
  )

  const sisTotal = sisEfectivo + sisTarjeta + sisTransf

  // Totales ingresados manualmente en el arqueo físico
  const valEfectivo = parseFloat(manualEfectivo) || 0
  const valTarjeta = parseFloat(manualTarjeta) || 0
  const valTransf = parseFloat(manualTransf) || 0
  const totalManual = valEfectivo + valTarjeta + valTransf

  const diferencia = totalManual - sisTotal

  const toggleExpandir = async (id: string) => {
    if (ventaExpandida === id) {
      setVentaExpandida(null)
    } else {
      setVentaExpandida(id)
      
      // Si ya tenemos los ítems en memoria, no volvemos a consultar
      if (!detallesMap[id]) {
        let itemsEncontrados: DetalleVenta[] = []

        // Intento 1: Buscar usando 'venta_id'
        const res1 = await supabase
          .from('detalle_ventas')
          .select('*')
          .eq('venta_id', id)
        
        if (res1.data && res1.data.length > 0) {
          itemsEncontrados = res1.data
        } else {
          // Intento 2: Buscar usando 'id_venta' por si tu columna se llama así
          const res2 = await supabase
            .from('detalle_ventas')
            .select('*')
            .eq('id_venta', id)
          
          if (res2.data && res2.data.length > 0) {
            itemsEncontrados = res2.data
          } else {
            // Intento 3: Buscar usando 'venta' a secas
            const res3 = await supabase
              .from('detalle_ventas')
              .select('*')
              .eq('venta', id)
            
            if (res3.data && res3.data.length > 0) {
              itemsEncontrados = res3.data
            }
          }
        }

        // Guardamos el resultado en el estado (aunque esté vacío para saber que ya se consultó)
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
    csvContent += `Total General,$${sisTotal}\n`;
    csvContent += `Efectivo Sistema,$${sisEfectivo}\n`;
    csvContent += `Tarjeta Sistema,$${sisTarjeta}\n`;
    csvContent += `Transferencia Sistema,$${sisTransf}\n\n`;

    csvContent += "ARQUEO MANUAL / FISICO\n";
    csvContent += `Efectivo en Caja,$${valEfectivo}\n`;
    csvContent += `Total Tarjeta,$${valTarjeta}\n`;
    csvContent += `Total Transferencias,$${valTransf}\n`;
    csvContent += `Total Ingresado,$${totalManual}\n`;
    csvContent += `Diferencia (Sobrante/Faltante),$${diferencia}\n\n`;

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

  const handleCierreCaja = () => {
    if (ventasDelTurno.length === 0) {
      alert('No hay ventas registradas en este turno para cerrar.')
      return
    }

    if (!window.confirm('¿Estás seguro de realizar el Cierre de Caja? Esto descargará el Excel y reiniciará los contadores a $0.')) return

    descargarReporteExcelLocal()
    const ahoraMs = Date.now()
    localStorage.setItem('kiosko_ultimo_cierre', ahoraMs.toString())
    setUltimoCierre(ahoraMs)

    setManualEfectivo('')
    setManualTarjeta('')
    setManualTransf('')
    alert('¡Caja cerrada y contadores reiniciados con éxito!')
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 max-w-lg mx-auto pb-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Caja Diaria</h1>
            <p className="text-xs text-gray-500">Resumen de ventas y cierre de turno</p>
          </div>
        </div>

        <button
          onClick={() => kioskoId && fetchVentas(kioskoId)}
          className="bg-white border text-gray-700 p-2.5 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition"
        >
          <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Resumen del Sistema */}
      <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-md mb-6">
        <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
          Total del Turno Actual
        </div>
        <div className="text-3xl font-extrabold text-green-400">
          ${sisTotal.toLocaleString()}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-800 text-xs">
          <div>
            <span className="text-gray-400 block">Efec:</span>
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
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2 text-sm">
          <Calculator size={18} />
          Conteo Manual (Cierre Físico)
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <Banknote size={14} className="text-emerald-600" /> Efectivo en caja ($)
            </label>
            <input
              type="number"
              placeholder="0.00"
              value={manualEfectivo}
              onChange={(e) => setManualEfectivo(e.target.value)}
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
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
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
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
              className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm font-semibold focus:ring-2 focus:ring-purple-500 outline-none"
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
              className={`p-3 rounded-lg flex items-center justify-between text-xs font-bold ${
                diferencia === 0
                  ? 'bg-green-100 text-green-800'
                  : diferencia > 0
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {diferencia === 0 ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>
                  {diferencia === 0
                    ? 'Caja cuadrada perfectamente'
                    : diferencia > 0
                    ? 'Sobrante en caja:'
                    : 'Faltante en caja:'}
                </span>
              </div>
              <span className="text-sm font-extrabold">
                ${Math.abs(diferencia).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleCierreCaja}
          className="w-full mt-5 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl shadow transition active:scale-95 flex items-center justify-center gap-2 text-sm"
        >
          <Lock size={16} />
          Cerrar Turno y Reiniciar Caja
        </button>
      </div>

      {/* Historial de Ventas */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2 text-sm">
          <Calendar size={18} />
          Ventas de este Turno ({ventasDelTurno.length})
        </h2>

        {ventasDelTurno.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No hay ventas registradas en este turno.</p>
        ) : (
          <div className="divide-y max-h-80 overflow-y-auto">
            {ventasDelTurno.map((v) => {
              const estaExpandida = ventaExpandida === v.id
              const itemsVenta = detallesMap[v.id]

              return (
                <div key={v.id} className="py-2.5">
                  <button
                    onClick={() => toggleExpandir(v.id)}
                    className="w-full flex justify-between items-center text-left focus:outline-none"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 text-sm">
                          ${Number(v.total).toLocaleString()}
                        </p>
                        <span
                          className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
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
                    <div className="mt-2 pl-3 border-l-2 border-blue-500 bg-gray-50 p-2.5 rounded-r-lg space-y-1">
                      {!itemsVenta ? (
                        <p className="text-xs text-gray-400 py-1">Cargando productos...</p>
                      ) : itemsVenta.length === 0 ? (
                        <p className="text-xs text-gray-400 py-1">Esta venta no registró productos asociados en detalle_ventas.</p>
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
    </main>
  )
}