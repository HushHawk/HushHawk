<template>
  <div class="view-container skip-tracing-view">
    <!-- Metrics Bar -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 3, cyan: i === 0, green: i === 1 || i === 2 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }} <em>enrichment rate</em>
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="content-split" :class="{ 'has-drawer': selectedTrace }">
      <div class="main-panel">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.search"></span>
              Skip Tracing &amp; Contact Intelligence
            </h2>
            <span class="badge-count">{{ filteredTraces.length }} records</span>
          </div>
          <div class="header-actions">
            <button class="btn btn-secondary" @click="openModal('batch')">
              <span v-html="icons.download"></span>
              Export queue for BatchLeads
            </button>
            <button class="btn btn-primary" @click="openModal('single')">
              <span v-html="icons.plus"></span>
              Single Skip Trace
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
              placeholder="Search owner name, phone, address, or email..."
              aria-label="Search skip traces"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="filter-group">
            <label>Match Quality:</label>
            <select v-model="qualityFilter" aria-label="Filter by match quality">
              <option value="">All Match Scores</option>
              <option value="high">High Confidence (90%+)</option>
              <option value="medium">Medium (75% - 89%)</option>
              <option value="review">Needs Review</option>
            </select>
          </div>

          <div class="filter-group">
            <label>DNC Status:</label>
            <select v-model="dncFilter" aria-label="Filter by DNC status">
              <option value="">All Numbers</option>
              <option value="clear">DNC Clean Only</option>
              <option value="scrubbed">DNC Flagged</option>
            </select>
          </div>

          <div class="filter-group">
            <label>Sort:</label>
            <select v-model="sortBy" aria-label="Sort skip traces">
              <option value="scoreDesc">Match Score (High to Low)</option>
              <option value="dateDesc">Recently Traced</option>
              <option value="nameAsc">Owner Name A-Z</option>
            </select>
          </div>

          <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
            <span v-html="icons.refresh"></span>
            Reset
          </button>
        </div>

        <!-- Traces Table -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Property Owner</th>
                <th>Subject Property Address</th>
                <th>Match Score</th>
                <th>Primary Mobile</th>
                <th>Alternate Number</th>
                <th>Verified Email</th>
                <th>Relatives</th>
                <th>DNC Compliance</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredTraces.length === 0">
                <td colspan="8" style="text-align: center; color: #64748b; padding: 36px;">
                  No skip traces yet. Export the queue for BatchLeads, or run a single search.
                </td>
              </tr>
              <tr
                v-for="t in filteredTraces"
                :key="t.id"
                :class="{ active: selectedTrace?.id === t.id }"
                @click="selectTrace(t)"
              >
                <td>
                  <div class="owner-cell">
                    <strong>{{ t.ownerName }}</strong>
                    <small>{{ t.source }}</small>
                  </div>
                </td>
                <td>
                  <div class="property-cell">
                    <span>{{ t.address }}</span>
                    <small>{{ t.zip }}</small>
                  </div>
                </td>
                <td>
                  <span class="score-badge" :class="t.score >= 90 ? 'score-high' : 'score-med'">
                    Unavailable
                  </span>
                </td>
                <td>
                  <div class="phone-cell">
                    <strong>{{ t.primaryPhone }}</strong>

                  </div>
                </td>
                <td>
                  <div class="phone-cell">
                    <span>{{ t.alternatePhone || '—' }}</span>
                    <small v-if="t.alternatePhone">Mobile 2</small>
                  </div>
                </td>
                <td>{{ t.email || '—' }}</td>
                <td>
                  <span class="relatives-count">
                    <span v-html="icons.users"></span>
                    {{ (t.relatives && t.relatives.length) || 0 }}
                  </span>
                </td>
                <td>
                  <span class="dnc-tag">

                    Unverified
                  </span>
                </td>
                <td @click.stop>
                  <div class="row-action-btns">
                    <button class="btn btn-xs btn-primary-subtle" @click="selectTrace(t)">
                      Details
                    </button>
                    <button class="btn btn-xs" :disabled="!t.primaryPhone" @click="openSmsModal(t)">
                      SMS
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Detail Drawer -->
      <aside v-if="selectedTrace" class="detail-drawer">
        <div class="drawer-header">
          <div>
            <h3>{{ selectedTrace.ownerName }}</h3>
            <p>Subject Property: {{ selectedTrace.address }}, Jacksonville FL {{ selectedTrace.zip }}</p>
          </div>
          <button class="close-btn" @click="selectedTrace = null" aria-label="Close details">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <!-- Confidence Strip -->
        <div class="confidence-strip">
          <div class="conf-item">
            <small>Match Confidence</small>
            <strong>Unavailable</strong>
          </div>
          <div class="conf-item">
            <small>TCPA Compliance</small>
            <strong>
              Unverified
            </strong>
          </div>
          <div class="conf-item">
            <small>Owner Age</small>
            <strong>Unavailable</strong>
          </div>
        </div>

        <!-- Confirmed Contact Trees -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.phone"></span>
            <h4>Phone Numbers Identified</h4>
          </div>
          <div class="phone-list">
            <div class="phone-row">
              <div>
                <strong>{{ selectedTrace.primaryPhone }}</strong>

              </div>
              <button class="btn btn-xs btn-primary" :disabled="!selectedTrace.primaryPhone" @click="quickDial(selectedTrace.primaryPhone)">Call</button>
            </div>
            <div v-if="selectedTrace.alternatePhone" class="phone-row">
              <div>
                <strong>{{ selectedTrace.alternatePhone }}</strong>

              </div>
              <button class="btn btn-xs btn-secondary" @click="quickDial(selectedTrace.alternatePhone)">Call</button>
            </div>
          </div>
        </div>

        <!-- Relative Trees -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.users"></span>
            <h4>Known Relatives &amp; Kinship Tree</h4>
          </div>
          <div class="relatives-list">
            <div v-for="r in (selectedTrace.relatives || [])" :key="r.name" class="relative-card">
              <div>
                <strong>{{ r.name }} ({{ r.relationship || r.relation || 'Relative' }})</strong>
                <small>{{ r.phone }}</small>
              </div>
              <button class="btn btn-xs" @click="quickDial(r.phone)">Call Kin</button>
            </div>
            <div v-if="!(selectedTrace.relatives && selectedTrace.relatives.length)" style="font-size: 11px; color: #8faec7;">
              No additional relatives recorded for this skip trace.
            </div>
          </div>
        </div>

        <!-- Associated Properties -->
        <div class="drawer-section">
          <div class="section-title">
            <span v-html="icons.house"></span>
            <h4>Current Mailing &amp; Deed History</h4>
          </div>
          <p class="history-note">{{ selectedTrace.mailingAddress || selectedTrace.address || 'Jacksonville, FL' }}</p>
        </div>

        <div class="drawer-footer">
          <button class="btn btn-primary btn-block" :disabled="!selectedTrace.primaryPhone" @click="openSmsModal(selectedTrace)">
            <span v-html="icons.text"></span>
            Send Instant SMS to {{ (selectedTrace.ownerName || 'Owner').split(' ')[0] }}
          </button>
        </div>
      </aside>
    </div>

    <!-- Modals Teleported to body -->
    <Teleport to="body">
    <!-- Single Skip Trace Modal -->
    <div v-if="modalType === 'single'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.search"></span>
            Instant Single Skip Trace Lookup
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-grid-2">
            <div class="form-group">
              <label>Owner First Name</label>
              <input v-model="singleForm.firstName" placeholder="Dorothy" />
            </div>
            <div class="form-group">
              <label>Owner Last Name</label>
              <input v-model="singleForm.lastName" placeholder="Jenkins" />
            </div>
          </div>
          <div class="form-group">
            <label>Property Street Address</label>
            <input v-model="singleForm.address" placeholder="2834 W 21st St" />
          </div>
          <div class="form-grid-2">
            <div class="form-group">
              <label>City</label>
              <input v-model="singleForm.city" value="Jacksonville" />
            </div>
            <div class="form-group">
              <label>ZIP Code</label>
              <input v-model="singleForm.zip" placeholder="32209" />
            </div>
          </div>
          <div v-if="lookupNotice" class="alert-success">{{ lookupNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="runSingleLookup">
            <span v-html="icons.search"></span>
            Execute Lookup ($0.12)
          </button>
        </div>
      </div>
    </div>

    <!-- Batch Modal -->
    <div v-if="modalType === 'batch'" class="modal-overlay" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3>
            <span v-html="icons.download"></span>
            Batch Skip Trace CSV Upload
          </h3>
          <button class="close-btn" @click="closeModal" aria-label="Close modal">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <p>Skip traces run in BatchLeads. Download the queue below, upload it to BatchLeads and run the trace there. Phones and emails come back here by themselves through the BatchLeads webhook.</p>
          <div class="upload-dropzone">
            <span v-html="icons.file"></span>
            <p>The file has owner, address, city, state, ZIP, county and parcel for every property waiting for a trace.</p>
          </div>
          <p v-if="webhookUrl">In BatchLeads, send results to: <code>{{ webhookUrl }}</code></p>
          <div v-if="batchNotice" class="alert-success">{{ batchNotice }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn btn-primary" @click="runBatchLookup">
            Download queue (CSV)
          </button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { icons } from '../icons.js';
import { toCsv, downloadCsv } from '../csv.js';

export default {
  name: 'SkipTracingView',
  setup() {
    const traces = ref([]);

    const metrics = computed(() => {
      const list = traces.value || [];
      const total = list.length;
      const matched = list.filter(t => (t.phones && t.phones.length) || (t.primaryPhone && t.primaryPhone !== '—')).length;
      const matchRate = total ? Math.round((matched / total) * 100) + '%' : '0%';
      return [
        { label: 'Lead Records', value: total.toLocaleString(), change: '', icon: 'search' },
        { label: 'Records With a Phone', value: matchRate, change: '', icon: 'check' },
        { label: 'Verified Mobiles', value: '—', change: '', icon: 'phone' },
        { label: 'DNC Status', value: '—', change: '', icon: 'shield' },
        { label: 'Avg Cost per Trace', value: '—', change: '', icon: 'badgeDollar' }
      ];
    });

    
    const API_BASE = '/api/v1';

    async function loadTraces() {
      try {
        const res = await fetch(API_BASE + '/skip-tracing');
        const data = await res.json();
        if (data && data.traces) {
          traces.value = data.traces.map(t => {
            return {
              ...t,
              primaryPhone: t.primaryPhone || '',
              zip: t.zip || t.address?.match(/\b\d{5}\b/)?.[0] || '',
              relatives: []
            };
          });
          if (!selectedTrace.value && traces.value.length) selectedTrace.value = traces.value[0];
        }
      } catch (err) {
        console.warn('[SkipTracing] Using local cache:', err.message);
      }
    }

    onMounted(() => {
      loadTraces();
    });

    const searchQuery = ref('');
    const qualityFilter = ref('');
    const dncFilter = ref('');
    const sortBy = ref('scoreDesc');
    const selectedTrace = ref(traces.value[0]);
    const modalType = ref('');
    const lookupNotice = ref('');
    const batchNotice = ref('');
    const singleForm = ref({ firstName: '', lastName: '', address: '', city: '', zip: '' });

    const hasActiveFilters = computed(() => searchQuery.value || qualityFilter.value || dncFilter.value || sortBy.value !== 'scoreDesc');

    const filteredTraces = computed(() => {
      let list = traces.value.filter(t => {
        const q = searchQuery.value.toLowerCase().trim();
        const matchesQuery = !q || [t.ownerName, t.address, t.primaryPhone, t.email, t.zip].join(' ').toLowerCase().includes(q);

        let matchesQuality = true;
        if (qualityFilter.value === 'high') matchesQuality = t.score >= 90;
        else if (qualityFilter.value === 'medium') matchesQuality = t.score >= 75 && t.score < 90;
        else if (qualityFilter.value === 'review') matchesQuality = t.score == null || t.score < 75;

        let matchesDnc = true;
        if (dncFilter.value === 'clear') matchesDnc = t.dncFlag === false;
        else if (dncFilter.value === 'scrubbed') matchesDnc = t.dncFlag;

        return matchesQuery && matchesQuality && matchesDnc;
      });

      if (sortBy.value === 'scoreDesc') {
        list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      } else if (sortBy.value === 'nameAsc') {
        list.sort((a, b) => a.ownerName.localeCompare(b.ownerName));
      }
      return list;
    });

    function selectTrace(t) {
      selectedTrace.value = t;
    }

    function resetFilters() {
      searchQuery.value = '';
      qualityFilter.value = '';
      dncFilter.value = '';
      sortBy.value = 'scoreDesc';
    }

    function openModal(type) {
      modalType.value = type;
      lookupNotice.value = '';
      batchNotice.value = '';
    }

    function closeModal() {
      modalType.value = '';
    }

    async function runSingleLookup() {
      const ownerName = `${singleForm.value.firstName || ''} ${singleForm.value.lastName || ''}`.trim();
      const payload = {
        ownerName,
        address: singleForm.value.address,
        zip: singleForm.value.zip
      };
      try {
        const res = await fetch(API_BASE + '/skip-tracing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const saved = await res.json();
        if (!res.ok) throw new Error(saved.error || 'Could not save this lookup.');
        traces.value.unshift(saved);
        selectedTrace.value = saved;
        lookupNotice.value = saved.primaryPhone || saved.email
          ? 'Contact details found in existing records. Verification is pending.'
          : 'No matching contact details were found in existing records.';
      } catch (error) {
        lookupNotice.value = error.message;
      }
    }

    const webhookUrl = ref('');
    async function runBatchLookup() {
      try {
        const res = await fetch('/api/v1/skip-tracing/queue-export');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        webhookUrl.value = data.webhookUrl || '';
        if (!data.rows.length) { batchNotice.value = 'The queue is empty. Push county records to skip tracing first.'; return; }
        const headers = ['Owner Name', 'Property Address', 'City', 'State', 'ZIP', 'County', 'Parcel (APN)'];
        downloadCsv(`skip_trace_queue_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, data.rows.map(r => [r.ownerName, r.address, r.city, r.state, r.zip, r.county, r.parcel])));
        batchNotice.value = `Downloaded ${data.rows.length} propert${data.rows.length === 1 ? 'y' : 'ies'}. Upload the file to BatchLeads and run the trace there.`;
      } catch (err) {
        batchNotice.value = 'Could not export the queue: ' + err.message;
      }
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

    async function quickDial(phone) {
      if (!phone) return;
      showToast('Dispatching Voice Bridge', `Connecting to ${phone}...`, 'info');
      try {
        const res = await fetch('/api/v1/calls/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientPhone: phone,
            
            notes: `Outbound call from Skip Trace Directory to ${phone}`
          })
        });
        const data = await res.json();
        if (data.carrier?.nativeUri) {
          window.location.href = data.carrier.nativeUri;
        } else {
          window.location.href = `tel:${phone.replace(/\D/g, '')}`;
        }
      } catch (e) {
        window.location.href = `tel:${phone.replace(/\D/g, '')}`;
      }
    }

    function openSmsModal(t) {
      if (!t || !t.primaryPhone) return;
      const cleanPhone = t.primaryPhone.replace(/\D/g, '');
      const body = `Hi ${t.ownerName}, Alex with HushHawk here regarding your property at ${t.propertyAddress}. Are you open to a cash offer?`;
      showToast('SMS Dispatch Bridge', `Connecting to ${t.ownerName} (${t.primaryPhone})...`, 'info');
      window.location.href = `sms:+1${cleanPhone}?body=${encodeURIComponent(body)}`;
    }

    return {
      icons,
      metrics,
      traces,
      searchQuery,
      qualityFilter,
      dncFilter,
      sortBy,
      selectedTrace,
      modalType,
      lookupNotice,
      batchNotice,
      singleForm,
      hasActiveFilters,
      filteredTraces,
      selectTrace,
      resetFilters,
      openModal,
      closeModal,
      runSingleLookup,
      runBatchLookup,
      webhookUrl,
      quickDial,
      openSmsModal
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

.content-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.content-split.has-drawer {
  grid-template-columns: minmax(0, 1fr) 340px;
}
@media (max-width: 1280px) {
  .content-split.has-drawer {
    grid-template-columns: minmax(0, 1fr);
  }
}

.main-panel {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  background: #07192d;
  border: 1px solid #1c4266;
  border-radius: 8px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
.data-table tbody tr {
  cursor: pointer;
  transition: background 0.15s ease;
}
.data-table tbody tr:hover {
  background: #0c2642;
}
.data-table tbody tr.active {
  background: #103254;
  border-left: 3px solid #edcf7c;
}

.owner-cell strong {
  display: block;
  font-size: 13px;
  color: #ffffff;
}
.owner-cell small {
  color: #8faec7;
  font-size: 11px;
}
.property-cell span {
  display: block;
  font-weight: 600;
}
.property-cell small {
  color: #8faec7;
  font-size: 11px;
}
.score-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
}
.score-high {
  background: #0e3d29;
  color: #35e6a2;
}
.score-med {
  background: #2a2c26;
  color: #edcf7c;
}
.phone-cell strong {
  display: block;
  font-size: 12px;
  color: #ffffff;
}
.phone-cell small {
  font-size: 10px;
  color: #8faec7;
}
.relatives-count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #113454;
  padding: 2px 8px;
  border-radius: 12px;
  color: #7dcaf4;
  font-size: 11px;
}
.dnc-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.dnc-tag.clean {
  background: #0e3d29;
  color: #35e6a2;
}
.dnc-tag.flagged {
  background: #47191b;
  color: #ff8585;
}

/* Detail Drawer */
.detail-drawer {
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
  overflow: hidden;
}
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #1c4266;
  padding-bottom: 12px;
  min-width: 0;
}
.drawer-header h3 {
  margin: 0 0 4px;
  font-size: 15px;
  color: #ffffff;
  word-break: break-word;
}
.drawer-header p {
  margin: 0;
  font-size: 11px;
  color: #8faec7;
  word-break: break-word;
}

.confidence-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  background: #051424;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid #1c4266;
  text-align: center;
  min-width: 0;
  box-sizing: border-box;
}
.conf-item {
  min-width: 0;
  overflow: hidden;
}
.conf-item small {
  font-size: 10px;
  color: #8faec7;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.conf-item strong {
  font-size: 13px;
  color: #f1f6ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.conf-item strong.green {
  color: #35e6a2;
}
.conf-item strong.red {
  color: #ff8585;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #edcf7c;
}
.section-title h4 {
  font-size: 12px;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.phone-list, .relatives-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.phone-row, .relative-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #092038;
  border: 1px solid #1a3f61;
  padding: 8px 10px;
  border-radius: 5px;
}
.phone-row strong, .relative-card strong {
  display: block;
  font-size: 12px;
  color: #ffffff;
}
.phone-row small, .relative-card small {
  font-size: 10px;
  color: #8faec7;
}
.history-note {
  font-size: 12px;
  color: #d1e2f2;
  background: #051424;
  padding: 8px;
  border-radius: 5px;
  border: 1px solid #1c4266;
  margin: 0;
}
.drawer-footer {
  border-top: 1px solid #1c4266;
  padding-top: 12px;
}

/* Modals */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 10, 20, 0.82);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  z-index: 99999 !important;
  padding: 20px;
}
.modal-card {
  background: #081d33;
  border: 1px solid #28547d;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
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
.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-group label {
  font-size: 11px;
  text-transform: uppercase;
  color: #9ab4cc;
}
.form-group input,
.form-group select {
  background: #051424;
  border: 1px solid #28547d;
  color: #f1f6ff;
  padding: 8px 10px;
  border-radius: 5px;
  font-size: 12px;
  outline: none;
}
.form-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.upload-dropzone {
  border: 2px dashed #28547d;
  border-radius: 6px;
  padding: 24px;
  text-align: center;
  color: #8faec7;
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
.btn-block {
  width: 100%;
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
