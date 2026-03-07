/**
 * STACC Form — Validation Module
 * 
 * Production-grade per-field validation with real-time feedback.
 * Attach to form fields on load; call validateForm() before submit.
 */

// ─── Validation Rules ───────────────────────────────────────

const VALIDATION_RULES = {
  nameInput: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s'.'-]+$/,
    messages: {
      required: 'Name is required.',
      minLength: 'Name must be at least 2 characters.',
      maxLength: 'Name must be under 100 characters.',
      pattern: 'Name can only contain letters, spaces, hyphens, and apostrophes.',
    },
  },
  emailInput: {
    required: true,
    // RFC 5322-ish email regex — stricter than HTML5 type="email"
    pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/,
    messages: {
      required: 'Email is required.',
      pattern: 'Please enter a valid email address.',
    },
  },
  phoneInput: {
    required: true,
    sanitize: (val) => val.replace(/[^0-9]/g, '').slice(0, 10),
    validate: (val) => {
      if (!val) return 'Phone number is required.';
      if (val.length !== 10) return 'Phone number must be exactly 10 digits.';
      if (val.charAt(0) === '0') return 'Phone number cannot start with 0.';
      if (!/^[6-9]\d{9}$/.test(val)) return 'Please enter a valid Indian mobile number.';
      return null;
    },
  },
  distroSelect: {
    required: true,
    messages: {
      required: 'Please select a Linux distro.',
    },
  },
  space_check: {
    type: 'radio',
    required: true,
    messages: {
      required: 'Please indicate if you have 100 GB free space.',
    },
  },
  usb_check: {
    type: 'radio',
    required: true,
    messages: {
      required: 'Please indicate if you can bring a USB stick.',
    },
  },
  bash_workshop: {
    type: 'radio',
    required: true,
    messages: {
      required: 'Please indicate your interest in the bash workshop.',
    },
  },
};

// ─── DOM Helpers ────────────────────────────────────────────

function showError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const fieldEl = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);

  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  if (fieldEl && fieldEl.type !== 'radio') {
    fieldEl.classList.add('field-error');
    fieldEl.classList.remove('field-valid');
  }
}

function clearError(fieldId) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const fieldEl = document.getElementById(fieldId) || document.querySelector(`[name="${fieldId}"]`);

  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }

  if (fieldEl && fieldEl.type !== 'radio') {
    fieldEl.classList.remove('field-error');
  }
}

function markValid(fieldId) {
  const fieldEl = document.getElementById(fieldId);
  if (fieldEl && fieldEl.type !== 'radio') {
    fieldEl.classList.add('field-valid');
    fieldEl.classList.remove('field-error');
  }
}

// ─── Single Field Validation ────────────────────────────────

function validateField(fieldId) {
  const rule = VALIDATION_RULES[fieldId];
  if (!rule) return true;

  // Radio buttons
  if (rule.type === 'radio') {
    const checked = document.querySelector(`input[name="${fieldId}"]:checked`);
    if (rule.required && !checked) {
      showError(fieldId, rule.messages.required);
      return false;
    }
    clearError(fieldId);
    return true;
  }

  const fieldEl = document.getElementById(fieldId);
  if (!fieldEl) return true;

  let value = fieldEl.value.trim();

  // Apply sanitizer if exists
  if (rule.sanitize) {
    value = rule.sanitize(value);
    fieldEl.value = value;
  }

  // Custom validate function
  if (rule.validate) {
    const error = rule.validate(value);
    if (error) {
      showError(fieldId, error);
      return false;
    }
    clearError(fieldId);
    markValid(fieldId);
    return true;
  }

  // Required check
  if (rule.required && !value) {
    showError(fieldId, rule.messages.required);
    return false;
  }

  // Min length
  if (rule.minLength && value.length < rule.minLength) {
    showError(fieldId, rule.messages.minLength);
    return false;
  }

  // Max length
  if (rule.maxLength && value.length > rule.maxLength) {
    showError(fieldId, rule.messages.maxLength);
    return false;
  }

  // Pattern
  if (rule.pattern && value && !rule.pattern.test(value)) {
    showError(fieldId, rule.messages.pattern);
    return false;
  }

  clearError(fieldId);
  if (value) markValid(fieldId);
  return true;
}

// ─── Full Form Validation ───────────────────────────────────

function validateForm() {
  let isValid = true;
  const errors = {};

  for (const fieldId of Object.keys(VALIDATION_RULES)) {
    if (!validateField(fieldId)) {
      isValid = false;
      const errorEl = document.getElementById(`${fieldId}-error`);
      errors[fieldId] = errorEl ? errorEl.textContent : 'Invalid';
    }
  }

  return { isValid, errors };
}

// ─── Collect Form Data ──────────────────────────────────────

function collectFormData() {
  const getValue = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };

  const getRadio = (name) => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : '';
  };

  return {
    name: getValue('nameInput'),
    email: getValue('emailInput'),
    phone: getValue('phoneInput'),
    distro: getValue('distroSelect'),
    space_check: getRadio('space_check'),
    usb_check: getRadio('usb_check'),
    linux_familiarity: parseInt(getValue('linuxRange')) || 1,
    cmd_familiarity: parseInt(getValue('cmdRange')) || 1,
    bash_workshop: getRadio('bash_workshop'),
    submitted_at: new Date().toISOString(),
  };
}

// ─── Attach Real-Time Validation ────────────────────────────

function initValidation() {
  // Text / select fields — validate on blur
  ['nameInput', 'emailInput', 'phoneInput', 'distroSelect'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('blur', () => validateField(id));

      // Also sanitize phone on input
      if (id === 'phoneInput') {
        el.addEventListener('input', (e) => {
          const rule = VALIDATION_RULES.phoneInput;
          if (rule.sanitize) {
            e.target.value = rule.sanitize(e.target.value);
          }
        });
      }
    }
  });

  // Radio buttons — validate on change
  ['space_check', 'usb_check', 'bash_workshop'].forEach((name) => {
    const radios = document.querySelectorAll(`input[name="${name}"]`);
    radios.forEach((radio) => {
      radio.addEventListener('change', () => validateField(name));
    });
  });
}

// ─── Export ─────────────────────────────────────────────────

window.StaccValidation = {
  validateField,
  validateForm,
  collectFormData,
  initValidation,
  showError,
  clearError,
};
