<template>
  <div class="outreach-actions-wrapper">
    <!-- 4 Executive Action Cards Grid -->
    <div class="outreach-actions-grid" role="group" aria-label="Executive Outreach Actions">
      <!-- 1. SEND MAILERS -->
      <article class="action-card mailers-card">
        <div class="card-header">
          <span class="card-icon" v-html="icons.mail"></span>
          <h3 class="card-title">{{ summary.mailers.title }}</h3>
        </div>
        <div class="card-body">
          <strong class="card-metric">{{ summary.mailers.subtitle }}</strong>
          <div class="card-meta">
            <span class="tag-pill tag-blue">Foreclosure / Default / Cash</span>
          </div>
        </div>
        <div class="card-footer">
          <button type="button" class="btn-executive-action" @click="openMailersModal">
            {{ summary.mailers.actionLabel }}
          </button>
        </div>
      </article>

      <!-- 2. CALL -->
      <article class="action-card calls-card">
        <div class="card-header">
          <span class="card-icon" v-html="icons.phone"></span>
          <h3 class="card-title">{{ summary.calls.title }}</h3>
        </div>
        <div class="card-body">
          <strong class="card-metric">{{ summary.calls.subtitle }}</strong>
          <div class="card-meta">
            <span class="card-description">{{ summary.calls.description }}</span>
          </div>
        </div>
        <div class="card-footer">
          <button type="button" class="btn-executive-action" @click="openCallsModal">
            {{ summary.calls.actionLabel }}
          </button>
        </div>
      </article>

      <!-- 3. TEXT -->
      <article class="action-card texts-card">
        <div class="card-header">
          <span class="card-icon" v-html="icons.text"></span>
          <h3 class="card-title">{{ summary.texts.title }}</h3>
        </div>
        <div class="card-body">
          <strong class="card-metric">{{ summary.texts.subtitle }}</strong>
          <div class="card-meta">
            <span class="card-description">{{ summary.texts.description }}</span>
          </div>
        </div>
        <div class="card-footer">
          <button type="button" class="btn-executive-action" @click="openTextsModal">
            {{ summary.texts.actionLabel }}
          </button>
        </div>
      </article>

      <!-- 4. EMAIL -->
      <article class="action-card emails-card">
        <div class="card-header">
          <span class="card-icon" v-html="icons.mail"></span>
          <h3 class="card-title">{{ summary.emails.title }}</h3>
        </div>
        <div class="card-body">
          <strong class="card-metric">{{ summary.emails.subtitle }}</strong>
          <div class="card-meta">
            <span class="card-description">{{ summary.emails.description }}</span>
          </div>
        </div>
        <div class="card-footer">
          <button type="button" class="btn-executive-action" @click="openEmailsModal">
            {{ summary.emails.actionLabel }}
          </button>
        </div>
      </article>
    </div>

    <!-- Modals Teleported to document body for zero clipping -->
    <Teleport to="body">
    <!-- ============================================================== -->
    <!-- MODAL 1: CREATE DIRECT MAIL BATCH -->
    <!-- ============================================================== -->
    <div v-if="activeModal === 'mailers'" class="action-modal-overlay" @click.self="closeModals">
      <div class="action-modal-container">
        <header class="modal-top-bar">
          <div class="modal-title-group">
            <span class="modal-icon" v-html="icons.mail"></span>
            <h3>Direct Mail Campaign Dispatch</h3>
            <span class="modal-badge">{{ mailersQueue.length }} Properties Selected</span>
          </div>
          <button type="button" class="modal-close-btn" @click="closeModals">✕</button>
        </header>

        <div class="modal-body">
          <div class="batch-config-row">
            <div class="config-field">
              <label>Letter Template</label>
              <select v-model="batchForm.template">
                <option value="Yellow Letter Cash Offer">Yellow Letter Cash Offer (Handwritten Font)</option>
                <option value="Notice of Default Cash Buyout">Notice of Default Urgent Cash Buyout</option>
                <option value="Probate / Inherited Cash Proposal">Probate / Inherited Cash Proposal</option>
                <option value="Duval Equity Direct Postcard">Duval Equity 6x9 Full-Color Postcard</option>
              </select>
            </div>
            <div class="config-field">
              <label>Postage Class</label>
              <select v-model="batchForm.postage">
                <option value="Standard ($0.58/ea)">USPS Standard Marketing ($0.58 / ea)</option>
                <option value="First Class ($0.72/ea)">USPS First Class Priority ($0.72 / ea)</option>
              </select>
            </div>
          </div>

          <div class="queue-table-wrap">
            <table class="queue-table">
              <thead>
                <tr>
                  <th><input type="checkbox" :checked="isAllMailersSelected" @change="toggleSelectAllMailers" /></th>
                  <th>Property Address</th>
                  <th>Owner Name</th>
                  <th>Distress Category</th>
                  <th>Est. Equity</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in mailersQueue" :key="item.id">
                  <td><input type="checkbox" v-model="selectedMailerIds" :value="item.id" /></td>
                  <td><strong>{{ item.property_address }}</strong><small>{{ item.city }}, FL {{ item.zip }}</small></td>
                  <td>{{ item.owner_name }}</td>
                  <td>
                    <span class="status-tag" :class="item.distress_category.toLowerCase()">
                      {{ item.distress_category }}
                    </span>
                  </td>
                  <td>${{ Number(item.equity_estimate).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <footer class="modal-footer">
          <div class="footer-cost">
            <span>Estimated Cost: <strong>${{ calculateBatchCost() }}</strong></span>
            <small>({{ selectedMailerIds.length }} pieces ready for print &amp; drop)</small>
          </div>
          <div class="footer-actions">
            <button type="button" class="btn-cancel" @click="closeModals">Cancel</button>
            <button
              type="button"
              class="btn-submit"
              :disabled="selectedMailerIds.length === 0 || isSubmitting"
              @click="submitMailerBatch"
            >
              {{ isSubmitting ? 'Dispatching Batch…' : `Dispatch Batch (${selectedMailerIds.length} Pieces) ↗` }}
            </button>
          </div>
        </footer>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL 2: SELLER CALL LIST -->
    <!-- ============================================================== -->
    <div v-if="activeModal === 'calls'" class="action-modal-overlay" @click.self="closeModals">
      <div class="action-modal-container">
        <header class="modal-top-bar">
          <div class="modal-title-group">
            <span class="modal-icon" v-html="icons.phone"></span>
            <h3>Priority Seller Follow-Up Calls</h3>
            <span class="modal-badge">{{ callsQueue.length }} Pending</span>
          </div>
          <button type="button" class="modal-close-btn" @click="closeModals">✕</button>
        </header>

        <div class="modal-body">
          <div class="queue-table-wrap">
            <table class="queue-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Seller Contact</th>
                  <th>Phone Number</th>
                  <th>Property Address</th>
                  <th>Cadence Stage / Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in callsQueue" :key="item.id">
                  <td>
                    <span class="priority-badge" :class="item.priority.toLowerCase()">
                      {{ item.priority }}
                    </span>
                  </td>
                  <td><strong>{{ item.contact_name }}</strong></td>
                  <td>
                    <a :href="'tel:' + item.phone.replace(/\\D/g, '')" class="phone-link">
                      {{ item.phone }}
                    </a>
                  </td>
                  <td>{{ item.property_address }}</td>
                  <td>
                    <strong>{{ item.cadence_stage }}</strong>
                    <small>{{ item.notes }}</small>
                  </td>
                  <td>
                    <button type="button" class="btn-table-action" @click="openCallLogDrawer(item)">
                      Log Call ↗
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Log Call Outcome Drawer -->
          <div v-if="selectedCallItem" class="drawer-panel">
            <div class="drawer-header">
              <h4>Log Outcome for {{ selectedCallItem.contact_name }}</h4>
              <button type="button" class="btn-mini-close" @click="selectedCallItem = null">✕</button>
            </div>
            <div class="drawer-body">
              <div class="config-field">
                <label>Call Result</label>
                <select v-model="callLogForm.result">
                  <option value="Connected">Connected (Spoke with Seller)</option>
                  <option value="Left Voicemail">Left Voicemail</option>
                  <option value="No Answer / Busy">No Answer / Busy</option>
                  <option value="Follow-Up Scheduled">Follow-Up Scheduled</option>
                  <option value="Offer Accepted">Offer Accepted / Escrow Draft</option>
                </select>
              </div>
              <div class="config-field">
                <label>Call Notes / Action Items</label>
                <input
                  v-model="callLogForm.notes"
                  type="text"
                  placeholder="e.g. Discussed roof age, agreed to Thursday walkthrough"
                />
              </div>
              <button
                type="button"
                class="btn-submit"
                :disabled="isSubmitting"
                @click="submitCallLog"
              >
                {{ isSubmitting ? 'Saving…' : 'Record & Complete Call ↗' }}
              </button>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn-cancel" @click="closeModals">Close List</button>
        </footer>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL 3: OPTED-IN TEXT QUEUE -->
    <!-- ============================================================== -->
    <div v-if="activeModal === 'texts'" class="action-modal-overlay" @click.self="closeModals">
      <div class="action-modal-container">
        <header class="modal-top-bar">
          <div class="modal-title-group">
            <span class="modal-icon" v-html="icons.text"></span>
            <h3>Opted-In Text Outreach Queue</h3>
            <span class="modal-badge">{{ textsQueue.length }} Contacts Ready</span>
          </div>
          <button type="button" class="modal-close-btn" @click="closeModals">✕</button>
        </header>

        <div class="modal-body">
          <div class="queue-table-wrap">
            <table class="queue-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Phone Number</th>
                  <th>Property Address</th>
                  <th>Last Inquiry</th>
                  <th>Recommended Template</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in textsQueue" :key="item.id">
                  <td><strong>{{ item.contact_name }}</strong></td>
                  <td>{{ item.phone }}</td>
                  <td>{{ item.property_address }}</td>
                  <td><small>{{ item.last_inbound_snippet || 'New opt-in inquiry' }}</small></td>
                  <td><p class="template-quote">“{{ item.recommended_template }}”</p></td>
                  <td>
                    <button type="button" class="btn-table-action" @click="openTextSendDrawer(item)">
                      Send SMS ↗
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Quick SMS Send Drawer -->
          <div v-if="selectedTextItem" class="drawer-panel">
            <div class="drawer-header">
              <h4>Send SMS to {{ selectedTextItem.contact_name }} ({{ selectedTextItem.phone }})</h4>
              <button type="button" class="btn-mini-close" @click="selectedTextItem = null">✕</button>
            </div>
            <div class="drawer-body">
              <div class="config-field">
                <label>Message Content</label>
                <textarea
                  v-model="textSendForm.message"
                  rows="3"
                  placeholder="Type message here..."
                ></textarea>
              </div>
              <button
                type="button"
                class="btn-submit"
                :disabled="!textSendForm.message.trim() || isSubmitting"
                @click="submitTextSend"
              >
                {{ isSubmitting ? 'Sending…' : 'Send SMS Message ↗' }}
              </button>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn-cancel" @click="closeModals">Close Queue</button>
        </footer>
      </div>
    </div>

    <!-- ============================================================== -->
    <!-- MODAL 4: TITLE & BUYER EMAIL QUEUE -->
    <!-- ============================================================== -->
    <div v-if="activeModal === 'emails'" class="action-modal-overlay" @click.self="closeModals">
      <div class="action-modal-container">
        <header class="modal-top-bar">
          <div class="modal-title-group">
            <span class="modal-icon" v-html="icons.mail"></span>
            <h3>Title &amp; Cash Buyer Email Queue</h3>
            <span class="modal-badge">{{ emailsQueue.length }} Messages Pending</span>
          </div>
          <button type="button" class="modal-close-btn" @click="closeModals">✕</button>
        </header>

        <div class="modal-body">
          <div class="queue-table-wrap">
            <table class="queue-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Role</th>
                  <th>Subject Line</th>
                  <th>Property Address</th>
                  <th>Preview</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in emailsQueue" :key="item.id">
                  <td><strong>{{ item.recipient_name }}</strong><small>{{ item.email }}</small></td>
                  <td>
                    <span class="role-badge" :class="item.recipient_role.toLowerCase().replace(/\\s+/g, '-')">
                      {{ item.recipient_role }}
                    </span>
                  </td>
                  <td>{{ item.subject }}</td>
                  <td>{{ item.property_address }}</td>
                  <td><small>{{ item.body_snippet }}</small></td>
                  <td>
                    <button type="button" class="btn-table-action" @click="openEmailSendDrawer(item)">
                      Dispatch ↗
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Email Dispatch Drawer -->
          <div v-if="selectedEmailItem" class="drawer-panel">
            <div class="drawer-header">
              <h4>Dispatch Email to {{ selectedEmailItem.recipient_name }}</h4>
              <button type="button" class="btn-mini-close" @click="selectedEmailItem = null">✕</button>
            </div>
            <div class="drawer-body">
              <div class="config-field">
                <label>Subject</label>
                <input v-model="emailSendForm.subject" type="text" />
              </div>
              <div class="config-field">
                <label>Email Body</label>
                <textarea v-model="emailSendForm.body" rows="4"></textarea>
              </div>
              <button
                type="button"
                class="btn-submit"
                :disabled="!emailSendForm.body.trim() || isSubmitting"
                @click="submitEmailSend"
              >
                {{ isSubmitting ? 'Dispatching…' : 'Send Email Now ↗' }}
              </button>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="btn-cancel" @click="closeModals">Close Queue</button>
        </footer>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { icons } from '../../../element-f1b67d54-2716-43a4-a414-ab7f505c2ace/src/icons.js';

// Summary State
const summary = ref({
  mailers: {
    title: 'SEND MAILERS',
    count: 34,
    subtitle: '34 selected properties',
    tags: ['Foreclosure', 'Default', 'Cash'],
    actionLabel: 'Create Batch ↗'
  },
  calls: {
    title: 'CALL',
    count: 12,
    subtitle: '12 seller follow-ups',
    description: 'Priority: Generate (Current = High)',
    actionLabel: 'Open Call List ↗'
  },
  texts: {
    title: 'TEXT',
    count: 18,
    subtitle: '18 opted-in contacts',
    description: 'Send follow-up & reply to responses',
    actionLabel: 'Open Text Queue ↗'
  },
  emails: {
    title: 'EMAIL',
    count: 9,
    subtitle: '9 title/buyer follow-ups',
    description: 'Updates, docs & next steps',
    actionLabel: 'Open Email Queue ↗'
  }
});

// Modal / Drawer state
const activeModal = ref(null); // 'mailers' | 'calls' | 'texts' | 'emails' | null
const isSubmitting = ref(false);

// Queue Data
const mailersQueue = ref([]);
const selectedMailerIds = ref([]);
const batchForm = ref({
  template: 'Yellow Letter Cash Offer',
  postage: 'Standard ($0.58/ea)'
});

const callsQueue = ref([]);
const selectedCallItem = ref(null);
const callLogForm = ref({
  result: 'Connected',
  notes: ''
});

const textsQueue = ref([]);
const selectedTextItem = ref(null);
const textSendForm = ref({
  message: ''
});

const emailsQueue = ref([]);
const selectedEmailItem = ref(null);
const emailSendForm = ref({
  subject: '',
  body: ''
});

// Computed
const isAllMailersSelected = computed(() => {
  return mailersQueue.value.length > 0 && selectedMailerIds.value.length === mailersQueue.value.length;
});

function toggleSelectAllMailers(e) {
  if (e.target.checked) {
    selectedMailerIds.value = mailersQueue.value.map(m => m.id);
  } else {
    selectedMailerIds.value = [];
  }
}

function calculateBatchCost() {
  const rate = batchForm.value.postage.includes('First Class') ? 0.72 : 0.58;
  return (selectedMailerIds.value.length * rate).toFixed(2);
}

// Data Fetching
async function fetchSummary() {
  try {
    const res = await fetch('/api/v1/outreach-actions/summary');
    if (res.ok) {
      const data = await res.json();
      if (data.mailers) summary.value.mailers = data.mailers;
      if (data.calls) summary.value.calls = data.calls;
      if (data.texts) summary.value.texts = data.texts;
      if (data.emails) summary.value.emails = data.emails;
    }
  } catch (err) {
    console.warn('[ExecutiveOutreachActions] fetchSummary error:', err.message);
  }
}

// Open Modals
async function openMailersModal() {
  activeModal.value = 'mailers';
  try {
    const res = await fetch('/api/v1/outreach-actions/mailers');
    if (res.ok) {
      const data = await res.json();
      mailersQueue.value = data.mailers || [];
      selectedMailerIds.value = mailersQueue.value.map(m => m.id);
    }
  } catch (err) {
    console.error('Failed to load mailers queue:', err);
  }
}

async function openCallsModal() {
  activeModal.value = 'calls';
  try {
    const res = await fetch('/api/v1/outreach-actions/calls');
    if (res.ok) {
      const data = await res.json();
      callsQueue.value = data.calls || [];
    }
  } catch (err) {
    console.error('Failed to load calls queue:', err);
  }
}

async function openTextsModal() {
  activeModal.value = 'texts';
  try {
    const res = await fetch('/api/v1/outreach-actions/texts');
    if (res.ok) {
      const data = await res.json();
      textsQueue.value = data.texts || [];
    }
  } catch (err) {
    console.error('Failed to load texts queue:', err);
  }
}

async function openEmailsModal() {
  activeModal.value = 'emails';
  try {
    const res = await fetch('/api/v1/outreach-actions/emails');
    if (res.ok) {
      const data = await res.json();
      emailsQueue.value = data.emails || [];
    }
  } catch (err) {
    console.error('Failed to load emails queue:', err);
  }
}

function closeModals() {
  activeModal.value = null;
  selectedCallItem.value = null;
  selectedTextItem.value = null;
  selectedEmailItem.value = null;
}

// Actions Execution
function showOutreachToast(title, message, type = 'success') {
  if (typeof window !== 'undefined') {
    if (window.showHushHawkToast) {
      window.showHushHawkToast(title, message, type);
    } else {
      window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
    }
  }
}

async function submitMailerBatch() {
  if (selectedMailerIds.value.length === 0 || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const res = await fetch('/api/v1/outreach-actions/mailers/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: batchForm.value.template,
        postage: batchForm.value.postage,
        propertyIds: selectedMailerIds.value
      })
    });
    if (res.ok) {
      const result = await res.json();
      showOutreachToast('Direct Mail Dispatched', `Batch ${result.batchCode} with ${result.dispatchedCount} pieces sent to print queue.`, 'success');
      await fetchSummary();
      closeModals();
    }
  } catch (err) {
    showOutreachToast('Dispatch Error', err.message, 'warning');
  } finally {
    isSubmitting.value = false;
  }
}

