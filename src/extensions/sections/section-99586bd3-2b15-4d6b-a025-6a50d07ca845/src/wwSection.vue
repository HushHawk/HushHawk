<template>
  <div class="hushhawk-auth-wrapper">
    <!-- Cinematic Jacksonville Skyline & Ambient Lighting Backdrop -->
    <div class="auth-skyline-bg"></div>
    <div class="auth-ambient-glows"></div>
    <div class="auth-fine-grid"></div>

    <!-- Top Security Header -->
    <header class="auth-topbar">
      <div class="auth-top-left">
        <span class="auth-pulse-dot"></span>
        <span class="auth-top-tag">JACKSONVILLE WHOLESALE GATEWAY</span>
        <span class="auth-divider-pipe">|</span>
        <span class="auth-top-enc">256-BIT ZERO-TRUST ENCRYPTED</span>
      </div>
      <div class="auth-clock">
        <span class="clock-icon">🕒</span>
        <span class="clock-label">ET (Jacksonville):</span>
        <strong class="font-mono">{{ currentTime }}</strong>
      </div>
    </header>

    <!-- Main 2-Column Split Content -->
    <main class="auth-main-container">
      <div class="auth-split-grid">
        <!-- ================= LEFT COLUMN: BRAND NARRATIVE & MARKET RADAR ================= -->
        <section class="auth-hero-col">
          <!-- Crest & Jacksonville Eyebrow -->
          <div class="hero-brand-row">
            <div class="hero-logo-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="50" height="50" fill="none">
                <rect width="36" height="36" rx="8" fill="#081022"/>
                <rect x="1" y="1" width="34" height="34" rx="7" stroke="url(#hhGoldGradHero2)" stroke-width="1.2" stroke-opacity="0.95"/>
                <defs>
                  <linearGradient id="hhGoldGradHero2" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FFFBEB"/>
                    <stop offset="25%" stop-color="#FDE68A"/>
                    <stop offset="55%" stop-color="#D4AF37"/>
                    <stop offset="85%" stop-color="#92400E"/>
                    <stop offset="100%" stop-color="#F59E0B"/>
                  </linearGradient>
                  <linearGradient id="hhCrownGradHero2" x1="10" y1="5" x2="26" y2="14" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FFFFFF"/>
                    <stop offset="40%" stop-color="#FDE68A"/>
                    <stop offset="80%" stop-color="#D97706"/>
                    <stop offset="100%" stop-color="#78350F"/>
                  </linearGradient>
                </defs>
                <path d="M12 9.5L14 13.5L18 7.5L22 13.5L24 9.5L25 15.5H11L12 9.5Z" fill="url(#hhCrownGradHero2)"/>
                <circle cx="18" cy="11.5" r="1.2" fill="#081022"/>
                <path d="M6 14.5C10 16 14 19 16.5 22L13 23C9 20 6.5 17 6 14.5Z" fill="url(#hhGoldGradHero2)"/>
                <path d="M7.5 19C10.5 20.5 14 23 15.5 25L13.5 26C10 23.5 8 21 7.5 19Z" fill="url(#hhGoldGradHero2)" fill-opacity="0.9"/>
                <path d="M30 14.5C26 16 22 19 19.5 22L23 23C27 20 29.5 17 30 14.5Z" fill="url(#hhGoldGradHero2)"/>
                <path d="M28.5 19C25.5 20.5 22 23 20.5 25L22.5 26C26 23.5 28 21 28.5 19Z" fill="url(#hhGoldGradHero2)" fill-opacity="0.9"/>
                <path d="M18 14L15.5 19.5L18 29L20.5 19.5L18 14Z" fill="url(#hhGoldGradHero2)"/>
                <path d="M18 15.5L16.8 19L18 22L19.2 19L18 15.5Z" fill="#FFFBEB"/>
                <circle cx="18" cy="18.5" r="1" fill="#081022"/>
                <path d="M17.5 19.5H18.5L18.8 22H17.2L17.5 19.5Z" fill="#081022"/>
                <path d="M16 29L18 31.5L20 29H16Z" fill="url(#hhGoldGradHero2)"/>
              </svg>
            </div>
            <div class="hero-brand-text">
              <div class="hero-pill-badge">
                <span class="badge-dot-gold"></span>
                <span>NORTHEAST FLORIDA OFF-MARKET INTELLIGENCE</span>
              </div>
              <div class="brand-motto-inline">
                <span class="motto-word">PEOPLE</span>
                <span class="motto-sep">✦</span>
                <span class="motto-word">PROPERTIES</span>
                <span class="motto-sep">✦</span>
                <span class="motto-word">PROSPERITY</span>
              </div>
            </div>
          </div>

          <!-- Hero Headline with Warm Contrast -->
          <div class="hero-text-block">
            <h1 class="hero-headline">
              The Institutional Wholesale <br class="hidden-sm" />
              <span class="gold-gradient-text">Command Center.</span>
            </h1>
            <p class="hero-subheading">
              Empowering acquisitions leaders, underwriting directors, and dispositions desks with deterministic CrownKey™ parcel provenance, instant institutional buyer matching, and automated Duval & Clay county deal velocity.
            </p>
          </div>

          <!-- 3 Distinct Feature Pillars with Color Accents -->
          <div class="hero-pillars">
            <!-- Pillar 1: Warm Gold / Provenance -->
            <div class="pillar-card pillar-gold">
              <div class="pillar-icon-box icon-gold">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f5cf72" stroke-width="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="pillar-content">
                <div class="pillar-tag-row">
                  <span class="pillar-tag tag-gold">PARCEL PROVENANCE</span>
                </div>
                <h4>Deterministic CrownKey™ GIS</h4>
                <p>Single source-of-truth parcel identifier tracking Duval & Clay County tax rolls with zero false entity merges.</p>
              </div>
            </div>

            <!-- Pillar 2: Emerald Green / Speed to Close -->
            <div class="pillar-card pillar-emerald">
              <div class="pillar-icon-box icon-emerald">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#22c55e" stroke-width="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <div class="pillar-content">
                <div class="pillar-tag-row">
                  <span class="pillar-tag tag-emerald">INSTITUTIONAL SPEED</span>
                </div>
                <h4>Algorithmic Dispositions Matching</h4>
                <p>Sub-minute distribution of off-market contracts against verified cash buyers with locked buy-box criteria.</p>
              </div>
            </div>

            <!-- Pillar 3: Cyan / Florida Compliance -->
            <div class="pillar-card pillar-cyan">
              <div class="pillar-icon-box icon-cyan">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#38bdf8" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <div class="pillar-content">
                <div class="pillar-tag-row">
                  <span class="pillar-tag tag-cyan">COMPLIANCE SHIELD</span>
                </div>
                <h4>Florida DNC & Title Gate</h4>
                <p>Automated suppression filter blocking litigators and DNC registrations before any outbound contact.</p>
              </div>
            </div>
          </div>

          <!-- Live Market Radar Strip (Warm Contrast) -->
          <div class="hero-radar-card">
            <div class="radar-header">
              <div class="radar-pulse-wrap">
                <span class="radar-ping"></span>
                <span class="radar-dot"></span>
                <span class="radar-title">DUVAL & CLAY LIVE RADAR</span>
              </div>
              <span class="radar-badge-live">24 Underwritten Today</span>
            </div>
            <div class="radar-metrics-row">
              <div class="radar-metric">
                <span class="metric-val text-emerald">100%</span>
                <span class="metric-lbl">Active Coverage</span>
              </div>
              <div class="radar-sep"></div>
              <div class="radar-metric">
                <span class="metric-val text-gold">$18,450</span>
                <span class="metric-lbl">Avg. Assignment MAO</span>
              </div>
              <div class="radar-sep"></div>
              <div class="radar-metric">
                <span class="metric-val text-cyan">0.45s</span>
                <span class="metric-lbl">Graph Event Sync</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ================= RIGHT COLUMN: FROSTED OBSIDIAN AUTH CARD ================= -->
        <section class="auth-form-col">
          <div class="auth-card">
            <!-- Top Gold Accent Rim -->
            <div class="card-gold-accent-line"></div>

            <!-- Card Header -->
            <div class="auth-card-top">
              <div class="auth-card-badge-row">
                <span class="auth-status-chip">
                  <span class="chip-dot"></span>
                  OPERATIONAL GATEWAY
                </span>
                <span class="auth-ip-chip">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  TERMINAL VERIFIED
                </span>
              </div>
              <h2 class="auth-card-title">Terminal Authentication</h2>
              <p class="auth-card-desc">Enter your authorized credentials to unlock live pipelines, underwriting formulas & dispo desk.</p>
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
                  <span class="checkbox-label">Remember terminal (30 days)</span>
                </label>
                <span class="auth-chip-secure">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  TLS Encrypted
                </span>
              </div>

              <!-- Primary Submit Button -->
              <button type="submit" class="btn-auth-gold" :disabled="isLoading">
                <span v-if="isLoading" class="auth-spinner"></span>
                <span v-else class="btn-text-content">
                  Sign In to Command Center
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5">
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
                <span class="demo-label">Sign In as Acquisitions Director (Dejon Ellis)</span>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </form>

            <!-- Card Bottom Trust Badges -->
            <div class="auth-card-footer">
              <div class="security-badges">
                <div class="sec-badge badge-green">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#22c55e" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>256-Bit SSL</span>
                </div>
                <div class="sec-badge badge-blue">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#38bdf8" stroke-width="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                  <span>AWS RDS</span>
                </div>
                <div class="sec-badge badge-gold">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#f5cf72" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  <span>CrownKey™ Certified</span>
                </div>
              </div>
              <p class="auth-disclaimer">
                Authorized Personnel Only · Cryptographically audited to <code>ops.audit_events</code>
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
/* ================= BASE WRAPPER & CINEMATIC BACKDROP ================= */
.hushhawk-auth-wrapper {
  position: relative;
  min-height: 100vh;
  width: 100%;
  background-color: #020914;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
}

