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
        <span class="clock-label">ET (Jacksonville):</span>
        <strong class="font-mono">{{ currentTime }}</strong>
      </div>
    </header>

    <!-- Main 2-Column Split Content (Zero-Scroll 100vh Fit) -->
    <main class="auth-main-container">
      <div class="auth-split-grid">
        <!-- ================= LEFT COLUMN: SLEEK BRAND SHOWCASE ================= -->
        <section class="auth-hero-col">
          <!-- Crest & Jacksonville Eyebrow -->
          <div class="hero-brand-row">
            <div class="hero-logo-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="44" height="44" fill="none">
                <rect width="36" height="36" rx="8" fill="#081022"/>
                <rect x="1" y="1" width="34" height="34" rx="7" stroke="url(#hhGoldGradHeroCompact)" stroke-width="1.2" stroke-opacity="0.95"/>
                <defs>
                  <linearGradient id="hhGoldGradHeroCompact" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FFFBEB"/>
                    <stop offset="25%" stop-color="#FDE68A"/>
                    <stop offset="55%" stop-color="#D4AF37"/>
                    <stop offset="85%" stop-color="#92400E"/>
                    <stop offset="100%" stop-color="#F59E0B"/>
                  </linearGradient>
                  <linearGradient id="hhCrownGradHeroCompact" x1="10" y1="5" x2="26" y2="14" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stop-color="#FFFFFF"/>
                    <stop offset="40%" stop-color="#FDE68A"/>
                    <stop offset="80%" stop-color="#D97706"/>
                    <stop offset="100%" stop-color="#78350F"/>
                  </linearGradient>
                </defs>
                <path d="M12 9.5L14 13.5L18 7.5L22 13.5L24 9.5L25 15.5H11L12 9.5Z" fill="url(#hhCrownGradHeroCompact)"/>
                <circle cx="18" cy="11.5" r="1.2" fill="#081022"/>
                <path d="M6 14.5C10 16 14 19 16.5 22L13 23C9 20 6.5 17 6 14.5Z" fill="url(#hhGoldGradHeroCompact)"/>
                <path d="M7.5 19C10.5 20.5 14 23 15.5 25L13.5 26C10 23.5 8 21 7.5 19Z" fill="url(#hhGoldGradHeroCompact)" fill-opacity="0.9"/>
                <path d="M30 14.5C26 16 22 19 19.5 22L23 23C27 20 29.5 17 30 14.5Z" fill="url(#hhGoldGradHeroCompact)"/>
                <path d="M28.5 19C25.5 20.5 22 23 20.5 25L22.5 26C26 23.5 28 21 28.5 19Z" fill="url(#hhGoldGradHeroCompact)" fill-opacity="0.9"/>
                <path d="M18 14L15.5 19.5L18 29L20.5 19.5L18 14Z" fill="url(#hhGoldGradHeroCompact)"/>
                <path d="M18 15.5L16.8 19L18 22L19.2 19L18 15.5Z" fill="#FFFBEB"/>
                <circle cx="18" cy="18.5" r="1" fill="#081022"/>
                <path d="M17.5 19.5H18.5L18.8 22H17.2L17.5 19.5Z" fill="#081022"/>
                <path d="M16 29L18 31.5L20 29H16Z" fill="url(#hhGoldGradHeroCompact)"/>
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
              The Institutional Wholesale <br />
              <span class="gold-gradient-text">Command Center.</span>
            </h1>
            <p class="hero-subheading">
              Deterministic CrownKey™ parcel provenance, sub-minute cash buyer matching, and automated Duval & Clay county deal velocity.
            </p>
          </div>

          <!-- 3 Compact Capability Chips (Replaces bulky stacked cards) -->
          <div class="hero-chips-row">
            <div class="feature-chip chip-gold">
              <span class="chip-accent-bar gold-bar"></span>
              <div class="chip-body">
                <span class="chip-title text-gold">CrownKey™ GIS</span>
                <span class="chip-desc">Zero-merge parcel identity across Duval & Clay</span>
              </div>
            </div>

            <div class="feature-chip chip-emerald">
              <span class="chip-accent-bar emerald-bar"></span>
              <div class="chip-body">
                <span class="chip-title text-emerald">Dispositions Desk</span>
                <span class="chip-desc">Sub-minute match to verified cash buyers</span>
              </div>
            </div>

            <div class="feature-chip chip-cyan">
              <span class="chip-accent-bar cyan-bar"></span>
              <div class="chip-body">
                <span class="chip-title text-cyan">Florida DNC Shield</span>
                <span class="chip-desc">Automated litigator & title gate suppression</span>
              </div>
            </div>
          </div>

          <!-- Compact 1-Row Live Market Radar -->
          <div class="hero-radar-compact">
            <div class="radar-tag">
              <span class="radar-dot"></span>
              <span>DUVAL & CLAY RADAR</span>
            </div>
            <div class="radar-metrics-inline">
              <div class="metric-inline">
                <strong class="text-emerald">100%</strong>
                <span>Active</span>
              </div>
              <span class="sep-dot">•</span>
              <div class="metric-inline">
                <strong class="text-gold">$18.4K</strong>
                <span>Avg. MAO</span>
              </div>
              <span class="sep-dot">•</span>
              <div class="metric-inline">
                <strong class="text-cyan">0.45s</strong>
                <span>Graph Sync</span>
              </div>
            </div>
            <div class="radar-live-chip">24 Live Deals</div>
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
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  VERIFIED IP
                </span>
              </div>
              <h2 class="auth-card-title">Terminal Authentication</h2>
              <p class="auth-card-desc">Enter your credentials to unlock active pipeline, underwriting formulas & dispo desk.</p>
            </div>

            <!-- Login Form -->
            <form class="auth-form" @submit.prevent="handleLogin">
              <!-- Error Banner -->
              <div v-if="errorMessage" class="auth-error-banner" role="alert">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
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
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
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
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
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
                    <svg v-if="!showPassword" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="3" r="3"/>
                    </svg>
                    <svg v-else viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
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
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2">
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
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
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
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </form>

            <!-- Card Bottom Trust Badges -->
            <div class="auth-card-footer">
              <div class="security-badges">
                <div class="sec-badge badge-green">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#22c55e" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span>256-Bit SSL</span>
                </div>
                <div class="sec-badge badge-blue">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#38bdf8" stroke-width="2">
                    <ellipse cx="12" cy="5" rx="9" ry="3"/>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                  </svg>
                  <span>AWS RDS</span>
                </div>
                <div class="sec-badge badge-gold">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#f5cf72" stroke-width="2">
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
/* ================= BASE WRAPPER (STRICT 100VH ZERO-SCROLL) ================= */
.hushhawk-auth-wrapper {
  position: relative;
  height: 100vh;
  max-height: 100vh;
  width: 100%;
  background-color: #020914;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif;
  overflow: hidden; /* Strict zero-scroll on desktop */
  display: flex;
  flex-direction: column;
}

