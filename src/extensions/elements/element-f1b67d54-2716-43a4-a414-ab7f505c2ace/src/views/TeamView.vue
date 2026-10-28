<template>
  <div class="view-container">
    <!-- Metrics Header Bar -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 3, cyan: i === 0 || i === 1, green: i === 2 }">
          <span v-html="icons[m.icon] || icons.users"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }} <em>{{ m.note }}</em>
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace Layout -->
    <div class="content-split" :class="{ 'has-drawer': selectedMember }">
      <div class="main-panel">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.users"></span>
              Wholesale Team &amp; Production Roster
            </h2>
            <span class="badge-count">{{ filteredMembers.length }} team members</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="exportRoster">
              <span v-html="icons.download"></span>
              Export Roster
            </button>
            <button class="btn btn-primary" @click="openModal('invite')">
              <span v-html="icons.plus"></span>
              Add Team Member
            </button>
          </div>
        </div>

        <!-- Filter & Search Controls -->
        <div class="filter-toolbar">
          <div class="search-box">
            <span v-html="icons.search"></span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search member name, title, role, territory, email..."
              aria-label="Search team members"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="filter-group">
            <label>Department:</label>
            <select v-model="departmentFilter" aria-label="Filter by department">
              <option value="">All Departments</option>
              <option value="Executive">Executive &amp; Leadership</option>
              <option value="Acquisitions">Acquisitions</option>
              <option value="Dispositions">Dispositions</option>
              <option value="Lead Gen">Lead Generation</option>
              <option value="Operations">Operations &amp; Title</option>
              <option value="Underwriting">Underwriting</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Status:</label>
            <select v-model="statusFilter" aria-label="Filter by status">
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="In Field">In Field Walkthrough</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Sort By:</label>
            <select v-model="sortBy" aria-label="Sort members">
              <option value="name">Name (A-Z)</option>
              <option value="closed">Deals Closed (High to Low)</option>
              <option value="volume">Production Volume</option>
              <option value="role">Department</option>
            </select>
          </div>
        </div>

        <!-- Members Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Team Member</th>
                <th>Department / Role</th>
                <th>Assigned Territory</th>
                <th>Contact Info</th>
                <th>Deals Closed</th>
                <th>Volume (MTD)</th>
                <th>Status</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="member in filteredMembers"
                :key="member.id"
                :class="{ 'row-selected': selectedMember?.id === member.id }"
                @click="selectMember(member)"
              >
                <td class="member-cell">
                  <div class="avatar-badge" :style="{ background: member.avatarBg }">
                    {{ member.initials }}
                  </div>
                  <div class="member-meta">
                    <strong>{{ member.name }}</strong>
                    <small>{{ member.title }}</small>
                  </div>
                </td>
                <td>
                  <span class="role-pill" :class="getDepartmentClass(member.department)">
                    {{ member.department }}
                  </span>
                </td>
                <td>
                  <span class="territory-tag font-mono">{{ member.territory }}</span>
                </td>
                <td class="contact-cell">
                  <div><span class="mini-icon" v-html="icons.mail"></span> {{ member.email }}</div>
                  <div><span class="mini-icon" v-html="icons.phone"></span> {{ member.phone }}</div>
                </td>
                <td>
                  <strong class="text-gold font-mono">{{ member.dealsClosed }} deals</strong>
                </td>
                <td>
                  <span class="volume-val font-mono">{{ formatCurrency(member.productionVolume) }}</span>
                </td>
                <td>
                  <span class="status-indicator" :class="getStatusClass(member.status)">
                    <span class="status-dot"></span>
                    {{ member.status }}
                  </span>
                </td>
                <td class="actions-col" @click.stop>
                  <button class="btn-icon" @click="openEditModal(member)" title="Edit Permissions">
                    <span v-html="icons.sliders"></span>
                  </button>
                  <button class="btn-icon" @click="selectMember(member)" title="View Member Dossier">
                    <span v-html="icons.arrowRight"></span>
                  </button>
                </td>
              </tr>
              <tr v-if="filteredMembers.length === 0">
                <td colspan="8" class="empty-state">
                  <div class="empty-inner">
                    <span class="empty-icon" v-html="icons.users"></span>
                    <p>No team members match the current filter criteria.</p>
                    <button class="btn btn-secondary" @click="resetFilters">Reset Filters</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Right Member Detail Dossier Drawer -->
      <aside v-if="selectedMember" class="detail-drawer">
        <div class="drawer-header">
          <div class="drawer-title">
            <span class="drawer-badge">Team Dossier</span>
            <h3>{{ selectedMember.name }}</h3>
            <small>{{ selectedMember.title }} · {{ selectedMember.department }}</small>
          </div>
          <button class="close-btn" @click="selectedMember = null" aria-label="Close dossier">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="drawer-body">
          <div class="member-profile-card">
            <div class="profile-avatar" :style="{ background: selectedMember.avatarBg }">
              {{ selectedMember.initials }}
            </div>
            <div class="profile-details">
              <strong>{{ selectedMember.name }}</strong>
              <p>{{ selectedMember.email }}</p>
              <p class="phone-link">{{ selectedMember.phone }}</p>
              <div class="profile-badges">
                <span class="badge-tag">{{ selectedMember.accessLevel }} Access</span>
                <span class="badge-tag cyan">Podio User Sync</span>
              </div>
            </div>
          </div>

          <div class="section-card">
            <h4>Production Performance (MTD)</h4>
            <div class="kpi-grid">
              <div class="kpi-box">
                <span class="kpi-label">Contracts Locked</span>
                <strong class="font-mono text-gold">{{ selectedMember.dealsClosed }}</strong>
              </div>
              <div class="kpi-box">
                <span class="kpi-label">Production Volume</span>
                <strong class="font-mono">{{ formatCurrency(selectedMember.productionVolume) }}</strong>
              </div>
              <div class="kpi-box">
                <span class="kpi-label">Win / Close Rate</span>
                <strong class="font-mono text-green">{{ selectedMember.closeRate }}%</strong>
              </div>
              <div class="kpi-box">
                <span class="kpi-label">Avg Spread</span>
                <strong class="font-mono text-cyan">{{ formatCurrency(selectedMember.avgSpread) }}</strong>
              </div>
            </div>
          </div>

          <div class="section-card">
            <h4>Assigned Territory &amp; Buy Box</h4>
            <div class="territory-box">
              <p><strong>Primary Market:</strong> {{ selectedMember.territory }}</p>
              <p><strong>Target ZIP Codes:</strong> <span class="font-mono">{{ selectedMember.zipCodes }}</span></p>
              <p><strong>Commission Split:</strong> {{ selectedMember.commissionSplit }}</p>
            </div>
          </div>

          <div class="section-card">
            <h4>System Permissions &amp; Access</h4>
            <ul class="permission-list">
              <li :class="{ enabled: selectedMember.permissions.signContracts }">
                <span class="perm-icon" v-html="selectedMember.permissions.signContracts ? icons.check : icons.close"></span>
                Execute Purchase Agreements (PSA)
              </li>
              <li :class="{ enabled: selectedMember.permissions.viewFinancials }">
                <span class="perm-icon" v-html="selectedMember.permissions.viewFinancials ? icons.check : icons.close"></span>
                Access Wholesale Spreads &amp; Financials
              </li>
              <li :class="{ enabled: selectedMember.permissions.blastBuyers }">
                <span class="perm-icon" v-html="selectedMember.permissions.blastBuyers ? icons.check : icons.close"></span>
                Broadcast Email/SMS Deal Blasts
              </li>
              <li :class="{ enabled: selectedMember.permissions.exportCsv }">
                <span class="perm-icon" v-html="selectedMember.permissions.exportCsv ? icons.check : icons.close"></span>
                Export County &amp; Buyer CSV Records
              </li>
            </ul>
          </div>

          <div class="drawer-actions">
            <button class="btn btn-primary" @click="openEditModal(selectedMember)">
              <span v-html="icons.sliders"></span>
              Edit Permissions
            </button>
            <button class="btn btn-secondary" @click="toggleStatus(selectedMember)">
              <span v-html="icons.clock"></span>
              Toggle Status ({{ selectedMember.status === 'Active' ? 'Set Offline' : 'Set Active' }})
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Invite Team Member Modal -->
    <div v-if="activeModal === 'invite'" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-badge">Team Expansion</span>
            <h3>Add New Team Member</h3>
          </div>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <form @submit.prevent="submitInvite" class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Full Name *</label>
              <input v-model="newMember.name" type="text" placeholder="e.g. Jordan Miller" required />
            </div>
            <div class="form-group">
              <label>Official Title *</label>
              <input v-model="newMember.title" type="text" placeholder="e.g. Acquisitions Manager" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Work Email *</label>
              <input v-model="newMember.email" type="email" placeholder="jordan@hushhawk.com" required />
            </div>
            <div class="form-group">
              <label>Phone Number *</label>
              <input v-model="newMember.phone" type="text" placeholder="(904) 555-0192" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Department *</label>
              <select v-model="newMember.department" required>
                <option value="Acquisitions">Acquisitions</option>
                <option value="Dispositions">Dispositions</option>
                <option value="Lead Gen">Lead Generation</option>
                <option value="Operations">Operations &amp; Title</option>
                <option value="Underwriting">Underwriting</option>
                <option value="Executive">Executive</option>
              </select>
            </div>
            <div class="form-group">
              <label>Role / Access Level *</label>
              <select v-model="newMember.accessLevel" required>
                <option value="Admin">Admin (Full System Access)</option>
                <option value="Manager">Manager (Team &amp; Pipeline Edit)</option>
                <option value="Agent">Agent (Assigned Territory Only)</option>
                <option value="Title Read-Only">Title / Escrow (Read-Only)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Assigned Territory / Focus</label>
            <input v-model="newMember.territory" type="text" placeholder="e.g. Duval County Urban Core (32206, 32208, 32209)" />
          </div>

          <div class="form-group">
            <label>Target ZIP Codes (Comma separated)</label>
            <input v-model="newMember.zipCodes" type="text" placeholder="32208, 32209, 32210, 32244" />
          </div>

          <div class="form-group">
            <label>Commission Split / Terms</label>
            <input v-model="newMember.commissionSplit" type="text" placeholder="e.g. 15% Net Assignment Margin" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary">
              <span v-html="icons.check"></span>
              Add Team Member
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Permissions Modal -->
    <div v-if="activeModal === 'edit'" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-badge">Access Control</span>
            <h3>Role &amp; Permissions: {{ editingMember?.name }}</h3>
          </div>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <form @submit.prevent="savePermissions" class="modal-body">
          <div class="form-group">
            <label>Access Tier Level</label>
            <select v-model="editingMember.accessLevel">
              <option value="Admin">Admin (Full Control)</option>
              <option value="Manager">Manager</option>
              <option value="Agent">Agent</option>
              <option value="Title Read-Only">Title Read-Only</option>
            </select>
          </div>

          <div class="form-group">
            <label>Assigned Department</label>
            <select v-model="editingMember.department">
              <option value="Acquisitions">Acquisitions</option>
              <option value="Dispositions">Dispositions</option>
              <option value="Lead Gen">Lead Generation</option>
              <option value="Operations">Operations &amp; Title</option>
              <option value="Underwriting">Underwriting</option>
              <option value="Executive">Executive</option>
            </select>
          </div>

          <div class="perm-checks">
            <label class="checkbox-row">
              <input type="checkbox" v-model="editingMember.permissions.signContracts" />
              <div>
                <strong>Execute Purchase Agreements (PSA)</strong>
                <small>Can digitally sign and commit wholesale earnest money</small>
              </div>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" v-model="editingMember.permissions.viewFinancials" />
              <div>
                <strong>View Financial Margins &amp; Spreads</strong>
                <small>Visible access to net fee projections, settlement sheets and banking</small>
              </div>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" v-model="editingMember.permissions.blastBuyers" />
              <div>
                <strong>Broadcast Cash Buyer Blasts</strong>
                <small>Can send deal notifications to VIP buyer distribution lists</small>
              </div>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" v-model="editingMember.permissions.exportCsv" />
              <div>
                <strong>Export Raw Intelligence Data</strong>
                <small>Can download CSV tables of county records, skip traces, and buyers</small>
              </div>
            </label>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary">
              <span v-html="icons.check"></span>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'TeamView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      searchQuery: '',
      departmentFilter: '',
      statusFilter: '',
      sortBy: 'volume',
      selectedMember: null,
      activeModal: null,
      editingMember: null,
      metrics: [
        { label: 'Active Team Roster', value: '8 Members', change: '+2', note: 'Q4 growth', icon: 'users' },
        { label: 'Contracts Locked (MTD)', value: '14 Contracts', change: '+28%', note: 'vs last month', icon: 'file' },
        { label: 'Closed & Funded (MTD)', value: '9 Deals', change: '+18%', note: 'closing velocity', icon: 'check' },
        { label: 'Wholesale Net Volume', value: '$248,500', change: '+32%', note: 'gross spreads', icon: 'badgeDollar' },
        { label: 'Avg Days to Close', value: '16.4 Days', change: '-2.1d', note: 'cycle reduction', icon: 'clock' }
      ],
      members: [
        {
          id: 'tm-001',
          name: 'Dejon Ellis',
          initials: 'DE',
          avatarBg: 'linear-gradient(135deg, #f5cf72, #b88a24)',
          title: 'Managing Partner & Head of Capital',
          department: 'Executive',
          accessLevel: 'Admin',
          territory: 'First Coast Institutional (Duval/Clay/St. Johns)',
          zipCodes: '32204, 32207, 32210, 32065',
          email: 'dejon@hushhawk.com',
          phone: '(904) 412-8821',
          dealsClosed: 24,
          productionVolume: 412000,
          closeRate: 84,
          avgSpread: 17166,
          commissionSplit: 'Principal Equity',
          status: 'Active',
          permissions: { signContracts: true, viewFinancials: true, blastBuyers: true, exportCsv: true }
        },
        {
          id: 'tm-002',
          name: 'Marcus Vance',
          initials: 'MV',
          avatarBg: 'linear-gradient(135deg, #38bdf8, #0369a1)',
          title: 'Director of Acquisitions',
          department: 'Acquisitions',
          accessLevel: 'Manager',
          territory: 'Duval Urban Core (Northside & Westside)',
          zipCodes: '32206, 32208, 32209, 32254',
          email: 'marcus.v@hushhawk.com',
          phone: '(904) 581-2290',
          dealsClosed: 18,
          productionVolume: 310500,
          closeRate: 72,
          avgSpread: 17250,
          commissionSplit: '18% Net Assignment Fee',
          status: 'Active',
          permissions: { signContracts: true, viewFinancials: true, blastBuyers: false, exportCsv: true }
        },
        {
          id: 'tm-003',
          name: 'Alicia Sterling',
          initials: 'AS',
          avatarBg: 'linear-gradient(135deg, #a855f7, #6b21a8)',
          title: 'VP of Dispositions & Investor Relations',
          department: 'Dispositions',
          accessLevel: 'Manager',
          territory: 'Tier 1 Cash Buyer Allocation (National/Local)',
          zipCodes: 'All First Coast Metro',
          email: 'alicia.s@hushhawk.com',
          phone: '(904) 392-7411',
          dealsClosed: 21,
          productionVolume: 368000,
          closeRate: 88,
          avgSpread: 17523,
          commissionSplit: '20% Net Assignment Fee',
          status: 'Active',
          permissions: { signContracts: true, viewFinancials: true, blastBuyers: true, exportCsv: true }
        },
        {
          id: 'tm-004',
          name: 'Cameron Bennett',
          initials: 'CB',
          avatarBg: 'linear-gradient(135deg, #22c55e, #15803d)',
          title: 'Inbound Lead Manager & Cold Call Captain',
          department: 'Lead Gen',
          accessLevel: 'Agent',
          territory: 'Duval Probate & Clay Tax Delinquents',
          zipCodes: '32210, 32244, 32073, 32065',
          email: 'cameron.b@hushhawk.com',
          phone: '(904) 639-4401',
          dealsClosed: 9,
          productionVolume: 142000,
          closeRate: 58,
          avgSpread: 15777,
          commissionSplit: '$1,200 per Locked PSA',
          status: 'In Field',
          permissions: { signContracts: false, viewFinancials: false, blastBuyers: false, exportCsv: false }
        },
        {
          id: 'tm-005',
          name: 'Elena Rostova',
          initials: 'ER',
          avatarBg: 'linear-gradient(135deg, #f43f5e, #9f1239)',
          title: 'Senior Transaction Coordinator & Escrow Lead',
          department: 'Operations',
          accessLevel: 'Manager',
          territory: 'Title Escrow Liaison (First American / Landmark)',
          zipCodes: 'Jacksonville Escrow Desk',
          email: 'elena.r@hushhawk.com',
          phone: '(904) 714-9923',
          dealsClosed: 31,
          productionVolume: 520000,
          closeRate: 94,
          avgSpread: 16774,
          commissionSplit: 'Base + $500 per Closed File',
          status: 'Active',
          permissions: { signContracts: true, viewFinancials: true, blastBuyers: false, exportCsv: true }
        },
        {
          id: 'tm-006',
          name: 'Derrick Ward',
          initials: 'DW',
          avatarBg: 'linear-gradient(135deg, #eab308, #854d0e)',
          title: 'Acquisitions Specialist (Westside)',
          department: 'Acquisitions',
          accessLevel: 'Agent',
          territory: 'Clay County & West Duval',
          zipCodes: '32220, 32221, 32234, 32068',
          email: 'derrick.w@hushhawk.com',
          phone: '(904) 509-3382',
          dealsClosed: 11,
          productionVolume: 176000,
          closeRate: 64,
          avgSpread: 16000,
          commissionSplit: '15% Net Assignment Fee',
          status: 'In Field',
          permissions: { signContracts: true, viewFinancials: false, blastBuyers: false, exportCsv: false }
        },
        {
          id: 'tm-007',
          name: 'Tyler Brooks',
          initials: 'TB',
          avatarBg: 'linear-gradient(135deg, #06b6d4, #0e7490)',
          title: 'Lead Underwriter & Comp Specialist',
          department: 'Underwriting',
          accessLevel: 'Agent',
          territory: 'Desk Valuation & MAO Calculation',
          zipCodes: 'Jacksonville Wholesale Desk',
          email: 'tyler.b@hushhawk.com',
          phone: '(904) 832-1109',
          dealsClosed: 16,
          productionVolume: 272000,
          closeRate: 78,
          avgSpread: 17000,
          commissionSplit: 'Base Salary + Desk Bonus',
          status: 'Active',
          permissions: { signContracts: false, viewFinancials: true, blastBuyers: false, exportCsv: true }
        },
        {
          id: 'tm-008',
          name: 'Brittany Hayes',
          initials: 'BH',
          avatarBg: 'linear-gradient(135deg, #ec4899, #be185d)',
          title: 'Buyer Relations & Showing Coordinator',
          department: 'Dispositions',
          accessLevel: 'Agent',
          territory: 'Buyer Walkthroughs & Lockbox Dispatch',
          zipCodes: '32205, 32207, 32211, 32216',
          email: 'brittany.h@hushhawk.com',
          phone: '(904) 279-8804',
          dealsClosed: 13,
          productionVolume: 214000,
          closeRate: 69,
          avgSpread: 16461,
          commissionSplit: '12% Net Assignment Fee',
          status: 'Offline',
          permissions: { signContracts: false, viewFinancials: false, blastBuyers: true, exportCsv: false }
        }
      ],
      newMember: {
        name: '',
        title: '',
        email: '',
        phone: '',
        department: 'Acquisitions',
        accessLevel: 'Agent',
        territory: '',
        zipCodes: '',
        commissionSplit: '15% Net Assignment Fee'
      }
    };
  },
  computed: {
    filteredMembers() {
      const q = this.searchQuery.toLowerCase().trim();
      return this.members
        .filter(m => {
          const matchQuery =
            !q ||
            m.name.toLowerCase().includes(q) ||
            m.title.toLowerCase().includes(q) ||
            m.department.toLowerCase().includes(q) ||
            m.territory.toLowerCase().includes(q) ||
            m.email.toLowerCase().includes(q) ||
            m.phone.includes(q);
          const matchDept = !this.departmentFilter || m.department === this.departmentFilter;
          const matchStatus = !this.statusFilter || m.status === this.statusFilter;
          return matchQuery && matchDept && matchStatus;
        })
        .sort((a, b) => {
          if (this.sortBy === 'name') return a.name.localeCompare(b.name);
          if (this.sortBy === 'closed') return b.dealsClosed - a.dealsClosed;
          if (this.sortBy === 'volume') return b.productionVolume - a.productionVolume;
          if (this.sortBy === 'role') return a.department.localeCompare(b.department);
          return 0;
        });
    }
  },
  mounted() {
    if (this.members.length > 0) {
      this.selectedMember = this.members[0];
    }
  },
  methods: {
    selectMember(member) {
      this.selectedMember = member;
    },
    formatCurrency(val) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    },
    getDepartmentClass(dept) {
      const map = {
        'Executive': 'gold',
        'Acquisitions': 'cyan',
        'Dispositions': 'purple',
        'Lead Gen': 'green',
        'Operations': 'rose',
        'Underwriting': 'teal'
      };
      return map[dept] || 'cyan';
    },
    getStatusClass(status) {
      if (status === 'Active') return 'active';
      if (status === 'In Field') return 'field';
      return 'offline';
    },
    resetFilters() {
      this.searchQuery = '';
      this.departmentFilter = '';
      this.statusFilter = '';
      this.sortBy = 'volume';
    },
    openModal(type) {
      this.activeModal = type;
    },
    openEditModal(member) {
      this.editingMember = JSON.parse(JSON.stringify(member));
      this.activeModal = 'edit';
    },
    closeModal() {
      this.activeModal = null;
      this.editingMember = null;
    },
    submitInvite() {
      const initials = this.newMember.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      const member = {
        id: 'tm-' + String(this.members.length + 1).padStart(3, '0'),
        name: this.newMember.name,
        initials,
        avatarBg: 'linear-gradient(135deg, #38bdf8, #0369a1)',
        title: this.newMember.title,
        department: this.newMember.department,
        accessLevel: this.newMember.accessLevel,
        territory: this.newMember.territory || 'Duval County',
        zipCodes: this.newMember.zipCodes || 'Metro Jacksonville',
        email: this.newMember.email,
        phone: this.newMember.phone,
        dealsClosed: 0,
        productionVolume: 0,
        closeRate: 0,
        avgSpread: 0,
        commissionSplit: this.newMember.commissionSplit,
        status: 'Active',
        permissions: {
          signContracts: this.newMember.accessLevel === 'Admin' || this.newMember.accessLevel === 'Manager',
          viewFinancials: this.newMember.accessLevel === 'Admin',
          blastBuyers: this.newMember.department === 'Dispositions',
          exportCsv: this.newMember.accessLevel === 'Admin'
        }
      };
      this.members.unshift(member);
      this.selectedMember = member;
      this.closeModal();
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Team Member Added', `${member.name} onboarded to ${member.department} department.`, 'success');
      }
      this.newMember = {
        name: '',
        title: '',
        email: '',
        phone: '',
        department: 'Acquisitions',
        accessLevel: 'Agent',
        territory: '',
        zipCodes: '',
        commissionSplit: '15% Net Assignment Fee'
      };
    },
    savePermissions() {
      if (!this.editingMember) return;
      const idx = this.members.findIndex(m => m.id === this.editingMember.id);
      if (idx !== -1) {
        this.members[idx] = { ...this.editingMember };
        if (this.selectedMember?.id === this.editingMember.id) {
          this.selectedMember = { ...this.editingMember };
        }
      }
      const memberName = this.editingMember.name;
      this.closeModal();
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Permissions Updated', `Access credentials updated for ${memberName}.`, 'success');
      }
    },
    toggleStatus(member) {
      member.status = member.status === 'Active' ? 'Offline' : 'Active';
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Status Changed', `${member.name} marked as ${member.status}.`, 'info');
      }
    },
    exportRoster() {
      const headers = ['ID', 'Name', 'Title', 'Department', 'Access', 'Email', 'Phone', 'Territory', 'Deals Closed', 'Volume', 'Status'];
      const rows = this.filteredMembers.map(m => [
        m.id,
        m.name,
        m.title,
        m.department,
        m.accessLevel,
        m.email,
        m.phone,
        m.territory,
        m.dealsClosed,
        m.productionVolume,
        m.status
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hushhawk_team_roster_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Roster Exported', `Generated roster CSV for ${this.filteredMembers.length} team members.`, 'success');
      }
    }
  }
};
</script>

