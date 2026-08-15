// app.js - Kontrolluesi kryesor i aplikacionit (Modeli i Rrafshët: Automjeti përfshin pronarin)

import { db, getSupabaseClient } from './db.js';

// Gjendja e aplikacionit (App State)
const state = {
  currentView: 'dashboard',
  selectedVehicleId: null,
  partsCount: 0,
  editingVehicleId: null,
  editingServiceId: null,
  deletingId: null,
  deletingType: null
};

const SETTINGS_KEYS = {
  // v2 intentionally ignores the old preview/test theme key so the app starts in Light Mode.
  theme: 'libri-settings-theme-v2',
  currency: 'libri-settings-currency'
};

const appSettings = {
  // The public Landing/Login experience is always Light Mode until a user logs in.
  theme: 'light',
  currency: localStorage.getItem(SETTINGS_KEYS.currency) || 'lek'
};

let currentUser = null;
let authMode = 'login';
let authReady = false;
let resetRecoveryReady = false;
let forgotPasswordCooldownTimer = null;
const FORGOT_PASSWORD_COOLDOWN_KEY = 'libri-forgot-password-cooldown-until';
const FORGOT_PASSWORD_COOLDOWN_SECONDS = 60;

function isResetPasswordRoute() {
  return window.location.pathname === '/reset-password' || new URLSearchParams(window.location.search).get('reset-password') === '1';
}

function hasRecoveryToken() {
  const params = new URLSearchParams(window.location.search);
  return window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=') || params.has('code');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}

function initApp() {
  applySettings();
  setupAuthHandlers();
  setupLandingHandlers();
  setupNavigation();
  setupFormHandlers();
  setupSearch();
  setupPartsEditor();
  setupSettings();
  calculateServiceTotal();

  document.getElementById('btn-add-vehicle').addEventListener('click', () => openAddVehicleModal());
  document.getElementById('btn-add-service').addEventListener('click', () => openAddServiceModal());
  document.getElementById('btn-dashboard-add-vehicle').addEventListener('click', () => openAddVehicleModal());
  document.getElementById('btn-dashboard-add-service').addEventListener('click', () => openAddServiceModal());
  document.getElementById('btn-profile-add-service').addEventListener('click', () => {
    openAddServiceModal(state.selectedVehicleId);
  });
  document.getElementById('btn-profile-edit-vehicle').addEventListener('click', () => {
    if (state.selectedVehicleId) startEditVehicle(state.selectedVehicleId);
  });
  document.getElementById('btn-profile-delete-vehicle').addEventListener('click', () => {
    if (state.selectedVehicleId) startDeleteVehicle(state.selectedVehicleId);
  });
  document.getElementById('btn-profile-download-pdf').addEventListener('click', () => {
    if (state.selectedVehicleId) downloadVehicleHistoryPdf(state.selectedVehicleId);
  });

  setupAuth();

  window.lucide && window.lucide.createIcons();

  window.openModal = openModal;
  window.closeModal = closeModal;
}

// ==========================================
// AUTHENTICATION
// ==========================================
function setAuthFeedback(message = '', isSuccess = false, actionLabel = '', actionHandler = null) {
  const feedback = document.getElementById('auth-feedback');
  if (!feedback) return;
  feedback.textContent = '';
  feedback.className = `auth-feedback${isSuccess ? ' auth-feedback-success' : ''}`;
  if (message) feedback.appendChild(document.createTextNode(message));
  if (actionLabel && actionHandler) {
    const action = document.createElement('button');
    action.type = 'button';
    action.className = 'auth-feedback-action';
    action.textContent = actionLabel;
    action.addEventListener('click', actionHandler, { once: true });
    feedback.appendChild(action);
  }
}

function setAuthSubmitState(isLoading, cooldownSeconds = 0) {
  const submit = document.getElementById('auth-submit');
  const label = submit?.querySelector('.auth-submit-label');
  const spinner = submit?.querySelector('.auth-submit-spinner');
  if (!submit) return;
  submit.disabled = isLoading || cooldownSeconds > 0;
  submit.classList.toggle('is-loading', isLoading);
  if (spinner) spinner.hidden = !isLoading;
  if (label) label.textContent = isLoading ? (authMode === 'signup' ? 'Po kontrolloj...' : 'Po hyj...') : (authMode === 'signup' ? 'Regjistrohu' : 'Hyr');
  if (cooldownSeconds > 0) {
    let remaining = cooldownSeconds;
    if (label) label.textContent = `Provo përsëri pas ${remaining}s`;
    const timer = window.setInterval(() => {
      remaining -= 1;
      if (!submit.isConnected || remaining <= 0) {
        window.clearInterval(timer);
        setAuthSubmitState(false);
        return;
      }
      if (label) label.textContent = `Provo përsëri pas ${remaining}s`;
    }, 1000);
  }
}

function showLoginWithEmail(email = '') {
  const emailField = document.getElementById('auth-email');
  if (emailField) emailField.value = email;
  setAuthMode('login');
  const passwordField = document.getElementById('auth-password');
  if (passwordField) passwordField.focus();
  const existingAction = document.getElementById('auth-existing-login');
  if (existingAction) existingAction.hidden = true;
}

function setAuthMode(mode) {
  authMode = mode === 'signup' ? 'signup' : 'login';
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const submit = document.getElementById('auth-submit');
  const switchButton = document.getElementById('auth-mode-switch');
  const password = document.getElementById('auth-password');
  if (title) title.textContent = authMode === 'signup' ? 'Krijo llogari' : 'Hyr në llogari';
  if (subtitle) subtitle.textContent = authMode === 'signup' ? 'Regjistro servisin tënd dhe mbaji të dhënat private.' : 'Hyr në panelin e servisit për të menaxhuar automjetet dhe shërbimet.';
  const submitLabel = submit?.querySelector('.auth-submit-label');
  if (submitLabel) submitLabel.textContent = authMode === 'signup' ? 'Regjistrohu' : 'Hyr';
  if (submit) submit.classList.remove('is-loading');
  const forgotPassword = document.getElementById('auth-forgot-password');
  if (forgotPassword) forgotPassword.hidden = authMode === 'signup';
  if (switchButton) switchButton.textContent = authMode === 'signup' ? 'Ke llogari? Hyr këtu' : 'Nuk ke llogari? Regjistrohu';
  const existingAction = document.getElementById('auth-existing-login');
  if (existingAction) existingAction.hidden = true;
  if (password) password.autocomplete = authMode === 'signup' ? 'new-password' : 'current-password';
  setAuthFeedback('');
}

function togglePasswordVisibility(password, toggle) {
  if (!password || !toggle) return;
  const isVisible = password.type === 'text';
  password.type = isVisible ? 'password' : 'text';
  toggle.setAttribute('aria-pressed', String(!isVisible));
  toggle.setAttribute('aria-label', isVisible ? 'Shfaq fjalëkalimin' : 'Fshih fjalëkalimin');
  toggle.innerHTML = `<i data-lucide="${isVisible ? 'eye' : 'eye-off'}" aria-hidden="true"></i>`;
  window.lucide && window.lucide.createIcons();
}

function setupPasswordToggle() {
  const password = document.getElementById('auth-password');
  const toggle = document.getElementById('auth-password-toggle');
  if (password && toggle) toggle.addEventListener('click', () => togglePasswordVisibility(password, toggle));
}

function setupAuthHandlers() {
  const form = document.getElementById('auth-form');
  const switchButton = document.getElementById('auth-mode-switch');
  const googleButton = document.getElementById('auth-google');
  const forgotPasswordButton = document.getElementById('auth-forgot-password');
  const forgotPasswordForm = document.getElementById('forgot-password-form');
  const forgotPasswordBack = document.getElementById('forgot-password-back');
  const resetPasswordForm = document.getElementById('reset-password-form');
  const existingLoginButton = document.getElementById('auth-existing-login');
  const logoutButton = document.getElementById('btn-logout');
  const settingsLogoutButton = document.getElementById('settings-logout');
  if (switchButton) switchButton.addEventListener('click', () => setAuthMode(authMode === 'login' ? 'signup' : 'login'));
  if (form) form.addEventListener('submit', handleEmailAuth);
  if (googleButton) googleButton.addEventListener('click', handleGoogleLogin);
  if (forgotPasswordButton) forgotPasswordButton.addEventListener('click', () => showForgotPasswordPage(document.getElementById('auth-email')?.value.trim() || ''));
  if (forgotPasswordForm) forgotPasswordForm.addEventListener('submit', handleForgotPasswordRequest);
  if (forgotPasswordBack) forgotPasswordBack.addEventListener('click', () => showAuthPage('', 'login'));
  if (resetPasswordForm) resetPasswordForm.addEventListener('submit', handleResetPasswordSubmit);
  if (existingLoginButton) existingLoginButton.addEventListener('click', () => showLoginWithEmail(document.getElementById('auth-email')?.value.trim() || ''));
  document.querySelectorAll('.recovery-password-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => togglePasswordVisibility(document.getElementById(toggle.dataset.passwordTarget), toggle));
  });
  if (logoutButton) logoutButton.addEventListener('click', handleLogout);
  if (settingsLogoutButton) settingsLogoutButton.addEventListener('click', handleLogout);
  setupPasswordToggle();
}

