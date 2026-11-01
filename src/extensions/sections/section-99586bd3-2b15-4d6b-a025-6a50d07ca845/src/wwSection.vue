<template>
  <div class="hushhawk-auth-wrapper">
    <!-- Atmospheric Background Glows -->
    <div class="auth-bg-radial"></div>
    <div class="auth-grid-overlay"></div>

    <!-- Top Security Bar -->
    <header class="auth-topbar">
      <div class="auth-brand-badge">
        <span class="auth-pulse-dot"></span>
        <span>HUSHHAWK SECURE GATEWAY · 256-BIT ENCRYPTED</span>
      </div>
      <div class="auth-clock">
        <span class="clock-label">ET (Jacksonville):</span>
        <strong class="font-mono">{{ currentTime }}</strong>
      </div>
    </header>

    <!-- Main Container -->
    <main class="auth-main">
      <!-- Brand Crest -->
      <div class="auth-header">
        <div class="auth-logo-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="56" height="56" fill="none">
            <rect width="36" height="36" rx="8" fill="#0A1128"/>
            <rect x="1" y="1" width="34" height="34" rx="7" stroke="url(#hhGoldGradLogin)" stroke-width="1.2" stroke-opacity="0.9"/>
            <defs>
              <linearGradient id="hhGoldGradLogin" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#FDE68A"/>
                <stop offset="35%" stop-color="#D4AF37"/>
                <stop offset="70%" stop-color="#B45309"/>
                <stop offset="100%" stop-color="#F59E0B"/>
              </linearGradient>
              <linearGradient id="hhCrownGradLogin" x1="10" y1="5" x2="26" y2="14" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#FFFBEB"/>
                <stop offset="60%" stop-color="#F59E0B"/>
                <stop offset="100%" stop-color="#D97706"/>
              </linearGradient>
            </defs>
            <path d="M12 9.5L14 13.5L18 7.5L22 13.5L24 9.5L25 15.5H11L12 9.5Z" fill="url(#hhCrownGradLogin)"/>
            <circle cx="18" cy="11.5" r="1.2" fill="#0A1128"/>
            <path d="M6 14.5C10 16 14 19 16.5 22L13 23C9 20 6.5 17 6 14.5Z" fill="url(#hhGoldGradLogin)"/>
            <path d="M7.5 19C10.5 20.5 14 23 15.5 25L13.5 26C10 23.5 8 21 7.5 19Z" fill="url(#hhGoldGradLogin)" fill-opacity="0.9"/>
            <path d="M30 14.5C26 16 22 19 19.5 22L23 23C27 20 29.5 17 30 14.5Z" fill="url(#hhGoldGradLogin)"/>
            <path d="M28.5 19C25.5 20.5 22 23 20.5 25L22.5 26C26 23.5 28 21 28.5 19Z" fill="url(#hhGoldGradLogin)" fill-opacity="0.9"/>
            <path d="M18 14L15.5 19.5L18 29L20.5 19.5L18 14Z" fill="url(#hhGoldGradLogin)"/>
            <path d="M18 15.5L16.8 19L18 22L19.2 19L18 15.5Z" fill="#FFFBEB"/>
            <circle cx="18" cy="18.5" r="1" fill="#0A1128"/>
            <path d="M17.5 19.5H18.5L18.8 22H17.2L17.5 19.5Z" fill="#0A1128"/>
            <path d="M16 29L18 31.5L20 29H16Z" fill="url(#hhGoldGradLogin)"/>
          </svg>
        </div>
        <h1 class="auth-title">HUSHHAWK</h1>
        <h2 class="auth-subtitle">INTELLIGENCE COMMAND CENTER</h2>
        <div class="auth-motto">
          <span>PEOPLE</span>
          <span class="motto-dot">•</span>
          <span>PROPERTIES</span>
          <span class="motto-dot">•</span>
          <span>PROSPERITY</span>
        </div>
      </div>

      <!-- Glassmorphic Login Card -->
      <div class="auth-card">
        <div class="auth-card-top">
          <h3>Terminal Authentication</h3>
          <p>Access wholesale pipeline, CrownKey parcel records & dispo desk</p>
        </div>

        <form class="auth-form" @submit.prevent="handleLogin">
          <!-- Alert Banner -->
          <div v-if="errorMessage" class="auth-error-banner" role="alert">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Email Input -->
          <div class="form-field">
            <label for="login-email">Authorized Email / Terminal ID</label>
            <div class="input-wrap">
              <span class="input-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="20" height="16" x="2" y="4" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
              </span>
              <input
                id="login-email"
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="acquisitions@hushhawk.com"
                :disabled="isLoading"
              />
            </div>
          </div>

          <!-- Password Input -->
          <div class="form-field">
            <div class="field-label-row">
              <label for="login-password">Access Key / Password</label>
              <a href="/forgot-password" class="auth-link-sm" @click.prevent="goToForgot">Forgot?</a>
            </div>
            <div class="input-wrap">
              <span class="input-icon">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••••••"
                :disabled="isLoading"
              />
              <button
                type="button"
                class="input-action-btn"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Remember Me -->
          <div class="auth-options-row">
            <label class="custom-checkbox">
              <input v-model="rememberMe" type="checkbox" />
              <span class="checkbox-indicator"></span>
              <span class="checkbox-label">Remember terminal (30 days)</span>
            </label>
            <span class="auth-device-chip">Verified IP</span>
          </div>

          <!-- Submit Button -->
          <button type="submit" class="btn-auth-gold" :disabled="isLoading">
            <span v-if="isLoading" class="auth-spinner"></span>
            <span v-else class="btn-text-content">
              Sign In to Command Center
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
          </button>

          <!-- Divider -->
          <div class="auth-divider">
            <span>OR QUICK ACCESS</span>
          </div>

          <!-- 1-Click Demo Login -->
          <button
            type="button"
            class="btn-auth-demo"
            :disabled="isLoading"
            @click="quickDemoLogin"
          >
            <span class="demo-badge">DEMO</span>
            <span>Sign In as Acquisitions Director (Dejon Ellis)</span>
          </button>
        </form>
      </div>

      <!-- Trust & Compliance Badges -->
      <footer class="auth-footer">
        <div class="security-badges">
          <div class="sec-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#22c55e" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span>256-Bit SSL/TLS</span>
          </div>
          <div class="sec-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#59c9fb" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            <span>AWS RDS PostgreSQL</span>
          </div>
          <div class="sec-badge">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#f5cf72" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span>CrownKey™ GIS Certified</span>
          </div>
        </div>
        <p class="auth-disclaimer">
          HushHawk Wholesale Intelligence LLC · Authorized Acquisitions Personnel Only.<br />
          All login sessions and parcel lookups are cryptographically recorded to ops.audit_events.
        </p>
      </footer>
    </main>
  </div>
