import { expect } from 'chai'
import ReplyParser from '../src/reply-parser'
import INBOUND_MAIL_DATA from './data/inbound.mail.js'
import REPLY_ALL_MAIL_DATA from './data/reply-all.mail.js'
import NEW_POST_MAIL_DATA from './data/new.post.mail.js'
import ERROR_MULTIPLE_TO_DATA from './data/error.multiple.to.mail.js'
import ATTACHMENT_MAIL_DATA from './data/attachment.mail.js'

describe ('ReplyParser', () => {

  it ('should parse reply correctly', () => {
    const {
      fromName, fromEmail, postId, content, ignoreEmail
    } = new ReplyParser().parse(INBOUND_MAIL_DATA);

    expect(fromName).to.equal('Postmarkapp Support')
    expect(fromEmail).to.equal('nurym@gmail.com')
    expect(postId).to.equal('POST_ID')
    expect(content).to.equal('This is the reply text\r\nQiming')
    expect(ignoreEmail).to.equal(false);
  })

  it('should parse attachment reply correctly', () => {
    const {
      fromName, fromEmail, postId, content, ignoreEmail, attachments
    } = new ReplyParser().parse(ATTACHMENT_MAIL_DATA)

    expect(fromName).to.equal('Qiming Fang')
    expect(fromEmail).to.equal('fang@taylrapp.com')
    expect(postId).to.equal('0b0baf8b-9af0-400d-ac9e-eeb6ca9c3290')
    expect(content).to.equal('cat icon:\r\n\r\n[image: Inline image 1]\r\nᐧ')
    expect(ignoreEmail).to.equal(false)
    expect(attachments).to.deep.equal([{
      url: 'https://api.mailgun.net/v2/domains/dev.posts.princeton.chat/messages/WyJhOWUxYTFjN2UzIiwgWyJiZTc3YTBhMC0wNWZmLTQ4M2YtODhhOS1kNGExMTQ4N2I2NGYiXSwgIm1haWxndW4iLCAib2RpbiJd/attachments/0',
      contentType: 'image/png',
      name: 'cat-icon.png'
    }])
  })

  it ('should ignore reply-all emails delivered to topic server', () => {
    const TO_TOPIC_MS_REPLY_ALL = JSON.parse(JSON.stringify(REPLY_ALL_MAIL_DATA))
    TO_TOPIC_MS_REPLY_ALL.recipient = 'noop@dev.topics.princeton.chat';

    const {
      ignoreEmail,
    } = new ReplyParser().parse(TO_TOPIC_MS_REPLY_ALL);

    expect(ignoreEmail).to.equal(true)
  })

  it('should parse attachment reply correctly', () => {
    const {
      fromName, fromEmail, postId, content, ignoreEmail, attachments
    } = new ReplyParser().parse(ATTACHMENT_MAIL_DATA)

    expect(fromName).to.equal('Qiming Fang')
    expect(fromEmail).to.equal('fang@taylrapp.com')
    expect(postId).to.equal('0b0baf8b-9af0-400d-ac9e-eeb6ca9c3290')
  })


  it ('should parse reply-all correctly', () => {
    const {
      ignoreEmail,
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
    expect(ignoreEmail).to.equal(false)
  })

  it ('should strip out invalid characters', () => {
    const TO_TOPIC_MS_REPLY_ALL = JSON.parse(JSON.stringify(REPLY_ALL_MAIL_DATA))
    TO_TOPIC_MS_REPLY_ALL.To = 'The complete guide to growth class by YesGraph (YC <reply+5e092b8b-a746-4a81-8b37-ad4c83d5e261@dev.posts.princeton.chat>';
    const {
      postId
    } = new ReplyParser().parse(TO_TOPIC_MS_REPLY_ALL);

    expect(postId).to.equal('5e092b8b-a746-4a81-8b37-ad4c83d5e261')
  })

  it ('should parse new post emails correctly', () => {
    const {
      ignoreEmail
    } = new ReplyParser().parse(NEW_POST_MAIL_DATA);
    expect(ignoreEmail).to.equal(true)
  })

  it ('should throw error if there is a @topic and @post in the TO field', () => {
    try {
      new ReplyParser().parse(ERROR_MULTIPLE_TO_DATA);
      fail('Having @topic and @post in the TO field should have resulted in error')
    } catch (err) { /* good */}
  })
})
