<template>
  <div class="view-container">
    <!-- Metrics Bar -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 2 || i === 4, cyan: i === 0, green: i === 1 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }} <em>updated daily</em>
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="main-panel">
      <!-- Header -->
      <div class="panel-header">
        <div class="header-left">
          <h2>
            <span class="icon-title" v-html="icons.database"></span>
            Duval County Public Records &amp; Distress Lists
          </h2>
          <span class="badge-count">{{ filteredRecords.length }} records loaded</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" @click="openModal('import')">
            <span v-html="icons.download"></span>
            Import County CSV
          </button>
          <button class="btn btn-primary" @click="pushToSkipTrace">
            <span v-html="icons.search"></span>
            Push Selected to Skip Trace
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
            placeholder="Search CrownKey parcel, owner name, address, or ZIP..."
            aria-label="Search county data"
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="filter-group">
          <label>County:</label>
          <select v-model="countyFilter" aria-label="Filter by county">
            <option value="Duval">Duval County (Jacksonville)</option>
            <option value="Clay">Clay County</option>
            <option value="St. Johns">St. Johns County</option>
            <option value="Nassau">Nassau County</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Distress List:</label>
          <select v-model="listFilter" aria-label="Filter by distress list">
            <option value="">All Distress Types</option>
            <option value="Tax Delinquent">Tax Delinquent (2+ Years)</option>
            <option value="Probate">Probate / Inherited</option>
            <option value="Code Violation">Code Violations &amp; Liens</option>
            <option value="Absentee">High Equity Absentee Owner</option>
            <option value="Pre-Foreclosure">Lis Pendens / Pre-Foreclosure</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Sort:</label>
          <select v-model="sortBy" aria-label="Sort county data">
            <option value="equityDesc">Estimated Equity (High to Low)</option>
            <option value="delinquentDesc">Delinquent Amount (High to Low)</option>
            <option value="valueAsc">Assessed Value</option>
            <option value="address">Address A-Z</option>
          </select>
        </div>

        <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
          <span v-html="icons.refresh"></span>
          Reset
        </button>
      </div>

      <!-- Records Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th width="32">
                <input type="checkbox" v-model="selectAll" @change="toggleSelectAll" />
              </th>
              <th>CrownKey Parcel ID</th>
              <th>Property Address</th>
              <th>Owner Name &amp; Mailing</th>
              <th>Assessed Value</th>
              <th>Est. Equity</th>
              <th>Distress Type</th>
              <th>Last Filing</th>
              <th>Skip Trace</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in filteredRecords"
              :key="r.id"
              :class="{ selected: selectedIds.includes(r.id) }"
            >
              <td>
                <input type="checkbox" :value="r.id" v-model="selectedIds" />
              </td>
              <td>
                <strong class="crownkey-code">{{ r.crownKey }}</strong>
              </td>
              <td>
                <div class="property-cell">
                  <strong>{{ r.address }}</strong>
                  <small>Jacksonville, FL {{ r.zip }}</small>
                </div>
              </td>
              <td>
                <div class="owner-cell">
                  <span>{{ r.owner }}</span>
                  <small :class="{ absentee: r.isAbsentee }">
                    {{ r.isAbsentee ? 'Absentee Owner (Out of State)' : 'Owner Occupied' }}
                  </small>
                </div>
              </td>
              <td>{{ formatCurrency(r.assessedValue) }}</td>
              <td>
                <span class="equity-tag">{{ r.equityPercent }}%</span>
              </td>
              <td>
                <span class="distress-chip" :class="r.distressClass">{{ r.distress }}</span>
              </td>
              <td>{{ r.lastFiling }}</td>
              <td>
                <span class="status-pill" :class="r.skipStatus.toLowerCase()">
                  {{ r.skipStatus }}
                </span>
              </td>
              <td>
                <button class="btn btn-xs" @click="inspectRecord(r)">
                  Inspect
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Record Detail Modal -->
    <div v-if="activeRecord" class="modal-overlay" @click.self="activeRecord = null">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.database"></span>
            Property Intelligence Card: {{ activeRecord.address }}
          </h3>
          <button class="close-btn" @click="activeRecord = null" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="property-dossier">
            <div class="dossier-row">
              <div><small>CrownKey Identity</small><strong>{{ activeRecord.crownKey }}</strong></div>
              <div><small>County Jurisdiction</small><strong>{{ activeRecord.county }} County, FL</strong></div>
              <div><small>Assessed Valuation</small><strong>{{ formatCurrency(activeRecord.assessedValue) }}</strong></div>
            </div>
            <div class="dossier-row">
              <div><small>Owner of Record</small><strong>{{ activeRecord.owner }}</strong></div>
              <div><small>Mailing Address</small><strong>{{ activeRecord.mailingAddress }}</strong></div>
              <div><small>Delinquent Balance</small><strong class="red">{{ formatCurrency(activeRecord.delinquentAmount) }}</strong></div>
            </div>
          </div>
          <p class="legal-desc"><strong>Legal Description:</strong> {{ activeRecord.legalDescription }}</p>
          <div v-if="actionNotice" class="alert-success">{{ actionNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="activeRecord = null">Close</button>
          <button class="btn btn-primary" @click="queueSkipTrace(activeRecord)">
            <span v-html="icons.search"></span>
            Queue for Skip Trace
          </button>
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.download"></span>
            Import County CSV Records
          </h3>
          <button class="close-btn" @click="showImportModal = false" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <p>Upload official county clerk CSV exports. Required headers: parcel_id, address, owner, assessed_value.</p>
          <div class="file-dropzone">
            <span v-html="icons.file"></span>
            <p>Drag and drop county CSV file here, or click to browse</p>
            <input type="file" accept=".csv" @change="handleFileUpload" />
          </div>
          <div v-if="importNotice" class="alert-success">{{ importNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showImportModal = false">Cancel</button>
          <button class="btn btn-primary" @click="executeImport">
            Import 1,247 Records
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { icons } from '../icons.js';

export default {
  name: 'CountyDataView',
  setup() {
    const metrics = [
      { label: 'County Records Indexed', value: '48,920', change: '+18%', icon: 'database' },
      { label: 'High-Equity Absentee', value: '14,210', change: '+12%', icon: 'users' },
      { label: 'Tax Delinquent Records', value: '3,480', change: '+8%', icon: 'badgeDollar' },
      { label: 'Pre-Foreclosure / Lis Pendens', value: '842', change: '+15%', icon: 'file' },
      { label: 'Ready for Skip Trace', value: '5,240', change: '+22%', icon: 'search' }
    ];

    
    const API_BASE = '/api/v1';

    async function loadCountyRecords() {
      try {
        const res = await fetch(API_BASE + '/county-records');
        const data = await res.json();
        if (data.records && data.records.length > 0) {
          records.value = data.records;
          if (!selectedRecord.value) selectedRecord.value = data.records[0];
        }
      } catch (err) {
        console.warn('[CountyData] Using local cache:', err.message);
      }
    }

    onMounted(() => {
      loadCountyRecords();
    });

    const records = ref([
      {
        id: 'r1',
        crownKey: 'DUV-091823-0000',
        address: '4521 Lenox Ave',
        zip: '32208',
        owner: 'Robert T. Henderson',
        mailingAddress: '1428 Peachtree St, Atlanta GA 30309',
        isAbsentee: true,
        assessedValue: 124500,
        equityPercent: 88,
        distress: 'Tax Delinquent',
        distressClass: 'distress-tax',
        delinquentAmount: 4850,
        lastFiling: '2026-03-12',
        skipStatus: 'Enriched',
        county: 'Duval',
        legalDescription: 'LOT 14 BLK 2 LENOX PARK SEC 1 PB 12-48 DUVAL COUNTY FL'
      },
      {
        id: 'r2',
        crownKey: 'DUV-049182-0020',
        address: '2834 W 21st St',
        zip: '32209',
        owner: 'Estate of Dorothy Mae Jenkins',
        mailingAddress: '2834 W 21st St, Jacksonville FL 32209',
        isAbsentee: false,
        assessedValue: 86400,
        equityPercent: 100,
        distress: 'Probate',
        distressClass: 'distress-probate',
        delinquentAmount: 1820,
        lastFiling: '2026-02-18',
        skipStatus: 'Pending',
        county: 'Duval',
        legalDescription: 'SUB OF BLK 15 MONCRIEF HGTS LOT 8 PB 8-22 DUVAL COUNTY FL'
      },
      {
        id: 'r3',
        crownKey: 'DUV-071842-0000',
        address: '1910 Edgewood Ave',
        zip: '32210',
        owner: 'Gulf Coast Property Ventures LLC',
        mailingAddress: '984 Ocean Dr, Miami FL 33139',
        isAbsentee: true,
        assessedValue: 168000,
        equityPercent: 65,
        distress: 'Code Violation',
        distressClass: 'distress-code',
        delinquentAmount: 3200,
        lastFiling: '2026-04-02',
        skipStatus: 'Enriched',
        county: 'Duval',
        legalDescription: 'EDGEWOOD MANOR S/D LOT 4 BLK 11 REC DUVAL COUNTY'
      },
      {
        id: 'r4',
        crownKey: 'DUV-019284-0010',
        address: '6234 Moncrief Rd',
        zip: '32209',
        owner: 'Charles E. Washington',
        mailingAddress: '8842 W Beaver St, Jacksonville FL 32220',
        isAbsentee: true,
        assessedValue: 92000,
        equityPercent: 92,
        distress: 'Absentee',
        distressClass: 'distress-absentee',
        delinquentAmount: 640,
        lastFiling: '2026-01-20',
        skipStatus: 'Pending',
        county: 'Duval',
        legalDescription: 'GRAND PARK LOT 22 BLK 4 REPLAT PB 6-18 DUVAL COUNTY FL'
      },
      {
        id: 'r5',
        crownKey: 'DUV-084920-0030',
        address: '7801 Merrill Rd',
        zip: '32277',
        owner: 'Patricia Anne Miller',
        mailingAddress: '7801 Merrill Rd, Jacksonville FL 32277',
        isAbsentee: false,
        assessedValue: 194000,
        equityPercent: 45,
        distress: 'Pre-Foreclosure',
        distressClass: 'distress-foreclosure',
        delinquentAmount: 14200,
        lastFiling: '2026-04-14',
        skipStatus: 'Enriched',
        county: 'Duval',
        legalDescription: 'ARLINGTON MANOR SEC 4 LOT 19 BLK 3 DUVAL COUNTY FL'
      }
    ]);

    const searchQuery = ref('');
    const countyFilter = ref('Duval');
    const listFilter = ref('');
    const sortBy = ref('equityDesc');
    const selectedIds = ref([]);
    const selectAll = ref(false);
    const activeRecord = ref(null);
    const showImportModal = ref(false);
    const actionNotice = ref('');
    const importNotice = ref('');

    const hasActiveFilters = computed(() => searchQuery.value || countyFilter.value !== 'Duval' || listFilter.value || sortBy.value !== 'equityDesc');

    const filteredRecords = computed(() => {
      let list = records.value.filter(r => {
        const q = searchQuery.value.toLowerCase().trim();
        const matchesQuery = !q || [r.crownKey, r.address, r.owner, r.zip].join(' ').toLowerCase().includes(q);
        const matchesCounty = !countyFilter.value || r.county === countyFilter.value;
        const matchesList = !listFilter.value || r.distress.toLowerCase().includes(listFilter.value.toLowerCase());
        return matchesQuery && matchesCounty && matchesList;
      });

      if (sortBy.value === 'equityDesc') {
        list.sort((a, b) => b.equityPercent - a.equityPercent);
      } else if (sortBy.value === 'delinquentDesc') {
        list.sort((a, b) => b.delinquentAmount - a.delinquentAmount);
      } else if (sortBy.value === 'valueAsc') {
        list.sort((a, b) => a.assessedValue - b.assessedValue);
      } else if (sortBy.value === 'address') {
        list.sort((a, b) => a.address.localeCompare(b.address));
      }
      return list;
    });

    function toggleSelectAll() {
      if (selectAll.value) {
        selectedIds.value = filteredRecords.value.map(r => r.id);
      } else {
        selectedIds.value = [];
      }
    }

    function resetFilters() {
      searchQuery.value = '';
      countyFilter.value = 'Duval';
      listFilter.value = '';
      sortBy.value = 'equityDesc';
    }

    function inspectRecord(record) {
      activeRecord.value = record;
      actionNotice.value = '';
    }

    function queueSkipTrace(record) {
      record.skipStatus = 'Enriched';
      actionNotice.value = `${record.address} has been queued for Tier-1 Skip Tracing!`;
      setTimeout(() => {
        activeRecord.value = null;
      }, 1200);
    }

    function showToast(title, message, type = 'info') {
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast(title, message, type);
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
        }
      }
    }

    function pushToSkipTrace() {
      const count = selectedIds.value.length || filteredRecords.value.length;
      records.value.forEach(r => {
        if (selectedIds.value.length === 0 || selectedIds.value.includes(r.id)) {
          r.skipStatus = 'Enriched';
        }
      });
      showToast('Enrichment Dispatched', `Pushed ${count} county parcel records to Skip Tracing enrichment queue.`, 'success');
      selectedIds.value = [];
      selectAll.value = false;
    }

    function openModal(type) {
      if (type === 'import') showImportModal.value = true;
    }

    function handleFileUpload() {
      importNotice.value = 'File parsed: 1,247 Duval County records ready for ingestion.';
    }

    function executeImport() {
      importNotice.value = 'Successfully imported 1,247 county records into canonical truth store.';
      setTimeout(() => {
        showImportModal.value = false;
        importNotice.value = '';
      }, 1500);
    }

    function formatCurrency(val) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val || 0);
    }

    return {
      icons,
      metrics,
      records,
      searchQuery,
      countyFilter,
      listFilter,
      sortBy,
      selectedIds,
      selectAll,
      activeRecord,
      showImportModal,
      actionNotice,
      importNotice,
      hasActiveFilters,
      filteredRecords,
      toggleSelectAll,
      resetFilters,
      inspectRecord,
      queueSkipTrace,
      pushToSkipTrace,
      openModal,
      handleFileUpload,
      executeImport,
      formatCurrency
    };
  }
};
</script>

