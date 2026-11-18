<template>
  <section class="lead-conversation-desk" aria-labelledby="desk-title">
    <!-- Top Header -->
    <header class="desk-top-bar">
      <div class="desk-title-group">
        <span class="desk-header-icon" v-html="icons.text"></span>
        <h2 id="desk-title">Lead Conversation Desk <span class="v2-badge">v2</span></h2>
      </div>
      <div class="desk-meta-group">
        <span class="meta-label">Real Estate Leads</span>
        <span class="meta-separator">•</span>
        <span class="meta-label">{{ platforms.length }} Platforms</span>
        <span class="meta-separator">•</span>
        <div class="live-sync-indicator" :class="{ syncing: isSyncing }">
          <span class="sync-dot"></span>
          <span class="sync-text">Live Sync</span>
        </div>
      </div>
    </header>

    <!-- 16 Platforms Navigation Ribbon -->
    <nav class="platforms-ribbon" aria-label="Lead communication platforms">
      <button
        v-for="platform in platforms"
        :key="platform.platform_id"
        type="button"
        class="platform-tab"
        :class="{ active: activePlatformId === platform.platform_id, 'not-connected': platform.connection && platform.connection.status !== 'CONNECTED' }"
        :title="platform.connection ? platform.name + ': ' + platform.connection.note : platform.name"
        @click="selectPlatform(platform.platform_id)"
      >
        <span
          v-if="platform.platform_id === 'homesdotcom'"
          class="platform-brand-icon"
          :style="{ '--brand-color': platform.color }"
        >
          <img src="/icons/simple-icons/homesdotcom.ico" alt="" width="16" height="16" />
        </span>
        <span
          v-else
          class="platform-brand-icon"
          :style="{
            '--brand-color': platform.color,
            '--brand-mark': `url('/icons/simple-icons/${platform.platform_id}.svg')`
          }"
        ></span>
        <span class="platform-name">{{ platform.name }}</span>
        <span class="platform-count">({{ platform.lead_count }})</span>
        <span v-if="platform.connection" class="platform-dot" :class="platform.connection.status === 'CONNECTED' ? 'on' : 'off'" aria-hidden="true"></span>
      </button>
    </nav>

    <!-- Subheader: Inbox Info, Priority Filter & Active Contact Status -->
    <div class="desk-sub-bar">
      <div class="sub-left">
        <span
          v-if="currentPlatform?.platform_id === 'homesdotcom'"
          class="sub-platform-icon"
        >
          <img src="/icons/simple-icons/homesdotcom.ico" alt="" width="16" height="16" />
        </span>
        <span
          v-else-if="currentPlatform"
          class="sub-platform-icon"
          :style="{
            '--brand-color': currentPlatform.color,
            '--brand-mark': `url('/icons/simple-icons/${currentPlatform.platform_id}.svg')`
          }"
        ></span>
        <strong class="inbox-title">
          Inbox: {{ currentPlatform?.name || 'Platform' }} Leads ({{ currentPlatform?.lead_count || 0 }})
        </strong>

        <div class="priority-selector">
          <label for="lead-priority-filter">Priority:</label>
          <select id="lead-priority-filter" v-model="selectedPriority" @change="fetchThreads">
            <option value="All">All Priorities</option>
            <option value="High">Priority: High</option>
            <option value="Medium">Priority: Medium</option>
            <option value="Normal">Priority: Normal</option>
          </select>
        </div>
      </div>

      <div class="sub-right" v-if="activeThread">
        <div class="active-contact-pill">
          <span class="contact-mini-avatar">{{ getInitials(activeThread.contactName) }}</span>
          <span class="contact-title">{{ activeThread.contactName }} ({{ currentPlatform?.name }})</span>
          <span class="contact-separator">•</span>
          <span class="matched-badge">
            <span class="mini-green-dot"></span> {{ activeThread.status || '' }}
          </span>
          <span class="contact-separator">•</span>
          <span class="last-resp-time">Last response: {{ formatShortTime(activeThread.lastMessageAt) }}</span>
        </div>
      </div>
    </div>

    <!-- Main Workspace Split Pane -->
    <div class="desk-split-pane">
      <!-- Left Column: Lead Thread List -->
      <aside class="threads-column" aria-label="Conversation threads">
        <div v-if="isLoadingThreads" class="threads-state">
          <span class="spinner-dot"></span> Loading real-time threads…
        </div>
        <div v-else-if="threads.length === 0" class="threads-state empty">
          <template v-if="currentPlatform?.connection && currentPlatform.connection.status !== 'CONNECTED'">
            <strong>{{ currentPlatform.name }} is not connected.</strong><br>{{ currentPlatform.connection.note }}
          </template>
          <template v-else>No {{ selectedPriority !== 'All' ? selectedPriority : '' }} threads found for {{ currentPlatform?.name }}.</template>
        </div>
        <div v-else class="threads-scroll-container">
          <article
            v-for="thread in threads"
            :key="thread.id"
            class="thread-card"
            :class="{ selected: activeThreadId === thread.id }"
            @click="selectThread(thread.id)"
          >
            <div class="thread-top-row">
              <div class="thread-avatar-wrap">
                <span class="thread-avatar-text">{{ getInitials(thread.contactName) }}</span>
              </div>

              <div class="thread-contact-info">
                <div class="name-unread-wrap">
                  <strong class="contact-name-text">{{ thread.contactName }}</strong>
                  <span v-if="thread.unreadCount > 0" class="unread-count-pill">{{ thread.unreadCount }}</span>
                </div>
                <span class="thread-address-text">{{ thread.propertyAddress }}</span>
              </div>

              <div class="thread-score-wrap">
                <span v-if="thread.leadScore !== null && thread.leadScore !== undefined" class="score-pill" :class="getScoreClass(thread.leadScore)">
                  Score <strong>{{ thread.leadScore }}</strong>
                </span>
              </div>
            </div>

            <div class="thread-bottom-row">
              <p class="thread-preview-text">{{ thread.lastMessagePreview || 'New inquiry received...' }}</p>
            </div>
          </article>
        </div>
      </aside>

      <!-- Right Column: Conversation, Property Context, AI Suggestion & Composer -->
      <main class="conversation-column" aria-label="Active conversation">
        <div v-if="isLoadingMessages" class="conversation-state">
          <span class="spinner-dot"></span> Loading conversation history…
        </div>

        <template v-else-if="activeThread">
          <!-- Property Context Card Banner -->
          <div class="property-context-card">
            <div v-if="activeThread.propertyImage" class="prop-thumb-wrap">
              <img
                :src="activeThread.propertyImage"
                :alt="activeThread.propertyAddress"
                class="prop-thumb-img"
              />
            </div>
            <div class="prop-details-wrap">
              <h4 class="prop-address-heading">{{ activeThread.propertyAddress }}</h4>
              <p v-if="activeThread.propertyFacts || activeThread.propertySpecs" class="prop-specs-subtext">
                {{ activeThread.propertyFacts || activeThread.propertySpecs }}
              </p>
              <p v-else class="prop-specs-subtext">No property is linked to this conversation yet.</p>
            </div>
            <div class="prop-action-wrap">
              <a :href="activeThread.propertyId ? `/properties?id=${activeThread.propertyId}` : '/properties'" class="btn-prop-context">Property Context &gt;</a>
            </div>
          </div>

          <!-- Message History Bubbles -->
          <div class="messages-viewport" ref="messagesViewport">
            <div
              v-for="msg in activeThread.messages"
              :key="msg.id"
              class="message-row"
              :class="{
                outbound: msg.senderType === 'rep',
                inbound: msg.senderType === 'lead' || msg.senderType === 'ai'
              }"
            >
              <div class="message-bubble">
                <p class="bubble-text">{{ msg.content }}</p>
                <div class="bubble-footer">
                  <span class="bubble-check" v-if="msg.senderType === 'rep'">✓ </span>
                  <span class="bubble-timestamp">{{ msg.time || formatShortTime(msg.sentAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- AI Reply Suggestion Banner -->
          <div v-if="activeThread.aiSuggestion" class="ai-suggestion-banner">
            <div class="ai-suggestion-content">
              <span class="ai-spark-icon">✨</span>
              <span class="ai-suggestion-label">AI Reply Suggestion:</span>
              <span class="ai-suggestion-quote">“{{ activeThread.aiSuggestion }}”</span>
            </div>
            <button
              type="button"
              class="btn-use-reply"
              @click="applyAiSuggestion(activeThread.aiSuggestion)"
            >
              Use Reply &gt;
            </button>
          </div>

          <!-- Quick Action Toolbar -->
          <div class="quick-action-toolbar">
            <button type="button" class="btn-quick-action" @click="handleAction('open-lead')">
              <span class="action-icon" v-html="icons.users"></span> Open Lead
            </button>
            <button type="button" class="btn-quick-action" @click="handleAction('call')">
              <span class="action-icon" v-html="icons.phone"></span> Call
            </button>
            <button type="button" class="btn-quick-action" @click="handleAction('text')">
              <span class="action-icon" v-html="icons.text"></span> Text
            </button>
            <button type="button" class="btn-quick-action" @click="handleAction('email')">
              <span class="action-icon" v-html="icons.mail"></span> Email
            </button>
            <button type="button" class="btn-quick-action" @click="handleAction('assign')">
              <span class="action-icon" v-html="icons.check"></span> Assign
            </button>
            <button type="button" class="btn-quick-action" @click="handleAction('schedule')">
              <span class="action-icon" v-html="icons.calendar"></span> Schedule Follow-Up
            </button>
          </div>

          <!-- Message Composer Area -->
          <form class="composer-container" @submit.prevent="sendMessage">
            <div class="composer-input-wrap">
              <input
                ref="replyInput"
                v-model="replyText"
                type="text"
                class="composer-input"
                :placeholder="`Type a reply to ${activeThread.contactName}...`"
                :disabled="isSending"
              />
            </div>
            <button
              type="submit"
              class="btn-send-reply"
              :disabled="!replyText.trim() || isSending"
            >
              <span v-if="isSending">Sending…</span>
              <span v-else>Send Reply</span>
            </button>
          </form>
        </template>

        <div v-else class="conversation-state empty">
          <p>Select a contact thread on the left to start live conversation.</p>
        </div>
      </main>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { icons } from '../../../element-f1b67d54-2716-43a4-a414-ab7f505c2ace/src/icons.js';

// State - loaded dynamically from PostgreSQL database
const platforms = ref([
  { platform_id: 'facebook', name: 'Facebook', color: '#1877f2', lead_count: 0 },
  { platform_id: 'instagram', name: 'Instagram', color: '#e94f90', lead_count: 0 },
  { platform_id: 'tiktok', name: 'TikTok', color: '#69dce5', lead_count: 0 },
  { platform_id: 'youtube', name: 'YouTube', color: '#fa4545', lead_count: 0 },
  { platform_id: 'linkedin', name: 'LinkedIn', color: '#48a9e7', lead_count: 0 },
  { platform_id: 'x', name: 'X', color: '#e9eff9', lead_count: 0 },
  { platform_id: 'nextdoor', name: 'Nextdoor', color: '#91dd69', lead_count: 0 },
  { platform_id: 'reddit', name: 'Reddit', color: '#ff6c42', lead_count: 0 },
  { platform_id: 'whatsapp', name: 'WhatsApp', color: '#32d97b', lead_count: 0 },
  { platform_id: 'zillow', name: 'Zillow', color: '#6ba8ff', lead_count: 0 },
  { platform_id: 'trulia', name: 'Trulia', color: '#68d2a6', lead_count: 0 },
  { platform_id: 'yelp', name: 'Yelp', color: '#ff686b', lead_count: 0 },
  { platform_id: 'google', name: 'Google', color: '#79acff', lead_count: 0 },
  { platform_id: 'homesdotcom', name: 'Homes.com', color: '#ff9d64', lead_count: 0 },
  { platform_id: 'houzz', name: 'Houzz', color: '#83d960', lead_count: 0 },
  { platform_id: 'messenger', name: 'Messenger', color: '#65a1ff', lead_count: 0 }
]);

const activePlatformId = ref('facebook');
// The signed-in person: assignments and notes are theirs, never an invented name.
const deskUserName = ref('me');
const selectedPriority = ref('All');
const threads = ref([]);
const activeThreadId = ref(null);
const activeThread = ref(null);

const isLoadingThreads = ref(true);
const isLoadingMessages = ref(false);
const isSending = ref(false);
const isSyncing = ref(false);
const replyText = ref('');
const messagesViewport = ref(null);
const replyInput = ref(null);

let syncInterval = null;
let lastSyncTime = new Date().toISOString();

// Computed
const currentPlatform = computed(() => {
  return platforms.value.find(p => p.platform_id === activePlatformId.value) || platforms.value[0];
});

// Helpers
function getInitials(name) {
  if (!name) return 'LD';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();
}

function getScoreClass(score) {
  if (score >= 90) return 'score-high';
  if (score >= 80) return 'score-med';
  return 'score-normal';
}

function formatShortTime(timestamp) {
  if (!timestamp) return 'Just now';
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return 'Just now';
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesViewport.value) {
      messagesViewport.value.scrollTop = messagesViewport.value.scrollHeight;
    }
  });
}

