<template>
  <section class="hushhawk-command-center" :class="{ 'nav-open': navOpen }">
    <!-- Left Navigation Sidebar -->
    <aside class="sidebar">
      <a href="/home" class="brand">
        <span class="brand-icon" v-html="icons.logo"></span>
        <strong>HUSHHAWK<br>INTELLIGENCE</strong>
        <small>PEOPLE • PROPERTIES • PROSPERITY</small>
      </a>

      <nav aria-label="HushHawk navigation">
        <a
          v-for="item in primaryNavigation"
          :key="item.path"
          :href="item.path"
          :aria-current="item.path === activePath ? 'page' : undefined"
          :class="{ active: item.path === activePath }"
          @click="handleNav(item.path, $event)"
        >
          <span class="icon" v-html="icons[item.icon] || icons.house"></span>
          {{ item.name }}
        </a>

        <details class="more-workspaces" open>
          <summary>More Workspaces</summary>
          <a
            v-for="item in secondaryNavigation"
            :key="item.path"
            :href="item.path"
            :aria-current="item.path === activePath ? 'page' : undefined"
            :class="{ active: item.path === activePath }"
            @click="handleNav(item.path, $event)"
          >
            <span class="icon" v-html="icons[item.icon] || icons.file"></span>
            {{ item.name }}
          </a>
        </details>
      </nav>

      <div class="brand-bottom">
        <p>“REAL ESTATE<br>CREATES FREEDOM.”</p>
        <span>HUSHHAWK • BUILT TO CLOSE</span>
        <small>Jacksonville Command v4.0</small>
      </div>
    </aside>

    <!-- Main Workspace -->
    <main class="workspace">
      <!-- Top Command Bar -->
      <div class="topbar">
        <button class="mobile-menu" @click="navOpen = !navOpen" :aria-expanded="navOpen">
          <span v-html="icons.sliders"></span>
        </button>

        <label class="global-search">
          <span class="icon" v-html="icons.search"></span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search parcels, contracts, sellers, buyers, or addresses..."
            aria-label="Global search"
          />
        </label>

        <div class="topbar-right">
          <div class="live-clock">
            <span class="pulse-dot"></span>
            <span class="clock-label">ET (Jacksonville):</span>
            <strong class="font-mono">{{ currentTime }}</strong>
          </div>

          <div class="quick-add-wrap">
            <button class="btn-gold" @click.stop="isQuickAddOpen = !isQuickAddOpen" :aria-expanded="isQuickAddOpen">
              <span class="icon" v-html="icons.plus"></span>
              Add New
              <span class="caret-icon" v-html="icons.chevronDown"></span>
            </button>
            <div v-if="isQuickAddOpen" class="quick-add-menu" @click.stop>
              <a href="/properties" @click="handleNav('/properties', $event)">
                <span class="qa-icon" v-html="icons.house"></span> View Properties &amp; Photos
              </a>
              <a href="/dispositions" @click="handleNav('/dispositions', $event)">
                <span class="qa-icon" v-html="icons.badgeDollar"></span> Add Contract to Dispo
              </a>
              <a href="/cash-buyers" @click="handleNav('/cash-buyers', $event)">
                <span class="qa-icon" v-html="icons.users"></span> Add Cash Buyer
              </a>
              <a href="/contracts" @click="handleNav('/contracts', $event)">
                <span class="qa-icon" v-html="icons.file"></span> Create New Contract
              </a>
              <a href="/follow-ups" @click="handleNav('/follow-ups', $event)">
                <span class="qa-icon" v-html="icons.clock"></span> Schedule Follow-Up
              </a>
              <a href="/tasks" @click="handleNav('/tasks', $event)">
                <span class="qa-icon" v-html="icons.tasks"></span> Add Task Milestone
              </a>
              <a href="/deal-analyzer" @click="handleNav('/deal-analyzer', $event)">
                <span class="qa-icon" v-html="icons.calculator"></span> Underwrite New Deal
              </a>
              <a href="/team" @click="handleNav('/team', $event)">
                <span class="qa-icon" v-html="icons.user"></span> Invite Team Member
              </a>
            </div>
          </div>

          <button class="notification-btn" @click.stop="isNotifOpen = !isNotifOpen" aria-label="Notifications">
            <span class="icon" v-html="icons.bell"></span>
            <span class="notif-badge">3</span>
          </button>

          <!-- Notifications Modal / Dropdown -->
          <div v-if="isNotifOpen" class="notif-dropdown" @click.stop>
            <div class="notif-head">
              <strong>Escrow &amp; Pipeline Alerts</strong>
              <span class="badge-sub">3 unread</span>
            </div>
            <div class="notif-item">
              <span class="notif-icon green" v-html="icons.check"></span>
              <div>
                <strong>First American Title: Wire Disbursed</strong>
                <p>$32,500 assignment fee funded for 4812 Moncrief Rd.</p>
                <small>12 mins ago</small>
              </div>
            </div>
            <div class="notif-item">
              <span class="notif-icon gold" v-html="icons.file"></span>
              <div>
                <strong>DocuSign PSA Executed</strong>
                <p>Ronald Campbell signed PSA for $110,000 cash.</p>
                <small>1 hr ago</small>
              </div>
            </div>
            <div class="notif-item">
              <span class="notif-icon cyan" v-html="icons.phone"></span>
              <div>
                <strong>Hot Seller Lead Ingested</strong>
                <p>Travis Holloway (Duval Probate) score 94/100.</p>
                <small>2 hrs ago</small>
              </div>
            </div>
          </div>

          <a href="/settings" class="user-identity" @click="handleNav('/settings', $event)" title="HushHawk Acquisitions Command">
            <span class="identity-logo" v-html="icons.logo"></span>
            <div class="identity-text">
              <strong>HushHawk</strong>
              <small>Acquisitions Command</small>
            </div>
            <span class="identity-caret">⌄</span>
          </a>
        </div>
      </div>

      <!-- Hero Header Banner with Jacksonville Skyline -->
      <header v-if="activeSectionKey !== 'properties'" class="hero" :style="heroStyle">
        <div class="hero-copy">
          <div class="breadcrumbs">
            <span>HushHawk Command Center</span>
            <span class="crumb-sep">/</span>
            <strong class="text-gold">{{ currentSectionMeta.title }}</strong>
          </div>
          <h1>{{ currentSectionMeta.title }}</h1>
          <p>{{ currentSectionMeta.tagline }}</p>
          <div class="principles">
            <span><span class="icon" v-html="icons.handshake"></span> PEOPLE</span>
            <span><span class="icon" v-html="icons.house"></span> PROPERTIES</span>
            <span><span class="icon" v-html="icons.chart"></span> PROSPERITY</span>
          </div>
        </div>

        <div class="jacksonville-calligraphy">
          <strong>Jacksonville</strong>
          <span>FIRST COAST WHOLESALE DOMINANCE</span>
        </div>

        <div class="hero-motto">
          BIGGER<br>DEALS<br>BRIGHTER<br>TOMORROWS.
        </div>
      </header>

      <!-- Active Section View Component -->
      <div class="workspace-content">
        <component
          :is="currentViewComponent"
          :content="content"
        />
      </div>

      <!-- Floating Toast Notification System -->
      <transition name="toast-slide">
        <div v-if="toast.show" class="hushhawk-toast" :class="toast.type">
          <div class="toast-dot"></div>
          <div class="toast-body">
            <strong>{{ toast.title }}</strong>
            <p>{{ toast.message }}</p>
          </div>
          <button class="toast-close-btn" @click="toast.show = false">×</button>
        </div>
      </transition>

      <!-- Footer -->
      <footer class="app-footer">
        <span>HushHawk Property Intelligence <b>│</b> CrownKey GIS Parcel Engine <b>│</b> Built to Close.</span>
        <span>JACKSONVILLE, FL <b>│</b> WHOLESALE COMMAND <b>│</b> PEOPLE • PROPERTIES • PROSPERITY</span>
      </footer>
    </main>
  </section>