<style scoped>
.view-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

/* Metrics Bar */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(8, 28, 54, 0.95), rgba(4, 21, 41, 0.98));
  border: 1px solid #1a3c63;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.metric-card:hover {
  transform: translateY(-1px);
  border-color: #38bdf8;
}

.metric-icon-wrap {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(30, 58, 95, 0.5);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  flex-shrink: 0;
}

.metric-icon-wrap.gold {
  color: #edcf7c;
  border-color: rgba(237, 207, 124, 0.3);
  background: rgba(70, 50, 15, 0.4);
}

.metric-icon-wrap.green {
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(15, 55, 30, 0.4);
}

.metric-icon-wrap.cyan {
  color: #06b6d4;
  border-color: rgba(6, 182, 212, 0.3);
  background: rgba(10, 45, 60, 0.4);
}

.metric-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.metric-label {
  font-size: 11px;
  font-weight: 600;
  color: #8da6c4;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-val {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
}

.metric-change {
  font-size: 10px;
  color: #94a3b8;
  margin-top: 2px;
}

.metric-change.positive {
  color: #22c55e;
}

.metric-change em {
  font-style: normal;
  color: #64748b;
}

/* Content Layout */
.content-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.content-split.has-drawer {
  grid-template-columns: minmax(0, 1fr) 350px;
}