function openCallLogDrawer(item) {
  selectedCallItem.value = item;
  callLogForm.value.result = 'Connected';
  callLogForm.value.notes = '';
}

async function submitCallLog() {
  if (!selectedCallItem.value || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const res = await fetch('/api/v1/outreach-actions/calls/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callId: selectedCallItem.value.id,
        result: callLogForm.value.result,
        notes: callLogForm.value.notes
      })
    });
    if (res.ok) {
      showOutreachToast('Call Logged', `Recorded outcome for ${selectedCallItem.value.contact_name}. Saved to PostgreSQL ledger.`, 'success');
      selectedCallItem.value = null;
      await openCallsModal();
      await fetchSummary();
    }
  } catch (err) {
    showOutreachToast('Log Call Failed', err.message, 'warning');
  } finally {
    isSubmitting.value = false;
  }
}

function openTextSendDrawer(item) {
  selectedTextItem.value = item;
  textSendForm.value.message = item.recommended_template || '';
}

async function submitTextSend() {
  if (!selectedTextItem.value || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const res = await fetch('/api/v1/outreach-actions/texts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textId: selectedTextItem.value.id,
        message: textSendForm.value.message
      })
    });
    if (res.ok) {
      showOutreachToast('SMS Dispatched', `Live text message sent to ${selectedTextItem.value.contact_name} via carrier bridge.`, 'success');
      selectedTextItem.value = null;
      await openTextsModal();
      await fetchSummary();
    }
  } catch (err) {
    showOutreachToast('SMS Dispatch Failed', err.message, 'warning');
  } finally {
    isSubmitting.value = false;
  }
}

