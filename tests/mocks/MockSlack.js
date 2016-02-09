export default class MockSlack {
  constructor() {
    this.queue = [];
  }

  pulse(message) {
    this.queue.push(message);
    return Promise.resolve(true)
  }
}
