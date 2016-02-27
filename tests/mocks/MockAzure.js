export default class MockAzure {
  constructor(file) {
    this.returnFile = file
  }

  copyFromURL() {
    return Promise.resolve(this.returnFile)
  }
}
