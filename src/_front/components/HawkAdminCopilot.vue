<template>
  <div v-if="shouldShowCopilot" class="hawk-copilot-container">
    <!-- Floating Trigger Launcher -->
    <button
      v-if="!isOpen"
      class="hawk-launcher-btn"
      @click="toggleOpen"
      title="Open HawkAI Admin Copilot (Cmd+K)"
      aria-label="Open HawkAI Admin Copilot"
    >
      <div class="hawk-launcher-icon">
        <svg viewBox="0 0 24 24" class="hawk-svg" fill="none" stroke="currentColor">
          <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="url(#hawkGoldGrad)" stroke="#FFDF73" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="12" cy="11" r="2" fill="#04182D"/>
          <defs>
            <linearGradient id="hawkGoldGrad" x1="3" y1="2" x2="21" y2="20" gradientUnits="userSpaceOnUse">
              <stop stop-color="#FFDF73"/>
              <stop offset="0.6" stop-color="#D4AF37"/>
              <stop offset="1" stop-color="#9A7B1C"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span class="hawk-launcher-label">HawkAI</span>
      <span class="hawk-pulse-ring"></span>
    </button>

    <!-- Slide-out Drawer Panel -->
    <transition name="hawk-slide">
      <div v-if="isOpen" class="hawk-copilot-drawer">
        <!-- Header -->
        <div class="hawk-drawer-header">
          <div class="hawk-header-left">
            <div class="hawk-logo-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor">
                <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="url(#hawkHeaderGold)" stroke="#FFDF73" stroke-width="1.5"/>
                <defs>
                  <linearGradient id="hawkHeaderGold" x1="3" y1="2" x2="21" y2="20">
                    <stop stop-color="#FFDF73"/>
                    <stop offset="1" stop-color="#D4AF37"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div>
              <div class="hawk-title">
                HawkAI Copilot
                <span class="hawk-role-pill">ENTERPRISE</span>
              </div>
              <div class="hawk-subtitle">
                <span class="hawk-status-dot"></span> AWS RDS PostgreSQL · Multi-Schema Active
              </div>
            </div>
          </div>
          <div class="hawk-header-actions">
            <button class="hawk-action-btn" @click="clearChat" title="Clear Chat History">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
            <button class="hawk-action-btn hawk-close-btn" @click="toggleOpen" title="Close Panel (Esc)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Quick Action Prompt Chips with Premium SVG Icons -->
        <div class="hawk-quick-chips">
          <button
            v-for="(chip, idx) in quickPrompts"
            :key="idx"
            class="hawk-chip-btn"
            @click="sendQuickPrompt(chip.query)"
          >
            <span class="hawk-chip-icon" v-html="chip.iconSvg"></span>
            <span>{{ chip.label }}</span>
          </button>
        </div>

        <!-- Conversation Scroll Area -->
        <div class="hawk-messages-area" ref="messagesContainer">
          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['hawk-msg-row', msg.sender === 'user' ? 'hawk-msg-user' : 'hawk-msg-ai']"
          >
            <div class="hawk-msg-avatar">
              <!-- Premium Minimalist User Avatar SVG -->
              <svg v-if="msg.sender === 'user'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <!-- Premium Golden Falcon Crest SVG -->
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.5 7.5L20.5 8.5L16.5 13L17.5 19L12 16L6.5 19L7.5 13L3.5 8.5L9.5 7.5L12 2Z" fill="#D4AF37" stroke="#FFDF73" stroke-width="1.2"/>
              </svg>
            </div>
            <div class="hawk-msg-bubble">
              <div class="hawk-msg-header">
                <span class="hawk-msg-time">{{ msg.time }}</span>
                <button
                  v-if="msg.sender === 'ai'"
                  class="hawk-copy-btn"
                  @click="copyText(msg.text)"
                  title="Copy Answer"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                </button>
              </div>

              <!-- Message Body -->
              <div class="hawk-msg-content" v-html="renderMarkdown(msg.text)"></div>

              <!-- Interactive Action Buttons -->
              <div v-if="msg.actions && msg.actions.length > 0" class="hawk-actions-container">
                <button
                  v-for="(action, aIdx) in msg.actions"
                  :key="aIdx"
                  class="hawk-action-pill-btn"
                  @click="handleActionClick(action)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  <span>{{ action.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Typing Spinner -->
          <div v-if="isLoading" class="hawk-msg-row hawk-msg-ai">
            <div class="hawk-msg-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.5 7.5L20.5 8.5L16.5 13L17.5 19L12 16L6.5 19L7.5 13L3.5 8.5L9.5 7.5L12 2Z" fill="#D4AF37" stroke="#FFDF73" stroke-width="1.2"/>
              </svg>
            </div>
            <div class="hawk-msg-bubble hawk-typing">
              <div class="hawk-spinner"></div>
              <span>Introspecting PostgreSQL 43 tables & computing real estate insights...</span>
            </div>
          </div>
        </div>

        <!-- Input Bar -->
        <div class="hawk-input-bar">
          <form @submit.prevent="sendMessage" class="hawk-input-form">
            <input
              type="text"
              v-model="inputQuery"
              ref="queryInput"
              class="hawk-input"
              placeholder="Ask anything (e.g. 'portfolio value', 'find buyers for...', 'missing data')..."
              :disabled="isLoading"
            />
            <button
              type="submit"
              class="hawk-send-btn"
              :disabled="!inputQuery.trim() || isLoading"
              title="Send Query"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
          <div class="hawk-shortcut-hint">
            <span>Press <strong>Enter</strong> to send · <strong>Cmd+K</strong> to toggle · Supports follow-up memory</span>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'HawkAdminCopilot',
  data() {
    return {
      isOpen: false,
      isLoading: false,
      inputQuery: '',
      isLoggedIn: false,
      authCheckInterval: null,
      quickPrompts: [
        {
          label: 'Portfolio Valuation',
          query: 'What is our total assessed property value and top properties?',
          iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
        },
        {
          label: 'Match Cash Buyers',
          query: 'Find cash buyers in Duval County for deals',
          iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
        },
        {
          label: 'Missing Data Audit',
          query: 'Which leads are missing phone or email addresses?',
          iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'
        },
        {
          label: 'Task Matrix',
          query: 'What tasks are pending or high priority?',
          iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'
        },
        {
          label: 'Recent Audit Trail',
          query: 'Show me the audit trail and what changed recently',
          iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
        },
        {
          label: 'Blueprint Rules',
          query: 'Explain the CrownKey standard and non-merge rules',
          iconSvg: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
        },
      ],
      messages: [],
      isSuppressedByPartnerChat: false,
    };
  },
  computed: {
    shouldShowCopilot() {
      if (this.isSuppressedByPartnerChat) return false;
      if (typeof window === 'undefined') return false;
      const path = (this.$route?.path || window.location.pathname || '').toLowerCase();
      if (path === '/login' || path.startsWith('/login') || path === '/signup' || path.startsWith('/signup') || path === '/forgot-password' || path.startsWith('/forgot-password')) {
        return false;
      }
      if (typeof document !== 'undefined') {
        if (document.querySelector('.hushhawk-auth-wrapper, .auth-card, #login-email, .hushhawk-auth-forwarding')) {
          return false;
        }
      }
      return this.isLoggedIn;
    }
  },
  watch: {
    '$route'() {
      this.checkAuthStatus();
    },
    isLoggedIn(newVal) {
      if (newVal && this.messages.length === 0) {
        this.initWelcomeMessage();
      }
    }
  },
  mounted() {
    this.checkAuthStatus();
    if (this.isLoggedIn) {
      this.initWelcomeMessage();
    }
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('storage', this.checkAuthStatus);
    window.addEventListener('popstate', this.checkAuthStatus);
    window.addEventListener('hashchange', this.checkAuthStatus);
    window.addEventListener('hushhawk-auth-change', this.checkAuthStatus);
    this.partnerChatHandler = (e) => {
      this.isSuppressedByPartnerChat = !!(e.detail && e.detail.open);
    };
    window.addEventListener('hushhawk-partner-chat-state', this.partnerChatHandler);
    this.authCheckInterval = setInterval(this.checkAuthStatus, 500);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('storage', this.checkAuthStatus);
    window.removeEventListener('popstate', this.checkAuthStatus);
    window.removeEventListener('hashchange', this.checkAuthStatus);
    window.removeEventListener('hushhawk-auth-change', this.checkAuthStatus);
    if (this.partnerChatHandler) {
      window.removeEventListener('hushhawk-partner-chat-state', this.partnerChatHandler);
    }
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
    }
  },
  methods: {
    checkAuthStatus() {
      if (typeof window === 'undefined') {
        this.isLoggedIn = false;
        return false;
      }

      // 1. Strict route suppression: never show on auth routes
      const path = (this.$route?.path || window.location.pathname || '').toLowerCase();
      const hash = (window.location.hash || '').toLowerCase();

      const isAuthRoute =
        path === '/login' ||
        path.startsWith('/login') ||
        path === '/signup' ||
        path.startsWith('/signup') ||
        path === '/forgot-password' ||
        path.startsWith('/forgot-password') ||
        hash === '#login' ||
        hash === '#/login' ||
        hash === '#signup' ||
        hash === '#/signup' ||
        hash === '#forgot-password' ||
        hash === '#/forgot-password';

      if (isAuthRoute) {
        this.isLoggedIn = false;
        if (this.isOpen) this.isOpen = false;
        return false;
      }

      // 2. Strict DOM suppression: if login gateway or forwarding view is rendered, hide immediately
      if (typeof document !== 'undefined') {
        const authDomPresent = !!document.querySelector('.hushhawk-auth-wrapper, .auth-card, #login-email, .hushhawk-auth-forwarding');
        if (authDomPresent) {
          this.isLoggedIn = false;
          if (this.isOpen) this.isOpen = false;
          return false;
        }
      }

      // 3. Strict global authentication flag check
      if (typeof window.__HUSHHAWK_AUTHENTICATED__ === 'boolean' && !window.__HUSHHAWK_AUTHENTICATED__) {
        this.isLoggedIn = false;
        if (this.isOpen) this.isOpen = false;
        return false;
      }

      // 4. Verify valid authenticated session payload in storage
      let hasSession = false;
      try {
        const rawSession =
          window.sessionStorage.getItem('hushhawk_session') ||
          window.localStorage.getItem('hushhawk_session');

        if (rawSession) {
          try {
            const parsed = JSON.parse(rawSession);
            if (parsed && (parsed.email || parsed.token || parsed.user || parsed.id || parsed.role)) {
              hasSession = true;
            }
          } catch (e) {
            hasSession = false;
          }
        }
      } catch (err) {
        hasSession = false;
      }

      this.isLoggedIn = hasSession;
      if (!hasSession && this.isOpen) {
        this.isOpen = false;
      }
      return hasSession;
    },
    getGreeting() {
      const h = new Date().getHours();
      if (h >= 5 && h < 12) return 'Good morning';
      if (h >= 12 && h < 14) return 'Good noon';
      if (h >= 14 && h < 17) return 'Good afternoon';
      if (h >= 17 && h < 22) return 'Good evening';
      return 'Good night';
    },
    initWelcomeMessage() {
      const greeting = this.getGreeting();
      this.messages = [
        {
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `### ${greeting}, Administrator!\nI am your dedicated **HushHawk Acquisitions & Operations Assistant**.\n\nI have live, real-time access to our entire **AWS RDS PostgreSQL** database across all 7 schemas and 43 tables to help you manage leads, look up property valuations, match cash buyers, and follow up on team tasks.\n\nHow can I help you today?`,
          actions: [
            { label: 'Portfolio Valuation', action: 'PROMPT', query: 'What is our total assessed property value and top properties?' },
            { label: 'Match Cash Buyers', action: 'PROMPT', query: 'Find cash buyers in Duval County for deals' },
            { label: 'Check Pending Tasks', action: 'NAVIGATE', path: '#tasks' }
          ]
        }
      ];
    },
    toggleOpen() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.$nextTick(() => {
          if (this.$refs.queryInput) {
            this.$refs.queryInput.focus();
          }
          this.scrollToBottom();
        });
      }
    },
    handleKeyDown(e) {
      if (!this.shouldShowCopilot) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggleOpen();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.isOpen = false;
      }
    },
    clearChat() {
      this.initWelcomeMessage();
    },
    sendQuickPrompt(query) {
      this.inputQuery = query;
      this.sendMessage();
    },
    handleActionClick(action) {
      if (action.action === 'PROMPT' && action.query) {
        this.inputQuery = action.query;
        this.sendMessage();
      } else if (action.action === 'NAVIGATE' && action.path) {
        window.location.hash = action.path;
      }
    },
    copyText(text) {
      if (navigator && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    },
    async sendMessage() {
      const q = this.inputQuery.trim();
      if (!q || this.isLoading) return;

      const userTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.messages.push({
        sender: 'user',
        time: userTime,
        text: q,
      });

      this.inputQuery = '';
      this.isLoading = true;
      this.scrollToBottom();

      try {
        const token = (typeof window !== 'undefined' && window.localStorage?.getItem('hushhawk_auth_token')) || '';
        const sessionStr = (typeof window !== 'undefined' && (window.sessionStorage?.getItem('hushhawk_session') || window.localStorage?.getItem('hushhawk_session'))) || '';
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (sessionStr) headers['x-hushhawk-session'] = encodeURIComponent(sessionStr);

        const response = await fetch('/api/v1/ai/query', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: q,
            clientHour: new Date().getHours(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            clientTime: new Date().toISOString()
          }),
        });

        const data = await response.json();
        const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (data && data.ok) {
          this.messages.push({
            sender: 'ai',
            time: aiTime,
            text: data.answer || 'Query completed with no direct output.',
            actions: data.actions || []
          });
        } else {
          this.messages.push({
            sender: 'ai',
            time: aiTime,
            text: `Error Processing Query: ${data.error || 'Server returned an error'}`,
            actions: []
          });
        }
      } catch (err) {
        this.messages.push({
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `Connection Failure: Could not reach backend API at /api/v1/ai/query. (${err.message})`,
          actions: []
        });
      } finally {
        this.isLoading = false;
        this.scrollToBottom();
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const container = this.$refs.messagesContainer;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
    },
    renderMarkdown(text) {
      if (!text) return '';
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Headers
      html = html.replace(/^### (.*$)/gim, '<h3 class="hawk-md-h3">$1</h3>');
      html = html.replace(/^#### (.*$)/gim, '<h4 class="hawk-md-h4">$1</h4>');

      // Section Badges [Section: XYZ]
      html = html.replace(/\[Section: ([^\]]+)\]/g, '<span class="hawk-section-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>$1</span>');

      // Date Badges [DATE] **XYZ** with Premium Calendar SVG
      html = html.replace(/\[DATE\] \*\*([^\*]+)\*\*/g, '<span class="hawk-date-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>$1</span>');

      // Valuation Badges [VALUATION] **$XYZ** with Premium Dollar/Currency SVG
      html = html.replace(/\[VALUATION\] \*\*([^\*]+)\*\*/g, '<span class="hawk-money-badge"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px;"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>$1</span>');

      // Priority Badges [PRIORITY_HIGH], [PRIORITY_MED], [PRIORITY_LOW]
      html = html.replace(/\[PRIORITY_HIGH\]/g, '<span class="hawk-priority-badge priority-high">HIGH</span>');
      html = html.replace(/\[PRIORITY_MED\]/g, '<span class="hawk-priority-badge priority-med">MED</span>');
      html = html.replace(/\[PRIORITY_LOW\]/g, '<span class="hawk-priority-badge priority-low">LOW</span>');

      // Blockquotes
      html = html.replace(/^> (.*$)/gim, '<blockquote class="hawk-blockquote">$1</blockquote>');

      // Bold & Italic
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

      // Inline Code & CrownKeys
      html = html.replace(/`([^`]+)`/g, '<code class="hawk-code">$1</code>');

      // Unordered Lists
      html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="hawk-li">$1</li>');

      // Wrap consecutive li in ul
      html = html.replace(/(<li class="hawk-li">.*<\/li>)+/gims, '<ul class="hawk-ul">$&</ul>');

      // Newlines to <br> if not inside tags
      html = html.replace(/\n\n/g, '<div class="hawk-spacer"></div>');
      html = html.replace(/\n/g, '<br/>');

      return html;
    },
  },
};
</script>

<style scoped>
/* DOM-level suppression of HawkAI on login screen */
:global(.hushhawk-auth-wrapper) ~ .hawk-copilot-container,
:global(.hushhawk-auth-forwarding) ~ .hawk-copilot-container {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}

.hawk-copilot-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #f1f5f9;
  z-index: 999999;
}

/* Floating Launcher */
.hawk-launcher-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  height: 56px;
  padding: 0 18px 0 12px;
  border-radius: 28px;
  background: linear-gradient(135deg, #04182D 0%, #0A223C 100%);
  border: 1.5px solid #D4AF37;
  color: #FFDF73;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(4, 24, 45, 0.6), 0 0 15px rgba(212, 175, 55, 0.25);
  transition: all 0.25s ease;
  z-index: 999999;
}

.hawk-launcher-btn:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: #FFDF73;
  box-shadow: 0 12px 30px rgba(4, 24, 45, 0.8), 0 0 22px rgba(212, 175, 55, 0.4);
}

.hawk-launcher-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hawk-svg {
  width: 26px;
  height: 26px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.hawk-launcher-label {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #FFDF73;
  text-transform: uppercase;
}

.hawk-pulse-ring {
  position: absolute;
  top: -3px;
  left: -3px;
  right: -3px;
  bottom: -3px;
  border-radius: 30px;
  border: 1.5px solid rgba(212, 175, 55, 0.5);
  animation: hawkPulse 2.5s infinite;
  pointer-events: none;
}

@keyframes hawkPulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 0.2; }
  100% { transform: scale(1); opacity: 0.8; }
}

/* Slide Drawer */
.hawk-copilot-drawer {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 470px;
  max-width: calc(100vw - 32px);
  height: 680px;
  max-height: calc(100vh - 48px);
  background: #04182D;
  border: 1.5px solid rgba(212, 175, 55, 0.4);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(212, 175, 55, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999999;
}

/* Header */
.hawk-drawer-header {
  padding: 16px 18px;
  background: linear-gradient(180deg, #06203A 0%, #04182D 100%);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hawk-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hawk-logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.hawk-title {
  font-size: 15px;
  font-weight: 700;
  color: #FFDF73;
  display: flex;
  align-items: center;
  gap: 8px;
}

.hawk-role-pill {
  font-size: 10px;
  font-weight: 800;
  background: #D4AF37;
  color: #04182D;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.hawk-subtitle {
  font-size: 11px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.hawk-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.hawk-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hawk-action-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.hawk-action-btn:hover {
  background: rgba(212, 175, 55, 0.15);
  color: #FFDF73;
  border-color: rgba(212, 175, 55, 0.4);
}

.hawk-close-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.4);
}

/* Quick Chips */
.hawk-quick-chips {
  padding: 10px 14px;
  background: rgba(6, 32, 58, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  gap: 6px;
  overflow-x: auto;
  white-space: nowrap;
}

.hawk-quick-chips::-webkit-scrollbar {
  height: 3px;
}

.hawk-quick-chips::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.3);
  border-radius: 3px;
}

.hawk-chip-btn {
  font-size: 11px;
  font-weight: 500;
  padding: 5px 10px;
  background: rgba(15, 39, 68, 0.7);
  border: 1px solid rgba(212, 175, 55, 0.25);
  color: #cbd5e1;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
}

.hawk-chip-icon {
  display: inline-flex;
  align-items: center;
  color: #FFDF73;
}

.hawk-chip-btn:hover {
  background: rgba(212, 175, 55, 0.2);
  border-color: #D4AF37;
  color: #FFDF73;
}

/* Messages Container */
.hawk-messages-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: #031222;
}

.hawk-messages-area::-webkit-scrollbar {
  width: 6px;
}

.hawk-messages-area::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.25);
  border-radius: 3px;
}

.hawk-msg-row {
  display: flex;
  gap: 10px;
  max-width: 100%;
}

.hawk-msg-user {
  flex-direction: row-reverse;
}

.hawk-msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hawk-msg-user .hawk-msg-avatar {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
}

.hawk-msg-bubble {
  max-width: 86%;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.hawk-msg-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.hawk-copy-btn {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.hawk-copy-btn:hover {
  color: #FFDF73;
  background: rgba(212, 175, 55, 0.15);
}

.hawk-msg-user .hawk-msg-bubble {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%);
  color: #f8fafc;
  border: 1px solid rgba(96, 165, 250, 0.3);
  border-top-right-radius: 2px;
}

.hawk-msg-ai .hawk-msg-bubble {
  background: #06203A;
  color: #e2e8f0;
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-top-left-radius: 2px;
}

.hawk-msg-time {
  font-size: 10px;
  color: #64748b;
}

.hawk-msg-user .hawk-msg-time {
  color: #93c5fd;
}

/* Actions Container */
.hawk-actions-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(212, 175, 55, 0.15);
}

.hawk-action-pill-btn {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #FFDF73;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.hawk-action-pill-btn:hover {
  background: #D4AF37;
  color: #04182D;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(212, 175, 55, 0.3);
}

/* Typing Indicator */
.hawk-typing {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #D4AF37;
  font-size: 12px;
  font-style: italic;
}

.hawk-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(212, 175, 55, 0.2);
  border-top-color: #FFDF73;
  border-radius: 50%;
  animation: hawkSpin 0.8s linear infinite;
}

@keyframes hawkSpin {
  to { transform: rotate(360deg); }
}

/* Input Bar */
.hawk-input-bar {
  padding: 12px 14px;
  background: #04182D;
  border-top: 1px solid rgba(212, 175, 55, 0.2);
}

.hawk-input-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.hawk-input {
  flex: 1;
  background: #06203A;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  color: #f8fafc;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.hawk-input:focus {
  border-color: #FFDF73;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
}

.hawk-send-btn {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #D4AF37;
  border: none;
  color: #04182D;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.hawk-send-btn:hover:not(:disabled) {
  background: #FFDF73;
  transform: scale(1.05);
}

.hawk-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.hawk-shortcut-hint {
  font-size: 10px;
  color: #64748b;
  margin-top: 6px;
  text-align: center;
}

.hawk-shortcut-hint strong {
  color: #94a3b8;
}

/* Markdown Rendering Helpers */
:deep(.hawk-md-h3) {
  font-size: 14px;
  font-weight: 700;
  color: #FFDF73;
  margin: 0 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
}

:deep(.hawk-md-h4) {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
  margin: 10px 0 6px 0;
}

:deep(.hawk-section-badge) {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(212, 175, 55, 0.15);
  color: #FFDF73;
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(212, 175, 55, 0.3);
  margin-bottom: 4px;
}

:deep(.hawk-date-badge) {
  display: inline-flex;
  align-items: center;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

:deep(.hawk-money-badge) {
  display: inline-flex;
  align-items: center;
  background: rgba(212, 175, 55, 0.2);
  color: #FFDF73;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid rgba(212, 175, 55, 0.4);
}

:deep(.hawk-priority-badge) {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

:deep(.hawk-priority-badge.priority-high) {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

:deep(.hawk-priority-badge.priority-med) {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

:deep(.hawk-priority-badge.priority-low) {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
}

:deep(.hawk-code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  background: rgba(0, 0, 0, 0.3);
  color: #FFDF73;
  padding: 2px 5px;
  border-radius: 4px;
  border: 1px solid rgba(212, 175, 55, 0.2);
}

:deep(.hawk-blockquote) {
  margin: 8px 0;
  padding: 6px 10px;
  background: rgba(212, 175, 55, 0.08);
  border-left: 3px solid #D4AF37;
  border-radius: 0 4px 4px 0;
  font-size: 12px;
  color: #cbd5e1;
}

:deep(.hawk-ul) {
  margin: 6px 0;
  padding-left: 18px;
}

:deep(.hawk-li) {
  margin-bottom: 4px;
}

:deep(.hawk-spacer) {
  height: 8px;
}

/* Animations */
.hawk-slide-enter-active,
.hawk-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.hawk-slide-enter-from,
.hawk-slide-leave-to {
  transform: translateY(20px) scale(0.96);
  opacity: 0;
}
</style>
