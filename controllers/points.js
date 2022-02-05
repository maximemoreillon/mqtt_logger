const {error_handling} = require('../utils.js')
const {
  org,
  bucket,
  writeApi,
  influx_read,
  deleteApi
} = require('../influxdb.js')

exports.read_points = async (req, res) => {

  try {
    // measurement name from query parameters

    const measurement = req.params._id

    // Filters
    // Using let because some variable types might change
    let {
      start = '0',
      stop,
      tags = [],
      fields = [],
    } = req.query

    const stop_query = stop ? (`stop: ${stop}`) : ''


    // If only one tag provided, will be parsed as string so put it in an array
    if(typeof tags === 'string') tags = [tags]
    if(typeof fields === 'string') fields = [fields]

    // WARNING: Risks of injection
    let query = `
      from(bucket:"${bucket}")
      |> range(start: ${start}, ${stop_query})
      |> filter(fn: (r) => r._measurement == "${measurement}")
    `

    //Adding fields to filter if provided in the query
    if(fields.length){
      const fields_joined = fields.map( f => `r["_field"] == "${f}"`).join(' or ')
      query += `|> filter(fn: (r) => ${fields_joined})`
    }

    //Adding tags to filter if provided in the query
    tags.forEach(tag => {
      const tag_split = tag.split(':')
      query += `
      |> filter(fn: (r) => r["${tag_split[0]}"] == "${tag_split[1]}")
      `
    })

    // Run the query
    const result = await influx_read(query)

    console.log(`[InfluxDB] Measurements of ${measurement} queried`)

    // Respond to client
    res.send(result)

  }
  catch (error) {
    error_handling(error,res)
  }
}
