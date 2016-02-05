import path from 'path'
import express from 'express'
import mongoose from 'mongoose'
import postmark from 'postmark'
import bodyParser from 'body-parser'
import multer from 'multer'
import { Promise } from 'es6-promise'
import raygun from 'raygun'

import logger from './logger'
import secrets from './config/secrets'
import { INFO } from './common'
import EmailSender from './email-sender'
import pjson from '../package.json'

export const app = express()
const m = multer({})

// injectable
let PostmarkClient = new postmark.Client(secrets.postmark.token);
let Sender = new EmailSender(PostmarkClient, secrets.topicMailServer, secrets.url);
let raygunClient = new raygun.Client().init({ apiKey: secrets.raygun.key });

mongoose.Promise = Promise
mongoose.connect(secrets.mongo, function(err, res) {
  if (err) {
    INFO('Error connecting to: ' + secrets.mongo + '. ' + err);
  } else {
    INFO('Succeeded connected to: ' + secrets.mongo);
  }
});

function handleSuccess(message, res) {
  return res.sendStatus(200);
}

function handleError(err, res) {
  logger.error(err);
  raygunClient.send(err, {});
  return res.sendStatus(200); // fix this. throw 400s
}

app.use(bodyParser.text());
app.use(raygunClient.expressHandler);

app.get('/', (req, res) => {
  return res.json({ version: pjson.version });
})

app.post('/no-op', m.any(), (req, res) => {
  console.log(req.body);
  return res.sendStatus(200);
})

app.post('/postmark-message-reply', m.any(), (req, res) => {
  const postmarkInfo = JSON.parse(req.body);

  // for some reason, replies to emails come with an extra email from notifications@ to our
  // reply email. If this happens, omit it.
  if (postmarkInfo.From && postmarkInfo.From === 'notifications@princeton.chat') {
    return res.send(200);
  }

  logger.info('[postmark-message-reply]');
  logger.info(postmarkInfo);

  return Sender.handleEmailReply(postmarkInfo)
    .then(() => {
      return handleSuccess('Postmark-Message success', res)
    })
    .catch(err => {
      return handleError(err, res);
    })
})

app.post('/web-post', m.any(), (req, res) => {
  logger.info('web-post');
  logger.info(req.body);

  const postId = JSON.parse(req.body).postId;
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

app.post('/web-message', m.any(), (req, res) => {
  const messageId = JSON.parse(req.body).messageId;
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

app.listen((process.env.PORT || 5000), function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('server started');
});
