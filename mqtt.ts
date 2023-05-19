import mqtt, { MqttClient } from "mqtt"
import dotenv from "dotenv"
import { Source, ISource } from "./models/source"
import { create_point } from "./controllers/points"

dotenv.config()

export const {
  MQTT_URL = "mqtt://localhost:1883",
  MQTT_USERNAME,
  MQTT_PASSWORD,
} = process.env

const mqtt_options = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 5000, // Default was too fast
  resubscribe: true, // Defaults to true
}

const message_handler = async (topic: string, messageBuffer: Buffer) => {
  try {
    const messageString = messageBuffer.toString()

    let messageJson: object
    try {
      messageJson = JSON.parse(messageString)
    } catch (error) {
      console.log(`[MQTT] Message ${messageString} cannot be parsed as JSON`)
      return
    }

    const sources = await Source.find({ topic })

    sources.forEach(async (source) => {
      await create_point(source, messageJson)
    })
  } catch (error) {
    console.log(error)
  }
}

let client: MqttClient

export const subscribe_all = async () => {
  // Note: requires a working MongoDB connection
  try {
    const sources = await Source.find({})
    sources.forEach(({ topic }) => {
      if (!topic) return
      console.log(`[MQTT] subscribing to ${topic}`)
      client.subscribe(topic)
    })
  } catch (error) {
    console.error(error)
  }
  
}

export const subscribe_single = async (source: ISource) => {
  const { topic } = source
  if (!topic) return
  console.log(`[MQTT] subscribing to ${topic}`)
  client.subscribe(topic)
}

export const connect = () =>
  new Promise((resolve, reject) => {
    console.log(`[MQTT] Connecting to ${MQTT_URL}...`)
    client = mqtt.connect(MQTT_URL, mqtt_options)

    client.on("connect", () => {
      console.log(`[MQTT] Connected to ${MQTT_URL}`)

      subscribe_all()
      client.on("message", message_handler)
      resolve(client)
    })

    client.on("error", () => {
      console.log(`[MQTT] Connection failed`)
    })
  })

export const getConnected = () => client?.connected
