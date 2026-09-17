'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createWorker } from 'tesseract.js'
import { 
  ArrowLeft, 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Trash2, 
  Edit, 
  X, 
  Building2,
  Camera,
  Loader2
} from 'lucide-react'

interface Proveedor {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  notas: string | null
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [esOscuro, setEsOscuro] = useState(false)

  // Estados para modal de crear / editar
  const [mostrarModal, setMostrarModal] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  
  // Campos del formulario
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Estados del OCR (Escáner de imágenes)
  const [escaneando, setEscaneando] = useState(false)
  const [progresoOcr, setProgresoOcr] = useState('')

  const router = useRouter()

  useEffect(() => {
    const temaGuardado = localStorage.getItem('theme') === 'dark'
    setEsOscuro(temaGuardado)
    cargarProveedores()
  }, [])

  const cargarProveedores = async () => {
    setCargando(true)
    try {
      const { data, error } = await supabase
        .from('proveedores')
        .select('*')
        .order('nombre', { ascending: true })

      if (error) throw error
      setProveedores(data || [])
    } catch (error) {
      console.error('Error al cargar proveedores:', error)
    } finally {
      setCargando(false)
    }
  }

  const abrirModalCrear = () => {
    setEditandoId(null)
    setNombre('')
    setContacto('')
    setTelefono('')
    setEmail('')
    setDireccion('')
    setNotas('')
    setMostrarModal(true)
  }

  const abrirModalEditar = (prov: Proveedor) => {
    setEditandoId(prov.id)
    setNombre(prov.nombre)
    setContacto(prov.contacto || '')
    setTelefono(prov.telefono || '')
    setEmail(prov.email || '')
    setDireccion(prov.direccion || '')
    setNotas(prov.notas || '')
    setMostrarModal(true)
  }

  // Escáner OCR exclusivo para imágenes (fotos de facturas/remitos)
  const procesarArchivoOCR = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    if (!archivo) return

    setEscaneando(true)
    setProgresoOcr('Preparando...')

