import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser, refreshSession } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)
  const [sessionReady, setSessionReady] = useState(() => !localStorage.getItem('token'))
  const navigate = useNavigate()

  function login({ token, user }) {
    setToken(token)
    setUser(user)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }

  // Cambios de preferencias (moneda) sin emitir un token nuevo
  function updateUser(changes) {
    setUser(prev => {
      const next = { ...prev, ...changes }
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  // Al abrir la app con una sesión guardada se renueva el token y la cookie
  // httpOnly que usan las fotos y archivos (sesiones previas no la tenían).
  useEffect(() => {
    if (!token) return
    refreshSession()
      .then(res => login(res.data))
      .catch(() => {})
      .finally(() => setSessionReady(true))
  }, [])

  function logout() {
    logoutUser().catch(() => {})
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, sessionReady, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
