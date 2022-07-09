const Source = require('../models/source.js')
const { subscribe_all } = require('../mqtt')

exports.create_source = async (req, res, next) => {
  const properties = req.body
  const source = await Source.create(properties)
  res.send(source)
}


exports.get_sources = async (req, res, next) => {
  const sources = await Source.find({})
  res.send(sources)
}

exports.get_source = async (req, res, next) => {
  const {_id} = req.params
  const source = await Source.findOne({_id})
  res.send(source)
}


exports.update_source = async (req, res, next) => {
  try {
    const {_id} = req.params
    const properties = req.body
    const result = await Source.findOneAndUpdate({_id}, properties)
    console.log(`Source ${_id} updated`)
    subscribe_all()
    res.send(result)
  }
  catch (error) {
    next(error)
  }
}

exports.delete_source = async (req, res, next) => {
  try {
    const {_id} = req.params
    const result = await Source.findOneAndDelete({_id})
    console.log(`Source ${_id} deleted`)
    res.send(result)
  }
  catch (error) {
    next(error) 
  }
}
