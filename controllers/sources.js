const Source = require('../models/source.js')
const { subscribe_single } = require('../mqtt')
const { delete_measurement } = require('./points')

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
    const sources = await Source.find({})
    res.send(sources)
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
    const {_id} = req.params
    const properties = req.body
    const source = await Source.findOneAndUpdate({_id}, properties, {new: true})
    console.log(`[MongoDB] Source ${_id} updated`)
    subscribe_single(source)
    
    res.send(source)
  }
  catch (error) {
    next(error)
  }
}

exports.delete_source = async (req, res, next) => {
  try {
    const {_id} = req.params
    const result = await Source.findOneAndDelete({_id})
    await delete_measurement({ _id })
    console.log(`[MongoDB] Source ${_id} deleted`)
    res.send(result)
  }
  catch (error) {
    next(error) 
  }
}
