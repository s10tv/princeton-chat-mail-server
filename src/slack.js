import secrets from './config/secrets'

export default class Slack {
  constructor() {
    this.slack = require('slack-notify')(secrets.slack.url);
  }

  pulse(message) {
    return new Promise((resolve, reject) => {
      return this.slack.send({
        channel: secrets.slack.pulse,
        icon_emoji: ':computer:',
        text: message,
        username: secrets.system
      }, (err, res) => {
        if (err) {
          return reject(err)
        }
        return resolve(res)
      });
    })
  }

  attention(message) {
    return new Promise((resolve, reject) => {
      return this.slack.send({
        channel: secrets.slack.pulse,
        icon_emoji: ':broken_heart:',
        text: `@fang ${message}`,
        username: `${secrets.system} attention`
      }, (err, res) => {
        if (err) {
          return reject(err)
        }
        return resolve(res)
      });
    })
  }
}
``