async function setupAuth() {
  const client = getSupabaseClient();
  if (!client) {
    authReady = true;
    showAuthPage('Supabase nuk është konfiguruar. Kontrollo env-config.js.');
    return;
  }
  client.auth.onAuthStateChange((event, session) => {
    if (isResetPasswordRoute() && event === 'PASSWORD_RECOVERY') resetRecoveryReady = true;
    setTimeout(() => handleAuthSession(session, event), 0);
  });
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error('Gabim gjatë leximit të sesionit:', error);
    showAuthPage('Sesioni nuk mund të verifikohej. Provo përsëri.');
    return;
  }
  if (isResetPasswordRoute() && data.session && hasRecoveryToken()) resetRecoveryReady = true;
  await handleAuthSession(data.session, 'INITIAL_SESSION');
}

async function handleAuthSession(session, event = '') {
  currentUser = session?.user || null;
  db.setUser(currentUser);
  if (isResetPasswordRoute()) {
    // Recovery is a public/light page, even though Supabase temporarily provides a session.
    appSettings.theme = 'light';
    applySettings();
    authReady = true;
    if (currentUser && (resetRecoveryReady || event === 'PASSWORD_RECOVERY' || hasRecoveryToken())) {
      resetRecoveryReady = true;
      showResetPasswordPage();
    } else {
      showResetPasswordPage('Kjo lidhje për rivendosjen e fjalëkalimit është e pavlefshme ose ka skaduar. Kërko një link të ri nga Login-i.');
    }
    return;
  }
  loadUserTheme();
  // Apply the saved theme only after the authenticated user is known.
  applySettings();
  authReady = true;
  const authPage = document.getElementById('auth-page');
  const appShell = document.getElementById('app-shell');
  const userEmail = document.getElementById('sidebar-user-email');
  const landingPage = document.getElementById('landing-page');
  if (currentUser) {
    if (landingPage) landingPage.style.display = 'none';
    if (authPage) authPage.style.display = 'none';
    if (appShell) appShell.style.display = 'block';
    if (userEmail) userEmail.textContent = currentUser.email || 'Përdorues i loguar';
    await navigateTo('dashboard');
    window.lucide && window.lucide.createIcons();
  } else {
    if (appShell) appShell.style.display = 'none';
    showLandingPage();
  }
}

function setupLandingHandlers() {
  const landingStart = document.getElementById('landing-start');
  const landingLogin = document.getElementById('landing-login');
  if (landingStart) landingStart.addEventListener('click', () => showAuthPage('', 'login'));
  if (landingLogin) landingLogin.addEventListener('click', () => showAuthPage('', 'login'));
}

function showLandingPage() {
  // Public Landing/Login pages are always Light Mode.
  appSettings.theme = 'light';
  applySettings();
  const landingPage = document.getElementById('landing-page');
  const authPage = document.getElementById('auth-page');
  const appShell = document.getElementById('app-shell');
  if (landingPage) landingPage.style.display = 'block';
  if (authPage) authPage.style.display = 'none';
  if (appShell) appShell.style.display = 'none';
  window.lucide && window.lucide.createIcons();
}

function hideRecoveryPages() {
  const forgotPage = document.getElementById('forgot-password-page');
  const resetPage = document.getElementById('reset-password-page');
  if (forgotPage) forgotPage.style.display = 'none';
  if (resetPage) resetPage.style.display = 'none';
}

function showAuthPage(message = '', mode = 'login') {
  const landingPage = document.getElementById('landing-page');
  const authPage = document.getElementById('auth-page');
  const appShell = document.getElementById('app-shell');
  hideRecoveryPages();
  if (landingPage) landingPage.style.display = 'none';
  if (authPage) authPage.style.display = 'grid';
  if (appShell) appShell.style.display = 'none';
  setAuthMode(mode);
  if (message) setAuthFeedback(message);
  window.lucide && window.lucide.createIcons();
}

function setRecoveryFeedback(elementId, message = '', isSuccess = false) {
  const feedback = document.getElementById(elementId);
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `auth-feedback${isSuccess ? ' auth-feedback-success' : ''}`;
}

function showForgotPasswordPage(email = '') {
  const landingPage = document.getElementById('landing-page');
  const authPage = document.getElementById('auth-page');
  const forgotPage = document.getElementById('forgot-password-page');
  const resetPage = document.getElementById('reset-password-page');
  const appShell = document.getElementById('app-shell');
  if (landingPage) landingPage.style.display = 'none';
  if (authPage) authPage.style.display = 'none';
  if (resetPage) resetPage.style.display = 'none';
  if (forgotPage) forgotPage.style.display = 'grid';
  if (appShell) appShell.style.display = 'none';
  const emailField = document.getElementById('forgot-password-email');
  if (emailField) emailField.value = email;
  setRecoveryFeedback('forgot-password-feedback');
  restoreForgotPasswordCooldown();
  window.lucide && window.lucide.createIcons();
  emailField?.focus();
}

function showResetPasswordPage(message = '') {
  const landingPage = document.getElementById('landing-page');
  const authPage = document.getElementById('auth-page');
  const forgotPage = document.getElementById('forgot-password-page');
  const resetPage = document.getElementById('reset-password-page');
  const appShell = document.getElementById('app-shell');
  if (landingPage) landingPage.style.display = 'none';
  if (authPage) authPage.style.display = 'none';
  if (forgotPage) forgotPage.style.display = 'none';
  if (resetPage) resetPage.style.display = 'grid';
  if (appShell) appShell.style.display = 'none';
  const form = document.getElementById('reset-password-form');
  if (form) form.hidden = !resetRecoveryReady;
  setRecoveryFeedback('reset-password-feedback', message);
  window.lucide && window.lucide.createIcons();
}

function getForgotPasswordCooldownRemaining() {
  const until = Number(localStorage.getItem(FORGOT_PASSWORD_COOLDOWN_KEY) || 0);
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function restoreForgotPasswordCooldown() {
  const submit = document.getElementById('forgot-password-submit');
  const remaining = getForgotPasswordCooldownRemaining();
  if (!submit || !remaining) {
    if (remaining === 0) localStorage.removeItem(FORGOT_PASSWORD_COOLDOWN_KEY);
    return;
  }
  startForgotPasswordCooldown(remaining);
}

function startForgotPasswordCooldown(seconds = FORGOT_PASSWORD_COOLDOWN_SECONDS) {
  const submit = document.getElementById('forgot-password-submit');
  if (!submit) return;
  const until = Date.now() + seconds * 1000;
  localStorage.setItem(FORGOT_PASSWORD_COOLDOWN_KEY, String(until));
  if (forgotPasswordCooldownTimer) window.clearInterval(forgotPasswordCooldownTimer);
  const tick = () => {
    const remaining = getForgotPasswordCooldownRemaining();
    if (remaining <= 0) {
      window.clearInterval(forgotPasswordCooldownTimer);
      forgotPasswordCooldownTimer = null;
      localStorage.removeItem(FORGOT_PASSWORD_COOLDOWN_KEY);
      setRecoverySubmitState(submit, false, 'Dërgo Linkun');
      return;
    }
    submit.disabled = true;
    submit.classList.remove('is-loading');
    const label = submit.querySelector('.auth-submit-label');
    const spinner = submit.querySelector('.auth-submit-spinner');
    if (label) label.textContent = `Dërgo përsëri (${remaining}s)`;
    if (spinner) spinner.hidden = true;
  };
  tick();
  forgotPasswordCooldownTimer = window.setInterval(tick, 1000);
}

function isRateLimitAuthError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('rate limit') || message.includes('too many') || message.includes('security') || message.includes('60 seconds');
}

