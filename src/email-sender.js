import { upsert, update, find, INFO } from './common'
import uuid from 'uuid'
import mongoose from 'mongoose'
import truncate from 'truncate'
import { Promise } from 'es6-promise'
import i18n from 'i18n'
import request from 'request'

import Topic from './models/topic'
import Post from './models/post'
import Message from './models/message'
import User from './models/user'
import ReplyParser from './reply-parser'
import secrets from './config/secrets'
import logger from './logger'
import Mailer from './mailer'
import {generateHash} from './auth'

export default class EmailSender {

  constructor(mailer, slack, azure) {
    this.mailer = mailer;
    this.slack = slack;
    this.azure = azure;
  }

  /**
   * Handles replying to a post thread directly via email.
   */
  async handleEmailReply(postedEmailInput) {
    INFO(postedEmailInput);

    const info = new ReplyParser().parse(postedEmailInput);
    INFO(info)

    const {
      ignoreEmail,
      fromName,
      fromEmail,
      postId,
      topicToPost,
      topicsToNotify,
      subject,
      attachments,
      content } = info

    if (ignoreEmail) {
      // drop this email because it does not need to be handled.
      return true
    }

    if (topicToPost) {
      // Possibly a new post since the email didn't come with a post id.
      return this.__handleNewPostFromEmail({
        fromEmail, fromName, topicToPost, subject, content, attachments })
    }

    // Possibly a reply to an existing post, since the message came witha  post id.
    return this.__handleMessageFromEmail({
      postId, fromEmail, fromName, content, topicsToNotify, attachments})
  }

  async __handleNewPostFromEmail({
    fromEmail,
    fromName,
    topicToPost,
    subject,
    content,
    attachments}) {
    const errorEmailSubject = `[${i18n.__('title')}] Problem Posting RE: ${subject}`;
    const senderUser = await this.__findUserFromEmail({ fromEmail, fromName, errorEmailSubject })
    const topics = await Topic.find({ _id: { $regex: new RegExp(`^${topicToPost}`, "i") }})
    const [ topic ] = topics;

    if (!topic) {
      const greeting = fromName && fromName.length > 0 ? `Hey ${fromName},` : 'Hello!';
      const errorEmailContent = `${greeting}<br /><br />
        We just got your email to <b>${topicToPost}</b>, but it wasn't actually a list on
        ${i18n.__('title')}. Please take a look at the correct list email through our
        <a href='${secrets.url}/'>web portal</a>,
        and reply to let us know if you run into any issues.<br /><br /><br />
        --<br />
        <a href='${secrets.url}'>New to ${i18n.__('title')}</a>?
      `

      const errorEmail = {
        From: `${i18n.__('title')} <notifications@${secrets.rootMailServer}>`,
        To: fromEmail,
        ReplyTo: `${i18n.__('title')} <hello@${secrets.rootMailServer}>`,
        Subject: `[${i18n.__('title')}] Problem Posting RE: ${subject}`,
        HtmlBody: errorEmailContent,
      };

      await this.mailer.send(errorEmail);
      await this.slack.attention(`${fromEmail} email post to invalid topic ${topicToPost}.`)
      return Promise.reject(`Posting to a topicId ${topicToPost} that doesnt exist.`)
    }
    const newPostId = uuid.v4()
    await upsert(Post, { _id: newPostId}, {
      _id: newPostId,
      title: subject,
      content: content,
      ownerId: senderUser._id,
      topicIds: [topic._id],
      followers: [{
        userId: senderUser._id
      }],
      createdAt: new Date(),
      numMsgs: 0
    })

    return this.handleNewPostFromWeb(newPostId)
  }