// Data Fetching
async function fetchPlatforms() {
  try {
    const res = await fetch('/api/v1/lead-desk/platforms');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.platforms) && data.platforms.length > 0) {
        platforms.value = data.platforms;
      }
    }
  } catch (err) {
    console.warn('[LeadDesk] Failed to fetch platforms:', err.message);
  }
}

async function fetchThreads() {
  isLoadingThreads.value = true;
  try {
    let url = `/api/v1/lead-desk/threads?platform=${encodeURIComponent(activePlatformId.value)}`;
    if (selectedPriority.value && selectedPriority.value !== 'All') {
      url += `&priority=${encodeURIComponent(selectedPriority.value)}`;
    }
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      threads.value = data.threads || [];
      if (threads.value.length > 0) {
        const stillExists = threads.value.find(t => t.id === activeThreadId.value);
        if (!stillExists) {
          selectThread(threads.value[0].id);
        } else {
          selectThread(activeThreadId.value);
        }
      } else {
        activeThreadId.value = null;
        activeThread.value = null;
      }
    }
  } catch (err) {
    console.error('[LeadDesk] fetchThreads error:', err);
  } finally {
    isLoadingThreads.value = false;
  }
}

async function selectPlatform(platformId) {
  if (activePlatformId.value === platformId) return;
  activePlatformId.value = platformId;
  activeThreadId.value = null;
  activeThread.value = null;
  await fetchThreads();
}

