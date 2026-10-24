require('dotenv').config()
const config = require('./config')
const app = require('./app')
const { startBackupSchedule } = require('./backup')
const { startNotifySchedule } = require('./notify')

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`)
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   Datos en: ${config.DATA_DIR}`)
  console.log(`   Registro público: ${config.ALLOW_REGISTRATION ? 'habilitado' : 'deshabilitado'}`)
  console.log(`   Trust proxy: ${process.env.TRUST_PROXY === 'true' ? 'activado' : 'desactivado'}`)
  startBackupSchedule()
  startNotifySchedule()
})
