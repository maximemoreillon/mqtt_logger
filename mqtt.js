const mqtt = require('mqtt')
const dotenv = require('dotenv')
const Source = require('./models/source.js')

const { Point } = require('@influxdata/influxdb-client')
const {
  org,
  bucket,
  writeApi,
  influx_read,
  deleteApi
} = require('./influxdb.js')

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
    sources.forEach((source) => {
      const {json_key, _id: measurement} = source
      const value = messageJson[json_key]
      const point = new Point(measurement)
      point.floatField(json_key, value)
      writeApi.writePoint(point)
    })

    await writeApi.flush()

    console.log(`[InfluxDB] Points created`)


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
