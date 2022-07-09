const axios = require('axios')

exports.read_points = async (req, res, next) => {

  try {
    // measurement name from query parameters
    const measurement = req.params._id
    const url = `${process.env.INFLUXDB_CRUD_REST_API_URL}/measurements/${measurement}`
    const {data} = await axios.get(url)

    console.log(`[InfluxDB] Points of ${measurement} queried`)

    // Respond to client
    res.send(data)

  }
  catch (error) {
    next(error)
  }
}
