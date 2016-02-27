export default class MockAzure {
  constructor(options = { remoteUrl: 'http://file', size: 187}) {
    this.options = options
  }

  copyFromURL() {
    return Promise.resolve(this.options)
  }
}
