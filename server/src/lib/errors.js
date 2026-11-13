/**
 * API errors. `code` is stable and machine-readable (the frontend translates it);
 * `message` is the English text. Messages that existed in the original app are kept verbatim.
 */
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const MESSAGES = {
  emailTaken: 'An account with this email already exists.',
  invalidCredentials: 'Invalid email or password.',
  joinCodeRequired: 'Please enter a join code.',
  joinCodeInvalid: 'Invalid join code. Check it and try again.',
  alreadyJoined: 'You have already joined this project.',
  nameRequired: 'Full name is required.',
};

export const badRequest = (code, message, details) => new HttpError(400, code, message, details);
export const unauthorized = (code = 'unauthenticated', message = 'Please sign in to continue.') => new HttpError(401, code, message);
export const forbidden = (message = 'You do not have permission to do that.') => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'notFound', message);
export const conflict = (code, message) => new HttpError(409, code, message);

/** Wraps an async route handler so rejected promises reach the error middleware. */
export const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