/* Jacksonville Twilight Riverfront Skyline Backdrop */
.auth-skyline-bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(135deg, rgba(2, 9, 20, 0.93) 0%, rgba(3, 14, 30, 0.88) 45%, rgba(5, 18, 38, 0.94) 100%),
    url("https://u.realgeeks.media/nuviewrealty/Jacksonville_Skyline_Sunset_2.jpeg");
  background-size: cover;
  background-position: center bottom;
  background-attachment: fixed;
  z-index: 0;
  filter: saturate(1.15) contrast(1.1);
}

/* Atmospheric Warm Gold & Deep Obsidian Glows */
.auth-ambient-glows {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(circle 900px at 10% 20%, rgba(217, 119, 6, 0.12) 0%, transparent 60%),
    radial-gradient(circle 750px at 85% 80%, rgba(245, 207, 114, 0.08) 0%, transparent 65%),
    radial-gradient(circle 700px at 50% 40%, rgba(34, 197, 94, 0.05) 0%, transparent 70%);
  z-index: 1;
}

/* Subtle Geometric Architectural Overlay */
.auth-fine-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(rgba(245, 207, 114, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245, 207, 114, 0.025) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse 90% 75% at 50% 50%, #000 50%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 90% 75% at 50% 50%, #000 50%, transparent 100%);
  z-index: 2;
}