function authRateLimitMessage(seconds = 60) {
  return `Kemi marrë shumë tentativa. Për arsye sigurie, ju lutem prisni ${seconds} sekonda dhe provojeni përsëri.`;
}

function isEmailNotRegisteredError(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return code === 'user_not_found' || code === 'user_not_exists' || message.includes('user not found') || message.includes('user does not exist') || message.includes('user not exists') || message.includes('email not found') || message.includes('email does not exist') || message.includes('no user found') || message.includes('not registered');
}

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

const UNREGISTERED_EMAIL_MESSAGE = 'Ky email nuk është i regjistruar në platformë. Ju lutem kontrolloni email-in ose regjistrohuni.';

async function handleForgotPasswordRequest(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  const email = document.getElementById('forgot-password-email')?.value.trim();
  const submit = document.getElementById('forgot-password-submit');
  const currentCooldown = getForgotPasswordCooldownRemaining();
  if (currentCooldown > 0) {
    setRecoveryFeedback('forgot-password-feedback', `Për arsye sigurie, mund të kërkoni një link të ri çdo 60 sekonda. Ju lutem prisni edhe ${currentCooldown} sekonda.`);
    startForgotPasswordCooldown(currentCooldown);
    return;
  }
  if (!client) return setRecoveryFeedback('forgot-password-feedback', 'Supabase nuk është konfiguruar.');
  if (!email) return setRecoveryFeedback('forgot-password-feedback', 'Shkruaj email-in për të marrë linkun.');
  if (!isValidEmailFormat(email)) return setRecoveryFeedback('forgot-password-feedback', 'Ju lutem vendosni një adresë email-i të vlefshme.');
  if (submit) setRecoverySubmitState(submit, true, 'Po kontrollohet...');
  setRecoveryFeedback('forgot-password-feedback');
  try {
    // Supabase may return no error for unknown emails. Verify against auth.users first
    // so the UI never reports a false "link sent" success.
    const { data: emailExists, error: verifyError } = await client.rpc('email_exists_for_password_reset', { email_to_check: email });
    if (verifyError) {
      console.error('Email verification RPC failed:', verifyError);
      if (submit) setRecoverySubmitState(submit, false, 'Dërgo Linkun');
      setRecoveryFeedback('forgot-password-feedback', 'Verifikimi i email-it nuk është konfiguruar ende. Ekzekuto migration-in e Forgot Password në Supabase.');
      return;
    }
    if (!emailExists) {
      if (submit) setRecoverySubmitState(submit, false, 'Dërgo Linkun');
      setRecoveryFeedback('forgot-password-feedback', UNREGISTERED_EMAIL_MESSAGE);
      return;
    }

    startForgotPasswordCooldown();
    if (submit) setRecoverySubmitState(submit, true, 'Po dërgohet...');
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) {
      const remaining = getForgotPasswordCooldownRemaining();
      setRecoverySubmitState(submit, false, 'Dërgo Linkun');
      setRecoveryFeedback('forgot-password-feedback', isRateLimitAuthError(error)
        ? `Për arsye sigurie, mund të kërkoni një link të ri çdo 60 sekonda. Ju lutem prisni edhe ${remaining} sekonda.`
        : isEmailNotRegisteredError(error)
          ? UNREGISTERED_EMAIL_MESSAGE
          : friendlyAuthError(error));
      return;
    }
    setRecoveryFeedback('forgot-password-feedback', 'Linku për rivendosjen e fjalëkalimit u dërgua në email-in tuaj.', true);
  } catch (error) {
    const remaining = getForgotPasswordCooldownRemaining();
    setRecoverySubmitState(submit, false, 'Dërgo Linkun');
    setRecoveryFeedback('forgot-password-feedback', isRateLimitAuthError(error)
      ? `Për arsye sigurie, mund të kërkoni një link të ri çdo 60 sekonda. Ju lutem prisni edhe ${remaining} sekonda.`
      : isEmailNotRegisteredError(error)
        ? UNREGISTERED_EMAIL_MESSAGE
        : friendlyAuthError(error));
  } finally {
    if (submit) {
      submit.classList.remove('is-loading');
      const spinner = submit.querySelector('.auth-submit-spinner');
      if (spinner) spinner.hidden = true;
    }
  }
}

function setRecoverySubmitState(button, isLoading, loadingText = '') {
  button.disabled = isLoading;
  button.classList.toggle('is-loading', isLoading);
  const label = button.querySelector('.auth-submit-label');
  const spinner = button.querySelector('.auth-submit-spinner');
  if (label) label.textContent = isLoading ? loadingText : (button.id === 'reset-password-submit' ? 'Ruaj fjalëkalimin' : 'Dërgo Linkun');
  if (spinner) spinner.hidden = !isLoading;
}

async function handleResetPasswordSubmit(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  const newPassword = document.getElementById('reset-password-new')?.value || '';
  const confirmPassword = document.getElementById('reset-password-confirm')?.value || '';
  const submit = document.getElementById('reset-password-submit');
  if (!resetRecoveryReady || !currentUser) return setRecoveryFeedback('reset-password-feedback', 'Kjo lidhje për rivendosjen e fjalëkalimit është e pavlefshme ose ka skaduar.');
  if (newPassword.length < 6) return setRecoveryFeedback('reset-password-feedback', 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.');
  if (newPassword !== confirmPassword) return setRecoveryFeedback('reset-password-feedback', 'Fjalëkalimet nuk përputhen.');
  if (submit) setRecoverySubmitState(submit, true, 'Po ruhet...');
  setRecoveryFeedback('reset-password-feedback');
  try {
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) {
      setRecoverySubmitState(submit, false);
      setRecoveryFeedback('reset-password-feedback', friendlyAuthError(error));
      return;
    }
    setRecoveryFeedback('reset-password-feedback', 'Fjalëkalimi u ndryshua me sukses. Po të ridrejtojmë te Login-i...', true);
    if (submit) submit.disabled = true;
    window.setTimeout(async () => {
      resetRecoveryReady = false;
      await client.auth.signOut();
      window.history.replaceState({}, document.title, '/');
      showAuthPage('', 'login');
    }, 3000);
  } catch (error) {
    setRecoverySubmitState(submit, false);
    setRecoveryFeedback('reset-password-feedback', friendlyAuthError(error));
  }
}

async function handleEmailAuth(event) {
  event.preventDefault();
  const client = getSupabaseClient();
  if (!client) return setAuthFeedback('Supabase nuk është konfiguruar.');
  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value;
  if (!email || !password) return setAuthFeedback('Plotëso email-in dhe fjalëkalimin.');
  setAuthFeedback('');
  setAuthSubmitState(true);
  try {
    if (authMode === 'signup') {
      const signupResult = await client.auth.signUp({ email, password });
      const existingEmail = isExistingEmailError(signupResult.error) || isExistingEmailSignupResponse(signupResult.data);

      // Registration doubles as Login for an existing email.
      if (existingEmail) {
        const loginResult = await client.auth.signInWithPassword({ email, password });
        if (!loginResult.error && loginResult.data?.session) {
          setAuthSubmitState(false);
          await handleAuthSession(loginResult.data.session);
          return;
        }
        if (isRateLimitAuthError(loginResult.error)) {
          setAuthSubmitState(false, 60);
          setAuthFeedback(authRateLimitMessage(60));
          return;
        }
        setAuthSubmitState(false, 5);
        setAuthFeedback('Ky email është i regjistruar, por fjalëkalimi është i gabuar.');
        return;
      }

      if (signupResult.error) {
        if (isRateLimitAuthError(signupResult.error)) {
          setAuthSubmitState(false, 60);
          setAuthFeedback(authRateLimitMessage(60));
          return;
        }
        setAuthSubmitState(false, 5);
        setAuthFeedback(friendlyAuthError(signupResult.error));
        return;
      }

      // With Email Confirmation disabled, Supabase returns a session. Redirect immediately.
      if (signupResult.data?.session) {
        setAuthSubmitState(false);
        await handleAuthSession(signupResult.data.session);
        return;
      }

      // Defensive fallback for Supabase configurations that create the user but omit the session.
      const loginResult = await client.auth.signInWithPassword({ email, password });
      if (!loginResult.error && loginResult.data?.session) {
        setAuthSubmitState(false);
        await handleAuthSession(loginResult.data.session);
        return;
      }
      setAuthSubmitState(false, 5);
      setAuthFeedback('Regjistrimi u krye, por hyrja automatike dështoi. Provo përsëri.');
      return;
    }

    const loginResult = await client.auth.signInWithPassword({ email, password });
    if (loginResult.error) {
      setAuthSubmitState(false, isRateLimitAuthError(loginResult.error) ? 60 : 3);
      setAuthFeedback(isRateLimitAuthError(loginResult.error) ? authRateLimitMessage(60) : friendlyAuthError(loginResult.error));
      return;
    }
    setAuthSubmitState(false);
    if (loginResult.data?.session) await handleAuthSession(loginResult.data.session);
  } catch (error) {
    const isRateLimited = isRateLimitAuthError(error);
    setAuthSubmitState(false, isRateLimited ? 60 : (authMode === 'signup' ? 5 : 3));
    setAuthFeedback(isRateLimited ? authRateLimitMessage(60) : friendlyAuthError(error));
  }
}

