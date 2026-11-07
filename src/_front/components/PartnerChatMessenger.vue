<template>
  <div v-if="shouldShowMessenger" class="partner-messenger-container">
    <!-- 1. Floating Trigger Launcher (macOS iMessage Dock Pill) -->
    <transition name="pm-fade">
      <button
        v-if="!isOpen"
        class="partner-launcher-btn"
        @click="toggleOpen"
        title="Open Partner Messenger · Alex Richard & Waldo Ellis"
        aria-label="Open Partner Messenger"
      >
        <div class="launcher-avatars-cluster">
          <div class="avatar-circle avatar-alex" title="Alex Richard (Online)">AR</div>
          <div class="avatar-circle avatar-waldo" title="Waldo Ellis (Online)">WE</div>
          <span class="launcher-presence-dot"></span>
        </div>

        <div class="launcher-text-wrap">
          <div class="launcher-title">
            <span>Partner Chat</span>
            <span v-if="totalUnread > 0" class="launcher-unread-badge">{{ totalUnread }}</span>
          </div>
          <div class="launcher-sub">Alex &amp; Waldo</div>
        </div>

        <!-- Animated pulse ring when unread messages exist -->
        <span v-if="totalUnread > 0" class="launcher-pulse-ring"></span>
      </button>
    </transition>

    <!-- 2. Pop-up iMessage Window -->
    <transition name="pm-window">
      <div v-if="isOpen" class="partner-chat-window" :class="{ 'is-wide': isWideMode, 'is-minimized': isMinimized }">
        <!-- macOS Window Title Bar -->
        <div class="mac-title-bar">
          <div class="mac-traffic-lights">
            <button class="mac-dot mac-close" @click="closeWindow" title="Close Window"></button>
            <button class="mac-dot mac-minimize" @click="toggleMinimize" title="Minimize Window"></button>
            <button class="mac-dot mac-expand" @click="toggleWide" title="Toggle Wide Screen"></button>
          </div>
          <div class="mac-title-text">
            <strong>HushHawk Partner Messenger</strong>
            <span class="mac-encryption-pill">End-to-End Encrypted RDS</span>
          </div>
          <div class="mac-header-actions">
            <button
              class="mac-icon-btn"
              :class="{ active: soundEnabled }"
              @click="toggleSound"
              :title="soundEnabled ? 'Chime sound alert: Enabled' : 'Chime sound alert: Muted'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path v-if="soundEnabled" d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <line v-else x1="23" y1="9" x2="17" y2="15"></line>
              </svg>
            </button>
            <button class="mac-icon-btn" @click="refreshThreads" title="Refresh Live Threads">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: isLoadingThreads }">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>

        <div v-show="!isMinimized" class="pm-window-content">
          <!-- 3. Online Presence Box (Alex Richard & Waldo Ellis) -->
          <div class="partner-presence-box">
            <div class="presence-header">
              <span class="presence-title">PARTNERS ONLINE STATUS</span>
              <div class="persona-switch-wrap">
                <span class="persona-label">Chatting As:</span>
                <button
                  type="button"
                  class="persona-pill-btn"
                  :class="{ active: activePersona === 'Alex Richard' }"
                  @click="switchPersona('Alex Richard')"
                  title="Switch active user to Alex Richard (Me)"
                >
                  <span class="mini-avatar alex">AR</span>
                  Alex Richard (Me)
                </button>
                <button
                  type="button"
                  class="persona-pill-btn"
                  :class="{ active: activePersona === 'Waldo Ellis' }"
                  @click="switchPersona('Waldo Ellis')"
                  title="Switch active user to Waldo Ellis (Partner)"
                >
                  <span class="mini-avatar waldo">WE</span>
                  Waldo Ellis (Partner)
                </button>
              </div>
            </div>

            <div class="presence-cards-row">
              <div class="presence-card" :class="{ 'current-me': activePersona === 'Alex Richard' }">
                <div class="pc-avatar-wrap">
                  <div class="pc-avatar alex">AR</div>
                  <span class="pc-dot online"></span>
                </div>
                <div class="pc-details">
                  <div class="pc-name-row">
                    <strong>Alex Richard</strong>
                    <span class="pc-tag-me" v-if="activePersona === 'Alex Richard'">YOU</span>
                  </div>
                  <span class="pc-role">Acquisitions Lead · Online</span>
                </div>
              </div>

              <div class="presence-card" :class="{ 'current-me': activePersona === 'Waldo Ellis' }">
                <div class="pc-avatar-wrap">
                  <div class="pc-avatar waldo">WE</div>
                  <span class="pc-dot online"></span>
                </div>
                <div class="pc-details">
                  <div class="pc-name-row">
                    <strong>Waldo Ellis</strong>
                    <span class="pc-tag-me" v-if="activePersona === 'Waldo Ellis'">YOU</span>
                  </div>
                  <span class="pc-role">Dispositions Lead · Online</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 4. Property Quick Search & Dropdown Box -->
          <div class="property-search-section">
            <div class="search-input-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                v-model="propertySearchQuery"
                type="text"
                placeholder="Quick search property to start or switch chat (e.g. 123 Main St)..."
                @focus="showPropertyDropdown = true"
                @input="filterProperties"
              />
              <button
                v-if="propertySearchQuery"
                class="search-clear-btn"
                @click="clearPropertySearch"
                title="Clear Search"
              >×</button>
            </div>

            <!-- Autocomplete Property Dropdown -->
            <div v-if="showPropertyDropdown && filteredPropertyList.length > 0" class="property-dropdown-menu">
              <div class="dropdown-header">
                <span>SELECT PROPERTY FOR DEDICATED THREAD</span>
                <button class="dropdown-close-btn" @click="showPropertyDropdown = false">Close</button>
              </div>
              <div
                v-for="prop in filteredPropertyList"
                :key="prop.property_id"
                class="property-dropdown-item"
                @click="selectPropertyFromDropdown(prop)"
              >
                <div class="pdi-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                </div>
                <div class="pdi-info">
                  <div class="pdi-address">{{ prop.address_line1 || 'Property Record' }}, {{ prop.city }} {{ prop.state_code }}</div>
                  <div class="pdi-sub">Parcel: {{ prop.parcel_raw || 'Standard' }} · ZIP: {{ prop.postal_code }}</div>
                </div>
                <span class="pdi-badge" v-if="prop.existing_thread_id">Active Layer</span>
                <span class="pdi-badge pdi-new" v-else>+ Start Layer</span>
              </div>
            </div>
          </div>

          <!-- 5. Multi-Chat Layer Sliding Pill Bar -->
          <div class="multi-chat-sliding-bar-wrap">
            <button class="bar-scroll-btn left" @click="scrollTabs('left')" title="Scroll Left">‹</button>
            <div class="multi-chat-pill-bar" ref="tabBarRef">
              <button
                v-for="th in threads"
                :key="th.id"
                class="chat-layer-tab"
                :class="{ active: currentThread && currentThread.id === th.id, 'has-unread': th.unread_count > 0 }"
                @click="selectThread(th)"
              >
                <span class="tab-icon">
                  <svg v-if="th.thread_type === 'general'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                </span>
                <span class="tab-title">{{ getShortTitle(th.title) }}</span>
                <span v-if="th.unread_count > 0" class="tab-unread-dot" :title="`${th.unread_count} unread`">
                  {{ th.unread_count }}
                </span>
              </button>
            </div>
            <button class="bar-scroll-btn right" @click="scrollTabs('right')" title="Scroll Right">›</button>
          </div>

          <!-- 6. Active Property Context Dossier Bar -->
          <div v-if="currentThread && currentThread.thread_type === 'property'" class="active-property-banner">
            <div class="apb-left">
              <span class="apb-tag">PROPERTY LAYER</span>
              <strong class="apb-address">{{ currentThread.title }}</strong>
              <span class="apb-crownkey font-mono">{{ currentThread.crownkey || 'DUV-PROPERTY-THREAD' }}</span>
            </div>
            <div class="apb-right">
              <button class="btn-apb-dossier" @click="navigateToProperty(currentThread.property_id)" title="Open Full Property Dossier">
                <span>View Dossier</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>
          <div v-else class="active-property-banner general-banner">
            <span class="apb-tag general">GENERAL CHAT LAYER</span>
            <span class="general-desc">Executive direct communication between Alex Richard &amp; Waldo Ellis</span>
          </div>

          <!-- 7. iMessage Message Stream Viewport -->
          <div class="messages-viewport" ref="messagesViewportRef">
            <div v-if="isLoadingMessages" class="messages-loading">
              <span class="imessage-spinner"></span>
              <span>Loading encrypted conversation...</span>
            </div>

            <div v-else-if="messages.length === 0" class="messages-empty">
              <div class="empty-icon-bubble">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <p>Start a new discussion layer for <strong>{{ currentThread ? currentThread.title : 'this property' }}</strong>.</p>
              <span class="empty-hint">All messages are tagged directly to the property's timeline ledger.</span>
            </div>

            <div v-else class="messages-stream">
              <div class="stream-date-divider">
                <span>iMessage with Partner</span>
              </div>

              <div
                v-for="msg in messages"
                :key="msg.id"
                class="imessage-row"
                :class="{ 'is-me': isSenderMe(msg), 'is-partner': !isSenderMe(msg) }"
              >
                <!-- Partner Avatar on Incoming Messages -->
                <div v-if="!isSenderMe(msg)" class="partner-bubble-avatar" :title="msg.sender_name">
                  {{ getInitials(msg.sender_name) }}
                </div>

                <div class="imessage-bubble-wrap">
                  <div class="imessage-sender-header" v-if="!isSenderMe(msg)">
                    <span class="sender-name">{{ msg.sender_name }}</span>
                    <span class="sender-role">{{ msg.sender_role || 'Partner' }}</span>
                  </div>

                  <!-- Optional Tag Chip -->
                  <div v-if="msg.tag" class="msg-tag-chip">{{ msg.tag }}</div>

                  <div class="imessage-bubble">
                    <p class="bubble-text">{{ msg.message_text }}</p>
                  </div>

                  <div class="bubble-meta">
                    <span class="bubble-time">{{ formatTime(msg.created_at) }}</span>
                    <span v-if="isSenderMe(msg)" class="bubble-status">Delivered · Read</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 8. Quick Topic Suggestions / Action Chips -->
          <div class="quick-tags-bar">
            <span class="quick-tags-label">Tag:</span>
            <button
              v-for="tag in ['Offer Update', 'Title Issue', 'Rehab Comps', 'Contract Signed', 'Buyer Pool']"
              :key="tag"
              class="quick-tag-chip"
              :class="{ selected: activeTag === tag }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>

          <!-- 9. iMessage Message Input Bar -->
          <div class="imessage-composer-box">
            <textarea
              v-model="draftText"
              class="imessage-input"
              :placeholder="`iMessage to ${activePersona === 'Alex Richard' ? 'Waldo Ellis' : 'Alex Richard'}...`"
              rows="1"
              @keydown.enter.exact.prevent="sendMessage"
              @input="autoExpandTextarea"
              ref="inputTextareaRef"
            ></textarea>
            <button
              class="imessage-send-btn"
              :disabled="!draftText.trim() || isSending"
              @click="sendMessage"
              title="Send Message (Enter)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
