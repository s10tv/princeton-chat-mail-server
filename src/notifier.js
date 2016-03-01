import { upsert, update, find, INFO } from './common'
import uuid from 'uuid'
import Topic from './models/topic'
import Post from './models/post'
import Notification from './models/notification'
import User from './models/user'
import ReplyParser from './reply-parser'

export class MockNotifier {
  constructor() {
    this.postsToNotify = []
  }

  postNotify(postId) {
    this.postsToNotify.push(postId)
  }
}

export default class Notifier {
  async postNotify(postId) {
    const users = await find(User, { followingPosts: postId })
    return Promise.all(users.map((user) => {
      const notificationId = uuid.v4()
      return upsert(Notification, { _id: notificationId}, {
        _id: notificationId,
        postId,
        status: 'active',
        ownerId: user._id,
        createdAt: new Date()
      })
    }))
  }
}