  async __handleMessageFromEmail({
    postId,
    fromEmail,
    fromName,
    content,
    topicsToNotify,
    attachments}) {

    let copiedAttachments = await this.__copyAttachments(attachments)

    await this.__getPostInfoFromPostmark({ postId, fromEmail, fromName, topicsToNotify })

    // insert this as a message into our system
    const messageId = uuid.v4()
    const messageBody = {
      _id: messageId,
      ownerId: this.senderUser._id,
      postId: this.post._id,
      content: content,
      source: 'email',
      createdAt: new Date(),
      attachments: copiedAttachments
    }
    await upsert(Message, { _id: messageId }, messageBody)
    await this.__onNewMessage(messageBody)

    this.__followPost(this.senderUser)

    INFO(this.usersFollowingPost);
    INFO(this.replyAllRecipients);

    const usersToNotify = {};

    // dedup users
    this.usersFollowingPost.concat(this.replyAllRecipients).filter((user) => {
      return user != undefined &&
        user.emails != undefined &&
        user.emails.length > 0 &&
        user._id != this.senderUser._id &&
        user.emailPreference == 'all';
    }).forEach((user) => {
      usersToNotify[user._id] = user;
    });

    // They Every topic should appear in the cc field and also subject line
    const topicId = this.post.topicIds.length > 0 ? this.post.topicIds[0] : 'reply';

    const emailsToSend = Object.keys(usersToNotify).map((userId) => {
      const user = usersToNotify[userId];
      const [ email ] =  user.emails;

      if (!email) {
        INFO(`${user._id} does not have an email for notifications.`);
        return Promise.resolve(true);
      }

      const hash = postId;
      const emailContent = this.__addFooter({
        content: this.__formatContent(content),
        post: this.post,
        sender: this.senderUser,
        recipient: user,
      });
      const toName = this.parseDisplayName(user);
      // TODO: Support posts with mutiple topics

      // TODO: What kind of escaping / sanitization do we need to do to topic
      // and other user supplied string here?
      return {
        From: `${fromName} <${this.__getFrom(fromEmail)}>`.trim(),
        To: `${toName} <${email.address}>`.trim(),
        CC: `${topicId } <${topicId}@${secrets.topicMailServer}>`,
        ReplyTo: `${truncate(this.post.title, 50)} <reply+${hash}@${secrets.postMailServer}>`,
        Subject: `RE: [${i18n.__('title')}] ${this.post.title}`,
        HtmlBody: emailContent,
        attachments: copiedAttachments
      };
    })

    INFO('emailsToSend', emailsToSend)
    await this.mailer.sendBatchEmails(emailsToSend);

    await this.__notifyReplyToPost({postId: this.post._id, excludeUsers: [this.senderUser._id]})
    await this.slack.info(`Email message from ${fromName} (${fromEmail}). \
      <${secrets.url}/topics/${topicId}/${this.post._id}|Post>`)
  }

  /**
   * For handling email generation for new messages (through web)
   */
  async handleNewMessageFromWeb(messageId) {
    await this.__getMessageInfo(messageId)

    await this.__onNewMessage(this.message)

    // dedup
    const usersToNotify = {};
    this.usersFollowingPost.filter(user => {
      return user != undefined &&
        user._id != this.messageOwner._id &&
        user.emails &&
        user.emails.length > 0 &&
        user.emailPreference === 'all';
    }).forEach((user) => {
      usersToNotify[user._id] = user;
    });

    INFO(usersToNotify)

    this.__followPost(this.messageOwner)

    const fromName = this.parseDisplayName(this.messageOwner);
    const fromEmail = this.messageOwner.emails[0].address
    const topicId = this.post.topicIds.length > 0 ? this.post.topicIds[0] : 'reply';

    const emailsToSend = Object.keys(usersToNotify).map((userId) => {
      const user = usersToNotify[userId];
      const [ email ] =  user.emails;

      const toName = this.parseDisplayName(user);
      const hash = this.post._id;
      const emailContent = this.__addFooter({
        content: this.__formatContent(this.message.content),
        post: this.post,
        sender: this.messageOwner,
        recipient: user
      });

      return {
        From: `${fromName} <${this.__getFrom(fromEmail)}>`.trim(),
        To: `${toName} <${email.address}>`.trim(),
        CC: `${topicId } <${topicId}@${secrets.topicMailServer}>`,
        ReplyTo: `${truncate(this.post.title, 50)} <reply+${hash}@${secrets.postMailServer}>`,
        Subject: `RE: [${i18n.__('title')}] ${this.post.title}`,
        HtmlBody: emailContent
      };
    })

    INFO('emailsToSend:', emailsToSend)
    await this.mailer.sendBatchEmails(emailsToSend);

    await this.__notifyReplyToPost({ postId: this.post._id, excludeUsers: [this.messageOwner._id]})
    await this.slack.info(`Web message from ${fromName} (${fromEmail}). \
      <${secrets.url}/topics/${topicId}/${this.post._id}|post>`)
  }

