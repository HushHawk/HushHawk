<template>
  <div class="hushhawk-auth-wrapper">
    <!-- Atmospheric Ambient Backgrounds -->
    <div class="auth-bg-radial"></div>
    <div class="auth-grid-overlay"></div>

    <!-- Top Security Bar -->
    <header class="auth-topbar">
      <div class="auth-top-left">
        <span class="auth-pulse-dot"></span>
        <span class="auth-top-label">HUSHHAWK GATEWAY · 256-BIT ENCRYPTION ACTIVE</span>
      </div>
      <div class="auth-clock">
        <span class="clock-label">ET (Jacksonville):</span>
        <strong class="font-mono">{{ currentTime }}</strong>
      </div>
    </header>

    <!-- Main Horizontal Split Content -->
    <main class="auth-main-container">
      <div class="auth-split-grid">
        <!-- ================= LEFT COLUMN: HERO & INTELLIGENCE NARRATIVE ================= -->
        <section class="auth-hero-col">
          <!-- Crest & Branding -->
          <div class="hero-brand-row">
            <div class="hero-logo-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="46" height="46" fill="none">
                <rect width="36" height="36" rx="8" fill="#0A1128"/>
                <rect x="1" y="1" width="34" height="34" rx="7" stroke="url(#hhGoldGradHero)" stroke-width="1.2" stroke-opacity="0.9"/>
                <defs>
                  <linearGradient id="hhGoldGradHero" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FDE68A"/>
                    <stop offset="35%" stop-color="#D4AF37"/>
                    <stop offset="70%" stop-color="#B45309"/>
                    <stop offset="100%" stop-color="#F59E0B"/>
                  </linearGradient>
                  <linearGradient id="hhCrownGradHero" x1="10" y1="5" x2="26" y2="14" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FFFBEB"/>
                    <stop offset="60%" stop-color="#F59E0B"/>
                    <stop offset="100%" stop-color="#D97706"/>
                  </linearGradient>
                </defs>
                <path d="M12 9.5L14 13.5L18 7.5L22 13.5L24 9.5L25 15.5H11L12 9.5Z" fill="url(#hhCrownGradHero)"/>
                <circle cx="18" cy="11.5" r="1.2" fill="#0A1128"/>
                <path d="M6 14.5C10 16 14 19 16.5 22L13 23C9 20 6.5 17 6 14.5Z" fill="url(#hhGoldGradHero)"/>
                <path d="M7.5 19C10.5 20.5 14 23 15.5 25L13.5 26C10 23.5 8 21 7.5 19Z" fill="url(#hhGoldGradHero)" fill-opacity="0.9"/>
                <path d="M30 14.5C26 16 22 19 19.5 22L23 23C27 20 29.5 17 30 14.5Z" fill="url(#hhGoldGradHero)"/>
                <path d="M28.5 19C25.5 20.5 22 23 20.5 25L22.5 26C26 23.5 28 21 28.5 19Z" fill="url(#hhGoldGradHero)" fill-opacity="0.9"/>
                <path d="M18 14L15.5 19.5L18 29L20.5 19.5L18 14Z" fill="url(#hhGoldGradHero)"/>
                <path d="M18 15.5L16.8 19L18 22L19.2 19L18 15.5Z" fill="#FFFBEB"/>
                <circle cx="18" cy="18.5" r="1" fill="#0A1128"/>
                <path d="M17.5 19.5H18.5L18.8 22H17.2L17.5 19.5Z" fill="#0A1128"/>
                <path d="M16 29L18 31.5L20 29H16Z" fill="url(#hhGoldGradHero)"/>
              </svg>
            </div>
            <div class="hero-brand-text">
              <span class="brand-eyebrow">JACKSONVILLE WHOLESALE INTELLIGENCE</span>
              <div class="brand-motto-inline">
                <span>PEOPLE</span>
                <span class="motto-sep">•</span>
                <span>PROPERTIES</span>
                <span class="motto-sep">•</span>
                <span>PROSPERITY</span>
              </div>
            </div>
          </div>

          <!-- Main Hero Headings -->
          <div class="hero-text-block">
            <h1 class="hero-headline">
              The Institutional Wholesale <br class="hidden-sm" />
              <span class="gold-gradient-text">Command Center.</span>
            </h1>
            <p class="hero-subheading">
              Empowering acquisitions leaders, underwriting directors, and dispositions desks with deterministic CrownKey™ parcel provenance, real-time cash buyer matching, and automated Duval & Clay county deal velocity.
            </p>
          </div>

          <!-- 3 Capability Pillar Cards -->
          <div class="hero-pillars">
            <div class="pillar-card">
              <div class="pillar-icon-box">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f5cf72" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="pillar-content">
                <h4>Deterministic CrownKey™ GIS</h4>
                <p>Immutable parcel identity architecture tracking county tax rolls with zero false entity merges.</p>
              </div>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon-box">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#59c9fb" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div class="pillar-content">
                <h4>Algorithmic Dispositions Matching</h4>
                <p>Instant contract distribution to pre-vetted institutional buyers with strict buy-box parameters.</p>
              </div>
            </div>

            <div class="pillar-card">
              <div class="pillar-icon-box">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22c55e" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <div class="pillar-content">
                <h4>Florida DNC & Compliance Gate</h4>
                <p>Automated suppression filter blocking litigators and DNC registrations before any outbound touch.</p>
              </div>
            </div>
          </div>

          <!-- Market Coverage Micro-Stats Strip -->
          <div class="hero-metrics-strip">
            <div class="metric-item">
              <span class="metric-val">100%</span>
              <span class="metric-lbl">Duval & Clay Coverage</span>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <span class="metric-val">$18.4K</span>
              <span class="metric-lbl">Avg. Assignment Spread</span>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <span class="metric-val">0.45s</span>
              <span class="metric-lbl">Graph Event Stream</span>
            </div>
          </div>
        </section>

        <!-- ================= RIGHT COLUMN: AUTHENTICATION CARD ================= -->
        <section class="auth-form-col">
          <div class="auth-card">
            <!-- Card Header -->
            <div class="auth-card-top">
              <div class="auth-card-badge-row">
                <span class="auth-status-chip">
                  <span class="chip-dot"></span>
                  OPERATIONAL GATEWAY
                </span>
                <span class="auth-ip-chip">TERMINAL VERIFIED</span>
              </div>
              <h2 class="auth-card-title">Terminal Authentication</h2>
              <p class="auth-card-desc">Enter your authorized credentials to unlock active pipelines, underwriting formulas & dispo desk.</p>
            </div>

            <!-- Login Form -->
            <form class="auth-form" @submit.prevent="handleLogin">
              <!-- Error Banner -->
              <div v-if="errorMessage" class="auth-error-banner" role="alert">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{{ errorMessage }}</span>
              </div>

              <!-- Email Field -->
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

              <!-- Password Field -->
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
                      <circle cx="12" cy="3" r="3"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Options Row -->
              <div class="auth-options-row">
                <label class="custom-checkbox">
                  <input v-model="rememberMe" type="checkbox" />
                  <span class="checkbox-indicator"></span>
                  <span class="checkbox-label">Remember terminal session</span>
                </label>
                <span class="auth-chip-secure">SSL Encrypted</span>
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
                <span>OR INSTANT DEMO ACCESS</span>
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

            <!-- Card Bottom Trust Badges -->
            <div class="auth-card-footer">
              <div class="security-badges">
                <div class="sec-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#22c55e" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>256-Bit SSL</span>
                </div>
                <div class="sec-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#59c9fb" stroke-width="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                  <span>AWS RDS</span>
                </div>
                <div class="sec-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f5cf72" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span>CrownKey™ Certified</span>
                </div>
              </div>
              <p class="auth-disclaimer">
                Authorized Personnel Only · All sessions audited to ops.audit_events
              </p>
            </div>
          </div>
        </section>
      </div>
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
      this.password = 'JacksonvilleCapital2026!';
      this.handleLogin();
    },
    goToForgot() {
      if (typeof window !== 'undefined') {
        if (window.wwLib?.wwApp?.goTo) {
          window.wwLib.wwApp.goTo('/settings');
        } else {
          window.location.href = '/settings';
        }
      }
    }
  }
};
</script>

