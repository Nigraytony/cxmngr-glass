// Simple test helper to capture sent email payloads during tests.
const emails = [];

function reset() {
  emails.length = 0;
}

function push(payload) {
  emails.push(payload);
}

function all() {
  return emails.slice();
}

function last() {
  return emails.length ? emails[emails.length - 1] : null;
}

module.exports = { reset, push, all, last };
