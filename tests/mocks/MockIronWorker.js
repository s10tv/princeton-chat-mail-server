export default class MockIronWorker {

  constructor(creds) {
    this.creds = creds;
    this.requests = []
  }

  send(options) {
    this.requests.push(options);
    return Promise.resolve(true)
  }
}
