<template>
  <div v-if="shouldShowMessenger" class="partner-messenger-container">
    <!-- 1. Floating Trigger Launcher (Positioned directly ABOVE HAWKAI) -->
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

    <!-- 2. Pop-up iMessage Window (z-index 2000000: Suppresses HAWKAI while open) -->
    <transition name="pm-window">
      <div
        v-if="isOpen"
        class="partner-chat-window"
        :class="{ 'is-wide': isWideMode, 'is-minimized': isMinimized }"
      >
        <!-- macOS Window Title Bar (Single Unbroken Line) -->
        <div class="mac-title-bar">
          <div class="mac-bar-left">
            <button class="mobile-close-btn" @click="closeWindow" title="Close Window" aria-label="Close">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div class="mac-traffic-lights">
              <button class="mac-dot mac-close" @click="closeWindow" title="Close Window (Esc)"></button>
              <button class="mac-dot mac-minimize" @click="toggleMinimize" title="Minimize Window"></button>
              <button class="mac-dot mac-expand" @click="toggleWide" title="Toggle Wide Screen"></button>
            </div>
            <span class="mac-app-title">Partner Messenger</span>
            <span class="mac-active-layer-pill" :title="currentThread?.title">
              {{ currentLayerShortTitle }}
            </span>
          </div>

          <div class="mac-bar-right">
            <!-- Persona Switcher Segment -->
            <div class="persona-segmented-control" title="Switch active perspective">
              <button
                type="button"
                class="psc-btn"
                :class="{ active: activePersona === 'Alex Richard' }"
                @click="switchPersona('Alex Richard')"
                title="Active User: Alex Richard (Me)"
              >
                <span class="psc-avatar alex">AR</span>
                <span class="psc-label">Alex</span>
              </button>
              <button
                type="button"
                class="psc-btn"
                :class="{ active: activePersona === 'Waldo Ellis' }"
                @click="switchPersona('Waldo Ellis')"
                title="Active User: Waldo Ellis (Partner)"
              >
                <span class="psc-avatar waldo">WE</span>
                <span class="psc-label">Waldo</span>
              </button>
            </div>

            <!-- Property Search Toggle Button -->
            <button
              class="mac-icon-btn"
              :class="{ active: isSearchOpen }"
              @click="toggleSearch"
              title="Quick Search Property Layer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>

            <!-- Sound Alert Toggle -->
            <button
              class="mac-icon-btn"
              :class="{ active: soundEnabled }"
              @click="toggleSound"
              :title="soundEnabled ? 'Chime sound: Enabled' : 'Chime sound: Muted'"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path v-if="soundEnabled" d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <line v-else x1="23" y1="9" x2="17" y2="15"></line>
              </svg>
            </button>

            <!-- Refresh Threads -->
            <button class="mac-icon-btn" @click="refreshThreads" title="Refresh Live Data">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: isLoadingThreads }">
                <path d="M23 4v6h-6"></path>
                <path d="M1 20v-6h6"></path>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
            </button>
          </div>
        </div>

        <div v-show="!isMinimized" class="pm-window-content">
          <!-- 3. Online Status & Encryption Ribbon (Single Unbroken Line) -->
          <div class="partner-status-ribbon">
            <div class="psr-left">
              <div class="psr-item" :class="{ 'is-me': activePersona === 'Alex Richard' }">
                <span class="psr-dot online"></span>
                <strong class="psr-name">Alex Richard</strong>
                <span class="psr-role">Acquisitions (Admin)</span>
                <span class="psr-you" v-if="activePersona === 'Alex Richard'">YOU</span>
              </div>

              <span class="psr-sep">·</span>

              <div class="psr-item" :class="{ 'is-me': activePersona === 'Waldo Ellis' }">
                <span class="psr-dot online"></span>
                <strong class="psr-name">Waldo Ellis</strong>
                <span class="psr-role">Dispositions (Partner)</span>
                <span class="psr-you" v-if="activePersona === 'Waldo Ellis'">YOU</span>
              </div>
            </div>

            <div class="psr-right">
              <span class="psr-secure">
                <span class="psr-secure-dot"></span>
                Encrypted RDS
              </span>
            </div>
          </div>

          <!-- 4. Collapsible Property Quick Search Bar -->
          <transition name="pm-slide-down">
            <div v-if="isSearchOpen" class="property-search-section">
              <div class="search-input-box">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  ref="searchInputRef"
                  v-model="propertySearchQuery"
                  type="text"
                  placeholder="Quick search property to start or switch chat (e.g. 123 Main St)..."
                  @focus="showPropertyDropdown = true"
                  @input="showPropertyDropdown = true"
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2">
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
          </transition>

          <!-- 5. Multi-Chat Layer Sliding Pill Bar (Single Unbroken Line) -->
          <div class="multi-chat-sliding-bar-wrap">
            <button class="bar-scroll-btn left" @click="scrollTabs('left')" title="Scroll Left">‹</button>

            <div class="multi-chat-sliding-bar" ref="tabBarRef">
              <div
                v-for="th in threads"
                :key="th.id"
                class="chat-layer-tab"
                :class="{ active: currentThread && currentThread.id === th.id }"
                @click="selectThread(th)"
              >
                <div class="clt-icon">
                  <svg v-if="th.thread_type === 'property'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  </svg>
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <span class="clt-name">{{ getShortTitle(th.title) }}</span>
                <span v-if="th.unread_count > 0" class="clt-badge">{{ th.unread_count }}</span>
              </div>
            </div>

            <button class="bar-scroll-btn right" @click="scrollTabs('right')" title="Scroll Right">›</button>
          </div>

          <!-- 6. Active Property Context Banner (Single Unbroken Line) -->
          <div v-if="currentThread && currentThread.property_id" class="property-context-banner">
            <div class="pcb-left">
              <span class="pcb-tag">PROPERTY LAYER</span>
              <strong class="pcb-address" :title="currentThread.title">{{ currentThread.title }}</strong>
              <span class="pcb-crownkey" v-if="currentThread.crownkey">{{ currentThread.crownkey }}</span>
            </div>
            <div class="pcb-right">
              <button
                class="pcb-dossier-link"
                @click="navigateToProperty(currentThread.property_id)"
                title="Open full property dossier timeline"
              >
                <span>View Dossier</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </button>
            </div>
          </div>

          <!-- 7. Message Viewport Area -->
          <div class="messages-viewport" ref="messagesViewportRef">
            <div class="thread-start-marker">
              <span class="tsm-line"></span>
              <span class="tsm-text">
                {{ currentThread ? currentThread.title : 'Partner Chat' }}
              </span>
              <span class="tsm-line"></span>
            </div>

            <!-- Loading Spinner -->
            <div v-if="isLoadingMessages" class="messages-loading-state">
              <span class="ml-spinner"></span>
              <span>Loading messages from RDS…</span>
            </div>

            <!-- Empty State (Zero Test Messages) -->
            <div v-else-if="messages.length === 0" class="messages-empty-state">
              <div class="mes-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <h4>Direct Partner Conversation</h4>
              <p>No messages in this layer yet. Start chatting directly with your partner below.</p>
              <div class="mes-shortcuts">
                <button type="button" @click="fillDraft('Reviewed the comps, numbers looking clean.')">"Reviewed the comps..."</button>
                <button type="button" @click="fillDraft('Seller accepted our offer! Ready to open escrow.')">"Seller accepted offer..."</button>
              </div>
            </div>

            <!-- Messages Stream -->
            <div v-else class="messages-stream">
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="message-row"
                :class="{ 'is-me': isSenderMe(msg), 'is-partner': !isSenderMe(msg) }"
              >
                <!-- Partner Avatar (for incoming messages) -->
                <div v-if="!isSenderMe(msg)" class="msg-avatar-col">
                  <div class="msg-avatar" :class="msg.sender_name.includes('Alex') ? 'alex' : 'waldo'">
                    {{ getInitials(msg.sender_name) }}
                  </div>
                </div>

                <!-- Bubble Container with Hover Action Toolbar -->
                <div class="msg-content-col">
                  <div v-if="!isSenderMe(msg)" class="msg-sender-header">
                    <span class="msg-sender-name">{{ msg.sender_name }}</span>
                    <span class="msg-sender-role" v-if="msg.sender_role">{{ msg.sender_role }}</span>
                    <span v-if="msg.tag" class="msg-tag-badge">{{ msg.tag }}</span>
                  </div>

                  <div class="bubble-hover-wrapper">
                    <!-- Message Bubble -->
                    <div class="msg-bubble" :class="{ 'has-reply': msg.reply_to_text }">
                      <!-- Quoted Reply Card (If this message is a reply to another) -->
                      <div v-if="msg.reply_to_text" class="msg-quoted-card">
                        <div class="mqc-sender">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 17 4 12 9 7"></polyline>
                            <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                          </svg>
                          <span>{{ msg.reply_to_sender || 'Partner' }}</span>
                        </div>
                        <div class="mqc-text">{{ msg.reply_to_text }}</div>
                      </div>

                      <!-- Main Message Body -->
                      <div class="msg-body-text">{{ msg.message_text }}</div>
                    </div>

                    <!-- Floating Action Menu (Reply, Delete) -->
                    <div class="msg-actions-hover-bar">
                      <button
                        type="button"
                        class="mah-btn reply"
                        @click="startReply(msg)"
                        title="Reply to message"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="9 17 4 12 9 7"></polyline>
                          <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                        </svg>
                        <span>Reply</span>
                      </button>

                      <button
                        type="button"
                        class="mah-btn delete"
                        @click="deleteMessage(msg)"
                        title="Delete message"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Delivery & Seen Receipts -->
                  <div class="msg-meta-row">
                    <span class="msg-timestamp">{{ formatTime(msg.created_at) }}</span>
                    <span v-if="isSenderMe(msg)" class="msg-seen-status">
                      <template v-if="isMessageSeenByPartner(msg)">
                        <span class="seen-check">✓✓</span>
                        <span class="seen-text">Seen</span>
                      </template>
                      <template v-else>
                        <span class="delivered-check">✓</span>
                        <span class="delivered-text">Delivered</span>
                      </template>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 8. Interactive Reply Preview Banner (When Replying) -->
          <transition name="pm-slide-up">
            <div v-if="replyingTo" class="reply-active-banner">
              <div class="rab-left">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="2">
                  <polyline points="9 17 4 12 9 7"></polyline>
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>
                </svg>
                <div class="rab-info">
                  <span class="rab-sender">Replying to {{ replyingTo.sender_name }}</span>
                  <span class="rab-quote">{{ replyingTo.message_text }}</span>
                </div>
              </div>
              <button class="rab-dismiss-btn" @click="cancelReply" title="Cancel reply">×</button>
            </div>
          </transition>

          <!-- 9. Quick Topic Tag Chips -->
          <div class="quick-tags-strip">
            <span class="qts-label">TAG:</span>
            <button
              v-for="t in availableTags"
              :key="t"
              type="button"
              class="quick-tag-chip"
              :class="{ active: activeTag === t }"
              @click="toggleTag(t)"
            >
              {{ t }}
            </button>
          </div>

          <!-- 10. Message Composer Bar (Clean, Unobstructed, Send Button 100% Accessible) -->
          <div class="message-composer-bar">
            <div class="composer-input-wrap">
              <textarea
                ref="inputTextareaRef"
                v-model="draftText"
                class="composer-textarea"
                :placeholder="composerPlaceholder"
                rows="1"
                @keydown.enter.exact.prevent="sendMessage"
                @input="autoExpandTextarea"
              ></textarea>
            </div>

            <button
              class="composer-send-btn"
              :class="{ can_send: draftText.trim().length > 0 }"
              :disabled="!draftText.trim() || isSending"
              @click="sendMessage"
              title="Send Message (Enter)"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
