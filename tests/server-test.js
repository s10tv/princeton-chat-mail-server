import { expect } from 'chai'
import rewire from 'rewire'
import request from 'supertest'

import MockEmailSender from './mocks/MockEmailSender'

const app = rewire('../src/server')

describe('Server', () => {
  let Sender = null

  beforeEach(() => {
    Sender =  new MockEmailSender()
    app.__set__('Sender', Sender)
  })

  it('should handle /postmark-message-reply', (done) => {
    const POSTMARK_DATA = { test: 'true' }

    request('http://localhost:5000')
      .post('/postmark-message-reply')
      .send(POSTMARK_DATA)
      .expect(200)
      .end(function(err, res) {
        expect(Sender.postmarkInput).to.deep.equal({"test": "true"});
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
})
