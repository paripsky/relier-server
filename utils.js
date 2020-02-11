const crypto = require('crypto');

const generateId = () => {
  return crypto.randomBytes(16).toString('base64');
};

const hash = toHash => {
  return crypto
    .createHash('sha256')
    .update(toHash)
    .digest('base64');
};

module.exports = {
  generateId,
  hash
};