function isExistingEmailSignupResponse(data) {
  const identities = data?.user?.identities;
  return Boolean(data?.user && Array.isArray(identities) && identities.length === 0);
}

function isExistingEmailError(error) {
  if (!error) return false;
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();
  return code === 'user_already_exists' || message.includes('already registered') || message.includes('already been registered') || message.includes('user already exists') || message.includes('email address is already registered');
}

function friendlyAuthError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('invalid login credentials') || message.includes('invalid email or password')) return 'Email-i ose fjalëkalimi nuk është i saktë.';
  if (message.includes('password') && (message.includes('6') || message.includes('short'))) return 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.';
  if (message.includes('rate limit') || message.includes('too many') || message.includes('security')) return 'Kemi marrë shumë tentativa. Ju lutem prisni 1 minutë për siguri dhe provojeni përsëri.';
  if (message.includes('email')) return 'Kontrollo formatin e email-it dhe provo përsëri.';
  return error?.message || 'Ndodhi një gabim gjatë autentikimit. Provo përsëri.';
}

async function handleGoogleLogin() {
  const client = getSupabaseClient();
  if (!client) return setAuthFeedback('Supabase nuk është konfiguruar.');
  setAuthFeedback('Po kontrolloj konfigurimin e Google...', true);
  try {
    const settingsResponse = await fetch(`${window.env.SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: window.env.SUPABASE_ANON_KEY } });
    const settings = await settingsResponse.json();
    if (settings?.external?.google === false) {
      return setAuthFeedback('Google Login nuk është aktivizuar ende. Aktivizoje te Supabase > Authentication > Providers > Google.');
    }
  } catch (error) {
    console.warn('Nuk u verifikua konfigurimi i Google:', error);
  }
  setAuthFeedback('Po hapim Google Login...', true);
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname, skipBrowserRedirect: true }
  });
  if (error) return setAuthFeedback(friendlyAuthError(error));
  if (data?.url) window.location.assign(data.url);
}

async function handleLogout() {
  const client = getSupabaseClient();
  try {
    if (client) {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    }
  } catch (error) {
    console.error('Gabim gjatë daljes nga llogaria:', error);
  } finally {
    currentUser = null;
    db.setUser(null);
    // Keep the user's per-account preference, but show public pages in Light Mode.
    appSettings.theme = 'light';
    applySettings();
    showLandingPage();
  }
}

// ==========================================
// UTILITIES
// ==========================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDateSimple(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toISOString().split('T')[0];
}

function formatDateAlbanian(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const months = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNumber(num) {
  const n = Number(num) || 0;
  return n.toLocaleString('sq-AL');
}

function getCurrencyLabel() {
  return appSettings.currency === 'euro' ? '€' : 'Lekë';
}

function formatCurrency(num) {
  return `${formatNumber(num)} ${getCurrencyLabel()}`;
}

function getUserThemeKey(userId = currentUser?.id) {
  return userId ? `${SETTINGS_KEYS.theme}:${userId}` : null;
}

function loadUserTheme() {
  const key = getUserThemeKey();
  appSettings.theme = key && localStorage.getItem(key) === 'dark' ? 'dark' : 'light';
}

function applySettings() {
  // Dark Mode is allowed only inside an authenticated user's Dashboard.
  const shouldUseDarkMode = Boolean(currentUser) && appSettings.theme === 'dark';
  document.body.classList.toggle('dark-mode', shouldUseDarkMode);
  const themeSelect = document.getElementById('setting-theme');
  const currencySelect = document.getElementById('setting-currency');
  if (themeSelect) themeSelect.value = shouldUseDarkMode ? 'dark' : 'light';
  if (currencySelect) currencySelect.value = appSettings.currency;
  document.documentElement.dataset.currency = appSettings.currency;
}

function setupSettings() {
  const themeSelect = document.getElementById('setting-theme');
  const currencySelect = document.getElementById('setting-currency');
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      if (!currentUser) {
        appSettings.theme = 'light';
        applySettings();
        return;
      }
      appSettings.theme = themeSelect.value === 'dark' ? 'dark' : 'light';
      const key = getUserThemeKey();
      if (key) localStorage.setItem(key, appSettings.theme);
      applySettings();
      showSettingsSaved();
    });
  }
  if (currencySelect) {
    currencySelect.addEventListener('change', async () => {
      appSettings.currency = currencySelect.value === 'euro' ? 'euro' : 'lek';
      localStorage.setItem(SETTINGS_KEYS.currency, appSettings.currency);
      applySettings();
      showSettingsSaved();
      await refreshCurrencyDisplays();
    });
  }
}

function showSettingsSaved() {
  const status = document.getElementById('settings-save-status');
  if (!status) return;
  status.textContent = 'Zgjedhja u ruajt automatikisht.';
  setTimeout(() => {
    if (status) status.textContent = 'Zgjedhjet ruhen automatikisht.';
  }, 1800);
}

async function refreshCurrencyDisplays() {
  if (state.currentView === 'vehicle-profile' && state.selectedVehicleId) {
    await renderVehicleProfile(state.selectedVehicleId);
  }
  if (state.currentView === 'services') await renderServices();
  calculateServiceTotal();
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = 'success') {
  const cssType = type; // one of: success | warning | error
  const icons = { success: 'check-circle', warning: 'alert-triangle', error: 'x-circle' };

  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${cssType}`;
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;">
      <i data-lucide="${icons[cssType] || 'info'}" style="width:18px;height:18px;"></i>
      <span>${escapeHtml(message)}</span>
    </div>
    <button style="background:none;border:none;color:inherit;font-size:1.1rem;cursor:pointer;font-weight:bold;margin-left:1rem;" onclick="this.closest('.toast').remove()">&times;</button>
  `;
  container.appendChild(toast);
  window.lucide && window.lucide.createIcons();

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================
// NAVIGATION
// ==========================================
function setupNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    const activate = (e) => {
      e.preventDefault();
      navigateTo(item.dataset.view);
    };
    item.addEventListener('click', activate);
    const link = item.querySelector('a');
    if (link) link.addEventListener('click', activate);
  });
}

async function navigateTo(viewName, params = {}) {
  state.currentView = viewName;

  document.querySelectorAll('.view-section').forEach(sec => sec.style.display = 'none');
  document.querySelectorAll('.nav-item[data-view]').forEach(item => item.classList.remove('active'));

  const titleEl = document.getElementById('view-title');
  const subtitleEl = document.getElementById('view-subtitle-text');

  if (viewName === 'dashboard') {
    document.getElementById('view-dashboard-section').style.display = 'block';
    document.querySelector('.nav-item[data-view="dashboard"]').classList.add('active');
    titleEl.textContent = 'Paneli';
    subtitleEl.textContent = 'Statistikat e përgjithshme të servisit';
    await updateDashboardStats();

  } else if (viewName === 'vehicles') {
    document.getElementById('view-vehicles-section').style.display = 'block';
    document.querySelector('.nav-item[data-view="vehicles"]').classList.add('active');
    titleEl.textContent = 'Automjetet';
    subtitleEl.textContent = 'Lista e të gjitha automjeteve të regjistruara';
    await renderVehicles();

  } else if (viewName === 'vehicle-profile') {
    document.getElementById('view-vehicle-profile-section').style.display = 'block';
    titleEl.textContent = 'Profili i Automjetit';
    subtitleEl.textContent = 'Historiku i plotë i servisit';
    state.selectedVehicleId = params.vehicleId;
    await renderVehicleProfile(params.vehicleId);

  } else if (viewName === 'services') {
    document.getElementById('view-services-section').style.display = 'block';
    document.querySelector('.nav-item[data-view="services"]').classList.add('active');
    titleEl.textContent = 'Shërbimet';
    subtitleEl.textContent = 'Historiku i të gjitha shërbimeve të regjistruara';
    await renderServices();
  } else if (viewName === 'settings') {
    document.getElementById('view-settings-section').style.display = 'block';
    document.querySelector('.nav-item[data-view="settings"]').classList.add('active');
    titleEl.textContent = 'Cilësimet';
    subtitleEl.textContent = 'Personalizo temën dhe valutën e aplikacionit';
    applySettings();
  }

  window.lucide && window.lucide.createIcons();
}

// ==========================================
// DASHBOARD
// ==========================================
async function updateDashboardStats() {
  const stats = await db.getDashboardStats();
  document.getElementById('stats-vehicles').textContent = stats.vehicleCount;
  document.getElementById('stats-services').textContent = stats.serviceCount;
}

// ==========================================
// VEHICLES (Automjetet)
// ==========================================
async function renderVehicles() {
  const allVehicles = await db.getVehicles();
  const searchInput = document.getElementById('vehicles-search');
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const vehicles = allVehicles
    .filter(v => {
      if (!searchQuery) return true;
      const owner = (v.ownerName || '').toLowerCase();
      const brand = (v.vehicleBrand || '').toLowerCase();
      return owner.includes(searchQuery) || brand.includes(searchQuery);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const tbody = document.querySelector('#table-vehicles tbody');
  tbody.innerHTML = '';

  if (vehicles.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-icon"><i data-lucide="car" style="width:48px;height:48px;color:var(--text-light);margin:0 auto 1rem;"></i></div>
          <div class="empty-text" style="font-weight:600;margin-bottom:0.5rem;color:var(--text-main);">Nuk ka asnjë automjet të regjistruar.</div>
          <button class="btn btn-primary btn-sm" id="empty-add-vehicle-btn">+ Shto automjet</button>
        </td>
      </tr>
    `;
    const emptyBtn = document.getElementById('empty-add-vehicle-btn');
    if (emptyBtn) emptyBtn.addEventListener('click', () => openAddVehicleModal());
    window.lucide && window.lucide.createIcons();
    return;
  }

  vehicles.forEach(veh => {
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td style="font-weight:600;color:var(--primary);">${escapeHtml(veh.ownerName) || '—'}</td>
      <td>${escapeHtml([veh.vehicleBrand, veh.vehicleModel].filter(Boolean).join(' ')) || '—'}</td>
      <td><span class="result-plate">${escapeHtml(veh.vehiclePlate) || '—'}</span></td>
      <td>${escapeHtml(veh.ownerPhone) || '—'}</td>
      <td>${veh.mileage ? formatNumber(veh.mileage) + ' km' : '—'}</td>
      <td style="text-align:right;" class="row-actions"></td>
    `;
    tr.addEventListener('click', () => navigateTo('vehicle-profile', { vehicleId: veh.id }));

    const actionsCell = tr.querySelector('.row-actions');
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-xs';
    editBtn.innerHTML = '<i data-lucide="edit" style="width:12px;height:12px;"></i>';
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); startEditVehicle(veh.id); });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-xs';
    delBtn.style.marginLeft = '0.4rem';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width:12px;height:12px;"></i>';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); startDeleteVehicle(veh.id); });

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(delBtn);
    tbody.appendChild(tr);
  });

  window.lucide && window.lucide.createIcons();
}

async function renderVehicleProfile(vehicleId) {
  const veh = await db.getVehicleById(vehicleId);
  if (!veh) {
    showToast('Automjeti nuk u gjet.', 'error');
    navigateTo('vehicles');
    return;
  }

  document.getElementById('prof-brand-model').textContent = [veh.vehicleBrand, veh.vehicleModel].filter(Boolean).join(' ') || '—';
  document.getElementById('prof-plate').textContent = veh.vehiclePlate || '—';
  document.getElementById('prof-tag-year').textContent = veh.vehicleYear || '—';
  document.getElementById('prof-tag-engine').textContent = veh.vehicleEngine || '—';
  document.getElementById('prof-mileage').textContent = veh.mileage ? `${formatNumber(veh.mileage)} km` : '—';
  document.getElementById('prof-owner').textContent = veh.ownerName || '—';
  document.getElementById('prof-phone').textContent = veh.ownerPhone || '—';
  document.getElementById('prof-engine').textContent = veh.vehicleEngine || '—';
  document.getElementById('prof-vin').textContent = veh.vehicleVin || '—';

  const services = await db.getServicesByVehicle(vehicleId);
  document.getElementById('prof-summary-total-services').textContent = services.length;
  document.getElementById('prof-summary-last-service').textContent = services.length > 0 ? formatDateAlbanian(services[0].serviceDate) : 'Nuk ka';

  await renderVehicleTimeline(vehicleId, services);
}

async function downloadVehicleHistoryPdf(vehicleId) {
  const vehicle = await db.getVehicleById(vehicleId);
  if (!vehicle) {
    showToast('Automjeti nuk u gjet.', 'error');
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('Biblioteka e PDF-së nuk u ngarkua. Kontrollo lidhjen me internetin.', 'error');
    return;
  }

  const services = await db.getServicesByVehicle(vehicleId);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const pdfText = (value) => String(value ?? '')
    .replace(/ë/g, 'e').replace(/Ë/g, 'E')
    .replace(/ç/g, 'c').replace(/Ç/g, 'C');
  const pdfCurrency = appSettings.currency === 'euro' ? 'EUR' : 'LEK';
  const vehicleName = [vehicle.vehicleBrand, vehicle.vehicleModel].filter(Boolean).join(' ') || 'Automjet';
  let y = 18;

  const drawHeader = () => {
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Libri i Sherbimeve', margin, y);
    y += 9;
    doc.setFontSize(13);
    doc.text(pdfText(`Historiku: ${vehicleName}`), margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(pdfText(`Pronari: ${vehicle.ownerName || '—'}`), margin, y);
    doc.text(pdfText(`Targa: ${vehicle.vehiclePlate || '—'}`), pageWidth - margin, y, { align: 'right' });
    y += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  };

  const drawTableHeader = () => {
    doc.setFillColor(239, 246, 255);
    doc.rect(margin, y - 5, pageWidth - (margin * 2), 8, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('Data', margin + 2, y);
    doc.text('Puna / sherbimi', margin + 29, y);
    doc.text(`Kosto (${pdfCurrency})`, pageWidth - margin - 2, y, { align: 'right' });
    y += 8;
    doc.setFont(undefined, 'normal');
  };

  drawHeader();
  drawTableHeader();
  if (services.length === 0) {
    doc.setFontSize(10);
    doc.text('Nuk ka sherbime te regjistruara per kete automjet.', margin, y);
  } else {
    services.forEach((service) => {
      const work = [
        (service.serviceTypes || []).join(' + '),
        service.description || ''
      ].filter(Boolean).join(': ') || 'Sherbim';
      const workLines = doc.splitTextToSize(pdfText(work), pageWidth - margin - 29 - 42);
      const rowHeight = Math.max(8, workLines.length * 4.5 + 3);
      if (y + rowHeight > pageHeight - 18) {
        doc.addPage();
        y = 18;
        drawTableHeader();
      }
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(pdfText(formatDateSimple(service.serviceDate)), margin + 2, y);
      doc.text(workLines, margin + 29, y);
      doc.text(pdfText(`${formatNumber(service.totalCost)} ${pdfCurrency}`), pageWidth - margin - 2, y, { align: 'right' });
      y += rowHeight;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y - 2, pageWidth - margin, y - 2);
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(pdfText(`Gjeneruar me ${formatDateAlbanian(new Date().toISOString())}`), margin, pageHeight - 10);
  const safeName = vehicleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'automjet';
  doc.save(`historiku-${safeName}.pdf`);
  showToast('PDF-ja u shkarkua me sukses.', 'success');
}

async function renderVehicleTimeline(vehicleId, services) {
  const timelineEl = document.getElementById('vehicle-timeline');
  timelineEl.innerHTML = '';

  if (!services || services.length === 0) {
    timelineEl.innerHTML = `<div class="empty-state" style="padding:2rem;text-align:center;color:var(--text-muted);">Nuk ka shërbime të regjistruara për këtë automjet.</div>`;
    return;
  }

  services.forEach(srv => {
    const item = document.createElement('div');
    item.className = 'timeline-item';

    let partsHtml = '';
    if (srv.parts && srv.parts.length > 0) {
      partsHtml = `
        <div style="margin-top:0.75rem;">
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:0.25rem;">
            ${srv.parts.slice(0, 3).map(p => `<li style="font-size:0.8rem;color:var(--text-muted);">• ${escapeHtml(p.name)} (${escapeHtml(p.quantity)})</li>`).join('')}
            ${srv.parts.length > 3 ? `<li style="color:var(--accent);font-weight:500;font-size:0.8rem;">+ dhe ${srv.parts.length - 3} pjesë të tjera...</li>` : ''}
          </ul>
        </div>
      `;
    }

    const archivedBadge = srv.archived ? `<span class="badge badge-warning" style="margin-left:0.5rem;font-size:0.7rem;border-radius:var(--radius-sm);">E Arkivuar</span>` : '';
    const formattedDate = formatDateAlbanian(srv.serviceDate);
    const serviceTypesText = (srv.serviceTypes && srv.serviceTypes.length) ? escapeHtml(srv.serviceTypes.join(' + ')) : 'Shërbim';

    item.innerHTML = `
      <div class="timeline-dot" style="${srv.archived ? 'background-color:var(--text-light);box-shadow:none;' : ''}"></div>
      <div class="timeline-header">
        <div class="timeline-date-km">
          <span class="timeline-date">${formattedDate}</span>
          <span class="timeline-km">${formatNumber(srv.mileage)} km</span>
          ${archivedBadge}
        </div>
        <span class="timeline-cost-badge">${formatCurrency(srv.totalCost)}</span>
      </div>
      <div class="timeline-card" style="margin-top:0.5rem;${srv.archived ? 'border-color:#cbd5e1;background:#fafafa;' : ''}">
        <div class="timeline-title" style="display:flex;align-items:center;gap:0.5rem;font-weight:600;">
          <i data-lucide="${srv.archived ? 'archive' : 'wrench'}" style="width:16px;height:16px;color:${srv.archived ? 'var(--text-muted)' : 'var(--accent)'};"></i>
          <span>${serviceTypesText}</span>
        </div>
        <div class="timeline-desc" style="margin-top:0.5rem;font-size:0.9rem;color:var(--text-main);line-height:1.4;">${escapeHtml(srv.description)}</div>
        ${partsHtml}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1rem;border-top:1px solid var(--border-color);padding-top:0.75rem;flex-wrap:wrap;gap:0.5rem;">
          <span style="font-size:0.75rem;color:var(--text-muted);">Pjesë: ${formatCurrency(srv.partsCost)} | Punë: ${formatCurrency(srv.laborCost)}</span>
          <button class="btn btn-secondary btn-sm view-srv-details-btn" style="padding:0.25rem 0.6rem;font-size:0.75rem;display:flex;align-items:center;gap:0.25rem;font-weight:500;">
            Shiko detajet <i data-lucide="chevron-right" style="width:12px;height:12px;"></i>
          </button>
        </div>
      </div>
    `;

    item.querySelector('.view-srv-details-btn').addEventListener('click', () => openServiceDetails(srv.id));
    timelineEl.appendChild(item);
  });

  window.lucide && window.lucide.createIcons();
}

// ==========================================
// SERVICES (Shërbimet)
// ==========================================
async function renderServices() {
  const allServices = await db.getServices();
  const vehicles = await db.getVehicles();
  const vehicleMap = {};
  vehicles.forEach(v => vehicleMap[v.id] = v);

  const searchInput = document.getElementById('services-search');
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let services = allServices
    .filter(s => {
      if (!searchQuery) return true;
      const veh = vehicleMap[s.vehicleId];
      if (!veh) return false;
      const owner = (veh.ownerName || '').toLowerCase();
      const brand = (veh.vehicleBrand || '').toLowerCase();
      return owner.includes(searchQuery) || brand.includes(searchQuery);
    })
    .sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

  const tbody = document.querySelector('#table-services tbody');
  tbody.innerHTML = '';

  if (services.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">
          <div class="empty-icon"><i data-lucide="wrench" style="width:48px;height:48px;color:var(--text-light);margin:0 auto 1rem;"></i></div>
          <div class="empty-text" style="font-weight:600;color:var(--text-main);">Nuk ka asnjë shërbim të regjistruar.</div>
        </td>
      </tr>
    `;
    window.lucide && window.lucide.createIcons();
    return;
  }

  services.forEach(srv => {
    const veh = vehicleMap[srv.vehicleId];
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.innerHTML = `
      <td>${escapeHtml(veh ? [veh.vehicleBrand, veh.vehicleModel].filter(Boolean).join(' ') : 'Automjet i fshirë') || '—'}</td>
      <td>${escapeHtml(veh ? veh.ownerName : '—') || '—'}</td>
      <td><span class="result-plate">${escapeHtml(veh ? veh.vehiclePlate : '—') || '—'}</span></td>
      <td>${formatDateAlbanian(srv.serviceDate)}</td>
      <td>${formatNumber(srv.mileage)} km</td>
      <td>${escapeHtml((srv.serviceTypes || []).join(', ')) || '—'}</td>
      <td>${formatCurrency(srv.totalCost)}</td>
      <td style="text-align:right;" class="row-actions"></td>
    `;
    tr.addEventListener('click', () => openServiceDetails(srv.id));

    const actionsCell = tr.querySelector('.row-actions');
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-xs';
    editBtn.innerHTML = '<i data-lucide="edit" style="width:12px;height:12px;"></i>';
    editBtn.addEventListener('click', (e) => { e.stopPropagation(); startEditService(srv.id); });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-danger btn-xs';
    delBtn.style.marginLeft = '0.4rem';
    delBtn.innerHTML = '<i data-lucide="trash-2" style="width:12px;height:12px;"></i>';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); startDeleteService(srv.id); });

    actionsCell.appendChild(editBtn);
    actionsCell.appendChild(delBtn);
    tbody.appendChild(tr);
  });

  window.lucide && window.lucide.createIcons();
}

