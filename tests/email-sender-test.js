var mongoose = require('mongoose')
  , expect = require('chai').expect
  , should = require('chai').should()
  , Message = require('../src/models/message')
  , Post = require('../src/models/post')
  , Topic = require('../src/models/topic')
  , User = require('../src/models/user')
  , dbURI = 'mongodb://localhost:27017/test';

import { find, count, upsert } from '../src/common.js'
import EmailSender from '../src/email-sender';
import MockMailer from './mocks/MockMailer';
import INBOUND_MAIL_DATA from './data/inbound.mail.js'
import REPLY_ALL_MAIL_DATA from './data/reply-all.mail.js'

describe('EmailSender', () => {

  before(function (done) {
    if (mongoose.connection.db) return done();
    mongoose.connect(dbURI, done);
  });

  beforeEach((done) => {
    Topic.remove({}, done)
    });

  beforeEach((done) => {
    Post.remove({}, done)
  });

  beforeEach((done) => {
    Message.remove({}, done)
  });

  beforeEach((done) => {
    User.remove({}, done)
  });

  beforeEach((done) => {
    new User({
      _id: 'qiming',
      username: 'qiming',
      firstName: 'Qiming',
      lastName: 'Fang',
      emails: [{ address: 'fang@taylrapp.com' }],
    }).save(done)
  });

  beforeEach((done) => {
    new User({
      _id: 'nurym',
      username: 'nurym',
      emails: [{ address: 'nurym@gmail.com' }],
      emailPreference: 'all',
    }).save(done)
  });

  describe('parseDisplayName', () => {
    it('should parse the first name and last name if both exist', () => {
      const displayName = new EmailSender().parseDisplayName({
        firstName: 'qiming',
        lastName: 'fang',
      });

      expect(displayName).to.equal('qiming fang');
    })

    it('should display the first name if it exists', () => {
      const displayName = new EmailSender().parseDisplayName({
        firstName: 'qiming',
      });

      expect(displayName).to.equal('qiming');
    })

    it('should display the last name if it exists', () => {
      const displayName = new EmailSender().parseDisplayName({
        lastName: 'fang',
      });

      expect(displayName).to.equal('fang');
    })

    it('should return empty string if the user does not have a first or last name', () => {
      const displayName = new EmailSender().parseDisplayName({});

      expect(displayName).to.equal('');
    })
  })

  /**
   * Context:
   *
   * Qiming made a post into topic startups
   * Tony is the only user who follows startups and has email preference set to 'all'
   *
   * Expect: an email gets sent to Tony.
   */
  describe('handleNewPostFromWeb', () => {
    const mailer = new MockMailer();

    beforeEach((done) => {
      new Post({
        _id: 'test-post-two',
        ownerId: 'qiming',
        content: 'hello world',
        topicIds: 'startups',
        title: 'Post Title',
      }).save(done);
    })

    beforeEach((done) => {
      new User({
        _id: 'tonyx',
        username: 'tonyx',
        emails: [{ address: 'tonyx@gmail.com' }],
        followingTopics: ['startups'],
        emailPreference: 'all',
      }).save(done)
    });

    beforeEach((done) => {
      new User({
        _id: 'candice',
        username: 'candice',
        emails: [{ address: 'candice@gmail.com' }],
        followingTopics: ['food'],
        emailPreference: 'all',
      }).save(done)
    });

    beforeEach((done) => {
      new User({
        _id: 'natasha',
        username: 'natasha',
        emails: [{ address: 'natasha@gmail.com' }],
        followingTopics: ['startups'],
        emailPreference: 'none',
      }).save(done)
    });

    beforeEach((done) => {
      new User({
        _id: 'sravya',
        username: 'sravya',
        emails: [{ address: 'sravya@gmail.com' }],
        followingTopics: ['startups'],
        emailPreference: 'digest',
      }).save(done)
    });

    it('should attempt to send emails to through mailer', (done) => {
      new EmailSender(mailer)
        .handleNewPostFromWeb('test-post-two')
        .then(() => {
          expect(mailer.mailQueue.length).to.equal(1);
          const [mail] = mailer.mailQueue;
          const expectedReturn = '';

          expect(mail.From).to.equal('Qiming Fang <fang@taylrapp.com>');
          expect(mail.To).to.equal('<tonyx@gmail.com>');
          expect(mail.CC).to.equal('startups <startups@dev.topics.princeton.chat>');
          expect(mail.ReplyTo).to.equal('Princeton.Chat <reply+test-post-two@dev.posts.princeton.chat>');
          expect(mail.Subject).to.equal('[Princeton.Chat] Post Title');
          expect(mail.HtmlBody).to.contain('hello world');

          done()
        })
        .catch(err => {
          return done(err);
        })
    })
  })

  /**
   * Context:
   *
   * Qiming made a post into topic sports
   * Diana and Tony both follow this topic
   * Diana sent a message through web
   *
   * Expect: an email gets sent to Tony.
   */
  describe('handleNewMessageFromWeb', () => {
    const mailer = new MockMailer();

    beforeEach((done) => {
      new User({
        _id: 'tonyx',
        username: 'tonyx',
        emails: [{ address: 'tonyx@gmail.com' }],
        followingPosts: ['super-bowl'],
        emailPreference: 'all',
      }).save(done)
    });

    beforeEach((done) => {
      new User({
        _id: 'dchau',
        username: 'diana',
        firstName: 'Diana',
        lastName: 'Chau',
        emails: [{ address: 'diana@gmail.com' }],
        followingPosts: ['super-bowl'],
        emailPreference: 'all',
      }).save(done)
    });

    beforeEach((done) => {
      new Post({
        _id: 'super-bowl',
        ownerId: 'nurym',
        title: 'Super Bowl',
        content: 'is coming',
        topicIds: 'sports',
      }).save(done);
    })

    beforeEach((done) => {
      new Message({
        _id: 'dianas-message',
        ownerId: 'dchau',
        postId: 'super-bowl',
        content: 'i love it',
        source: 'web',
      }).save(done);
    })

    it('should send emails per message', (done) => {
      new EmailSender(mailer)
        .handleNewMessageFromWeb('dianas-message')
        .then(() => {
          expect(mailer.mailQueue.length).to.equal(1);
          const [mail] = mailer.mailQueue;

          expect(mail.From).to.equal('Diana Chau <diana@gmail.com>');
          expect(mail.To).to.equal('<tonyx@gmail.com>');
          expect(mail.CC).to.equal('sports <sports@dev.topics.princeton.chat>');
          expect(mail.ReplyTo).to.equal('Princeton.Chat <reply+super-bowl@dev.posts.princeton.chat>');
          expect(mail.Subject).to.equal('RE: [Princeton.Chat] Super Bowl');
          expect(mail.HtmlBody).to.contain('i love it');

          done()
        })
        .catch(err => {
          return done(err);
        })
    })
  })


  describe('handleEmailReply', () => {
    let mailer = null;

    beforeEach(() => {
      mailer = new MockMailer();
    })

    beforeEach((done) => {
      new Post({
        _id: 'POST_ID', // NOTE should be the same as the hash from the email.
        ownerId: 'qiming',
        content: 'hello world',
        topicIds: 'startups',
        title: 'Post Title',
      }).save(done);
    })

    beforeEach((done) => {
      new User({
        _id: 'diana',
        username: 'dchau',
        emails: [{ address: 'diana@gmail.com' }],
        followingPosts: ['POST_ID'],
        emailPreference: 'all',
      }).save(done)
    });

    /**
     * NEW-POST error (non-subscribed user not authorized to reply to posts)
     *
     * Qiming made a post.
     * Nurym replied to it via ** an email that is not in the system **
     *
     * Expect: an error email gets generated to nurym.
     * Expect: no messages to be created
     */
    describe('when the sender has an email that is not in the system', () => {
      const INPUT = JSON.parse(JSON.stringify(INBOUND_MAIL_DATA));
      beforeEach((done) => {
        INPUT.from = 'fake-email@gmail.com'
        new EmailSender(mailer)
          .handleEmailReply(INPUT)
          .then(() => fail('should have thrown an error complaining that fake-email was not founds'))
          .catch(err => {
            expect(err).to.equal('fake-email@gmail.com was not found. Sent error email')
            done()
          })
      })

      it ('should not create a new message', (done) => {
        return count(Message, {})
        .then(count => {
          expect(count).to.equal(0);
          expect(mailer.mailQueue.length).to.equal(1);
          const [ errorMail ] = mailer.mailQueue;
          expect(errorMail.Subject).to.equal('[Princeton.Chat] Problem Posting RE: Post Title');
          expect(errorMail.To).to.equal('fake-email@gmail.com');
          expect(errorMail.From).to.equal('Princeton.Chat <notifications@princeton.chat>');
          expect(errorMail.ReplyTo).to.equal('Princeton.Chat <hello@princeton.chat>');
          expect(errorMail.HtmlBody.length).to.be.greaterThan(0);

          done();
        })
        .catch(err => done(err))
      })
    })

    /**
     * NEW-POST test
     */
    describe('when the sender sends an email to start a post', () => {
      const POST_INPUT = JSON.parse(JSON.stringify(INBOUND_MAIL_DATA));

      // special case - clear out the posts
      beforeEach((done) => {
        Post.remove({}, done)
      })

      beforeEach(() => {
        POST_INPUT.To = 'cookies@dev.topics.princeton.chat';
      })

      beforeEach((done) => {
        new Topic({
          _id: 'cookies',
          displayName: 'Chocolate Chip',
        }).save(done);
      })

      it('should create a new post', (done) => {
        new EmailSender(mailer)
          .handleEmailReply(POST_INPUT)
          .then(() => {
            return find(Post, {})
          })
          .then(posts => {
            expect(posts.length).to.equal(1)
            const [post] = posts;

            expect(post.title).to.equal('Test subject')
            expect(post.content).to.equal('This is the reply text')
            expect(post.topicIds.length).to.equal(1)

            const [ topicId ] = post.topicIds;
            expect(topicId).to.equal('cookies')
            done()
          })
          .catch(err => done(err))
      })

      it('should send out emails to anyone following the post', (done) => {
        new Promise((resolve, reject) => {
          new User({
            _id: 'ninja',
            username: 'ninja',
            emails: [{ address: 'ninja@gmail.com' }],
            followingTopics: ['cookies'],
            emailPreference: 'all',
          }).save(err => {
            if (err) {
              return reject(err);
            }
            return resolve(true);
          })
        })
        .then(() => {
          return new EmailSender(mailer)
            .handleEmailReply(POST_INPUT)
        })
        .then(() => {
          expect(mailer.mailQueue.length).to.equal(1);
          const [email] = mailer.mailQueue;

          // briefly validate that email will be sent. The content of the email will be validated
          // later
          expect(email.To).to.equal('<ninja@gmail.com>');
          done();
        })
        .catch(err => done(err));
      })

      describe('if the topic from the email does not exist', () => {
        beforeEach(() => {
          POST_INPUT.To = 'Awesome Man <iamawesome@dev.topics.princeton.chat>';
        })

        it('should send an error email', (done) => {
          new EmailSender(mailer)
            .handleEmailReply(POST_INPUT)
          .then(() => {
            return count(Post, {})
          })
          .then(postCount => {
            expect(postCount).to.equal(0);
            expect(mailer.mailQueue.length).to.equal(1);
            const [email] = mailer.mailQueue;

            expect(email.From).to.equal('Princeton.Chat <notifications@princeton.chat>');
            expect(email.To).to.equal('nurym@gmail.com');
            expect(email.Subject).to.equal('[Princeton.Chat] Problem Posting RE: Test subject');
            expect(email.ReplyTo).to.equal('Princeton.Chat <hello@princeton.chat>');
            expect(email.HtmlBody).to.exist;

            done()
          })
          .catch(err => done(err))
        })
      })
    })

    /**
     * REPLY-ALL test
     *
     * Qiming made a post to topic 'noop'
     * Diana is the only one who follows this post
     * Diana also follows topic 'noop'
     * Tony also follows topic 'noop'
     * qiming REPLY-ALL'd to it via email
     *
     * Expect: a message gets generated (from nurym's reply)
     * Expect: diana gets an email.
     * Expect: tony gets an email.
     */
    describe('when the mail server gets a reply-all request', () => {
       beforeEach((done) => {
         new Topic({
           _id: 'noop',
           displayName: 'Snoopy without the S and the Y',
           followers: [
             { _id: '1', userId: 'dchau-reply-all'},
             { _id: '2', userId: 'tonyx-reply-all'}]
         }).save(done);
       })

      beforeEach((done) => {
        new Post({
          _id: 'd2cba2d8-4206-48cd-9fd4-3d8dca31a8ea',
          title: 'long id',
          content: 'dunno if i can handle it',
          ownerId: 'qiming',
          topicIds: 'noop',
          followers: [{userId: 'dchau-reply-all'}]
        }).save(done)
      })

      beforeEach((done) => {
       new User({
         _id: 'dchau-reply-all',
         username: 'dchau',
         emails: [{ address: 'dchau-reply-all@gmail.com'}],
         emailPreference: 'all',
         followingTopics: ['noop'],
       }).save(done);
      })

      beforeEach((done) => {
        new User({
          _id: 'tonyx-reply-all',
          username: 'tonyx',
          emails: [{ address: 'tonyx-reply-all@gmail.com'}],
          emailPreference: 'all',
          followingTopics: ['noop'],
        }).save(done);
      })

      it('should ignore emails if the recipient is the topic MS to avoid dups', (done) => {
        const TO_TOPIC_MS_REPLY_ALL = JSON.parse(JSON.stringify(REPLY_ALL_MAIL_DATA))
        TO_TOPIC_MS_REPLY_ALL.recipient = 'noop@dev.topics.princeton.chat';

        new EmailSender(mailer).handleEmailReply(TO_TOPIC_MS_REPLY_ALL)
        .then(() => {
          expect(mailer.mailQueue.length).to.equal(0);
          done()
        })
        .catch(err => done(err))
      })

      it('should send emails to all post and topic followers', (done) => {
        new EmailSender(mailer).handleEmailReply(REPLY_ALL_MAIL_DATA)
        .then(() => {
          expect(mailer.mailQueue.length).to.equal(2);
          const [dchaumail, tonyxmail] = mailer.mailQueue;

          expect(dchaumail.From).to.equal('Qiming Fang <fang@taylrapp.com>');
          expect(dchaumail.To).to.equal('<dchau-reply-all@gmail.com>');
          expect(dchaumail.CC).to.equal('noop <noop@dev.topics.princeton.chat>');
          expect(dchaumail.ReplyTo).to.equal('Princeton.Chat <reply+d2cba2d8-4206-48cd-9fd4-3d8dca31a8ea@dev.posts.princeton.chat>');
          expect(dchaumail.Subject).to.equal('RE: [Princeton.Chat] long id');
          expect(dchaumail.HtmlBody).to.contain('hi');

          expect(tonyxmail.From).to.equal('Qiming Fang <fang@taylrapp.com>');
          expect(tonyxmail.To).to.equal('<tonyx-reply-all@gmail.com>');
          expect(tonyxmail.CC).to.equal('noop <noop@dev.topics.princeton.chat>');
          expect(tonyxmail.ReplyTo).to.equal('Princeton.Chat <reply+d2cba2d8-4206-48cd-9fd4-3d8dca31a8ea@dev.posts.princeton.chat>');
          expect(tonyxmail.Subject).to.equal('RE: [Princeton.Chat] long id');
          expect(tonyxmail.HtmlBody).to.contain('hi');

          return find(Message, {})
       })
       .then(messages => {
         expect(messages.length).to.equal(1);
         const [message] = messages;

         expect(message._id).to.exist;
         expect(message.ownerId).to.equal('qiming');
         expect(message.postId).to.equal('d2cba2d8-4206-48cd-9fd4-3d8dca31a8ea');
         expect(message.content).to.equal('hi');
         expect(message.createdAt).to.exist;
         return done();
       })
       .catch(err => {
         return done(err);
       })
     })
   })

    /**
     * REPLY test
     *
     * Qiming made a post.
     * Diana is the only one who follows this post
     * Nurym (not originally following post) replied to it via email
     *
     * Expect: a message gets generated (from nurym's reply)
     * Expect: diana gets an email.
     * Expect: nurym follows the post now
     */
    describe('when the sender has an email that is in the system', () => {
      it('should send emails to through mailer', (done) => {
        new EmailSender(mailer).handleEmailReply(INBOUND_MAIL_DATA)
        .then(() => {
          expect(mailer.mailQueue.length).to.equal(1);
          const [mail] = mailer.mailQueue;

          expect(mail.From).to.equal('Postmarkapp Support <nurym@gmail.com>');
          expect(mail.To).to.equal('<diana@gmail.com>');
          expect(mail.CC).to.equal('startups <startups@dev.topics.princeton.chat>');
          expect(mail.ReplyTo).to.equal('Princeton.Chat <reply+POST_ID@dev.posts.princeton.chat>');
          expect(mail.Subject).to.equal('RE: [Princeton.Chat] Post Title');
          expect(mail.HtmlBody).to.contain('This is the reply text');

          return find(Message, {})
        })
        .then(messages => {
          expect(messages.length).to.equal(1);
          const [message] = messages;

          expect(message._id).to.exist;
          expect(message.ownerId).to.equal('nurym');
          expect(message.postId).to.equal('POST_ID');
          expect(message.content).to.equal('This is the reply text');
          expect(message.createdAt).to.exist;

          return find(User, { _id: 'nurym' })
        })
        .then(users => {
          const [ nurymUser ] = users;
          expect(nurymUser.followingPosts.indexOf('POST_ID')).not.to.be.below(0);

          return find(Post, { _id: 'POST_ID' })
        })
        .then(posts => {
          const [ existingPost ] = posts;
          const [ nurymFollower ] = existingPost.followers.filter(follower => follower.userId == 'nurym');

          expect(nurymFollower).to.exist;
          done();
        })
        .catch(err => {
          return done(err);
        })
      })
    })
  })
})