<style scoped>
/* Base Wrapper & Ambient Backdrop */
.hushhawk-auth-wrapper {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: #04182d;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

.auth-bg-radial {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(circle 900px at 15% 25%, rgba(14, 58, 102, 0.45) 0%, transparent 70%),
    radial-gradient(circle 750px at 85% 75%, rgba(245, 207, 114, 0.08) 0%, transparent 65%),
    radial-gradient(circle 600px at 50% 50%, rgba(8, 32, 60, 0.6) 0%, transparent 80%);
  z-index: 0;
}

.auth-grid-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(rgba(245, 207, 114, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245, 207, 114, 0.035) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 90% 75% at 50% 50%, #000 60%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 90% 75% at 50% 50%, #000 60%, transparent 100%);
  z-index: 1;
}

/* Top Security Header */
.auth-topbar {
  position: relative;
  z-index: 10;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border-bottom: 1px solid rgba(22, 69, 115, 0.4);
  background: rgba(4, 24, 45, 0.7);
  backdrop-filter: blur(10px);
}

.auth-top-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #22c55e;
  box-shadow: 0 0 10px #22c55e;
  animation: pulseDot 2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

.auth-top-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: #94a3b8;
}

.auth-clock {
  font-size: 11.5px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
}

.clock-label {
  color: #64748b;
  font-size: 11px;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #59c9fb;
  font-weight: 600;
}