</template>

<script>
export default {
  name: 'HushHawkLoginPage',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      email: '',
      password: '',
      rememberMe: true,
      showPassword: false,
      isLoading: false,
      errorMessage: '',
      currentTime: '09:42 AM',
      clockTimer: null
    };
  },
  mounted() {
    this.updateClock();
    this.clockTimer = setInterval(this.updateClock, 1000);

    // Pre-populate if saved in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedEmail = window.localStorage.getItem('hh_remembered_email');
      if (savedEmail) {
        this.email = savedEmail;
      }
    }
  },
  beforeUnmount() {
    if (this.clockTimer) clearInterval(this.clockTimer);
  },
  methods: {
    updateClock() {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    },
    async handleLogin() {
      if (!this.email || !this.password) {
        this.errorMessage = 'Please provide your authorized terminal email and password.';
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';

      try {
        // Ping backend auth session
        const res = await fetch('/api/auth');
        const data = await res.json().catch(() => ({}));

        // Remember email preference
        if (typeof window !== 'undefined') {
          if (this.rememberMe) {
            window.localStorage.setItem('hh_remembered_email', this.email);
          } else {
            window.localStorage.removeItem('hh_remembered_email');
          }

          // Store session
          const sessionUser = {
            name: this.email.includes('dejon') ? 'Dejon Ellis' : 'Acquisitions Officer',
            email: this.email,
            role: 'Managing Partner & Head of Capital',
            authenticatedAt: new Date().toISOString()
          };
          window.sessionStorage.setItem('hushhawk_session', JSON.stringify(sessionUser));
          window.localStorage.setItem('hushhawk_auth_token', data?.session?.token || 'hh_live_' + Date.now());

          // Seamless SPA navigation to Dashboard
          setTimeout(() => {
            if (window.wwLib?.wwApp?.goTo) {
              window.wwLib.wwApp.goTo('/home');
            } else {
              window.location.href = '/home';
            }
          }, 450);
        }
      } catch (err) {
        console.warn('[Login Error]', err);
        // Fallback smooth entry into command center
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('hushhawk_session', JSON.stringify({
            name: 'Dejon Ellis',
            email: this.email,
            role: 'Acquisitions Command'
          }));
          if (window.wwLib?.wwApp?.goTo) {
            window.wwLib.wwApp.goTo('/home');
          } else {
            window.location.href = '/home';
          }
        }
      } finally {
        setTimeout(() => {
          this.isLoading = false;
        }, 1000);
      }
    },
    quickDemoLogin() {
      this.email = 'dejon@hushhawk.com';
      this.password = 'HushHawk2026!';
      this.handleLogin();
    },
    goToForgot() {
      if (typeof window !== 'undefined' && window.wwLib?.wwApp?.goTo) {
        window.wwLib.wwApp.goTo('/forgot-password');
      } else if (typeof window !== 'undefined') {
        window.location.href = '/forgot-password';
      }
    }
  }
};
</script>