async function openServiceDetails(srvId) {
  const srv = await db.getServiceById(srvId);
  if (!srv) return;

  document.getElementById('detail-srv-date').innerText = formatDateAlbanian(srv.serviceDate);
  document.getElementById('detail-srv-mileage').innerText = `${formatNumber(srv.mileage)} km`;
  document.getElementById('detail-srv-desc').innerText = srv.description || '-';

  const archivedBadge = document.getElementById('detail-srv-archived-badge-container');
  archivedBadge.style.display = srv.archived ? 'block' : 'none';

  const catContainer = document.getElementById('detail-srv-categories');
  catContainer.innerHTML = '';
  if (srv.serviceTypes && srv.serviceTypes.length > 0) {
    srv.serviceTypes.forEach(cat => {
      const span = document.createElement('span');
      span.className = 'badge badge-info';
      span.style.padding = '0.2rem 0.5rem';
      span.innerText = cat;
      catContainer.appendChild(span);
    });
  } else {
    catContainer.innerHTML = '<span class="badge badge-dark">Tjetër</span>';
  }

  const partsContainer = document.getElementById('detail-srv-parts-container');
  const tbody = document.getElementById('detail-srv-parts-tbody');
  tbody.innerHTML = '';
  if (srv.parts && srv.parts.length > 0) {
    partsContainer.style.display = 'block';
    srv.parts.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:0.5rem 0.75rem;border-bottom:1px solid var(--border-color);font-weight:500;color:var(--text-main);">${escapeHtml(p.name)}</td>
        <td style="padding:0.5rem 0.75rem;border-bottom:1px solid var(--border-color);text-align:center;font-weight:600;color:var(--text-main);">${escapeHtml(p.quantity)}</td>
        <td style="padding:0.5rem 0.75rem;border-bottom:1px solid var(--border-color);text-align:right;color:var(--text-muted);">${escapeHtml(p.description) || '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    partsContainer.style.display = 'none';
  }

  document.getElementById('detail-srv-cost-parts').innerText = formatCurrency(srv.partsCost);
  document.getElementById('detail-srv-cost-labor').innerText = formatCurrency(srv.laborCost);
  document.getElementById('detail-srv-cost-total').innerText = formatCurrency(srv.totalCost);

  const notesContainer = document.getElementById('detail-srv-notes-container');
  if (srv.notes) {
    notesContainer.style.display = 'block';
    document.getElementById('detail-srv-notes').innerText = srv.notes;
  } else {
    notesContainer.style.display = 'none';
  }

  const archiveBtn = document.getElementById('btn-detail-archive');
  const archiveText = document.getElementById('btn-detail-archive-text');
  archiveText.innerText = srv.archived ? 'Çarkivo' : 'Arkivo';

  const newArchiveBtn = archiveBtn.cloneNode(true);
  archiveBtn.parentNode.replaceChild(newArchiveBtn, archiveBtn);
  newArchiveBtn.addEventListener('click', async () => {
    const nextState = !srv.archived;
    await db.updateServiceRecord(srv.id, { archived: nextState });
    showToast(nextState ? 'Shërbimi u arkivua.' : 'Shërbimi u çarkivua.', 'success');
    closeModal('modal-service-details');
    if (state.currentView === 'vehicle-profile') await renderVehicleProfile(srv.vehicleId);
    if (state.currentView === 'services') await renderServices();
  });

  const editBtn = document.getElementById('btn-detail-edit');
  const newEditBtn = editBtn.cloneNode(true);
  editBtn.parentNode.replaceChild(newEditBtn, editBtn);
  newEditBtn.addEventListener('click', () => {
    closeModal('modal-service-details');
    startEditService(srv.id);
  });

  const deleteBtn = document.getElementById('btn-detail-delete');
  const newDeleteBtn = deleteBtn.cloneNode(true);
  deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
  newDeleteBtn.addEventListener('click', () => {
    closeModal('modal-service-details');
    startDeleteService(srv.id);
  });

  openModal('modal-service-details');
  window.lucide && window.lucide.createIcons();
}

// ==========================================
// MODALS (generic open/close)
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('show');
  window.lucide && window.lucide.createIcons();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('show');
}

