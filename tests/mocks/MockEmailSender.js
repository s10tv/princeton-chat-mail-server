export default class MockEmailSender {
  handleEmailReply(emailBody) {
    this.emailBody = emailBody 
    return Promise.resolve(true);
  }

  handleNewMessageFromWeb(messageId) {
    this.messageId = messageId;
    return Promise.resolve(true);
  }

  handleNewPostFromWeb(postId) {
    this.postId = postId
    return Promise.resolve(true);
  }
}
