class MockPostmark {
  constructor() {
    this.mailQueue = [];
  }

  sendEmailWithTemplate(options, callback) {
    this.mailQueue.push(options);
    return callback(null, null);
  }

  sendEmail(options, callback) {
    this.mailQueue.push(options);
    return callback(null, null);
  }

  sendEmailBatch(emails, callback) {
    emails.forEach(email => {
      this.mailQueue.push(email);
    })

    return callback(null, null);
  }
}

export default MockPostmark;
