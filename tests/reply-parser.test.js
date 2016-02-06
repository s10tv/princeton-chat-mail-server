import { expect } from 'chai'
import ReplyParser from '../src/reply-parser'
import INBOUND_MAIL_DATA from './data/inbound.mail.js'

describe('ReplyParser', () => {

  it('should parse reply correctly', () => {
    const { fromName, fromEmail, postId, content,} = new ReplyParser().parse(INBOUND_MAIL_DATA);
    expect(fromName).to.equal('Postmarkapp Support')
    expect(fromEmail).to.equal('nurym@gmail.com')
    expect(postId).to.equal('POST_ID')
    expect(content).to.equal('This is the reply text')
  })

  it('should parse reply-all correctly', () => {

  })

  // TODO: add tests for invalid caes.
})