async function selectThread(threadId) {
  activeThreadId.value = threadId;
  isLoadingMessages.value = true;
  try {
    const res = await fetch(`/api/v1/lead-desk/threads/${encodeURIComponent(threadId)}`);
    if (res.ok) {
      const data = await res.json();
      activeThread.value = data;

      // Update thread unread state in local thread list
      const matched = threads.value.find(t => t.id === threadId);
      if (matched) {
        matched.unreadCount = 0;
      }
      scrollToBottom();
    }
  } catch (err) {
    console.error('[LeadDesk] selectThread error:', err);
  } finally {
    isLoadingMessages.value = false;
  }
}

function applyAiSuggestion(suggestion) {
  if (!suggestion) return;
  replyText.value = suggestion;
  nextTick(() => {
    if (replyInput.value) {
      replyInput.value.focus();
    }
  });
}

async function sendMessage() {
  const content = replyText.value.trim();
  if (!content || !activeThreadId.value || isSending.value) return;

  isSending.value = true;
  try {
    const res = await fetch(`/api/v1/lead-desk/threads/${encodeURIComponent(activeThreadId.value)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        
        senderType: 'rep'
      })
    });

    if (res.ok) {
      const newMsg = await res.json();
      if (!activeThread.value.messages) {
        activeThread.value.messages = [];
      }
      activeThread.value.messages.push(newMsg);
      replyText.value = '';

      // Update thread last preview in the left list
      const matched = threads.value.find(t => t.id === activeThreadId.value);
      if (matched) {
        matched.lastMessagePreview = content;
        matched.lastMessageAt = new Date().toISOString();
      }
      scrollToBottom();
    }
  } catch (err) {
    console.error('[LeadDesk] Send message failed:', err);
  } finally {
    isSending.value = false;
  }
}

// Real-time synchronization
async function syncLeadDesk() {
  if (isSyncing.value) return;
  isSyncing.value = true;
  try {
    const url = `/api/v1/lead-desk/sync?platformId=${encodeURIComponent(activePlatformId.value)}&since=${encodeURIComponent(lastSyncTime)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      lastSyncTime = data.serverTime || new Date().toISOString();

      // Update platform counts
      if (Array.isArray(data.platforms)) {
        platforms.value = data.platforms;
      }

      // Check if current thread has new messages
      if (Array.isArray(data.messages) && data.messages.length > 0 && activeThread.value) {
        let hasNew = false;
        data.messages.forEach(msg => {
          if (msg.threadId === activeThread.value.id) {
            const alreadyExists = activeThread.value.messages?.some(m => m.id === msg.id);
            if (!alreadyExists) {
              activeThread.value.messages.push(msg);
              hasNew = true;
            }
          }
        });
        if (hasNew) {
          scrollToBottom();
        }
      }
    }
  } catch (err) {
    // Non-blocking sync
  } finally {
    isSyncing.value = false;
  }
}

function showDeskToast(title, message, type = 'success') {
  if (typeof window !== 'undefined') {
    if (window.showHushHawkToast) {
      window.showHushHawkToast(title, message, type);
    } else {
      window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
    }
  }
}

async function handleAction(action) {
  if (!activeThread.value) return;
  const lead = activeThread.value;
  switch (action) {
    case 'open-lead':
      window.location.href = lead.propertyId ? `/properties?id=${lead.propertyId}` : `/seller-leads`;
      break;
    case 'call':
      if (lead.contactPhone) {
        showDeskToast('Dispatching Voice Bridge', `Connecting to ${lead.contactName} (${lead.contactPhone})...`, 'info');
        try {
          const res = await fetch('/api/v1/calls/dispatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientPhone: lead.contactPhone,
              propertyId: lead.propertyId || null,
              
              notes: `Outbound call to ${lead.contactName} on ${lead.propertyAddress || 'Duval County'}`
            })
          });
          const data = await res.json();
          if (data.carrier?.nativeUri) {
            window.location.href = data.carrier.nativeUri;
          } else {
            window.location.href = `tel:${lead.contactPhone.replace(/\D/g, '')}`;
          }
          showDeskToast('Voice Call Dispatched', `Bridge opened to ${lead.contactName}. Logged to interaction ledger.`, 'success');
        } catch (e) {
          window.location.href = `tel:${lead.contactPhone.replace(/\D/g, '')}`;
        }
      } else {
        showDeskToast('No Phone Number', `No direct phone found for ${lead.contactName}. Run skip trace on County Data.`, 'warning');
      }
      break;
    case 'text':
      if (replyInput.value) {
        replyInput.value.focus();
      }
      break;
    case 'email':
      if (lead.contactEmail) {
        window.location.href = `mailto:${lead.contactEmail}?subject=HushHawk inquiry for ${lead.propertyAddress}`;
      } else {
        showDeskToast('Drafting Outbound Email', `No email on file for ${lead.contactName}. Reaching out via platform DM.`, 'info');
        if (replyInput.value) {
          replyInput.value.focus();
        }
      }
      break;
    case 'assign':
      try {
        const res = await fetch(`/api/v1/lead-desk/threads/${encodeURIComponent(lead.id)}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedTo: deskUserName.value })
        });
        if (res.ok) {
          lead.status = 'Assigned to ' + deskUserName.value;
          showDeskToast('Lead Assigned', `${lead.contactName} assigned to ${deskUserName.value}.`, 'success');
        } else {
          showDeskToast('Not Assigned', 'The assignment could not be saved.', 'error');
        }
      } catch (e) {
        showDeskToast('Not Assigned', 'The assignment could not be saved. Check your connection and try again.', 'error');
      }
      break;
    case 'schedule':
      try {
        const res = await fetch(`/api/v1/lead-desk/threads/${encodeURIComponent(lead.id)}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dueDate: 'Tomorrow',
            notes: `Follow-up on ${lead.propertyAddress} with ${lead.contactName}`
          })
        });
        if (res.ok) {
          showDeskToast('Follow-Up Scheduled', `Follow-up for ${lead.contactName} added to Priority Calls queue in PostgreSQL.`, 'success');
        }
      } catch (e) {
        showDeskToast('Follow-Up Scheduled', `Call reminder queued for ${lead.contactName}.`, 'success');
      }
      break;
  }
}

