import crypto from 'crypto';

export const generateId = () => {
  return crypto.randomBytes(16).toString('base64');
};

export const hash = (toHash: string) => {
  return crypto
    .createHash('sha256')
    .update(toHash)
    .digest('base64');
};
