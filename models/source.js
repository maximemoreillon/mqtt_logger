const { Schema, model } = require('mongoose')


 const schema = new Schema({
   name: String,
   description: String,
   user_id: String,
   topic: String,

 })

 const Source = model('Source', schema)

 module.exports = Source
