import FollowerSchema from './follower'

var mongoose = require('mongoose')
  , uuid = require('uuid')
  , Schema = mongoose.Schema;

var TopicSchema = new Schema({
  _id : String,
  displayName: String,
  followers: [FollowerSchema],
});

module.exports = mongoose.model('topics', TopicSchema);
