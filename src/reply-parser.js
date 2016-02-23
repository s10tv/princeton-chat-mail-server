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

    const toInfos = emailResponse.To
      ? emailparser.parseAddressList(this.__stripInvalidCharacters(emailResponse.To))
      : [];
    const ccInfos = emailResponse.Cc
      ? emailparser.parseAddressList(this.__stripInvalidCharacters(emailResponse.Cc))
      : [];

    // There are 4 cases here: either
    // 1) { To: @topic } === start a new post via email
    // 2) { To: @post } === reply to a post

    // 3) { To: @post, CC: @topic } === (post server) reply all to a post
    // 3.5) { To: @post, CC: @topic } === (topic server) ignore

    // 4) { TO: { personal }, CC: @topic }  === new post notification
    // else drop

    const toPostInfos = toInfos.filter(toInfo => toInfo.domain == secrets.postMailServer);
    const toTopicInfos = toInfos.filter(toInfo => toInfo.domain == secrets.topicMailServer);
    const ccTopicInfos = ccInfos.filter(ccInfo => ccInfo.domain == secrets.topicMailServer);

    let parsePostId = (postInfo) => {
      if (postInfo && postInfo.local) {
        const splittedToAddress = postInfo.local.split('+')
        if (splittedToAddress.length == 2) {
          return splittedToAddress[1]
        }
      }

      return null;
    }

    let throwInvalidToFieldError = () => {
      throw new Error(`unhandled email messageId: ${emailResponse['Message-Id']}, token: ${emailResponse['token']}`);
    }

    let postInfo, topicInfo;

    let ignoreEmail = false
    let topicToPost = null
    let postId = null
    let topicsToNotify = []


    // case 1
    if (toPostInfos.length == 0 && toTopicInfos.length == 1) {
      topicInfo = toTopicInfos[0]
      postId = null
      topicToPost = topicInfo.local
    }

    // case 2
    else if (toPostInfos.length == 1 && toTopicInfos.length == 0 && ccTopicInfos.length == 0) {
      postInfo = toPostInfos[0]
      postId = parsePostId(postInfo)
    }

    // case 3
    else if (toPostInfos.length == 1 && toTopicInfos.length == 0 && ccTopicInfos.length == 1) {
      // has to exist, otherwise, shouldnt have gotten delivered.
      const recipientInfo = emailparser.parseOneAddress(emailResponse.recipient);
      const isToTopicMS = recipientInfo ? recipientInfo.domain ==  secrets.topicMailServer : false;
      const isToPostMS = recipientInfo ? recipientInfo.domain ==  secrets.postMailServer : false;

      if (isToPostMS) {
        postInfo = toPostInfos[0]
        topicInfo = ccTopicInfos[0];
        postId = parsePostId(postInfo)
        topicsToNotify = [ topicInfo.local ];
      } else if (isToTopicMS) {
        ignoreEmail = true;
      } else {
        throwInvalidToFieldError()
      }
    }

    // case 4
    else if (toPostInfos.length == 0 && toTopicInfos.length == 0 && ccTopicInfos.length == 1) {
      ignoreEmail = true;
    }

    else {
      throwInvalidToFieldError()
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

    return {
      ignoreEmail,
      fromName,
      fromEmail,
      content,
      postId,
      topicToPost,
      topicsToNotify,
      subject: emailResponse.subject,
    }
  }

  /**
   * https://tools.ietf.org/html/rfc5322
   * page 12
   */
  __stripInvalidCharacters(emails) {
    return emails.replace(/[{()}]/g, '');
  }
}
