import { upsert, update, find, findOne, INFO } from './common'
import uuid from 'uuid'
import Topic from './models/topic'
import Post from './models/post'
import Notification from './models/notification'
import User from './models/user'
import ReplyParser from './reply-parser'

// exported for testing only
export class ReasonGenerator {
  constructor() {
    this.reasonImportanceMap = {
      reply: 0,
      newpost: 5,
      newchannel: 6,
      mention: 10
    }
  }

  generateReason(existingNotification, reason) {
    if (!existingNotification) {
      return reason
    }

    if (!existingNotification.reason) {
      return reason
    }

    return this.reasonImportanceMap[existingNotification] > this.reasonImportanceMap[reason]
      ? existingNotification.reason
      : reason
  }
}

export class MockNotifier {
  constructor() {
    this.postsToNotify = []
    this.channelsToNotify = []
  }

  notifyUsersSubscribedToChannel(options) {

  }

  notifyUsersFollowingPost(options) {
    this.postsToNotify.push(options)
    return Promise.resolve(true)
  }
}

export default class Notifier {

  constructor(reasonGenerator) {
    this.reasonGenerator = reasonGenerator || new ReasonGenerator()
  }

  async notifyUsersFollowingPost({postId, excludeUsers = [], reason = 'reply'}) {
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
              reason: this.reasonGenerator.generateReason(notification, reason),
              createdAt: new Date()
            })
          } else {
            upsertNotification = {
              _id: uuid.v4(),
              postId,
              ownerId: user._id,
              reason: reason,
              status: 'active',
              createdAt: new Date()
            }
          }
          return upsert(Notification, {_id: upsertNotification._id}, upsertNotification)
        })
    }))
  }
}