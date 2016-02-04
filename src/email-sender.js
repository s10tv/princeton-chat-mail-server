import { upsert, update, find, INFO } from './common'
import uuid from 'uuid'

import Post from './models/post'
import Message from './models/message'
import User from './models/user'
import ReplyParser from './reply-parser'
import secrets from './config/secrets'

var Promise = require('es6-promise').Promise
  , mongoose = require('mongoose')
  , path = require('path')
  , fs = require('fs')
  , postmark = require("postmark");

export default class EmailSender {

  constructor(postmarkClient, mailserver, rootUrl) {
    this.postmarkClient = postmarkClient;
    this.rootUrl = rootUrl || 'http://localhost:3000';
    this.mailserver = mailserver || 'localhost';
  }

  /**
   * Handles replying to a post thread directly via email.
   */
  handleEmailReply(postmarkInput) {
    const {
      fromName,
      fromEmail,
      postId,
      content } = new ReplyParser(this.mailserver).parse(postmarkInput);

    return this.__getPostInfoFromPostmark({ postId, fromEmail })
    .then(() => {
      // insert this as a message into our system
      const messageId = uuid.v4()
      return upsert(Message, { _id: messageId }, {
        _id: messageId,
        ownerId: this.senderUser._id,
        postId: this.post._id,
        content: content,
        source: 'email',
      })
    })
    .then(() => {
      // this user is not already following the post, make the user follow the post.
      if (this.post.followers.filter(follower => follower.userId == this.senderUser._id).length == 0) {
          return update(Post, { _id: this.post._id }, { $push: {
          followers: { userId: this.senderUser._id }
        }}).then(() => {
          return update(User, { _id: this.senderUser._id }, { $addToSet: {
            followingPosts: this.post._id
          }})
        })
      }

      return Promise.resolve(true);
    })
    .then(() => {
      INFO(this.usersFollowingPost);

      const usersToNotify = {};

      // dedup users
      this.usersFollowingPost.filter((user) => {
        return user != undefined &&
          user.emails != undefined &&
          user.emails.length > 0 &&
          user._id != this.senderUser._id &&
          user.emailPreference == 'all';
      }).forEach((user) => {
        usersToNotify[user._id] = user;
      });

      const emailsToSend = Object.keys(usersToNotify).map((userId) => {
        const user = usersToNotify[userId];
        const [ email ] =  user.emails;

        if (!email) {
          INFO(`${user._id} does not have an email for notifications.`);
          return Promise.resolve(true);
        }

        const emailContent = this.__addFooter({
          content,
          post: this.post,
          sender: this.senderUser,
        });

        return {
          From: `${fromName} <notifications@princeton.chat>`,
          To: `Princeton.Chat <reply+${postId}@${this.mailserver}>`,
          CC: email.address,
          ReplyTo: `Princeton.Chat <reply+${postId}@${this.mailserver}>`,
          Subject: `[Princeton.Chat] RE: ${this.post.title}`,
          HtmlBody: emailContent,
        };
      })

      return this.__sendBatchEmails(emailsToSend)
    })
  }

  /**
   * For handling email generation for new messages (through web)
   */
  handleNewMessageFromWeb(messageId) {
    return this.__getMessageInfo(messageId)
    .then(() => {

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

      const emailsToSend = Object.keys(usersToNotify).map((userId) => {
        const user = usersToNotify[userId];
        const [ email ] =  user.emails;

        const fromName = this.parseDisplayName(this.messageOwner);
        const emailContent = this.__addFooter({
          content: this.message.content,
          post: this.post,
          sender: this.messageOwner,
        });

        return {
          From: `${fromName} <notifications@princeton.chat>`,
          To: `Princeton.Chat <reply+${this.post._id}@${this.mailserver}>`,
          CC: email.address,
          ReplyTo: `Princeton.Chat <reply+${this.post._id}@${this.mailserver}>`,
          Subject: `[Princeton.Chat] RE: ${this.post.title}`,
          HtmlBody: emailContent,
        };
      })

      return this.__sendBatchEmails(emailsToSend);
    })
  }

