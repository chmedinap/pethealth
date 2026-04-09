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
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth
export const loginUser = (data) => api.post('/auth/login', data)
export const registerUser = (data) => api.post('/auth/register', data)

// Pets
export const getPets = () => api.get('/pets')
export const getPet = (id) => api.get(`/pets/${id}`)
export const createPet = (data) => api.post('/pets', data)
export const updatePet = (id, data) => api.put(`/pets/${id}`, data)
export const deletePet = (id) => api.delete(`/pets/${id}`)
export const uploadPetPhoto = (id, formData) => api.post(`/pets/${id}/photo`, formData)

// Checkups
export const getPetCheckups = (petId) => api.get(`/pets/${petId}/checkups`)
export const createCheckup = (petId, data) => api.post(`/pets/${petId}/checkups`, data)
export const deleteCheckup = (id) => api.delete(`/checkups/${id}`)

// Exams
export const getPetExams = (petId) => api.get(`/pets/${petId}/exams`)
export const createExam = (petId, formData) => api.post(`/pets/${petId}/exams`, formData)
export const updateExam = (id, data) => api.put(`/exams/${id}`, data)
export const deleteExam = (id) => api.delete(`/exams/${id}`)

// Checkup edit
export const updateCheckup = (id, data) => api.put(`/checkups/${id}`, data)

// Attachments
export const uploadCheckupAttachment = (id, formData) => api.post(`/checkups/${id}/attachments`, formData)
export const uploadExamAttachment = (id, formData) => api.post(`/exams/${id}/attachments`, formData)
export const deleteAttachment = (id) => api.delete(`/attachments/${id}`)

export default api
