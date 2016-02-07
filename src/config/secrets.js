export default {
  env: process.env.ENV || 'dev',

  // for which audience (will control localization settings) is this for?
  // [ s10, princeton, classicaleffect ]
  system: process.env.AUDIENCE || 'princeton',

  url: process.env.ROOT_URL || 'https://princeton-chat-core-dev.herokuapp.com',
  mongo: process.env.MONGO_URL || 'mongodb://localhost/pchat',
  raygun: {
    key: process.env.RAYGUN_APIKEY || ''
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || ''
  },
  rootMailServer: process.env.ROOT_MAIL_SERVER || 'dev.princeton.chat',
  topicMailServer: process.env.TOPIC_MAIL_SERVER || 'dev.topics.princeton.chat',
  postMailServer: process.env.POST_MAIL_SERVER || 'dev.posts.princeton.chat',
}
