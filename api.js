/**
 * STACC Form — API Service Module
 * 
 * Backend integration layer. Set API_BASE_URL to your server
 * and this module handles POST, error handling, retry, and timeout.
 * 
 * Usage:
 *   import { submitRegistration } from './api.js';
 *   const result = await submitRegistration(formData);
 */

// ─── Configuration ──────────────────────────────────────────
const API_CONFIG = {
  BASE_URL: 'https://stacc-form-v2.onrender.com',                         // Set to your backend URL, e.g. 'https://api.stacc.club'
  ENDPOINTS: {
    REGISTER: '/api/registrations',     // POST endpoint for form submissions
  },
  TIMEOUT_MS: 60000,                    // 10 second timeout
  MAX_RETRIES: 1,                       // Retry once on network failure
};

// ─── Custom Error ───────────────────────────────────────────
class ApiError extends Error {
  constructor(message, statusCode = null, responseBody = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

// ─── Internal: Fetch with timeout ───────────────────────────
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out. Please try again.', null);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Internal: Make request with retry ──────────────────────
async function makeRequest(url, options, retries = API_CONFIG.MAX_RETRIES) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, API_CONFIG.TIMEOUT_MS);

      // Parse response
      let body = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        body = await response.json();
      } else {
        body = await response.text();
      }

      // Check for error status codes
      if (!response.ok) {
        throw new ApiError(
          body?.message || `Server error (${response.status})`,
          response.status,
          body
        );
      }

      return body;
    } catch (err) {
      lastError = err;

      // Don't retry on client errors (4xx) — only on network / 5xx
      if (err instanceof ApiError && err.statusCode && err.statusCode < 500) {
        throw err;
      }

      // If we still have retries left, wait briefly then retry
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.warn(`[STACC API] Retrying request (attempt ${attempt + 2})...`);
      }
    }
  }

  // All retries exhausted
  if (lastError instanceof ApiError) {
    throw lastError;
  }
  throw new ApiError(
    'Network error. Please check your connection and try again.',
    null
  );
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Submit registration form data to the backend.
 * 
 * @param {Object} formData - The form data object
 * @param {string} formData.name         - Full name
 * @param {string} formData.email        - Email address
 * @param {string} formData.phone        - 10-digit phone number
 * @param {string} formData.distro       - Selected Linux distro
 * @param {string} formData.space_check  - 'yes' or 'no'
 * @param {string} formData.usb_check    - 'yes' or 'no'
 * @param {number} formData.linux_familiarity  - 1–10
 * @param {number} formData.cmd_familiarity    - 1–10
 * @param {string} formData.bash_workshop      - 'yes' or 'no'
 * 
 * @returns {Promise<Object>} Server response body
 * @throws {ApiError} On network or server errors
 */
async function submitRegistration(formData) {
  const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REGISTER}`;

  // If no backend URL configured, simulate success (dev mode)
  if (!API_CONFIG.BASE_URL) {
    console.info('[STACC API] No BASE_URL configured — simulating successful submission.');
    console.info('[STACC API] Payload that would be sent:', JSON.stringify(formData, null, 2));
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      success: true,
      message: 'Registration simulated (no backend configured)',
      data: { id: `sim_${Date.now()}`, ...formData },
    };
  }

  return makeRequest(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(formData),
  });
}

/**
 * Check if the API backend is reachable (health check).
 * @returns {Promise<boolean>}
 */
async function checkApiHealth() {
  if (!API_CONFIG.BASE_URL) return true; // Dev mode always returns true

  try {
    const response = await fetchWithTimeout(
      `${API_CONFIG.BASE_URL}/api/health`,
      { method: 'GET' },
      5000
    );
    return response.ok;
  } catch {
    return false;
  }
}

// Export for use by other modules (works with plain script tags too)
window.StaccApi = {
  submitRegistration,
  checkApiHealth,
  ApiError,
  API_CONFIG,
};
