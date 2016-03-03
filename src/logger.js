import winston from 'winston'

require('winston-logstash');

const mockLogger = {
  info: (...m) => {
    if (process.env.DEBUG) {
      console.log(m)
    }
  },

  error: (...m) => {
    if (process.env.DEBUG) {
      console.log(m)
    }
  }
}

class Logger {
  constructor () {
    this.logger = mockLogger
      //this.logger = new (winston.Logger)({
      //  transports: [
      //    new (winston.transports.Logstash)({
      //      port: 10514,
      //      host: 'api.logmatic.io',
      //      meta: { logmaticKey:'nI5Oe5h-Qf6uT4LBFh8YoQ' },
      //      node_name: 'dev',
      //    })
      //  ]
      //})
  }

  info (...args) {
    this.logger.info(args)
  }

  error (...args) {
    this.logger.error(args)
  }
}

export default new Logger()
