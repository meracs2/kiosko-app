'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface DatoGrafico {
  nombre: string
  cantidad: number
}

export default function MetricasPage() {
  const [dataGraficos, setDataGraficos] = useState<DatoGrafico[]>([])
  const [cargando, setCargando] = useState(true)
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes'>('mes')

  const obtenerMetricas = useCallback(async () => {
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

      // Consultamos el detalle uniendo con la tabla ventas para filtrar por fecha (created_at)
      const { data, error } = await supabase
        .from('detalle_ventas')
        .select(`
          nombre_producto,
          cantidad,
          ventas!inner (
            created_at
          )
        `)
        .gte('ventas.created_at', fechaDesde.toISOString())

      if (error) {
        console.error('Error al traer métricas:', error)
        setDataGraficos([])
        return
      }

      if (data) {
        const contador: { [key: string]: number } = {}
        data.forEach((item: any) => {
          const nombre = item.nombre_producto || 'Sin nombre'
          contador[nombre] = (contador[nombre] || 0) + item.cantidad
        })

        const ranking = Object.keys(contador)
          .map((nombre) => ({ nombre, cantidad: contador[nombre] }))
          .sort((a, b) => b.cantidad - a.cantidad)

        setDataGraficos(ranking)
      }
    } catch (err) {
      console.error(err)
      setDataGraficos([])
    } finally {
      setCargando(false)
    }
  }, [periodo])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void obtenerMetricas()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [obtenerMetricas])

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
              <BarChart3 className="text-blue-600" size={26} /> Métricas y Salida
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Análisis visual de rotación de productos y ventas</p>
          </div>
        </div>

        {/* ACCIONES SUPERIORES (Excel y Filtros de Período) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportarAExcel}
            disabled={dataGraficos.length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Download size={15} />
            Exportar Excel
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/60">
            <button
              onClick={() => setPeriodo('hoy')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
                periodo === 'hoy' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setPeriodo('semana')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
                periodo === 'semana' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setPeriodo('mes')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs ${
                periodo === 'mes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 días
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      {cargando ? (
        <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-100 text-center">
          <p className="text-sm text-slate-400 font-semibold animate-pulse">Cargando métricas del sistema...</p>
        </div>
      ) : dataGraficos.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-100 text-center">
          <BarChart3 className="mx-auto text-slate-300 mb-2" size={42} />
          <p className="text-sm font-medium text-slate-700">No hay ventas registradas en el período seleccionado.</p>
          <p className="text-xs text-slate-400 mt-0.5">Probá cambiando el filtro de tiempo a 30 días.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* GRILLA SUPERIOR: 2 COLUMNAS PARA GRÁFICOS EN ESCRITORIO */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Gráfico de Barras */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <div className="flex items-center gap-2 mb-4 text-blue-600 pb-2 border-b border-slate-100">
                <BarChart3 size={20} />
                <h2 className="font-bold text-base text-slate-800">Top Unidades Vendidas</h2>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dataGraficos.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="nombre" tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#64748B', fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                    <Bar dataKey="cantidad" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico Circular / Torta */}
            <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
              <div className="flex items-center gap-2 mb-4 text-emerald-600 pb-2 border-b border-slate-100">
                <PieIcon size={20} />
                <h2 className="font-bold text-base text-slate-800">Distribución de Salida (%)</h2>
              </div>
              <div className="h-72 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dataGraficos.slice(0, 5)} dataKey="cantidad" nameKey="nombre" cx="50%" cy="50%" outerRadius={85} label>
                      {dataGraficos.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* RANKING COMPLETO DEBAJO (ANCHO COMPLETO) */}
          <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100">
            <div className="flex items-center gap-2 mb-4 text-amber-500 pb-2 border-b border-slate-100">
              <Flame size={20} />
              <h2 className="font-bold text-base text-slate-800">Ranking Completo del Período</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {dataGraficos.map((prod, idx) => (
                <div key={idx} className="flex justify-between items-center p-3.5 rounded-xl bg-slate-50/80 border border-slate-100/80 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 truncate pr-2">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: COLORES[idx % COLORES.length] || '#94A3B8' }} />
                    <span className="font-semibold text-slate-800 text-sm truncate" title={prod.nombre}>{prod.nombre}</span>
                  </div>
                  <span className="text-xs font-black text-slate-700 bg-white px-3 py-1.5 rounded-xl shadow-xs border border-slate-200/60 shrink-0">
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