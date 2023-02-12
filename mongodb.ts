import mongoose from "mongoose"
import dotenv from "dotenv"
import { connect as mqtt_connect } from "./mqtt"

dotenv.config()

const { MONGODB_URL = "mongodb://mongo", MONGODB_DB = "mqtt_logger" } =
  process.env

const connection_url = `${MONGODB_URL}/${MONGODB_DB}`

export const connect = () => {
  mongoose
    .connect(connection_url)
    .then(() => {
      console.log("[Mongoose] Initial connection successful")
      mqtt_connect()
    })
    .catch((error) => {
      console.log("[Mongoose] Initial connection failed")
      setTimeout(connect, 5000)
    })
}

export const url = MONGODB_URL
export const db = MONGODB_DB
