var mongoose = require('mongoose')
  , uuid = require('uuid')
  , Schema = mongoose.Schema;

export default new Schema({
  _id: {
    type: String,
    unique: true,
    default: uuid.v4
  },
  url: String,
  contentType: String,
  name: String
})
