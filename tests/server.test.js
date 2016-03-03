import { expect } from 'chai'
import rewire from 'rewire'
import request from 'supertest'

import MockEmailSender from './mocks/MockEmailSender'
import MockSlack from './mocks/MockSlack'
import {MockNotifier} from '../src/notifier'
import PULSE_DATA from './data/pulse-data'
import PULSE_ERROR_DATA from './data/pulse-error-data'

const app = rewire('../src/server')

describe('Server', () => {
  let Sender = null
  let Slack = null
  let NotificationSender = null

  beforeEach(() => {
    Sender =  new MockEmailSender()
    Slack = new MockSlack()
    NotificationSender = new MockNotifier()

    app.__set__('Sender', Sender)
    app.__set__('slackClient', Slack)
    app.__set__('NotificationSender', NotificationSender)
  })

  it('should handle /email-reply', (done) => {
    const POSTMARK_DATA = { test: 'true' }

    request('http://localhost:5000')
      .post('/email-reply')
      .send(POSTMARK_DATA)
      .expect(200)
      .end(function(err, res) {
        expect(Sender.emailBody).to.deep.equal({"test": "true"});
        done()
      });
  })

  it('should handle /web-post', (done) => {
    request('http://localhost:5000')
      .post('/web-post')
      .send({ postId: 'post-id' })
      .expect(200)
      .end(function(err, res) {
        expect(Sender.postId).to.equal('post-id');
        done()
      });
  });

  it('should handle /web-message', (done) => {
    request('http://localhost:5000')
      .post('/web-message')
      .send({ messageId: 'message-id' })
      .expect(200)
      .end(function(err, res) {
        expect(Sender.messageId).to.equal('message-id');
        done()
      });
  });

  it('should handle /notify/reply', (done) => {
    request('http://localhost:5000')
      .post('/notify/reply')
      .send({ postId: 'post-id' })
      .expect(200)
      .end(function(err, res) {
        expect(NotificationSender.postsToNotify).to.deep.equal([{
          postId: 'post-id',
          excludeUsers: []
        }]);
        done()
      });
  });

  it('should handle /mailgun/pulse', (done) => {
    request('http://localhost:5000')
      .post('/mailgun/pulse')
      .send(PULSE_DATA)
      .expect(200)
      .end(function(err, res) {
        expect(Slack.queue.length).to.equal(1)
        const [msg] = Slack.queue
        expect(msg).to.equal('fang@taylrapp.com opened our mail (20160209053519.16564.71791@dev.topics.princeton.chat)')
        done()
      });
  });

  it('should have special handilng for erroneous /mailgun/pulse', (done) => {
    request('http://localhost:5000')
      .post('/mailgun/pulse')
      .send(PULSE_ERROR_DATA)
      .expect(200)
      .end(function(err, res) {
        expect(Slack.queue.length).to.equal(0)
        expect(Slack.attention_queue.length).to.equal(1)
        const [msg] = Slack.attention_queue
        expect(msg).to.equal('fang@taylrapp.com dropped our mail (20160209053519.16564.71791@dev.topics.princeton.chat)')
        done()
      });
  });
})
