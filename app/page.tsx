// app/page.tsx
'use client'

import Link from 'next/link'
import { Sparkles, PackageSearch, ShoppingBag, DollarSign, Store, ArrowRight, TrendingUp } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 max-w-xl mx-auto flex flex-col justify-center">
      {/* Header & Branding Moderno */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 text-center relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 text-white p-4 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 transition-transform hover:scale-105">
          <Store size={32} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Kiosko POS</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Gestión inteligente de ventas y stock</p>

        {/* Badge de estado rápido */}
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mt-4 border border-emerald-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Sistema listo para operar
        </div>
      </div>

      {/* Grilla Principal */}
      <div className="grid grid-cols-2 gap-4">
        {/* Punto de Venta (Destacado Principal) */}
        <Link
          href="/ventas"
          className="group relative bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-md shadow-emerald-500/20 flex flex-col justify-between h-44 active:scale-95 transition-all hover:shadow-lg hover:shadow-emerald-500/30 overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
              <ShoppingBag size={26} />
            </div>
            <ArrowRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <h2 className="font-bold text-xl leading-tight">Punto de Venta</h2>
            <p className="text-xs text-emerald-100 font-medium mt-1">Cobrar e imprimir ticket</p>
          </div>
        </Link>

        {/* Inventario */}
        <Link
          href="/inventario"
          className="group relative bg-white border border-slate-200/80 text-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-44 active:scale-95 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <PackageSearch size={26} />
            </div>
            <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <h2 className="font-bold text-xl leading-tight text-slate-900">Inventario</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Control de stock y reingreso</p>
          </div>
        </Link>

        {/* Promociones */}
        <Link
          href="/promociones"
          className="group relative bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-5 rounded-3xl shadow-md shadow-purple-500/20 flex flex-col justify-between h-44 active:scale-95 transition-all hover:shadow-lg hover:shadow-purple-500/30 overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
              <Sparkles size={26} />
            </div>
            <ArrowRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <h2 className="font-bold text-xl leading-tight">Promos</h2>
            <p className="text-xs text-purple-100 font-medium mt-1">Combos Fernet, Burgers y +</p>
          </div>
        </Link>

        {/* Caja del Día */}
        <Link
          href="/caja"
          className="group relative bg-white border border-slate-200/80 text-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-44 active:scale-95 transition-all hover:border-slate-300 hover:shadow-md"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <DollarSign size={26} />
            </div>
            <ArrowRight size={18} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
          <div>
            <h2 className="font-bold text-xl leading-tight text-slate-900">Caja del Día</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Totales, arqueo y cierres</p>
          </div>
        </Link>
      </div>
    </main>
  )
}