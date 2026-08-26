'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Trash2, Edit2, X, Check } from 'lucide-react'

export default function UsuariosPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('empleado')
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
      // Filtramos para ocultar la cuenta de 'super_admin' de la lista visual
      const usuariosFiltrados = data.filter((u) => u.rol !== 'super_admin')
      setUsuarios(usuariosFiltrados)
    }
  }

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje('')

    try {
      const { error: errorAuth } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            nombre_completo: nombre,
            rol: rol 
          }
        }
      })

      if (errorAuth) throw errorAuth

      setMensaje('✅ Usuario creado con éxito')
      setEmail('')
      setPassword('')
      setNombre('')
      setRol('empleado')
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
      // Llamamos a la función segura en Supabase que borra de Auth y perfiles
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
          email: usuarioEditando.email
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
    <main className="min-h-screen bg-gray-100 p-4 max-w-lg mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2.5 bg-white border shadow-sm hover:bg-gray-100 text-gray-700 rounded-xl active:scale-95 transition flex items-center justify-center shrink-0">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">Personal</h1>
            <p className="text-xs text-gray-500">Gestión de accesos y roles del sistema</p>
          </div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-3 mb-4 rounded text-sm ${
            mensaje.includes('Error') || mensaje.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {mensaje}
        </div>
      )}

      <div className="flex bg-gray-200 p-1 rounded-xl mb-4 text-xs font-bold">
        <button
          onClick={() => { setMostrarFormulario(!mostrarFormulario); setMensaje(''); }}
          className={`w-full py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
            mostrarFormulario ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-700 shadow-sm'
          }`}
        >
          <UserPlus size={16} /> {mostrarFormulario ? 'Ocultar Formulario' : 'Registrar Nuevo Usuario'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 text-sm">Cargar Usuario Nuevo</h2>
          
          <form onSubmit={handleCrearUsuario} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                required
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Email / Usuario</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@kiosko.com"
                required
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Contraseña Inicial</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-semibold">Rol</label>
              <select
                value={rol}
                onChange={(e) => setRol(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-800 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="empleado">empleado</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mt-2"
            >
              <UserPlus size={18} />
              {cargando ? 'Guardando...' : 'Guardar Usuario'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4">
        <h2 className="font-bold text-gray-700 mb-3 border-b pb-2 text-sm">Lista de Personal</h2>

        {usuarios.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">
            No hay usuarios registrados.
          </p>
        ) : (
          <div className="divide-y max-h-96 overflow-y-auto">
            {usuarios.map((u) => (
              <div key={u.id} className="py-3 flex justify-between items-center">
                {usuarioEditando?.id === u.id ? (
                  <div className="flex flex-col gap-2 w-full pr-2">
                    <input
                      type="email"
                      value={usuarioEditando.email}
                      onChange={(e) => setUsuarioEditando({ ...usuarioEditando, email: e.target.value })}
                      className="p-1.5 border rounded-lg text-sm bg-gray-50"
                    />
                    <select
                      value={usuarioEditando.rol}
                      onChange={(e) => setUsuarioEditando({ ...usuarioEditando, rol: e.target.value })}
                      className="p-1.5 border rounded-lg text-sm bg-gray-50"
                    >
                      <option value="empleado">empleado</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-800 text-sm">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                        {u.rol || 'empleado'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {usuarioEditando?.id === u.id ? (
                    <>
                      <button
                        onClick={handleGuardarEdicion}
                        className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                        title="Confirmar"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setUsuarioEditando(null)}
                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                        title="Cancelar"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setUsuarioEditando(u)}
                        className="p-2 bg-gray-50 text-gray-600 hover:text-blue-600 rounded-lg border shadow-xs transition"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleEliminarUsuario(u.id)}
                        className="p-2 bg-gray-50 text-rose-500 hover:text-rose-700 rounded-lg border shadow-xs transition"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
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