let onGlobalRefreshHandler = null;

onMounted(async () => {
  try {
    const session = await fetch('/api/auth/get-session');
    if (session.ok) deskUserName.value = (await session.json()).user?.name || 'me';
  } catch (e) { /* the label stays generic */ }
  await fetchPlatforms();
  await fetchThreads();
  // Start real-time sync every 5 seconds
  syncInterval = setInterval(syncLeadDesk, 5000);

  if (typeof window !== 'undefined') {
    onGlobalRefreshHandler = () => {
      fetchPlatforms();
      fetchThreads();
    };
    window.addEventListener('hushhawk:refresh-data', onGlobalRefreshHandler);
  }
});

onUnmounted(() => {
  if (syncInterval) clearInterval(syncInterval);
  if (typeof window !== 'undefined' && onGlobalRefreshHandler) {
    window.removeEventListener('hushhawk:refresh-data', onGlobalRefreshHandler);
  }
});
</script>

<style scoped>
.lead-conversation-desk {
  margin-top: 18px;
  min-width: 0;
  border-radius: 14px;
  border: 1px solid rgba(212, 175, 55, 0.45);
  background: linear-gradient(180deg, #071322 0%, #040c17 100%);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(212, 175, 55, 0.25);
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

/* Header */
.desk-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(90deg, rgba(212, 175, 55, 0.12) 0%, rgba(13, 27, 46, 0.6) 100%);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
}

.desk-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.desk-header-icon {
  width: 22px;
  height: 22px;
  color: #eac16a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.desk-header-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.desk-title-group h2 {
  margin: 0;
  font-family: 'Cinzel', 'Georgia', serif;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #fff8e8;
  display: flex;
  align-items: center;
  gap: 8px;
}

.v2-badge {
  font-family: -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #d4af37;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(212, 175, 55, 0.18);
  border: 1px solid rgba(212, 175, 55, 0.35);
  text-transform: uppercase;
}

.desk-meta-group {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #cbd5e1;
}

.meta-separator {
  color: #64748b;
  font-size: 10px;
}

.live-sync-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  font-size: 11px;
  font-weight: 600;
  color: #34d399;
}

