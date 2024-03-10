"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.printBlankLine = exports.omit = exports.isPlainObject = exports.isFalsey = exports.isEmpty = exports.extractQueueNameFromARN = void 0;
const isEmpty = val => {
  if (val === undefined) {
    return true;
  }
  if (typeof val === 'function' || typeof val === 'number' || typeof val === 'boolean' || Object.prototype.toString.call(val) === '[object Date]') {
    return false;
  }
  if (val == null || val.length === 0) {
    return true;
  }
  if (typeof val === 'object') {
    let r = true;
    // eslint-disable-next-line
    for (const f in val) {
      r = false;
    }
    return r;
  }
  return false;
};
exports.isEmpty = isEmpty;
const omit = (keys, obj) => {
  const cp = {
    ...obj
  };
  keys.forEach(key => {
    delete cp[key];
  });
  return cp;
};
exports.omit = omit;
const isPlainObject = obj => {
  let key;
  if (!obj || obj.nodeType) {
    return false;
  }
  if (obj.constructor) {
    return false;
  }
  // eslint-disable-next-line
  for (key in obj) {}
  return key === undefined;
};
exports.isPlainObject = isPlainObject;
const isFalsey = val => {
  if (val === false) return true;
  if (val === undefined) return true;
  if (isEmpty(val)) return true;
  if (isPlainObject(val)) return true;
  return false;
};

// eslint-disable-next-line no-console
exports.isFalsey = isFalsey;
const printBlankLine = () => console.log();
exports.printBlankLine = printBlankLine;
const extractQueueNameFromARN = arn => {
  const [,,,,, QueueName] = arn.split(':');
  return QueueName;
};
exports.extractQueueNameFromARN = extractQueueNameFromARN;
//# sourceMappingURL=helpers.js.map