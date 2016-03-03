import { upsert, update, find, findOne, INFO } from './common'
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

  postNotify(options) {
    this.postsToNotify.push(options)
    return Promise.resolve(true)
  }
}

export default class Notifier {
  async postNotify({postId, excludeUsers = []}) {
    const users = await find(User, { followingPosts: postId })
    return Promise.all(users
      .filter((user) => excludeUsers.indexOf(user._id) < 0)
      .map((user) => {
        return findOne(Notification, {postId, ownerId: user._id})
        .then((notification) => {
          let upsertNotification
          if (notification) {
            upsertNotification = Object.assign({}, notification.toObject(), {
              status: 'active',
              createdAt: new Date(),
              lastActionTimestamp: new Date()
            })
          } else {
            upsertNotification = {
              _id: uuid.v4(),
              postId,
              ownerId: user._id,
              reason: 'post',
              status: 'active',
              createdAt: new Date()
            }
          }
          return upsert(Notification, {_id: upsertNotification._id}, upsertNotification)
        })
    }))
  }
}