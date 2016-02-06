import FollowerSchema from './follower'

var mongoose = require('mongoose')
  , uuid = require('uuid')
  , Schema = mongoose.Schema;


var PostSchema = new Schema({
  _id : String,
  title: String,
  content: String,
  ownerId: String,
  numMsgs: { type: Number, default: 0 },
  topicIds: [String],
  followers: [FollowerSchema],
  createdAt: { type: Date, required: true, default: new Date() }
});

module.exports = mongoose.model('posts', PostSchema);
