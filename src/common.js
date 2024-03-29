var Promise = require('es6-promise').Promise;

export function INFO(...message) {
  if (process.env.DEBUG) {
    console.log(message);
  }
}

export function TRACE(message) {
  if (process.env.TRACE) {
    console.trace(message);
  }
}

let findObjects = function(schema, query) {
  return new Promise((resolve, reject) => {
    schema.find(query, (err, objects) => {
      if (err) {
        return reject(err);
      }
      return resolve(objects);
    });
  });
}

let countObjects = function(schema, query) {
  return new Promise((resolve, reject) => {
    schema.count(query, (err, count) => {
      if (err) {
        return reject(err);
      }
      return resolve(count);
    });
  });
};

/* objects */
export function count(schema, query) {
  return countObjects(schema, query);
}

export function find(schema, query) {
  return schema.find(query)
}

export function findOne(schema, query) {
  return new Promise((resolve, reject) => {
    schema.findOne(query, (err, object) => {
      if (err) {
        return reject(err);
      }
      return resolve(object);
    });
  });
}

export function upsert(schema, identifier, query) {
  return new Promise((resolve, reject) => {
    schema.update(identifier, query, { upsert: true }, (err) => {
      if (err) {
        return reject(err);
      }
      return resolve(true);
    });
  })
}

export function insert(document) {
  return new Promise((resolve, reject) => {
    document.save(function(err) {
      if (err) {
        return reject(err);
      }
      return resolve(true);
    });
  });
}

export function update(schema, identifier, query) {
  return new Promise((resolve, reject) => {
    schema.update(identifier, query, (err, count) => {
      if (err) {
        return reject(err);
      }
      return resolve(count);
    });
  });
}

