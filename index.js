const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const auth = require("@moreillon/express_identification_middleware")
const { version, author } = require("./package.json")
const {
  connect: db_connect,
  db: mongodb_db,
  url: mongodb_url,
} = require("./mongodb.js")
const { bucket: influxdb_bucket, url: influxdb_url } = require("./influxdb.js")
const {
  getConnected: getMqttClientConnected,
  url: mqtt_url,
} = require("./mqtt.js")

dotenv.config()

console.log(`MQTT Logger v${version}`)

const { APP_PORT = 80, IDENTIFICATION_URL } = process.env

db_connect()

const app = express()
app.use(express.json())
app.use(cors())

app.get("/", (req, res) => {
  res.send({
    application_name: "MQTT logger",
    author,
    version,
    databases: {
      mongodb: {
        url: mongodb_url,
        db: mongodb_db,
      },
      influxdb: {
        url: influxdb_url,
        bucket: influxdb_bucket,
      },
    },

    mqtt: {
      url: mqtt_url,
      connected: getMqttClientConnected(),
    },
    auth: {
      identification_url: IDENTIFICATION_URL || "Unset",
    },
  })
})

if (IDENTIFICATION_URL) {
  const auth_options = { url: IDENTIFICATION_URL }
  auth(auth_options)
}

app.use("/sources", require("./routes/sources.js"))

app.use((error, req, res, next) => {
  // Express error handling
  console.error(error)
  let { statusCode = 500, message = error } = error
  if (isNaN(statusCode) || statusCode > 600) statusCode = 500
  res.status(statusCode).send(message)
})

app.listen(APP_PORT, () => {
  console.log(`[Express] listening on port ${APP_PORT}`)
})
