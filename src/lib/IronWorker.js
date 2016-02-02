import Iron from 'iron_worker'
import { Promise } from 'es6-promise'

export default class IronWorker {
  constructor(creds) {
    this.client = new Iron.Client(creds);
  }

  send({ taskName, payload, options }) {
    if (!taskName) {
      throw new Error(500, 'Taskname needs to be specified for ironworker request');
    }

    return new Promise((resolve, reject) => {
      this.client.tasksCreate(taskName, payload, options, (err, res) => {
        if (err) {
          return reject(err)
        }
        return resolve(res);
      });
    })
  }
}
