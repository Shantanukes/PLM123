import './styles.css';
import './enterprise-theme.css';
import { authFetch } from './api/client.js';
import {
  buildUserFromAuth,
  clearAuthTokens,
  getAccessToken,
  getBackendRole,
  getErrorMessageFromResponse,
  getRefreshToken,
  getStoredApiBaseUrl,
  loginToBackend,
  normalizeApiBaseUrl,
  persistAuthTokens,
  revokeRefreshToken,
  setStoredApiBaseUrl,
} from './api/index.js';
import { changePassword } from './api/members.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderParts } from './pages/parts.js';
import { renderBOM } from './pages/bom.js';
import { renderDocuments } from './pages/documents.js';
import { renderWorkflows } from './pages/workflows.js';
import { renderSuppliers } from './pages/suppliers.js';
import { renderMembers } from './pages/members.js';
import { renderChangeManagement as renderChangeMgmt } from './pages/change-mgmt.js';
import { renderModels } from './pages/models.js';
import { renderSoftware } from './pages/software.js';
import { renderReports } from './pages/reports.js';
import { renderAdmin } from './pages/admin.js';
import { renderPartNumber } from './pages/part-number.js';
import { renderTicketRaise } from './pages/ticket-raise.js';
import { renderTicketHistory } from './pages/ticket-history.js';
import { renderHomologation } from './pages/homologation.js';
import { renderUploadDrawing } from './pages/upload-drawing.js';

// Executive Pages
import { renderExecutiveAnalytics } from './pages/executive-analytics.js';
import { renderBOMLifecycle } from './pages/bom-lifecycle.js';
import { renderPartsLifecycle } from './pages/parts-lifecycle.js';
import { renderECNLifecycle } from './pages/ecn-lifecycle.js';
import { renderActivityTimeline } from './pages/activity-timeline.js';
import { renderTeamPerformance } from './pages/team-performance.js';

// ─── Application State ───
const SESSION_USER_KEY = 'kg_plm_session_user';
const AUTH_FLASH_MESSAGE_KEY = 'kg_plm_auth_flash_message';

const AUTH_MODE = {
  LOGIN: 'login',
  RESET: 'reset',
};

const DEFAULT_USER_STATE = {
  name: 'Guest',
  initials: 'GU',
  role: 'Guest',
  email: '',
};

const state = {
  user: { ...DEFAULT_USER_STATE },
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  notifOpen: false,
  userMenuOpen: false,
};

const PAGE_DEFINITIONS = [
  // Executive Pages
  { id: 'executive-analytics', label: 'Executive Analytics', render: renderExecutiveAnalytics },
  { id: 'bom-lifecycle', label: 'BOM Lifecycle', render: renderBOMLifecycle },
  { id: 'parts-lifecycle', label: 'Parts Lifecycle', render: renderPartsLifecycle },
  { id: 'ecn-lifecycle', label: 'ECN Lifecycle', render: renderECNLifecycle },
  { id: 'activity-timeline', label: 'Activity Timeline', render: renderActivityTimeline },
  { id: 'team-performance', label: 'Team Performance', render: renderTeamPerformance },

  // Operational Pages
  { id: 'dashboard', label: 'Dashboard', render: renderDashboard },
  { id: 'parts', label: 'Parts', render: renderParts },
  { id: 'bom', label: 'BOM', render: renderBOM },
  { id: 'documents', label: 'Part Release', render: renderDocuments },
  { id: 'upload-drawing', label: 'Upload Drawing', render: renderUploadDrawing },
  { id: 'workflows', label: 'My Inbox', render: renderWorkflows },
  { id: 'ticket-raise', label: 'Raise Ticket', render: renderTicketRaise },
  { id: 'ticket-history', label: 'Ticket History', render: renderTicketHistory },
  { id: 'change-mgmt', label: 'Change Management', render: renderChangeMgmt },
  { id: 'models', label: 'Models & Variants', render: renderModels },
  { id: 'homologation', label: 'Homologation', render: renderHomologation },
  { id: 'software', label: 'Software / OTA', render: renderSoftware },
  { id: 'reports', label: 'Reports', render: renderReports },
  { id: 'suppliers', label: 'Suppliers', render: renderSuppliers },
  { id: 'members', label: 'Members', render: renderMembers },
  { id: 'part-number', label: 'Lookups', render: renderPartNumber },
  { id: 'admin', label: 'Admin', render: renderAdmin },
];

const pageRenderers = Object.fromEntries(PAGE_DEFINITIONS.map((page) => [page.id, page.render]));
const pageLabels = Object.fromEntries(PAGE_DEFINITIONS.map((page) => [page.id, page.label]));

export function getCurrentUserRole() {
  return String(state.user?.role || '').trim();
}

