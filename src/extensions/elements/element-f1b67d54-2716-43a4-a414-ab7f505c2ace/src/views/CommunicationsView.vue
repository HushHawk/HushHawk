<template>
  <div class="view-container">
    <div class="comms-layout">
      <!-- Left Panel: Conversation Thread List -->
      <div class="threads-panel">
        <div class="panel-top">
          <div class="top-header">
            <h3>
              <span v-html="icons.mail" aria-hidden="true"></span>
              Communications
            </h3>
            <div class="thread-header-controls">
              <button class="sync-crm-btn" @click="syncPodioAndSmrtPhone" :disabled="isSyncing" title="Sync Podio & smrtPhone">
                <span v-html="icons.refresh" :class="{ 'spin-anim': isSyncing }"></span>
                <span>{{ isSyncing ? 'Syncing...' : 'Sync Podio' }}</span>
              </button>
              <span class="badge-count">{{ unreadCount }} unread</span>
            </div>
          </div>
          <div class="search-box">
            <span v-html="icons.search"></span>
            <input v-model="searchQuery" type="text" placeholder="Search contacts, text, or address..." />
          </div>
          <div class="channel-filter-pills">
            <button
              v-for="ch in ['All', 'SMS', 'Calls', 'Email', 'smrtPhone', 'Podio', 'Buyers']"
              :key="ch"
              class="pill-btn"
              :class="{ active: channelFilter === ch }"
              @click="channelFilter = ch"
            >
              {{ ch }}
            </button>
          </div>
        </div>

        <div class="thread-list">
          <div v-if="filteredThreads.length === 0" style="padding: 24px; text-align: center; color: var(--hh-muted, #64748b); font-size: 13px;">
            No conversation threads found.
          </div>
          <div
            v-for="th in filteredThreads"
            :key="th.id"
            class="thread-card"
            :class="{ active: activeThread && activeThread.id === th.id, unread: th.unread }"
            @click="selectThread(th)"
          >
            <div class="thread-avatar" :class="th.type.toLowerCase()">
              <span v-html="getChannelIcon(th.type)"></span>
            </div>
            <div class="thread-meta">
              <div class="thread-title-row">
                <strong class="contact-name">{{ th.contact }}</strong>
                <span class="thread-time">{{ th.time }}</span>
              </div>
              <span class="prop-link">
                <span v-html="icons.pin" class="tiny-icon"></span>
                {{ th.address }}
              </span>
              <p class="thread-snippet">{{ th.lastMessage }}</p>
            </div>
            <span v-if="th.unread" class="unread-dot"></span>
          </div>
        </div>
      </div>

      <!-- Center Panel: Active Message Thread -->
      <div class="chat-panel">
        <div v-if="activeThread" class="chat-header">
          <div class="chat-contact-info">
            <div class="chat-avatar" :class="activeThread.type.toLowerCase()">
              <span v-html="getChannelIcon(activeThread.type)"></span>
            </div>
            <div class="chat-contact-details">
              <div class="name-phone-row">
                <h3>{{ activeThread.contact }}</h3>
                <span v-if="activeThread.role" class="contact-badge" :class="activeThread.role.toLowerCase()">{{ activeThread.role }}</span>
              </div>
              <div class="contact-meta">
                <span v-if="activeThread.phone" class="contact-phone font-mono">{{ activeThread.phone }}</span>
                <span v-if="activeThread.address" class="contact-address">{{ activeThread.address }}</span>
              </div>
            </div>
          </div>
          <div class="chat-actions">
            <button class="btn btn-secondary btn-sm" :disabled="!activeThread.phone" @click="makeCall(activeThread)">
              <span v-html="icons.phone"></span>
              <span>Call Now</span>
            </button>
            <button class="btn btn-subtle btn-sm" @click="toggleContextDrawer">
              <span v-html="icons.info"></span>
              <span>Property Intel</span>
            </button>
          </div>
        </div>

        <!-- Chat Conversation History -->
        <div v-if="activeThread" class="chat-messages">
          <div
            v-for="(msg, idx) in activeThread.messages"
            :key="idx"
            class="message-row"
            :class="{ outgoing: msg.outgoing, incoming: !msg.outgoing, system: msg.system }"
          >
            <div v-if="msg.system" class="system-bubble">
              <span v-html="icons.zap" class="tiny-icon"></span>
              {{ msg.text }}
            </div>
            <div v-else class="message-bubble">
              <div class="bubble-header">
                <span class="sender-name">{{ msg.name || msg.sender }}</span>
                <span v-if="msg.source" class="msg-source-tag">{{ msg.source }}</span>
                <span class="msg-time">{{ msg.time }}</span>
              </div>
              <p class="bubble-text"><template v-for="(part, pi) in textParts(msg.text)" :key="pi"><a v-if="part.url" class="msg-link" :href="part.url" target="_blank" rel="noopener noreferrer nofollow" :title="part.url">{{ part.label }}</a><template v-else>{{ part.text }}</template></template></p>
              <div v-if="messageLinks(msg).length" class="msg-link-chips">
                <a v-for="(link, li) in messageLinks(msg)" :key="li" class="msg-link-chip" :href="link.url" target="_blank" rel="noopener noreferrer nofollow" :title="link.url">🔗 {{ link.text }}</a>
              </div>
              <div v-if="msg.callDuration" class="call-meta">
                <span v-html="icons.phone" class="tiny-icon"></span>
                <span>Call Duration: {{ msg.callDuration }}</span>
              </div>
              <div v-if="msg.recordingUrl" class="call-recording-player">
                <div class="recording-label">
                  <span v-html="icons.phone" class="tiny-icon"></span>
                  <span>smrtPhone Call Recording</span>
                </div>
                <audio :src="msg.recordingUrl" controls preload="none" class="recording-audio"></audio>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Composer -->
        <div v-if="activeThread" class="chat-composer">
          <p v-if="sendFeedback" class="send-feedback" role="status">{{ sendFeedback }}</p>
          <!-- Quick Templates Bar -->
          <div class="quick-templates">
            <span class="template-label">Templates:</span>
            <button
              v-for="tpl in quickTemplates"
              :key="tpl.label"
              class="tpl-btn"
              @click="insertTemplate(tpl.text)"
            >
              {{ tpl.label }}
            </button>
          </div>
          <div class="input-row">
            <textarea
              v-model="outgoingText"
              rows="2"
              placeholder="Type your message, cash offer, or touch update... (Press Enter to Send)"
              @keydown.enter.exact.prevent="sendMessage"
            ></textarea>
            <button class="btn btn-primary send-btn" :disabled="sending || !outgoingText.trim()" @click="sendMessage">
              <span v-html="icons.send"></span>
              {{ sending ? 'Sending…' : 'Send' }}
            </button>
          </div>
        </div>
        <div v-if="!activeThread" class="chat-empty" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--hh-muted, #94a3b8); gap: 12px; padding: 60px 24px; text-align: center;">
          <span v-html="icons.mail" style="transform: scale(2); opacity: 0.6; color: #edcf7c; margin-bottom: 8px;"></span>
          <strong style="color: var(--hh-text, #f8fafc); font-size: 16px;">No Active Conversation Selected</strong>
          <p style="margin: 0; font-size: 13px; max-width: 380px; line-height: 1.5; color: var(--hh-muted, #64748b);">Inbound SMS messages, smrtPhone calls, and seller emails from your marketing channels will appear in real-time.</p>
        </div>
      </div>

      <!-- Right Panel: Linked Property Dossier -->
      <div v-if="showIntel && activeThread" class="intel-panel">
        <div class="intel-header">
          <h4>Linked Wholesale Asset</h4>
          <button class="close-btn" @click="showIntel = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="intel-body">
          <div class="prop-highlight">
            <strong>{{ activeThread.address || "No property linked" }}</strong>
            <span class="font-mono text-gold">{{ activeThread.parcelId }}</span>
          </div>

          <div class="info-card">
            <span class="k">Wholesale Stage</span>
            <span class="v status-pill">{{ activeThread.stage || "Unavailable" }}</span>
          </div>

          <div class="info-card">
            <span class="k">Offer / Valuation</span>
            <div class="val-grid">
              <div>
                <span class="sub-k">Last Offer</span>
                <strong class="text-gold">{{ activeThread.lastOffer == null ? 'Unavailable' : '$' + activeThread.lastOffer.toLocaleString() }}</strong>
              </div>
              <div>
                <span class="sub-k">Target ARV</span>
                <strong>{{ activeThread.arv == null ? 'Unavailable' : '$' + activeThread.arv.toLocaleString() }}</strong>
              </div>
            </div>
          </div>

          <div class="info-card">
            <span class="k">Quick Wholesale Actions</span>
            <div class="intel-btn-grid">
              <button class="btn btn-secondary btn-sm" @click="openContract(activeThread)">
                <span v-html="icons.file"></span>
                View PSA Contract
              </button>
              <button class="btn btn-secondary btn-sm" @click="openAnalyzer(activeThread)">
                <span v-html="icons.calculator"></span>
                Run Deal Analyzer
              </button>
            </div>
          </div>

          <div class="info-card">
            <span class="k">Assigned Lead Rep</span>
            <div class="rep-row">
              <span v-if="activeThread.repInitials" class="rep-avatar">{{ activeThread.repInitials }}</span>
              <span>{{ activeThread.rep || "Unassigned" }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

// Turns the addresses in a message into clickable links (http/https only). Rendered with plain text nodes, never as HTML.
const URL_IN_TEXT = /https?:\/\/[^\s<>"'\])]+/g;
function isSafeHttp(u) { try { return /^https?:$/.test(new URL(u).protocol); } catch (e) { return false; } }
function shortUrl(u) { try { const x = new URL(u); const rest = (x.pathname + x.search).replace(/^\/$/, ''); return x.hostname.replace(/^www\./, '') + (rest.length > 24 ? rest.slice(0, 24) + '…' : rest); } catch (e) { return u; } }
function textParts(text) {
  const s = String(text || ''); const parts = []; let last = 0; let m;
  URL_IN_TEXT.lastIndex = 0;
  while ((m = URL_IN_TEXT.exec(s))) {
    const url = m[0].replace(/[.,;:!?]+$/, '');
    if (m.index > last) parts.push({ text: s.slice(last, m.index) });
    parts.push(isSafeHttp(url) ? { url, label: shortUrl(url) } : { text: url });
    last = m.index + url.length;
    URL_IN_TEXT.lastIndex = last;
  }
  if (last < s.length) parts.push({ text: s.slice(last) });
  return parts;
}
function messageLinks(msg) {
  return (Array.isArray(msg && msg.links) ? msg.links : []).filter(l => l && l.text && isSafeHttp(l.url)).slice(0, 25);
}


export default {
  name: 'CommunicationsView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      searchQuery: '',
      channelFilter: 'All',
      outgoingText: '',
      sending: false,
      sendFeedback: '',
      isSyncing: false,
      showIntel: true,
      activeThread: null,
      quickTemplates: [
        { label: 'Cash Offer', text: 'Hi, this is HushHawk. Is now a good time to discuss your cash offer?' },
        { label: 'Inspection Request', text: 'Good morning! Our field underwriter would like to schedule a 15-minute walkthrough of the property tomorrow between 1-3 PM. Does that time work?' },
        { label: 'Buyer Deal Blast', text: 'Hi, are you interested in reviewing a new property opportunity? Reply and our team can share the details.' }
      ],
      threads: []
    };
  },
  computed: {
    unreadCount() {
      return this.threads.filter(t => t.unread).length;
    },
    filteredThreads() {
      return this.threads.filter(t => {
        if (this.channelFilter === 'SMS' && t.type !== 'SMS') return false;
        if (this.channelFilter === 'Calls' && t.type !== 'Calls') return false;
        if (this.channelFilter === 'Email' && t.type !== 'Email') return false;
        if (this.channelFilter === 'smrtPhone' && t.source !== 'SMRTPHONE' && t.type !== 'Calls') return false;
        if (this.channelFilter === 'Podio' && t.source !== 'PODIO' && t.type !== 'Email') return false;
        if (this.channelFilter === 'Buyers' && t.role !== 'VIP Buyer') return false;
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          return (
            t.contact.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q) ||
            t.lastMessage.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
  },
  mounted() {
    this.loadCommunications();
  },
  methods: {
    textParts,
    messageLinks,
    async syncPodioAndSmrtPhone() {
      if (this.isSyncing) return;
      this.isSyncing = true;
      try {
        const res = await fetch('/api/v1/integrations/podio/sync-communications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Could not sync conversations.');
        this.showToast('Podio sync complete', `${data.synced} conversations refreshed.`, 'success');
        await this.loadCommunications();
      } catch (error) {
        this.showToast('Podio sync failed', error.message, 'error');
      } finally {
        this.isSyncing = false;
      }
    },
    async loadCommunications() {
      try {
        const res = await fetch('/api/v1/communications');
        const data = await res.json();
        if (!res.ok || !Array.isArray(data.threads)) throw new Error(data.error || 'Could not load conversations.');
        const selected = this.activeThread?.id;
        this.threads = data.threads;
        this.activeThread = data.threads.find(thread => thread.id === selected) || data.threads[0] || null;
      } catch (error) {
        this.showToast('Communications unavailable', error.message, 'error');
      }
    },

    getChannelIcon(type) {
      if (type === 'Calls') return this.icons.phone;
      if (type === 'Email') return this.icons.mail;
      return this.icons.text;
    },
    selectThread(th) {
      this.activeThread = th;
      th.unread = false;
    },
    insertTemplate(text) {
      this.outgoingText = text;
    },
    async sendMessage() {
      const text = this.outgoingText.trim();
      const threadId = this.activeThread?.id;
      if (!text || !threadId || this.sending) return;
      this.sending = true;
      this.sendFeedback = '';
      try {
        const token = window.localStorage.getItem('hushhawk_auth_token');
        const response = await fetch('/api/v1/communications/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
          body: JSON.stringify({ threadId, text })
        });
        const result = await response.json();
        if (!response.ok || !result.accepted) throw new Error(result.error || 'Could not send the message.');
        if (this.outgoingText.trim() === text) this.outgoingText = '';
        this.sendFeedback = result.historySaved
          ? 'Accepted by the delivery provider.'
          : 'Accepted by the delivery provider. Conversation history could not be saved.';
        await this.loadCommunications();
      } catch (error) {
        this.sendFeedback = error.message;
      } finally {
        this.sending = false;
      }
    },
    showToast(title, message, type = 'info') {
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast(title, message, type);
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
        }
      }
    },
    makeCall(thread) {
      const phone = thread.phone?.replace(/[^\d+]/g, '');
      if (phone) window.location.href = `tel:${phone}`;
    },
    toggleContextDrawer() {
      this.showIntel = !this.showIntel;
    },
    openContract(th) {
      if (typeof window !== 'undefined') {
        window.location.href = '/contracts';
      }
    },
    openAnalyzer(th) {
      if (typeof window !== 'undefined') {
        window.location.href = '/deal-analyzer';
      }
    }
  }
};
</script>