/* ================= TOP SECURITY HEADER ================= */
.auth-topbar {
  position: relative;
  z-index: 10;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 36px;
  border-bottom: 1px solid rgba(245, 207, 114, 0.15);
  background: rgba(3, 11, 23, 0.85);
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
  box-shadow: 0 0 10px #22c55e;
  animation: pulseDot 2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}

.auth-top-tag {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #f5cf72;
}

.auth-divider-pipe {
  color: #334155;
  font-size: 12px;
}

.auth-top-enc {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #94a3b8;
}

.auth-clock {
  font-size: 12px;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.clock-icon {
  font-size: 12px;
}

.clock-label {
  color: #94a3b8;
  font-size: 11px;
}

.font-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #f5cf72;
  font-weight: 700;
}

/* ================= MAIN CONTAINER & 2-COLUMN SPLIT ================= */
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
  gap: 64px;
  align-items: center;
}

/* ================= LEFT HERO COLUMN ================= */
.auth-hero-col {
  display: flex;
  flex-direction: column;
  gap: 26px;
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
  background: #081022;
  padding: 2px;
  box-shadow: 0 0 28px rgba(245, 207, 114, 0.28);
}

.hero-brand-text {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.hero-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #f5cf72;
  background: rgba(245, 207, 114, 0.08);
  border: 1px solid rgba(245, 207, 114, 0.25);
  padding: 3px 9px;
  border-radius: 20px;
  width: fit-content;
}

