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
      _id: 'im-awesome'
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

  it ('should upsert a notification for each user that follows the post', (done) => {
    new Notifier().postNotify('im-awesome')
    .then(() => {
      return find(Notification, {})
    })
    .then((notifications) => {
      expect(notifications.length).to.equal(2)
      const byId = _.indexBy(notifications, 'ownerId')

      const verifyNotification = (notification) => {
        expect(notification).to.exist
        expect(notification.postId).to.equal('im-awesome')
        expect(notification.createdAt).to.exist
        expect(notification.status).to.equal('active')
      }

      verifyNotification(byId.tony)
      verifyNotification(byId.qiming)

      done()
    })
    .catch(err => done(err))
  })
})