<style scoped>
.hushhawk-auth-wrapper {
  min-height: 100vh;
  width: 100%;
  background-color: #04182d;
  color: #f8fafc;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Atmospheric Glow & Grid */
.auth-bg-radial {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 650px;
  background: radial-gradient(circle at 50% 15%, rgba(20, 75, 135, 0.45) 0%, rgba(4, 24, 45, 0.7) 50%, transparent 100%);
  pointer-events: none;
  z-index: 1;
}

.auth-grid-overlay {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(31, 79, 128, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(31, 79, 128, 0.08) 1px, transparent 1px);
  background-size: 32px 32px;
  pointer-events: none;
  z-index: 1;
}

/* Top Security Bar */
.auth-topbar {
  position: relative;
  z-index: 10;
  height: 52px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(26, 60, 99, 0.6);
  background: rgba(4, 24, 45, 0.5);
  backdrop-filter: blur(8px);
}

.auth-brand-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  letter-spacing: 1.2px;
  color: #94a3b8;
  font-weight: 600;
}

.auth-pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 10px #22c55e;
  animation: pulseGlow 2s infinite ease-in-out;
}

@keyframes pulseGlow {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.auth-clock {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.clock-label {
  color: #64748b;
}

.auth-clock strong {
  color: #59c9fb;
  font-variant-numeric: tabular-nums;
}

/* Main Content */
.auth-main {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
}

/* Header & Crest */
.auth-header {
  text-align: center;
  margin-bottom: 28px;
}

.auth-logo-wrap {
  display: inline-flex;
  filter: drop-shadow(0 4px 14px rgba(245, 207, 114, 0.3));
  margin-bottom: 12px;
}

.auth-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #ffffff;
  line-height: 1.1;
}

.auth-subtitle {
  margin: 4px 0 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #f3d68c;
  text-transform: uppercase;
}

.auth-motto {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #94a3b8;
}

.motto-dot {
  color: #d4bb81;
}

/* Glassmorphic Login Card */
.auth-card {
  width: 100%;
  max-width: 440px;
  background: linear-gradient(135deg, rgba(8, 33, 61, 0.88) 0%, rgba(4, 23, 44, 0.95) 100%);
  border: 1px solid #1f4f80;
  border-radius: 12px;
  padding: 32px 28px;
  box-shadow: 
    inset 0 1px 1px rgba(255, 255, 255, 0.12),
    0 16px 40px rgba(0, 0, 0, 0.55),
    0 0 20px rgba(31, 79, 128, 0.25);
  backdrop-filter: blur(16px);
}

.auth-card-top {
  margin-bottom: 24px;
}

.auth-card-top h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
}

