<template>
  <div class="view-container">
    <!-- Top Metrics -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 2, cyan: i === 0, green: i === 1, purple: i === 3 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="content-split" :class="{ 'has-drawer': selectedContact }">
      <div class="main-panel">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.user"></span>
              First Coast Wholesale Rolodex &amp; Directory
            </h2>
            <span class="badge-count">{{ filteredContacts.length }} directory entries</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" @click="isAddModalOpen = true">
              <span v-html="icons.plus"></span>
              Add Contact
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
              placeholder="Search contact name, company, email, phone, or tags..."
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="filter-group">
            <label>Type:</label>
            <select v-model="typeFilter">
              <option value="">All Contact Types</option>
              <option value="Distressed Seller">Distressed Sellers</option>
              <option value="Cash Buyer">VIP Cash Buyers</option>
              <option value="Title Officer">Title &amp; Escrow</option>
              <option value="Lender">Hard Money Lenders</option>
              <option value="Contractor">Contractors &amp; Trades</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Status:</label>
            <select v-model="statusFilter">
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Under Contract">Under Contract</option>
              <option value="VIP Verified">VIP Verified</option>
            </select>
          </div>

          <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
            <span v-html="icons.refresh"></span>
            Reset
          </button>
        </div>

        <!-- Contacts Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Contact Name &amp; Company</th>
                <th>Category</th>
                <th>Phone Number</th>
                <th>Email Address</th>
                <th>Specialty / Tags</th>
                <th>Associated Property</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in filteredContacts"
                :key="c.id"
                :class="{ selected: selectedContact && selectedContact.id === c.id }"
                @click="selectContact(c)"
              >
                <td>
                  <div class="contact-name-cell">
                    <span class="contact-avatar">{{ c.initials }}</span>
                    <div>
                      <strong class="c-name">{{ c.name }}</strong>
                      <span v-if="c.company" class="c-comp">{{ c.company }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="role-pill" :class="c.type.toLowerCase().replace(/[\s&]+/g, '-')">
                    {{ c.type }}
                  </span>
                </td>
                <td class="font-mono">{{ c.phone }}</td>
                <td class="font-mono text-muted">{{ c.email }}</td>
                <td>
                  <div class="tags-wrap">
                    <span v-for="tag in c.tags" :key="tag" class="tag-badge">{{ tag }}</span>
                  </div>
                </td>
                <td>
                  <span v-if="c.property" class="prop-link-cell">
                    <span v-html="icons.pin" class="tiny-icon"></span>
                    {{ c.property }}
                  </span>
                  <span v-else class="text-muted">None linked</span>
                </td>
                <td>
                  <span class="status-chip" :class="c.status.toLowerCase().replace(/\s+/g, '-')">
                    {{ c.status }}
                  </span>
                </td>
                <td @click.stop>
                  <div class="row-actions">
                    <button class="action-btn call" title="Call" @click="quickCall(c)">
                      <span v-html="icons.phone"></span>
                    </button>
                    <button class="action-btn sms" title="SMS" @click="quickSms(c)">
                      <span v-html="icons.text"></span>
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredContacts.length === 0">
                <td colspan="8" class="empty-state">
                  <div class="empty-box">
                    <span class="empty-icon" v-html="icons.user"></span>
                    <p>No contacts found matching your query.</p>
                    <button class="btn btn-secondary" @click="resetFilters">Reset Filters</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Slide-out Drawer -->
      <div v-if="selectedContact" class="detail-drawer">
        <div class="drawer-header">
          <div class="drawer-title">
            <span class="role-pill" :class="selectedContact.type.toLowerCase().replace(/[\s&]+/g, '-')">
              {{ selectedContact.type }}
            </span>
            <h3>{{ selectedContact.name }}</h3>
            <span v-if="selectedContact.company" class="drawer-sub">{{ selectedContact.company }}</span>
          </div>
          <button class="close-btn" @click="selectedContact = null">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="drawer-body">
          <div class="drawer-action-strip">
            <button class="btn btn-primary" @click="quickCall(selectedContact)">
              <span v-html="icons.phone"></span>
              Call
            </button>
            <button class="btn btn-secondary" @click="quickSms(selectedContact)">
              <span v-html="icons.text"></span>
              SMS
            </button>
          </div>

          <div class="info-card">
            <h4>Contact Dossier</h4>
            <div class="info-row">
              <span class="k">Phone:</span>
              <span class="v font-mono">{{ selectedContact.phone }}</span>
            </div>
            <div class="info-row">
              <span class="k">Email:</span>
              <span class="v font-mono">{{ selectedContact.email }}</span>
            </div>
            <div class="info-row" v-if="selectedContact.property">
              <span class="k">Linked Deal:</span>
              <span class="v text-gold">{{ selectedContact.property }}</span>
            </div>
            <div class="info-row">
              <span class="k">Last Touch:</span>
              <span class="v">{{ selectedContact.lastTouch }}</span>
            </div>
          </div>

          <div class="info-card">
            <h4>Tags &amp; Buy Box Profile</h4>
            <div class="tags-wrap">
              <span v-for="tag in selectedContact.tags" :key="tag" class="tag-badge">{{ tag }}</span>
            </div>
          </div>

          <div class="info-card">
            <h4>Relationship Notes</h4>
            <p class="notes-text">{{ selectedContact.notes }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Contact Modal -->
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.user"></span>
            Add Directory Contact
          </h3>
          <button class="close-btn" @click="isAddModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <form class="modal-body" @submit.prevent="saveNewContact">
          <div class="form-grid">
            <div class="form-group">
              <label>Full Name *</label>
              <input v-model="newContact.name" type="text" required placeholder="e.g. Marcus Sterling" />
            </div>
            <div class="form-group">
              <label>Company / Entity</label>
              <input v-model="newContact.company" type="text" placeholder="e.g. First Coast Capital LLC" />
            </div>
            <div class="form-group">
              <label>Category</label>
              <select v-model="newContact.type">
                <option value="Distressed Seller">Distressed Seller</option>
                <option value="Cash Buyer">VIP Cash Buyer</option>
                <option value="Title Officer">Title Officer</option>
                <option value="Lender">Hard Money Lender</option>
                <option value="Contractor">Contractor</option>
              </select>
            </div>
            <div class="form-group">
              <label>Phone Number *</label>
              <input v-model="newContact.phone" type="tel" required placeholder="(904) 555-0199" />
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input v-model="newContact.email" type="email" placeholder="contact@domain.com" />
            </div>
            <div class="form-group">
              <label>Tags (comma separated)</label>
              <input v-model="newContact.tagsInput" type="text" placeholder="Duval 32208, Cash, Heavy Rehab" />
            </div>
            <div class="form-group full">
              <label>Notes &amp; Wholesale Intel</label>
              <textarea v-model="newContact.notes" rows="3" placeholder="Buys SFR flips in 32208, 32209. Prefers deals under $120k..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Save Contact</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'ContactsView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      searchQuery: '',
      typeFilter: '',
      statusFilter: '',
      selectedContact: null,
      isAddModalOpen: false,
      metrics: [
        { label: 'Total Rolodex Contacts', value: '1,248', change: '+38 this month', icon: 'users' },
        { label: 'VIP Cash Buyers', value: '142', change: '$48M+ verified POF', icon: 'dollar' },
        { label: 'Active Sellers', value: '84', change: '24 in negotiation', icon: 'house' },
        { label: 'Title & Lenders', value: '22', change: 'Preferred vendors', icon: 'shield' }
      ],
      newContact: {
        name: '',
        company: '',
        type: 'Cash Buyer',
        phone: '',
        email: '',
        tagsInput: '',
        notes: ''
      },
      contacts: [
        {
          id: 1,
          name: 'Ronald Campbell',
          company: '',
          type: 'Distressed Seller',
          phone: '(904) 555-0182',
          email: 'r.campbell@att.net',
          tags: ['Probate', 'Duval 32208', 'Vacant'],
          property: '4812 Moncrief Rd, Jacksonville, FL',
          status: 'Under Contract',
          initials: 'RC',
          lastTouch: 'Today 10:14 AM',
          notes: 'Inherited from parents. Agreed to $110k cash offer. In escrow with First American.'
        },
        {
          id: 2,
          name: 'David Ross',
          company: 'Apex Jacksonville Holdings LLC',
          type: 'Cash Buyer',
          phone: '(904) 555-8911',
          email: 'dross@apexjaxholdings.com',
          tags: ['VIP Buyer', 'Duval', 'Cash Fast Close', 'BRRRR'],
          property: '1540 W 23rd St, Jacksonville, FL',
          status: 'VIP Verified',
          initials: 'DR',
          lastTouch: 'Today 9:30 AM',
          notes: '$250k liquid POF on file. Looking for 3/1 or 3/2 SFRs in 32208/32209 under $135k.'
        },
        {
          id: 3,
          name: 'Lisa Miller',
          company: 'First American Title / Crown Escrow',
          type: 'Title Officer',
          phone: '(904) 555-2100',
          email: 'lmiller@firstam.com',
          tags: ['Title Partner', 'Assignment Friendly', 'Double Close'],
          property: '',
          status: 'Active',
          initials: 'LM',
          lastTouch: 'Yesterday 3:30 PM',
          notes: 'Primary title agent for HushHawk wholesale assignments. Understands double closes and assignment contracts.'
        },
        {
          id: 4,
          name: 'Greg Thornton',
          company: 'First Coast Hard Money Partners',
          type: 'Lender',
          phone: '(904) 555-9080',
          email: 'greg@firstcoasthml.com',
          tags: ['100% Rehab', '10.5% Rate', '48hr Close'],
          property: '',
          status: 'Active',
          initials: 'GT',
          lastTouch: 'Last week',
          notes: 'Funds our VIP buyers at 90% purchase / 100% rehab. Fast approval without appraisal.'
        },
        {
          id: 5,
          name: 'Evelyn Richardson',
          company: '',
          type: 'Distressed Seller',
          phone: '(904) 555-0143',
          email: 'evelyn.richardson@att.net',
          tags: ['Tax Delinquent', 'Commonwealth', 'Duval 32254'],
          property: '4218 Commonwealth Ave, Jacksonville, FL',
          status: 'Active',
          initials: 'ER',
          lastTouch: 'Yesterday 2:05 PM',
          notes: 'Motivated to close before end of month. Offered $138k net cash.'
        }
      ]
    };
  },
  computed: {
    hasActiveFilters() {
      return Boolean(this.searchQuery || this.typeFilter || this.statusFilter);
    },
    filteredContacts() {
      return this.contacts.filter(c => {
        if (this.typeFilter && c.type !== this.typeFilter) return false;
        if (this.statusFilter && c.status !== this.statusFilter) return false;
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          return (
            c.name.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.tags.some(t => t.toLowerCase().includes(q))
          );
        }
        return true;
      });
    }
  },

  mounted() {
    this.loadContacts();
  },
  methods: {
    async loadContacts() {
      try {
        const res = await fetch('/api/v1/contacts');
        const data = await res.json();
        if (data.contacts && data.contacts.length > 0) {
          this.contacts = data.contacts;
        }
      } catch (err) {
        console.warn('[Contacts] Using local cache:', err.message);
      }
    },

    selectContact(c) {
      this.selectedContact = c;
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
    quickCall(c) {
      this.showToast('Twilio Voice Outbound', `Connecting bridge to ${c.name} (${c.phone})...`, 'success');
    },
    quickSms(c) {
      this.showToast('SMS Dispatch', `Opening 2-way conversation channel with ${c.name} at ${c.phone}.`, 'info');
    },
    resetFilters() {
      this.searchQuery = '';
      this.typeFilter = '';
      this.statusFilter = '';
    },
    async saveNewContact() {
      const initials = this.newContact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      const tags = this.newContact.tagsInput ? this.newContact.tagsInput.split(',').map(t => t.trim()).filter(Boolean) : ['New Contact'];
      const payload = {
        name: this.newContact.name,
        company: this.newContact.company,
        type: this.newContact.type,
        phone: this.newContact.phone,
        email: this.newContact.email,
        tagsInput: tags,
        notes: this.newContact.notes
      };

      try {
        const res = await fetch('/api/v1/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const saved = await res.json();
          this.contacts.unshift(saved);
        } else {
          this.contacts.unshift({
            id: Date.now(),
            ...payload,
            tags,
            property: '',
            status: 'Active',
            initials,
            lastTouch: 'Just now'
          });
        }
      } catch (e) {
        this.contacts.unshift({
          id: Date.now(),
          ...payload,
          tags,
          property: '',
          status: 'Active',
          initials,
          lastTouch: 'Just now'
        });
      }

      this.isAddModalOpen = false;
      this.newContact = {
        name: '',
        company: '',
        type: 'Cash Buyer',
        phone: '',
        email: '',
        tagsInput: '',
        notes: ''
      };
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Contact Created', `${payload.name} added to Rolodex.`, 'success');
      }
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
  min-width: 0;
  box-sizing: border-box;
}

.metric-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
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

.metric-icon-wrap.purple {
  background: rgba(192, 132, 252, 0.15);
  color: #c084fc;
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

.contact-name-cell {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.contact-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.c-name {
  color: #f8fafc;
  display: block;
}

.c-comp {
  font-size: 0.7rem;
  color: #94a3b8;
}

.role-pill {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.role-pill.distressed-seller {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.role-pill.cash-buyer {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
}

.role-pill.title-officer {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.role-pill.lender {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.role-pill.contractor {
  background: rgba(251, 146, 60, 0.15);
  color: #fb923c;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.tag-badge {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.65rem;
}

.prop-link-cell {
  font-size: 0.75rem;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.status-chip {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-chip.vip-verified {
  background: rgba(237, 207, 124, 0.2);
  color: #edcf7c;
  border: 1px solid rgba(237, 207, 124, 0.4);
}

.status-chip.under-contract {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.status-chip.active {
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
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
}

.action-btn:hover {
  background: rgba(237, 207, 124, 0.15);
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
}

.notes-text {
  font-size: 0.8rem;
  color: #cbd5e1;
  line-height: 1.4;
  margin: 0;
}

.font-mono {
  font-family: monospace;
}

.text-gold {
  color: #edcf7c;
}

.text-muted {
  color: #64748b;
}

.tiny-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
}

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

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
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