function getAllowedPages() {
  const rawRole = getCurrentUserRole().toLowerCase();
  const role = rawRole.replace(/[-\\s]/g, '');

  const executivePages = [
    'executive-analytics',
    'bom-lifecycle',
    'parts-lifecycle',
    'ecn-lifecycle',
    'activity-timeline',
    'team-performance'
  ];

  // Founder and Co-Founder ONLY see executive pages. All operational pages are hidden.
  if (role === 'founder' || rawRole === '11' || role === 'cofounder' || rawRole === '12') {
    return executivePages;
  }

  // Designer sees specific operational pages
  if (role === 'designer' || rawRole === '6') {
    const designerAllowed = [
      'parts', 'bom', 'documents', 'upload-drawing', 'workflows',
      'ticket-raise', 'ticket-history', 'change-mgmt', 'reports',
      'suppliers', 'members', 'part-number'
    ];
    return PAGE_DEFINITIONS.map((p) => p.id).filter(id => designerAllowed.includes(id));
  }

  // Default to all operational pages for other roles (excluding the executive suite)
  return PAGE_DEFINITIONS.map((page) => page.id).filter(id => !executivePages.includes(id));
}

function canAccessPage(page) {
  return getAllowedPages().includes(page);
}


const FORGOT_ENDPOINT_CANDIDATES = [
  '/api/Auth/forgot-password',
  '/api/Auth/forgotPassword',
  '/api/Members/forgot-password',
  '/api/Members/forgotPassword',
];

function clearSessionUser() {
  localStorage.removeItem(SESSION_USER_KEY);
  clearAuthTokens();
}

function persistSessionUser() {
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(state.user || DEFAULT_USER_STATE));
}

async function requestPasswordResetEmail(apiBaseUrl, email) {
  for (const endpoint of FORGOT_ENDPOINT_CANDIDATES) {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (response.ok) return true;
    if (response.status === 404) continue;

    let rawData = null;
    try {
      rawData = await response.json();
    } catch {
      rawData = null;
    }
    throw new Error(getErrorMessageFromResponse(rawData, 'Unable to send reset email.'));
  }

  throw new Error('No reset request endpoint found in backend.');
}

async function submitPasswordChange({ apiBaseUrl, currentPassword, newPassword, confirmPassword, token }) {
  await changePassword({
    apiBaseUrl,
    currentPassword,
    newPassword,
    confirmPassword,
    token,
  });
}

function getCurrentAuthMode() {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith('/reset-password')) return AUTH_MODE.RESET;
  return AUTH_MODE.LOGIN;
}

function getResetQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get('token') || params.get('resetToken') || '',
    email: params.get('email') || '',
  };
}

function resetToLoginView() {
  window.location.href = '/';
}

function consumeAuthFlashMessage() {
  const flash = localStorage.getItem(AUTH_FLASH_MESSAGE_KEY);
  if (!flash) return;
  localStorage.removeItem(AUTH_FLASH_MESSAGE_KEY);
  showToast(flash, 'success');
}

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 12) return `${token.slice(0, 2)}******${token.slice(-2)}`;
  return `${token.slice(0, 6)}******${token.slice(-6)}`;
}

function renderResetRequestView() {
  const container = document.querySelector('.login-form-container');
  if (!container) return;

  container.innerHTML = `
    <h2>Reset Password</h2>
    <p class="login-subtitle">Enter your email to receive a secure reset link.</p>
    <form id="reset-request-form" autocomplete="off">
      <div class="form-group">
        <label for="reset-email">Work Email</label>
        <div class="input-icon-wrap">
          <span class="material-icons-outlined">mail_outline</span>
          <input type="email" id="reset-email" placeholder="e.g. admin@kineticgreen.com" required />
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-full">
        <span>Send Reset Link</span>
        <span class="material-icons-outlined icon-18">forward_to_inbox</span>
      </button>
      <button type="button" class="btn btn-outline btn-full mt-12" id="back-to-login-from-request">Back to Login</button>
      <p class="text-xs text-secondary" style="margin-top:12px">For security, we never reveal whether an account exists.</p>
    </form>
  `;

  document.getElementById('back-to-login-from-request')?.addEventListener('click', resetToLoginView);

  document.getElementById('reset-request-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email')?.value?.trim();
    const apiBaseUrl = getStoredApiBaseUrl();

    if (!email) return showToast('Email is required.', 'warning');
    if (!apiBaseUrl) return showToast('Backend API base URL is required.', 'warning');

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 0.6s linear infinite">autorenew</span> Sending...';
    }

    try {
      await requestPasswordResetEmail(apiBaseUrl, email);
      showToast('If your account exists, a password reset link has been sent.', 'success');
      resetToLoginView();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to request password reset.';
      showToast(message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span class="btn-text">Send Reset Link</span><span class="material-icons-outlined icon-18 btn-icon">forward_to_inbox</span>';
      }
    }
  });
}

