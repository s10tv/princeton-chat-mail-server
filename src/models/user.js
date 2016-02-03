var mongoose = require('mongoose')
  , Schema = mongoose.Schema;

var EmailSchema = new Schema({
  address: String,
  verified: Boolean,
})

var UserSchema = new Schema({
  _id : String,
  username: String,
  firstName: String,
  lastName: String,
  emails: [EmailSchema],
  emailPreference: String, // 'digest', 'all', 'none',
  followingTopics: [String],
  followingPosts: [String],
  status: String,
});

module.exports = mongoose.model('User', UserSchema);