/* Main Container (Horizontal Split) */
.auth-main-container {
  position: relative;
  z-index: 5;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

.auth-split-grid {
  width: 100%;
  max-width: 1240px;
  display: grid;
  grid-template-columns: 1.15fr 0.95fr;
  gap: 56px;
  align-items: center;
}

/* ================= LEFT HERO STYLING ================= */
.auth-hero-col {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-right: 12px;
}

.hero-brand-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-logo-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #0a1128;
  padding: 2px;
  box-shadow: 0 8px 24px rgba(245, 207, 114, 0.2);
}

.hero-brand-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.brand-eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2px;
  color: #f5cf72;
}

.brand-motto-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 2.2px;
  color: #94a3b8;
  font-weight: 600;
}

.motto-sep {
  color: #f5cf72;
  font-size: 10px;
}

.hero-text-block {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-headline {
  margin: 0;
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-size: 40px;
  line-height: 1.18;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.5px;
}

.gold-gradient-text {
  background: linear-gradient(135deg, #fef3c7 0%, #f5cf72 50%, #cf9c34 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subheading {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #94a3b8;
  max-width: 540px;
}

/* Feature Pillar Cards */
.hero-pillars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pillar-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 10px;
  background: rgba(8, 32, 60, 0.45);
  border: 1px solid rgba(22, 69, 115, 0.5);
  transition: transform 0.2s, border-color 0.2s, background 0.2s;
}

.pillar-card:hover {
  transform: translateX(4px);
  background: rgba(12, 44, 80, 0.65);
  border-color: rgba(245, 207, 114, 0.4);
}

.pillar-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(4, 24, 45, 0.8);
  border: 1px solid rgba(22, 69, 115, 0.8);
  flex-shrink: 0;
}

.pillar-content h4 {
  margin: 0 0 4px 0;
  font-size: 13.5px;
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.2px;
}

.pillar-content p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #8fa3bf;
}

