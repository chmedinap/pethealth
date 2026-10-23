import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AddPet from './pages/AddPet'
import PetProfile from './pages/PetProfile'
import AddCheckup from './pages/AddCheckup'
import AddExam from './pages/AddExam'
import Account from './pages/Account'

function PrivateRoute() {
  const { isAuthenticated, sessionReady } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return sessionReady ? <Outlet /> : null
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pets/new" element={<AddPet />} />
        <Route path="/pets/:id" element={<PetProfile />} />
        <Route path="/pets/:id/edit" element={<AddPet />} />
        <Route path="/pets/:id/checkups/new" element={<AddCheckup />} />
        <Route path="/pets/:id/exams/new" element={<AddExam />} />
        <Route path="/account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