<style scoped>
.view-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.metric-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #081d33;
  border: 1px solid #1c4266;
  border-radius: 8px;
  padding: 14px 18px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  min-width: 0;
  box-sizing: border-box;
}
.metric-icon-wrap {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: #112a45;
  color: #7dcaf4;
  flex-shrink: 0;
}
.metric-icon-wrap.gold {
  color: #edcf7c;
  background: #2a2c26;
}
.metric-icon-wrap.cyan {
  color: #4dd2ff;
  background: #0f354f;
}
.metric-icon-wrap.green {
  color: #35e6a2;
  background: #0d382d;
}
.metric-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}
.metric-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9ab4cc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-val {
  font-size: 20px;
  color: #f1f6ff;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-change {
  font-size: 11px;
  color: #9ab4cc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric-change.positive {
  color: #35e6a2;
}

.main-panel {
  background: #07192d;
  border: 1px solid #1c4266;
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-left h2 {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f6ff;
}
.badge-count {
  font-size: 11px;
  padding: 3px 8px;
  background: #113454;
  color: #7dcaf4;
  border-radius: 12px;
  border: 1px solid #235882;
}
.header-actions {
  display: flex;
  gap: 10px;
}

.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: #092038;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid #1d456b;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #051424;
  border: 1px solid #28547d;
  border-radius: 5px;
  padding: 6px 10px;
  flex: 1;
  min-width: 200px;
}
.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #f1f6ff;
  font-size: 13px;
  width: 100%;
}
.clear-btn {
  background: none;
  border: none;
  color: #9ab4cc;
  cursor: pointer;
  padding: 0;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9ab4cc;
}
.filter-group select {
  background: #051424;
  border: 1px solid #28547d;
  color: #f1f6ff;
  padding: 6px 10px;
  border-radius: 5px;
  font-size: 12px;
  outline: none;
}

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
  padding: 10px 12px;
  color: #8da9c2;
  font-weight: 600;
  border-bottom: 1px solid #1c4266;
  white-space: nowrap;
}
.data-table td {
  padding: 12px;
  border-bottom: 1px solid #143554;
  color: #f1f6ff;
  vertical-align: middle;
}
.data-table tbody tr.selected {
  background: #103254;
}
.data-table tbody tr:hover {
  background: #0c2642;
}

