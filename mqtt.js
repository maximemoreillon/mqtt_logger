const mqtt = require("mqtt")
const dotenv = require("dotenv")
const Source = require("./models/source.js")
const { create_point } = require("./controllers/points")

dotenv.config()

const { MQTT_URL, MQTT_USERNAME, MQTT_PASSWORD } = process.env

const mqtt_options = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 5000, // Default was too fast
  resubscribe: true, // Defaults to true
}

const message_handler = async (topic, messageBuffer) => {
  try {
    const messageString = messageBuffer.toString()

    let messageJson
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

const subscribe_all = async () => {
  const sources = await Source.find({})
  sources.forEach(({ topic }) => {
    if (!topic) return
    console.log(`[MQTT] subscribing to ${topic}`)
    client.subscribe(topic)
  })
}

exports.subscribe_single = async (source) => {
  const { topic } = source
  if (!topic) return
  console.log(`[MQTT] subscribing to ${topic}`)
  client.subscribe(topic)
}

let client

const connect = () =>
  new Promise((resolve, reject) => {
    console.log(`[MQTT] Connecting to ${MQTT_URL}...`)
    client = mqtt.connect(MQTT_URL, mqtt_options)

    client.on("connect", () => {
      console.log(`[MQTT] Connected to ${MQTT_URL}`)

      subscribe_all()
      client.on("message", message_handler)
      resolve()
    })

    client.on("error", () => {
      console.log(`[MQTT] Connection failed`)
    })
  })

exports.url = MQTT_URL
exports.getConnected = () => client?.connected
exports.subscribe_all = subscribe_all
exports.connect = connect
