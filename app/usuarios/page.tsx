// app/usuarios/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Trash2, Edit2, X, Check, Clock, Users, AlertCircle } from 'lucide-react'

export default function UsuariosPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('empleado')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('17:00')
  
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null)

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const cargarUsuarios = async () => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('email', { ascending: true })

    if (!error && data) {
      const usuariosFiltrados = data.filter((u) => u.rol !== 'super_admin')
      setUsuarios(usuariosFiltrados)
    }
  }

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    try {
      // 1. Guardamos la sesión actual del Admin antes de crear el usuario
      const { data: sesionActual } = await supabase.auth.getSession()

      // 2. Creamos el usuario
      const { error: errorAuth } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            nombre_completo: nombre,
            rol: rol,
            hora_inicio: horaInicio,
            hora_fin: horaFin
          }
        }
      })

      if (errorAuth) throw errorAuth

      // 3. Restauramos instantáneamente la sesión del Admin para que no se desconecte
      if (sesionActual && sesionActual.session) {
        await supabase.auth.setSession({
          access_token: sesionActual.session.access_token,
          refresh_token: sesionActual.session.refresh_token,
        })
      }

      setMensaje('✅ Usuario creado con éxito (Tu sesión sigue activa)')
      setEmail('')
      setPassword('')
      setNombre('')
      setRol('empleado')
      setHoraInicio('08:00')
      setHoraFin('17:00')
      setMostrarFormulario(false)
      cargarUsuarios()
    } catch (err: any) {
      setMensaje(`❌ Error: ${err.message || 'No se pudo crear el usuario'}`)
    } finally {
      setCargando(false)
    }
  }

  const handleEliminarUsuario = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario por completo? No podrá volver a iniciar sesión.')) return

    try {
      const { error } = await supabase.rpc('eliminar_usuario_completo', {
        usuario_id: id
      })

      if (error) throw error

      setMensaje('✅ Usuario eliminado por completo de Supabase')
      cargarUsuarios()
    } catch (err: any) {
      setMensaje(`❌ Error al eliminar: ${err.message}`)
    }
  }

  const handleGuardarEdicion = async () => {
    if (!usuarioEditando) return

    try {
      const { error } = await supabase
        .from('perfiles')
        .update({
          rol: usuarioEditando.rol,
          email: usuarioEditando.email,
          hora_inicio: usuarioEditando.hora_inicio,
          hora_fin: usuarioEditando.hora_fin
        })
        .eq('id', usuarioEditando.id)

      if (error) throw error

      setMensaje('✅ Usuario actualizado con éxito')
      setUsuarioEditando(null)
      cargarUsuarios()
    } catch (err: any) {
      setMensaje(`❌ Error al actualizar: ${err.message}`)
    }
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
              <Users className="text-blue-600" size={26} /> Personal y Accesos
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Gestión de accesos, roles y turnos de empleados</p>
          </div>
        </div>

        <button
          onClick={() => { setMostrarFormulario(!mostrarFormulario); setMensaje(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xs ${
            mostrarFormulario 
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          <UserPlus size={18} /> {mostrarFormulario ? 'Ocultar Formulario' : 'Registrar Nuevo Usuario'}
        </button>
      </div>

      {mensaje && (
        <div
          className={`p-4 mb-6 rounded-xl text-sm font-medium flex items-center gap-2.5 border shadow-xs ${
            mensaje.includes('Error') || mensaje.includes('❌') 
              ? 'bg-red-50 text-red-700 border-red-100' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
          }`}
        >
          <AlertCircle size={18} className="shrink-0" />
          {mensaje}
        </div>
      )}

      {/* FORMULARIO DE REGISTRO */}
      {mostrarFormulario && (
        <div className="bg-white rounded-2xl shadow-xs p-6 md:p-8 max-w-xl mx-auto mb-8 border border-slate-100 animate-fadeIn">
          <h2 className="font-bold text-slate-900 mb-5 border-b border-slate-100 pb-3 text-base flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" /> Cargar Usuario Nuevo
          </h2>
          
          <form onSubmit={handleCrearUsuario} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Nombre Completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                required
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Email / Usuario</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@kiosko.com"
                required
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Contraseña Inicial</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">Rol de Sistema</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
              >
                <option value="empleado">Empleado</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Hora Entrada</label>
                <input
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Hora Salida</label>
                <input
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-3 shadow-xs active:scale-95 text-sm"
            >
              <UserPlus size={18} />
              {cargando ? 'Guardando...' : 'Guardar Usuario'}
            </button>
          </form>
        </div>
      )}

      {/* LISTA DE PERSONAL (GRILLA ADAPTABLE) */}
      <div className="bg-white rounded-2xl shadow-xs p-6 border border-slate-100">
        <h2 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3 text-base flex items-center gap-2">
          <Users size={18} className="text-slate-600" /> Lista de Personal Registrado
        </h2>

        {usuarios.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto text-slate-300 mb-2" size={42} />
            <p className="text-sm font-medium text-slate-700">No hay usuarios registrados.</p>
            <p className="text-xs text-slate-400 mt-0.5">Creá un nuevo usuario para asignarle turnos y accesos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usuarios.map((u) => (
              <div key={u.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex flex-col justify-between gap-4 transition-all hover:bg-slate-50">
                
                {usuarioEditando?.id === u.id ? (
                  <div className="flex flex-col gap-2.5 w-full">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Email</label>
                      <input
                        type="email"
                        value={usuarioEditando.email}
                        onChange={(e) => setUsuarioEditando({ ...usuarioEditando, email: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Rol</label>
                      <select
                        value={usuarioEditando.rol}
                        onChange={(e) => setUsuarioEditando({ ...usuarioEditando, rol: e.target.value })}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                      >
                        <option value="empleado">Empleado</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Entrada</label>
                        <input
                          type="time"
                          value={usuarioEditando.hora_inicio || '08:00'}
                          onChange={(e) => setUsuarioEditando({ ...usuarioEditando, hora_inicio: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Salida</label>
                        <input
                          type="time"
                          value={usuarioEditando.hora_fin || '17:00'}
                          onChange={(e) => setUsuarioEditando({ ...usuarioEditando, hora_fin: e.target.value })}
                          className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-900 text-sm truncate" title={u.email}>{u.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-lg font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                        {u.rol || 'empleado'}
                      </span>
                      {u.hora_inicio && u.hora_fin && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-lg font-semibold bg-white text-slate-600 flex items-center gap-1 border border-slate-200/60 shadow-xs">
                          <Clock size={12} className="text-slate-400" /> {u.hora_inicio} a {u.hora_fin} hs
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* BOTONES DE ACCIÓN */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-200/60">
                  {usuarioEditando?.id === u.id ? (
                    <>
                      <button
                        onClick={handleGuardarEdicion}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center gap-1 text-xs font-bold shadow-xs"
                        title="Confirmar"
                      >
                        <Check size={14} /> Guardar
                      </button>
                      <button
                        onClick={() => setUsuarioEditando(null)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition flex items-center gap-1 text-xs font-bold"
                        title="Cancelar"
                      >
                        <X size={14} /> Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setUsuarioEditando(u)}
                        className="p-2 bg-white text-slate-600 hover:text-blue-600 rounded-xl border border-slate-200/60 shadow-xs transition hover:bg-slate-50"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleEliminarUsuario(u.id)}
                        className="p-2 bg-white text-rose-500 hover:text-rose-700 rounded-xl border border-slate-200/60 shadow-xs transition hover:bg-rose-50"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}