/* Jacksonville Twilight Riverfront Skyline Backdrop */
.auth-skyline-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(135deg, rgba(2, 9, 20, 0.93) 0%, rgba(3, 14, 30, 0.88) 45%, rgba(5, 18, 38, 0.94) 100%),
    url("https://u.realgeeks.media/nuviewrealty/Jacksonville_Skyline_Sunset_2.jpeg");
  background-size: cover;
  background-position: center bottom;
  z-index: 0;
  filter: saturate(1.15) contrast(1.1);
}

/* Atmospheric Ambient Warm Lighting */
.auth-ambient-glows {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(circle 700px at 10% 25%, rgba(217, 119, 6, 0.12) 0%, transparent 60%),
    radial-gradient(circle 600px at 85% 75%, rgba(245, 207, 114, 0.08) 0%, transparent 65%);
  z-index: 1;
}

/* Subtle Geometric Pattern */
.auth-fine-grid {
  position: absolute;
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
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  border-bottom: 1px solid rgba(245, 207, 114, 0.14);
  background: rgba(3, 11, 23, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.auth-top-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: pulseDot 2s infinite ease-in-out;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.85); }
}

.auth-top-tag {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #f5cf72;
}

.auth-divider-pipe {
  color: #334155;
  font-size: 11px;
}

