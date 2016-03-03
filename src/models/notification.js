import mongoose  from 'mongoose'
const Schema = mongoose.Schema

var NotificationSchema = new Schema({
  _id : String,
  ownerId: String,

  // Notifications from posts.
  postId: String,

  status: { type: String, enum: ['active', 'read'] },

  reason: { type: String,
    enum: ['newpost', 'reply', 'newchannel', 'mention'],
    required: true },

  lastActionTimestamp: { type: Date, required: true, default: new Date() },
  createdAt: { type: Date, required: true, default: new Date() }
});

export default mongoose.model('notifications', NotificationSchema);