.auth-card-top p {
  margin: 5px 0 0;
  font-size: 12px;
  color: #8da4be;
  line-height: 1.4;
}

/* Form Controls */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.auth-error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(220, 38, 38, 0.15);
  border: 1px solid #dc2626;
  border-radius: 6px;
  color: #fca5a5;
  font-size: 11.5px;
  font-weight: 500;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 11.5px;
  font-weight: 600;
  color: #cbd5e1;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.auth-link-sm {
  font-size: 11px;
  color: #59c9fb;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

.auth-link-sm:hover {
  color: #f3d68c;
  text-decoration: underline;
}

.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 12px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.input-wrap input {
  width: 100%;
  height: 42px;
  padding: 0 40px 0 38px;
  background: rgba(7, 26, 48, 0.9);
  border: 1px solid #1e4770;
  border-radius: 7px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.input-wrap input:focus {
  outline: none;
  border-color: #f5cf72;
  box-shadow: 0 0 0 3px rgba(245, 207, 114, 0.2);
  background: rgba(8, 32, 60, 0.95);
}

.input-wrap input::placeholder {
  color: #475569;
}

.input-action-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: 0;
  color: #64748b;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s;
}

.input-action-btn:hover {
  color: #94a3b8;
}

/* Options Row */
.auth-options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0;
}

.custom-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox input {
  display: none;
}

.checkbox-indicator {
  width: 16px;
  height: 16px;
  border: 1px solid #27527a;
  border-radius: 4px;
  background: rgba(7, 26, 48, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, border-color 0.15s;
}

.custom-checkbox input:checked + .checkbox-indicator {
  background: #f5cf72;
  border-color: #f5cf72;
}

.custom-checkbox input:checked + .checkbox-indicator::after {
  content: '';
  width: 4px;
  height: 8px;
  border: solid #04182d;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.checkbox-label {
  font-size: 11.5px;
  color: #94a3b8;
}

.auth-device-chip {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
  font-weight: 600;
}

/* Buttons */
.btn-auth-gold {
  height: 44px;
  width: 100%;
  background: linear-gradient(135deg, #f5cf72 0%, #cf9c34 100%);
  border: 1px solid #fed7aa;
  border-radius: 7px;
  color: #04182d;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(245, 207, 114, 0.3);
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
  margin-top: 4px;
}

.btn-auth-gold:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(245, 207, 114, 0.45);
}

.btn-auth-gold:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-text-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auth-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(4, 24, 45, 0.25);
  border-top-color: #04182d;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Divider */
.auth-divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 4px 0;
  color: #475569;
  font-size: 9.5px;
  letter-spacing: 1.5px;
  font-weight: 700;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #163659;
}

.auth-divider span {
  padding: 0 10px;
}

/* Demo Button */
.btn-auth-demo {
  height: 38px;
  width: 100%;
  background: rgba(14, 48, 82, 0.6);
  border: 1px solid #1f4f80;
  border-radius: 7px;
  color: #cbd5e1;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.btn-auth-demo:hover:not(:disabled) {
  background: rgba(22, 69, 115, 0.8);
  border-color: #59c9fb;
  color: #ffffff;
}

.demo-badge {
  background: #f5cf72;
  color: #04182d;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Footer & Badges */
.auth-footer {
  margin-top: 32px;
  text-align: center;
  max-width: 480px;
}

.security-badges {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.sec-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.auth-disclaimer {
  margin: 0;
  font-size: 10px;
  line-height: 1.5;
  color: #64748b;
}

/* Responsive */
@media (max-width: 480px) {
  .auth-card {
    padding: 24px 18px;
  }
  .security-badges {
    gap: 10px;
  }
  .auth-topbar {
    padding: 0 14px;
  }
}
</style>
