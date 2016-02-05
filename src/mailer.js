import Mailgun from 'mailgun-js'
import secrets from './config/secrets'

export default class Mailer {

  constructor(mailserver) {
    this.mailgun = Mailgun({
      apiKey: secrets.mailgun.apiKey,
      domain: mailserver,
    });
  }

  send({ From, To, CC, ReplyTo, Subject, HtmlBody }) {
    const params = {
      to: To,
      from: From,
      'h:Reply-To': ReplyTo,
      subject: Subject,
      html: HtmlBody,
    };

    return new Promise((resolve, reject) => {
      this.mailgun.messages().send(params, function (err, body) {
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
