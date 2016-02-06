import emailparser from 'email-addresses'
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

    const toInfos = emailparser.parseAddressList(emailResponse.To);
    const postToInfos = toInfos.filter(toInfo => toInfo.domain === secrets.postMailServer);

    if (postToInfos.length != 1) {
      throw new Error(`Must have exactly one @${secrets.postMailServer} in the TO field. Found ${postToInfos.length}.`)
    }

    const [toInfo] = postToInfos;
    const toEmail = toInfo.address;
    let postId = undefined;
    if (toInfo && toInfo.local) {
      const splittedToAddress = toInfo.local.split('+')
      if (splittedToAddress.length == 2) {
        postId = splittedToAddress[1]
      }
    }

    const fromInfo = emailparser.parseOneAddress(emailResponse.from);
    const fromName = fromInfo.name || '';
    const fromEmail = fromInfo.address;

    if (!content) {
      throw new Error('Undefined content from mail server.')
    }

    if (!fromEmail) {
      throw new Error('Could not parse from email.')
    }

    if (!toEmail) {
      throw new Error(`Could not parse toEmail from recipient info: ${emailResponse.recipient}`)
    }

    return {
      fromName,
      fromEmail,
      content,
      postId,
      toEmail,
      subject: emailResponse.subject,
    }
  }
}