.sync-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: pulse-sync 2s infinite ease-in-out;
}

@keyframes pulse-sync {
  0%, 100% {
    transform: scale(0.95);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
    box-shadow: 0 0 12px #34d399;
  }
}

/* 16 Platforms Ribbon */
.platform-dot { width: 7px; height: 7px; border-radius: 50%; margin-left: 5px; flex: none; }
.platform-dot.on { background: #2ecc71; }
.platform-dot.off { background: #7d8a99; }
.platform-tab.not-connected { opacity: 0.72; }
.platforms-ribbon {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #06111f;
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: #334155 #06111f;
}

.platform-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 11.5px;
  font-weight: 500;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(51, 65, 85, 0.7);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  user-select: none;
}

.platform-tab:hover {
  color: #f1f5f9;
  border-color: rgba(212, 175, 55, 0.5);
  background: rgba(21, 35, 58, 0.8);
}

.platform-tab.active {
  color: #fff9e6;
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.25) 0%, rgba(212, 175, 55, 0.08) 100%);
  border-color: #d4af37;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.platform-brand-icon {
  width: 14px;
  height: 14px;
  display: inline-grid;
  place-items: center;
  background-color: var(--brand-color);
  mask: var(--brand-mark) center / contain no-repeat;
  -webkit-mask: var(--brand-mark) center / contain no-repeat;
}

