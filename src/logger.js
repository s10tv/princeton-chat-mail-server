import winston from 'winston'

require('winston-logstash');

const remote = new (winston.Logger)({
  transports: [
    new (winston.transports.Logstash)({
      port: 10514,
      host: 'api.logmatic.io',
      meta: { logmaticKey:'nI5Oe5h-Qf6uT4LBFh8YoQ' },
      node_name: 'dev',
    })
  ]
})

const mockLogger = {
  info: (m) => {
    if (process.env.DEBUG === 1) {
      console.log(m)
    }
  },

  error: (m) => {
    if (process.env.DEBUG === 1) {
      console.log(m)
    }
  }
}

class Logger {
  constructor () {
    if (process.env.ENV === 'dev') {
      this.logger = mockLogger
    } else {
      this.logger = remote
    }
  }

  info (...args) {
    this.logger.info(args)
  }

  error (...args) {
    this.logger.error(args)
  }
}

export default new Logger()
