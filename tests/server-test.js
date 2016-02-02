import { expect } from 'chai'
import rewire from 'rewire'
import request from 'supertest'

import MockIronWorker from './mocks/MockIronWorker'

const app = rewire('../src/server')
const Iron =  new MockIronWorker()

app.__set__('Iron', Iron)

describe('Server', () => {
  it('should correctly forward incoming requests to ironworker', (done) => {
    const POSTMARK_DATA = { test: 'true' }

    request('http://localhost:3000')
      .post('/inbound')
      .send(POSTMARK_DATA)
      .expect(200)
      .end(function(err, res) {
        expect(Iron.requests.length).to.equal(1);
        const [request] = Iron.requests;

        expect(request.taskName).to.equal('job_postmark_post_email_handler');
        expect(request.payload).to.deep.equal(POSTMARK_DATA);
        expect(request.options).to.deep.equal({});

        done()
      });
  })
})