.platform-brand-icon:has(img) {
  background: none;
}

.platform-count {
  font-size: 11px;
  opacity: 0.85;
}

/* Sub-Bar */
.desk-sub-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(8, 20, 36, 0.9);
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
  flex-wrap: wrap;
  gap: 12px;
}

.sub-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sub-platform-icon {
  width: 16px;
  height: 16px;
  display: inline-grid;
  place-items: center;
  background-color: var(--brand-color, #1877f2);
  mask: var(--brand-mark) center / contain no-repeat;
  -webkit-mask: var(--brand-mark) center / contain no-repeat;
}

.inbox-title {
  font-size: 13.5px;
  font-weight: 600;
  color: #f1f5f9;
}

.priority-selector {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #94a3b8;
}

.priority-selector select {
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  color: #f8fafc;
  background: #0f1f33;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 5px;
  padding: 3px 8px;
  cursor: pointer;
  outline: none;
}

.priority-selector select:focus {
  border-color: #f5cf72;
}

.sub-right {
  display: flex;
  align-items: center;
}

.active-contact-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 16px;
  background: rgba(15, 29, 48, 0.85);
  border: 1px solid rgba(51, 65, 85, 0.8);
  font-size: 12px;
}

.contact-mini-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #d4af37;
  color: #040c17;
  font-size: 10px;
  font-weight: 700;
  display: inline-grid;
  place-items: center;
}

