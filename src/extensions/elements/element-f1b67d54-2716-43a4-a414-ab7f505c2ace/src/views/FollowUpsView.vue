<template>
  <div class="view-container">
    <!-- Top KPI Metrics -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 1, cyan: i === 0, green: i === 3, red: i === 2 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+'), negative: m.change.includes('-') }">
            {{ m.change }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="content-split" :class="{ 'has-drawer': selectedFollowUp }">
      <!-- Main List Panel -->
      <div class="main-panel">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.clock"></span>
              Follow-Up Cadence &amp; Seller Nurture Engine
            </h2>
            <span class="badge-count">{{ filteredFollowUps.length }} tasks scheduled</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="openQuickAction('blast')">
              <span v-html="icons.send"></span>
              Run Morning SMS Drip
            </button>
            <button class="btn btn-primary" @click="isAddModalOpen = true">
              <span v-html="icons.plus"></span>
              Schedule Follow-Up
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="filter-toolbar">
          <div class="search-box">
            <span v-html="icons.search"></span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search seller name, phone, address, or cadence note..."
              aria-label="Search follow ups"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="filter-group">
            <label>Urgency:</label>
            <select v-model="urgencyFilter" aria-label="Filter by urgency">
              <option value="">All Cadences</option>
              <option value="Overdue">Overdue</option>
              <option value="Today">Due Today</option>
              <option value="Tomorrow">Due Tomorrow</option>
              <option value="Upcoming">Upcoming (This Week)</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Motivation:</label>
            <select v-model="motivationFilter" aria-label="Filter by motivation">
              <option value="">All Motivation</option>
              <option value="Hot">Hot / Immediate (Day 1-3)</option>
              <option value="Warm">Warm / In Discussion (Day 7-14)</option>
              <option value="Cold">Nurture / Follow-Up (30d+)</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Method:</label>
            <select v-model="channelFilter" aria-label="Filter by channel">
              <option value="">All Channels</option>
              <option value="Call">Phone Call</option>
              <option value="SMS">SMS Text</option>
              <option value="Email">Email Letter</option>
              <option value="In-Person">In-Person Visit</option>
            </select>
          </div>

          <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
            <span v-html="icons.refresh"></span>
            Reset
          </button>
        </div>

        <!-- Follow-Ups Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40">Status</th>
                <th>Seller &amp; Property</th>
                <th>Touch Cadence</th>
                <th>Due Timing</th>
                <th>Channel</th>
                <th>Offer / Stage</th>
                <th>Motivation</th>
                <th>Assigned Rep</th>
                <th width="140">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in filteredFollowUps"
                :key="item.id"
                :class="{ selected: selectedFollowUp && selectedFollowUp.id === item.id, completed: item.done }"
                @click="selectFollowUp(item)"
              >
                <td @click.stop>
                  <button
                    class="checkbox-btn"
                    :class="{ checked: item.done }"
                    @click="toggleComplete(item)"
                    :aria-label="item.done ? 'Mark incomplete' : 'Mark complete'"
                  >
                    <span v-if="item.done" v-html="icons.check"></span>
                  </button>
                </td>
                <td>
                  <div class="cell-main">
                    <span class="seller-name">{{ item.seller }}</span>
                    <span class="prop-sub">
                      <span v-html="icons.pin" class="tiny-icon"></span>
                      {{ item.address }}
                    </span>
                  </div>
                </td>
                <td>
                  <div class="cadence-chip" :class="item.cadenceStage.toLowerCase().replace(/\s+/g, '-')">
                    {{ item.cadenceStage }}
                  </div>
                  <span class="touch-counter">Attempt #{{ item.attemptCount }}</span>
                </td>
                <td>
                  <span class="due-badge" :class="item.dueStatus.toLowerCase()">
                    {{ item.dueText }}
                  </span>
                </td>
                <td>
                  <span class="channel-pill" :class="item.channel.toLowerCase()">
                    <span v-html="getChannelIcon(item.channel)"></span>
                    {{ item.channel }}
                  </span>
                </td>
                <td>
                  <div class="offer-col">
                    <strong class="offer-val">{{ item.lastOffer ? '$' + item.lastOffer.toLocaleString() : 'No offer' }}</strong>
                    <span class="lead-stage">{{ item.stage }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge-motivation" :class="item.motivation.toLowerCase()">
                    {{ item.motivation }}
                  </span>
                </td>
                <td>
                  <div class="rep-chip">
                    <span class="rep-avatar">{{ item.repInitials }}</span>
                    <span>{{ item.rep }}</span>
                  </div>
                </td>
                <td @click.stop>
                  <div class="row-actions">
                    <button class="action-btn call" title="Call Seller" @click="quickCall(item)">
                      <span v-html="icons.phone"></span>
                    </button>
                    <button class="action-btn sms" title="Send SMS" @click="quickSms(item)">
                      <span v-html="icons.text"></span>
                    </button>
                    <button class="action-btn snooze" title="Snooze 3 Days" @click="snoozeFollowUp(item, 3)">
                      <span v-html="icons.clock"></span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredFollowUps.length === 0">
                <td colspan="9" class="empty-state">
                  <div class="empty-box">
                    <span class="empty-icon" v-html="icons.clock"></span>
                    <p>No follow-ups match your current filter parameters.</p>
                    <button class="btn btn-secondary" @click="resetFilters">Clear All Filters</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Slide-over Drawer -->
      <div v-if="selectedFollowUp" class="detail-drawer">
        <div class="drawer-header">
          <div class="drawer-title">
            <span class="badge-motivation" :class="selectedFollowUp.motivation.toLowerCase()">
              {{ selectedFollowUp.motivation }} Priority
            </span>
            <h3>{{ selectedFollowUp.seller }}</h3>
            <span class="drawer-sub">{{ selectedFollowUp.address }}</span>
          </div>
          <button class="close-btn" @click="selectedFollowUp = null">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="drawer-body">
          <!-- Quick Action Buttons -->
          <div class="drawer-action-strip">
            <button class="btn btn-primary" @click="quickCall(selectedFollowUp)">
              <span v-html="icons.phone"></span>
              Call Seller
            </button>
            <button class="btn btn-secondary" @click="quickSms(selectedFollowUp)">
              <span v-html="icons.text"></span>
              Send SMS
            </button>
            <button class="btn btn-subtle" @click="toggleComplete(selectedFollowUp)">
              <span v-html="icons.check"></span>
              {{ selectedFollowUp.done ? 'Reopen' : 'Done' }}
            </button>
          </div>

          <!-- Seller & Cadence Info Cards -->
          <div class="info-card">
            <h4>Follow-Up Sequence Intel</h4>
            <div class="info-row">
              <span class="k">Cadence Step:</span>
              <span class="v">{{ selectedFollowUp.cadenceStage }} (Touch {{ selectedFollowUp.attemptCount }})</span>
            </div>
            <div class="info-row">
              <span class="k">Due Status:</span>
              <span class="v">{{ selectedFollowUp.dueText }}</span>
            </div>
            <div class="info-row">
              <span class="k">Phone:</span>
              <span class="v font-mono">{{ selectedFollowUp.phone }}</span>
            </div>
            <div class="info-row">
              <span class="k">Email:</span>
              <span class="v font-mono">{{ selectedFollowUp.email }}</span>
            </div>
            <div class="info-row">
              <span class="k">CrownKey Parcel:</span>
              <span class="v font-mono">{{ selectedFollowUp.parcelId }}</span>
            </div>
            <div class="info-row">
              <span class="k">Last Offer Made:</span>
              <span class="v text-gold">{{ selectedFollowUp.lastOffer ? '$' + selectedFollowUp.lastOffer.toLocaleString() : 'N/A' }}</span>
            </div>
            <div class="info-row">
              <span class="k">Target ARV:</span>
              <span class="v">${{ selectedFollowUp.arv.toLocaleString() }}</span>
            </div>
          </div>

          <!-- Notes & History Log -->
          <div class="info-card">
            <h4>Seller Dialogue &amp; Notes</h4>
            <p class="notes-text">{{ selectedFollowUp.notes }}</p>
            <div class="add-note-box">
              <input v-model="newNoteText" type="text" placeholder="Log touch notes..." @keyup.enter="addNote" />
              <button class="btn btn-subtle btn-sm" @click="addNote">
                <span v-html="icons.plus"></span>
                Log
              </button>
            </div>
          </div>

          <!-- Recommended Wholesale Scripts -->
          <div class="info-card script-card">
            <h4>
              <span v-html="icons.megaphone" class="tiny-icon"></span>
              Recommended Script for {{ selectedFollowUp.cadenceStage }}
            </h4>
            <p class="script-quote">
              "Hi {{ selectedFollowUp.seller.split(' ')[0] }}, this is {{ selectedFollowUp.rep }} with HushHawk Capital. Just checking back on {{ selectedFollowUp.address.split(',')[0] }}—we finalized our cash allocation for Duval County this week and wanted to see if our ${{ selectedFollowUp.lastOffer ? selectedFollowUp.lastOffer.toLocaleString() : 'cash' }} offer can still work with your timeline?"
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Follow-Up Modal -->
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.clock"></span>
            Schedule New Seller Follow-Up
          </h3>
          <button class="close-btn" @click="isAddModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <form class="modal-body" @submit.prevent="saveNewFollowUp">
          <div class="form-grid">
            <div class="form-group full">
              <label>Seller Full Name *</label>
              <input v-model="newForm.seller" type="text" required placeholder="e.g. Ronald Campbell" />
            </div>
            <div class="form-group full">
              <label>Property Address *</label>
              <input v-model="newForm.address" type="text" required placeholder="e.g. 4812 Moncrief Rd, Jacksonville, FL 32208" />
            </div>
            <div class="form-group">
              <label>Contact Phone</label>
              <input v-model="newForm.phone" type="tel" placeholder="(904) 555-0192" />
            </div>
            <div class="form-group">
              <label>Cadence Stage</label>
              <select v-model="newForm.cadenceStage">
                <option value="Day 1 Post-Offer">Day 1 Post-Offer</option>
                <option value="Day 3 Review">Day 3 Review</option>
                <option value="Day 7 Check-in">Day 7 Check-in</option>
                <option value="Day 14 Counter">Day 14 Counter</option>
                <option value="Day 30 Drip">Day 30 Drip</option>
              </select>
            </div>
            <div class="form-group">
              <label>Motivation Level</label>
              <select v-model="newForm.motivation">
                <option value="Hot">Hot / Immediate</option>
                <option value="Warm">Warm / In Negotiations</option>
                <option value="Cold">Cold / Long Term</option>
              </select>
            </div>
            <div class="form-group">
              <label>Channel</label>
              <select v-model="newForm.channel">
                <option value="Call">Phone Call</option>
                <option value="SMS">SMS Text</option>
                <option value="Email">Email</option>
                <option value="In-Person">In-Person Visit</option>
              </select>
            </div>
            <div class="form-group">
              <label>Last Offer ($)</label>
              <input v-model.number="newForm.lastOffer" type="number" placeholder="140000" />
            </div>
            <div class="form-group">
              <label>Estimated ARV ($)</label>
              <input v-model.number="newForm.arv" type="number" placeholder="230000" />
            </div>
            <div class="form-group full">
              <label>Initial Notes / Objections</label>
              <textarea v-model="newForm.notes" rows="3" placeholder="Sellers need 3 weeks to pack, requested proof of funds..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Task</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Quick Communication Modal -->
    <div v-if="commModal.open" class="modal-overlay" @click.self="commModal.open = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="commModal.type === 'call' ? icons.phone : icons.text"></span>
            {{ commModal.type === 'call' ? 'Log Phone Call with' : 'Send SMS Text to' }} {{ commModal.item?.seller }}
          </h3>
          <button class="close-btn" @click="commModal.open = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="comm-preview">
            <p><strong>Property:</strong> {{ commModal.item?.address }}</p>
            <p><strong>Phone:</strong> {{ commModal.item?.phone }}</p>
          </div>
          <div class="form-group">
            <label>{{ commModal.type === 'call' ? 'Call Outcome & Notes' : 'SMS Message Body' }}</label>
            <textarea v-model="commModal.message" rows="4"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="commModal.open = false">Close</button>
          <button class="btn btn-primary" @click="sendComm">
            {{ commModal.type === 'call' ? 'Save Call Record' : 'Dispatch SMS' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'FollowUpsView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      searchQuery: '',
      urgencyFilter: '',
      motivationFilter: '',
      channelFilter: '',
      selectedFollowUp: null,
      isAddModalOpen: false,
      newNoteText: '',
      commModal: {
        open: false,
        type: 'sms',
        item: null,
        message: ''
      },
      newForm: {
        seller: '',
        address: '',
        phone: '',
        cadenceStage: 'Day 1 Post-Offer',
        motivation: 'Hot',
        channel: 'Call',
        lastOffer: null,
        arv: 240000,
        notes: ''
      },
      metrics: [
        { label: 'Follow-Ups Due Today', value: '14', change: '+3 today', icon: 'clock' },
        { label: 'Hot Seller Leads', value: '8', change: '80%+ close prob', icon: 'zap' },
        { label: 'Overdue Touches', value: '3', change: '-4 cleared', icon: 'bell' },
        { label: 'Completed This Week', value: '62', change: '+22% pace', icon: 'check' }
      ],
      followUps: [
        {
          id: 1,
          seller: 'Evelyn Richardson',
          address: '4218 Commonwealth Ave, Jacksonville, FL 32254',
          parcelId: 'DUV-091822-0001',
          phone: '(904) 555-0143',
          email: 'evelyn.richardson@att.net',
          cadenceStage: 'Day 1 Post-Offer',
          attemptCount: 2,
          dueStatus: 'Today',
          dueText: 'Due in 2 hrs',
          channel: 'Call',
          lastOffer: 138000,
          arv: 245000,
          stage: 'Offer Sent',
          motivation: 'Hot',
          rep: 'Marcus Vance',
          repInitials: 'MV',
          done: false,
          notes: 'Inherited house from parents. Wants to close before 15th to avoid duplicate insurance payment. Spoke yesterday, reviewing offer with sister.'
        },
        {
          id: 2,
          seller: 'Derrick Simmons',
          address: '1540 W 23rd St, Jacksonville, FL 32209',
          parcelId: 'DUV-084721-0034',
          phone: '(904) 555-8910',
          email: 'dsimmons904@gmail.com',
          cadenceStage: 'Day 3 Review',
          attemptCount: 3,
          dueStatus: 'Overdue',
          dueText: 'Overdue 1 day',
          channel: 'SMS',
          lastOffer: 95000,
          arv: 195000,
          stage: 'Counter Pending',
          motivation: 'Hot',
          rep: 'Sarah Jenkins',
          repInitials: 'SJ',
          done: false,
          notes: 'Told us $95k is close but wants $105k to clear mortgage. Sent SMS offering to cover $2,500 seller closing costs.'
        },
        {
          id: 3,
          seller: 'Patricia Delgado',
          address: '8824 Normandy Blvd, Jacksonville, FL 32221',
          parcelId: 'DUV-041920-0112',
          phone: '(904) 555-3382',
          email: 'pdelgado@bellsouth.net',
          cadenceStage: 'Day 7 Check-in',
          attemptCount: 4,
          dueStatus: 'Today',
          dueText: 'Today 3:00 PM',
          channel: 'Call',
          lastOffer: 172000,
          arv: 290000,
          stage: 'Inspection Done',
          motivation: 'Warm',
          rep: 'Marcus Vance',
          repInitials: 'MV',
          done: false,
          notes: 'Roof has minor leak in back bedroom. Contractor bid came back at $7,800. Checking if she will accept $168,000 net cash.'
        },
        {
          id: 4,
          seller: 'Harold Green',
          address: '2931 University Blvd N, Jacksonville, FL 32211',
          parcelId: 'DUV-072319-0099',
          phone: '(904) 555-9012',
          email: 'hgreen.jax@yahoo.com',
          cadenceStage: 'Day 14 Counter',
          attemptCount: 5,
          dueStatus: 'Tomorrow',
          dueText: 'Tomorrow 10:00 AM',
          channel: 'SMS',
          lastOffer: 115000,
          arv: 210000,
          stage: 'Follow-Up Drip',
          motivation: 'Warm',
          rep: 'Elena Rostova',
          repInitials: 'ER',
          done: false,
          notes: 'Tenant moved out last weekend. Property is completely vacant now. Sent updated video walkthrough to cash buyer VIP pool.'
        },
        {
          id: 5,
          seller: 'Barbara Higgins',
          address: '614 Oceanway Ave, Jacksonville, FL 32218',
          parcelId: 'DUV-038291-0044',
          phone: '(904) 555-4811',
          email: 'bhiggins@comcast.net',
          cadenceStage: 'Day 30 Drip',
          attemptCount: 6,
          dueStatus: 'Upcoming',
          dueText: 'In 3 days',
          channel: 'Email',
          lastOffer: 195000,
          arv: 320000,
          stage: 'Nurture',
          motivation: 'Cold',
          rep: 'Sarah Jenkins',
          repInitials: 'SJ',
          done: false,
          notes: 'Needs to find replacement manufactured home first before selling. Keep in bi-weekly automated market check.'
        },
        {
          id: 6,
          seller: 'Kenneth Washington',
          address: '1105 Dunn Ave, Jacksonville, FL 32218',
          parcelId: 'DUV-062810-0019',
          phone: '(904) 555-7281',
          email: 'kwash904@gmail.com',
          cadenceStage: 'Day 1 Post-Offer',
          attemptCount: 1,
          dueStatus: 'Today',
          dueText: 'Due now',
          channel: 'Call',
          lastOffer: 165000,
          arv: 275000,
          stage: 'Offer Sent',
          motivation: 'Hot',
          rep: 'Marcus Vance',
          repInitials: 'MV',
          done: false,
          notes: 'Code enforcement notice received for overgrown lot and damaged fascia. Urgent to sell before Duval magistrate hearing.'
        }
      ]
    };
  },
  computed: {
    hasActiveFilters() {
      return Boolean(this.searchQuery || this.urgencyFilter || this.motivationFilter || this.channelFilter);
    },
    filteredFollowUps() {
      return this.followUps.filter(item => {
        if (this.urgencyFilter && item.dueStatus !== this.urgencyFilter) return false;
        if (this.motivationFilter && item.motivation !== this.motivationFilter) return false;
        if (this.channelFilter && item.channel !== this.channelFilter) return false;
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          const match =
            item.seller.toLowerCase().includes(q) ||
            item.address.toLowerCase().includes(q) ||
            item.phone.includes(q) ||
            item.notes.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });
    }
  },
  methods: {
    getChannelIcon(ch) {
      if (ch === 'Call') return this.icons.phone;
      if (ch === 'SMS') return this.icons.text;
      if (ch === 'Email') return this.icons.mail;
      return this.icons.user;
    },
    selectFollowUp(item) {
      this.selectedFollowUp = item;
    },
    toggleComplete(item) {
      item.done = !item.done;
    },
    snoozeFollowUp(item, days) {
      item.dueStatus = 'Upcoming';
      item.dueText = `Snoozed +${days}d`;
    },
    quickCall(item) {
      this.commModal = {
        open: true,
        type: 'call',
        item,
        message: `Spoke with ${item.seller}. Re-confirmed cash offer of $${item.lastOffer ? item.lastOffer.toLocaleString() : 'N/A'}. Awaiting contract signature.`
      };
    },
    quickSms(item) {
      this.commModal = {
        open: true,
        type: 'sms',
        item,
        message: `Hi ${item.seller.split(' ')[0]}, this is ${item.rep} with HushHawk. Quick check-in on ${item.address.split(',')[0]}—did you have any questions on the cash terms we sent over?`
      };
    },
    sendComm() {
      if (this.commModal.item) {
        this.commModal.item.attemptCount += 1;
        this.commModal.item.notes = `${new Date().toLocaleDateString()}: [${this.commModal.type.toUpperCase()}] ${this.commModal.message} | ` + this.commModal.item.notes;
      }
      this.commModal.open = false;
    },
    addNote() {
      if (!this.newNoteText.trim() || !this.selectedFollowUp) return;
      this.selectedFollowUp.notes = `${new Date().toLocaleDateString()}: ${this.newNoteText} | ` + this.selectedFollowUp.notes;
      this.newNoteText = '';
    },
    resetFilters() {
      this.searchQuery = '';
      this.urgencyFilter = '';
      this.motivationFilter = '';
      this.channelFilter = '';
    },
    saveNewFollowUp() {
      const id = Date.now();
      this.followUps.unshift({
        id,
        seller: this.newForm.seller,
        address: this.newForm.address,
        parcelId: 'DUV-' + Math.floor(100000 + Math.random() * 900000) + '-0000',
        phone: this.newForm.phone || '(904) 555-0000',
        email: 'seller@lead.com',
        cadenceStage: this.newForm.cadenceStage,
        attemptCount: 1,
        dueStatus: 'Today',
        dueText: 'Due today',
        channel: this.newForm.channel,
        lastOffer: this.newForm.lastOffer,
        arv: this.newForm.arv || 220000,
        stage: 'Active Follow-up',
        motivation: this.newForm.motivation,
        rep: 'Marcus Vance',
        repInitials: 'MV',
        done: false,
        notes: this.newForm.notes || 'Newly scheduled touch.'
      });
      this.isAddModalOpen = false;
      this.newForm = {
        seller: '',
        address: '',
        phone: '',
        cadenceStage: 'Day 1 Post-Offer',
        motivation: 'Hot',
        channel: 'Call',
        lastOffer: null,
        arv: 240000,
        notes: ''
      };
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
    openQuickAction(act) {
      this.showToast('Cadence Engine Active', `Initiated automated morning SMS drip cadence to ${this.filteredFollowUps.length} motivated sellers.`, 'success');
    }
  }
};
</script>

<style scoped>
.view-container {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  transition: all 0.2s ease;
  min-width: 0;
  box-sizing: border-box;
}

.metric-card:hover {
  border-color: rgba(237, 207, 124, 0.3);
  transform: translateY(-1px);
}

.metric-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: #94a3b8;
  flex-shrink: 0;
}

.metric-icon-wrap.gold {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.metric-icon-wrap.cyan {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.metric-icon-wrap.green {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.metric-icon-wrap.red {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.metric-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.metric-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-val {
  font-size: 1.45rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-change {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-change.positive {
  color: #4ade80;
}

.metric-change.negative {
  color: #f87171;
}

.content-split {
  display: flex;
  gap: 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.main-panel {
  flex: 1;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-left h2 {
  font-size: 1.15rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.icon-title {
  color: #edcf7c;
  display: flex;
}

.badge-count {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: #94a3b8;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  flex: 1;
  min-width: 220px;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #f8fafc;
  font-size: 0.85rem;
  width: 100%;
}

.clear-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  display: flex;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.filter-group label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.filter-group select {
  background: #04182d;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  outline: none;
}

.table-container {
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  text-align: left;
}

.data-table th {
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  padding: 0.75rem 0.9rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table td {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.data-table tr:hover {
  background: rgba(237, 207, 124, 0.04);
  cursor: pointer;
}

.data-table tr.selected {
  background: rgba(237, 207, 124, 0.08);
  border-left: 3px solid #edcf7c;
}

.data-table tr.completed {
  opacity: 0.55;
}

.checkbox-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4ade80;
}

.checkbox-btn.checked {
  background: rgba(74, 222, 128, 0.2);
  border-color: #4ade80;
}

.cell-main {
  display: flex;
  flex-direction: column;
}

.seller-name {
  font-weight: 600;
  color: #f8fafc;
}

.prop-sub {
  font-size: 0.75rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.tiny-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
}

.cadence-chip {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.touch-counter {
  display: block;
  font-size: 0.7rem;
  color: #94a3b8;
  margin-top: 2px;
}

.due-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.due-badge.today {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.due-badge.overdue {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.due-badge.tomorrow, .due-badge.upcoming {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.channel-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: #cbd5e1;
}

.offer-col {
  display: flex;
  flex-direction: column;
}

.offer-val {
  color: #edcf7c;
  font-weight: 600;
}

.lead-stage {
  font-size: 0.7rem;
  color: #94a3b8;
}

.badge-motivation {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-motivation.hot {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.badge-motivation.warm {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.badge-motivation.cold {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.rep-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.rep-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1e293b;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
}

.row-actions {
  display: flex;
  gap: 0.35rem;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(237, 207, 124, 0.15);
  border-color: #edcf7c;
  color: #edcf7c;
}

/* Detail Drawer */
.detail-drawer {
  width: 340px;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.75rem;
}

.drawer-title h3 {
  font-size: 1.1rem;
  color: #f8fafc;
  margin: 0.35rem 0 0.15rem 0;
}

.drawer-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

.drawer-action-strip {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.info-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.info-card h4 {
  font-size: 0.8rem;
  color: #edcf7c;
  margin: 0 0 0.4rem 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.info-row .k {
  color: #94a3b8;
}

.info-row .v {
  color: #f8fafc;
  font-weight: 500;
}

.notes-text {
  font-size: 0.8rem;
  color: #cbd5e1;
  line-height: 1.4;
  margin: 0;
}

.add-note-box {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.add-note-box input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #f8fafc;
  padding: 0.35rem 0.5rem;
  font-size: 0.75rem;
}

.script-card {
  border-left: 3px solid #edcf7c;
}

.script-quote {
  font-size: 0.8rem;
  font-style: italic;
  color: #e2e8f0;
  line-height: 1.45;
  margin: 0;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: #07192d;
  border: 1px solid rgba(237, 207, 124, 0.3);
  border-radius: 12px;
  width: 100%;
  max-width: 540px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
  font-size: 1.05rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-group label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.form-group input,
.form-group select,
.form-group textarea {
  background: #04182d;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  color: #f8fafc;
  font-size: 0.825rem;
  outline: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Common UI Elements */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-primary {
  background: #edcf7c;
  color: #04182d;
}

.btn-primary:hover {
  background: #dfc26f;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn-subtle {
  background: transparent;
  color: #94a3b8;
}

.btn-subtle:hover {
  color: #f8fafc;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  display: flex;
}

.close-btn:hover {
  color: #f8fafc;
}

.empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
}

.empty-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: #94a3b8;
}

.empty-icon {
  width: 36px;
  height: 36px;
  opacity: 0.5;
}

.font-mono {
  font-family: monospace;
}

.text-gold {
  color: #edcf7c;
  font-weight: 600;
}

@media (max-width: 1280px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .content-split {
    flex-direction: column;
  }
  .detail-drawer {
    width: 100%;
  }
}
</style>