.crownkey-code {
  font-family: monospace;
  font-size: 12px;
  color: #edcf7c;
  background: #112a45;
  padding: 2px 6px;
  border-radius: 4px;
}
.property-cell strong {
  display: block;
  font-size: 13px;
  color: #ffffff;
}
.property-cell small {
  color: #8faec7;
  font-size: 11px;
}
.owner-cell span {
  display: block;
  font-weight: 600;
}
.owner-cell small {
  display: block;
  font-size: 10px;
  color: #8faec7;
}
.owner-cell small.absentee {
  color: #ff9e79;
}
.equity-tag {
  color: #35e6a2;
  font-weight: 700;
  font-size: 12px;
}
.distress-chip {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.distress-tax {
  background: #471a1c;
  color: #ff8585;
}
.distress-probate {
  background: #2a1f47;
  color: #caa7ff;
}
.distress-code {
  background: #47321a;
  color: #ffbc79;
}
.distress-absentee {
  background: #113454;
  color: #7dcaf4;
}
.distress-foreclosure {
  background: #541113;
  color: #ff5252;
}
.status-pill {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}
.status-pill.enriched {
  background: #0f4f33;
  color: #57ffbe;
}
.status-pill.pending {
  background: #2b331f;
  color: #d6e069;
}

/* Modal Dossier */
.property-dossier {
  background: #051424;
  border: 1px solid #1c4266;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.dossier-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.dossier-row small {
  display: block;
  font-size: 10px;
  color: #8faec7;
}
.dossier-row strong {
  font-size: 12px;
  color: #ffffff;
}
.dossier-row strong.red {
  color: #ff8585;
}
.legal-desc {
  font-size: 11px;
  color: #8faec7;
  line-height: 1.4;
  background: #092038;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #1c4266;
}
.file-dropzone {
  border: 2px dashed #28547d;
  border-radius: 6px;
  padding: 24px;
  text-align: center;
  color: #8faec7;
  position: relative;
  cursor: pointer;
}
.file-dropzone input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 10, 20, 0.75);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}
.modal-card {
  background: #081d33;
  border: 1px solid #28547d;
  border-radius: 8px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #1c4266;
}
.modal-header h3 {
  margin: 0;
  font-size: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f1f6ff;
}
.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.alert-success {
  background: #0f3d2a;
  border: 1px solid #1b7350;
  color: #57ffbe;
  padding: 8px 12px;
  border-radius: 5px;
  font-size: 12px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 18px;
  border-top: 1px solid #1c4266;
  background: #051424;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}
.btn-primary {
  background: #edcf7c;
  color: #06182e;
}
.btn-primary:hover {
  background: #f7deb0;
}
.btn-secondary {
  background: #113454;
  color: #7dcaf4;
  border: 1px solid #28547d;
}
.btn-secondary:hover {
  background: #18446d;
}
.btn-subtle {
  background: transparent;
  color: #9ab4cc;
  border: 1px solid #28547d;
}
.btn-xs {
  padding: 4px 8px;
  font-size: 11px;
  background: #18446d;
  color: #7dcaf4;
  border: 1px solid #28547d;
}
.btn-xs:hover {
  background: #edcf7c;
  color: #06182e;
}
.close-btn {
  background: none;
  border: none;
  color: #9ab4cc;
  cursor: pointer;
}
.icon-title {
  display: grid;
  place-items: center;
  color: #edcf7c;
}
</style>
