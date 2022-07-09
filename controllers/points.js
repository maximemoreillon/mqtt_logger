const { Point } = require('@influxdata/influxdb-client')
const {
  bucket,
  writeApi,
  influx_read,
} = require('../influxdb')

exports.read_points = async (req, res, next) => {

  try {
    // measurement name from query parameters

    const { _id: measurement } = req.params

    console.log(measurement)

    // Filters
    // Using let because some variable types might change
    let {
      start = '0', // by default, query all points
      stop,
      tags = [],
      fields = [],
      limit = 500, // Limit point count by default, note: this is approximative
    } = req.query

    const stop_query = stop ? (`stop: ${stop}`) : ''


    // If only one tag provided, will be parsed as string so put it in an array
    if (typeof tags === 'string') tags = [tags]
    if (typeof fields === 'string') fields = [fields]

    // NOTE: check for risks of injection
    let query = `
      from(bucket:"${bucket}")
      |> range(start: ${start}, ${stop_query})
      |> filter(fn: (r) => r._measurement == "${measurement}")
    `

    //Adding fields to filter if provided in the query
    if (fields.length) {
      const fields_joined = fields.map(f => `r["_field"] == "${f}"`).join(' or ')
      query += `|> filter(fn: (r) => ${fields_joined})`
    }

    //Adding tags to filter if provided in the query
    tags.forEach(tag => {
      const tag_split = tag.split(':')
      query += `
      |> filter(fn: (r) => r["${tag_split[0]}"] == "${tag_split[1]}")
      `
    })

    // subsampling
    // Getting point count to compute the sampling from the limit
    const count_query = query + `|> count()`
    const record_count_query_result = await influx_read(count_query)

    // dirty
    if (!record_count_query_result.length) return res.send([]) 


    const record_count = record_count_query_result[0]._value // Dirty here
    const sampling = Math.max(Math.round(12 * record_count / (limit)), 1) // Not sure why 12

    // Apply subsampling
    query += `|> sample(n:${sampling})`

    // Run the query
    const points = await influx_read(query)

    // Respond to client
    res.send(points)

    console.log(`Measurements of ${measurement} queried`)
  }
  catch (error) {
    next(error)
  }
}





exports.create_point = async (source, data) => {
  // Note: Not an express controller

  try {

    const { 
      _id: measurement,
      keys
    } = source

    const point = new Point(measurement)

    // Use user-provided JSON keys or throw all data in otherwise
    const fields = (keys && keys.length) ? keys : Object.keys(data)

    for (const field of fields) {
      const value = data[field]
      
      // Currently only float type supported
      if (value) point.floatField(field, parseFloat(value))
 
    }


    if (!Object.keys(point.fields).length) {
      console.log(`[InfluxDB] No field to get from point ${point}, skipping`)
      return
    }

    // write (flush hereunder is to actually perform the operation)
    writeApi.writePoint(point)

    await writeApi.flush()

    console.log(`[InfluxDB] Point ${point} created in measurement ${measurement}`)


  }
  catch (error) {
    console.error(error)
  }

}