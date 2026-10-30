<template>
  <div class="view-container">
    <div class="comms-layout">
      <!-- Left Panel: Conversation Thread List -->
      <div class="threads-panel">
        <div class="panel-top">
          <div class="top-header">
            <h3>
              <span v-html="icons.mail"></span>
              Omnichannel Comms
            </h3>
            <span class="badge-count">{{ unreadCount }} unread</span>
          </div>
          <div class="search-box">
            <span v-html="icons.search"></span>
            <input v-model="searchQuery" type="text" placeholder="Search contacts, text, or address..." />
          </div>
          <div class="channel-filter-pills">
            <button
              v-for="ch in ['All', 'SMS', 'Calls', 'Email', 'Buyers']"
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
            <div>
              <div class="name-phone-row">
                <h3>{{ activeThread.contact }}</h3>
                <span class="contact-badge" :class="activeThread.role.toLowerCase()">{{ activeThread.role }}</span>
              </div>
              <span class="contact-phone font-mono">{{ activeThread.phone }} • {{ activeThread.address }}</span>
            </div>
          </div>
          <div class="chat-actions">
            <button class="btn btn-secondary btn-sm" @click="makeCall(activeThread)">
              <span v-html="icons.phone"></span>
              Call Now
            </button>
            <button class="btn btn-subtle btn-sm" @click="toggleContextDrawer">
              <span v-html="icons.info"></span>
              Property Intel
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
                <span class="sender-name">{{ msg.sender }}</span>
                <span class="msg-time">{{ msg.time }}</span>
              </div>
              <p class="bubble-text">{{ msg.text }}</p>
              <div v-if="msg.callDuration" class="call-meta">
                <span v-html="icons.phone" class="tiny-icon"></span>
                <span>Call Duration: {{ msg.callDuration }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Composer -->
        <div v-if="activeThread" class="chat-composer">
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
            <button class="btn btn-primary send-btn" @click="sendMessage">
              <span v-html="icons.send"></span>
              Send
            </button>
          </div>
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
            <strong>{{ activeThread.address }}</strong>
            <span class="font-mono text-gold">{{ activeThread.parcelId }}</span>
          </div>

          <div class="info-card">
            <span class="k">Wholesale Stage</span>
            <span class="v status-pill">{{ activeThread.stage }}</span>
          </div>

          <div class="info-card">
            <span class="k">Offer / Valuation</span>
            <div class="val-grid">
              <div>
                <span class="sub-k">Last Offer</span>
                <strong class="text-gold">${{ activeThread.lastOffer?.toLocaleString() || 'N/A' }}</strong>
              </div>
              <div>
                <span class="sub-k">Target ARV</span>
                <strong>${{ activeThread.arv?.toLocaleString() || 'N/A' }}</strong>
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
              <span class="rep-avatar">{{ activeThread.repInitials }}</span>
              <span>{{ activeThread.rep }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

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
      showIntel: true,
      activeThread: null,
      quickTemplates: [
        { label: 'Cash Offer', text: 'Hi, this is Marcus with HushHawk. Following up on our cash purchase agreement of $145,000 net to you—can we finalize paperwork today?' },
        { label: 'Inspection Request', text: 'Good morning! Our field underwriter would like to schedule a 15-minute walkthrough of the property tomorrow between 1-3 PM. Does that time work?' },
        { label: 'Buyer Deal Blast', text: 'VIP INVESTOR ALERT: Off-market duplex in 32208 locked at $110,000. ARV $210,000. Clean title in escrow. Reply for walkthrough lockbox code.' }
      ],
      threads: [
        {
          id: 1,
          contact: 'Ronald Campbell',
          role: 'Distressed Seller',
          type: 'SMS',
          unread: true,
          time: '10:14 AM',
          phone: '(904) 555-0182',
          address: '4812 Moncrief Rd, Jacksonville, FL 32208',
          parcelId: 'DUV-091823-0001',
          stage: 'Under Contract',
          lastOffer: 110000,
          arv: 215000,
          rep: 'Marcus Vance',
          repInitials: 'MV',
          lastMessage: 'I reviewed the contract and signed through DocuSign. When does the earnest deposit go to First American?',
          messages: [
            { sender: 'Marcus Vance', time: 'Yesterday 3:15 PM', text: 'Ronald, sending over the Purchase and Sale Agreement with $110,000 cash purchase price and 10-day inspection period.', outgoing: true },
            { sender: 'System', time: 'Yesterday 3:16 PM', text: 'DocuSign PSA #2026-084 envelope delivered to r.campbell@att.net', system: true },
            { sender: 'Ronald Campbell', time: '10:14 AM', text: 'I reviewed the contract and signed through DocuSign. When does the earnest deposit go to First American?', outgoing: false }
          ]
        },
        {
          id: 2,
          contact: 'Apex Jacksonville Holdings (David Ross)',
          role: 'VIP Buyer',
          type: 'SMS',
          unread: false,
          time: '9:30 AM',
          phone: '(904) 555-8911',
          address: '1540 W 23rd St, Jacksonville, FL 32209',
          parcelId: 'DUV-084721-0034',
          stage: 'Dispo Active',
          lastOffer: 95000,
          arv: 195000,
          rep: 'Sarah Jenkins',
          repInitials: 'SJ',
          lastMessage: 'We inspected 23rd St this morning. We can take it at $132,000 cash with $5k non-refundable EMD today.',
          messages: [
            { sender: 'Sarah Jenkins', time: '8:45 AM', text: 'David, lockbox code for 1540 W 23rd St is 4921. Full packet attached in your email.', outgoing: true },
            { sender: 'Apex Holdings (David Ross)', time: '9:30 AM', text: 'We inspected 23rd St this morning. We can take it at $132,000 cash with $5k non-refundable EMD today.', outgoing: false }
          ]
        },
        {
          id: 3,
          contact: 'Evelyn Richardson',
          role: 'Distressed Seller',
          type: 'Calls',
          unread: false,
          time: 'Yesterday',
          phone: '(904) 555-0143',
          address: '4218 Commonwealth Ave, Jacksonville, FL 32254',
          parcelId: 'DUV-091822-0001',
          stage: 'Offer Sent',
          lastOffer: 138000,
          arv: 245000,
          rep: 'Marcus Vance',
          repInitials: 'MV',
          lastMessage: 'Inbound call recorded (4m 12s). Seller agreed to $138k net cash offer.',
          messages: [
            { sender: 'Evelyn Richardson', time: 'Yesterday 2:00 PM', text: 'Inbound Call Connected', callDuration: '4m 12s', outgoing: false },
            { sender: 'Marcus Vance', time: 'Yesterday 2:05 PM', text: 'Thank you for your time Evelyn. Preparing the formal agreement for Commonwealth Ave now.', outgoing: true }
          ]
        },
        {
          id: 4,
          contact: 'First Coast Title & Escrow',
          role: 'Title Partner',
          type: 'Email',
          unread: false,
          time: '2 days ago',
          phone: '(904) 555-3300',
          address: '3819 University Blvd S, Jacksonville, FL 32216',
          parcelId: 'DUV-071192-0012',
          stage: 'In Escrow',
          lastOffer: 165000,
          arv: 280000,
          rep: 'Sarah Jenkins',
          repInitials: 'SJ',
          lastMessage: 'Title commitment clear of municipal liens. Closing scheduled for Thursday 2:00 PM.',
          messages: [
            { sender: 'First Coast Title', time: '2 days ago', text: 'Title commitment clear of municipal liens. Closing scheduled for Thursday 2:00 PM.', outgoing: false }
          ]
        }
      ]
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
  created() {
    if (this.threads.length > 0) {
      this.activeThread = this.threads[0];
    }
  },

  mounted() {
    this.loadCommunications();
  },
  methods: {
    async loadCommunications() {
      try {
        const res = await fetch('/api/v1/communications');
        const data = await res.json();
        if (data.threads && data.threads.length > 0) {
          this.threads = data.threads;
          if (!this.activeThread) this.activeThread = data.threads[0];
        }
      } catch (err) {
        console.warn('[Communications] Using local cache:', err.message);
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
    sendMessage() {
      if (!this.outgoingText.trim() || !this.activeThread) return;
      this.activeThread.messages.push({
        sender: 'HushHawk Rep',
        time: 'Just now',
        text: this.outgoingText,
        outgoing: true
      });
      this.activeThread.lastMessage = this.outgoingText;
      this.outgoingText = '';
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
    makeCall(th) {
      this.showToast('Twilio Voice Outbound', `Connecting bridge to ${th.contact} (${th.phone})...`, 'success');
    },
    toggleContextDrawer() {
      this.showIntel = !this.showIntel;
    },
    openContract(th) {
      this.showToast('Contract Vault', `PSA loaded for ${th.address}. Ready for DocuSign dispatch.`, 'info');
    },
    openAnalyzer(th) {
      this.showToast('Deal Underwriting', `Deal Analyzer active for ${th.address}. Target MAO $135,000.`, 'info');
    }
  }
};
</script>

<style scoped>
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.top-header h3 {
  font-size: 1.05rem;
  color: #f8fafc;
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
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.thread-card:hover {
  background: rgba(255, 255, 255, 0.03);
}

.thread-card.active {
  background: rgba(237, 207, 124, 0.08);
  border-left: 3px solid #edcf7c;
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
  color: #f8fafc;
  font-size: 0.85rem;
}

.thread-time {
  font-size: 0.7rem;
  color: #64748b;
}

.prop-link {
  font-size: 0.7rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-snippet {
  font-size: 0.75rem;
  color: #cbd5e1;
  margin: 0.2rem 0 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.1);
}

.chat-contact-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.chat-avatar {
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
  align-items: center;
  gap: 0.5rem;
}

.name-phone-row h3 {
  font-size: 0.95rem;
  color: #f8fafc;
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
  color: #94a3b8;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
}

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
  color: #64748b;
}

.tpl-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  cursor: pointer;
  white-space: nowrap;
}

.tpl-btn:hover {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.input-row {
  display: flex;
  gap: 0.5rem;
}

.input-row textarea {
  flex: 1;
  background: #04182d;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: #f8fafc;
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
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.intel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 0.5rem;
}

.intel-header h4 {
  font-size: 0.85rem;
  color: #edcf7c;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.prop-highlight {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #f8fafc;
}

.info-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.info-card .k {
  font-size: 0.7rem;
  color: #94a3b8;
  text-transform: uppercase;
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
  color: #64748b;
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
  color: #f8fafc;
}

.rep-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(237, 207, 124, 0.2);
  color: #edcf7c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
}

.font-mono {
  font-family: monospace;
}

.text-gold {
  color: #edcf7c;
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
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-subtle {
  background: transparent;
  color: #94a3b8;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}
</style>
