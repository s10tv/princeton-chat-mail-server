import path from 'path'
import express from 'express'
import mongoose from 'mongoose'
import postmark from 'postmark'
import bodyParser from 'body-parser'
import { Promise } from 'es6-promise'
import raygun from 'raygun'

import logger from './logger'
import secrets from './config/secrets'
import { INFO } from './common'
import EmailSender from './email-sender'

export const app = express()

// injectable
let PostmarkClient = new postmark.Client(secrets.postmark.token);
let Sender = new EmailSender(PostmarkClient, secrets.mailserver, secrets.url);
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

function handleError(err, message, res) {
  logger.error(message);
  client.send(err, {});
  return res.sendStatus(500);
}

app.use(bodyParser.json());
app.use(raygunClient.expressHandler);

app.post('/no-op', (req, res) => {
  console.log(req.body);
  return res.sendStatus(200);
})

app.post('/postmark-message-reply', (req, res) => {
  const postmarkInfo = req.body;

  logger.info('[postmark-message-reply]', postmarkInfo);
  return Sender.handleEmailReply(postmarkInfo)
    .then(() => {
      return handleSuccess('Postmark-Message success', res)
    })
    .catch(err => {
      return handleError(err, `Postmark-Message error: ${err.message}`, res);
    })
})

app.post('/web-post', (req, res) => {
  logger.info('web-post', req.body);

  const postId = req.body.postId;
  if (!postId) {
    logger.error('[web-post] postId was not found in the request');
    return res.status(400).send('postId is not found in the request');
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
    logger.error('[web-message] MessageId was not found in the request');
    return res.status(400).send('messageId is not found in the request');
  }

  logger.info(`[web-message] request with messageId=${messageId}`)
  return Sender.handleNewMessageFromWeb(messageId)
    .then(() => {
      return handleSuccess('Web-Message success', res)
    })
    .catch(err => {
      return handleError(err, `Web-Message error: ${err.message}`, res);
    })
})

app.listen((process.env.PORT || 5000), function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('server started');
});