function openEmailSendDrawer(item) {
  selectedEmailItem.value = item;
  emailSendForm.value.subject = item.subject || '';
  emailSendForm.value.body = item.body_snippet || '';
}

async function submitEmailSend() {
  if (!selectedEmailItem.value || isSubmitting.value) return;
  isSubmitting.value = true;
  try {
    const res = await fetch('/api/v1/outreach-actions/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: selectedEmailItem.value.id,
        subject: emailSendForm.value.subject,
        body: emailSendForm.value.body
      })
    });
    if (res.ok) {
      showOutreachToast('Email Dispatched', `Email delivered to ${selectedEmailItem.value.recipient_name} (${selectedEmailItem.value.email}) via relay.`, 'success');
      selectedEmailItem.value = null;
      await openEmailsModal();
      await fetchSummary();
    }
  } catch (err) {
    showOutreachToast('Email Dispatch Failed', err.message, 'warning');
  } finally {
    isSubmitting.value = false;
  }
}

let onGlobalRefreshHandler = null;

onMounted(() => {
  fetchSummary();
  if (typeof window !== 'undefined') {
    onGlobalRefreshHandler = () => {
      fetchSummary();
    };
    window.addEventListener('hushhawk:refresh-data', onGlobalRefreshHandler);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined' && onGlobalRefreshHandler) {
    window.removeEventListener('hushhawk:refresh-data', onGlobalRefreshHandler);
  }
});
</script>

