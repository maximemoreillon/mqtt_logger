import dotenv from "dotenv"
dotenv.config()

import express from "express"
import "express-async-errors"
import cors from "cors"
import auth from "@moreillon/express_identification_middleware"
import oidcMiddleware from "@moreillon/express-oidc"
import { version, author } from "./package.json"
import { Request, Response, NextFunction } from "express"
import {
  connect as db_connect,
  redactedConnectionString as mongodbConnectionString,
  get_connected as mongodbGetConnectionState,
} from "./mongodb"
import { bucket as influxdb_bucket, url as influxdb_url } from "./influxdb"
import { getConnected as getMqttClientConnected, MQTT_URL } from "./mqtt"
import sourcesRouter from "./routes/sources"

console.log(`MQTT Logger v${version}`)

const { APP_PORT = 80, IDENTIFICATION_URL, OIDC_JWKS_URI } = process.env

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
        connection_string: mongodbConnectionString,
        connection_state: mongodbGetConnectionState(),
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
      oidc_jwks_uri: OIDC_JWKS_URI,
    },
  })
})

if (OIDC_JWKS_URI) {
  console.log(`[Auth] Enabling OIDC authentication using ${OIDC_JWKS_URI}`)
  app.use(oidcMiddleware({ jwksUri: OIDC_JWKS_URI }))
} else if (IDENTIFICATION_URL) {
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
