// Awaitable helper to run express-style middleware (mw(req,res,next)).
// Extracted to avoid duplication across route files.
module.exports = function runMiddleware(req, res, mw) {
  return new Promise((resolve, reject) => {
    try {
      mw(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    } catch (e) {
      reject(e);
    }
  });
};