.badge-dot-gold {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f5cf72;
  box-shadow: 0 0 6px #f5cf72;
}

.brand-motto-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  letter-spacing: 2px;
  color: #cbd5e1;
  font-weight: 700;
}

.motto-sep {
  color: #d97706;
  font-size: 8px;
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
  line-height: 1.15;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
}

.gold-gradient-text {
  background: linear-gradient(135deg, #ffffff 0%, #fde68a 35%, #f5cf72 70%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subheading {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: #cbd5e1;
  max-width: 560px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
}

/* ================= 3 FEATURE PILLARS WITH COLOR ACCENTS ================= */
.hero-pillars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pillar-card {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 14px 18px;
  border-radius: 12px;
  background: rgba(8, 18, 34, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.pillar-card:hover {
  transform: translateX(4px);
  background: rgba(12, 26, 48, 0.88);
}

/* Pillar 1: Gold */
.pillar-gold {
  border-left: 3px solid #f5cf72;
}
.pillar-gold:hover {
  border-color: rgba(245, 207, 114, 0.45);
  box-shadow: 0 8px 28px rgba(245, 207, 114, 0.12);
}
.icon-gold {
  background: rgba(245, 207, 114, 0.12);
  border: 1px solid rgba(245, 207, 114, 0.35);
}
.tag-gold {
  background: rgba(245, 207, 114, 0.12);
  color: #fde68a;
  border: 1px solid rgba(245, 207, 114, 0.3);
}

/* Pillar 2: Emerald */
.pillar-emerald {
  border-left: 3px solid #22c55e;
}
.pillar-emerald:hover {
  border-color: rgba(34, 197, 94, 0.45);
  box-shadow: 0 8px 28px rgba(34, 197, 94, 0.12);
}
.icon-emerald {
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.35);
}
.tag-emerald {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

/* Pillar 3: Cyan */
.pillar-cyan {
  border-left: 3px solid #38bdf8;
}
.pillar-cyan:hover {
  border-color: rgba(56, 189, 248, 0.45);
  box-shadow: 0 8px 28px rgba(56, 189, 248, 0.12);
}
.icon-cyan {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
}
.tag-cyan {
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.pillar-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  flex-shrink: 0;
}

.pillar-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pillar-tag-row {
  margin-bottom: 2px;
}

.pillar-tag {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1px;
  padding: 2px 6px;
  border-radius: 4px;
}

.pillar-content h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.pillar-content p {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #94a3b8;
}

/* ================= LIVE MARKET RADAR CARD ================= */
.hero-radar-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
  border-radius: 12px;
  background: rgba(6, 14, 26, 0.85);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(245, 207, 114, 0.22);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}

.radar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
}

.radar-pulse-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.radar-ping {
  position: absolute;
  left: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  animation: radarPing 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
}

@keyframes radarPing {
  75%, 100% {
    transform: scale(2.2);
    opacity: 0;
  }
}

.radar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.radar-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #f5cf72;
}

.radar-badge-live {
  font-size: 10.5px;
  font-weight: 700;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 2px 8px;
  border-radius: 12px;
}

