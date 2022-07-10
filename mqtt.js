const mqtt = require('mqtt')
const dotenv = require('dotenv')
const Source = require('./models/source.js')
const axios = require('axios')
const { create_point } = require('./controllers/points')

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

    let messageJson
    try {
      messageJson = JSON.parse(messageString)
    }
    catch (error) {
      console.log(`[MQTT] Message ${messageString} cannot be parsed as JSON`)
      return 
    }
    
    const sources = await Source.find({topic})

    sources.forEach( async (source) => {
      await create_point(source, messageJson)
    })

  }
  catch (error) {
    console.log(error)
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

exports.subscribe_single = async (source) => {
  const {topic} = source
  if (!topic || topic === '') return
  console.log(`[MQTT] subscribing to ${topic}`)
  client.subscribe(topic)
}




const client = mqtt.connect(MQTT_URL, mqtt_options)

client.on('connect', () => {
  console.log(`[MQTT] Connected to ${MQTT_URL}`)
})

client.on('message', message_handler )

exports.url = MQTT_URL
exports.client = client

