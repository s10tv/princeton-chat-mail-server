import { expect } from 'chai'
import { generateHash } from '../src/auth'

describe('auth', () => {
  describe('generateHash', () => {
    it('should generate the correct hash', () => {
      expect(generateHash({ _id: 'qiming' })).to.equal('aafe0ba277b84cffa5974afe71d9aaa82170089c12a350a811fbdd25eb23d02e')
    })
  })
})
