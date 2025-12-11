/**
 * Unified AIS Provider Error Code Mapping
 * Maps error codes from different AIS providers to standardized error responses
 */

/**
 * Error code mapping for MyShipTracking API errors
 */
const MYSHIPTRACKING_ERROR_MAP = {
  'ERR_NO_KEY': {
    status: 401,
    userFacing: true,
    message: 'API credentials not configured',
    description: 'MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set',
  },
  'ERR_INVALID_KEY': {
    status: 401,
    userFacing: true,
    message: 'Invalid API credentials',
    description: 'Please verify MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY are correct',
  },
  'ERR_NO_CREDITS': {
    status: 402,
    userFacing: true,
    message: 'Insufficient API credits',
    description: 'Your MyShipTracking account has run out of credits. Please top up your account.',
  },
  'ERR_RATE_LIMIT': {
    status: 429,
    userFacing: true,
    message: 'Rate limit exceeded',
    description: 'Too many requests to AIS API. Please try again in a minute.',
    retryAfter: 60,
  },
  'ERR_VALIDATOR': {
    status: 400,
    userFacing: true,
    message: 'Invalid request parameters',
    description: 'The provided parameters are invalid. Please check MMSI, IMO, or zone bounds.',
  },
  'ERR_INVALID_ROUTE': {
    status: 404,
    userFacing: false,
    message: 'API endpoint not found',
    description: 'The requested API endpoint does not exist. This may indicate an API version mismatch.',
  },
  'ERR_INVALID_IDENTIFIER': {
    status: 400,
    userFacing: true,
    message: 'Invalid vessel identifier',
    description: 'The provided MMSI or IMO is invalid. MMSI must be 9 digits, IMO must be 7 digits.',
  },
  'ERR_INTERNAL': {
    status: 500,
    userFacing: false,
    message: 'Internal API error',
    description: 'An internal error occurred in the AIS API. Please try again later.',
  },
  'ERR_NOT_FOUND': {
    status: 404,
    userFacing: true,
    message: 'Vessel not found',
    description: 'The requested vessel was not found in the AIS database.',
  },
};

/**
 * Error code mapping for Datalastic API errors
 * Based on Datalastic API documentation
 */
const DATALASTIC_ERROR_MAP = {
  'ERR_NO_KEY': {
    status: 401,
    userFacing: true,
    message: 'API credentials not configured',
    description: 'DATALASTIC_API_KEY must be set',
  },
  'ERR_INVALID_KEY': {
    status: 401,
    userFacing: true,
    message: 'Invalid API credentials',
    description: 'Please verify DATALASTIC_API_KEY is correct',
  },
  'ERR_NO_CREDITS': {
    status: 402,
    userFacing: true,
    message: 'Insufficient API credits',
    description: 'Your Datalastic account has run out of credits. Please top up your account.',
  },
  'ERR_RATE_LIMIT': {
    status: 429,
    userFacing: true,
    message: 'Rate limit exceeded',
    description: 'Too many requests to AIS API. Please try again in a minute.',
    retryAfter: 60,
  },
  'ERR_VALIDATOR': {
    status: 400,
    userFacing: true,
    message: 'Invalid request parameters',
    description: 'The provided parameters are invalid. Please check MMSI, IMO, or zone bounds.',
  },
  'ERR_INVALID_ROUTE': {
    status: 404,
    userFacing: false,
    message: 'API endpoint not found',
    description: 'The requested API endpoint does not exist.',
  },
  'ERR_INVALID_IDENTIFIER': {
    status: 400,
    userFacing: true,
    message: 'Invalid vessel identifier',
    description: 'The provided MMSI or IMO is invalid. MMSI must be 9 digits, IMO must be 7 digits.',
  },
  'ERR_INTERNAL': {
    status: 500,
    userFacing: false,
    message: 'Internal API error',
    description: 'An internal error occurred in the AIS API. Please try again later.',
  },
  'ERR_NOT_FOUND': {
    status: 404,
    userFacing: true,
    message: 'Vessel not found',
    description: 'The requested vessel was not found in the AIS database.',
  },
};

/**
 * Map HTTP status codes to error codes (provider-agnostic)
 */
const HTTP_STATUS_TO_ERROR_CODE = {
  400: 'ERR_VALIDATOR',
  401: 'ERR_INVALID_KEY',
  402: 'ERR_NO_CREDITS',
  404: 'ERR_NOT_FOUND',
  429: 'ERR_RATE_LIMIT',
  500: 'ERR_INTERNAL',
};

/**
 * Get error code map for a specific provider
 * @param {string} provider - Provider name ('myshiptracking' or 'datalastic')
 * @returns {Object} Error code mapping object
 */
function getErrorCodeMap(provider) {
  switch (provider?.toLowerCase()) {
    case 'myshiptracking':
      return MYSHIPTRACKING_ERROR_MAP;
    case 'datalastic':
      return DATALASTIC_ERROR_MAP;
    default:
      // Default to MyShipTracking for backward compatibility
      return MYSHIPTRACKING_ERROR_MAP;
  }
}

/**
 * Create a standardized error from AIS API error
 * @param {Object} errorData - Error data from API response
 * @param {number} httpStatus - HTTP status code
 * @param {string} endpoint - API endpoint that failed
 * @param {string} provider - Provider name ('myshiptracking' or 'datalastic')
 * @returns {Object} Standardized error object
 */
export function createAisError(errorData, httpStatus, endpoint, provider = 'myshiptracking') {
  const errorCodeMap = getErrorCodeMap(provider);
  
  // Try to extract error code from response
  const errorCode = errorData?.error_code || 
                    errorData?.errorCode || 
                    errorData?.code ||
                    HTTP_STATUS_TO_ERROR_CODE[httpStatus] ||
                    'ERR_INTERNAL';
  
  // Get error mapping
  const errorMapping = errorCodeMap[errorCode] || errorCodeMap['ERR_INTERNAL'];
  
  // Get error message from API or use mapped message
  const apiMessage = errorData?.message || errorData?.error || errorData?.errorMessage;
  const message = apiMessage || errorMapping.message;
  
  return {
    code: errorCode,
    status: errorMapping.status,
    message,
    description: errorMapping.description,
    userFacing: errorMapping.userFacing,
    retryAfter: errorMapping.retryAfter,
    endpoint,
    provider,
    originalError: errorData,
  };
}

/**
 * Check if error should be shown to user
 * @param {Object} error - Error object
 * @returns {boolean} True if error is user-facing
 */
export function isUserFacingError(error) {
  return error.userFacing === true;
}

/**
 * Format error for API response
 * @param {Object} error - Standardized error object
 * @param {boolean} includeDetails - Include detailed error information (for development)
 * @returns {Object} Formatted error response
 */
export function formatErrorResponse(error, includeDetails = false) {
  const response = {
    error: {
      code: error.code,
      message: error.message,
      description: error.description,
    },
  };
  
  if (error.retryAfter) {
    response.error.retryAfter = error.retryAfter;
  }
  
  // Include additional details in development mode
  if (includeDetails && process.env.NODE_ENV === 'development') {
    response.error.endpoint = error.endpoint;
    response.error.provider = error.provider;
    response.error.originalError = error.originalError;
  }
  
  return response;
}

// Export error code maps for reference
export { MYSHIPTRACKING_ERROR_MAP, DATALASTIC_ERROR_MAP, HTTP_STATUS_TO_ERROR_CODE };

