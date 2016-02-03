export default {
  env: process.env.ENV || 'dev',
  url: process.env.ROOT_URL || 'https://princeton-chat-core-dev.herokuapp.com',
  mongo: process.env.MONGO_URL || 'mongodb://localhost/pchat',
  ironworker: {
    token: process.env.IRON_WORKER_TOKEN || '', //yHDJi7nNp3ZdD3FC3IOu
    project_id: process.env.IRON_WORKER_PROJECT_ID || '56abd7e8f254f20006000183',
  },
  postmark: {
    token: process.env.POSTMARK_TOKEN || 'ea859cd1-5add-4969-9053-b02fdd0ad956',
  },
  mailserver: process.env.MAIL_SERVER || 'dev.inbound.princeton.chat',
}
