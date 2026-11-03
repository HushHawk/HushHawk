<template>
  <div class="hawk-copilot-container">
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
          <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="#D4AF37" stroke="#FFDF73" stroke-width="1.5" stroke-linejoin="round"/>
          <circle cx="12" cy="11" r="2" fill="#04182D"/>
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
                <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill="#D4AF37" stroke="#FFDF73" stroke-width="1.5"/>
              </svg>
            </div>
            <div>
              <div class="hawk-title">
                HawkAI Copilot
                <span class="hawk-role-pill">ADMIN</span>
              </div>
              <div class="hawk-subtitle">
                <span class="hawk-status-dot"></span> AWS RDS PostgreSQL · Canonical DB
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

        <!-- Quick Action Prompt Chips -->
        <div class="hawk-quick-chips">
          <button
            v-for="(chip, idx) in quickPrompts"
            :key="idx"
            class="hawk-chip-btn"
            @click="sendQuickPrompt(chip.query)"
          >
            {{ chip.label }}
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
              <span v-if="msg.sender === 'user'">👤</span>
              <span v-else>🦅</span>
            </div>
            <div class="hawk-msg-bubble">
              <div class="hawk-msg-time">{{ msg.time }}</div>
              <div class="hawk-msg-content" v-html="renderMarkdown(msg.text)"></div>
            </div>
          </div>

          <!-- Typing Spinner -->
          <div v-if="isLoading" class="hawk-msg-row hawk-msg-ai">
            <div class="hawk-msg-avatar">🦅</div>
            <div class="hawk-msg-bubble hawk-typing">
              <div class="hawk-spinner"></div>
              <span>Querying AWS RDS PostgreSQL & Canonical Schemas...</span>
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
              placeholder="Ask anything (leads, dates, audit trail, missing data, rules)..."
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
            <span>Press <strong>Enter</strong> to send · <strong>Cmd+K</strong> to toggle</span>
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
      quickPrompts: [
        { label: '🔍 Missing Data Audit', query: 'Which leads are missing phone or email addresses?' },
        { label: '📜 Recent Audit Trail', query: 'Show me the audit trail and what changed recently' },
        { label: '📋 Pending Tasks Matrix', query: 'What tasks are pending or high priority?' },
        { label: '🏛️ Blueprint Rules', query: 'Explain the CrownKey standard and non-merge rules' },
        { label: '🦅 Executive Portfolio', query: 'Give me an executive summary of our active portfolio' },
      ],
      messages: [
        {
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `### 🦅 Welcome, Administrator\nI am your **HushHawk Admin AI Copilot**.\n\nI possess real-time introspection into our **AWS RDS PostgreSQL** database across all 7 schemas (\`core\`, \`crm\`, \`audit\`, \`ops\`, \`rel\`, \`ref\`, \`raw\`).\n\n**Ask me anything:**\n- 🔍 *Missing data & unreached leads*\n- 📜 *Audit events & timestamps (who modified what and on what date)*\n- 📍 *Property & APN lookups with raw parcel precision*\n- 📋 *Pending tasks & team action items*\n- 🏛️ *Core system rules (CrownKey standard, non-merge policy)*`,
        },
      ],
    };
  },
  mounted() {
    window.addEventListener('keydown', this.handleKeyDown);
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
  },
  methods: {
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggleOpen();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.isOpen = false;
      }
    },
    clearChat() {
      this.messages = [
        {
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: 'Chat history cleared. Live connection to AWS RDS PostgreSQL active. How can I assist you?',
        },
      ];
    },
    sendQuickPrompt(query) {
      this.inputQuery = query;
      this.sendMessage();
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
        const response = await fetch('/api/v1/ai/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        });

        const data = await response.json();
        const aiTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (data && data.ok) {
          this.messages.push({
            sender: 'ai',
            time: aiTime,
            text: data.answer || 'Query completed with no direct output.',
          });
        } else {
          this.messages.push({
            sender: 'ai',
            time: aiTime,
            text: `⚠️ **Error Processing Query:** ${data.error || 'Server returned an error'}`,
          });
        }
      } catch (err) {
        this.messages.push({
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ **Connection Failure:** Could not reach backend API at \`/api/v1/ai/query\`. Please verify backend is running. (${err.message})`,
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
        // Escape HTML
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Headers
      html = html.replace(/^### (.*$)/gim, '<h3 class="hawk-md-h3">$1</h3>');
      html = html.replace(/^#### (.*$)/gim, '<h4 class="hawk-md-h4">$1</h4>');

      // Section Badges [Section: XYZ]
      html = html.replace(/\[Section: ([^\]]+)\]/g, '<span class="hawk-section-badge"><span class="badge-dot"></span>$1</span>');

      // Date Badges 📅 **XYZ**
      html = html.replace(/📅 \*\*([^\*]+)\*\*/g, '<span class="hawk-date-badge">📅 $1</span>');

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
  width: 440px;
  max-width: calc(100vw - 32px);
  height: 640px;
  max-height: calc(100vh - 48px);
  background: #04182D;
  border: 1px solid rgba(212, 175, 55, 0.4);
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
  font-size: 13px;
  flex-shrink: 0;
}

.hawk-msg-user .hawk-msg-avatar {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(59, 130, 246, 0.4);
}

.hawk-msg-bubble {
  max-width: 82%;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
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
  margin-bottom: 4px;
}

.hawk-msg-user .hawk-msg-time {
  text-align: right;
  color: #93c5fd;
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
  gap: 5px;
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

:deep(.hawk-section-badge .badge-dot) {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #FFDF73;
}

:deep(.hawk-date-badge) {
  display: inline-block;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid rgba(16, 185, 129, 0.3);
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