.main-panel {
  background: linear-gradient(135deg, rgba(8, 28, 54, 0.95), rgba(4, 21, 41, 0.98));
  border: 1px solid #1a3c63;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #1a3c63;
  background: rgba(10, 34, 64, 0.5);
  flex-wrap: wrap;
  gap: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-title {
  color: #edcf7c;
  display: inline-flex;
}

.badge-count {
  font-size: 11px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 12px;
  padding: 2px 8px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
}

.btn-primary {
  background: linear-gradient(135deg, #edcf7c, #b3892c);
  color: #07172b;
  border-color: #f5df9a;
}

.btn-primary:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-secondary {
  background: #0d2747;
  color: #cbd5e1;
  border-color: #244b78;
}

.btn-secondary:hover {
  background: #153863;
  color: #ffffff;
}

.btn-icon {
  background: transparent;
  border: 1px solid #244b78;
  color: #94a3b8;
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon:hover {
  color: #edcf7c;
  border-color: #edcf7c;
  background: rgba(237, 207, 124, 0.1);
}

/* Filter Toolbar */
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: rgba(6, 22, 42, 0.6);
  border-bottom: 1px solid #1a3c63;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
  background: #09213f;
  border: 1px solid #244b78;
  border-radius: 6px;
  padding: 6px 10px;
  color: #94a3b8;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 12px;
  width: 100%;
}

.search-box input::placeholder {
  color: #64748b;
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
  gap: 6px;
}

.filter-group label {
  font-size: 11px;
  color: #8da6c4;
  white-space: nowrap;
}

.filter-group select {
  background: #09213f;
  border: 1px solid #244b78;
  color: #cbd5e1;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  outline: none;
}

/* Table */
.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.data-table th {
  text-align: left;
  padding: 10px 14px;
  font-weight: 700;
  color: #8da6c4;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(8, 28, 54, 0.8);
  border-bottom: 1px solid #1a3c63;
  white-space: nowrap;
}

.data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid #122c4a;
  color: #e2e8f0;
  vertical-align: middle;
}

.data-table tbody tr {
  cursor: pointer;
  transition: background 0.15s ease;
}

.data-table tbody tr:hover {
  background: rgba(30, 58, 95, 0.35);
}

.data-table tbody tr.row-selected {
  background: rgba(30, 58, 95, 0.6);
  border-left: 3px solid #edcf7c;
}

/* Member Elements */
.member-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
}