    try {
      setProgresoOcr('Cargando motor OCR...')
      const worker = await createWorker('spa', 1, {
        logger: (m) => {
          if (m.status) {
            const porcentaje = m.progress ? ` (${Math.round(m.progress * 100)}%)` : ''
            setProgresoOcr(`${m.status}${porcentaje}`)
          }
        }
      })

      setProgresoOcr('Leyendo imagen...')
      const ret = await worker.recognize(archivo)
      const texto = ret.data.text
      await worker.terminate()

      setEscaneando(false)
      abrirModalCrear()
      setNotas(`--- Texto escaneado de factura ---\n${texto}`)
    } catch (error: any) {
      console.error("Error al procesar la imagen con OCR:", error)
      alert(`Error al leer la imagen: ${error.message || 'Error desconocido'}`)
      setEscaneando(false)
    } finally {
      e.target.value = ''
    }
  }

  const guardarProveedor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) {
      alert('El nombre del proveedor es obligatorio.')
      return
    }

    setGuardando(true)
    try {
      const datosProveedor = {
        nombre: nombre.trim(),
        contacto: contacto.trim() || null,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        direccion: direccion.trim() || null,
        notas: notas.trim() || null,
      }

      if (editandoId) {
        const { error } = await supabase
          .from('proveedores')
          .update(datosProveedor)
          .eq('id', editandoId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('proveedores')
          .insert([datosProveedor])

        if (error) throw error
      }

      setMostrarModal(false)
      cargarProveedores()
    } catch (error) {
      console.error('Error al guardar proveedor:', error)
      alert('Hubo un error al guardar el proveedor.')
    } finally {
      setGuardando(false)
    }
  }

  const eliminarProveedor = async (id: string, nombreProv: string) => {
    if (!confirm(`¿Estás seguro de eliminar al proveedor "${nombreProv}"?`)) return

    try {
      const { error } = await supabase
        .from('proveedores')
        .delete()
        .eq('id', id)

      if (error) throw error
      cargarProveedores()
    } catch (error) {
      console.error('Error al eliminar proveedor:', error)
      alert('No se pudo eliminar el proveedor.')
    }
  }

  const proveedoresFiltrados = proveedores.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.contacto && p.contacto.toLowerCase().includes(busqueda.toLowerCase())) ||
    (p.telefono && p.telefono.includes(busqueda))
  )

  // Clases dinámicas
  const bgMain = esOscuro ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
  const bgHeader = esOscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
  const bgCard = esOscuro ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
  const textMuted = esOscuro ? 'text-slate-400' : 'text-slate-500'
  const inputBg = esOscuro ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'

  return (
    <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors duration-200 ${bgMain}`}>
      
      {/* HEADER */}
      <header className={`border-b px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40 shadow-xs ${bgHeader}`}>
        <div className="flex items-center gap-3">
          <Link href="/" className={`p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer ${esOscuro ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}>
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-cyan-400 text-slate-900 rounded-xl font-bold shadow-xs">
              <Truck size={20} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">Proveedores</h1>
              <p className={`text-[11px] font-medium ${textMuted}`}>Gestión de distribuidores y costos</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* BOTÓN ESCÁNER DE FOTO */}
          <label className={`flex items-center gap-1.5 px-4 py-2.5 font-bold rounded-xl transition text-xs shadow-sm cursor-pointer ${escaneando ? 'bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
            {escaneando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span className="truncate max-w-[150px]">{progresoOcr}</span>
              </>
            ) : (
              <>
                <Camera size={16} />
                <span>Escanear Foto de Factura</span>
              </>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={procesarArchivoOCR}
              disabled={escaneando}
            />
          </label>

          {/* BOTÓN NUEVO PROVEEDOR */}
          <button
            onClick={abrirModalCrear}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition text-xs shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Nuevo Proveedor</span>
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 sm:p-10 flex flex-col">
        
        {/* BARRA DE BÚSQUEDA */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${textMuted}`} />
            <input
              type="text"
              placeholder="Buscar por nombre, contacto o teléfono..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border outline-none transition focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
            />
          </div>
          <div className={`text-xs font-medium ${textMuted}`}>
            Total proveedores: <span className="font-bold">{proveedores.length}</span>
          </div>
        </div>

        {/* LISTADO DE PROVEEDORES */}
        {cargando ? (
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <p className="text-xs font-medium animate-pulse text-slate-400">Cargando proveedores...</p>
          </div>
        ) : proveedoresFiltrados.length === 0 ? (
          <div className={`flex-1 flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed text-center min-h-[350px] shadow-xs ${bgCard}`} style={{ borderColor: esOscuro ? '#334155' : '#cbd5e1' }}>
            <div className={`p-4 rounded-2xl mb-3 ${esOscuro ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              <Building2 size={28} />
            </div>
            <h3 className="font-bold text-sm mb-1">No se encontraron proveedores</h3>
            <p className={`text-xs max-w-xs mb-4 ${textMuted}`}>
              {busqueda ? 'Ningún proveedor coincide con tu búsqueda.' : 'Todavía no cargaste ningún proveedor en el sistema.'}
            </p>
            {!busqueda && (
              <button
                onClick={abrirModalCrear}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold rounded-xl transition text-xs shadow-sm cursor-pointer"
              >
                Agregar primer proveedor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proveedoresFiltrados.map((prov) => (
              <div key={prov.id} className={`p-5 rounded-2xl border shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${bgCard}`}>
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-cyan-400/20 text-cyan-400 rounded-xl">
                        <Truck size={18} />
                      </div>
                      <h3 className="font-bold text-sm tracking-tight">{prov.nombre}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => abrirModalEditar(prov)}
                        title="Editar"
                        className={`p-1.5 rounded-lg transition cursor-pointer ${esOscuro ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'}`}
                      >
                        <Edit size={15} />
                      </button>
                      <button 
                        onClick={() => eliminarProveedor(prov.id, prov.nombre)}
                        title="Eliminar"
                        className={`p-1.5 rounded-lg transition cursor-pointer ${esOscuro ? 'hover:bg-red-950/40 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-500 hover:text-red-600'}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs mb-4">
                    {prov.contacto && (
                      <div className={`flex items-center gap-2 ${textMuted}`}>
                        <User size={14} className="shrink-0" />
                        <span className="truncate">Contacto: <strong className={esOscuro ? 'text-slate-200' : 'text-slate-800'}>{prov.contacto}</strong></span>
                      </div>
                    )}
                    {prov.telefono && (
                      <div className={`flex items-center gap-2 ${textMuted}`}>
                        <Phone size={14} className="shrink-0" />
                        <a href={`tel:${prov.telefono}`} className="hover:underline font-medium text-cyan-500">{prov.telefono}</a>
                      </div>
                    )}
                    {prov.email && (
                      <div className={`flex items-center gap-2 ${textMuted}`}>
                        <Mail size={14} className="shrink-0" />
                        <a href={`mailto:${prov.email}`} className="hover:underline truncate text-cyan-500">{prov.email}</a>
                      </div>
                    )}
                    {prov.direccion && (
                      <div className={`flex items-center gap-2 ${textMuted}`}>
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">{prov.direccion}</span>
                      </div>
                    )}
                  </div>
                </div>

                {prov.notas && (
                  <div className={`mt-2 p-2.5 rounded-xl text-[11px] border ${esOscuro ? 'bg-slate-800/50 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    <span className="font-semibold block mb-0.5">Notas:</span>
                    <p className="whitespace-pre-line">{prov.notas}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>

      {/* MODAL CREAR / EDITAR PROVEEDOR */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl p-6 relative shadow-xl border max-h-[90vh] overflow-y-auto ${bgCard}`}>
            <div className={`flex justify-between items-center mb-4 pb-3 border-b ${esOscuro ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-cyan-400 text-slate-950 rounded-xl"><Truck size={18} /></div>
                <div>
                  <h3 className="font-bold text-sm">{editandoId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                  <p className={`text-[11px] font-medium ${textMuted}`}>Complete los datos del distribuidor</p>
                </div>
              </div>
              <button onClick={() => setMostrarModal(false)} className={`p-1.5 rounded-full transition-colors cursor-pointer ${esOscuro ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={guardarProveedor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">Nombre de la Empresa / Proveedor *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Distribuidora Mayorista CBA"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej: Juan Pérez"
                    value={contacto}
                    onChange={(e) => setContacto(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Ej: 3511234567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="Ej: ventas@proveedor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Dirección / Depósito</label>
                <input
                  type="text"
                  placeholder="Ej: Av. Sabattini 1200"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition focus:ring-2 focus:ring-cyan-500 ${inputBg}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Notas / Días de visita / CBU o Alias</label>
                <textarea
                  rows={4}
                  placeholder="Ej: Pasa los martes y jueves. CBU: ..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border outline-none transition focus:ring-2 focus:ring-cyan-500 resize-none ${inputBg}`}
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition border cursor-pointer ${esOscuro ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'}`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-cyan-500 hover:bg-cyan-600 text-slate-950 transition cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}