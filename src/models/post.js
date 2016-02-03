var mongoose = require('mongoose')
  , uuid = require('uuid')
  , Schema = mongoose.Schema;

var FollowerSchema = new Schema({
  _id: {
    type: String,
    unique: true,
    default: uuid.v4,
  },
  userId: String,
  unreadCount: { type: String, default: 0 },
  isTyping: {type: Boolean, default: false },
})

var PostSchema = new Schema({
  _id : String,
  title: String,
  content: String,
  ownerId: String,
  topicIds: [String],
  followers: [FollowerSchema],
});

module.exports = mongoose.model('posts', PostSchema);