function renderResetPasswordView() {
  const container = document.querySelector('.login-form-container');
  if (!container) return;

  const { token, email } = getResetQuery();
  const hasToken = Boolean(token);
  const requiresAuth = !hasToken;

  container.innerHTML = `
    <div style="max-width: 550px; margin: 0 auto; width: 100%;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Set New Password</h2>
        <p class="login-subtitle" style="color: var(--text-secondary); font-size: 14px;">Create a strong password to securely access your PLM account.</p>
      </div>

      <form id="reset-password-form" autocomplete="off" style="display: flex; flex-direction: column; gap: 20px;">
        
        <div id="reset-error-msg" style="display: none; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 12px; border-radius: 8px; font-size: 13px; font-weight: 500; border: 1px solid rgba(239, 68, 68, 0.2); align-items: center; gap: 8px;">
        <span class="material-icons-outlined" style="font-size: 16px;">error_outline</span>
        <span id="reset-error-text"></span>
      </div>

      <!-- Account Info -->
      ${email ? `
      <div style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; display: flex; justify-content: center; align-items: center; gap: 10px;">
        <span class="material-icons-outlined" style="font-size: 20px; color: var(--text-secondary);">person</span>
        <span style="font-weight: 600; color: var(--text-primary); font-size: 15px; word-break: break-all;">
          ${email}
        </span>
      </div>
      ` : ''}

      ${requiresAuth ? `
        <div class="form-group floating-label-group">
          <div class="input-icon-wrap" style="position: relative;">
            <span class="material-icons-outlined input-icon" style="position: absolute; left: 16px; top: 12px;">lock_outline</span>
            <input type="password" id="reset-current-password" placeholder=" " required style="width: 100%; padding: 12px 16px 12px 48px; border-radius: 8px; border: 1px solid var(--border-color); height: 48px; background: var(--bg-muted);"/>
            <label for="reset-current-password" style="position: absolute; left: 48px; top: 14px; color: var(--text-secondary); transition: all 0.2s;">Current Password</label>
            <button type="button" class="pwd-toggle material-icons-outlined" tabindex="-1" style="position: absolute; right: 16px; top: 12px; background: none; border: none; color: var(--text-secondary); cursor: pointer;">visibility</button>
          </div>
        </div>
      ` : ''}

      <div class="form-group floating-label-group">
        <div class="input-icon-wrap" style="position: relative;">
          <span class="material-icons-outlined input-icon" style="position: absolute; left: 16px; top: 12px;">lock</span>
          <input type="password" id="reset-new-password" placeholder=" " required style="width: 100%; padding: 12px 16px 12px 48px; border-radius: 8px; border: 1px solid var(--border-color); height: 48px; background: var(--bg-muted);"/>
          <label for="reset-new-password" style="position: absolute; left: 48px; top: 14px; color: var(--text-secondary); transition: all 0.2s;">New Password</label>
          <button type="button" class="pwd-toggle material-icons-outlined" tabindex="-1" style="position: absolute; right: 16px; top: 12px; background: none; border: none; color: var(--text-secondary); cursor: pointer;">visibility</button>
        </div>
      </div>

      <!-- Password Strength & Requirements -->
      <div id="pwd-strength-container" style="background: rgba(0,0,0,0.02); padding: 16px; border-radius: 12px; border: 1px solid var(--border-color); display: none;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 600;">
          <span style="color: var(--text-secondary);">Password Strength</span>
          <span id="pwd-strength-text" style="color: var(--text-primary); transition: color 0.3s;">Weak</span>
        </div>
        <div style="height: 6px; background: var(--border-color); border-radius: 4px; overflow: hidden; margin-bottom: 16px; display: flex;">
          <div id="pwd-strength-bar" style="height: 100%; width: 0%; background: #ef4444; transition: width 0.3s ease, background 0.3s ease;"></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #ffffff;">
          <div id="req-len" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> At least 8 chars</div>
          <div id="req-up" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> One uppercase</div>
          <div id="req-low" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> One lowercase</div>
          <div id="req-num" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> One number</div>
          <div id="req-spc" style="display: flex; align-items: center; gap: 6px;"><span class="material-icons-outlined" style="font-size: 14px;">radio_button_unchecked</span> One special</div>
        </div>
      </div>

      <div class="form-group floating-label-group">
        <div class="input-icon-wrap" style="position: relative;">
          <span class="material-icons-outlined input-icon" style="position: absolute; left: 16px; top: 12px;">task_alt</span>
          <input type="password" id="reset-confirm-password" placeholder=" " required style="width: 100%; padding: 12px 16px 12px 48px; border-radius: 8px; border: 1px solid var(--border-color); height: 48px; background: var(--bg-muted);"/>
          <label for="reset-confirm-password" style="position: absolute; left: 48px; top: 14px; color: var(--text-secondary); transition: all 0.2s;">Confirm Password</label>
          <button type="button" class="pwd-toggle material-icons-outlined" tabindex="-1" style="position: absolute; right: 16px; top: 12px; background: none; border: none; color: var(--text-secondary); cursor: pointer;">visibility</button>
        </div>
      </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px; margin-top: 8px; flex-direction: column;">
          <button type="submit" class="btn btn-primary" style="width: 100%; height: 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);" ${hasToken || getAccessToken() ? '' : 'disabled'}>
            <span>Update Password</span>
            <span class="material-icons-outlined icon-18">verified</span>
          </button>
          <button type="button" class="btn btn-outline" id="back-to-login-from-reset" style="width: 100%; height: 48px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 8px; font-weight: 600; font-size: 15px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #ffffff; transition: background 0.2s, border 0.2s; cursor: pointer;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
            <span>Back to Login</span>
          </button>
        </div>
      </form>
    </div>
  `;

  // Attach view toggle for passwords
  document.querySelectorAll('.pwd-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const input = e.target.parentElement.querySelector('input');
      if (input.type === 'password') {
        input.type = 'text';
        e.target.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        e.target.textContent = 'visibility';
      }
    });
  });

  // Attach floating label logic (simple via focus/blur or rely on existing css if placeholder is " ")
  // The placeholder=" " enables the :placeholder-shown pseudo selector in CSS if defined.

  // Password strength logic
  const newPwdInput = document.getElementById('reset-new-password');
  const strengthContainer = document.getElementById('pwd-strength-container');
  const strengthBar = document.getElementById('pwd-strength-bar');
  const strengthText = document.getElementById('pwd-strength-text');
  
  const reqLen = document.getElementById('req-len');
  const reqUp = document.getElementById('req-up');
  const reqLow = document.getElementById('req-low');
  const reqNum = document.getElementById('req-num');
  const reqSpc = document.getElementById('req-spc');

  newPwdInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length > 0) {
      strengthContainer.style.display = 'block';
    } else {
      strengthContainer.style.display = 'none';
    }

    const hasLen = val.length >= 8;
    const hasUp = /[A-Z]/.test(val);
    const hasLow = /[a-z]/.test(val);
    const hasNum = /[0-9]/.test(val);
    const hasSpc = /[!@#$%^&*(),.?":{}|<>]/.test(val);

    const updateReq = (el, met) => {
      const icon = el.querySelector('span');
      if (met) {
        icon.textContent = 'check_circle';
        icon.style.color = '#10b981';
        el.style.color = '#ffffff';
      } else {
        icon.textContent = 'radio_button_unchecked';
        icon.style.color = 'inherit';
        el.style.color = '#ffffff';
      }
    };

    updateReq(reqLen, hasLen);
    updateReq(reqUp, hasUp);
    updateReq(reqLow, hasLow);
    updateReq(reqNum, hasNum);
    updateReq(reqSpc, hasSpc);

    let score = 0;
    if (hasLen) score++;
    if (hasUp) score++;
    if (hasLow) score++;
    if (hasNum) score++;
    if (hasSpc) score++;

    let width = '0%';
    let color = '#ef4444';
    let text = 'Weak';

    if (score <= 2) {
      width = '33%';
      color = '#ef4444'; // Red
      text = 'Weak';
    } else if (score === 3 || score === 4) {
      width = '66%';
      color = '#f59e0b'; // Amber
      text = 'Medium';
    } else if (score === 5) {
      width = '100%';
      color = '#10b981'; // Green
      text = 'Strong';
    }

    strengthBar.style.width = width;
    strengthBar.style.background = color;
    strengthText.textContent = text;
    strengthText.style.color = color;
  });

  document.getElementById('back-to-login-from-reset')?.addEventListener('click', resetToLoginView);

  document.getElementById('reset-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('reset-current-password')?.value || '';
    const newPassword = document.getElementById('reset-new-password')?.value || '';
    const confirmPassword = document.getElementById('reset-confirm-password')?.value || '';
    const apiBaseUrl = getStoredApiBaseUrl();

    const errorContainer = document.getElementById('reset-error-msg');
    const errorText = document.getElementById('reset-error-text');
    
    const showError = (msg) => {
      errorText.textContent = msg;
      errorContainer.style.display = 'flex';
    };

    errorContainer.style.display = 'none';

    if (!apiBaseUrl) return showError('Backend API base URL is required.');
    if (requiresAuth && !getAccessToken()) return showError('Session expired. Login required to change password.');
    if (requiresAuth && !currentPassword) return showError('Current password is required.');
    if (!newPassword || !confirmPassword) return showError('Please fill all password fields.');
    if (newPassword !== confirmPassword) return showError('New password and confirm password do not match.');
    
    // Check password strength explicitly
    const hasLen = newPassword.length >= 8;
    const hasUp = /[A-Z]/.test(newPassword);
    const hasLow = /[a-z]/.test(newPassword);
    const hasNum = /[0-9]/.test(newPassword);
    const hasSpc = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    if (!hasLen || !hasUp || !hasLow || !hasNum || !hasSpc) {
      return showError('Please meet all password requirements before updating.');
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 0.6s linear infinite">autorenew</span> <span>Updating...</span>';
    }

    try {
      await submitPasswordChange({
        apiBaseUrl,
        currentPassword: requiresAuth ? currentPassword : '',
        newPassword,
        confirmPassword,
        token: hasToken ? token : '',
      });
      // The view redirects/shows success via AUTH_FLASH_MESSAGE_KEY or other method.
      localStorage.setItem(AUTH_FLASH_MESSAGE_KEY, 'Password updated successfully. Please login with your new password.');
      resetToLoginView();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update password.';
      showError(message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Update Password</span><span class="material-icons-outlined icon-18">verified</span>';
      }
    }
  });
}

