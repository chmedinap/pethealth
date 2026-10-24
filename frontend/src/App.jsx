import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { FeedbackProvider } from './context/FeedbackContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AddPet from './pages/AddPet'
import PetProfile from './pages/PetProfile'
import AddCheckup from './pages/AddCheckup'
import AddExam from './pages/AddExam'
import Account from './pages/Account'
import PetReport from './pages/PetReport'
import Vets from './pages/Vets'

function PrivateRoute() {
  const { isAuthenticated, sessionReady, user } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!sessionReady) return null
  // La cuenta con contraseña por defecto solo puede usar la página de cuenta
  if (user?.mustChangePassword && location.pathname !== '/account') return <Navigate to="/account" replace />
  return <Outlet />
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
        <Route path="/pets/:id/report" element={<PetReport />} />
        <Route path="/account" element={<Account />} />
        <Route path="/vets" element={<Vets />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <FeedbackProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </FeedbackProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}
