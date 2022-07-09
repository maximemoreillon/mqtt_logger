const mqtt = require('mqtt')
const dotenv = require('dotenv')
const Source = require('./models/source.js')
const axios = require('axios')


dotenv.config()

const {
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  TIME_SERIES_STORAGE_API_URL
} = process.env

const mqtt_options = {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
}

const message_handler = async (topic, messageBuffer) => {


  try {
    const messageString = messageBuffer.toString()

    let messageJson
    try {
      messageJson = JSON.parse(messageString)
    }
    catch (error) {
      console.log(`Message ${messageString} cannot be parsed as JSON`)
      return 
    }
    
    const sources = await Source.find({topic})

    sources.forEach( async (source) => {

      const {
        json_key, 
        _id: measurement_id, 
        name: measurement_name
      } = source

      const value = parseFloat(messageJson[json_key])

      const url = `${TIME_SERIES_STORAGE_API_URL}/measurements/${measurement_id}`

      const body = { [json_key]: value}

      await axios.post(url, body)

      console.log(`[InfluxDB] Created point "${json_key} = ${value}" in measurement "${measurement_name}" (ID ${measurement_id})`);

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
    console.log(`[MQTT] subscribing to ${topic}`)
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

