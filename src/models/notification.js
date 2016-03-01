import mongoose  from 'mongoose'
const Schema = mongoose.Schema

var NotificationSchema = new Schema({
  _id : String,
  ownerId: String,

  // Notifications from posts.
  postId: String,
  createdAt: { type: Date, required: true, default: new Date() }
});

export default mongoose.model('notifications', NotificationSchema);
