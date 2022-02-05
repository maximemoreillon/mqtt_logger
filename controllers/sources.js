const Source = require('../models/source.js')

exports.get_sources = async (req, res) => {
  const sources = await Source.find({})
  res.send(sources)
}
