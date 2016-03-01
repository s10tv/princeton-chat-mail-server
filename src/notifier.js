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
    return Promise.resolve(true)
  }
}

export default class Notifier {
  async postNotify(postId) {
    const posts = await find(Post, {_id: postId})

    if (posts.length !== 1) {
      throw new Error(`Did not find 1 post with id=${postId}. Found ${posts.length}`)
    }

    const [post] = posts

    const users = await find(User, { followingPosts: postId })
    return Promise.all(users
      .filter((user) => user._id !== post.ownerId)
      .map((user) => {
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