</template>

<script>
import { icons } from './icons.js';
import { navigation } from './navigation.js';

// Dedicated Views
import PropertiesView from './views/PropertiesView.vue';
import DispositionsView from './views/DispositionsView.vue';
import CashBuyersView from './views/CashBuyersView.vue';
import MarketingView from './views/MarketingView.vue';
import CountyDataView from './views/CountyDataView.vue';
import SkipTracingView from './views/SkipTracingView.vue';
import ContractsView from './views/ContractsView.vue';
import FollowUpsView from './views/FollowUpsView.vue';
import AnalyticsView from './views/AnalyticsView.vue';
import SettingsView from './views/SettingsView.vue';
import CommunicationsView from './views/CommunicationsView.vue';
import TasksView from './views/TasksView.vue';
import CalendarView from './views/CalendarView.vue';
import ContactsView from './views/ContactsView.vue';
import AutomationsView from './views/AutomationsView.vue';
import FacebookLeadsView from './views/FacebookLeadsView.vue';
import DirectMailView from './views/DirectMailView.vue';
import DealAnalyzerView from './views/DealAnalyzerView.vue';
import TeamView from './views/TeamView.vue';

export default {
  name: 'HushHawkMasterShell',
  components: {
    PropertiesView,
    DispositionsView,
    CashBuyersView,
    MarketingView,
    CountyDataView,
    SkipTracingView,
    ContractsView,
    FollowUpsView,
    AnalyticsView,
    SettingsView,
    CommunicationsView,
    TasksView,
    CalendarView,
    ContactsView,
    AutomationsView,
    FacebookLeadsView,
    DirectMailView,
    DealAnalyzerView,
    TeamView
  },
  props: {
    uid: { type: String, default: 'hushhawk-cmd' },
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      navigation,
      navOpen: false,
      searchQuery: '',
      isQuickAddOpen: false,
      isNotifOpen: false,
      currentTime: '09:42 AM',
      timeInterval: null,
      selectedSection: null,
      toast: { show: false, title: '', message: '', type: 'info' },
      toastTimer: null
    };
  },
  computed: {
    primaryNavigation() {
      return this.navigation.slice(0, 11);
    },
    secondaryNavigation() {
      return this.navigation.slice(11);
    },
    activeSectionKey() {
      // 0. Explicit in-app user navigation state
      if (this.selectedSection) {
        return this.selectedSection;
      }

      // 1. Explicit prop check
      const prop = this.content?.workspacePage;
      if (prop) {
        return prop;
      }

      // 2. Browser path detection
      if (typeof window !== 'undefined' && window.location) {
        const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
        if (path.includes('properties')) return 'properties';
        if (path.includes('cash-buyers')) return 'cash-buyers';
        if (path.includes('marketing')) return 'marketing';
        if (path.includes('county-data')) return 'county-data';
        if (path.includes('skip-tracing')) return 'skip-tracing';
        if (path.includes('contracts')) return 'contracts';
        if (path.includes('follow-ups')) return 'follow-ups';
        if (path.includes('analytics')) return 'analytics';
        if (path.includes('settings')) return 'settings';
        if (path.includes('communications')) return 'communications';
        if (path.includes('tasks')) return 'tasks';
        if (path.includes('calendar')) return 'calendar';
        if (path.includes('contacts')) return 'contacts';
        if (path.includes('automations')) return 'automations';
        if (path.includes('facebook-leads')) return 'facebook-leads';
        if (path.includes('direct-mail')) return 'direct-mail';
        if (path.includes('deal-analyzer')) return 'deal-analyzer';
        if (path.includes('team')) return 'team';
        if (path.includes('dispositions')) return 'dispositions';
      }

      return 'dispositions';
    },
    activePath() {
      return '/' + this.activeSectionKey;
    },
    currentViewComponent() {
      const map = {
        'properties': 'PropertiesView',
        'dispositions': 'DispositionsView',
        'cash-buyers': 'CashBuyersView',
        'marketing': 'MarketingView',
        'county-data': 'CountyDataView',
        'skip-tracing': 'SkipTracingView',
        'contracts': 'ContractsView',
        'follow-ups': 'FollowUpsView',
        'analytics': 'AnalyticsView',
        'team': 'TeamView',
        'settings': 'SettingsView',
        'communications': 'CommunicationsView',
        'tasks': 'TasksView',
        'calendar': 'CalendarView',
        'contacts': 'ContactsView',
        'automations': 'AutomationsView',
        'facebook-leads': 'FacebookLeadsView',
        'direct-mail': 'DirectMailView',
        'deal-analyzer': 'DealAnalyzerView'
      };
      return map[this.activeSectionKey] || 'DispositionsView';
    },
    currentSectionMeta() {
      const metas = {
        'properties': {
          title: 'Properties',
          subtitle: 'Property Portfolio & Photo Management',
          tagline: 'Comprehensive Property Records, S3 Encrypted Field Photos & Renovation Tracking.'
        },
        'team': {
          title: 'Team & Operations',
          subtitle: 'Institutional Wholesale Roster & Production',
          tagline: 'Jacksonville First Coast Wholesale Operations, Podio User Sync & Pipeline Production.'
        },
        'dispositions': {
          title: 'Dispositions',
          subtitle: 'Contract Inventory & Buyer Allocation',
          tagline: 'Match Under-Contract Deals with VIP Cash Buyers. Maximize Assignment Margins.'
        },
        'cash-buyers': {
          title: 'Cash Buyers',
          subtitle: 'VIP Investor Network & Buy Boxes',
          tagline: 'Connect Deals with Verified Cash Investors. Faster Closes with Zero Delays.'
        },
        'marketing': {
          title: 'Marketing',
          subtitle: 'Multi-Channel Acquisition & Inbound CPL',
          tagline: 'High-ROI Direct Mail, Cold Call, Facebook & D4D Attribution Engine.'
        },
        'county-data': {
          title: 'County Data',
          subtitle: 'CrownKey Parcel Records & Tax Delinquency',
          tagline: 'Duval, Clay, and St. Johns Official Tax Appraiser & Deeds GIS Feed.'
        },
        'skip-tracing': {
          title: 'Skip Tracing',
          subtitle: 'Tier 1 Contact Enrichment & DNC Scrub',
          tagline: 'Pinpoint Motivated Decision Makers with Instant Phone & Relatives Lookup.'
        },
        'contracts': {
          title: 'Contracts',
          subtitle: 'Purchase Agreements & Escrow Milestones',
          tagline: 'Track PSA Timelines, EMD Deposits, Title Commitments, and Closing Funding.'
        },
        'follow-ups': {
          title: 'Follow Ups',
          subtitle: 'Cadence Engine & Seller Nurture',
          tagline: 'Never Let a Deal Die. Automated Day 1, 3, 7, 14, and 30 Touchpoints.'
        },
        'analytics': {
          title: 'Analytics',
          subtitle: 'Wholesale Intelligence & Performance P&L',
          tagline: 'Real-Time Revenue, Average Spreads, Submarket Density, and Rep Volume.'
        },
        'settings': {
          title: 'Settings',
          subtitle: 'Enterprise System Configuration',
          tagline: 'Canonical PostgreSQL DB, API Keys, Underwriting Rules, and Team RBAC.'
        },
        'communications': {
          title: 'Communications',
          subtitle: 'Omnichannel 2-Way Inbox',
          tagline: 'Unified SMS, Voice Recordings, and Email Blasts Linked to Properties.'
        },
        'tasks': {
          title: 'Tasks',
          subtitle: 'Operations & Title Escrow Matrix',
          tagline: 'High-Priority Execution Matrix for Earnest Money, Estoppels, and Walkthroughs.'
        },
        'calendar': {
          title: 'Calendar',
          subtitle: 'Walkthroughs & Title Closings',
          tagline: 'Field Appointments, Home Inspections, Lockbox Access, and Wire Disbursals.'
        },
        'contacts': {
          title: 'Contacts',
          subtitle: 'First Coast Wholesale Rolodex',
          tagline: 'Directory of Distressed Sellers, VIP Buyers, Title Officers, and Hard Money Lenders.'
        },
        'automations': {
          title: 'Automations',
          subtitle: 'Event-Driven Webhooks & Workflows',
          tagline: 'Automated Lead Routing, Instant SMS Response, and Title Escrow Dispatch.'
        },
        'facebook-leads': {
          title: 'Facebook Leads',
          subtitle: 'Meta Paid Distressed Seller Queue',
          tagline: 'Live Meta Ad Leads with Form Questionnaires, Timeframes, and Motivation Scores.'
        },
        'direct-mail': {
          title: 'Direct Mail',
          subtitle: 'USPS Intelligent Mail Barcode Tracking',
          tagline: 'Postcards, Handwritten Yellow Letters, Inbound Call Routing, and Drop Batches.'
        },
        'deal-analyzer': {
          title: 'Deal Analyzer',
          subtitle: '70% Rule MAO & Itemized Rehab',
          tagline: 'Underwrite Deals in Seconds. Calculate Repairs, Target Spread, and Maximum Cash Offer.'
        }
      };
      return metas[this.activeSectionKey] || metas['dispositions'];
    },
    heroStyle() {
      const skylineUrl = this.content?.skyline || 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80';
      return {
        backgroundImage: `linear-gradient(90deg, #03172fee 0%, #03172fc9 35%, #06244144 65%, #011a3440), url("${skylineUrl}")`
      };
    }
  },
  mounted() {
    this.updateClock();
    this.timeInterval = setInterval(this.updateClock, 30000);
    this.clickOutsideHandler = (e) => {
      if (!e.target.closest('.quick-add-wrap')) {
        this.isQuickAddOpen = false;
      }
      if (!e.target.closest('.notif-dropdown') && !e.target.closest('.notification-btn')) {
        this.isNotifOpen = false;
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.clickOutsideHandler);
    }

    this.toastListener = (e) => {
      if (e.detail) {
        this.showToast(e.detail.title || 'Notification', e.detail.message || '', e.detail.type || 'info');
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('hushhawk-toast', this.toastListener);
      window.showHushHawkToast = (title, message, type) => this.showToast(title, message, type);
      this.popstateListener = (e) => {
        if (e.state && e.state.section) {
          this.selectedSection = e.state.section;
        }
      };
      window.addEventListener('popstate', this.popstateListener);
    }
  },
  beforeUnmount() {
    if (this.timeInterval) clearInterval(this.timeInterval);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (typeof document !== 'undefined' && this.clickOutsideHandler) {
      document.removeEventListener('click', this.clickOutsideHandler);
    }
    if (typeof window !== 'undefined') {
      if (this.toastListener) window.removeEventListener('hushhawk-toast', this.toastListener);
      if (this.popstateListener) window.removeEventListener('popstate', this.popstateListener);
    }
  },
  methods: {
    updateClock() {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    },
    handleNav(path, e) {
      this.isQuickAddOpen = false;
      this.navOpen = false;
      const section = path.replace(/^\//, '');
      const validSections = [
        'properties', 'dispositions', 'cash-buyers', 'marketing', 'county-data',
        'skip-tracing', 'contracts', 'follow-ups', 'analytics',
        'team', 'settings', 'communications', 'tasks', 'calendar',
        'contacts', 'automations', 'facebook-leads', 'direct-mail', 'deal-analyzer'
      ];
      if (validSections.includes(section)) {
        if (e) e.preventDefault();
        this.selectedSection = section;
        if (typeof window !== 'undefined' && window.history && window.history.pushState) {
          window.history.pushState({ section }, '', path);
        }
      }
    },
    showToast(title, message, type = 'info') {
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toast = { show: true, title, message, type };
      this.toastTimer = setTimeout(() => {
        this.toast.show = false;
      }, 3500);
    }
  }
};
</script>

<style scoped>
.hushhawk-command-center {
  display: grid !important;
  grid-template-columns: 210px minmax(0, 1fr) !important;
  width: 100% !important;
  min-width: 0 !important;
  background: #04182d;
  color: #f8fafc;
  font-family: 'Plus Jakarta Sans', Arial, sans-serif;
  line-height: 1.4;
  min-height: 100vh;
}

.hushhawk-command-center * {
  box-sizing: border-box;
}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.icon :deep(svg), .brand-icon :deep(svg), .identity-logo :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

/* Sidebar Styling */
.sidebar {
  width: 210px !important;
  min-width: 210px !important;
  max-width: 210px !important;
  background: radial-gradient(circle at 85% 0%, #075199 0%, transparent 25%),
              linear-gradient(180deg, #08274a, #041a33 80%);
  border-right: 1px solid #23568a;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  box-sizing: border-box;
  z-index: 50;
}

.brand {
  height: 182px;
  min-height: 182px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: white !important;
  text-decoration: none;
  border-bottom: 1px solid #1b4a78;
  padding: 15px 8px 12px;
  text-align: center;
}

.brand-icon {
  display: block;
  width: 98px;
  height: 92px;
  filter: drop-shadow(0 3px 6px #001528);
}

.brand strong {
  font-size: 15px;
  font-weight: 850;
  line-height: 1.04;
  margin-top: 6px;
  color: #f8fafc;
  letter-spacing: 0.05em;
}

.brand small {
  font-size: 5.5px;
  letter-spacing: 1px;
  margin-top: 7px;
  color: #94a3b8;
}

.sidebar nav {
  padding: 8px 6px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  min-height: 34px;
  font-size: 11.5px;
  color: #e2e8f0;
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.sidebar nav a:hover {
  background-color: rgba(43, 111, 166, 0.25);
  color: #f8fafc;
}

.sidebar nav a.active {
  background: linear-gradient(130deg, rgba(255, 240, 171, 0.15), #d4ac47 55%, #a07d2d);
  border-color: #edce81;
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.4), 0 0 12px rgba(229, 198, 106, 0.25);
  color: #fff;
  font-weight: 700;
}

.sidebar nav .icon {
  width: 17px;
  height: 17px;
  color: #cbd5e1;
}

.sidebar nav a.active .icon {
  color: #ffffff;
}

.more-workspaces {
  margin: 6px 0 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 6px;
}

.more-workspaces summary {
  cursor: pointer;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #edcf7c;
  padding: 6px 10px;
  font-weight: 700;
}

.brand-bottom {
  text-align: center;
  padding: 10px;
  color: #e4d39b;
  border-top: 1px solid #1b4a78;
}

.brand-bottom p {
  font-size: 8.5px;
  letter-spacing: 1.5px;
  line-height: 1.6;
  margin: 0 0 4px;
  font-weight: 700;
}

.brand-bottom span {
  font-size: 7px;
  letter-spacing: 1px;
  color: #cbd5e1;
}

.brand-bottom small {
  display: block;
  font-size: 8px;
  margin-top: 6px;
  color: #64748b;
}

/* Workspace Layout */
.workspace {
  min-width: 0 !important;
  flex: 1 1 0% !important;
  background: radial-gradient(ellipse at 55% 0%, #123965, #061c34 65%, #04182d);
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

/* Topbar */
.topbar {
  position: relative;
  z-index: 1000;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 5px solid #0066cc;
  padding: 0 1.5rem;
  background: #04182d;
  box-sizing: border-box;
}

.mobile-menu {
  display: none;
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
}

.global-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  max-width: 520px;
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
}

.global-search input {
  color: #fff;
  background: transparent;
  border: 0;
  outline: none;
  font-size: 13px;
  width: 100%;
}

.global-search input::placeholder {
  color: #94a3b8;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  position: relative;
  z-index: 1001;
}

.live-clock {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.25);
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 6px #4ade80;
}

.clock-label {
  color: #64748b;
}

.btn-gold {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f8dfa0, #bc9240);
  border: 1px solid #e4c778;
  border-radius: 6px;
  color: #04182d;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.4);
}

.caret-icon {
  width: 14px;
  height: 14px;
  display: inline-flex;
}

.quick-add-wrap {
  position: relative;
  z-index: 1002;
}

.quick-add-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #06182c;
  border: 1px solid rgba(237, 207, 124, 0.45);
  border-radius: 8px;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  min-width: 235px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(237, 207, 124, 0.2);
  z-index: 99999;
}

.quick-add-menu a {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 1.15rem;
  color: #f8fafc;
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.quick-add-menu a:hover {
  background: rgba(237, 207, 124, 0.16);
  color: #edcf7c;
  padding-left: 1.35rem;
}

.qa-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  color: #edcf7c;
  flex-shrink: 0;
}

.notification-btn {
  position: relative;
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  padding: 4px;
}

.notif-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: #f87171;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 10px;
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: #06182c;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 10px;
  padding: 0.85rem;
  width: 320px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.95);
  z-index: 99999;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.notif-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.4rem;
  font-size: 0.85rem;
}

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.notif-item strong {
  font-size: 0.8rem;
  color: #f8fafc;
  display: block;
}

.notif-item p {
  font-size: 0.75rem;
  color: #94a3b8;
  margin: 0.15rem 0 0 0;
  line-height: 1.3;
}

.notif-item small {
  font-size: 0.65rem;
  color: #64748b;
}

.notif-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.notif-icon.green {
  background: rgba(74, 222, 128, 0.2);
  color: #4ade80;
}

.notif-icon.gold {
  background: rgba(237, 207, 124, 0.2);
  color: #edcf7c;
}

.notif-icon.cyan {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.user-identity {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #f8fafc;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.user-identity:hover {
  background: rgba(255, 255, 255, 0.06);
}

.identity-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.identity-text strong {
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.1;
  color: #ffffff;
  display: block;
}

.identity-text small {
  font-size: 10.5px;
  color: #94a3b8;
  font-weight: 500;
  margin-top: 1px;
  display: block;
}

.identity-caret {
  color: #94a3b8;
  font-size: 11px;
  margin-left: 2px;
}

/* Hero Header Banner */
.hero {
  min-height: 140px;
  padding: 1.25rem 2rem;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
  background-size: cover;
  background-position: center 50%;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  max-width: 100%;
  box-sizing: border-box;
}

.hero-copy {
  position: relative;
  z-index: 2;
  max-width: 52%;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.crumb-sep {
  opacity: 0.5;
}

.hero h1 {
  font-size: 38px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: -0.6px;
  margin: 0 0 6px 0;
  color: #ffffff;
}

.hero-copy > p {
  font-size: 15px;
  margin: 0;
  color: #cbd5e1;
}

.principles {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 14px;
}

.principles > span {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 8px;
  letter-spacing: 1.2px;
  color: #f1ead6;
  font-weight: 700;
}

.principles .icon {
  width: 15px;
  height: 15px;
  color: #edcf7c;
}

.jacksonville-calligraphy {
  position: absolute;
  left: auto;
  right: 150px;
  top: 18px;
  text-align: center;
  transform: rotate(-4deg);
  text-shadow: 0 3px 12px #001225;
  pointer-events: none;
  z-index: 1;
}

.jacksonville-calligraphy strong {
  display: block;
  font: italic 48px Georgia, serif;
  line-height: 1.1;
  color: #f2d482;
  opacity: 0.9;
}

.jacksonville-calligraphy span {
  font-size: 8.5px;
  letter-spacing: 1.2px;
  color: #cbd5e1;
}

.hero-motto {
  margin-left: auto;
  align-self: flex-end;
  border-top: 2px solid #edcf7c;
  padding-top: 6px;
  font-size: 8px;
  letter-spacing: 2px;
  line-height: 1.6;
  color: #cbd5e1;
  text-align: right;
  z-index: 2;
  flex-shrink: 0;
}

/* Toast Notification System */
.hushhawk-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #06182c;
  border: 1px solid #edcf7c;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.7);
  z-index: 999999;
  max-width: 420px;
}

.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 8px #4ade80;
  flex-shrink: 0;
}

.hushhawk-toast.warning .toast-dot {
  background: #facc15;
  box-shadow: 0 0 8px #facc15;
}

.hushhawk-toast.error .toast-dot {
  background: #f87171;
  box-shadow: 0 0 8px #f87171;
}

.toast-body {
  flex: 1;
}

.toast-body strong {
  display: block;
  font-size: 13px;
  color: #f8fafc;
  line-height: 1.2;
}

.toast-body p {
  margin: 3px 0 0 0;
  font-size: 11.5px;
  color: #94a3b8;
  line-height: 1.3;
}

.toast-close-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}

.toast-close-btn:hover {
  color: #f8fafc;
}

.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-slide-enter-from,
.toast-slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

/* Workspace View Wrapper */
.workspace-content {
  padding: 1.5rem;
  flex: 1;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* Footer */
.app-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  font-size: 8px;
  color: #64748b;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: auto;
}

.app-footer b {
  color: #475569;
  margin: 0 6px;
}

.font-mono {
  font-family: monospace;
}

.text-gold {
  color: #edcf7c;
}

.badge-sub {
  font-size: 0.7rem;
  color: #edcf7c;
}

@media (max-width: 1200px) {
  .jacksonville-calligraphy {
    display: none;
  }
}

@media (max-width: 860px) {
  .hushhawk-command-center {
    grid-template-columns: minmax(0, 1fr) !important;
  }
  .sidebar {
    display: none;
  }
  .nav-open .sidebar {
    display: flex;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    box-shadow: 10px 0 30px rgba(0, 0, 0, 0.8);
  }
  .mobile-menu {
    display: block;
  }
  .hero h1 {
    font-size: 24px;
  }
  .hero-motto {
    display: none;
  }
}
</style>