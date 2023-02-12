import { Point } from "@influxdata/influxdb-client"
import { bucket, writeApi, deleteApi, influx_read, org } from "../influxdb"
import { Request, Response, NextFunction } from "express"
import { ISource } from "../models/source"

export const read_points = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // measurement name from query parameters

    const { _id: measurement } = req.params

    // Filters
    // Using let because some variable types might change
    const {
      start = "0", // by default, query all points
      stop,
      tags = [],
      fields = [],
      limit = 500, // Limit point count by default, note: this is approximative
    } = req.query

    const stop_query = stop ? `stop: ${stop}` : ""

    // If only one tag provided, will be parsed as string so put it in an array
    const tagArray = typeof tags === "string" ? [tags] : (tags as string[])
    const fieldArray =
      typeof fields === "string" ? [fields] : (fields as string[])

    // NOTE: check for risks of injection
    let query = `
      from(bucket:"${bucket}")
      |> range(start: ${start}, ${stop_query})
      |> filter(fn: (r) => r._measurement == "${measurement}")
    `

    //Adding fields to filter if provided in the query
    if (fields.length) {
      const fields_joined = fieldArray
        .map((f: string) => `r["_field"] == "${f}"`)
        .join(" or ")
      query += `|> filter(fn: (r) => ${fields_joined})`
    }

    //Adding tags to filter if provided in the query
    tagArray.forEach((tag: string) => {
      const tag_split = tag.split(":")
      query += `
      |> filter(fn: (r) => r["${tag_split[0]}"] == "${tag_split[1]}")
      `
    })

    // subsampling
    // Getting point count to compute the sampling from the limit
    const count_query = query + `|> count()`
    // TODO: fidn type
    const record_count_query_result: any = await influx_read(count_query)
    const record_count = record_count_query_result[0]?._value // Dirty here
    if (record_count) {
      const sampling = Math.max(Math.round(record_count / Number(limit)), 1)
      query += `|> sample(n:${sampling}, pos: 0)`
    }

    // Run the query
    const points = await influx_read(query)

    console.log(`[InfluxDB] Measurements of ${measurement} queried`)

    // Respond to client
    res.send({
      start,
      stop,
      limit,
      tags,
      fields,
      points,
    })
  } catch (error) {
    next(error)
  }
}

export const create_point = async (source: ISource, data: any) => {
  // Note: Not an express controller

  try {
    const { _id: measurement, keys, name, topic, tags } = source

    const point = new Point(measurement)

    // Use user-provided JSON keys or throw all data in otherwise
    const fields = keys && keys.length ? keys : Object.keys(data)

    for (const field of fields) {
      const value = data[field]

      if (value) {
        if (!isNaN(parseFloat(value)))
          point.floatField(field, parseFloat(value))
        else point.stringField(field, value)
      }
    }

    if (!Object.keys(point.fields).length) {
      console.log(`[InfluxDB] No field to get from point ${point}, skipping`)
      return
    }

    // Tags: topic and source name by default
    point.tag("name", name)
    point.tag("topic", topic)
    tags.forEach(({ key, value }) => point.tag(key, value))

    // write (flush hereunder is to actually perform the operation)
    writeApi.writePoint(point)

    await writeApi.flush()

    // console.log(
    //   `[InfluxDB] Point ${point} created in measurement ${measurement}`
    // )
  } catch (error) {
    console.error(error)
  }
}

export const delete_measurement = async (measurementId: string) => {
  // Delete one whole measurement in the InfluxDB bucket

  const stop = new Date()
  const start = new Date(0)

  await deleteApi.postDelete({
    org,
    bucket,
    body: {
      start: start.toISOString(),
      stop: stop.toISOString(),
      predicate: `_measurement="${measurementId}"`,
    },
  })

  console.log(`[InfluxDB] Measurement ${measurementId} deleted`)
}
