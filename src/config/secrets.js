export default {
  env: process.env.ENV || 'dev',

  // for which audience (will control localization settings) is this for?
  // [ s10, princeton, classicaleffect ]
  system: process.env.AUDIENCE || 'princeton',

  url: process.env.ROOT_URL || 'https://taylr-chat-dev.herokuapp.com',
  mongo: process.env.MONGO_URL || 'mongodb://localhost/pchat',
  raygun: {
    key: process.env.RAYGUN_APIKEY || ''
  },
  mailgun: {
    user: 'api',
    apiKey: process.env.MAILGUN_API_KEY || ''
  },
  azure: {
    account: process.env.AZURE_ACCOUNT || '',
    key: process.env.AZURE_KEY || '',
    container: process.env.AZURE_CONTAINER || 's10tv-dev'
  },
  slack: {
    url: process.env.SLACK_URL || 'https://hooks.slack.com/services/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',
    info: process.env.SLACK_SUCCESS || '#princeton-chat',
    pulse: process.env.SLACK_PULSE || 'princeton-chat-pulse',
    error: process.env.SLACK_ERROR || 'monitoring',
  },
  rootMailServer: process.env.ROOT_MAIL_SERVER || 'dev.princeton.chat',
  topicMailServer: process.env.TOPIC_MAIL_SERVER || 'dev.topics.princeton.chat',
  postMailServer: process.env.POST_MAIL_SERVER || 'dev.posts.princeton.chat',
}
