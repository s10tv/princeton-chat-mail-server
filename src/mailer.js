import Mailgun from 'mailgun-js'
import secrets from './config/secrets'
import logger from './logger'

export default class Mailer {

  constructor(mailserver) {
    this.mailgun = Mailgun({
      apiKey: secrets.mailgun.apiKey,
      domain: mailserver,
    });
  }

  send({ From, To, CC, ReplyTo, Subject, HtmlBody }) {
    const mail = {
      to: To,
      from: From,
      cc: CC,
      'h:Reply-To': ReplyTo,
      'h:In-Reply-To': ReplyTo,
      subject: Subject,
      html: HtmlBody,
    };

    logger.info(mail)

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
