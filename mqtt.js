const mqtt = require('mqtt')
const dotenv = require('dotenv')
const Source = require('./models/source.js')
const axios = require('axios')


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

const message_handler = async (topic, messageBuffer) => {


  try {
    const messageString = messageBuffer.toString()
    const messageJson = JSON.parse(messageString)
    const sources = await Source.find({topic})

    sources.forEach( async (source) => {
      const {json_key, _id: measurement} = source
      const value = parseFloat(messageJson[json_key])

      const url = `${process.env.INFLUXDB_CRUD_REST_API_URL}/measurements/${measurement}`

      // Most likely a nicer way to write that
      const body = {}
      body[json_key] = value

      const {data} = await axios.post(url, body)

      console.log(`[InfluxDB] Created point in measurement ${measurement}`);

    })

  }
  catch (e) {
    console.log(e);
  }
  
}

exports.subscribe_all = async () => {
  const sources = await Source.find({})
  sources.forEach(({topic}) => {
    if(!topic || topic === '') return
    client.subscribe(topic)

  })
}




const client = mqtt.connect(MQTT_URL, mqtt_options)

client.on('connect', () => {
  console.log(`[MQTT] Connected to ${MQTT_URL}`)
})

client.on('message', message_handler )

exports.url = MQTT_URL
exports.client = client
