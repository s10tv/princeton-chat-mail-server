var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var MessageSchema = new Schema({
  _id : String,
  ownerId: String,
  postId: String,
  content: String,
  source: String,
  createdAt: { type: Date, required: true, default: new Date() } 
});

module.exports = mongoose.model('messages', MessageSchema);