<style scoped>
.outreach-actions-wrapper {
  margin-top: 14px;
  margin-bottom: 14px;
  width: 100%;
}

.outreach-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* Luxury Action Card */
.action-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 14px;
  background: linear-gradient(180deg, #0d1e34 0%, #061222 100%);
  border: 1px solid rgba(212, 175, 55, 0.45);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 175, 55, 0.2);
  transition: all 0.2s ease;
  min-height: 120px;
}

.action-card:hover {
  border-color: #d4af37;
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 223, 138, 0.35);
}

/* Card Header */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-icon {
  width: 18px;
  height: 18px;
  color: #eac16a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.card-icon :deep(svg) {
  width: 100%;
  height: 100%;
}

.card-title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #fff9e6;
  text-transform: uppercase;
}

/* Card Body */
.card-body {
  margin: 8px 0;
}

.card-metric {
  display: block;
  font-size: 13.5px;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
}

.card-meta {
  margin-top: 4px;
}

.tag-pill {
  display: inline-block;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
}

.tag-blue {
  background: rgba(30, 58, 95, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #7dd3fc;
}

.card-description {
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.25;
}

/* Card Footer */
.card-footer {
  margin-top: 4px;
}

.btn-executive-action {
  width: 100%;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #f7e7b4;
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.18) 0%, rgba(212, 175, 55, 0.06) 100%);
  border: 1px solid rgba(212, 175, 55, 0.65);
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition: all 0.18s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.btn-executive-action:hover {
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.35) 0%, rgba(212, 175, 55, 0.15) 100%);
  border-color: #ffd875;
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(212, 175, 55, 0.25);
}