function bindLoginAuxiliaryActions() {
  const forgotLink = document.querySelector('.link-subtle');
  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/reset-password';
  });
}

function updateUserIdentityUI() {
  document.querySelectorAll('.user-name').forEach((el) => {
    el.textContent = state.user.name;
  });
  document.querySelectorAll('.user-role').forEach((el) => {
    el.textContent = state.user.role;
  });
  document.querySelectorAll('.user-avatar, .user-avatar-sm').forEach((el) => {
    el.textContent = state.user.initials;
  });
}

function applyRoleAccessUI() {
  const allowedPages = new Set(getAllowedPages());
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.style.display = allowedPages.has(item.dataset.page) ? '' : 'none';
  });
}



// ─── Init ───
function init() {
  consumeAuthFlashMessage();

  const mode = getCurrentAuthMode();
  if (mode === AUTH_MODE.RESET) {
    renderResetPasswordView();
    return;
  }

  // Restore session if tokens exist
  const sessionUserStr = localStorage.getItem(SESSION_USER_KEY);
  const hasToken = getAccessToken() || getRefreshToken();

  if (sessionUserStr && hasToken) {
    try {
      state.user = JSON.parse(sessionUserStr);
      updateUserIdentityUI();
      applyRoleAccessUI();

      const loginScreen = document.getElementById('login-screen');
      const appShell = document.getElementById('app-shell');
      if (loginScreen) loginScreen.classList.add('hidden');
      if (appShell) {
        appShell.classList.remove('hidden');
        appShell.style.opacity = '1';
      }

      // Restore the exact page they were on, or fallback
      let initialPage = window.location.pathname.replace(/^\/+/, '') || 'dashboard';
      if (!canAccessPage(initialPage)) {
        initialPage = getAllowedPages()[0] || 'dashboard';
      }
      navigateTo(initialPage);

      // Listen for unrecoverable 401s from our interceptor
      window.addEventListener('auth:unauthorized', () => {
        showToast('Session expired. Please log in again.', 'warning');
        performLogout();
      });
    } catch (err) {
      console.error('Failed to restore session:', err);
      clearSessionUser();
    }
  }

  const loginForm = document.getElementById('login-form');
  loginForm?.addEventListener('submit', handleLogin);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
  document.getElementById('sidebar-toggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('notif-btn')?.addEventListener('click', toggleNotifications);
  document.getElementById('user-menu-btn')?.addEventListener('click', toggleUserMenu);
  document.addEventListener('keydown', handleKeyboard);

  const searchEl = document.getElementById('global-search');
  searchEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') searchEl.blur();
    if (e.key === 'Enter') handleGlobalSearch(searchEl.value);
  });

  bindLoginAuxiliaryActions();
  initCommandPalette();
  initNextGenInteractions();
}

