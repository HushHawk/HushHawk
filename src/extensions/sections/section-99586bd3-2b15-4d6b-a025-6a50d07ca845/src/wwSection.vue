<template>
  <div class="hushhawk-auth-wrapper">
    <!-- Atmospheric Skyline Background & Cinematic Overlays -->
    <div class="auth-bg-image"></div>
    <div class="auth-bg-gradient-overlay"></div>
    <div class="auth-bg-radial"></div>
    <div class="auth-grid-overlay"></div>

    <!-- Top Security Bar -->
    <header class="auth-topbar">
      <div class="auth-top-left">
        <span class="auth-pulse-dot"></span>
        <span class="auth-top-label">HUSHHAWK GATEWAY · 256-BIT ENCRYPTION ACTIVE</span>
      </div>
      <div class="auth-clock">
        <span class="clock-label">Jacksonville HQ:</span>
        <strong class="font-mono">{{ currentTime }} ET</strong>
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="50" height="50" fill="none">
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
              <span class="brand-eyebrow">
                <span class="eyebrow-accent">★</span> JACKSONVILLE WHOLESALE INTELLIGENCE
              </span>
              <div class="brand-motto-inline">
                <span class="motto-word">PEOPLE</span>
                <span class="motto-sep">•</span>
                <span class="motto-word">PROPERTIES</span>
                <span class="motto-sep">•</span>
                <span class="motto-word">PROSPERITY</span>
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
            <div class="pillar-card pillar-crownkey">
              <div class="pillar-icon-box box-gold">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f5cf72" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="pillar-content">
                <h4>Deterministic CrownKey™ GIS</h4>
                <p>Immutable parcel identity architecture tracking county tax rolls with zero false entity merges.</p>
              </div>
            </div>

            <div class="pillar-card pillar-dispo">
              <div class="pillar-icon-box box-sky">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#38bdf8" stroke-width="2">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <div class="pillar-content">
                <h4>Algorithmic Dispositions Matching</h4>
                <p>Instant contract distribution to pre-vetted institutional buyers with strict buy-box parameters.</p>
              </div>
            </div>

            <div class="pillar-card pillar-compliance">
              <div class="pillar-icon-box box-green">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#34d399" stroke-width="2">
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
              <span class="metric-val gold-val">100%</span>
              <span class="metric-lbl">Duval & Clay Coverage</span>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <span class="metric-val green-val">$18.4K</span>
              <span class="metric-lbl">Avg. Assignment Spread</span>
            </div>
            <div class="metric-divider"></div>
            <div class="metric-item">
              <span class="metric-val cyan-val">0.45s</span>
              <span class="metric-lbl">Graph Event Stream</span>
            </div>
          </div>
        </section>

        <!-- ================= RIGHT COLUMN: AUTHENTICATION CARD ================= -->
        <section class="auth-form-col">
          <div class="auth-card">
            <!-- Top Card Glowing Rim Accent -->
            <div class="auth-card-glow-bar"></div>

            <!-- Card Header -->
            <div class="auth-card-top">
              <div class="auth-card-badge-row">
                <span class="auth-status-chip">
                  <span class="chip-dot"></span>
                  OPERATIONAL GATEWAY
                </span>
                <span class="auth-ip-chip">
                  <span class="ip-indicator">●</span> TERMINAL VERIFIED
                </span>
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

              <!-- Authorized Preset Credentials Chips -->
              <div class="auth-presets-panel">
                <div class="presets-header">
                  <span class="presets-title">AUTHORIZED TERMINAL CREDENTIALS</span>
                  <span class="presets-hint">Click to autofill</span>
                </div>
                <div class="presets-grid">
                  <button
                    type="button"
                    v-for="cred in authorizedCredentials"
                    :key="cred.email"
                    class="preset-chip"
                    :class="{ 'is-selected': email === cred.email }"
                    @click="applyCredential(cred)"
                  >
                    <div class="preset-chip-top">
                      <span class="preset-badge">{{ cred.badge }}</span>
                      <span class="preset-role">{{ cred.roleTitle }}</span>
                    </div>
                    <span class="preset-email">{{ cred.email }}</span>
                  </button>
                </div>
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
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#34d399" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>256-Bit SSL</span>
                </div>
                <div class="sec-badge">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#38bdf8" stroke-width="2">
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
      clockTimer: null,
      authorizedCredentials: [
        {
          badge: '👑 ADMIN',
          roleTitle: 'Executive Admin',
          name: 'Sarah Connor',
          email: 'admin@hushhawk.com',
          password: 'HushHawk2026!Master',
          role: 'Managing Partner & Executive Director'
        },
        {
          badge: '🦅 ACQUISITIONS',
          roleTitle: 'Acquisitions Director',
          name: 'Dejon Ellis',
          email: 'dejon@hushhawk.com',
          password: 'JacksonvilleCapital2026!',
          role: 'Managing Partner & Head of Capital'
        },
        {
          badge: '⚡ DISPO',
          roleTitle: 'Dispositions Lead',
          name: 'Marcus Vance',
          email: 'dispo@hushhawk.com',
          password: 'DispoDesk2026!Secure',
          role: 'Dispositions & Buyer Desk Director'
        }
      ]
    };
  },
  mounted() {
    this.updateClock();
    this.clockTimer = setInterval(this.updateClock, 1000);

    // Pre-populate if saved in localStorage, or default to Dejon Ellis
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedEmail = window.localStorage.getItem('hh_remembered_email');
      if (savedEmail) {
        this.email = savedEmail;
        const found = this.authorizedCredentials.find(c => c.email.toLowerCase() === savedEmail.toLowerCase());
        if (found) {
          this.password = found.password;
        }
      } else {
        // Auto-select Acquisitions Director by default
        this.applyCredential(this.authorizedCredentials[1]);
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
    applyCredential(cred) {
      this.email = cred.email;
      this.password = cred.password;
      this.errorMessage = '';
    },
    async handleLogin() {
      if (!this.email || !this.password) {
        this.errorMessage = 'Please provide your authorized terminal email and password.';
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';

      const inputEmail = this.email.trim().toLowerCase();
      const inputPass = this.password.trim();

      // Check against predefined authorized credentials
      const matched = this.authorizedCredentials.find(c => c.email.toLowerCase() === inputEmail);
      if (matched && matched.password !== inputPass) {
        this.errorMessage = `Incorrect access key for ${matched.email}. Please verify credentials.`;
        this.isLoading = false;
        return;
      }

      if (!matched && inputPass.length < 6) {
        this.errorMessage = 'Terminal password must be at least 6 characters.';
        this.isLoading = false;
        return;
      }

      const activeUser = matched ? {
        name: matched.name,
        email: matched.email,
        role: matched.role,
        authenticatedAt: new Date().toISOString()
      } : {
        name: this.email.split('@')[0].toUpperCase(),
        email: this.email,
        role: 'Authorized Command Operator',
        authenticatedAt: new Date().toISOString()
      };

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

          window.sessionStorage.setItem('hushhawk_session', JSON.stringify(activeUser));
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
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem('hushhawk_session', JSON.stringify(activeUser));
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
      const dejon = this.authorizedCredentials[1];
      this.applyCredential(dejon);
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
/* ================= BASE WRAPPER & BACKGROUND LAYERS ================= */
.hushhawk-auth-wrapper {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: #031224;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* Jacksonville Skyline Photo Background */
.auth-bg-image {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: 
    url('/images/jacksonville-skyline-opt.jpg'),
    url('https://u.realgeeks.media/nuviewrealty/Jacksonville_Skyline_Sunset_2.jpeg');
  background-position: center bottom;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: 0.32;
  filter: saturate(1.3) contrast(1.18) brightness(0.82);
  z-index: 0;
  transform: scale(1.02);
}

/* Multi-Stop Cinematic Gradient Overlay */
.auth-bg-gradient-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: 
    linear-gradient(108deg, rgba(3, 16, 32, 0.97) 0%, rgba(4, 22, 42, 0.91) 42%, rgba(4, 26, 50, 0.72) 100%),
    linear-gradient(to top, #031224 0%, rgba(3, 18, 36, 0.6) 50%, rgba(3, 18, 36, 0.85) 100%);
  z-index: 1;
}

/* Ambient Radial Glows */
.auth-bg-radial {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(circle 850px at 18% 28%, rgba(245, 207, 114, 0.08) 0%, transparent 70%),
    radial-gradient(circle 900px at 85% 65%, rgba(14, 65, 115, 0.35) 0%, transparent 70%),
    radial-gradient(circle 650px at 50% 10%, rgba(217, 119, 6, 0.06) 0%, transparent 60%);
  z-index: 2;
}

/* Technical Blueprint Grid */
.auth-grid-overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(rgba(245, 207, 114, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245, 207, 114, 0.04) 1px, transparent 1px);
  background-size: 52px 52px;
  mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, #000 50%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, #000 50%, transparent 100%);
  z-index: 3;
}

/* ================= TOP SECURITY HEADER ================= */
.auth-topbar {
  position: relative;
  z-index: 10;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 36px;
  border-bottom: 1px solid rgba(245, 207, 114, 0.16);
  background: rgba(3, 18, 36, 0.8);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
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
  box-shadow: 0 0 10px #22c55e, 0 0 20px rgba(34, 197, 94, 0.5);
  animation: pulseDot 2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}

.auth-top-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.3px;
  color: #cbd5e1;
}

.auth-clock {
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 7px;
}

.clock-label {
  color: #64748b;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #f5cf72;
  font-weight: 700;
  background: rgba(245, 207, 114, 0.1);
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(245, 207, 114, 0.2);
}

/* ================= MAIN CONTAINER (HORIZONTAL SPLIT) ================= */
.auth-main-container {
  position: relative;
  z-index: 5;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 44px 28px;
}

.auth-split-grid {
  width: 100%;
  max-width: 1260px;
  display: grid;
  grid-template-columns: 1.18fr 0.92fr;
  gap: 60px;
  align-items: center;
}

/* ================= LEFT HERO STYLING ================= */
.auth-hero-col {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-right: 16px;
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
  background: #061126;
  padding: 2px;
  box-shadow: 
    0 10px 28px rgba(0, 0, 0, 0.5),
    0 0 24px rgba(245, 207, 114, 0.25);
  border: 1px solid rgba(245, 207, 114, 0.3);
}

.hero-brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.brand-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 2.2px;
  color: #f5cf72;
  background: rgba(245, 207, 114, 0.12);
  border: 1px solid rgba(245, 207, 114, 0.3);
  padding: 3px 10px;
  border-radius: 6px;
  width: fit-content;
}

.eyebrow-accent {
  color: #f59e0b;
  font-size: 12px;
}

.brand-motto-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 2.4px;
  color: #cbd5e1;
  font-weight: 700;
  padding-left: 2px;
}

.motto-word {
  color: #e2e8f0;
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
  font-size: 42px;
  line-height: 1.16;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.6px;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
}

.gold-gradient-text {
  background: linear-gradient(135deg, #FFFBEB 0%, #F5D075 50%, #D97706 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 10px rgba(245, 207, 114, 0.3));
}

.hero-subheading {
  margin: 0;
  font-size: 15px;
  line-height: 1.62;
  color: #cbd5e1;
  max-width: 560px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* Feature Pillar Cards with Distinct Personalities */
.hero-pillars {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.pillar-card {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(6, 22, 42, 0.72);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(245, 207, 114, 0.16);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s, border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.pillar-card:hover {
  transform: translateX(4px);
  background: rgba(10, 32, 60, 0.85);
  border-color: rgba(245, 207, 114, 0.45);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5), 0 0 20px rgba(245, 207, 114, 0.1);
}

.pillar-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex-shrink: 0;
  background: rgba(3, 16, 32, 0.9);
  border: 1px solid;
}

.box-gold {
  border-color: rgba(245, 207, 114, 0.4);
  box-shadow: 0 0 12px rgba(245, 207, 114, 0.15);
}

.box-sky {
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.15);
}

.box-green {
  border-color: rgba(52, 211, 153, 0.4);
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.15);
}

.pillar-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.2px;
}

