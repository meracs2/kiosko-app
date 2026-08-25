// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css' // Importa tus estilos de Tailwind si tenés este archivo

export const metadata: Metadata = {
  title: 'Kiosko POS',
  description: 'Control de Stock, Ventas y Caja',
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50">{children}</body>
    </html>
  )
}