function initNextGenInteractions() {
  document.addEventListener('mousedown', function (e) {
    const target = e.target.closest('.btn, .nav-item, .ripple-element');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
    ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
    target.appendChild(ripple);
    setTimeout(() => { ripple.remove(); }, 600);
  });

  document.addEventListener('mousemove', function (e) {
    document.querySelectorAll('.magnetic').forEach(btn => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const distance = Math.sqrt(x * x + y * y);
      if (distance < 50) {
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      } else {
        btn.style.transform = 'translate(0, 0)';
      }
    });
  });
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('login-email')?.value?.trim();
  const password = document.getElementById('login-password')?.value || '';
  const apiBaseUrl = getStoredApiBaseUrl();

  if (!apiBaseUrl) {
    showToast('Backend API base URL is missing.', 'warning');
    return;
  }
  if (!email || !password) {
    showToast('Email and password are required.', 'warning');
    return;
  }

  const btn = e.target.querySelector('button[type="submit"]');
  btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 0.6s linear infinite">autorenew</span> <span class="btn-text">Signing in...</span>';
  btn.disabled = true;

  // Add spin keyframe if not present
  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  try {
    const authPayload = await loginToBackend({ apiBaseUrl, email, password });
    setStoredApiBaseUrl(apiBaseUrl);

    persistAuthTokens(authPayload);

    state.user = buildUserFromAuth(authPayload, email);
    updateUserIdentityUI();
    applyRoleAccessUI();
    persistSessionUser();

    setTimeout(() => {
      const loginScreen = document.getElementById('login-screen');
      const appShell = document.getElementById('app-shell');
      loginScreen.style.opacity = '0';
      loginScreen.style.transform = 'scale(1.02)';
      loginScreen.style.transition = 'all 0.35s ease';
      setTimeout(() => {
        loginScreen.classList.add('hidden');
        appShell.classList.remove('hidden');
        appShell.style.opacity = '0';
        appShell.style.transition = 'opacity 0.3s ease';
        requestAnimationFrame(() => {
          appShell.style.opacity = '1';
          navigateTo(getAllowedPages()[0] || 'dashboard');
        });
      }, 350);
    }, 300);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to connect to backend auth API.';
    showToast(message, 'error');
    btn.innerHTML = '<span class="btn-text">Sign In</span><span class="material-icons-outlined icon-18 btn-icon">arrow_forward</span>';
    btn.disabled = false;
  }
}

