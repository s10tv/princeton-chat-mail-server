import crypto from 'crypto'
import pkgcloud from 'pkgcloud'
import {Promise} from 'es6-promise'
import request from 'request'
import secrets from '../config/secrets'

/**
 * In charge of uploading files to a 3p content host.
 */
class FileService {

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
  copyFromURL(source, contentType) {
    let remoteFile = crypto.createHash('sha256').update(source).digest('hex');

    return new Promise((resolve, reject) => {
      let writeStream = this.blobService.upload({
        contentType,
        container: secrets.azure.container,
        remote: remoteFile
      });

      writeStream.on('success', file => resolve(this.__getFileURL(file)));
      writeStream.on('error', err => {
        console.trace(err);
        reject(err)
      });

      request.get(source).pipe(writeStream);
    });
  }
}

export default FileService