export default class ReplyParser {
  constructor(mailserver) {
    this.mailserver = mailserver || 'inbound.princeton.chat'
  }

  parse(postmarkResponse) {
    if (!postmarkResponse) {
      throw new Error('Empty response from postmark');
    }

    // first message replies do not come with StrippedTextReply, use textbody instead.
    let content = postmarkResponse.StrippedTextReply;
    if (!content) {
      content = postmarkResponse.TextBody;
    }
    if (!content) {
      throw new Error('Undefined content from postmark.');
    }

    const toInfo = postmarkResponse.ToFull;
    if (!toInfo) {
      throw new Error('Empty to info from postmark');
    }

    const fromInfo = postmarkResponse.FromFull;
    if (!fromInfo) {
      throw new Error('Empty from info from postmark');
    }

    const fromEmail = fromInfo.Email;
    if (!fromEmail) {
      throw new Error('Empty from email from postmark');
    }

    const regex = new RegExp(`@${this.mailserver}$`, "i");

    const princetonChatMailbox = toInfo.filter(info => regex.test(info.Email))
    if (princetonChatMailbox.length == 0) {
      throw new Error(`Did not find any emails addressed to @${this.mailserver}`);
    }

    if (princetonChatMailbox.length > 1) {
      throw new Error('Found more than one email addresses for @inbound.princeton.chat');
    }

    const [{ MailboxHash }]  = princetonChatMailbox;

    if (!MailboxHash) {
      throw new Error('Received invalid MailboxHash from info.');
    }

    const fromName = fromInfo.Name || 'reply@inbound.princeton.chat';

    return {
      fromName,
      fromEmail,
      content,
      postId: MailboxHash,
    }
  }
}