// ==========================================
// VEHICLE DROPDOWN (për formularin e shërbimit)
// ==========================================
async function populateVehicleDropdown(selectedId = null) {
  const select = document.getElementById('srv-vehicle-select');
  const vehicles = (await db.getVehicles()).sort((a, b) => (a.ownerName || '').localeCompare(b.ownerName || ''));

  select.innerHTML = '<option value="" disabled selected>Zgjidh automjetin...</option>';
  vehicles.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    const label = `${v.ownerName} — ${[v.vehicleBrand, v.vehicleModel].filter(Boolean).join(' ')}${v.vehiclePlate ? ' (' + v.vehiclePlate + ')' : ''}`;
    opt.textContent = label;
    if (selectedId && v.id === selectedId) opt.selected = true;
    select.appendChild(opt);
  });
}

// ==========================================
// VEHICLE MODAL (Add / Edit)
// ==========================================
function openAddVehicleModal() {
  state.editingVehicleId = null;
  document.getElementById('form-vehicle').reset();
  document.getElementById('veh-id').value = '';
  document.getElementById('modal-vehicle-title').textContent = 'Shto Automjet';
  openModal('modal-vehicle');
}

async function startEditVehicle(id) {
  const veh = await db.getVehicleById(id);
  if (!veh) return;

  state.editingVehicleId = veh.id;
  document.getElementById('veh-id').value = veh.id;
  document.getElementById('veh-owner-name').value = veh.ownerName || '';
  document.getElementById('veh-brand').value = veh.vehicleBrand || '';
  document.getElementById('veh-owner-phone').value = veh.ownerPhone || '';
  document.getElementById('veh-plate').value = veh.vehiclePlate || '';
  document.getElementById('veh-model').value = veh.vehicleModel || '';
  document.getElementById('veh-year').value = veh.vehicleYear || '';
  document.getElementById('veh-engine').value = veh.vehicleEngine || '';
  document.getElementById('veh-vin').value = veh.vehicleVin || '';

  document.getElementById('modal-vehicle-title').textContent = 'Modifiko Automjetin';
  openModal('modal-vehicle');
}

