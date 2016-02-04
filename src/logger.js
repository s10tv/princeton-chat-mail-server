import winston from 'winston'

require('winston-logstash');

export default new (winston.Logger)({
  transports: [
    new (winston.transports.Logstash)({
      port: 10514,
      host: 'api.logmatic.io',
      meta: { logmaticKey:'nI5Oe5h-Qf6uT4LBFh8YoQ' },
      node_name: 'dev',
    })
  ]
});