  /**
   * For handling email generation for new posts (through web).
   */
  async handleNewPostFromWeb(postId) {
    await this.__getPostInfo(postId)

    const usersToNotify = {};
    const dedupUserFn = (user) => {
      usersToNotify[user._id] = user;
    }

    const filterUserFn = (user) => {
      return user != undefined &&
        user.emails != undefined &&
        user.emails.length > 0 &&
        user.emailPreference == 'all';
    }

    if (this.usersFollowingTopic) {
      this.usersFollowingTopic.filter(filterUserFn).forEach(dedupUserFn);
    }

    if (this.usersFollowingPost) {
      this.usersFollowingPost.filter(filterUserFn).forEach(dedupUserFn);
    }

    // Don't need to send myself an email.
    delete usersToNotify[this.post.ownerId];

    const fromName = this.parseDisplayName(this.postOwner);
    const fromEmail = this.postOwner.emails[0].address
    const topicId = this.post.topicIds.length > 0 ? this.post.topicIds[0] : 'reply';

    // Generate the email content to send
    const emailsToSend = Object.keys(usersToNotify).map((userId) => {
      const user = usersToNotify[userId];
      const [ email ] =  user.emails;

      if (!email) {
        INFO(`${user._id} does not have an email for notifications.`);
        return Promise.resolve(true);
      }

      const emailContent = this.__addFooter({
        content: this.__formatContent(this.post.content),
        post: this.post,
        sender: this.postOwner,
        recipient: user
      });

      const toName = this.parseDisplayName(user)
      const hash = this.post._id;

      return {
        From: `${fromName} <${this.__getFrom(fromEmail)}>`.trim(),
        To: `${toName} <${email.address}>`.trim(),
        CC: `${topicId} <${topicId}@${secrets.topicMailServer}>`,
        ReplyTo: `${truncate(this.post.title, 50)} <reply+${hash}@${secrets.postMailServer}>`,
        Subject: `[${i18n.__('title')}] ${this.post.title}`,
        HtmlBody: emailContent
      };
    })

    INFO('emailsToSend:', emailsToSend)

    await this.mailer.sendBatchEmails(emailsToSend);
    await this.__notifyNewPost({ postId: this.post._id, excludeUsers: [this.postOwner._id]})
    await this.slack.info(`New post from ${fromName} (${fromEmail}). \
      <${secrets.url}/topics/${topicId}/${this.post._id}|post>`)
  }

  async __findUserFromEmail({ fromEmail, fromName, errorEmailSubject }) {
    const users = await User.find({
      'emails.address': { $regex: new RegExp(`^${fromEmail.toLowerCase()}`, "i") }
    })
    const [senderUser] = users;

    if (!senderUser) {
      const greeting = fromName && fromName.length > 0 ? `Hey ${fromName},<br /><br />` : 'Hello!';
      const errorEmailContent = `${greeting}
        Seems like your email address <a href='mailto:${fromEmail}'>${fromEmail}</a> was not a registered email on
        ${i18n.__('title')}. Please check your <a href='${secrets.url}/settings'>notification preferences</a>,
        and reply to let us know if you run into any issues.<br /><br /><br />
        --<br />
        Want to <a href='${secrets.url}'>Register</a>?
      `

      const errorEmail = {
        From: `${i18n.__('title')} <notifications@${secrets.rootMailServer}>`,
        To: this.__getFrom(fromEmail),
        ReplyTo: `${i18n.__('title')} <hello@${secrets.rootMailServer}>`,
        Subject: errorEmailSubject,
        HtmlBody: errorEmailContent
      };

      logger.info(errorEmail);

      await this.mailer.send(errorEmail)
      await this.slack.attention(`${fromEmail} is invalid. Sent error email.`)
      return Promise.reject(`${fromEmail} was not found. Sent error email`)
    }

    return senderUser
  }

  /**
   * @return a from address that complies with DMARC standards
   * (i.e. exclude sucky yahoo.com emails)
   */
  __getFrom(email) {
    if (/@yahoo.com$/.test(email)) {
      return `notifications@${secrets.rootMailServer}`
    }

    return email
  }

  /**
   * Sets:
   * [eveything in post info], senderUser
   */
  async __getPostInfoFromPostmark({ postId, fromEmail, fromName, topicsToNotify }) {
    await this.__getPostInfo(postId)

    const errorEmailSubject = `[${i18n.__('title')}] Problem Posting RE: ${this.post.title}`;
    this.senderUser = await this.__findUserFromEmail({ fromEmail, fromName, errorEmailSubject })

    this.replyAllRecipients = await find(User, { followingTopics: { $in: topicsToNotify }})
  }

