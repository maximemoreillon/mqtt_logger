const mqtt = require('mqtt')
const dotenv = require('dotenv')
dotenv.config()

const {
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
} = process.env

const mqtt_options = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
}


const client = mqtt.connect(MQTT_URL, mqtt_options)

client.on('connect', () => {
  console.log(`[MQTT] Connected to ${MQTT_URL}`)
})

exports.url = MQTT_URL
exports.client = client