/* Modal Styles */
.action-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 10, 20, 0.85);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.action-modal-container {
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  background: linear-gradient(180deg, #09172a 0%, #050e1c 100%);
  border: 1px solid rgba(212, 175, 55, 0.55);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(212, 175, 55, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: #f8fafc;
}

.modal-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: linear-gradient(90deg, rgba(212, 175, 55, 0.15) 0%, rgba(15, 23, 42, 0.6) 100%);
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title-group h3 {
  margin: 0;
  font-family: 'Cinzel', 'Georgia', serif;
  font-size: 17px;
  color: #fff9e6;
}

.modal-icon {
  width: 20px;
  height: 20px;
  color: #d4af37;
}

.modal-badge {
  font-size: 11px;
  font-weight: 600;
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  padding: 2px 8px;
  border-radius: 12px;
}

.modal-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
}

.modal-close-btn:hover {
  color: #f8fafc;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.batch-config-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  background: rgba(15, 23, 42, 0.7);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(51, 65, 85, 0.6);
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.config-field label {
  font-size: 11.5px;
  font-weight: 600;
  color: #cbd5e1;
}

.config-field select,
.config-field input,
.config-field textarea {
  width: 100%;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 12.5px;
  background: #06111f;
  border: 1px solid rgba(71, 85, 105, 0.7);
  border-radius: 6px;
  color: #f8fafc;
  outline: none;
  box-sizing: border-box;
}

.config-field select:focus,
.config-field input:focus,
.config-field textarea:focus {
  border-color: #d4af37;
}

.queue-table-wrap {
  overflow-x: auto;
  max-height: 380px;
}

.queue-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.queue-table th {
  position: sticky;
  top: 0;
  background: #081628;
  padding: 9px 10px;
  text-align: left;
  color: #94a3b8;
  font-weight: 600;
  border-bottom: 1px solid rgba(51, 65, 85, 0.8);
  z-index: 1;
}

.queue-table td {
  padding: 9px 10px;
  border-bottom: 1px solid rgba(51, 65, 85, 0.4);
  color: #cbd5e1;
}

.queue-table tr:hover td {
  background: rgba(212, 175, 55, 0.05);
}

.queue-table td strong {
  display: block;
  color: #f8fafc;
}

.queue-table td small {
  display: block;
  color: #94a3b8;
  font-size: 11px;
}

.status-tag {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
}

.status-tag.foreclosure {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #f87171;
}

.status-tag.default {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.status-tag.cash {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
}

.priority-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 700;
}

.priority-badge.overdue {
  background: rgba(239, 68, 68, 0.25);
  border: 1px solid #ef4444;
  color: #fca5a5;
}

.priority-badge.high {
  background: rgba(245, 158, 11, 0.2);
  border: 1px solid #f59e0b;
  color: #fde68a;
}

.role-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(59, 130, 246, 0.4);
  color: #93c5fd;
}

.template-quote {
  margin: 0;
  font-style: italic;
  font-size: 11.5px;
  color: #e2e8f0;
}

.phone-link {
  color: #38bdf8;
  text-decoration: none;
  font-weight: 600;
}

.phone-link:hover {
  text-decoration: underline;
}

.btn-table-action {
  padding: 4px 10px;
  font-size: 11.5px;
  font-weight: 600;
  color: #040c17;
  background: linear-gradient(135deg, #f5cf72 0%, #d4af37 100%);
  border: 1px solid #ffd875;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-table-action:hover {
  background: linear-gradient(135deg, #ffe8a3 0%, #eac16a 100%);
}

/* Drawer / Nested Action Panel */
.drawer-panel {
  background: #081628;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-header h4 {
  margin: 0;
  font-size: 13.5px;
  color: #fff9e6;
}

.btn-mini-close {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
}

.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Modal Footer */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #050e1a;
  border-top: 1px solid rgba(51, 65, 85, 0.6);
}

.footer-cost {
  font-size: 13px;
  color: #cbd5e1;
}

.footer-cost strong {
  color: #34d399;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-cancel {
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  background: none;
  border: 1px solid rgba(71, 85, 105, 0.6);
  border-radius: 6px;
  cursor: pointer;
}

.btn-cancel:hover {
  color: #f8fafc;
  border-color: #cbd5e1;
}

.btn-submit {
  padding: 8px 18px;
  font-size: 12.5px;
  font-weight: 600;
  color: #040c17;
  background: linear-gradient(135deg, #f5cf72 0%, #d4af37 100%);
  border: 1px solid #ffd875;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-submit:hover:not(:disabled) {
  background: linear-gradient(135deg, #ffe8a3 0%, #eac16a 100%);
  transform: translateY(-1px);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .outreach-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 550px) {
  .outreach-actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