  /**
   * Sets:
   * [everything in post info] && messageOwnerId
   */
  async __getMessageInfo(messageId) {
    let messages = await find(Message, { _id: messageId })
    this.message = messages[0];

    let messageOwners = await find(User, { _id: this.message.ownerId });
    this.messageOwner = messageOwners[0]

    return this.__getPostInfo(this.message.postId)
  }

  /**
   * Sets:
   * post, owner, usersFollowingPost, usersFollowingTopic
   */
  async __getPostInfo(postId) {
    let posts = await find(Post, { _id: postId })

    if (posts.length != 1) {
      throw new Error(`Did not find exactly one post with id=${postId}. Found ${posts.length}`)
    }

    const [ post ] = posts;
    this.post = post;

    const owners = await find(User, { _id: this.post.ownerId })
    const [owner] = owners;
    if (!owner) {
      return Promise.reject('The owner was not found for the post');
    }
    this.postOwner = owner;

    const usersFollowingPost = await find(User, { followingPosts: postId });
    this.usersFollowingPost = usersFollowingPost;

    // get everyone who is following the topic
    const usersFollowingTopic = await Promise.all(this.post.topicIds.map((topicId) => {
      return find(User, { followingTopics: topicId })
    }));

    const [ users ] = usersFollowingTopic;
    this.usersFollowingTopic = users;
  }

  async __followPost(sender) {
    // this user is not already following the post, make the user follow the post.
    if (this.post.followers.filter(follower => follower.userId == sender._id).length == 0) {
      await update(Post, { _id: this.post._id }, { $push: {
        followers: { userId: sender._id }
      }})

      await update(User, { _id: sender._id }, { $addToSet: {
        followingPosts: this.post._id
      }})
    }
  }

  async __onNewMessage(message) {
    await update(Post, { _id: message.postId }, { $set: {
      lastMessageText: message.content,
      lastMessageId: message._id
    }})
  }

  __addFooter({ content, post, sender, recipient }) {

    const [topicId] = post.topicIds
    const [{ address }] = sender.emails;
    const hash = generateHash(recipient);

    return `
      <p>${content}</p>
      <p style="padding-top: 15px">
        --<br />
        Reply to this email directly or <a href='${secrets.url}/topics/${topicId}/${post._id}'>view it on ${i18n.__('title')}</a><br />
        You can also <a href='${secrets.url}/guest/posts/${post._id}/unfollow?userId=${recipient._id}&hash=${hash}'>Unfollow</a>
          this thread or <a href='${secrets.url}/guest?userId=${recipient._id}&hash=${hash}'>Edit topics I follow</a>.<br />
        To privately reply to the sender, email <a href='mailto:${address}'>${address}</a>
      </p>`
  }

  __formatContent(content) {
    if (!content) {
      return '';
    }

    return content.replace(/(?:\r\n|\r|\n)/g, '<br />')
  }

  async __copyAttachments(attachments) {
    try {
      return Promise.all(attachments.map((attachment) => {
        const { url, contentType, name } = attachment
        return this.azure.copyFromURL(url, name, contentType)
        .then(({ remoteUrl, size }) => {
          return Promise.resolve(Object.assign({}, attachment, {
            size,
            url: remoteUrl
          }))
        })
      }))
    } catch (err) {
      INFO('could not copy attachments', attachments, err)
      return Promise.resolve([])
    }
  }

  __notifyReplyToPost(options) {
    return new Promise((resolve, reject) => {
      request({
        url: `${secrets.notificationServer}/notify/reply`,
        method: 'POST',
        json: true,
        body: options
      }, (err, res) => {
        if (err) { return reject(err) }
        return resolve(res)
      })
    })
  }

  __notifyNewPost(options) {
    return new Promise((resolve, reject) => {
      request({
        url: `${secrets.notificationServer}/notify/new-post`,
        method: 'POST',
        json: true,
        body: options
      }, (err, res) => {
        if (err) { return reject(err) }
        return resolve(res)
      })
    })
  }

  parseDisplayName(user) {
    let name = [];

    if (user.firstName) {
      name.push(user.firstName);
    }

    if (user.lastName) {
      name.push(user.lastName);
    }

    return name.join(' ')
  }
}
