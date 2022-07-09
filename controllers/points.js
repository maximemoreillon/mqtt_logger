const axios = require('axios')


const {
  TIME_SERIES_STORAGE_API_URL
} = process.env

exports.read_points = async (req, res, next) => {

  try {
    // measurement name from query parameters
    const measurement = req.params._id
    const url = `${TIME_SERIES_STORAGE_API_URL}/measurements/${measurement}`
    const {data} = await axios.get(url)

    console.log(`[InfluxDB] Points of ${measurement} queried`)

    // Respond to client
    res.send(data)

  }
  catch (error) {
    next(error)
  }
}