  /**
   * For handling email generation for new posts (through web).
   */
  handleNewPostFromWeb(postId) {
    return this.__getPostInfo(postId)
    .then(() => {
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

      // Generate the email content to send
      const emailsToSend = Object.keys(usersToNotify).map((userId) => {
        const user = usersToNotify[userId];
        const [ email ] =  user.emails;

        if (!email) {
          INFO(`${user._id} does not have an email for notifications.`);
          return Promise.resolve(true);
        }

        const emailContent = this.__addFooter({
          content: this.post.content,
          post: this.post,
          sender: this.postOwner,
        });

        const fromName = this.parseDisplayName(this.postOwner);

        return {
          From: `${fromName} <notifications@princeton.chat>`,
          CC: email.address,
          To: `Princeton.Chat <reply+${this.post._id}@${this.mailserver}>`,
          ReplyTo: `Princeton.Chat <reply+${this.post._id}@${this.mailserver}>`,
          Subject: `[Princeton.Chat] ${this.post.title}`,
          HtmlBody: emailContent,
        };
      })

      return this.__sendBatchEmails(emailsToSend);
    })
  }

  __addFooter({ content, post, sender }) {

    const [topicId] = post.topicIds
    const [{ address }] = sender.emails;

    return `
      <p>${content}</p>
      <p style="padding-top: 15px">
        --<br />
        Reply to this email directly or <a href='${secrets.url}/${topicId}/${post._id}'>View it on Princeton.Chat</a><br />
        You can also <a href='${secrets.url}/${sender._id}/unfollow'>Unfollow</a>
          this thread or <a href='${secrets.url}/${sender._id}/preferences'>Edit topics I follow</a><br />
        TO privately reply to the sender, email<br />
          <a href='mailto:${address}'>${address}</a>
      </p>`
  }

  __sendBatchEmails(emailsToSend) {
    return new Promise((resolve, reject) => {
      this.postmarkClient.sendEmailBatch(emailsToSend, (err, res) => {
        if (err) {
          return reject(err);
        }

        return resolve(res);
      })
    });
  }

  /**
   * Sets:
   * [eveything in post info], senderUser
   */
  __getPostInfoFromPostmark({ postId, fromEmail }) {
    return find(User, { 'emails.address': fromEmail })
    .then(users => {

      const [senderUser] = users;

      // for now, people who don't exist cannot send messages.
      // TODO: people who are not found in our database should be created as users.
      if (!senderUser) {
        throw new Error(`${fromEmail} is not found in our database. Aborting for now.`);
      }

      this.senderUser = senderUser;
      return this.__getPostInfo(postId)
    })
  }

  /**
   * Sets:
   * [everything in post info] && messageOwnerId
   */
  __getMessageInfo(messageId) {
    return find(Message, { _id: messageId })
    .then(messages => {
      [ this.message ] = messages;
      return find(User, { _id: this.message.ownerId });
    }).then(users => {
      [ this.messageOwner ] = users;
      return this.__getPostInfo(this.message.postId)
    })
  }

  /**
   * Sets:
   * post, owner, usersFollowingPost, usersFollowingTopic
   */
  __getPostInfo(postId) {
    return find(Post, { _id: postId })
    .then(posts => {
      if (posts.length != 1) {
        return Promise.reject(`Did not find exactly one post with id=${postId}`)
      }

      const [ post ] = posts;
      this.post = post;

      return find(User, { _id: this.post.ownerId })
    })
    .then(users => {
      const [owner] = users;
      if (!owner) {
        return Promise.reject('The owner was not found for the post');
      }

      this.postOwner = owner;
      return find(User, { followingPosts: postId });
    })
    .then((usersFollowingPost) => {
      this.usersFollowingPost = usersFollowingPost;

      // get everyone who is following the topic
      return Promise.all(this.post.topicIds.map((topicId) => {
        return find(User, { followingTopics: topicId })
      }));
    })
    .then((usersFollowingTopic) => {
      const [ users ] = usersFollowingTopic;
      this.usersFollowingTopic = users;

      return Promise.resolve(true);
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
