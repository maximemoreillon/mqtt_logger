const Source = require("../models/source.js")
const { subscribe_single } = require("../mqtt")
const { delete_measurement } = require("./points")

exports.create_source = async (req, res, next) => {
  try {
    const properties = req.body
    const source = await Source.create(properties)
    console.log(`[MongoDB] Source ${source._id} created`)
    res.send(source)
  } catch (error) {
    next(error)
  }
}

exports.get_sources = async (req, res, next) => {
  try {
    const { skip = 0, limit = 50, order = -1, sort = "_id", search } = req.query

    const query = {}

    if (search) {
      const regex = { $regex: search, $options: "i" }
      const searchableProperties = ["name", "topic"]
      query.$or = searchableProperties.map((p) => ({ [p]: regex }))
    }
    const total = await Source.countDocuments(query)

    const sources = await Source.find(query)
      .skip(Number(skip))
      .sort({ [sort]: order })
      .limit(Math.max(Number(limit), 0))

    res.send({ skip, limit, order, sort, total, items: sources })
  } catch (error) {
    next(error)
  }
}

exports.get_source = async (req, res, next) => {
  try {
    const { _id } = req.params
    const source = await Source.findOne({ _id })
    res.send(source)
  } catch (error) {
    next(error)
  }
}

exports.update_source = async (req, res, next) => {
  try {
    const { _id } = req.params
    const properties = req.body
    const source = await Source.findOneAndUpdate({ _id }, properties, {
      new: true,
    })
    console.log(`[MongoDB] Source ${_id} updated`)
    subscribe_single(source)

    res.send(source)
  } catch (error) {
    next(error)
  }
}

exports.delete_source = async (req, res, next) => {
  try {
    const { _id } = req.params
    const result = await Source.findOneAndDelete({ _id })
    await delete_measurement({ _id })
    console.log(`[MongoDB] Source ${_id} deleted`)
    res.send(result)
  } catch (error) {
    next(error)
  }
}
