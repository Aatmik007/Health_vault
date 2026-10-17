import mongoose from 'mongoose';

/**
 * Validate that specified URL parameter(s) are valid MongoDB ObjectIds
 * @param {string|string[]} paramNames Single parameter name or array of parameter names
 */
export const validateObjectId = (paramNames) => {
  const params = Array.isArray(paramNames) ? paramNames : [paramNames];

  return (req, res, next) => {
    for (const param of params) {
      const value = req.params[param];
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ID format for parameter '${param}'`,
        });
      }
    }
    next();
  };
};

/**
 * Validate registration input parameters
 */
export const validateRegisterInput = (req, res, next) => {
  let { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a valid full name' });
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  // Normalize email
  email = email.trim().toLowerCase();
  req.body.email = email;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address format' });
  }

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ success: false, message: 'Please provide a password' });
  }

  if (password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
  }

  next();
};

/**
 * Validate login input parameters
 */
export const validateLoginInput = (req, res, next) => {
  let { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
  }

  // Normalize email
  email = email.trim().toLowerCase();
  req.body.email = email;

  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide your password' });
  }

  next();
};

/**
 * Validate RAG and Search Retrieval input queries
 */
export const validateRagQueryInput = (req, res, next) => {
  const queryText = req.body.question || req.body.query;

  if (!queryText || typeof queryText !== 'string' || !queryText.trim()) {
    return res.status(400).json({ success: false, message: 'Please provide a valid query text' });
  }

  if (queryText.length > 2000) {
    return res.status(400).json({
      success: false,
      message: 'Query text exceeds maximum allowed length of 2000 characters',
    });
  }

  // Validate and clamp topK parameter
  if (req.body.topK !== undefined) {
    let topK = parseInt(req.body.topK, 10);
    if (isNaN(topK) || topK < 1) {
      topK = 4;
    } else if (topK > 10) {
      topK = 10;
    }
    req.body.topK = topK;
  }

  // Validate documentId if provided
  if (req.body.documentId && !mongoose.Types.ObjectId.isValid(req.body.documentId)) {
    return res.status(400).json({ success: false, message: 'Invalid documentId format' });
  }

  next();
};

/**
 * Validate Report Comparison input parameters
 */
export const validateCompareInput = (req, res, next) => {
  const { documentIdA, documentIdB } = req.body;

  if (!documentIdA || !documentIdB) {
    return res.status(400).json({
      success: false,
      message: 'Please select both Document A and Document B to compare',
    });
  }

  if (!mongoose.Types.ObjectId.isValid(documentIdA) || !mongoose.Types.ObjectId.isValid(documentIdB)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid document ID format for comparison',
    });
  }

  if (documentIdA === documentIdB) {
    return res.status(400).json({
      success: false,
      message: 'Please select two different documents to compare',
    });
  }

  next();
};
