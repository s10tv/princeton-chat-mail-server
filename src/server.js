import path from 'path'
import express from 'express'
import mongoose from 'mongoose'
import postmark from 'postmark'
import bodyParser from 'body-parser'
import { Promise } from 'es6-promise'

import secrets from './config/secrets'
import { INFO } from './common'
import EmailSender from './email-sender'

export const app = express()

// injectable
let PostmarkClient = new postmark.Client(secrets.postmark.token);
let Sender = new EmailSender(PostmarkClient, secrets.mailserver, secrets.url);

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

function handleError(message, res) {
  return res.sendStatus(500);
}

app.use(bodyParser.json());
app.post('/postmark-message-reply', (req, res) => {
  const postmarkInfo = req.body;

  return Sender.handleEmailReply(postmarkInfo)
    .then(() => {
      return handleSuccess('Postmark-Message success', res)
    })
    .catch(err => {
      return handleError(`Postmark-Message error: ${err.message}`, res);
    })
})

app.post('/web-post', (req, res) => {
  const postId = req.body.postId;
  if (!postId) {
    return res.status(400).send('postId is not found in the request');
  }

  return Sender.handleNewPostFromWeb(postId)
    .then(() => {
      return handleSuccess('Web-Post success', res)
    })
    .catch(err => {
      return handleError(`Web-Post error: ${err.message}`, res);
    })
})

app.post('/web-message', (req, res) => {
  const messageId = req.body.messageId;
  if (!messageId) {
    return res.status(400).send('messageId is not found in the request');
  }

  return Sender.handleNewMessageFromWeb(messageId)
    .then(() => {
      return handleSuccess('Web-Message success', res)
    })
    .catch(err => {
      return handleError(`Web-Message error: ${err.message}`, res);
    })
})

app.listen((process.env.PORT || 5000), function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('server started');
});
