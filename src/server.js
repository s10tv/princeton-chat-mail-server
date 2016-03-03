import path from 'path'
import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import multer from 'multer'
import { Promise } from 'es6-promise'
import raygun from 'raygun'
import i18n from 'i18n'

import logger from './logger'
import secrets from './config/secrets'
import { INFO } from './common'
import EmailSender from './email-sender'
import Notifier from './notifier'
import Slack from './slack'
import Azure from './azure'
import Mailer from './mailer'
import pjson from '../package.json'

export const app = express()
const m = multer({})

// injectable
let slackClient = new Slack();
let mailer = new Mailer(secrets.topicMailServer);
let azure = new Azure()
let NotificationSender = new Notifier()
let Sender = new EmailSender(mailer, slackClient, azure, NotificationSender)
let raygunClient = new raygun.Client().init({ apiKey: secrets.raygun.key });

mongoose.Promise = Promise
mongoose.connect(secrets.mongo, function(err, res) {
  if (err) {
    INFO('Error connecting to: ' + secrets.mongo + '. ' + err);
  } else {
    INFO('Succeeded connected to: ' + secrets.mongo);
  }
});

i18n.configure({
  locales:['princeton', 's10', 'ped'],
  directory: __dirname + '/locales'
});
i18n.setLocale(secrets.system);

function handleSuccess(message, res) {
  return res.sendStatus(200);
}

function handleError(err, res) {
  logger.error(err);
  raygunClient.send(err, {});
  return res.sendStatus(200); // fix this. throw 400s
}

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get('/', (req, res) => {
  return res.json({
    title: i18n.__('title'),
    version: pjson.version
  });
})

app.get('/err', (req, res) => {
  // to test our monitoring system
  throw new Error('Error occurred');
})

app.post('/no-op', m.any(), (req, res) => {
  console.log('body');
  console.log(req.body['stripped-text'])
  console.log(req.body)

  return res.sendStatus(200);
})

app.post('/mailgun/pulse', m.any(), (req, res) => {
  if (!req.body) {
    res.sendStatus(200)
  }

  let { recipient, event } = req.body;
  let mailId = req.body['message-id']

  const message = `${recipient} ${event} our mail ${ mailId ? `(${mailId})` : ''}`
  let action = slackClient.pulse.bind(slackClient)

  switch (event) {
    case 'bounced':
    case 'dropped':
      action = slackClient.attention.bind(slackClient)
  }

  return action(message)
  .then(() => {
    return res.sendStatus(200)
  })
  .catch(err => {
    return res.sendStatus(200)
  })
});

app.post('/email-reply', m.any(), (req, res) => {
  const messageBody = req.body;

  if (process.env.DISABLE == 1) {
    console.log(messageBody);
    return handleSuccess('Postmark-Message success', res)
  }

  return Sender.handleEmailReply(messageBody)
    .then(() => {
      return handleSuccess('Postmark-Message success', res)
    })
    .catch(err => {
      return handleError(err, res);
    })
})

app.post('/web-post', (req, res) => {
  logger.info('web-post');
  logger.info(req.body);

  const postId = req.body.postId;
  if (!postId) {
    let error = new Error('[web-post] postId was not found in the request');
    return handleError(error, res)
  }

  logger.info(`[web-post] request with postId=${postId}`)
  return Sender.handleNewPostFromWeb(postId)
    .then(() => {
      return handleSuccess('Web-Post success', res)
    })
    .catch(err => {
      return handleError(err, `Web-Post error: ${err.message}`, res);
    })
})

app.post('/web-message', (req, res) => {
  const messageId = req.body.messageId;
  if (!messageId) {
    let error = new Error('[web-message] messageId is not found in the request');
    return handleError(error, res)
  }

  logger.info(`[web-message] request with messageId=${messageId}`)
  return Sender.handleNewMessageFromWeb(messageId)
    .then(() => {
      return handleSuccess('Web-Message success', res)
    })
    .catch(err => {
      return handleError(err, res);
    })
})

app.post('/notify/new-post', (req, res) => {

})

app.post('/notify/reply', (req, res) => {
  const postId = req.body.postId;
  if (!postId) {
    let error = new Error('[post/notify-users] postId is not found in the request');
    return handleError(error, res)
  }

  const excludeUsers = req.body.excludeUsers || []

  return NotificationSender.notifyUsersFollowingPost({postId, excludeUsers})
    .then(() => {
      return handleSuccess(`Notified users of postId=${postId}`, res)
    })
    .catch(err => {
      return handleError(err, res);
    })
})

app.use(raygunClient.expressHandler);
app.listen((process.env.PORT || 5000), function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('server started');
});
