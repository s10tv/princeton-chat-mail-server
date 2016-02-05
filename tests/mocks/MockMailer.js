class MockMailer {
  constructor() {
    this.mailQueue = [];
  }

  send(options) {
    this.mailQueue.push(options);
    return Promise.resolve(true)
  }

  sendBatchEmails(emails) {
    emails.forEach(email => {
      this.mailQueue.push(email);
    })

    return Promise.resolve(true)
  }
}

export default MockMailer;
