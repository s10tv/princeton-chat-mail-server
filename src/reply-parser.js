import secrets from './config/secrets'

export default class ReplyParser {
  parse(postmarkResponse) {
    if (!postmarkResponse) {
      throw new Error('Empty response from postmark')
    }

    // first message replies do not come with StrippedTextReply, use textbody instead.
    let content = postmarkResponse.StrippedTextReply;
    if (!content) {
      content = postmarkResponse.TextBody;
    }
    if (!content) {
      throw new Error('Undefined content from postmark.')
    }

    const toInfo = postmarkResponse.ToFull;
    if (!toInfo) {
      throw new Error('Empty to info from postmark')
    }

    const fromInfo = postmarkResponse.FromFull;
    if (!fromInfo) {
      throw new Error('Empty from info from postmark')
    }

    const fromEmail = fromInfo.Email;
    if (!fromEmail) {
      throw new Error('Empty from email from postmark')
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
      subject: postmarkResponse.Subject,
      toEmail: Email,
      postId: MailboxHash,
    }
  }
}
