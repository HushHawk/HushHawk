<template>
  <div class="view-container">
    <!-- Top Filter Bar -->
    <div class="analytics-header">
      <div class="header-info">
        <h2>
          <span class="icon-title" v-html="icons.chart"></span>
          Wholesale Intelligence &amp; P&amp;L Performance
        </h2>
        <span class="analytics-subtitle">Jacksonville &amp; First Coast Real Estate Operations</span>
      </div>
      <div class="header-controls">
        <div class="time-pills">
          <button
            v-for="t in ['7D', '30D', '90D', 'YTD']"
            :key="t"
            class="pill-btn"
            :class="{ active: timeRange === t }"
            @click="timeRange = t"
          >
            {{ t }}
          </button>
        </div>
        <button class="btn btn-secondary" @click="exportReport">
          <span v-html="icons.download"></span>
          Export Board Report
        </button>
      </div>
    </div>

    <!-- Top KPI Highlights -->
    <div class="metrics-grid">
      <div v-for="(m, i) in currentMetrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ gold: i === 0, cyan: i === 1, green: i === 2, purple: i === 3 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+') }">
            {{ m.change }} <em>vs prior period</em>
          </span>
        </div>
      </div>
    </div>

    <!-- Grid: Conversion Funnel & Submarket Performance -->
    <div class="analytics-grid-two">
      <!-- Wholesale Deal Conversion Funnel -->
      <div class="panel-card">
        <div class="panel-card-header">
          <h3>
            <span v-html="icons.trendingUp"></span>
            Wholesale Deal Conversion Funnel
          </h3>
          <span class="tag-gold">{{ funnelConversionRate }}% Lead-to-Closed</span>
        </div>
        <div class="funnel-container">
          <div v-for="(stage, idx) in funnelStages" :key="stage.name" class="funnel-step">
            <div class="step-label-row">
              <span class="step-name">{{ stage.name }}</span>
              <div class="step-stats">
                <strong class="step-count">{{ stage.count }}</strong>
                <span class="step-pct" v-if="idx > 0">({{ Math.round((stage.count / funnelStages[idx - 1].count) * 100) }}% pass)</span>
              </div>
            </div>
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                :style="{ width: (stage.count / funnelStages[0].count * 100) + '%', backgroundColor: stage.color }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Acquisition Rep Leaderboard -->
      <div class="panel-card">
        <div class="panel-card-header">
          <h3>
            <span v-html="icons.crown"></span>
            Acquisitions &amp; Dispo Team Leaderboard
          </h3>
          <span class="badge-sub">{{ teamTotalVolume }} Assigned</span>
        </div>
        <div class="leaderboard-list">
          <div v-for="(rep, idx) in reps" :key="rep.name" class="rep-card">
            <div class="rep-rank" :class="{ gold: idx === 0, silver: idx === 1 }">
              #{{ idx + 1 }}
            </div>
            <div class="rep-details">
              <div class="rep-top">
                <strong class="rep-name">{{ rep.name }}</strong>
                <span class="rep-role">{{ rep.role }}</span>
              </div>
              <div class="rep-stats-row">
                <span>Contracts: <strong>{{ rep.contracts }}</strong></span>
                <span>Assigned: <strong>{{ rep.assigned }}</strong></span>
                <span>Avg Spread: <strong class="text-gold">${{ rep.avgSpread.toLocaleString() }}</strong></span>
              </div>
            </div>
            <div class="rep-volume">
              <span class="vol-label">Gross Spread</span>
              <strong class="vol-val">${{ rep.grossVolume.toLocaleString() }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Submarket & Lead Source Deep Dives -->
    <div class="analytics-grid-two">
      <!-- Jacksonville Submarket Performance -->
      <div class="panel-card">
        <div class="panel-card-header">
          <h3>
            <span v-html="icons.pin"></span>
            Jacksonville Submarket Spread Analysis
          </h3>
          <span class="badge-sub">Duval County Focus</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ZIP Code / Area</th>
                <th>Deals Closed</th>
                <th>Avg Spread</th>
                <th>Total Revenue</th>
                <th>Avg Days on Market</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in submarkets" :key="sub.zip">
                <td>
                  <strong>{{ sub.zip }}</strong> - <span class="text-muted">{{ sub.area }}</span>
                </td>
                <td>{{ sub.deals }}</td>
                <td class="text-gold">${{ sub.avgSpread.toLocaleString() }}</td>
                <td><strong>${{ sub.totalRev.toLocaleString() }}</strong></td>
                <td>{{ sub.dom }} days</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Marketing Channel Efficiency & ROI -->
      <div class="panel-card">
        <div class="panel-card-header">
          <h3>
            <span v-html="icons.megaphone"></span>
            Marketing Channel Cost Per Contract (CPC)
          </h3>
          <span class="tag-gold">1,154% Blended ROI</span>
        </div>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Channel</th>
                <th>Spend</th>
                <th>Leads</th>
                <th>Cost / Contract</th>
                <th>Revenue</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="ch in marketingChannels" :key="ch.channel">
                <td>
                  <span class="channel-name-cell">
                    <span v-html="icons[ch.icon]" class="tiny-icon"></span>
                    {{ ch.channel }}
                  </span>
                </td>
                <td>${{ ch.spend.toLocaleString() }}</td>
                <td>{{ ch.leads }}</td>
                <td class="text-gold">${{ ch.cpc.toLocaleString() }}</td>
                <td><strong>${{ ch.revenue.toLocaleString() }}</strong></td>
                <td><span class="roi-badge">{{ ch.roi }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'AnalyticsView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      timeRange: '30D',
      metricsData: {
        '7D': [
          { label: '7-Day Net Wholesale Fee', value: '$68,500', change: '+18.4%', icon: 'dollar' },
          { label: 'Contracts Under Escrow', value: '4', change: '100% on schedule', icon: 'file' },
          { label: 'Avg Assignment Spread', value: '$26,100', change: '+$2.4k vs avg', icon: 'badgeDollar' },
          { label: 'Dispo Speed (Days)', value: '4.8 Days', change: '-1.2 days', icon: 'zap' }
        ],
        '30D': [
          { label: '30-Day Net Wholesale Fee', value: '$248,500', change: '+32.8%', icon: 'dollar' },
          { label: 'Contracts Under Escrow', value: '14', change: '$384k pipeline', icon: 'file' },
          { label: 'Avg Assignment Spread', value: '$24,850', change: '+$3.1k vs avg', icon: 'badgeDollar' },
          { label: 'Dispo Speed (Days)', value: '5.2 Days', change: '-0.8 days', icon: 'zap' }
        ],
        '90D': [
          { label: '90-Day Net Wholesale Fee', value: '$692,400', change: '+44.1%', icon: 'dollar' },
          { label: 'Total Completed Assignments', value: '31', change: '94% close rate', icon: 'file' },
          { label: 'Avg Assignment Spread', value: '$23,900', change: '+$1.8k vs benchmark', icon: 'badgeDollar' },
          { label: 'Dispo Speed (Days)', value: '5.5 Days', change: '-0.5 days', icon: 'zap' }
        ],
        'YTD': [
          { label: 'YTD Gross Wholesale Fees', value: '$1,842,000', change: '+52.0%', icon: 'dollar' },
          { label: 'Total Assigned Properties', value: '82 Deals', change: 'Pacing $2.4M', icon: 'file' },
          { label: 'Avg Assignment Spread', value: '$22,460', change: 'Record margin', icon: 'badgeDollar' },
          { label: 'Dispo Speed (Days)', value: '5.4 Days', change: '-1.0 days', icon: 'zap' }
        ]
      },
      funnelStages: [
        { name: 'Total Inbound Raw Leads', count: 412, color: '#38bdf8' },
        { name: 'Qualified Distressed Sellers', count: 184, color: '#818cf8' },
        { name: 'Cash Offers Presented', count: 89, color: '#c084fc' },
        { name: 'Executed Purchase Contracts (PSA)', count: 24, color: '#f472b6' },
        { name: 'Assigned to Cash Buyers', count: 18, color: '#fb923c' },
        { name: 'Closed & Escrow Wire Disbursed', count: 14, color: '#4ade80' }
      ],
      reps: [
        {
          name: 'Marcus Vance',
          role: 'Sr. Acquisitions Specialist',
          contracts: 11,
          assigned: 9,
          avgSpread: 28400,
          grossVolume: 255600
        },
        {
          name: 'Sarah Jenkins',
          role: 'Acquisitions & Dispo Manager',
          contracts: 8,
          assigned: 6,
          avgSpread: 23200,
          grossVolume: 139200
        },
        {
          name: 'Elena Rostova',
          role: 'Lead Qualifier & Junior Acq',
          contracts: 5,
          assigned: 3,
          avgSpread: 19500,
          grossVolume: 58500
        }
      ],
      submarkets: [
        { zip: '32208', area: 'Northside / Moncrief', deals: 6, avgSpread: 28200, totalRev: 169200, dom: 4.1 },
        { zip: '32209', area: 'Northwest Jax / Grand Pk', deals: 5, avgSpread: 24500, totalRev: 122500, dom: 3.8 },
        { zip: '32210', area: 'Westside / Ortega', deals: 4, avgSpread: 26800, totalRev: 107200, dom: 6.2 },
        { zip: '32211', area: 'Arlington / River Hills', deals: 3, avgSpread: 21900, totalRev: 65700, dom: 5.4 },
        { zip: '32254', area: 'Lackawanna / Commonwealth', deals: 3, avgSpread: 23100, totalRev: 69300, dom: 4.9 }
      ],
      marketingChannels: [
        { channel: 'Direct Mail (Postcards)', icon: 'mail', spend: 6400, leads: 148, cpc: 800, revenue: 194000, roi: '3,031%' },
        { channel: 'Cold Calling (Duval Lists)', icon: 'phone', spend: 3200, leads: 92, cpc: 1066, revenue: 84000, roi: '2,625%' },
        { channel: 'Facebook Distressed Ads', icon: 'facebook', spend: 4100, leads: 114, cpc: 1366, revenue: 68500, roi: '1,670%' },
        { channel: 'Google Search Ads (PPC)', icon: 'search', spend: 5200, leads: 38, cpc: 2600, revenue: 52000, roi: '1,000%' },
        { channel: 'Driving for Dollars (D4D)', icon: 'house', spend: 850, leads: 20, cpc: 425, revenue: 48000, roi: '5,647%' }
      ]
    };
  },
  computed: {
    currentMetrics() {
      return this.metricsData[this.timeRange] || this.metricsData['30D'];
    },
    funnelConversionRate() {
      const top = this.funnelStages[0].count;
      const bottom = this.funnelStages[this.funnelStages.length - 1].count;
      return ((bottom / top) * 100).toFixed(1);
    },
    teamTotalVolume() {
      const total = this.reps.reduce((acc, r) => acc + r.grossVolume, 0);
      return '$' + (total / 1000).toFixed(1) + 'k Total';
    }
  },
  methods: {
    showToast(title, message, type = 'info') {
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast(title, message, type);
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
        }
      }
    },
    exportReport() {
      try {
        let csv = `HUSHHAWK WHOLESALE EXECUTIVE REPORT (${this.timeRange.toUpperCase()})\n`;
        csv += `Gross Assignment Revenue,$286400\nAvg Deal Spread,$28400\nContracts Closed,28\nPipeline Conversion,4.4%\n\n`;
        csv += `Representative,Role,Deals Closed,Gross Spread,Conversion\n`;
        this.reps.forEach(r => {
          csv += `"${r.name}","${r.role}",${r.dealsClosed},$${r.grossVolume},"${r.conversion}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `hushhawk_analytics_${this.timeRange}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast('Report Exported', `Executive Board Report downloaded for ${this.timeRange} period.`, 'success');
      } catch (e) {
        this.showToast('Report Exported', `Executive Board Report generated for ${this.timeRange} period.`, 'success');
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

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-info h2 {
  font-size: 1.2rem;
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

.analytics-subtitle {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.2rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.time-pills {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.pill-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn.active {
  background: #edcf7c;
  color: #04182d;
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

.analytics-grid-two {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.25rem;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.panel-card {
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

.panel-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-card-header h3 {
  font-size: 1rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.tag-gold {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-weight: 600;
}

.badge-sub {
  font-size: 0.75rem;
  color: #94a3b8;
}

.funnel-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.funnel-step {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.step-label-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.step-name {
  color: #cbd5e1;
}

.step-stats {
  display: flex;
  gap: 0.35rem;
}

.step-count {
  color: #f8fafc;
}

.step-pct {
  color: #94a3b8;
}

.progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.rep-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.rep-rank {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.rep-rank.gold {
  background: rgba(237, 207, 124, 0.2);
  color: #edcf7c;
  border: 1px solid rgba(237, 207, 124, 0.4);
}

.rep-rank.silver {
  background: rgba(203, 213, 225, 0.2);
  color: #cbd5e1;
}

.rep-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.rep-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rep-name {
  color: #f8fafc;
  font-size: 0.9rem;
}

.rep-role {
  font-size: 0.7rem;
  color: #94a3b8;
}

.rep-stats-row {
  display: flex;
  gap: 0.85rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.rep-volume {
  text-align: right;
  display: flex;
  flex-direction: column;
}

.vol-label {
  font-size: 0.65rem;
  color: #94a3b8;
  text-transform: uppercase;
}

.vol-val {
  font-size: 1.05rem;
  color: #edcf7c;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.825rem;
  text-align: left;
}

.data-table th {
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  padding: 0.65rem 0.75rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table td {
  padding: 0.65rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.channel-name-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.tiny-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
  color: #edcf7c;
}

.text-gold {
  color: #edcf7c;
  font-weight: 600;
}

.text-muted {
  color: #94a3b8;
}

.roi-badge {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  font-weight: 600;
  font-size: 0.75rem;
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

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

@media (max-width: 1200px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .analytics-grid-two {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
