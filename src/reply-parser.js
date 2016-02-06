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
    const ccInfos = emailResponse.Cc ? emailparser.parseAddressList(emailResponse.CC) : [];

    // There are 2 cases here: either
    // 1) we find { To: @topic } === start a new post via email
    // 2) we find { To: @post } === reply to a post
    // 3) we find { To: @post, CC: @topic } === reply all to a post

    const toPostInfos = toInfos.filter(toInfo => toInfo.domain === secrets.postMailServer);
    const toTopicInfos = toInfos.filter(toInfo => toInfo.domain === secrets.topicMailServer);
    const ccTopicInfos = ccInfos.filter(ccInfo => ccInfo.domain === secrets.topicMailServer);

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

    let topicToPost = null
    let postId = null
    let topicsToNotify = []

    // case 1
    if (toPostInfos.length == 0 && toTopicInfos.length == 1) {
      [ topicInfo ] = toTopicInfos
      postId = null
      topicToPost = topicInfo.local
    }

    // case 2
    else if (toPostInfos.length == 1 && toTopicInfos.length == 0) {
      [ postInfo ] =toPostInfos
      postId = parsePostId(postInfo)
    }

    // case 3
    else if (toPostInfos.length == 1 && ccTopicInfos.length == 1) {
      [ postInfo ] =toPostInfos
      [ topicInfo ] = ccTopicInfos;

      postId = parsePostId(postInfo)
      topicsToNotify = [ topicInfo.local ];
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