<style scoped>
.send-feedback { color: var(--hh-text, #f8fafc); margin: 0 0 8px; }
.view-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: calc(100vh - 240px);
  min-height: 600px;
}

.comms-layout {
  display: flex;
  height: 100%;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
}

/* Left: Threads Panel */
.threads-panel {
  width: 320px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.15);
}

.panel-top {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.top-header {
  display: grid;
  gap: var(--hh-action-gap, 8px);
}
.thread-header-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--hh-action-gap, 8px);
}

.top-header h3 > span { flex-shrink: 0; }

.top-header h3 {
  font-size: 1.05rem;
  color: var(--hh-text, #f8fafc);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.badge-count {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
  border-radius: 10px;
  font-weight: 600;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.4rem 0.65rem;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #f8fafc;
  font-size: 0.8rem;
  width: 100%;
}

.channel-filter-pills {
  display: flex;
  gap: 0.35rem;
  overflow-x: auto;
}

.pill-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 0.25rem 0.55rem;
  border-radius: 6px;
  font-size: 0.7rem;
  cursor: pointer;
  white-space: nowrap;
}

.pill-btn.active {
  background: #edcf7c;
  color: #04182d;
  border-color: #edcf7c;
  font-weight: 600;
}

.thread-list {
  flex: 1;
  overflow-y: auto;
}