const API_BASE = (typeof window !== 'undefined' && window.location.origin)
  ? (window.location.origin.includes('localhost') ? 'http://localhost:3001/api/v1' : `${window.location.origin}/api/v1`)
  : 'http://3.148.218.118/api/v1';

export default {
  name: 'PartnerChatMessenger',
  data() {
    return {
      isOpen: false,
      isMinimized: false,
      isWideMode: false,
      isSearchOpen: false,
      soundEnabled: true,
      isLoadingThreads: false,
      isLoadingMessages: false,
      isSending: false,
      activePersona: 'Alex Richard', // Default user "Me"
      threads: [],
      currentThread: null,
      messages: [],
      draftText: '',
      activeTag: null,
      replyingTo: null,
      availableTags: ['Offer Update', 'Title Issue', 'Rehab Comps', 'Contract Signed', 'Escrow', 'Underwriting'],
      propertySearchQuery: '',
      showPropertyDropdown: false,
      allProperties: [],
      pollTimer: null
    };
  },
  computed: {
    shouldShowMessenger() {
      if (typeof window === 'undefined') return true;
      const path = (this.$route?.path || window.location.pathname || '').toLowerCase();
      // Hide on login, signup, forgot-password screens
      if (path.includes('/login') || path.includes('/signup') || path.includes('/forgot-password')) {
        return false;
      }
      return true;
    },
    totalUnread() {
      if (!Array.isArray(this.threads)) return 0;
      return this.threads.reduce((sum, t) => sum + (t.unread_count || 0), 0);
    },
    currentPartnerName() {
      return this.activePersona === 'Alex Richard' ? 'Waldo Ellis' : 'Alex Richard';
    },
    currentLayerShortTitle() {
      if (!this.currentThread) return 'General';
      return this.getShortTitle(this.currentThread.title);
    },
    composerPlaceholder() {
      if (this.replyingTo) {
        return `Replying to ${this.replyingTo.sender_name}...`;
      }
      return `Message ${this.currentPartnerName}... (Enter to send)`;
    },
    filteredPropertyList() {
      const q = this.propertySearchQuery.toLowerCase().trim();
      if (!q) return this.allProperties.slice(0, 10);
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
    isOpen() {
      this.syncPartnerChatActiveState();
    },
    isMinimized() {
      this.syncPartnerChatActiveState();
    },
    activePersona() {
      this.refreshThreads();
      if (this.currentThread) {
        this.selectThread(this.currentThread);
      }
    }
  },
  mounted() {
    this.refreshThreads();
    this.fetchPropertiesForDropdown();

    if (typeof window !== 'undefined') {
      window.addEventListener('open-partner-chat', this.handleExternalChatOpen);
      window.addEventListener('keydown', this.handleGlobalKeydown);
    }

    // Fast realtime polling: every 2.5 seconds when open, every 5s when closed
    this.pollTimer = setInterval(() => {
      if (this.isOpen && this.currentThread) {
        this.fetchMessagesSilently(this.currentThread.id);
      } else {
        this.fetchThreadsSilently();
      }
    }, 2500);
  },
  beforeUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('open-partner-chat', this.handleExternalChatOpen);
      window.removeEventListener('keydown', this.handleGlobalKeydown);
      window.dispatchEvent(new CustomEvent('hushhawk-partner-chat-state', { detail: { open: false } }));
    }
    if (this.pollTimer) clearInterval(this.pollTimer);
  },
  methods: {
    syncPartnerChatActiveState() {
      const isActive = this.isOpen && !this.isMinimized;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hushhawk-partner-chat-state', { detail: { open: isActive } }));
        // Direct DOM safeguard to guarantee HawkAI never overlays the chat window
        const hawkEls = document.querySelectorAll('.hawk-copilot-container, .hawk-launcher-btn');
        hawkEls.forEach(el => {
          el.style.display = isActive ? 'none' : '';
        });
      }
    },
    handleGlobalKeydown(e) {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeWindow();
      }
    },
    toggleOpen() {
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.isMinimized = false;
        this.refreshThreads();
        this.$nextTick(() => {
          this.focusInput();
        });
      }
      this.syncPartnerChatActiveState();
    },
    closeWindow() {
      this.isOpen = false;
      this.syncPartnerChatActiveState();
    },
    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
      this.syncPartnerChatActiveState();
    },
    toggleWide() {
      this.isWideMode = !this.isWideMode;
    },
    toggleSearch() {
      this.isSearchOpen = !this.isSearchOpen;
      if (this.isSearchOpen) {
        this.$nextTick(() => {
          if (this.$refs.searchInputRef) this.$refs.searchInputRef.focus();
        });
      }
    },
    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
    },
    switchPersona(name) {
      this.activePersona = name;
    },
    isSenderMe(msg) {
      if (!msg || !msg.sender_name) return false;
      return msg.sender_name.toLowerCase().includes(this.activePersona.toLowerCase().split(' ')[0]);
    },
    isMessageSeenByPartner(msg) {
      if (!msg) return false;
      const isAlexMe = this.activePersona.toLowerCase().includes('alex');
      return isAlexMe ? !!msg.is_read_waldo : !!msg.is_read_alex;
    },
    getInitials(name) {
      if (!name) return 'AR';
      return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    },
    getShortTitle(title) {
      if (!title) return 'General';
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
      const step = 140;
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
    fillDraft(text) {
      this.draftText = text;
      this.focusInput();
      this.autoExpandTextarea();
    },
    startReply(msg) {
      this.replyingTo = msg;
      this.focusInput();
    },
    cancelReply() {
      this.replyingTo = null;
    },
    playChime() {
      if (!this.soundEnabled || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
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
      this.isLoadingMessages = true;
      this.cancelReply();
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
          if (data.messages.length !== this.messages.length) {
            const hasNewIncoming = data.messages.length > this.messages.length &&
              !this.isSenderMe(data.messages[data.messages.length - 1]);
            this.messages = data.messages;
            if (hasNewIncoming) {
              this.playChime();
            }
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
        reply_to_id: this.replyingTo ? this.replyingTo.id : null,
        reply_to_sender: this.replyingTo ? this.replyingTo.sender_name : null,
        reply_to_text: this.replyingTo ? this.replyingTo.message_text.slice(0, 160) : null,
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
          this.replyingTo = null;
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
    async deleteMessage(msg) {
      if (!msg || !msg.id) return;
      try {
        const res = await fetch(`${API_BASE}/chat/messages/${msg.id}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.ok) {
          this.messages = this.messages.filter(m => m.id !== msg.id);
          if (this.replyingTo && this.replyingTo.id === msg.id) {
            this.cancelReply();
          }
        }
      } catch (err) {
        console.warn('[Delete Message Err]', err);
      }
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
    clearPropertySearch() {
      this.propertySearchQuery = '';
      this.showPropertyDropdown = false;
    },
    async selectPropertyFromDropdown(prop) {
      this.showPropertyDropdown = false;
      this.propertySearchQuery = '';
      this.isSearchOpen = false;

      // Check if thread already exists in active threads list
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
          const created = this.threads.find(t => t.id === data.thread.id);
          if (created) this.selectThread(created);
        }
      } catch (err) {
        console.warn('[Create Thread Err]', err);
      }
    },
    navigateToProperty(propId) {
      if (!propId) return;
      if (typeof window !== 'undefined') {
        const currentPath = (window.location.pathname || '').toLowerCase();
        const isOnPropertiesPage = currentPath === '/properties' || currentPath.startsWith('/properties');

        if (isOnPropertiesPage) {
          // Already on properties page: update URL search param without full reload & notify view
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('id', propId);
          window.history.pushState({}, '', newUrl.toString());
          window.dispatchEvent(new CustomEvent('hushhawk-select-property', { detail: { property_id: propId } }));
        } else {
          // Navigate to Properties workspace
          if (window.wwLib && window.wwLib.wwApp && typeof window.wwLib.wwApp.goTo === 'function') {
            window.wwLib.wwApp.goTo('/properties', { id: propId });
          } else if (this.$router && typeof this.$router.push === 'function') {
            this.$router.push({ path: '/properties', query: { id: propId } });
          } else {
            window.location.href = `/properties?id=${encodeURIComponent(propId)}`;
          }
        }
      }
    },
    handleExternalChatOpen(e) {
      this.isOpen = true;
      this.isMinimized = false;
      this.syncPartnerChatActiveState();
      const detail = e.detail || {};

      this.$nextTick(async () => {
        await this.refreshThreads();
        if (detail.property_id) {
          const match = this.threads.find(t => t.property_id === detail.property_id);
          if (match) {
            this.selectThread(match);
          } else {
            // Fetch/create thread for this property
            this.selectPropertyFromDropdown({
              property_id: detail.property_id,
              address_line1: detail.address || 'Property Layer',
              city: detail.city || 'Duval County'
            });
          }
        }
      });
    }
  }
};
</script>

<style scoped>
/* ==========================================================================
   HUSHHAWK LUXURY INSTITUTIONAL PARTNER MESSENGER (MACOS IMESSAGE DOCK)
   Institutional Dark Navy & Royal Gold (#D4AF37) Palette
   ========================================================================== */

/* 1. Floating Launcher Button (Positioned directly ABOVE HAWKAI) */
.partner-launcher-btn {
  position: fixed;
  bottom: 84px; /* Stacked directly above HAWKAI (bottom: 24px) */
  right: 24px;
  z-index: 9998;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 18px 8px 12px;
  background: linear-gradient(135deg, rgba(8, 20, 38, 0.96) 0%, rgba(13, 30, 56, 0.98) 100%);
  border: 1px solid rgba(212, 175, 55, 0.45);
  border-radius: 9999px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 16px rgba(212, 175, 55, 0.2);
  cursor: pointer;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  color: #f1f5f9;
}

.partner-launcher-btn:hover {
  transform: translateY(-2px);
  border-color: #d4af37;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.65), 0 0 24px rgba(212, 175, 55, 0.35);
}

.launcher-avatars-cluster {
  position: relative;
  display: flex;
  align-items: center;
  width: 44px;
  height: 28px;
}

.avatar-circle {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: -0.5px;
  border: 2px solid #081426;
  position: absolute;
  top: 0;
}

.avatar-alex {
  left: 0;
  background: linear-gradient(135deg, #d4af37, #aa8214);
  color: #050b14;
  z-index: 1;
}

.avatar-waldo {
  left: 16px;
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: #ffffff;
  z-index: 2;
}

.launcher-presence-dot {
  position: absolute;
  bottom: -2px;
  right: 0;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #10b981;
  border: 2px solid #081426;
  z-index: 3;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.8);
}

.launcher-text-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  line-height: 1.15;
}

.launcher-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
}

.launcher-unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
}

.launcher-sub {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.launcher-pulse-ring {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 9999px;
  border: 2px solid #d4af37;
  animation: pm-pulse 2s infinite ease-out;
  pointer-events: none;
}

@keyframes pm-pulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.15); opacity: 0; }
}

/* 2. Pop-up iMessage Window */
.partner-chat-window {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 580px; /* Spacious width so nothing wraps or divides awkwardly */
  height: 680px;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 36px);
  background: #081426;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 18px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  z-index: 2000000; /* Ultra-high z-index so HAWKAI never overlays the chat window */
  overflow: hidden;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.partner-chat-window.is-wide {
  width: 820px;
  height: 760px;
}

.partner-chat-window.is-minimized {
  height: 48px;
  width: 380px;
}

/* macOS Title Bar (Single Unbroken Row) */
.mac-title-bar {
  height: 48px;
  min-height: 48px;
  background: linear-gradient(180deg, #0e1e36 0%, #0a172a 100%);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  user-select: none;
  white-space: nowrap;
}

.mac-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-shrink: 0;
}

.mac-traffic-lights {
  display: flex;
  align-items: center;
  gap: 7px;
}

.mac-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: opacity 0.15s;
}

.mac-dot:hover { opacity: 0.8; }
.mac-close { background: #ff5f56; box-shadow: 0 0 4px rgba(255, 95, 86, 0.5); }
.mac-minimize { background: #ffbd2e; box-shadow: 0 0 4px rgba(255, 189, 46, 0.5); }
.mac-expand { background: #27c93f; box-shadow: 0 0 4px rgba(39, 201, 63, 0.5); }

.mac-app-title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.2px;
  white-space: nowrap;
}

.mac-active-layer-pill {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(212, 175, 55, 0.15);
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.35);
  font-weight: 600;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mac-bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Compact Persona Segmented Control */
.persona-segmented-control {
  display: flex;
  align-items: center;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 2px;
}

.psc-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.psc-btn.active {
  background: rgba(212, 175, 55, 0.22);
  color: #ffffff;
  border: 1px solid rgba(212, 175, 55, 0.45);
}

.psc-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.psc-avatar.alex { background: #d4af37; color: #050b14; }
.psc-avatar.waldo { background: #0284c7; color: #ffffff; }

.mac-icon-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: #94a3b8;
  padding: 5px 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.mac-icon-btn:hover, .mac-icon-btn.active {
  color: #d4af37;
  border-color: rgba(212, 175, 55, 0.4);
  background: rgba(212, 175, 55, 0.1);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Window Content */
.pm-window-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #081426;
}

/* 3. Online Status & Encryption Ribbon (Single Unbroken Line) */
.partner-status-ribbon {
  height: 32px;
  min-height: 32px;
  background: rgba(10, 23, 42, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 11px;
  color: #cbd5e1;
  white-space: nowrap;
}

.psr-left {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
}

.psr-item {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.psr-dot.online {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 5px rgba(16, 185, 129, 0.8);
  flex-shrink: 0;
}

.psr-name {
  color: #f1f5f9;
  font-weight: 600;
}

.psr-role {
  color: #64748b;
  font-size: 10px;
}

.psr-you {
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(212, 175, 55, 0.25);
  color: #d4af37;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.psr-sep {
  color: #475569;
}

.psr-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.psr-secure {
  font-size: 10px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 4px;
}

.psr-secure-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #10b981;
}

/* 4. Collapsible Property Search Bar */
.property-search-section {
  position: relative;
  padding: 8px 14px;
  background: #0d1e38;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
}

.search-input-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #081426;
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 8px;
  padding: 6px 10px;
}

.search-input-box input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 12px;
}

.search-input-box input::placeholder {
  color: #64748b;
}

.search-clear-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}

.property-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 14px;
  right: 14px;
  max-height: 240px;
  background: #0d1e38;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 10px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8);
  overflow-y: auto;
  z-index: 10020;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #d4af37;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dropdown-close-btn {
  background: transparent;
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
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s;
}

.property-dropdown-item:hover {
  background: rgba(212, 175, 55, 0.12);
}

.pdi-info {
  flex: 1;
  min-width: 0;
}

.pdi-address {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pdi-sub {
  font-size: 10px;
  color: #94a3b8;
}

.pdi-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 9999px;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.pdi-badge.pdi-new {
  background: rgba(212, 175, 55, 0.2);
  color: #d4af37;
  border-color: rgba(212, 175, 55, 0.4);
}

/* 5. Multi-Chat Sliding Bar (Single Unbroken Line) */
.multi-chat-sliding-bar-wrap {
  display: flex;
  align-items: center;
  background: #09172e;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 6px 8px;
  gap: 6px;
  white-space: nowrap;
}

.bar-scroll-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 16px;
  padding: 0 4px;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
}

.bar-scroll-btn:hover { color: #d4af37; }

.multi-chat-sliding-bar {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  white-space: nowrap;
}

.multi-chat-sliding-bar::-webkit-scrollbar { display: none; }

.chat-layer-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s;
}

.chat-layer-tab:hover {
  background: rgba(212, 175, 55, 0.1);
  color: #e2e8f0;
}

.chat-layer-tab.active {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.22) 0%, rgba(8, 20, 38, 0.95) 100%);
  border-color: #d4af37;
  color: #ffffff;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.2);
}

.clt-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 9999px;
  background: #ef4444;
  color: #ffffff;
  font-size: 9px;
  font-weight: 800;
}

/* 6. Active Property Context Ribbon (Single Unbroken Line) */
.property-context-banner {
  height: 38px;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  background: rgba(13, 30, 56, 0.85);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  white-space: nowrap;
}

.pcb-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.pcb-tag {
  font-size: 9px;
  font-weight: 800;
  color: #d4af37;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(212, 175, 55, 0.15);
  flex-shrink: 0;
}

.pcb-address {
  font-size: 12px;
  color: #ffffff;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.pcb-crownkey {
  font-size: 11px;
  color: #94a3b8;
  font-family: monospace;
  white-space: nowrap;
  flex-shrink: 0;
}

.pcb-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.pcb-dossier-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 6px;
  color: #d4af37;
  padding: 4px 9px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.pcb-dossier-link:hover {
  background: rgba(212, 175, 55, 0.28);
}

/* 7. Message Viewport */
.messages-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: radial-gradient(circle at top right, rgba(14, 30, 54, 0.35), transparent 70%), #081426;
}

.thread-start-marker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0 12px 0;
  opacity: 0.6;
}

.tsm-line {
  flex: 1;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

.tsm-text {
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
  text-align: center;
}

/* Empty State */
.messages-empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  color: #64748b;
}

.mes-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.messages-empty-state h4 {
  font-size: 15px;
  color: #ffffff;
  margin: 0 0 6px 0;
  font-weight: 600;
}

.messages-empty-state p {
  font-size: 12px;
  color: #94a3b8;
  max-width: 320px;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.mes-shortcuts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  max-width: 340px;
}

.mes-shortcuts button {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 8px;
  padding: 7px 12px;
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s;
}

.mes-shortcuts button:hover {
  background: rgba(212, 175, 55, 0.15);
  border-color: #d4af37;
  color: #ffffff;
}

/* Messages Stream */
.messages-stream {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-row {
  display: flex;
  gap: 8px;
  max-width: 82%;
}

.message-row.is-me {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-row.is-partner {
  align-self: flex-start;
}

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}

.msg-avatar.alex { background: #d4af37; color: #050b14; }
.msg-avatar.waldo { background: #0284c7; color: #ffffff; }

.msg-content-col {
  display: flex;
  flex-direction: column;
}

.message-row.is-me .msg-content-col {
  align-items: flex-end;
}

.msg-sender-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
  font-size: 11px;
}

.msg-sender-name {
  color: #cbd5e1;
  font-weight: 600;
}

.msg-sender-role {
  color: #64748b;
  font-size: 10px;
}

.msg-tag-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(212, 175, 55, 0.18);
  color: #d4af37;
  border: 1px solid rgba(212, 175, 55, 0.3);
  font-weight: 600;
}

/* Bubble & Hover Actions Wrapper */
.bubble-hover-wrapper {
  position: relative;
  display: inline-flex;
}

.msg-bubble {
  padding: 9px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
  position: relative;
}

.message-row.is-me .msg-bubble {
  background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
  color: #ffffff;
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.3);
}

.message-row.is-partner .msg-bubble {
  background: #142742;
  color: #f1f5f9;
  border-bottom-left-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

/* Quoted Reply inside Bubble */
.msg-quoted-card {
  background: rgba(0, 0, 0, 0.25);
  border-left: 3px solid #d4af37;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 6px;
  font-size: 11px;
}

.mqc-sender {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #d4af37;
  font-weight: 700;
  margin-bottom: 2px;
}

.mqc-text {
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

/* Hover Action Bar */
.msg-actions-hover-bar {
  position: absolute;
  top: -12px;
  display: none;
  align-items: center;
  gap: 4px;
  background: #0d1e38;
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 6px;
  padding: 2px 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.message-row.is-me .msg-actions-hover-bar {
  right: 0;
}

.message-row.is-partner .msg-actions-hover-bar {
  left: 0;
}

.bubble-hover-wrapper:hover .msg-actions-hover-bar {
  display: flex;
}

.mah-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 2px 6px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.mah-btn:hover {
  background: rgba(212, 175, 55, 0.18);
  color: #ffffff;
}

.mah-btn.delete:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Delivery & Seen Meta */
.msg-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 10px;
  color: #64748b;
}

.seen-check {
  color: #38bdf8;
  font-weight: 800;
  letter-spacing: -1px;
}

.seen-text {
  color: #38bdf8;
  font-weight: 600;
}

.delivered-check {
  color: #94a3b8;
  font-weight: 700;
}

.delivered-text {
  color: #94a3b8;
}

/* 8. Reply Preview Banner */
.reply-active-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 14px;
  background: rgba(212, 175, 55, 0.12);
  border-top: 1px solid rgba(212, 175, 55, 0.3);
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
}

.rab-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.rab-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rab-sender {
  font-size: 10px;
  font-weight: 700;
  color: #d4af37;
}

.rab-quote {
  font-size: 11px;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 360px;
}

.rab-dismiss-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
}

.rab-dismiss-btn:hover { color: #ffffff; }

/* 9. Quick Tags Strip */
.quick-tags-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #09172e;
  overflow-x: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  scrollbar-width: none;
  white-space: nowrap;
}

.quick-tags-strip::-webkit-scrollbar { display: none; }

.qts-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  flex-shrink: 0;
}

.quick-tag-chip {
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9999px;
  padding: 3px 9px;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.15s;
}

.quick-tag-chip:hover {
  background: rgba(212, 175, 55, 0.1);
  color: #e2e8f0;
}

.quick-tag-chip.active {
  background: rgba(212, 175, 55, 0.22);
  border-color: #d4af37;
  color: #d4af37;
}

/* 10. Message Composer Bar */
.message-composer-bar {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px;
  background: #0a172c;
  border-top: 1px solid rgba(212, 175, 55, 0.25);
  position: relative;
  z-index: 20;
}

.composer-input-wrap {
  flex: 1;
  display: flex;
  min-width: 0;
}

.composer-textarea {
  width: 100%;
  background: #081426;
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 12px;
  padding: 10px 14px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  outline: none;
  line-height: 1.4;
  max-height: 120px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.composer-textarea:focus {
  border-color: #d4af37;
  box-shadow: 0 0 12px rgba(212, 175, 55, 0.25);
}

.composer-textarea::placeholder {
  color: #64748b;
}

.composer-send-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #142742;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: not-allowed;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.composer-send-btn.can_send {
  background: linear-gradient(135deg, #d4af37 0%, #b89120 100%);
  border-color: #d4af37;
  color: #050b14;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(212, 175, 55, 0.4);
}

.composer-send-btn.can_send:hover {
  transform: scale(1.06);
  box-shadow: 0 6px 18px rgba(212, 175, 55, 0.55);
}

/* Animations */
.pm-fade-enter-active, .pm-fade-leave-active { transition: opacity 0.2s ease; }
.pm-fade-enter-from, .pm-fade-leave-to { opacity: 0; }

.pm-window-enter-active, .pm-window-leave-active {
  transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
.pm-window-enter-from, .pm-window-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.96);
}

.pm-slide-down-enter-active, .pm-slide-down-leave-active {
  transition: all 0.2s ease;
}
.pm-slide-down-enter-from, .pm-slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.pm-slide-up-enter-active, .pm-slide-up-leave-active {
  transition: all 0.2s ease;
}
.pm-slide-up-enter-from, .pm-slide-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.mobile-close-btn {
  display: none;
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .partner-chat-window {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: 100% !important;
    height: 100dvh !important;
    max-height: 100dvh !important;
    border-radius: 0 !important;
    border: none !important;
    margin: 0 !important;
    padding-top: env(safe-area-inset-top, 0px);
    box-shadow: none !important;
    z-index: 2000000 !important;
  }

  .partner-chat-window.is-minimized {
    top: auto !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    width: 100vw !important;
    height: 54px !important;
    border-radius: 16px 16px 0 0 !important;
    border-top: 1px solid rgba(212, 175, 55, 0.4) !important;
  }

  .mac-traffic-lights {
    display: none !important;
  }

  .mobile-close-btn {
    display: inline-flex !important;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #e2e8f0;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: all 0.15s ease;
  }

  .mobile-close-btn:active {
    background: rgba(239, 68, 68, 0.3);
    border-color: #ef4444;
    color: #ffffff;
  }

  .mac-title-bar {
    height: 52px;
    min-height: 52px;
    padding: 0 10px;
    gap: 6px;
  }

  .mac-app-title {
    font-size: 13px;
    font-weight: 700;
  }

  .mac-active-layer-pill {
    max-width: 90px;
    font-size: 10px;
    padding: 2px 6px;
  }

  .mac-bar-right {
    gap: 4px;
  }

  .persona-segmented-control {
    padding: 2px;
  }

  .psc-btn {
    padding: 3px 5px !important;
    gap: 0 !important;
  }

  .psc-label {
    display: none !important;
  }

  .psc-avatar {
    width: 22px !important;
    height: 22px !important;
    font-size: 10px !important;
  }

  /* Status Ribbon on Mobile */
  .partner-status-ribbon {
    height: 28px;
    min-height: 28px;
    padding: 0 10px;
    font-size: 10px;
  }

  .psr-role {
    display: none !important;
  }

  .psr-name {
    font-size: 11px;
  }

  .psr-secure {
    font-size: 9px;
  }

  /* Multi-Chat Layer Tabs on Mobile */
  .bar-scroll-btn {
    display: none !important;
  }

  .multi-chat-sliding-bar {
    padding: 2px 4px;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
  }

  .chat-layer-tab {
    padding: 5px 10px;
    font-size: 11px;
    scroll-snap-align: start;
  }

  /* Property Context Banner on Mobile */
  .property-context-banner {
    height: 36px;
    min-height: 36px;
    padding: 0 10px;
    gap: 6px;
  }

  .pcb-tag {
    font-size: 8px;
    padding: 1px 4px;
  }

  .pcb-address {
    font-size: 11px;
    max-width: 140px;
  }

  .pcb-crownkey {
    display: none !important;
  }

  .pcb-dossier-link {
    padding: 4px 8px;
    font-size: 10px;
  }

  /* Messages on Mobile */
  .messages-viewport {
    padding: 10px;
    gap: 10px;
  }

  .message-bubble {
    max-width: 86% !important;
  }

  .bubble-text {
    font-size: 13.5px !important;
    line-height: 1.45 !important;
  }

  .bubble-actions {
    opacity: 0.8 !important;
    pointer-events: auto !important;
    position: static !important;
    margin-top: 4px !important;
    display: inline-flex !important;
  }

  /* Quick Tags on Mobile */
  .qts-label {
    display: none !important;
  }

  .quick-tags-strip {
    padding: 6px 10px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .quick-tag-chip {
    padding: 4px 9px;
    font-size: 10px;
    flex-shrink: 0;
  }

  /* Composer on Mobile (prevents iOS Safari auto-zoom) */
  .message-composer-bar {
    padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) 10px !important;
  }

  .composer-textarea {
    font-size: 16px !important;
    padding: 9px 12px !important;
    min-height: 42px;
  }

  .composer-send-btn {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    min-height: 44px !important;
    border-radius: 50% !important;
  }

  /* Launcher Button on Mobile */
  .partner-launcher-btn {
    bottom: 76px !important;
    right: 12px !important;
    padding: 6px 14px 6px 8px !important;
    touch-action: manipulation !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6), 0 0 14px rgba(212, 175, 55, 0.3) !important;
  }

  .launcher-avatars-cluster {
    width: 38px;
    height: 24px;
  }

  .avatar-circle {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }

  .launcher-title span:first-child {
    font-size: 12px;
  }

  .launcher-sub {
    font-size: 9px;
  }
}

@media (max-width: 480px) {
  .mac-icon-btn[title*="Chime"] {
    display: none !important;
  }

  .mac-app-title {
    font-size: 12px;
  }

  .mac-active-layer-pill {
    max-width: 75px;
  }
}
</style>