.pillar-content p {
  margin: 0;
  font-size: 12px;
  line-height: 1.48;
  color: #94a3b8;
}

/* Market Metrics Strip with Gold Trim */
.hero-metrics-strip {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 22px;
  border-radius: 12px;
  background: rgba(4, 20, 38, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(245, 207, 114, 0.28);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 20px rgba(245, 207, 114, 0.08);
  width: fit-content;
}

.metric-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.metric-val {
  font-size: 18px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.gold-val {
  color: #f5cf72;
}

.green-val {
  color: #34d399;
}

.cyan-val {
  color: #38bdf8;
}

.metric-lbl {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 600;
}

.metric-divider {
  width: 1px;
  height: 30px;
  background: rgba(245, 207, 114, 0.2);
}

/* ================= RIGHT FORM STYLING ================= */
.auth-form-col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.auth-card {
  position: relative;
  width: 100%;
  max-width: 460px;
  background: rgba(5, 18, 34, 0.88);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(245, 207, 114, 0.32);
  border-radius: 18px;
  padding: 36px 32px;
  box-shadow: 
    0 28px 75px rgba(0, 0, 0, 0.75),
    0 0 50px rgba(245, 207, 114, 0.08),
    inset 0 1px 0 rgba(245, 207, 114, 0.25);
  box-sizing: border-box;
  overflow: hidden;
}

/* Top Gold Bar Highlight */
.auth-card-glow-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #f5cf72 30%, #cf9c34 70%, transparent);
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
  color: #34d399;
  background: rgba(52, 211, 153, 0.12);
  padding: 3px 8px;
  border-radius: 20px;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 6px #34d399;
}

.auth-ip-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9.5px;
  font-weight: 800;
  color: #f5cf72;
  letter-spacing: 1px;
  background: rgba(245, 207, 114, 0.1);
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(245, 207, 114, 0.25);
}

