const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const {version, author} = require('./package.json')
const {
  connect: db_connect,
  db: mongodb_db,
  url: mongodb_url
} = require('./mongodb.js')
const {
  client: mqtt_client,
  url: mqtt_url,
  subscribe_all,
} = require('./mqtt.js')

dotenv.config()

const {
  APP_PORT = 80,
  INFLUXDB_CRUD_REST_API_URL
} = process.env


db_connect()
.then( () => {
  subscribe_all()
})

const app = express()
app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
  res.send({
    application_name: 'MQTT logger',
    author,
    version,
    mongodb: {
      url: mongodb_url,
      db: mongodb_db,
    },
    influxdb_crud_rest_api_url: INFLUXDB_CRUD_REST_API_URL,
    mqtt:{
      url: mqtt_url,
      connected: mqtt_client.connected
    }
  })
})

app.use('/sources', require('./routes/sources.js'))

app.use((error, req, res, next) => {
  // Express error handling
  console.error(error)
  let { statusCode = 500, message = error } = error
  if (isNaN(statusCode) || statusCode > 600) statusCode = 500
  res.status(statusCode).send(message)

})




app.listen(APP_PORT, () => {
  console.log(`[Express] MQTT Logger v${version} listening on port ${APP_PORT}`);
})