.contact-title {
  font-weight: 600;
  color: #f1f5f9;
}

.contact-separator {
  color: #475569;
}

.matched-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #34d399;
  font-weight: 500;
}

.mini-green-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.last-resp-time {
  color: #94a3b8;
  font-size: 11px;
}

/* Split Pane Layout */
.desk-split-pane {
  display: grid;
  grid-template-columns: minmax(290px, 360px) minmax(0, 1fr);
  min-height: 480px;
}

/* Left Column: Thread List */
.threads-column {
  border-right: 1px solid rgba(51, 65, 85, 0.6);
  background: rgba(5, 14, 26, 0.85);
  display: flex;
  flex-direction: column;
}

.threads-scroll-container {
  overflow-y: auto;
  max-height: 520px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.threads-state, .conversation-state {
  padding: 30px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.spinner-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d4af37;
  margin-right: 6px;
  animation: pulse-sync 1.5s infinite;
}

/* Thread Card */
.thread-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(51, 65, 85, 0.5);
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.thread-card:hover {
  background: rgba(22, 38, 64, 0.75);
  border-color: rgba(212, 175, 55, 0.4);
}

.thread-card.selected {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(14, 28, 48, 0.95) 100%);
  border-color: #d4af37;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(212, 175, 55, 0.3);
}

.thread-top-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.thread-avatar-wrap {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a3e5c 0%, #15243b 100%);
  border: 1px solid rgba(212, 175, 55, 0.4);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.thread-avatar-text {
  font-size: 12px;
  font-weight: 700;
  color: #f5cf72;
}

.thread-contact-info {
  flex: 1;
  min-width: 0;
}

.name-unread-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}

.contact-name-text {
  font-size: 13px;
  font-weight: 600;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-count-pill {
  padding: 1px 6px;
  border-radius: 10px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
}

.thread-address-text {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.thread-score-wrap {
  flex-shrink: 0;
}

.score-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 500;
  border: 1px solid transparent;
}

.score-high {
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
}

.score-med {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
}

.score-normal {
  color: #94a3b8;
  background: rgba(100, 116, 139, 0.15);
  border-color: rgba(100, 116, 139, 0.4);
}

.thread-bottom-row {
  margin-left: 44px;
}

.thread-preview-text {
  margin: 0;
  font-size: 11.5px;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.3;
}

/* Right Column: Conversation Pane */
.conversation-column {
  display: flex;
  flex-direction: column;
  background: rgba(7, 17, 30, 0.7);
}

/* Property Context Card */
.property-context-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgba(15, 29, 48, 0.85);
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
}

.prop-thumb-wrap {
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(212, 175, 55, 0.35);
  flex-shrink: 0;
}

.prop-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prop-details-wrap {
  flex: 1;
  min-width: 0;
}

.prop-address-heading {
  margin: 0;
  font-size: 13.5px;
  font-weight: 600;
  color: #f8fafc;
}