async function startDeleteVehicle(id) {
  const veh = await db.getVehicleById(id);
  if (!veh) return;

  state.deletingId = id;
  state.deletingType = 'vehicle';
  document.getElementById('confirm-delete-title').innerText = 'Fshi automjetin?';
  document.getElementById('confirm-delete-message').innerText = `Ky veprim do të fshijë automjetin e "${veh.ownerName}" (${veh.vehicleBrand}) dhe të gjitha shërbimet e lidhura. Ky veprim nuk mund të kthehet mbrapsht.`;
  openModal('modal-confirm-delete');
}

// The core save function: validates only ownerName + vehicleBrand,
// persists via db.js, closes the modal, and refreshes list + stats immediately.
async function saveVehicle(e) {
  e.preventDefault();

  const ownerName = document.getElementById('veh-owner-name').value.trim();
  const vehicleBrand = document.getElementById('veh-brand').value.trim();
  const vehiclePlate = document.getElementById('veh-plate').value.trim();

  if (!ownerName || !vehicleBrand) {
    showToast('Emri i Pronarit dhe Marka janë të detyrueshme.', 'error');
    return;
  }

  const vehicleData = {
    ownerName,
    vehicleBrand,
    ownerPhone: document.getElementById('veh-owner-phone').value.trim(),
    vehiclePlate,
    vehicleModel: document.getElementById('veh-model').value.trim(),
    vehicleYear: document.getElementById('veh-year').value,
    vehicleEngine: document.getElementById('veh-engine').value.trim(),
    vehicleVin: document.getElementById('veh-vin').value.trim()
  };

  try {
    if (state.editingVehicleId) {
      await db.updateVehicle(state.editingVehicleId, vehicleData);
      showToast('Automjeti u përditësua me sukses.', 'success');
    } else {
      await db.addVehicle(vehicleData);
      showToast('Automjeti u shtua me sukses.', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Ndodhi një gabim gjatë ruajtjes.', 'error');
    return;
  }

  closeModal('modal-vehicle');

  // Refresh immediately so the new/updated vehicle shows up without a reload
  await renderVehicles();
  await updateDashboardStats();

  if (state.currentView === 'vehicle-profile' && state.selectedVehicleId) {
    await renderVehicleProfile(state.selectedVehicleId);
  }
}

// ==========================================
// SERVICE MODAL (Add / Edit)
// ==========================================
async function populateCategoryCheckboxes(selected = []) {
  const container = document.getElementById('srv-categories-checkboxes');
  const categories = await db.getActiveCategories();
  container.innerHTML = '';
  categories.forEach((cat, i) => {
    const inputId = `srv-cat-${i}`;
    const checked = selected.includes(cat.name) ? 'checked' : '';
    container.insertAdjacentHTML('beforeend', `
      <input type="checkbox" class="service-type-checkbox" id="${inputId}" value="${escapeHtml(cat.name)}" ${checked}>
      <label class="service-type-label" for="${inputId}">${escapeHtml(cat.name)}</label>
    `);
  });
}

function setupPartsEditor() {
  document.getElementById('btn-add-part-row').addEventListener('click', () => addPartRow());
}

function addPartRow(part = {}) {
  const container = document.getElementById('srv-parts-rows-container');
  const rowId = 'part_' + (state.partsCount++);
  const row = document.createElement('div');
  row.className = 'part-row';
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <input type="text" class="form-control part-name" placeholder="Emri i pjesës" value="${escapeHtml(part.name || '')}">
    <input type="number" class="form-control part-qty" placeholder="Sasia" min="1" value="${part.quantity || 1}">
    <input type="text" class="form-control part-desc" placeholder="Brand" value="${escapeHtml(part.description || '')}">
    <button type="button" class="btn btn-danger btn-xs remove-part-row">&times;</button>
  `;
  row.querySelector('.remove-part-row').addEventListener('click', () => row.remove());
  container.appendChild(row);
}

function collectParts() {
  const rows = document.querySelectorAll('#srv-parts-rows-container .part-row');
  const parts = [];
  rows.forEach(row => {
    const name = row.querySelector('.part-name').value.trim();
    if (!name) return;
    parts.push({
      name,
      quantity: parseInt(row.querySelector('.part-qty').value) || 1,
      description: row.querySelector('.part-desc').value.trim()
    });
  });
  return parts;
}

function calculateServiceTotal() {
  const partsCost = parseFloat(document.getElementById('srv-cost-parts').value) || 0;
  const laborCost = parseFloat(document.getElementById('srv-cost-labor').value) || 0;
  document.getElementById('srv-total-display').textContent = formatCurrency(partsCost + laborCost);
}

async function openAddServiceModal(lockedVehicleId = null) {
  state.editingServiceId = null;
  document.getElementById('form-service').reset();
  document.getElementById('srv-id').value = '';
  document.getElementById('srv-parts-rows-container').innerHTML = '';
  document.getElementById('srv-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('srv-cost-parts').value = 0;
  document.getElementById('srv-cost-labor').value = 0;
  calculateServiceTotal();

  await populateVehicleDropdown(lockedVehicleId);
  await populateCategoryCheckboxes();

  const vehicleGroup = document.getElementById('srv-vehicle-group');
  const vehicleSelect = document.getElementById('srv-vehicle-select');
  if (lockedVehicleId) {
    vehicleSelect.value = lockedVehicleId;
    vehicleSelect.disabled = true;
    vehicleGroup.style.display = 'none';
  } else {
    vehicleSelect.disabled = false;
    vehicleGroup.style.display = 'block';
  }

  document.getElementById('modal-service-title').textContent = 'Regjistro Shërbim';
  openModal('modal-service');
}

async function startEditService(id) {
  const srv = await db.getServiceById(id);
  if (!srv) return;

  state.editingServiceId = srv.id;
  document.getElementById('form-service').reset();
  document.getElementById('srv-parts-rows-container').innerHTML = '';

  await populateVehicleDropdown(srv.vehicleId);
  await populateCategoryCheckboxes(srv.serviceTypes || []);

  document.getElementById('srv-id').value = srv.id;
  document.getElementById('srv-vehicle-select').value = srv.vehicleId;
  document.getElementById('srv-vehicle-select').disabled = true;
  document.getElementById('srv-vehicle-group').style.display = 'none';
  document.getElementById('srv-date').value = formatDateSimple(srv.serviceDate);
  document.getElementById('srv-mileage').value = srv.mileage;
  document.getElementById('srv-description').value = srv.description || '';
  document.getElementById('srv-cost-parts').value = srv.partsCost || 0;
  document.getElementById('srv-cost-labor').value = srv.laborCost || 0;
  document.getElementById('srv-notes').value = srv.notes || '';
  calculateServiceTotal();

  (srv.parts || []).forEach(p => addPartRow(p));

  document.getElementById('modal-service-title').textContent = 'Modifiko Shërbimin';
  openModal('modal-service');
}

async function startDeleteService(id) {
  const srv = await db.getServiceById(id);
  if (!srv) return;

  state.deletingId = id;
  state.deletingType = 'service';
  document.getElementById('confirm-delete-title').innerText = 'Fshi shërbimin?';
  document.getElementById('confirm-delete-message').innerText = `Ky veprim do të fshijë shërbimin e datës ${formatDateAlbanian(srv.serviceDate)}. Ky veprim nuk mund të kthehet mbrapsht.`;
  openModal('modal-confirm-delete');
}

async function saveService(e) {
  e.preventDefault();

  const vehicleId = document.getElementById('srv-vehicle-select').value;
  const date = document.getElementById('srv-date').value;
  const mileage = document.getElementById('srv-mileage').value;

  if (!vehicleId || !date) {
    showToast('Automjeti dhe data janë të detyrueshme.', 'error');
    return;
  }

  const serviceTypes = Array.from(document.querySelectorAll('#srv-categories-checkboxes input:checked')).map(cb => cb.value);

  const serviceData = {
    vehicleId,
    serviceDate: date,
    mileage,
    serviceTypes,
    description: document.getElementById('srv-description').value.trim(),
    parts: collectParts(),
    partsCost: document.getElementById('srv-cost-parts').value,
    laborCost: document.getElementById('srv-cost-labor').value,
    notes: document.getElementById('srv-notes').value.trim()
  };

  try {
    if (state.editingServiceId) {
      await db.updateServiceRecord(state.editingServiceId, serviceData);
      showToast('Shërbimi u përditësua me sukses.', 'success');
    } else {
      await db.addServiceRecord(serviceData);
      showToast('Shërbimi u regjistrua me sukses.', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Ndodhi një gabim gjatë ruajtjes.', 'error');
    return;
  }

  closeModal('modal-service');

  await updateDashboardStats();
  if (state.currentView === 'services') await renderServices();
  if (state.currentView === 'vehicle-profile') await renderVehicleProfile(vehicleId);
  if (state.currentView === 'vehicles') await renderVehicles();
}

// ==========================================
// FORM HANDLERS / DELETE CONFIRM
// ==========================================
function setupFormHandlers() {
  document.getElementById('form-vehicle').addEventListener('submit', saveVehicle);
  document.getElementById('form-service').addEventListener('submit', saveService);

  document.getElementById('srv-cost-parts').addEventListener('input', calculateServiceTotal);
  document.getElementById('srv-cost-labor').addEventListener('input', calculateServiceTotal);

  document.getElementById('btn-confirm-delete-action').addEventListener('click', async () => {
    if (state.deletingType === 'vehicle') {
      await db.deleteVehicle(state.deletingId);
      showToast('Automjeti u fshi me sukses.', 'warning');
      closeModal('modal-confirm-delete');
      await updateDashboardStats();
      if (state.currentView === 'vehicle-profile') {
        navigateTo('vehicles');
      } else {
        await renderVehicles();
      }
    } else if (state.deletingType === 'service') {
      const srv = await db.getServiceById(state.deletingId);
      await db.deleteServiceRecord(state.deletingId);
      showToast('Shërbimi u fshi me sukses.', 'warning');
      closeModal('modal-confirm-delete');
      await updateDashboardStats();
      if (state.currentView === 'vehicle-profile' && srv) await renderVehicleProfile(srv.vehicleId);
      if (state.currentView === 'services') await renderServices();
    }
    state.deletingId = null;
    state.deletingType = null;
  });
}

// ==========================================
// SEARCH
// ==========================================
function setupSearch() {
  const globalInput = document.getElementById('global-search');
  const dropdown = document.getElementById('search-results-dropdown');

  globalInput.addEventListener('input', async () => {
    const query = globalInput.value.trim();
    if (!query) {
      dropdown.style.display = 'none';
      dropdown.innerHTML = '';
      return;
    }
    const results = await db.searchAll(query);
    if (results.length === 0) {
      dropdown.innerHTML = `<div class="search-result-empty">Nuk u gjet asnjë automjet me këtë kërkim.</div>`;
      dropdown.style.display = 'block';
      return;
    }
    dropdown.innerHTML = results.slice(0, 8).map(r => `
      <div class="search-result-item" data-vehicle-id="${r.id}">
        <span class="result-plate">${escapeHtml(r.subtitle)}</span>
        <div>
          <div style="font-weight:600;">${escapeHtml(r.title)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(r.owner)}</div>
        </div>
      </div>
    `).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        dropdown.style.display = 'none';
        globalInput.value = '';
        navigateTo('vehicle-profile', { vehicleId: el.dataset.vehicleId });
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!globalInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  document.getElementById('vehicles-search').addEventListener('input', () => renderVehicles());
  document.getElementById('services-search').addEventListener('input', () => renderServices());
}