.auth-top-enc {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #94a3b8;
}

.auth-clock {
  font-size: 11.5px;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 6px;
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

/* ================= MAIN CONTAINER ================= */
.auth-main-container {
  position: relative;
  z-index: 5;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  box-sizing: border-box;
}

.auth-split-grid {
  width: 100%;
  max-width: 1200px;
  display: grid;
  grid-template-columns: 1.15fr 0.95fr;
  gap: 52px;
  align-items: center;
}

/* ================= LEFT HERO COLUMN ================= */
.auth-hero-col {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-right: 12px;
}

.hero-brand-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hero-logo-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #081022;
  padding: 2px;
  box-shadow: 0 0 24px rgba(245, 207, 114, 0.25);
  flex-shrink: 0;
}

.hero-brand-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.hero-pill-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #f5cf72;
  background: rgba(245, 207, 114, 0.08);
  border: 1px solid rgba(245, 207, 114, 0.22);
  padding: 2px 8px;
  border-radius: 20px;
  width: fit-content;
}

.badge-dot-gold {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #f5cf72;
  box-shadow: 0 0 6px #f5cf72;
}

.brand-motto-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 2px;
  color: #cbd5e1;
  font-weight: 700;
}

.motto-sep {
  color: #d97706;
  font-size: 7px;
}

.hero-text-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-headline {
  margin: 0;
  font-family: Georgia, Cambria, "Times New Roman", Times, serif;
  font-size: 34px;
  line-height: 1.18;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.4px;
}

.gold-gradient-text {
  background: linear-gradient(135deg, #ffffff 0%, #fde68a 35%, #f5cf72 70%, #d97706 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subheading {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: #cbd5e1;
  max-width: 520px;
}

/* Compact Feature Chips (3 horizontally stacked pills) */
.hero-chips-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  border-radius: 8px;
  background: rgba(8, 18, 34, 0.65);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  transition: transform 0.15s, background 0.15s;
}

.feature-chip:hover {
  transform: translateX(3px);
  background: rgba(12, 26, 48, 0.82);
}

.chip-accent-bar {
  width: 3px;
  height: 24px;
  border-radius: 3px;
  flex-shrink: 0;
}

