import AttachmentSchema from './attachment'

var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var MessageSchema = new Schema({
  _id : String,
  ownerId: String,
  postId: String,
  content: String,
  source: String,
  attachments: { type: [AttachmentSchema], default: []},
  createdAt: { type: Date, required: true, default: new Date() } 
});

module.exports = mongoose.model('messages', MessageSchema);
