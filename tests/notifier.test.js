import { upsert, update, find, INFO } from '../src/common'
import mongoose from 'mongoose'
import {expect} from 'chai'
import _ from 'underscore'
import Notifier from '../src/notifier'
import Post from '../src/models/post'
import Notification from '../src/models/notification'
import User from '../src/models/user'

const dbURI = 'mongodb://localhost:27017/test';

describe('Notifier', () => {
  before(function (done) {
    if (mongoose.connection.db) return done();
    mongoose.connect(dbURI, done);
  });

  beforeEach((done) => {
    Notification.remove({}, done)
  });

  beforeEach((done) => {
    Post.remove({}, done)
  });

  beforeEach((done) => {
    User.remove({}, done)
  });

  beforeEach((done) => {
    new Post({
      _id: 'im-awesome',
    }).save(done)
  })

  beforeEach((done) => {
    new User({
      _id: 'qiming',
      followingPosts: ['im-awesome']
    }).save(done)
  })

  beforeEach((done) => {
    new User({
      _id: 'tony',
      followingPosts: ['im-awesome']
    }).save(done)
  })

  beforeEach((done) => {
    new User({
      _id: 'nurym'
    }).save(done)
  })

  const verifyNotification = (notification) => {
    expect(notification).to.exist
    expect(notification.postId).to.equal('im-awesome')
    expect(notification.createdAt).to.exist
    expect(notification.status).to.equal('active')
  }

  it ('should upsert a notification for each user that follows the post', (done) => {
    new Notifier().postNotify({ postId: 'im-awesome' })
    .then(() => {
      return find(Notification, {})
    })
    .then((notifications) => {
      expect(notifications.length).to.equal(2)
      const byId = _.indexBy(notifications, 'ownerId')

      verifyNotification(byId.tony)
      verifyNotification(byId.qiming)

      done()
    })
    .catch(err => done(err))
  })

  it('should exclude users in excludeUsers', (done) => {
    new Notifier().postNotify({ postId: 'im-awesome', excludeUsers: ['qiming'] })
      .then(() => {
        return find(Notification, {})
      })
      .then((notifications) => {
        expect(notifications.length).to.equal(1)
        const byId = _.indexBy(notifications, 'ownerId')
        verifyNotification(byId.tony)
        done()
      })
      .catch(err => done(err))
  })

  describe('if an existing notification already exists for the post', () => {
    beforeEach((done) => {
      new Notification({
        _id: 'existing-notification',
        postId: 'im-awesome',
        ownerId: 'qiming'
      }).save(done)
    })
    it('should update existing notification if it exists', (done) => {
      new Notifier().postNotify({ postId: 'im-awesome' })
        .then(() => {
          return find(Notification, {})
        })
        .then((notifications) => {
          const byId = _.indexBy(notifications, 'ownerId')
          expect(byId.qiming._id).to.equal('existing-notification')
          done()
        })
        .catch(err => done(err))
    })
  })
})
