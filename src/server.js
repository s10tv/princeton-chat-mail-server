import path from 'path'
import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import { Promise } from 'es6-promise'
import IronWorker from './lib/IronWorker'

import secrets from './config/secrets'

export const app = express()

// injectable
let Iron = new IronWorker(secrets.ironworker);

mongoose.Promise = Promise
mongoose.connect(secrets.mongo, function(err, res) {
  if (err) {
    console.log('Error connecting to: ' + secrets.mongo + '. ' + err);
  } else {
    console.log('Succeeded connected to: ' + secrets.mongo);
  }
});

app.use(bodyParser.json());
app.post('/inbound', (req, res) => {
  return Iron.send({
    taskName: 'job_postmark_post_email_handler',
    payload: { postmarkInfo: req.body },
    options: { priority: 2 }
  }).then(() => {
    res.sendStatus(200);
  })
  .catch(err => {
    console.error(err);
    res.sendStatus(200);
  })
})

app.listen((process.env.PORT || 3000), function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log('server started');
});