.thread-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--hh-border, rgba(255, 255, 255, 0.04));
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.thread-card:hover {
  background: var(--hh-hover, rgba(255, 255, 255, 0.03));
}

.thread-card.active {
  background: var(--hh-selected, rgba(237, 207, 124, 0.08));
  border-left: 3px solid var(--hh-gold, #edcf7c);
}

.thread-avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  flex-shrink: 0;
}

.thread-avatar.sms {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.thread-avatar.calls {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.thread-avatar.email {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.thread-meta {
  flex: 1;
  min-width: 0;
}

.thread-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contact-name {
  color: var(--hh-text, #f8fafc);
  font-size: 0.85rem;
}

.thread-card.active .contact-name {
  color: #0f172a;
}

.thread-time {
  font-size: 0.7rem;
  color: var(--hh-muted, #64748b);
}

.prop-link {
  font-size: 0.7rem;
  color: var(--hh-link, #94a3b8);
  display: flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-snippet {
  font-size: 0.75rem;
  color: var(--hh-muted, #cbd5e1);
  margin: 0.2rem 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-card.active .thread-snippet {
  color: #334155;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #edcf7c;
  position: absolute;
  top: 1rem;
  right: 0.75rem;
}

/* Center: Chat Panel */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.1);
}

.chat-contact-info {
  display: flex;
  align-items: center;
  flex: 1 1 245px;
  min-width: 0;
  gap: 0.75rem;
}

.chat-contact-details { min-width: 0; }
.chat-avatar {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.name-phone-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.name-phone-row h3 {
  font-size: 0.95rem;
  color: var(--hh-text, #f8fafc);
  margin: 0;
}

.contact-badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.contact-phone {
  font-size: 0.75rem;
  color: var(--hh-muted, #94a3b8);
}

.contact-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 12px;
  margin-top: 4px;
  font-size: 0.75rem;
  color: var(--hh-muted, #94a3b8);
  overflow-wrap: anywhere;
}

.chat-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hh-action-gap, 8px);
}

.chat-actions .btn { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.chat-actions .btn > span:first-child { display: inline-flex; flex-shrink: 0; }
.chat-actions .btn :deep(svg) { width: 16px; height: 16px; }

.chat-messages {
  flex: 1;
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message-row {
  display: flex;
}

.message-row.outgoing {
  justify-content: flex-end;
}

.message-row.incoming {
  justify-content: flex-start;
}

.message-row.system {
  justify-content: center;
}

.message-bubble {
  max-width: 70%;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.message-row.incoming .message-bubble {
  background: #1e293b;
  color: #f8fafc;
  border-bottom-left-radius: 2px;
}

.message-row.outgoing .message-bubble {
  background: rgba(237, 207, 124, 0.18);
  border: 1px solid rgba(237, 207, 124, 0.3);
  color: #f8fafc;
  border-bottom-right-radius: 2px;
}

.bubble-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.sender-name {
  font-size: 0.7rem;
  font-weight: 600;
  color: #edcf7c;
}

.msg-time {
  font-size: 0.65rem;
  color: #94a3b8;
}

.bubble-text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.msg-link { color: #edcf7c; text-decoration: underline; font-weight: 600; word-break: break-all; }
.msg-link-chips { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.msg-link-chip { display: block; padding: 8px 12px; border: 1px solid rgba(237, 207, 124, .5); border-radius: 8px; background: rgba(237, 207, 124, .1); color: #edcf7c; font-size: 12.5px; font-weight: 700; text-decoration: none; overflow-wrap: anywhere; }
.msg-link-chip:hover { background: rgba(237, 207, 124, .2); }

.simulate-call-btn {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #4ade80;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.simulate-call-btn:hover {
  background: rgba(34, 197, 94, 0.25);
  border-color: #4ade80;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.35);
}

.sync-crm-btn {
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.35);
  color: #FFDF73;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sync-crm-btn:hover:not(:disabled) {
  background: rgba(212, 175, 55, 0.22);
  border-color: #FFDF73;
}

.sync-crm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-anim {
  animation: syncSpin 1s linear infinite;
  display: inline-block;
}

@keyframes syncSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.msg-source-tag {
  font-size: 0.62rem;
  padding: 1px 6px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border-radius: 4px;
  border: 1px solid rgba(56, 189, 248, 0.3);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.call-recording-player {
  margin-top: 8px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.recording-label {
  font-size: 0.7rem;
  color: #4ade80;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.recording-audio {
  width: 100%;
  height: 28px;
  outline: none;
}

.call-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #4ade80;
  margin-top: 0.4rem;
}

.system-bubble {
  font-size: 0.75rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.chat-composer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.quick-templates {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow-x: auto;
}

.template-label {
  font-size: 0.7rem;
  color: var(--hh-muted, #64748b);
  font-weight: 600;
}

.tpl-btn {
  background: var(--hh-control, rgba(255, 255, 255, 0.06));
  border: 1px solid var(--hh-border, rgba(255, 255, 255, 0.08));
  color: var(--hh-text, #cbd5e1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  white-space: nowrap;
}

.tpl-btn:hover {
  background: var(--hh-hover, rgba(237, 207, 124, 0.15));
  color: var(--hh-gold, #edcf7c);
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.input-row textarea {
  flex: 1;
  background: var(--hh-control, #04182d);
  border: 1px solid var(--hh-border, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: var(--hh-text, #f8fafc);
  font-size: 0.85rem;
  outline: none;
  resize: none;
}

.send-btn {
  align-self: flex-end;
}

/* Right: Intel Panel */
.intel-panel {
  width: 280px;
  border-left: 1px solid var(--hh-border, rgba(255, 255, 255, 0.08));
  background: var(--hh-panel, rgba(0, 0, 0, 0.2));
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.intel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--hh-border, rgba(255, 255, 255, 0.06));
  padding-bottom: 0.5rem;
}

.intel-header h4 {
  font-size: 0.85rem;
  color: var(--hh-gold, #edcf7c);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
}

.prop-highlight {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: var(--hh-text, #f8fafc);
}

.info-card {
  background: var(--hh-control, rgba(255, 255, 255, 0.03));
  border: 1px solid var(--hh-border, rgba(255, 255, 255, 0.05));
  border-radius: 6px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.info-card .k {
  font-size: 0.7rem;
  color: var(--hh-muted, #94a3b8);
  text-transform: uppercase;
  font-weight: 600;
}

.status-pill {
  font-size: 0.75rem;
  color: #4ade80;
  font-weight: 600;
}

.val-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.sub-k {
  display: block;
  font-size: 0.65rem;
  color: var(--hh-muted, #64748b);
}

.intel-btn-grid {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.rep-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--hh-text, #f8fafc);
}

.rep-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--hh-inset, rgba(237, 207, 124, 0.2));
  color: var(--hh-gold, #edcf7c);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  border: 1px solid var(--hh-accent-border, rgba(212, 175, 55, 0.3));
}

.font-mono {
  font-family: monospace;
}

.text-gold {
  color: var(--hh-gold, #edcf7c);
}

.tiny-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #edcf7c;
  color: #04182d;
}

.btn-secondary {
  background: var(--hh-control, rgba(255, 255, 255, 0.08));
  color: var(--hh-text, #f8fafc);
  border: 1px solid var(--hh-border, rgba(255, 255, 255, 0.12));
}

.btn-secondary:hover {
  background: var(--hh-hover, rgba(255, 255, 255, 0.15));
}

.btn-subtle {
  background: transparent;
  color: var(--hh-muted, #94a3b8);
}

.close-btn {
  background: none;
  border: none;
  color: var(--hh-muted, #94a3b8);
  cursor: pointer;
}
@media (max-width: 1050px) {
  .view-container { height: auto; min-height: 0; }
  .comms-layout { flex-wrap: wrap; }
  .threads-panel { width: min(290px, 100%); }
  .chat-panel { min-height: 420px; }
  .intel-panel { width: 100%; border-left: 0; border-top: 1px solid var(--hh-border); }
}
@media (max-width: 700px) {
  .comms-layout { flex-direction: column; }
  .threads-panel { width: 100%; border-right: 0; border-bottom: 1px solid var(--hh-border); }
  .thread-list { max-height: 240px; }
  .chat-contact-info { flex-basis: 100%; }
}

/* Communications Light Mode Scoped Overrides */
:root:not(.ww-app-theme-dark) .msg-link { color: #7a5a12; }
:root:not(.ww-app-theme-dark) .msg-link-chip { color: #6b4e0f; background: rgba(160, 120, 30, .1); border-color: rgba(122, 90, 18, .45); }
:root:not(.ww-app-theme-dark) .msg-link-chip:hover { background: rgba(160, 120, 30, .18); }
:root:not(.ww-app-theme-dark) .thread-card .contact-name {
  color: #18273c !important;
  font-weight: 700 !important;
}
:root:not(.ww-app-theme-dark) .thread-card .thread-snippet {
  color: #46566b !important;
}
:root:not(.ww-app-theme-dark) .thread-card .prop-link {
  color: #2563eb !important;
}
:root:not(.ww-app-theme-dark) .thread-card .thread-time {
  color: #64748b !important;
}
:root:not(.ww-app-theme-dark) .thread-card.active {
  background: #f7edd7 !important;
  border-left-color: #765018 !important;
}
:root:not(.ww-app-theme-dark) .thread-card.active .contact-name {
  color: #18273c !important;
}
:root:not(.ww-app-theme-dark) .tpl-btn {
  background: #ede7da !important;
  color: #18273c !important;
  border-color: #cfc2ab !important;
  font-weight: 600 !important;
}
:root:not(.ww-app-theme-dark) .template-label {
  color: #46566b !important;
  font-weight: 700 !important;
}
</style>
