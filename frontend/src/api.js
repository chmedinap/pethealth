import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    // Un 401 en login/registro es "credenciales incorrectas", no una sesión expirada:
    // se deja pasar para que la pantalla muestre el error en lugar de recargar.
    const isAuthRequest = error.config?.url?.startsWith('/auth/')
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    // Cuenta con la contraseña por defecto: el backend bloquea todo hasta cambiarla
    if (error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED' && window.location.pathname !== '/account') {
      window.location.href = '/account'
    }
    return Promise.reject(error)
  }
)

// Auth
export const getAuthConfig = () => api.get('/auth/config')
export const loginUser = (data) => api.post('/auth/login', data)
export const registerUser = (data) => api.post('/auth/register', data)
export const refreshSession = () => api.post('/auth/refresh')
export const logoutUser = () => api.post('/auth/logout')

// Users
export const getMe = () => api.get('/users/me')
export const changePassword = (data) => api.put('/users/me/password', data)
export const revokeOtherSessions = () => api.post('/users/me/sessions/revoke')
export const updateMe = (data) => api.put('/users/me', data)
export const createCalendarToken = () => api.post('/users/me/calendar-token')
export const deleteCalendarToken = () => api.delete('/users/me/calendar-token')
export const sendTestEmail = (today) => api.post('/users/me/test-email', { today })

// Pets
export const getPets = () => api.get('/pets')
export const getPet = (id) => api.get(`/pets/${id}`)
export const createPet = (data) => api.post('/pets', data)
export const updatePet = (id, data) => api.put(`/pets/${id}`, data)
export const deletePet = (id) => api.delete(`/pets/${id}`)
export const uploadPetPhoto = (id, formData) => api.post(`/pets/${id}/photo`, formData)
export const exportPet = (id) => api.get(`/pets/${id}/export`, { responseType: 'blob' })
export const importPet = (formData) => api.post('/pets/import', formData)

// Sharing
export const getPetShares = (petId) => api.get(`/pets/${petId}/shares`)
export const sharePet = (petId, data) => api.post(`/pets/${petId}/shares`, data)
export const removePetShare = (petId, userId) => api.delete(`/pets/${petId}/shares/${userId}`)

// Vaccines
export const getPetVaccines = (petId) => api.get(`/pets/${petId}/vaccines`)
export const createVaccine = (petId, data) => api.post(`/pets/${petId}/vaccines`, data)
export const updateVaccine = (id, data) => api.put(`/vaccines/${id}`, data)
export const deleteVaccine = (id) => api.delete(`/vaccines/${id}`)

// Parasite treatments
export const getPetParasites = (petId) => api.get(`/pets/${petId}/parasites`)
export const createParasite = (petId, data) => api.post(`/pets/${petId}/parasites`, data)
export const updateParasite = (id, data) => api.put(`/parasites/${id}`, data)
export const deleteParasite = (id) => api.delete(`/parasites/${id}`)

// Allergies & chronic conditions
export const getPetConditions = (petId) => api.get(`/pets/${petId}/conditions`)
export const createCondition = (petId, data) => api.post(`/pets/${petId}/conditions`, data)
export const updateCondition = (id, data) => api.put(`/conditions/${id}`, data)
export const deleteCondition = (id) => api.delete(`/conditions/${id}`)

// Vet directory
export const getVets = () => api.get('/vets')
export const createVet = (data) => api.post('/vets', data)
export const updateVet = (id, data) => api.put(`/vets/${id}`, data)
export const deleteVet = (id) => api.delete(`/vets/${id}`)
export const importVetsFromHistory = () => api.post('/vets/import-history')

// Weight history
export const getPetWeights = (petId) => api.get(`/pets/${petId}/weights`)
export const createWeight = (petId, data) => api.post(`/pets/${petId}/weights`, data)
export const deleteWeight = (id) => api.delete(`/weights/${id}`)

// Reminders
export const getReminders = (today, days = 30) => api.get('/reminders', { params: { today, days } })

// Checkups
export const getPetCheckups = (petId) => api.get(`/pets/${petId}/checkups`)
export const createCheckup = (petId, data) => api.post(`/pets/${petId}/checkups`, data)
export const updateCheckup = (id, data) => api.put(`/checkups/${id}`, data)
export const deleteCheckup = (id) => api.delete(`/checkups/${id}`)

// Medications
export const createMedication = (checkupId, data) => api.post(`/checkups/${checkupId}/medications`, data)
export const updateMedication = (id, data) => api.put(`/medications/${id}`, data)
export const deleteMedication = (id) => api.delete(`/medications/${id}`)

// Medication doses
export const getDoses = (medicationId) => api.get(`/medications/${medicationId}/doses`)
export const createDose = (medicationId, data) => api.post(`/medications/${medicationId}/doses`, data)
export const deleteDose = (id) => api.delete(`/doses/${id}`)

// Exams
export const getPetExams = (petId) => api.get(`/pets/${petId}/exams`)
export const createExam = (petId, formData) => api.post(`/pets/${petId}/exams`, formData)
export const updateExam = (id, data) => api.put(`/exams/${id}`, data)
export const deleteExam = (id) => api.delete(`/exams/${id}`)

// Exam values
export const createExamValues = (examId, values) => api.post(`/exams/${examId}/values`, values)
export const updateExamValue = (id, data) => api.put(`/exam-values/${id}`, data)
export const deleteExamValue = (id) => api.delete(`/exam-values/${id}`)

// Attachments
export const uploadCheckupAttachment = (id, formData) => api.post(`/checkups/${id}/attachments`, formData)
export const uploadExamAttachment = (id, formData) => api.post(`/exams/${id}/attachments`, formData)
export const deleteAttachment = (id) => api.delete(`/attachments/${id}`)

export default api
