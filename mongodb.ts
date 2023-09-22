import mongoose from "mongoose"
import dotenv from "dotenv"
import { connect as mqtt_connect } from "./mqtt"

dotenv.config()

export const {
  MONGODB_URL: url = "mongodb://mongo",
  MONGODB_DB: db = "mqtt_logger",
} = process.env

export const connect = () => {
  mongoose
    .connect(`${url}/${db}`)
    .then(() => {
      console.log("[Mongoose] Initial connection successful")
      mqtt_connect()
    })
    .catch((error) => {
      console.log("[Mongoose] Initial connection failed")
      setTimeout(connect, 5000)
    })
}
