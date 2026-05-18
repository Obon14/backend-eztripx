
export const ErrorMessages = {
  DATA_NOT_FOUND: 'Data Not Found',
  EMAIL_ALREADY_EXISTS: 'Email already exists',
  USERNAME_ALREADY_EXISTS: 'Username already exists',
  INTERNAL_SERVER_ERROR: 'Internal Server Error',
  EMAIL_CANNOT_EMPTY: 'Email address cannot be empty',
  EMAIL_FORMAT: 'Please provide a valid email address format',
  PASSWORD_MIN: 'Password must contain at least 6 characters',
  PASSWORD_MAX: 'Password cannot exceed 25 characters',
  USERNAME_CANNOT_EMPTY: 'Username cannot be empty',
  INVALID_CREDENTIALS: 'Invalid username or password',
  FORBIDDEN: 'Forbidden',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait before trying again.',
  DATA_ALREADY_EXISTS: 'Data Already Exists',
  FILE_SIZE_EXCEEDS_MAX: 'File size exceeds the maximum allowed size',
  INVALID_FILE_TYPE: 'Invalid file type. Allowed types: ',
  FILE_NOT_IMAGE: 'The file cannot be processed as an image.',
  INVALID_FILE_FORMAT: 'Invalid file: file format does not match those allowed',
  DOCUMENT_GUIDE_TITLE_EXISTS: 'A document guide with this title already exists',
  DOCUMENT_GUIDE_HAS_ORDERS:
    'Cannot delete this document guide because it has related orders',
  DOCUMENT_GUIDE_FILE_NOT_FOUND: 'Document file not found on server',
  DOCUMENT_GUIDE_TAGS_INVALID_JSON: 'Invalid tags JSON payload',
  DOCUMENT_GUIDE_TAGS_REQUIRED: 'At least one destination tag is required',
  DOCUMENT_GUIDE_INVALID_TAG: 'Invalid region, country, or city for a tag',
  DOCUMENT_GUIDE_NOTHING_TO_UPDATE: 'No fields or file provided to update',
  DOCUMENT_GUIDE_INVALID_PRICE: 'Invalid price value',
  ORDER_PRICE_UNAVAILABLE:
    'Price is not available for the selected currency on this document guide',
  ORDER_PAYMENT_NOT_INITIATED: 'Payment has not been initiated for this order',
  ORDER_PAYMENT_REQUIRED:
    'Payment is required to access this document guide',
} as const;

export const SuccessMessages = {
  SUCCESS: 'Success',
  REGISTER_SUCCESS: 'Register Success',
  CREATE_SUCCESS: 'Create data success',
  UPDATE_SUCCESS: 'Update data success',
  DELETE_SUCCESS: 'Delete data success',
} as const;