.avatar-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 13px;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.member-meta {
  display: flex;
  flex-direction: column;
}

.member-meta strong {
  font-size: 13px;
  color: #ffffff;
}

.member-meta small {
  font-size: 10px;
  color: #94a3b8;
}

.role-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 12px;
  white-space: nowrap;
  display: inline-block;
}

.role-pill.gold {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
  border: 1px solid rgba(237, 207, 124, 0.3);
}

.role-pill.cyan {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
}

.role-pill.purple {
  background: rgba(168, 85, 247, 0.15);
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
}

.role-pill.green {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.role-pill.rose {
  background: rgba(244, 63, 94, 0.15);
  color: #f43f5e;
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.role-pill.teal {
  background: rgba(20, 184, 166, 0.15);
  color: #14b8a6;
  border: 1px solid rgba(20, 184, 166, 0.3);
}

.territory-tag {
  font-size: 11px;
  color: #93c5fd;
  background: rgba(15, 38, 70, 0.6);
  padding: 3px 6px;
  border-radius: 4px;
  border: 1px solid #1a3c63;
}

.contact-cell {
  font-size: 11px;
  color: #cbd5e1;
}

.contact-cell div {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 2px;
}

.mini-icon {
  color: #64748b;
  display: inline-flex;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.status-indicator.active .status-dot {
  background: #22c55e;
  box-shadow: 0 0 6px #22c55e;
}

.status-indicator.field .status-dot {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b;
}

.status-indicator.offline .status-dot {
  background: #64748b;
}

.actions-col {
  text-align: right;
  white-space: nowrap;
}

/* Detail Drawer */
.detail-drawer {
  background: linear-gradient(135deg, rgba(8, 28, 54, 0.98), rgba(4, 21, 41, 0.99));
  border: 1px solid #1a3c63;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #1a3c63;
  background: rgba(10, 34, 64, 0.5);
}

.drawer-badge {
  font-size: 10px;
  font-weight: 700;
  color: #edcf7c;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 4px;
}

.drawer-title h3 {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.drawer-title small {
  font-size: 11px;
  color: #94a3b8;
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: grid;
  place-items: center;
  transition: color 0.15s ease;
}

.close-btn:hover {
  color: #ffffff;
}

.drawer-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 240px);
}

.member-profile-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(14, 38, 70, 0.4);
  border: 1px solid #1a3c63;
  border-radius: 8px;
  padding: 12px;
}

.profile-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  flex-shrink: 0;
}