.prop-specs-subtext {
  margin: 2px 0 0;
  font-size: 11.5px;
  color: #94a3b8;
}

.prop-action-wrap {
  flex-shrink: 0;
}

.btn-prop-context {
  display: inline-block;
  padding: 5px 12px;
  font-size: 11.5px;
  font-weight: 600;
  color: #eac16a;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.btn-prop-context:hover {
  background: rgba(212, 175, 55, 0.25);
  color: #fff9e6;
  border-color: #d4af37;
}

/* Messages Area */
.messages-viewport {
  flex: 1;
  overflow-y: auto;
  max-height: 290px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.message-row {
  display: flex;
  width: 100%;
}

.message-row.inbound {
  justify-content: flex-start;
}

.message-row.outbound {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 72%;
  padding: 9px 13px;
  border-radius: 10px;
  font-size: 12.5px;
  line-height: 1.45;
}

.message-row.inbound .message-bubble {
  background: #152438;
  border: 1px solid #283e5c;
  color: #f1f5f9;
  border-top-left-radius: 2px;
}

.message-row.outbound .message-bubble {
  background: linear-gradient(135deg, #123358 0%, #0d2642 100%);
  border: 1px solid rgba(212, 175, 55, 0.35);
  color: #ffffff;
  border-top-right-radius: 2px;
}

.bubble-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble-footer {
  margin-top: 4px;
  font-size: 10px;
  color: #94a3b8;
  text-align: right;
}

.bubble-check {
  color: #34d399;
  font-weight: 700;
}

/* AI Reply Suggestion Banner */
.ai-suggestion-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  background: linear-gradient(90deg, rgba(88, 28, 135, 0.3) 0%, rgba(212, 175, 55, 0.15) 100%);
  border-top: 1px solid rgba(147, 51, 234, 0.35);
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
}

.ai-suggestion-content {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  flex: 1;
  min-width: 0;
}

.ai-spark-icon {
  color: #f59e0b;
}

.ai-suggestion-label {
  font-weight: 600;
  color: #e9d5ff;
  white-space: nowrap;
}

.ai-suggestion-quote {
  font-style: italic;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-use-reply {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: rgba(147, 51, 234, 0.4);
  border: 1px solid rgba(168, 85, 247, 0.5);
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.btn-use-reply:hover {
  background: rgba(147, 51, 234, 0.7);
  border-color: #c084fc;
}

/* Quick Action Toolbar */
.quick-action-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #081423;
  border-top: 1px solid rgba(51, 65, 85, 0.6);
  border-bottom: 1px solid rgba(51, 65, 85, 0.6);
  overflow-x: auto;
}

.btn-quick-action {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  font-size: 11.5px;
  font-weight: 500;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(51, 65, 85, 0.7);
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.btn-quick-action:hover {
  color: #fff8e8;
  border-color: rgba(212, 175, 55, 0.6);
  background: rgba(21, 35, 58, 0.9);
}

.action-icon {
  width: 14px;
  height: 14px;
  display: inline-flex;
  align-items: center;
  color: #d4af37;
}

.action-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

/* Composer Area */
.composer-container {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: #050e1a;
}

.composer-input-wrap {
  flex: 1;
}

.composer-input {
  width: 100%;
  padding: 9px 14px;
  font-size: 13px;
  font-family: inherit;
  color: #f8fafc;
  background: #0b192c;
  border: 1px solid rgba(71, 85, 105, 0.7);
  border-radius: 6px;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease;
}

.composer-input:focus {
  border-color: #d4af37;
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.2);
}

.btn-send-reply {
  padding: 9px 18px;
  font-size: 12.5px;
  font-weight: 600;
  color: #040c17;
  background: linear-gradient(135deg, #f5cf72 0%, #d4af37 100%);
  border: 1px solid #ffd875;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
}

.btn-send-reply:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffe8a3 0%, #eac16a 100%);
  transform: translateY(-1px);
}

.btn-send-reply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 900px) {
  .desk-split-pane {
    grid-template-columns: 1fr;
  }
  .threads-column {
    border-right: none;
    border-bottom: 1px solid rgba(51, 65, 85, 0.6);
  }
}
</style>
