import secrets from './config/secrets'

export default class ReplyParser {
  parse(emailResponse) {
    if (!emailResponse) {
      throw new Error('Empty response from mail server')
    }

    // first message replies do not come with StrippedTextReply, use textbody instead.
    let content = emailResponse['stripped-text'];
    if (!content) {
      content = emailResponse['body-plain'];
    }
    if (!content) {
      throw new Error('Undefined content from mail server.')
    }

    const toInfo = emailResponse.ToFull;
    if (!toInfo) {
      throw new Error('Empty to info from mail server')
    }

    const fromInfo = emailResponse.FromFull;
    if (!fromInfo) {
      throw new Error('Empty from info from mail server')
    }

    const fromEmail = fromInfo.Email;
    if (!fromEmail) {
      throw new Error('Empty from email from mail server')
    }

    const regex = new RegExp(`@${secrets.topicMailServer}$`, "i");

    const princetonChatMailbox = toInfo.filter(info => regex.test(info.Email))
    if (princetonChatMailbox.length == 0) {
      // if the email was not delivered to our inbox. This shouldn't ever happen unless
      // we misconfigured our mail servers.
      throw new Error(`Did not find any emails addressed to @${secrets.topicMailServer}`);
    }

    const [{ Email, MailboxHash }]  = princetonChatMailbox;
    const fromName = fromInfo.Name || 'reply@topics.princeton.chat';

    return {
      fromName,
      fromEmail,
      content,
      subject: emailResponse.Subject,
      toEmail: Email,
      postId: MailboxHash,
    }
  }
}
