export default {
  mongo: process.env.MONGO_URL || 'mongodb://localhost/pchat',
  ironworker: {
    token: process.env.IRON_WORKER_TOKEN || '', //yHDJi7nNp3ZdD3FC3IOu
    project_id: process.env.IRON_WORKER_PROJECT_ID || '56abd7e8f254f20006000183',
  }
}