export function navigateTo(page, pageData) {
  if (!canAccessPage(page)) {
    showToast(`Access denied for ${state.user.role}`, 'warning');
    const container = document.getElementById('page-container');
    if (container) {
      container.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;text-align:center;">
          <span class="material-icons-outlined" style="font-size:64px;color:#EF4444;margin-bottom:16px;">gpp_bad</span>
          <h2>Access Denied</h2>
          <p class="text-secondary" style="max-width:400px;margin:8px auto 24px;">Your role (<strong>${state.user.role}</strong>) does not have permission to view this page. If you believe this is an error, please contact your administrator.</p>
          <button class="btn btn-primary" onclick="window.location.href='/'">Return to Home</button>
        </div>`;
      container.style.opacity = '1';
    }
    return;
  }

  state.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  document.getElementById('bc-current').textContent = pageLabels[page] || page;
  const container = document.getElementById('page-container');
  container.style.opacity = '0';
  container.style.transform = 'translateY(6px)';
  container.style.transition = 'all 0.18s ease';
  setTimeout(() => {
    container.innerHTML = '';
    const renderer = pageRenderers[page];
    if (renderer) {
      container.innerHTML = '<div class="skeleton-block"></div><div class="skeleton-text"></div><div class="skeleton-text"></div>';
      setTimeout(() => {
        container.innerHTML = '';
        renderer(container, pageData);
        // Add staggering enter animations
        Array.from(container.children).forEach((child, i) => {
          child.classList.add('page-transition-enter');
          child.style.animationDelay = `${i * 0.05}s`;
        });
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
      }, 50); // slight delay to show skeleton and simulate real fetch
    }
  }, 180);
}

function toggleSidebar() {
  state.sidebarCollapsed = !state.sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', state.sidebarCollapsed);
}

function toggleNotifications() {
  state.notifOpen = !state.notifOpen;
  const existing = document.querySelector('.notif-panel');
  if (existing) { existing.remove(); state.notifOpen = false; return; }
  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-header">
      <h3>Notifications</h3>
      <button class="btn btn-xs btn-ghost" onclick="this.closest('.notif-panel').remove()">Mark all read</button>
    </div>
    <div class="notif-list">
      <div class="notif-item unread"><div class="notif-item-title">Part BA152002 submitted for review</div><div class="notif-item-desc">BMS PCB Rev B — Safar Smart Battery System needs your approval</div><div class="notif-item-time">5 minutes ago</div></div>
      <div class="notif-item unread"><div class="notif-item-title">ECR KG-ECR-2026-0047 raised</div><div class="notif-item-desc">Replace BMS PCB — overheating fix for Safar Smart — Priority: High</div><div class="notif-item-time">23 minutes ago</div></div>
      <div class="notif-item unread"><div class="notif-item-title">SLA Warning: Drawing review overdue</div><div class="notif-item-desc">DRW-51-GA151001-RevA has been pending review for 40 hours</div><div class="notif-item-time">1 hour ago</div></div>
      <div class="notif-item"><div class="notif-item-title">Part GA151002 Released</div><div class="notif-item-desc">BLDC Hub Motor 350W 48V — E-Luna Pro — now available in BOM</div><div class="notif-item-time">3 hours ago</div></div>
      <div class="notif-item"><div class="notif-item-title">OTA Package v2.3.1 approved for deployment</div><div class="notif-item-desc">BMS Firmware for E-Luna — staged rollout to 5% fleet initiated</div><div class="notif-item-time">5 hours ago</div></div>
    </div>`;
  document.body.appendChild(panel);
  setTimeout(() => {
    document.addEventListener('click', function closeNotif(ev) {
      if (!panel.contains(ev.target) && !ev.target.closest('#notif-btn')) {
        panel.remove(); state.notifOpen = false;
        document.removeEventListener('click', closeNotif);
      }
    });
  }, 100);
}

function closeUserMenu() {
  document.querySelector('.user-menu-panel')?.remove();
  state.userMenuOpen = false;
}

async function performLogout() {
  closeUserMenu();
  document.querySelector('.notif-panel')?.remove();
  state.notifOpen = false;

  const backendRole = getBackendRole({ accessToken: getAccessToken(), role: '' });
  if (backendRole === 'superadmin') {
    try {
      await revokeRefreshToken({
        apiBaseUrl: getStoredApiBaseUrl(),
        refreshToken: getRefreshToken(),
      });
    } catch {
      showToast('Logout completed, but session revoke failed.', 'warning');
    }
  }
  clearSessionUser();

  const appShell = document.getElementById('app-shell');
  const loginScreen = document.getElementById('login-screen');
  const loginForm = document.getElementById('login-form');

  appShell.style.opacity = '0';
  appShell.style.transition = 'opacity 0.25s ease';

  setTimeout(() => {
    appShell.classList.add('hidden');
    appShell.style.opacity = '';
    loginScreen.classList.remove('hidden');
    loginScreen.style.opacity = '1';
    loginScreen.style.transform = 'scale(1)';

    const submitBtn = loginForm?.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<span class="btn-text">Sign In</span><span class="material-icons-outlined icon-18 btn-icon">arrow_forward</span>';
      submitBtn.disabled = false;
    }

    navigateTo('dashboard');
    showToast('Logged out successfully.', 'info');
  }, 260);
}

function toggleUserMenu(e) {
  e?.stopPropagation();
  const existing = document.querySelector('.user-menu-panel');
  if (existing) {
    closeUserMenu();
    return;
  }

  const btn = document.getElementById('user-menu-btn');
  if (!btn) return;

  const rect = btn.getBoundingClientRect();
  const panel = document.createElement('div');
  panel.className = 'user-menu-panel';
  panel.style.cssText = `position:fixed;top:${rect.bottom + 8}px;right:${Math.max(12, window.innerWidth - rect.right)}px;background:#FFFFFF;border:1px solid var(--border-light);border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,0.16);z-index:10001;min-width:220px;padding:8px;`;
  panel.innerHTML = `
    <div style="padding:10px 12px;border-bottom:1px solid var(--border-light)">
      <div style="font-weight:700;font-size:0.86rem;color:var(--text-primary)">${state.user.name}</div>
      <div style="font-size:0.75rem;color:var(--text-secondary)">${state.user.role}</div>
    </div>
    <button id="user-menu-profile" class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;margin-top:6px;color:var(--text-primary)">
      <span class="material-icons-outlined" style="font-size:16px;margin-right:6px">account_circle</span>Profile Settings
    </button>
    <button id="user-menu-logout" class="btn btn-ghost btn-sm" style="width:100%;justify-content:flex-start;margin-top:2px;color:#DC2626">
      <span class="material-icons-outlined" style="font-size:16px;margin-right:6px">logout</span>Logout
    </button>
  `;

  document.body.appendChild(panel);
  state.userMenuOpen = true;

  panel.querySelector('#user-menu-profile')?.addEventListener('click', openProfileModal);
  panel.querySelector('#user-menu-logout')?.addEventListener('click', performLogout);

  setTimeout(() => {
    document.addEventListener('click', function closeOnOutsideClick(ev) {
      if (!panel.contains(ev.target) && !btn.contains(ev.target)) {
        closeUserMenu();
        document.removeEventListener('click', closeOnOutsideClick);
      }
    });
  }, 0);
}

function handleGlobalSearch(q) {
  if (!q.trim()) return;
  showToast(`Searching for "${q}"…`);
}

function openProfileModal() {
  closeUserMenu();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);';

  overlay.innerHTML = `
    <div class="modal-content card fade-in" style="width: 400px; padding: 24px; border-radius: 12px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);">
      <h3 style="margin: 0 0 16px 0;">Edit Profile</h3>
      <div class="form-group" style="margin-bottom: 12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Full Name <span style="color:#DC2626">*</span></label>
        <input type="text" id="prof-fullname" class="form-input" style="width:100%;" value="${state.user.name || ''}" />
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Employee ID</label>
        <input type="text" id="prof-empid" class="form-input" style="width:100%;" placeholder="e.g. EMP-101" />
      </div>
      <div class="form-group" style="margin-bottom: 12px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Role / Access Profile <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="prof-role" style="width:100%;">
          <option value="0">None</option>
          <option value="8">R&D Head</option>
          <option value="7">Project Head</option>
          <option value="6">Designer</option>
          <option value="4">COE Head</option>
          <option value="3">Project Manager</option>
          <option value="2">Quality Auditor</option>
          <option value="1">Super Admin</option>
          <option value="9">Sourcing</option>
          <option value="10">Proto</option>
          <option value="11">Founder</option>
          <option value="12">Co-Founder</option>
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 24px;">
        <label style="display:block;margin-bottom:4px;font-size:13px;font-weight:600;">Department <span style="color:#DC2626">*</span></label>
        <select class="form-select" id="prof-dept" style="width:100%;">
          <option value="0">None</option>
          <option value="1">R&D / Engineering</option>
          <option value="2">Quality</option>
          <option value="4">Manufacturing</option>
          <option value="3">SEM</option>
          <option value="5">IT / Systems</option>
        </select>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button class="btn btn-outline" id="prof-cancel">Cancel</button>
        <button class="btn btn-primary" id="prof-save">Save Profile</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('prof-cancel').addEventListener('click', () => overlay.remove());

  document.getElementById('prof-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const fullName = document.getElementById('prof-fullname').value.trim();
    const empId = document.getElementById('prof-empid').value.trim() || null;
    const dept = parseInt(document.getElementById('prof-dept').value, 10);
    const role = parseInt(document.getElementById('prof-role').value, 10);

    if (!fullName || isNaN(dept)) {
      showToast('Full name and valid department ID are required.', 'warning');
      return;
    }

    const payload = {
      fullName,
      employeeId: empId,
      department: dept,
      role: role
    };

    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
      const res = await authFetch('/api/Members/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Profile updated successfully!', 'success');
        state.user.name = fullName;
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(state.user));

        // Update avatars safely
        const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.querySelectorAll('.user-avatar-sm, .user-avatar').forEach(el => {
          el.textContent = initials;
        });
        document.querySelectorAll('.user-name').forEach(el => {
          el.textContent = fullName;
        });

        overlay.remove();
      } else {
        showToast('Failed to update profile. Status ' + res.status, 'error');
        btn.disabled = false;
        btn.textContent = 'Save Profile';
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while updating profile.', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Profile';
    }
  });
}

function handleKeyboard(e) {
  const isInApp = document.getElementById('app-shell') && !document.getElementById('app-shell').classList.contains('hidden');
  if (!isInApp) return;
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); document.getElementById('global-search')?.focus(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); navigateTo('bom'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'e') { e.preventDefault(); navigateTo('change-mgmt'); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const palette = document.getElementById('cmd-palette');
    if (palette) {
      palette.classList.add('active');
      setTimeout(() => document.getElementById('cmd-palette-input')?.focus(), 50);
    }
  }
  if (e.key === 'Escape') {
    document.querySelector('.modal-overlay')?.remove();
    closeUserMenu();
    const palette = document.getElementById('cmd-palette');
    if (palette) palette.classList.remove('active');
  }
}

function initCommandPalette() {
  const palette = document.getElementById('cmd-palette');
  const input = document.getElementById('cmd-palette-input');
  const resultsContainer = document.getElementById('cmd-palette-results');
  if (!palette || !input || !resultsContainer) return;

  const demoResults = [
    { icon: 'dashboard', label: 'Go to Dashboard', action: () => navigateTo('dashboard') },
    { icon: 'account_tree', label: 'Go to BOM Explorer', action: () => navigateTo('bom') },
    { icon: 'published_with_changes', label: 'Go to Change Management', action: () => navigateTo('change-mgmt') },
    { icon: 'inventory_2', label: 'Go to Parts', action: () => navigateTo('parts') },
    { icon: 'add_circle', label: 'Create New ECR', action: () => { navigateTo('change-mgmt'); showToast('Drafting new ECR...', 'info'); } },
  ];

  function renderResults(query) {
    resultsContainer.innerHTML = '';
    const q = query.toLowerCase();
    const filtered = demoResults.filter(r => r.label.toLowerCase().includes(q));

    if (filtered.length === 0) {
      resultsContainer.innerHTML = '<div style="padding:16px;color:var(--text-tertiary);text-align:center;">No results found</div>';
      return;
    }

    filtered.forEach((r, idx) => {
      const item = document.createElement('div');
      item.className = 'cmd-result-item' + (idx === 0 ? ' selected' : '');
      item.innerHTML = `<span class="material-icons-outlined">${r.icon}</span>${r.label}`;
      item.addEventListener('click', () => {
        palette.classList.remove('active');
        input.value = '';
        r.action();
      });
      resultsContainer.appendChild(item);
    });
  }

  input.addEventListener('input', (e) => renderResults(e.target.value));

  palette.addEventListener('click', (e) => {
    if (e.target === palette) {
      palette.classList.remove('active');
    }
  });

  renderResults('');
}

// ─── Global Toast ───
export function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  const colors = { success: '#059669', error: '#DC2626', warning: '#D97706', info: '#2563EB' };
  const icons = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  toast.style.cssText = `position:fixed;bottom:24px;right:24px;background:#1F2937;color:white;padding:12px 20px;border-radius:10px;display:flex;align-items:center;gap:10px;font-size:0.857rem;font-weight:500;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.2);animation:slideInRight 0.3s ease;max-width:380px;`;
  toast.innerHTML = `<span class="material-icons-outlined" style="font-size:18px;color:${colors[type]}">${icons[type]}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── Global Modal ───
export function showModal(title, bodyHTML, footerHTML = '') {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="modal-close" id="modal-close-btn"><span class="material-icons-outlined">close</span></button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#modal-close-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  return overlay;
}

if (!document.getElementById('toast-style')) {
  const s = document.createElement('style');
  s.id = 'toast-style';
  s.textContent = '@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}@keyframes fadeOut{from{opacity:1}to{opacity:0}}';
  document.head.appendChild(s);
}

// Add Toggle Password Logic
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.toggle-password');
  if (btn) {
    const inputId = btn.getAttribute('for');
    const input = document.getElementById(inputId);
    if (input) {
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'visibility_off';
      } else {
        input.type = 'password';
        btn.textContent = 'visibility';
      }
    }
  }
});

document.addEventListener('DOMContentLoaded', init);

