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

    const toInfos = emailResponse.To ? emailparser.parseAddressList(emailResponse.To) : [];
    const ccInfos = emailResponse.Cc ? emailparser.parseAddressList(emailResponse.Cc) : [];

    // There are 4 cases here: either
    // 1) { To: @topic } === start a new post via email
    // 2) { To: @post } === reply to a post
    // 3) { To: @post, CC: @topic } === reply all to a post
    // 4) { TO: { personal }, CC: @topic }  === new post notification

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
      postInfo = toPostInfos[0]
      topicInfo = ccTopicInfos[0];
      postId = parsePostId(postInfo)
      topicsToNotify = [ topicInfo.local ];
    }

    // case 4
    else if (toPostInfos.length == 0 && toTopicInfos.length == 0 && ccTopicInfos.length == 1) {
      ignoreEmail = true;
    }

    else {
      throw new Error(`unhandled email messageId: ${emailResponse['Message-Id']}, token: ${emailResponse['token']}`);
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
}
