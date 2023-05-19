import express from "express"
import "express-async-errors"
import cors from "cors"
import dotenv from "dotenv"
import auth from "@moreillon/express_identification_middleware"
import { version, author } from "./package.json"
import { Request, Response, NextFunction } from "express"
import {
  connect as db_connect,
  db as mongodb_db,
  url as mongodb_url,
} from "./mongodb"
import { bucket as influxdb_bucket, url as influxdb_url } from "./influxdb"
import { getConnected as getMqttClientConnected, MQTT_URL } from "./mqtt"
import sourcesRouter from "./routes/sources"
dotenv.config()

console.log(`MQTT Logger v${version}`)

const { APP_PORT = 80, IDENTIFICATION_URL } = process.env

// Note: MQTT connects in db_connect because also subscribes and needs access to topics for that
db_connect()

const app = express()
app.use(express.json())
app.use(cors())

app.get("/", (req: Request, res: Response) => {
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
      url: MQTT_URL,
      connected: getMqttClientConnected(),
    },
    auth: {
      identification_url: IDENTIFICATION_URL,
    },
  })
})

if (IDENTIFICATION_URL) {
  const auth_options = { url: IDENTIFICATION_URL }
  app.use(auth(auth_options))
}

app.use("/sources", sourcesRouter)

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  // Express error handling
  console.error(error)
  let { statusCode = 500, message = error } = error
  if (isNaN(statusCode) || statusCode > 600) statusCode = 500
  res.status(statusCode).send(message)
})

app.listen(APP_PORT, () => {
  console.log(`[Express] listening on port ${APP_PORT}`)
})