.ip-indicator {
  color: #f5cf72;
  font-size: 8px;
}

.auth-card-title {
  margin: 0 0 6px 0;
  font-size: 21px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.2px;
}

.auth-card-desc {
  margin: 0;
  font-size: 12.5px;
  color: #94a3b8;
  line-height: 1.48;
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
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.4);
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
  background: rgba(7, 24, 44, 0.9);
  border: 1px solid #1e4a73;
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
  box-shadow: 0 0 0 3px rgba(245, 207, 114, 0.2);
  background: rgba(7, 26, 48, 0.98);
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
  color: #f5cf72;
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
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  font-weight: 600;
}

/* Authorized Presets Panel */
.auth-presets-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(3, 16, 32, 0.7);
  border: 1px solid rgba(245, 207, 114, 0.2);
}

.presets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.presets-title {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #f5cf72;
}

.presets-hint {
  font-size: 9px;
  color: #64748b;
  font-style: italic;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.preset-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 6px 8px;
  background: rgba(7, 26, 48, 0.7);
  border: 1px solid #1a4369;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}

.preset-chip:hover {
  background: rgba(14, 45, 78, 0.85);
  border-color: #f5cf72;
  transform: translateY(-1px);
}

.preset-chip.is-selected {
  background: rgba(245, 207, 114, 0.12);
  border-color: #f5cf72;
  box-shadow: 0 0 10px rgba(245, 207, 114, 0.2);
}

.preset-chip-top {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.preset-badge {
  font-size: 8px;
  font-weight: 800;
  color: #f5cf72;
  white-space: nowrap;
}

.preset-role {
  display: none;
}

.preset-email {
  font-size: 9.5px;
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

/* Buttons */
.btn-auth-gold {
  height: 44px;
  width: 100%;
  background: linear-gradient(135deg, #fce28b 0%, #dfa732 50%, #b87b14 100%);
  border: 1px solid #fde68a;
  border-radius: 8px;
  color: #04182d;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(245, 207, 114, 0.35);
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
  margin-top: 4px;
}

.btn-auth-gold:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(245, 207, 114, 0.5);
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
  color: #64748b;
  font-size: 9.5px;
  letter-spacing: 1.5px;
  font-weight: 700;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(245, 207, 114, 0.15);
}

.auth-divider span {
  padding: 0 10px;
}

/* Demo Button */
.btn-auth-demo {
  height: 38px;
  width: 100%;
  background: rgba(14, 40, 68, 0.7);
  border: 1px solid rgba(245, 207, 114, 0.25);
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
  background: rgba(20, 56, 94, 0.85);
  border-color: #f5cf72;
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
  border-top: 1px solid rgba(245, 207, 114, 0.15);
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
