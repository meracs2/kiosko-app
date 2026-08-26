'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, BarChart3, PieChart as PieIcon, Flame, Download } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

const COLORES = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1']

export default function MetricasPage() {
  const [dataGraficos, setDataGraficos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes'>('mes')

  useEffect(() => {
    obtenerMetricas()
  }, [periodo])

  const obtenerMetricas = async () => {
    setCargando(true)
    try {
      const ahora = new Date()
      const fechaDesde = new Date()

      if (periodo === 'hoy') {
        fechaDesde.setHours(0, 0, 0, 0)
      } else if (periodo === 'semana') {
        fechaDesde.setDate(ahora.getDate() - 7)
      } else if (periodo === 'mes') {
        fechaDesde.setDate(ahora.getDate() - 30)
      }

      const { data, error } = await supabase
        .from('detalle_ventas')
        .select('producto_nombre, cantidad, created_at')
        .gte('created_at', fechaDesde.toISOString())

      if (!error && data) {
        const contador: { [key: string]: number } = {}
        data.forEach((item) => {
          contador[item.producto_nombre] = (contador[item.producto_nombre] || 0) + item.cantidad
        })

        const ranking = Object.keys(contador)
          .map((nombre) => ({ nombre, cantidad: contador[nombre] }))
          .sort((a, b) => b.cantidad - a.cantidad)

        setDataGraficos(ranking)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
    }
  }

  const exportarAExcel = () => {
    if (dataGraficos.length === 0) return

    let csvContent = 'data:text/csv;charset=utf-8,Producto,Unidades Vendidas\n'
    dataGraficos.forEach((prod) => {
      csvContent += `"${prod.nombre}",${prod.cantidad}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `reporte_metricas_${periodo}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 max-w-2xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-white rounded-xl shadow-sm text-slate-600 hover:bg-slate-100">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Métricas y Salida</h1>
            <p className="text-xs text-slate-500 font-medium">Análisis visual de rotación de productos</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportarAExcel}
            disabled={dataGraficos.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Download size={14} />
            Excel
          </button>

          <div className="flex bg-slate-200/60 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setPeriodo('hoy')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                periodo === 'hoy' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setPeriodo('semana')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                periodo === 'semana' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setPeriodo('mes')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                periodo === 'mes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 días
            </button>
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
          <p className="text-sm text-slate-400 font-semibold animate-pulse">Cargando métricas del sistema...</p>
        </div>
      ) : dataGraficos.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 text-center">
          <p className="text-sm text-slate-500">No hay ventas registradas en el período seleccionado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4 text-blue-600">
              <BarChart3 size={20} />
              <h2 className="font-bold text-lg text-slate-800">Top Unidades Vendidas</h2>
            </div>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataGraficos.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="nombre" tick={{ fill: '#64748B' }} />
                  <YAxis tick={{ fill: '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="cantidad" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4 text-emerald-600">
              <PieIcon size={20} />
              <h2 className="font-bold text-lg text-slate-800">Distribución de Salida (%)</h2>
            </div>
            <div className="h-64 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataGraficos.slice(0, 5)} dataKey="cantidad" nameKey="nombre" cx="50%" cy="50%" outerRadius={80} label>
                    {dataGraficos.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-4 text-amber-500">
              <Flame size={20} />
              <h2 className="font-bold text-lg text-slate-800">Ranking del Período</h2>
            </div>
            <div className="space-y-2">
              {dataGraficos.map((prod, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORES[idx % COLORES.length] || '#94A3B8' }} />
                    <span className="font-semibold text-slate-700 text-sm">{prod.nombre}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-xl shadow-sm border border-slate-100">
                    {prod.cantidad} un.
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}