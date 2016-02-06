export default {
  env: process.env.ENV || 'dev',
  url: process.env.ROOT_URL || 'https://princeton-chat-core-dev.herokuapp.com',
  mongo: process.env.MONGO_URL || 'mongodb://localhost/pchat',
  ironworker: {
    token: process.env.IRON_WORKER_TOKEN || '', //yHDJi7nNp3ZdD3FC3IOu
    project_id: process.env.IRON_WORKER_PROJECT_ID || '56abd7e8f254f20006000183',
  },
  raygun: {
    key: process.env.RAYGUN_APIKEY || ''
  },
  mailgun: {
    apiKey: process.env.MAILGUN_API_KEY || ''
  },
  topicMailServer: process.env.TOPIC_MAIL_SERVER || 'dev.topics.princeton.chat',
  postMailServer: process.env.POST_MAIL_SERVER || 'dev.posts.princeton.chat',
}
