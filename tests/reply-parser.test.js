import { expect } from 'chai'
import ReplyParser from '../src/reply-parser'
import INBOUND_MAIL_DATA from './data/inbound.mail.js'
import REPLY_ALL_MAIL_DATA from './data/reply-all.mail.js'
import ERROR_MULTIPLE_TO_DATA from './data/error.multiple.to.mail.js'

describe('ReplyParser', () => {

  it('should parse reply correctly', () => {
    const { fromName, fromEmail, postId, content,} = new ReplyParser().parse(INBOUND_MAIL_DATA);
    expect(fromName).to.equal('Postmarkapp Support')
    expect(fromEmail).to.equal('nurym@gmail.com')
    expect(postId).to.equal('POST_ID')
    expect(content).to.equal('This is the reply text')
  })

  it('should parse reply-all correctly', () => {
    const {
      fromName,
      fromEmail,
      postId,
      topicToPost,
      topicsToNotify,
      content,
    } = new ReplyParser().parse(REPLY_ALL_MAIL_DATA);

    expect(fromName).to.equal('Qiming Fang')
    expect(fromEmail).to.equal('fang@taylrapp.com')
    expect(postId).to.equal('d2cba2d8-4206-48cd-9fd4-3d8dca31a8ea')
    expect(topicToPost).not.to.exist;
    expect(topicsToNotify).to.deep.equal(['noop'])
    expect(content).to.equal('hi')
  })

  it('should throw error if there is a @topic and @post in the TO field', () => {
    try {
      new ReplyParser().parse(ERROR_MULTIPLE_TO_DATA);
      fail('Having @topic and @post in the TO field should have resulted in error')
    } catch (err) { /* good */}
  })
})
