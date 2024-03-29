import crypto from 'crypto'
import pkgcloud from 'pkgcloud'
import {Promise} from 'es6-promise'
import request from 'request'
import secrets from './config/secrets'

/**
 * In charge of uploading files to a 3p content host.
 */
export default class Azure {

  constructor() {
    this.blobService = pkgcloud.storage.createClient({
      provider: 'azure',
      storageAccount: secrets.azure.account,
      storageAccessKey: secrets.azure.key
    })
  }

  /**
   * Generates a GET-able URL for the content.
   *
   * @param file an {@link pkgcloud} Azure file
   * @returns {*} external URL to this file
   * @private
   */
  __getFileURL(file) {
    return `${this.blobService.protocol}${this.blobService.config.storageAccount}.` +
      `${this.blobService.serversUrl}/${file.container}/${file.name}`;
  }

  /**
   * Copies a piece of content from an external {@link source} to our storage
   *
   * @param source a URL where the source data lies
   * @returns {Promise} that resolves to the file name(s) of the source(s)
   */
  copyFromURL(source, fileName, contentType) {
    let remoteFile = crypto.createHash('sha256').update(source).digest('hex');

    return new Promise((resolve, reject) => {
      let writeStream = this.blobService.upload({
        contentType,
        container: secrets.azure.container,
        remote: `${remoteFile}/${fileName}`
      });

      writeStream.on('success', file => {
        return resolve(Object.assign({}, {
          remoteUrl: this.__getFileURL(file),
          size: file.size
        }))
      });
      writeStream.on('error', err => {
        console.trace(err);
        reject(err)
      });

      request
        .get(source)
        .auth(secrets.mailgun.user, secrets.mailgun.apiKey, false)
        .pipe(writeStream);
    });
  }
}
