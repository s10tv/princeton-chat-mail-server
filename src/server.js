import path from 'path'
import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import { Promise } from 'es6-promise'

import secrets from './config/secrets'

const app = express()

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
  console.log(req.body);
  res.send(200);
})

app.listen((process.env.PORT || 3000), function(err) {
  if (err) {
    console.log(err);
    return;
  }

  console.log('server started');
});