.profile-details strong {
  font-size: 15px;
  color: #ffffff;
  display: block;
}

.profile-details p {
  font-size: 11px;
  color: #94a3b8;
  margin: 2px 0;
}

.profile-badges {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.badge-tag {
  font-size: 9px;
  font-weight: 700;
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
  border: 1px solid rgba(237, 207, 124, 0.3);
  border-radius: 4px;
  padding: 2px 6px;
}

.badge-tag.cyan {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.3);
}

.section-card {
  background: rgba(10, 30, 56, 0.5);
  border: 1px solid #1a3c63;
  border-radius: 8px;
  padding: 12px;
}

.section-card h4 {
  font-size: 12px;
  font-weight: 700;
  color: #8da6c4;
  margin: 0 0 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.kpi-box {
  background: rgba(6, 22, 42, 0.7);
  border: 1px solid #1e3a5f;
  border-radius: 6px;
  padding: 8px 10px;
}

.kpi-label {
  font-size: 10px;
  color: #94a3b8;
  display: block;
}

.kpi-box strong {
  font-size: 16px;
  color: #ffffff;
  margin-top: 2px;
  display: block;
}

.territory-box p {
  font-size: 11px;
  color: #cbd5e1;
  margin: 6px 0;
}

.permission-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-list li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #64748b;
}