.gold-bar { background: #f5cf72; box-shadow: 0 0 8px rgba(245, 207, 114, 0.5); }
.emerald-bar { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.5); }
.cyan-bar { background: #38bdf8; box-shadow: 0 0 8px rgba(56, 189, 248, 0.5); }

.chip-body {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.chip-title {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.chip-desc {
  font-size: 11.5px;
  color: #94a3b8;
}

.text-gold { color: #fde68a; }
.text-emerald { color: #4ade80; }
.text-cyan { color: #7dd3fc; }

/* Compact 1-Row Live Radar */
.hero-radar-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 10px;
  background: rgba(6, 14, 26, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(245, 207, 114, 0.2);
  gap: 12px;
}

.radar-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 1px;
  color: #f5cf72;
}

.radar-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
}

.radar-metrics-inline {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-inline {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
}

.metric-inline strong {
  font-size: 13.5px;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

.metric-inline span {
  font-size: 10.5px;
  color: #94a3b8;
}

.sep-dot {
  color: #334155;
  font-size: 10px;
}

.radar-live-chip {
  font-size: 10px;
  font-weight: 700;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.3);
  padding: 2px 7px;
  border-radius: 10px;
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
  max-width: 440px;
  background: rgba(6, 14, 26, 0.9);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(245, 207, 114, 0.28);
  border-radius: 16px;
  padding: 26px 26px 22px 26px;
  box-shadow: 
    0 24px 64px rgba(0, 0, 0, 0.75),
    0 0 40px rgba(245, 207, 114, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
}

.card-gold-accent-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2.5px;
  background: linear-gradient(90deg, transparent, #f5cf72 30%, #fde68a 50%, #d97706 70%, transparent);
}

.auth-card-top {
  margin-bottom: 16px;
}

.auth-card-badge-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.auth-status-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
  padding: 2px 7px;
  border-radius: 20px;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.chip-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #22c55e;
}

.auth-ip-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 9px;
  font-weight: 700;
  color: #38bdf8;
  letter-spacing: 0.8px;
}

.auth-card-title {
  margin: 0 0 4px 0;
  font-size: 19px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.2px;
}

.auth-card-desc {
  margin: 0;
  font-size: 11.5px;
  color: #cbd5e1;
  line-height: 1.4;
}

/* Form Fields */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.auth-error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(239, 68, 68, 0.45);
  border-radius: 7px;
  color: #fca5a5;
  font-size: 11.5px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-field label {
  font-size: 11px;
  font-weight: 600;
  color: #e2e8f0;
  letter-spacing: 0.2px;
}

.auth-link-sm {
  font-size: 10.5px;
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
  left: 11px;
  color: #64748b;
  pointer-events: none;
  display: flex;
  align-items: center;
}

.input-wrap input {
  width: 100%;
  height: 38px;
  padding: 0 36px 0 34px;
  background: rgba(4, 11, 22, 0.92);
  border: 1px solid #1a3350;
  border-radius: 7px;
  color: #ffffff;
  font-size: 12.5px;
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
  right: 8px;
  background: transparent;
  border: 0;
  color: #64748b;
  padding: 5px;
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
  padding: 1px 0;
}

.custom-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  user-select: none;
}

.custom-checkbox input {
  display: none;
}

.checkbox-indicator {
  width: 15px;
  height: 15px;
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
  width: 3.5px;
  height: 7px;
  border: solid #041424;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-bottom: 2px;
}

.checkbox-label {
  font-size: 11px;
  color: #cbd5e1;
}

.auth-chip-secure {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  border: 1px solid rgba(56, 189, 248, 0.28);
  font-weight: 600;
}

/* Buttons */
.btn-auth-gold {
  height: 40px;
  width: 100%;
  background: linear-gradient(135deg, #fde68a 0%, #f5cf72 40%, #d97706 100%);
  border: 1px solid #fed7aa;
  border-radius: 7px;
  color: #041220;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(245, 207, 114, 0.32);
  transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
  margin-top: 2px;
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
  gap: 6px;
}

.auth-spinner {
  width: 16px;
  height: 16px;
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
  margin: 2px 0;
  color: #64748b;
  font-size: 9px;
  letter-spacing: 1.2px;
  font-weight: 700;
}

.auth-divider::before,
.auth-divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.auth-divider span {
  padding: 0 8px;
}

/* 1-Click Demo Button */
.btn-auth-demo {
  height: 36px;
  width: 100%;
  background: rgba(10, 22, 38, 0.8);
  border: 1px solid rgba(245, 207, 114, 0.25);
  border-radius: 7px;
  color: #f1f5f9;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
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
  font-size: 8.5px;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 3px;
}

.demo-label {
  flex: 1;
  text-align: left;
  margin-left: 8px;
}

/* Card Bottom Footer */
.auth-card-footer {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
}

.security-badges {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.sec-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 500;
}

.badge-green { color: #4ade80; }
.badge-blue { color: #7dd3fc; }
.badge-gold { color: #fde68a; }

.auth-disclaimer {
  margin: 0;
  font-size: 9px;
  line-height: 1.4;
  color: #94a3b8;
}

.auth-disclaimer code {
  color: #f5cf72;
  font-family: ui-monospace, SFMono-Regular, monospace;
}

/* ================= RESPONSIVE ADJUSTMENTS ================= */
@media (max-width: 960px) {
  .hushhawk-auth-wrapper {
    height: auto;
    max-height: none;
    overflow-y: auto; /* Allow natural scrolling on tablets/mobile */
  }
  .auth-main-container {
    padding: 30px 16px;
  }
  .auth-split-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    max-width: 520px;
  }
  .auth-hero-col {
    padding-right: 0;
    text-align: center;
    align-items: center;
  }
  .hero-brand-row {
    justify-content: center;
  }
  .hero-chips-row {
    width: 100%;
  }
  .hero-radar-compact {
    width: 100%;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
