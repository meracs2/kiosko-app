// components/Header.tsx
'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface HeaderProps {
  titulo: string
  subtitulo?: string
}

export default function Header({ titulo, subtitulo }: HeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0"
      >
        <ArrowLeft size={20} />
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-gray-800 leading-tight">{titulo}</h1>
        {subtitulo && <p className="text-xs text-gray-500">{subtitulo}</p>}
      </div>
    </div>
  )
}