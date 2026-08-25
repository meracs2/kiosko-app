// app/caja/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Calendar, Banknote, CreditCard, QrCode, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react'

interface Venta {
  id: string
  created_at: string
  total: number
  metodo_pago: string
}

export default function CajaPage() {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [cargando, setCargando] = useState(true)

  // Estados para el ingreso manual de arqueo
  const [manualEfectivo, setManualEfectivo] = useState('')
  const [manualTarjeta, setManualTarjeta] = useState('')
  const [manualTransf, setManualTransf] = useState('')

  const fetchVentas = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('ventas')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setVentas(data)
    setCargando(false)
  }

  useEffect(() => {
    fetchVentas()
  }, [])

  // Totales registrados por el sistema
  const sisEfectivo = ventas
    .filter((v) => v.metodo_pago === 'efectivo')
    .reduce((acc, v) => acc + Number(v.total), 0)

  const sisTarjeta = ventas
    .filter((v) => v.metodo_pago === 'tarjeta')
    .reduce((acc, v) => acc + Number(v.total), 0)

  const sisTransf = ventas
    .filter((v) => v.metodo_pago === 'transferencia')
    .reduce((acc, v) => acc + Number(v.total), 0)

  const sisTotal = sisEfectivo + sisTarjeta + sisTransf

  // Totales ingresados manualmente
  const valEfectivo = parseFloat(manualEfectivo) || 0
  const valTarjeta = parseFloat(manualTarjeta) || 0
  const valTransf = parseFloat(manualTransf) || 0
  const totalManual = valEfectivo + valTarjeta + valTransf

  // Diferencia (Positivo: sobrante / Negativo: faltante)
  const diferencia = totalManual - sisTotal

  return (
    <main className="min-h-screen bg-gray-100 p-4 max-w-lg mx-auto pb-12">
      {/* Header Integrado */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Caja y Arqueo</h1>
            <p className="text-xs text-gray-500">Conteo manual y conciliación</p>
          </div>
        </div>

        <button
          onClick={fetchVentas}
          className="bg-white border text-gray-700 p-2.5 rounded-xl shadow-sm hover:bg-gray-50 active:scale-95 transition"
        >
          <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Resumen del Sistema */}
      <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-md mb-6">
        <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
          Total del Sistema (Ventas Registradas)
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

      {/* Formulario de Cierre / Arqueo Manual */}
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

        {/* Resultado del Arqueo */}
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
                {diferencia === 0 ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
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
      </div>

      {/* Historial de Ventas Registradas */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 flex items-center gap-2 text-sm">
          <Calendar size={18} />
          Últimas Ventas Registradas
        </h2>

        {ventas.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No hay ventas registradas.</p>
        ) : (
          <div className="divide-y max-h-60 overflow-y-auto">
            {ventas.map((v) => (
              <div key={v.id} className="py-2.5 flex justify-between items-center">
                <div>
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
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}