const API_BASE = '/api/v1';

export default {
  name: 'PartnerChatMessenger',
  data() {
    return {
      isOpen: false,
      isMinimized: false,
      isWideMode: false,
      soundEnabled: true,
      activePersona: 'Alex Richard', // 'Alex Richard' or 'Waldo Ellis'
      threads: [],
      currentThread: null,
      messages: [],
      draftText: '',
      activeTag: null,
      isLoadingThreads: false,
      isLoadingMessages: false,
      isSending: false,
      propertySearchQuery: '',
      showPropertyDropdown: false,
      allProperties: [],
      pollTimer: null,
    };
  },
  computed: {
    shouldShowMessenger() {
      // Don't show on auth / login routes
      if (typeof window !== 'undefined') {
        const path = window.location.pathname || '';
        if (path.includes('login') || path.includes('signup') || path.includes('forgot-password')) {
          return false;
        }
      }
      return true;
    },
    totalUnread() {
      return this.threads.reduce((acc, t) => acc + (t.unread_count || 0), 0);
    },
    filteredPropertyList() {
      if (!this.propertySearchQuery) return this.allProperties.slice(0, 10);
      const q = this.propertySearchQuery.toLowerCase();
      return this.allProperties.filter(p => {
        const addr = (p.address_line1 || '').toLowerCase();
        const city = (p.city || '').toLowerCase();
        const parcel = (p.parcel_raw || '').toLowerCase();
        const zip = (p.postal_code || '').toLowerCase();
        return addr.includes(q) || city.includes(q) || parcel.includes(q) || zip.includes(q);
      }).slice(0, 12);
    }
  },
  watch: {
    activePersona() {
      this.refreshThreads();
    }
  },
  mounted() {
    this.fetchPropertiesForDropdown();
    this.refreshThreads();
    
    // Global Event Listener for Property Dossier "Partner Chat" clicks
    if (typeof window !== 'undefined') {
      window.addEventListener('open-partner-chat', this.handleExternalChatOpen);
    }

    // Periodic heartbeat/poll every 8 seconds for real-time messages
    this.pollTimer = setInterval(() => {
      if (this.isOpen && this.currentThread) {
        this.fetchMessagesSilently(this.currentThread.id);
      } else {
        this.fetchThreadsSilently();
      }
    }, 8000);
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('open-partner-chat', this.handleExternalChatOpen);
    }
    if (this.pollTimer) clearInterval(this.pollTimer);
  },
  methods: {
    toggleOpen() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.isMinimized = false;
        this.refreshThreads();
        this.$nextTick(() => {
          this.focusInput();
        });
      }
    },
    closeWindow() {
      this.isOpen = false;
    },
    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
    },
    toggleWide() {
      this.isWideMode = !this.isWideMode;
    },
    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
    },
    switchPersona(name) {
      this.activePersona = name;
      if (this.currentThread) {
        this.markThreadAsRead(this.currentThread.id);
      }
    },
    isSenderMe(msg) {
      if (!msg || !msg.sender_name) return false;
      return msg.sender_name.toLowerCase().includes(this.activePersona.toLowerCase().split(' ')[0]);
    },
    getInitials(name) {
      if (!name) return 'AR';
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    },
    getShortTitle(title) {
      if (!title) return 'Layer';
      if (title.includes('General')) return 'General';
      const parts = title.split(',');
      return parts[0].trim();
    },
    formatTime(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    scrollTabs(dir) {
      const el = this.$refs.tabBarRef;
      if (!el) return;
      const step = 160;
      el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
    },
    autoExpandTextarea() {
      const el = this.$refs.inputTextareaRef;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    },
    focusInput() {
      this.$nextTick(() => {
        if (this.$refs.inputTextareaRef) {
          this.$refs.inputTextareaRef.focus();
        }
      });
    },
    toggleTag(tag) {
      this.activeTag = this.activeTag === tag ? null : tag;
    },
    playChime() {
      if (!this.soundEnabled || typeof window === 'undefined') return;
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {}
    },
    async refreshThreads() {
      this.isLoadingThreads = true;
      try {
        const res = await fetch(`${API_BASE}/chat/threads?user=${encodeURIComponent(this.activePersona)}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.threads)) {
          this.threads = data.threads;
          if (!this.currentThread && this.threads.length > 0) {
            this.selectThread(this.threads[0]);
          } else if (this.currentThread) {
            const found = this.threads.find(t => t.id === this.currentThread.id);
            if (found) this.currentThread = found;
          }
        }
      } catch (err) {
        console.warn('[Partner Chat Threads Err]', err);
      } finally {
        this.isLoadingThreads = false;
      }
    },
    async fetchThreadsSilently() {
      try {
        const res = await fetch(`${API_BASE}/chat/threads?user=${encodeURIComponent(this.activePersona)}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.threads)) {
          this.threads = data.threads;
        }
      } catch (e) {}
    },
    async selectThread(th) {
      if (!th) return;
      this.currentThread = th;
      this.propertySearchQuery = '';
      this.showPropertyDropdown = false;
      this.isLoadingMessages = true;
      try {
        const res = await fetch(`${API_BASE}/chat/threads/${th.id}/messages?user=${encodeURIComponent(this.activePersona)}`);
        const data = await res.json();
        if (data.ok) {
          this.messages = data.messages || [];
          th.unread_count = 0;
          this.$nextTick(() => {
            this.scrollToBottom();
            this.focusInput();
          });
        }
      } catch (err) {
        console.warn('[Fetch Messages Err]', err);
      } finally {
        this.isLoadingMessages = false;
      }
    },
    async fetchMessagesSilently(threadId) {
      try {
        const res = await fetch(`${API_BASE}/chat/threads/${threadId}/messages?user=${encodeURIComponent(this.activePersona)}`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.messages)) {
          if (data.messages.length > this.messages.length) {
            this.messages = data.messages;
            this.playChime();
            this.$nextTick(() => this.scrollToBottom());
          }
        }
      } catch (e) {}
    },
    async sendMessage() {
      const text = this.draftText.trim();
      if (!text || !this.currentThread || this.isSending) return;
      this.isSending = true;

      const payload = {
        sender_name: this.activePersona,
        sender_role: this.activePersona === 'Alex Richard' ? 'Acquisitions Lead (Admin)' : 'Dispositions Lead (Partner)',
        message_text: text,
        tag: this.activeTag,
        attachments: []
      };

      try {
        const res = await fetch(`${API_BASE}/chat/threads/${this.currentThread.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.ok && data.message) {
          this.messages.push(data.message);
          this.currentThread.last_message_text = text;
          this.currentThread.last_message_sender = this.activePersona;
          this.draftText = '';
          this.activeTag = null;
          this.playChime();
          this.autoExpandTextarea();
          this.$nextTick(() => {
            this.scrollToBottom();
            this.focusInput();
          });
        }
      } catch (err) {
        console.warn('[Send Message Err]', err);
      } finally {
        this.isSending = false;
      }
    },
    async markThreadAsRead(threadId) {
      try {
        await fetch(`${API_BASE}/chat/threads/${threadId}/read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_name: this.activePersona })
        });
      } catch (e) {}
    },
    scrollToBottom() {
      const vp = this.$refs.messagesViewportRef;
      if (vp) {
        vp.scrollTop = vp.scrollHeight;
      }
    },
    async fetchPropertiesForDropdown() {
      try {
        const res = await fetch(`${API_BASE}/chat/search-properties`);
        const data = await res.json();
        if (data.ok && Array.isArray(data.properties)) {
          this.allProperties = data.properties;
        }
      } catch (e) {}
    },
    filterProperties() {
      this.showPropertyDropdown = true;
    },
    clearPropertySearch() {
      this.propertySearchQuery = '';
      this.showPropertyDropdown = false;
    },
    async selectPropertyFromDropdown(prop) {
      this.showPropertyDropdown = false;
      this.propertySearchQuery = '';

      // Check if thread exists in active threads list
      let targetThread = this.threads.find(t => t.property_id === prop.property_id);
      if (targetThread) {
        this.selectThread(targetThread);
        return;
      }

      // Otherwise create/fetch via POST
      try {
        const res = await fetch(`${API_BASE}/chat/threads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `${prop.address_line1}, ${prop.city}`,
            thread_type: 'property',
            property_id: prop.property_id,
            created_by: this.activePersona
          })
        });
        const data = await res.json();
        if (data.ok && data.thread) {
          await this.refreshThreads();
          const newlyAdded = this.threads.find(t => t.id === data.thread.id);
          this.selectThread(newlyAdded || data.thread);
        }
      } catch (err) {
        console.warn('[Create Property Thread Err]', err);
      }
    },
    async handleExternalChatOpen(evt) {
      const { propertyId, propertyAddress } = evt.detail || {};
      this.isOpen = true;
      this.isMinimized = false;

      if (!propertyId) {
        this.refreshThreads();
        return;
      }

      await this.refreshThreads();
      const existing = this.threads.find(t => t.property_id === propertyId);
      if (existing) {
        this.selectThread(existing);
      } else {
        // Create new layer
        await this.selectPropertyFromDropdown({
          property_id: propertyId,
          address_line1: propertyAddress || 'Property'
        });
      }
    },
    navigateToProperty(propId) {
      if (!propId || typeof window === 'undefined') return;
      window.location.href = `/properties?id=${propId}`;
    }
  }
};
</script>

<style scoped>
/* Bulletproof suppression on Auth & Login Pages */
:global(body:has(.hushhawk-auth-wrapper)) .partner-messenger-container,
:global(body:has(.auth-card)) .partner-messenger-container,
:global(body:has(#login-email)) .partner-messenger-container {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
}

.partner-messenger-container {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #f1f5f9;
  z-index: 999998;
}

/* 1. Floating Dock Trigger Button */
.partner-launcher-btn {
  position: fixed;
  bottom: 24px;
  right: 154px;
  height: 56px;
  padding: 0 16px 0 12px;
  border-radius: 28px;
  background: linear-gradient(135deg, #091528 0%, #112240 100%);
  border: 1.5px solid #d4af37;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(4, 24, 45, 0.7), 0 0 16px rgba(212, 175, 55, 0.28);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 999998;
}

.partner-launcher-btn:hover {
  transform: translateY(-2px) scale(1.02);
  border-color: #ffdf73;
  box-shadow: 0 12px 28px rgba(4, 24, 45, 0.85), 0 0 22px rgba(212, 175, 55, 0.45);
}

.launcher-avatars-cluster {
  position: relative;
  display: flex;
  align-items: center;
  width: 44px;
  height: 32px;
}

.avatar-circle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #091528;
}

.avatar-alex {
  background: linear-gradient(135deg, #d4af37 0%, #9a7b1c 100%);
  color: #04182d;
  z-index: 1;
}

.avatar-waldo {
  background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
  color: #ffffff;
  margin-left: -10px;
  z-index: 2;
}

.launcher-presence-dot {
  position: absolute;
  bottom: 0;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  border: 1.5px solid #091528;
  box-shadow: 0 0 6px #10b981;
  z-index: 3;
}

.launcher-text-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.launcher-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #ffdf73;
}

.launcher-unread-badge {
  background: #f43f5e;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: 10px;
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.6);
}

.launcher-sub {
  font-size: 11px;
  color: #94a3b8;
}

.launcher-pulse-ring {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 32px;
  border: 2px solid #d4af37;
  animation: pmPulse 2s infinite;
  pointer-events: none;
}

@keyframes pmPulse {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.08); opacity: 0; }
  100% { transform: scale(1); opacity: 0; }
}

/* 2. Pop-up iMessage Window */
.partner-chat-window {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 480px;
  height: 640px;
  max-height: calc(100vh - 48px);
  background: #08111f;
  border: 1.5px solid rgba(212, 175, 55, 0.4);
  border-radius: 16px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(212, 175, 55, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 999998;
  backdrop-filter: blur(20px);
  transition: width 0.25s ease, height 0.25s ease;
}

.partner-chat-window.is-wide {
  width: 620px;
}

.partner-chat-window.is-minimized {
  height: 44px;
}

/* Title Bar macOS style */
.mac-title-bar {
  height: 44px;
  background: linear-gradient(180deg, #0f1c32 0%, #0a1324 100%);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  user-select: none;
}

.mac-traffic-lights {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mac-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.mac-close { background: #ff5f56; }
.mac-minimize { background: #ffbd2e; }
.mac-expand { background: #27c93f; }
.mac-dot:hover { opacity: 0.8; }

.mac-title-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #f1f5f9;
}

.mac-encryption-pill {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.mac-header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.mac-icon-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 6px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mac-icon-btn:hover {
  background: rgba(212, 175, 55, 0.15);
  color: #d4af37;
  border-color: #d4af37;
}

.mac-icon-btn.active {
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.4);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.pm-window-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

/* 3. Presence Status Box */
.partner-presence-box {
  background: #060d18;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 14px;
}

.presence-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.presence-title {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #d4af37;
}

.persona-switch-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.persona-label {
  font-size: 11px;
  color: #64748b;
}

.persona-pill-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
}

.persona-pill-btn:hover {
  border-color: #d4af37;
  color: #fff;
}

.persona-pill-btn.active {
  background: rgba(212, 175, 55, 0.15);
  border-color: #d4af37;
  color: #ffdf73;
}

.mini-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-avatar.alex { background: #d4af37; color: #04182d; }
.mini-avatar.waldo { background: #38bdf8; color: #fff; }

.presence-cards-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.presence-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 28, 50, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  padding: 6px 10px;
  transition: border-color 0.2s ease;
}

.presence-card.current-me {
  border-color: rgba(212, 175, 55, 0.4);
  background: rgba(212, 175, 55, 0.05);
}

.pc-avatar-wrap {
  position: relative;
}

.pc-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pc-avatar.alex { background: linear-gradient(135deg, #d4af37, #9a7b1c); color: #04182d; }
.pc-avatar.waldo { background: linear-gradient(135deg, #38bdf8, #0284c7); color: #fff; }

.pc-dot {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid #08111f;
}

.pc-dot.online {
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.pc-details {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pc-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.pc-name-row strong {
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pc-tag-me {
  font-size: 8px;
  font-weight: 800;
  padding: 1px 4px;
  background: #d4af37;
  color: #04182d;
  border-radius: 3px;
}

.pc-role {
  font-size: 10px;
  color: #10b981;
  white-space: nowrap;
}

/* 4. Property Quick Search */
.property-search-section {
  position: relative;
  padding: 8px 14px;
  background: #091424;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.search-input-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(4, 18, 36, 0.85);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 8px;
  padding: 0 10px;
  height: 32px;
}

.search-input-box input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-size: 12px;
}

.search-input-box input::placeholder {
  color: #64748b;
}

.search-clear-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
}

.search-clear-btn:hover { color: #f1f5f9; }

.property-dropdown-menu {
  position: absolute;
  top: 44px;
  left: 14px;
  right: 14px;
  background: #0c182c;
  border: 1.5px solid #d4af37;
  border-radius: 8px;
  box-shadow: 0 14px 35px rgba(0,0,0,0.85);
  z-index: 1000;
  max-height: 240px;
  overflow-y: auto;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: rgba(212, 175, 55, 0.1);
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  font-size: 10px;
  font-weight: 800;
  color: #d4af37;
}

.dropdown-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
}

.property-dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.15s ease;
}

.property-dropdown-item:hover {
  background: rgba(212, 175, 55, 0.15);
}

.pdi-info {
  flex: 1;
  min-width: 0;
}

.pdi-address {
  font-size: 12px;
  font-weight: 600;
  color: #f1f5f9;
}

.pdi-sub {
  font-size: 10px;
  color: #64748b;
}

.pdi-badge {
  font-size: 10px;
  font-weight: 700;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.pdi-badge.pdi-new {
  color: #d4af37;
  background: rgba(212, 175, 55, 0.12);
  border-color: rgba(212, 175, 55, 0.3);
}

/* 5. Multi-Chat Sliding Pill Bar */
.multi-chat-sliding-bar-wrap {
  display: flex;
  align-items: center;
  background: #07101e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 6px;
  gap: 4px;
}

.bar-scroll-btn {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #94a3b8;
  width: 18px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
}

.bar-scroll-btn:hover {
  background: rgba(212, 175, 55, 0.2);
  color: #d4af37;
}

.multi-chat-pill-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  flex: 1;
}

.multi-chat-pill-bar::-webkit-scrollbar {
  display: none;
}

.chat-layer-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.chat-layer-tab:hover {
  color: #fff;
  border-color: rgba(212, 175, 55, 0.4);
}

.chat-layer-tab.active {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(10, 24, 45, 0.8) 100%);
  border-color: #d4af37;
  color: #ffdf73;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
}

.chat-layer-tab.has-unread {
  border-color: #f43f5e;
}

.tab-unread-dot {
  background: #f43f5e;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 8px;
  min-width: 14px;
  text-align: center;
}

/* 6. Active Property Context Banner */
.active-property-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 14px;
  background: linear-gradient(90deg, rgba(212, 175, 55, 0.08) 0%, rgba(4, 18, 36, 0.6) 100%);
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
}

.active-property-banner.general-banner {
  background: rgba(15, 28, 50, 0.4);
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.apb-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.apb-tag {
  font-size: 9px;
  font-weight: 800;
  color: #d4af37;
  letter-spacing: 0.5px;
}

.apb-tag.general {
  color: #38bdf8;
}

.apb-address {
  font-size: 12px;
  color: #f1f5f9;
}

.general-desc {
  font-size: 11px;
  color: #94a3b8;
}

.apb-crownkey {
  font-size: 10px;
  color: #64748b;
}

.btn-apb-dossier {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.35);
  color: #ffdf73;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-apb-dossier:hover {
  background: #d4af37;
  color: #04182d;
}

/* 7. Message Stream Viewport */
.messages-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  background: #060c16;
  gap: 10px;
}

.messages-loading, .messages-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto;
  color: #64748b;
  font-size: 12px;
  text-align: center;
  padding: 24px;
}

.empty-icon-bubble {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 11px;
  color: #475569;
  margin-top: 4px;
}

.stream-date-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 6px 0 12px 0;
}

.stream-date-divider span {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 10px;
  border-radius: 10px;
  letter-spacing: 0.5px;
}

.imessage-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.imessage-row.is-me {
  justify-content: flex-end;
}

.imessage-row.is-partner {
  justify-content: flex-start;
}

.partner-bubble-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4px;
}

.imessage-bubble-wrap {
  display: flex;
  flex-direction: column;
  max-width: 78%;
}

.imessage-row.is-me .imessage-bubble-wrap {
  align-items: flex-end;
}

.imessage-row.is-partner .imessage-bubble-wrap {
  align-items: flex-start;
}

.imessage-sender-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  margin-bottom: 2px;
}

.sender-name {
  font-weight: 700;
  color: #cbd5e1;
}

.sender-role {
  color: #10b981;
}

.msg-tag-chip {
  align-self: flex-start;
  font-size: 9px;
  font-weight: 800;
  color: #d4af37;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.25);
  padding: 1px 6px;
  border-radius: 4px;
  margin-bottom: 2px;
}

.imessage-row.is-me .msg-tag-chip {
  align-self: flex-end;
}

.imessage-bubble {
  padding: 9px 13px;
  border-radius: 16px;
  font-size: 12.5px;
  line-height: 1.45;
  word-break: break-word;
}

/* Sent by Me: macOS Deep Blue / Gold Border */
.imessage-row.is-me .imessage-bubble {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  color: #ffffff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 14px rgba(29, 78, 216, 0.35);
  border: 1px solid rgba(255, 223, 115, 0.3);
}

/* Sent by Partner: Dark Slate Card */
.imessage-row.is-partner .imessage-bubble {
  background: #172439;
  color: #f1f5f9;
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.bubble-text {
  margin: 0;
}

.bubble-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9px;
  color: #64748b;
  margin-top: 3px;
}

.bubble-status {
  color: #38bdf8;
}

/* 8. Quick Tags Bar */
.quick-tags-bar {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 14px;
  background: #08111f;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  overflow-x: auto;
  scrollbar-width: none;
}

.quick-tags-bar::-webkit-scrollbar {
  display: none;
}

.quick-tags-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
}

.quick-tag-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.quick-tag-chip:hover {
  border-color: #d4af37;
  color: #fff;
}

.quick-tag-chip.selected {
  background: rgba(212, 175, 55, 0.2);
  border-color: #d4af37;
  color: #ffdf73;
}

/* 9. Composer Box */
.imessage-composer-box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px;
  background: #0a1424;
  border-top: 1px solid rgba(212, 175, 55, 0.25);
}

.imessage-input {
  flex: 1;
  background: #050c17;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 8px 14px;
  color: #fff;
  font-size: 12.5px;
  font-family: inherit;
  resize: none;
  outline: none;
  max-height: 120px;
  line-height: 1.4;
  transition: border-color 0.2s ease;
}

.imessage-input:focus {
  border-color: #d4af37;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.2);
}

.imessage-send-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4af37 0%, #b89320 100%);
  border: none;
  color: #04182d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.4);
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.imessage-send-btn:hover:not(:disabled) {
  transform: scale(1.06);
  background: #ffdf73;
}

.imessage-send-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  box-shadow: none;
}

/* Transitions */
.pm-fade-enter-active, .pm-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.pm-fade-enter-from, .pm-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.pm-window-enter-active, .pm-window-leave-active {
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.pm-window-enter-from, .pm-window-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}
</style>
