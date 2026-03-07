/**
 * STACC Form — Main Application Logic
 * 
 * Depends on: api.js, validate.js (loaded before this file)
 */

// ─── Element References ─────────────────────────────────────
const swipeBall = document.getElementById('swipeBall');
const swipeFill = document.querySelector('.swipe-fill');
const page1 = document.getElementById('page-1');
const page2 = document.getElementById('page-2');
const page3 = document.getElementById('page-3');
const staccForm = document.getElementById('staccForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = submitBtn.querySelector('.btn-text');
const btnLoader = submitBtn.querySelector('.btn-loader');
const rangeValue = document.getElementById('rangeValue');
const linuxTag = document.getElementById('linuxTag');
const linuxRange = document.getElementById('linuxRange');
const cmdRange = document.getElementById('cmdRange');
const cmdValue = document.getElementById('cmdValue');
const cmdTag = document.getElementById('cmdTag');

// ─── Skill Tags ─────────────────────────────────────────────
const linuxTags = {
  1: "Noob",
  2: "Beginner",
  3: "Explorer",
  4: "Casual User",
  5: "Intermediate",
  6: "Distro Hopper",
  7: "Power User",
  8: "SysAdmin",
  9: "Kernel Hacker",
  10: "Linus Torvalds"
};

const cmdTags = {
  1: "Beginner",
  2: "Novice",
  3: "Learner",
  4: "Comfortable",
  5: "Intermediate",
  6: "Proficient",
  7: "Advanced",
  8: "Scripter",
  9: "Wizard",
  10: "Shell God"
};

// ─── Range Sliders ──────────────────────────────────────────
linuxRange.addEventListener('input', (e) => {
  const val = e.target.value;
  rangeValue.textContent = val;
  linuxTag.textContent = linuxTags[val];
});

cmdRange.addEventListener('input', (e) => {
  const val = e.target.value;
  cmdValue.textContent = val;
  cmdTag.textContent = cmdTags[val];
});

// ─── Swipe to Continue ─────────────────────────────────────
let isDragging = false;

const startDrag = (e) => {
  isDragging = true;
  e.preventDefault();
};
const stopDrag = () => {
  if (!isDragging) return;
  isDragging = false;

  // Snap back if not completed
  const percentage = parseFloat(swipeFill.style.width) || 0;
  if (percentage <= 96) {
    swipeBall.style.left = '5px';
    swipeFill.style.width = '0%';
    swipeBall.style.transition = 'left 0.3s ease';
    swipeFill.style.transition = 'width 0.3s ease';
    setTimeout(() => {
      swipeBall.style.transition = 'none';
      swipeFill.style.transition = 'none';
    }, 300);
  }
};

swipeBall.addEventListener('mousedown', startDrag);
swipeBall.addEventListener('touchstart', startDrag, { passive: false });
window.addEventListener('mouseup', stopDrag);
window.addEventListener('touchend', stopDrag);

const handleMove = (e) => {
  if (!isDragging) return;

  const container = document.querySelector('.swipe-track');
  const rect = container.getBoundingClientRect();
  let clientX = e.touches ? e.touches[0].clientX : e.clientX;
  let x = clientX - rect.left - 25;

  const maxPath = rect.width - 55;
  if (x < 5) x = 5;
  if (x > maxPath) x = maxPath;

  swipeBall.style.left = x + 'px';
  let percentage = ((x - 5) / (maxPath - 5)) * 100;
  swipeFill.style.width = percentage + '%';

  if (percentage > 96) {
    isDragging = false;
    // Transition to page 2
    page1.classList.remove('active');
    page2.classList.add('active');
  }
};

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, { passive: false });

// ─── Loading State ──────────────────────────────────────────
function setLoading(loading) {
  submitBtn.disabled = loading;
  btnText.style.display = loading ? 'none' : 'inline';
  btnLoader.style.display = loading ? 'inline' : 'none';
}

// ─── Toast Notification ─────────────────────────────────────
function showToast(message, duration = 4000) {
  // Remove existing toast
  const existing = document.querySelector('.toast-error');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-error';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Fire Confetti ──────────────────────────────────────────
function fireConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#1793d1', '#ffffff', '#16a34a', '#0f5f8a', '#f59e0b'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 90,
      spread: 360,
      origin: { x: Math.random(), y: -0.05 },
      colors: colors,
      gravity: 1,
      scalar: 1.1,
      shapes: ['circle', 'square'],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  }());
}

// ─── Form Submission ────────────────────────────────────────
staccForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Validate all fields
  const { isValid, errors } = window.StaccValidation.validateForm();

  if (!isValid) {
    // Scroll to first error
    const firstErrorEl = document.querySelector('.field-error, .error-message[style*="block"]');
    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    showToast('Please fix the errors above before submitting.');
    return;
  }

  // Collect form data
  const formData = window.StaccValidation.collectFormData();

  // Set loading
  setLoading(true);

  try {
    // Submit to backend (or simulate)
    const result = await window.StaccApi.submitRegistration(formData);
    console.info('[STACC] Submission successful:', result);

    // Transition to thank you page
    page2.classList.remove('active');
    page3.classList.add('active');

    // Fire confetti
    fireConfetti();

  } catch (err) {
    console.error('[STACC] Submission failed:', err);

    if (err.statusCode === 409) {
      showToast('This email is already registered!');
    } else if (err.statusCode === 422) {
      showToast('Some data was invalid. Please check your inputs.');
    } else {
      showToast(err.message || 'Something went wrong. Please try again.');
    }
  } finally {
    setLoading(false);
  }
});

// ─── Initialize Validation ──────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.StaccValidation.initValidation();
});
