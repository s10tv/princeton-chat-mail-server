import Mailgun from 'mailgun-js'
import request from 'request'
import secrets from './config/secrets'
import logger from './logger'
import { INFO } from './common'

export default class Mailer {

  constructor(mailserver) {
    this.mailgun = Mailgun({
      apiKey: secrets.mailgun.apiKey,
      domain: mailserver
    });
  }

  send({ From, To, CC, ReplyTo, Subject, HtmlBody, attachments }) {
    const mail = {
      to: To,
      from: From,
      'h:Reply-To': ReplyTo,
      'h:In-Reply-To': ReplyTo,
      subject: Subject,
      html: HtmlBody
    };

    // Sometimes (when sending error emails, there are no CC addresses)
    if (CC) {
      mail.cc = CC;
    }

    if (attachments && attachments.length > 0) {
      mail.attachment = attachments.map(({ url }) => request(url))
    }

    return new Promise((resolve, reject) => {
      this.mailgun.messages().send(mail, function (err, body) {
        if (err) {
          return reject(err);
        }
        return resolve(body);
      });
    })
  }

  sendBatchEmails(emails) {
    return Promise.all(emails.map(email => this.send(email)))
  }
}
