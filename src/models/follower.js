var mongoose = require('mongoose')
  , uuid = require('uuid')
  , Schema = mongoose.Schema;

export default new Schema({
  _id: {
    type: String,
    unique: true,
    default: uuid.v4,
  },
  userId: String,
  unreadCount: { type: String, default: 0 },
  isTyping: {type: Boolean, default: false },
})