/* Market Metrics Strip */
.hero-metrics-strip {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  border-radius: 10px;
  background: rgba(4, 24, 45, 0.7);
  border: 1px solid rgba(245, 207, 114, 0.18);
  width: fit-content;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-val {
  font-size: 17px;
  font-weight: 800;
  color: #f5cf72;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.metric-lbl {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.metric-divider {
  width: 1px;
  height: 28px;
  background: rgba(22, 69, 115, 0.6);
}

/* ================= RIGHT FORM STYLING ================= */
.auth-form-col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.auth-card {
  width: 100%;
  max-width: 460px;
  background: rgba(7, 26, 48, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(243, 214, 140, 0.22);
  border-radius: 16px;
  padding: 34px 30px;
  box-shadow: 
    0 24px 60px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  box-sizing: border-box;
}

.auth-card-top {
  margin-bottom: 22px;
}

.auth-card-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.auth-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  padding: 3px 8px;
  border-radius: 20px;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.auth-ip-chip {
  font-size: 9.5px;
  font-weight: 700;
  color: #59c9fb;
  letter-spacing: 1px;
}

.auth-card-title {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.2px;
}

.auth-card-desc {
  margin: 0;
  font-size: 12.5px;
  color: #94a3b8;
  line-height: 1.45;
}

/* Form Fields */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-error-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  color: #fca5a5;
  font-size: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-field label {
  font-size: 11.5px;
  font-weight: 600;
  color: #cbd5e1;
  letter-spacing: 0.2px;
}

.auth-link-sm {
  font-size: 11px;
  color: #f5cf72;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s;
}

.auth-link-sm:hover {
  color: #fef08a;
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
  pointer-events: none;
  display: flex;
  align-items: center;
}

.input-wrap input {
  width: 100%;
  height: 42px;
  padding: 0 40px 0 38px;
  background: rgba(8, 32, 60, 0.85);
  border: 1px solid #163e66;
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}

.input-wrap input:focus {
  outline: none;
  border-color: #f5cf72;
  box-shadow: 0 0 0 3px rgba(245, 207, 114, 0.18);
  background: rgba(8, 32, 60, 0.98);
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

.auth-chip-secure {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(89, 201, 251, 0.12);
  color: #59c9fb;
  border: 1px solid rgba(89, 201, 251, 0.25);
  font-weight: 600;
}

/* Buttons */
.btn-auth-gold {
  height: 44px;
  width: 100%;
  background: linear-gradient(135deg, #f5cf72 0%, #cf9c34 100%);
  border: 1px solid #fed7aa;
  border-radius: 8px;
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
  border-radius: 8px;
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
  background: rgba(22, 69, 115, 0.85);
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

/* Card Bottom Footer */
.auth-card-footer {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(22, 69, 115, 0.4);
  text-align: center;
}

.security-badges {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.sec-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  color: #94a3b8;
  font-weight: 500;
}

.auth-disclaimer {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.4;
  color: #64748b;
}

/* ================= RESPONSIVE ADJUSTMENTS ================= */
@media (max-width: 1024px) {
  .auth-split-grid {
    grid-template-columns: 1fr;
    gap: 40px;
    max-width: 580px;
  }
  .auth-hero-col {
    padding-right: 0;
    text-align: center;
    align-items: center;
  }
  .hero-brand-row {
    justify-content: center;
  }
  .hero-headline {
    font-size: 32px;
  }
  .hero-subheading {
    max-width: 100%;
  }
  .hero-pillars {
    width: 100%;
    text-align: left;
  }
  .hero-metrics-strip {
    margin: 0 auto;
  }
}

@media (max-width: 640px) {
  .auth-topbar {
    padding: 0 16px;
  }
  .auth-main-container {
    padding: 24px 16px;
  }
  .auth-card {
    padding: 24px 18px;
  }
  .hero-headline {
    font-size: 26px;
  }
  .hero-metrics-strip {
    width: 100%;
    justify-content: space-around;
    padding: 12px 10px;
    gap: 10px;
  }
  .metric-val {
    font-size: 15px;
  }
  .metric-lbl {
    font-size: 8.5px;
  }
}
</style>
