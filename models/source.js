const { Schema, model } = require("mongoose")

const tagSchemma = new Schema({
  key: String,
  value: String,
})

const schema = new Schema({
  name: String,
  description: String,
  user_id: String,
  topic: String,
  keys: { type: [String], default: [] },
  tags: { type: [tagSchemma], default: [] },
})

const Source = model("Source", schema)

module.exports = Source