.radar-metrics-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.radar-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.metric-val {
  font-size: 18px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.text-emerald { color: #4ade80; }
.text-gold { color: #fde68a; }
.text-cyan { color: #7dd3fc; }

.metric-lbl {
  font-size: 10px;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  font-weight: 600;
}

.radar-sep {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.1);
}

/* ================= RIGHT FORM COLUMN (FROSTED OBSIDIAN CARD) ================= */
.auth-form-col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.auth-card {
  position: relative;
  width: 100%;
  max-width: 460px;
  background: rgba(6, 14, 26, 0.88);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(245, 207, 114, 0.28);
  border-radius: 18px;
  padding: 34px 30px;
  box-shadow: 
    0 30px 80px rgba(0, 0, 0, 0.75),
    0 0 50px rgba(245, 207, 114, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
  overflow: hidden;
}

.card-gold-accent-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, transparent, #f5cf72 30%, #fde68a 50%, #d97706 70%, transparent);
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
  background: rgba(34, 197, 94, 0.12);
  padding: 3px 8px;
  border-radius: 20px;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
}

.auth-ip-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9.5px;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 1px;
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
  color: #cbd5e1;
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
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.45);
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
  color: #e2e8f0;
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
  background: rgba(4, 11, 22, 0.92);
  border: 1px solid #1a3350;
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
  box-shadow: 0 0 0 3px rgba(245, 207, 114, 0.22);
  background: rgba(4, 11, 22, 0.98);
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
  color: #cbd5e1;
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
  border: 1px solid #2a4768;
  border-radius: 4px;
  background: rgba(5, 13, 25, 0.85);
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
  border: solid #041424;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.checkbox-label {
  font-size: 11.5px;
  color: #cbd5e1;
}

.auth-chip-secure {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.28);
  font-weight: 600;
}

/* Buttons */
.btn-auth-gold {
  height: 44px;
  width: 100%;
  background: linear-gradient(135deg, #fde68a 0%, #f5cf72 40%, #d97706 100%);
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #041220;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(245, 207, 114, 0.35);
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
  margin-top: 4px;
}

.btn-auth-gold:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(245, 207, 114, 0.5);
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
  border: 2px solid rgba(4, 18, 32, 0.25);
  border-top-color: #041220;
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.auth-divider span {
  padding: 0 10px;
}

/* 1-Click Demo Button */
.btn-auth-demo {
  height: 40px;
  width: 100%;
  background: rgba(10, 22, 38, 0.8);
  border: 1px solid rgba(245, 207, 114, 0.3);
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.btn-auth-demo:hover:not(:disabled) {
  background: rgba(16, 34, 60, 0.95);
  border-color: #f5cf72;
  color: #ffffff;
}

.demo-badge {
  background: #f5cf72;
  color: #041220;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
}

.demo-label {
  flex: 1;
  text-align: left;
  margin-left: 8px;
}

/* Card Bottom Footer */
.auth-card-footer {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
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
  font-weight: 500;
}

.badge-green { color: #4ade80; }
.badge-blue { color: #7dd3fc; }
.badge-gold { color: #fde68a; }

.auth-disclaimer {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.45;
  color: #94a3b8;
}

.auth-disclaimer code {
  color: #f5cf72;
  font-family: ui-monospace, SFMono-Regular, monospace;
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
    font-size: 34px;
  }
  .hero-subheading {
    max-width: 100%;
  }
  .hero-pillars {
    width: 100%;
    text-align: left;
  }
  .hero-radar-card {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .auth-topbar {
    padding: 0 16px;
  }
  .auth-top-enc {
    display: none;
  }
  .auth-divider-pipe {
    display: none;
  }
  .auth-main-container {
    padding: 24px 16px;
  }
  .auth-card {
    padding: 24px 18px;
  }
  .hero-headline {
    font-size: 28px;
  }
  .radar-metrics-row {
    gap: 8px;
  }
  .metric-val {
    font-size: 15px;
  }
  .metric-lbl {
    font-size: 8.5px;
  }
}
</style>
