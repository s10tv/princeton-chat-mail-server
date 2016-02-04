import FollowerSchema from './follower'

var mongoose = require('mongoose')
  , uuid = require('uuid')
  , Schema = mongoose.Schema;


var PostSchema = new Schema({
  _id : String,
  title: String,
  content: String,
  ownerId: String,
  topicIds: [String],
  followers: [FollowerSchema],
});

module.exports = mongoose.model('posts', PostSchema);