.permission-list li.enabled {
  color: #e2e8f0;
}

.perm-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
}

.permission-list li.enabled .perm-icon {
  color: #22c55e;
}

.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 8, 16, 0.85);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 16px;
  backdrop-filter: blur(4px);
}

.modal-dialog {
  background: #081c34;
  border: 1px solid #244b78;
  border-radius: 10px;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px;
  background: #0c2442;
  border-bottom: 1px solid #1a3c63;
}

.modal-badge {
  font-size: 10px;
  font-weight: 700;
  color: #edcf7c;
  text-transform: uppercase;
}

.modal-title-group h3 {
  margin: 4px 0 0;
  font-size: 16px;
  color: #ffffff;
  font-weight: 800;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 80vh;
  overflow-y: auto;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 11px;
  font-weight: 600;
  color: #8da6c4;
}

.form-group input,
.form-group select {
  background: #06192d;
  border: 1px solid #1e4570;
  color: #ffffff;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #edcf7c;
}

.perm-checks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: #051528;
  border: 1px solid #1a3c63;
  border-radius: 6px;
  padding: 12px;
}

.checkbox-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.checkbox-row input {
  margin-top: 3px;
  accent-color: #edcf7c;
}

.checkbox-row strong {
  display: block;
  font-size: 12px;
  color: #ffffff;
}

.checkbox-row small {
  display: block;
  font-size: 10px;
  color: #8da6c4;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid #1a3c63;
}

.empty-state {
  text-align: center;
  padding: 40px !important;
}

.empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #8da6c4;
}

.empty-icon {
  font-size: 28px;
  color: #64748b;
}

/* Helpers */
.text-gold {
  color: #edcf7c;
}

.text-green {
  color: #22c55e;
}

.text-cyan {
  color: #38bdf8;
}

.font-mono {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}

@media (max-width: 1280px) {
  .content-split.has-drawer {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
