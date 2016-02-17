export default class MockSlack {
  constructor() {
    this.queue = [];
    this.attention_queue = []
  }

  pulse(message) {
    this.queue.push(message);
    return Promise.resolve(true)
  }

  attention(message) {
    this.attention_queue.push(message)
    return Promise.resolve(true)
  }
}
