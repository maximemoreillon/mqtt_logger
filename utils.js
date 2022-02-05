const Source = require('./models/source.js')

exports.error_handling = (error, res) => {
  console.log(error)
  res.status(500).send(error)
}
