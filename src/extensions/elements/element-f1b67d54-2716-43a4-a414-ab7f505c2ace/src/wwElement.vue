<template>
  <section class="hushhawk-command-center hushhawk-gold gold-section" :class="{ 'nav-open': navOpen }">
    <!-- Mobile Backdrop -->
    <div v-if="navOpen" class="sidebar-backdrop" @click="navOpen = false"></div>

    <!-- Left Navigation Sidebar -->
    <aside class="sidebar">
      <button v-if="navOpen" class="sidebar-close-btn" @click="navOpen = false" title="Close Menu" aria-label="Close menu">✕</button>
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

        <details v-if="secondaryNavigation.length > 0" class="more-workspaces" open>
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

      <!-- Sidebar Quick Logout Button -->
      <div class="sidebar-logout-section" style="display: flex !important; justify-content: center !important; align-items: center !important; width: 100% !important; box-sizing: border-box !important;">
        <button
          type="button"
          class="sidebar-logout-btn"
          style="display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important; margin: 0 auto !important;"
          @click="handleLogout"
          title="Log out of HushHawk Command Center"
          aria-label="Log out"
        >
          <svg style="margin: 0 !important; flex-shrink: 0 !important;" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span style="margin: 0 !important; text-align: center !important; display: inline-block !important; line-height: 1 !important;">Log Out</span>
        </button>
      </div>

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

          <a href="/properties" class="btn-topbar-properties" @click="handleNav('/properties', $event)" title="Manage Properties &amp; Field Photos">
            <span class="icon" v-html="icons.house"></span>
            Properties
          </a>

          <div class="quick-add-wrap">
            <button class="btn-gold" @click.stop="isQuickAddOpen = !isQuickAddOpen" :aria-expanded="isQuickAddOpen">
              <span class="icon" v-html="icons.plus"></span>
              Add New
              <span class="caret-icon" v-html="icons.chevronDown"></span>
            </button>
            <div v-if="isQuickAddOpen" class="quick-add-menu" @click.stop>
              <a href="/vault" @click="handleNav('/vault', $event)">
                <span class="qa-icon" v-html="icons.file"></span> Media &amp; File Vault
              </a>
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

          <div style="position: relative;">
            <button class="notification-btn" @click.stop="isNotifOpen = !isNotifOpen" aria-label="Notifications" title="Escrow & Pipeline Alerts">
              <span class="icon" v-html="icons.bell"></span>
              <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
            </button>

            <!-- Notifications Modal / Dropdown -->
            <HushHawkNotificationDropdown 
              v-if="isNotifOpen" 
              :icons="icons" 
              @close="isNotifOpen = false" 
              @navigate="handleNav" 
            />
          </div>

          <!-- User Identity Menu & Logout Option -->
          <HushHawkThemeToggle />
          <div class="user-identity-wrap">
            <button
              type="button"
              class="user-identity"
              @click.stop="isUserMenuOpen = !isUserMenuOpen"
              title="Admin Session &amp; Account Options"
              :aria-expanded="isUserMenuOpen"
            >
              <span class="identity-logo" v-html="icons.logo"></span>
              <div class="identity-text">
                <strong>{{ activeUserName }}</strong>
                <small>{{ activeUserRoleName }}</small>
              </div>
              <span class="identity-caret">⌄</span>
            </button>

            <!-- User Dropdown Menu with One-Click Logout & Role Switcher -->
            <div v-if="isUserMenuOpen" class="user-menu-dropdown" @click.stop>
              <div class="user-menu-header">
                <span class="user-menu-badge" :class="{ 'restricted-mode': !activeUserIsAdmin }">
                  {{ activeUserIsAdmin ? 'SUPER ADMIN' : 'ROLE RESTRICTED' }}
                </span>
                <strong class="user-menu-name">{{ activeUserName }}</strong>
                <span class="user-menu-email">{{ activeUserEmail }}</span>
                <span class="user-menu-status">
                  <span class="status-indicator">●</span> {{ activeUserRoleName }} ({{ authorizedNavigation.length }} Workspaces)
                </span>
              </div>

              <!-- Quick Switch Role / Account Tester -->
              <div v-if="demoTeamAccounts && demoTeamAccounts.length > 0" class="user-switcher-section">
                <span class="switcher-title">SWITCH / TEST ACTIVE ROLE ACCESS</span>
                <div class="switcher-list">
                  <button 
                    v-for="u in demoTeamAccounts.slice(0, 5)" 
                    :key="u.email" 
                    type="button" 
                    class="switcher-item-btn" 
                    :class="{ active: activeUserEmail === u.email }"
                    @click="switchActiveAccount(u)"
                    :title="`Switch session to ${u.name} (${u.roleName || u.role})`"
                  >
                    <span class="switch-avatar" :style="{ background: u.avatarBg || '#1e3a5f' }">
                      {{ u.initials || 'TM' }}
                    </span>
                    <div class="switch-info">
                      <strong>{{ u.name }}</strong>
                      <small>{{ u.roleName || u.role }} · {{ (u.allowedCount || u.permissions?.length || 23) }} sections</small>
                    </div>
                  </button>
                </div>
              </div>

              <div class="user-menu-divider"></div>

              <a href="/settings" class="user-menu-item" @click="handleNav('/settings', $event); isUserMenuOpen = false;">
                <span class="menu-icon" v-html="icons.settings"></span>
                <span>System Configuration</span>
              </a>

              <a href="/team" class="user-menu-item" @click="handleNav('/team', $event); isUserMenuOpen = false;">
                <span class="menu-icon" v-html="icons.users"></span>
                <span>Team &amp; Access Controls</span>
              </a>

              <div class="user-menu-divider"></div>

              <button type="button" class="btn-menu-logout" @click="handleLogout">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Log Out &amp; Lock Terminal</span>
              </button>
            </div>
          </div>
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

      <!-- Active Section View Component with Smooth Transitions -->
      <div class="workspace-content">
        <!-- Restricted Section Alert if user lacks clearance -->
        <div v-if="!isCurrentSectionAuthorized" class="access-restricted-card">
          <div class="restricted-shield" v-html="icons.shield"></div>
          <h2>Workspace Access Restricted</h2>
          <span class="restricted-badge">ROLE AUTHORIZATION REQUIRED</span>
          <p class="restricted-message">
            Your current assigned role <strong>{{ activeUserRoleName }}</strong> does not have clearance to view or execute operations inside the <strong>{{ currentSectionMeta.title }}</strong> workspace.
          </p>
          <div class="restricted-meta-box">
            <div class="meta-item">
              <span class="meta-label">Active User</span>
              <strong>{{ activeUserName }} ({{ activeUserEmail }})</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Assigned Role</span>
              <strong class="text-gold">{{ activeUserRoleName }}</strong>
            </div>
            <div class="meta-item">
              <span class="meta-label">Permitted Workspaces</span>
              <strong>{{ authorizedNavigation.length }} of {{ navigation.length }} Workspaces</strong>
            </div>
          </div>
          <div class="restricted-actions">
            <button class="btn-gold" @click="handleNav(firstAuthorizedPath, $event)">
              ← Return to Authorized Workspace ({{ firstAuthorizedName }})
            </button>
          </div>
        </div>

        <div v-else class="hushhawk-view-container">
          <component
            :is="currentViewComponent"
            :key="activeSectionKey"
            :content="content"
          />
        </div>
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
import HushHawkThemeToggle from '@/_front/components/HushHawkThemeToggle.vue';
import "@/assets/css/hushhawk-gold.css";
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
import VaultView from './views/VaultView.vue';
import HushHawkNotificationDropdown from '@/_front/components/HushHawkNotificationDropdown.vue';
import { useNotifications } from '@/_common/use/useNotifications.js';

const notifStore = useNotifications();

export default {
  name: 'HushHawkMasterShell',
  components: {
    HushHawkThemeToggle,
    HushHawkNotificationDropdown,
    PropertiesView,
    VaultView,
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
      isUserMenuOpen: false,
      activeUser: null,
      demoTeamAccounts: [],
      currentTime: '09:42 AM',
      timeInterval: null,
      selectedSection: null,
      toast: { show: false, title: '', message: '', type: 'info' },
      toastTimer: null
    };
  },
  computed: {
    notifications() {
      return notifStore.notifications.value;
    },
    unreadCount() {
      return notifStore.unreadCount.value;
    },
    activeUserName() {
      return this.activeUser?.name || 'Main Administrator';
    },
    activeUserRole() {
      return this.activeUser?.role || 'SUPER_ADMIN';
    },
    activeUserRoleName() {
      if (this.activeUser?.roleName) return this.activeUser.roleName;
      if (this.activeUser?.role === 'SUPER_ADMIN' || !this.activeUser) return 'Superadmin & Managing Partner';
      return this.activeUser?.role || 'Specialist';
    },
    activeUserEmail() {
      return this.activeUser?.email || 'admin@hushhawk.com';
    },
    activeUserIsAdmin() {
      if (!this.activeUser) return true;
      if (this.activeUser.isAdmin === true) return true;
      if (this.activeUser.role === 'SUPER_ADMIN' || this.activeUser.email === 'admin@hushhawk.com') return true;
      return false;
    },
    authorizedNavigation() {
      // Super Admin has clearance for all 23 workspaces
      if (this.activeUserIsAdmin) {
        return this.navigation;
      }
      const perms = Array.isArray(this.activeUser?.permissions) ? this.activeUser.permissions : [];
      if (!perms.length) {
        return this.navigation;
      }
      return this.navigation.filter(item => {
        const key = item.path.replace('/', '');
        return perms.includes(item.path) || perms.includes(key);
      });
    },
    primaryNavigation() {
      const auth = this.authorizedNavigation;
      if (auth.length <= 11) return auth;
      return auth.slice(0, 10);
    },
    secondaryNavigation() {
      const auth = this.authorizedNavigation;
      if (auth.length <= 11) return [];
      return auth.slice(10);
    },
    isCurrentSectionAuthorized() {
      if (this.activeUserIsAdmin) return true;
      const perms = this.activeUser?.permissions;
      if (!Array.isArray(perms) || !perms.length) return true;
      const path = this.activePath;
      const key = this.activeSectionKey;
      return perms.includes(path) || perms.includes('/' + key) || perms.includes(key);
    },
    firstAuthorizedPath() {
      const auth = this.authorizedNavigation;
      return (auth && auth.length > 0) ? auth[0].path : '/home';
    },
    firstAuthorizedName() {
      const auth = this.authorizedNavigation;
      return (auth && auth.length > 0) ? auth[0].name : 'Dashboard';
    },
    activeSectionKey() {
      // 0. Explicit in-app user navigation state
      if (this.selectedSection) {
        return this.selectedSection;
      }

      // 1. Browser path detection (takes precedence over default content props)
      if (typeof window !== 'undefined' && window.location) {
        const path = window.location.pathname.toLowerCase().replace(/\/$/, '');
        if (path.includes('vault') || path.includes('media')) return 'vault';
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

      // 2. Explicit prop check fallback
      const prop = this.content?.workspacePage;
      if (prop) {
        return prop;
      }

      return 'properties';
    },
    activePath() {
      return '/' + this.activeSectionKey;
    },
    currentViewComponent() {
      const map = {
        'properties': 'PropertiesView',
        'vault': 'VaultView',
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
        'vault': {
          title: 'Media & File Vault',
          subtitle: 'Central Institutional Asset & Document Storage',
          tagline: 'Encrypted AWS S3 Private Vault with Drag-and-Drop Ingestion, Secure Downloads, and Direct Property Linkage.'
        },
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
      const skylineUrl = this.content?.skyline || '/images/jacksonville-skyline-opt.jpg';
      return {
        backgroundImage: `var(--hh-hero-scrim, linear-gradient(90deg, #03172fee 0%, #03172fc9 35%, #06244144 65%, #011a3440)), url("${skylineUrl}"), var(--hh-hero-fallback)`
      };
    }
  },
  mounted() {
    if (typeof window !== 'undefined') {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        const navEl = document.querySelector('.sidebar nav');
        if (navEl) navEl.scrollTop = 0;
      });
    }
    notifStore.initNotificationPolling();
    this.updateClock();
    this.timeInterval = setInterval(this.updateClock, 30000);
    this.loadDemoAccounts();
    this.clickOutsideHandler = (e) => {
      if (!e.target.closest('.quick-add-wrap')) {
        this.isQuickAddOpen = false;
      }
      if (!e.target.closest('.notif-dropdown') && !e.target.closest('.notification-btn') && !e.target.closest('.hushhawk-notif-dropdown')) {
        this.isNotifOpen = false;
      }
      if (!e.target.closest('.user-identity-wrap')) {
        this.isUserMenuOpen = false;
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('click', this.clickOutsideHandler);
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = window.sessionStorage.getItem('hushhawk_session') || window.localStorage.getItem('hushhawk_session');
        if (raw) {
          this.activeUser = JSON.parse(raw);
        }
      } catch (err) {
        console.warn('Session parse error:', err);
      }
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
        } else if (typeof window !== 'undefined' && window.location) {
          const path = window.location.pathname.toLowerCase().replace(/\/$/, '').replace(/^\//, '');
          const validSections = [
            'properties', 'vault', 'dispositions', 'cash-buyers', 'marketing', 'county-data',
            'skip-tracing', 'contracts', 'follow-ups', 'analytics',
            'team', 'settings', 'communications', 'tasks', 'calendar',
            'contacts', 'automations', 'facebook-leads', 'direct-mail', 'deal-analyzer'
          ];
          if (validSections.includes(path)) {
            this.selectedSection = path;
          }
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
    async loadDemoAccounts() {
      try {
        const res = await fetch('/api/v1/team');
        const data = await res.json();
        if (data && data.members) {
          this.demoTeamAccounts = data.members;
        }
      } catch (e) {
        console.warn('Failed to load team accounts:', e.message);
      }
    },
    switchActiveAccount(account) {
      const prevActor = this.activeUser?.name || 'Operator';
      this.activeUser = account;
      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('hushhawk_session', JSON.stringify(account));
          window.localStorage.setItem('hushhawk_session', JSON.stringify(account));
        } catch (e) {}
      }
      // Record role switch in immutable audit ledger
      fetch('/api/v1/audit/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: account.name || account.email,
          action: 'ROLE_SWITCH',
          entityType: 'AUTH',
          entityId: account.id || account.user_id,
          diff: { switchedTo: account.name, role: account.roleName || account.role, previousActor: prevActor }
        })
      }).catch(() => null);

      this.isUserMenuOpen = false;
      this.showToast('Role Switched', `Active session switched to ${account.name} (${account.roleName || account.role})`, 'success');
      if (!this.isCurrentSectionAuthorized) {
        this.handleNav(this.firstAuthorizedPath);
      }
    },
    handleNav(path, e) {
      this.isQuickAddOpen = false;
      this.navOpen = false;
      const section = path.replace(/^\//, '');
      const validSections = [
        'properties', 'vault', 'dispositions', 'cash-buyers', 'marketing', 'county-data',
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
      } else {
        if (e) e.preventDefault();
        if (typeof window !== 'undefined') {
          window.location.href = path;
        }
      }
    },
    showToast(title, message, type = 'info') {
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toast = { show: true, title, message, type };
      this.toastTimer = setTimeout(() => {
        this.toast.show = false;
      }, 3500);
    },
    handleLogout() {
      if (typeof window !== 'undefined') {
        const currentUser = this.activeUser || {};
        fetch('/api/v1/audit/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actor: currentUser.name || currentUser.email || 'Authorized Operator',
            action: 'USER_LOGOUT',
            entityType: 'AUTH',
            entityId: currentUser.id || currentUser.user_id || 'system-user',
            diff: { email: currentUser.email, role: currentUser.role }
          })
        }).catch(() => null);

        if (typeof window.hushhawkLogout === 'function') {
          window.hushhawkLogout();
          return;
        }
        try {
          window.sessionStorage.removeItem('hushhawk_session');
          window.localStorage.removeItem('hushhawk_session');
          window.localStorage.removeItem('ww-auth-session');
          window.localStorage.removeItem('hushhawk_auth_token');
        } catch (e) {
          console.error('Logout storage clear error:', e);
        }
        window.location.href = '/login';
      }
    }
  }
};
</script>

<style scoped>
.hushhawk-command-center {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
  background: #04182d;
  color: #f8fafc;
  font-family: 'Plus Jakarta Sans', Arial, sans-serif;
  line-height: 1.4;
  min-height: 100vh;
  position: relative;
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

.hushhawk-logo-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.45));
}

.hushhawk-logo-spinner :deep(svg) {
  width: 48px;
  height: 48px;
}

.hushhawk-logo-spinner-xs {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.hushhawk-logo-spinner-xs :deep(svg) {
  width: 18px;
  height: 18px;
}

/* Sidebar Styling - Locked & Fixed on Viewport (Executive Luxury Gold Edition) */
.sidebar {
  width: 220px !important;
  min-width: 220px !important;
  max-width: 220px !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  bottom: 0 !important;
  height: 100vh !important;
  max-height: 100vh !important;
  display: flex !important;
  flex-direction: column !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  scrollbar-width: thin !important;
  scrollbar-color: rgba(212, 175, 55, 0.4) transparent !important;
  box-sizing: border-box !important;
  z-index: 1000 !important;
  background: var(--hh-sidebar, linear-gradient(40deg, transparent 40%, rgba(212, 175, 55, 0.15) 47%, rgba(253, 230, 138, 0.45) 50%, rgba(212, 175, 55, 0.15) 53%, transparent 60%),
    linear-gradient(35deg, transparent 65%, rgba(212, 175, 55, 0.1) 72%, rgba(253, 230, 138, 0.35) 75%, rgba(212, 175, 55, 0.1) 78%, transparent 85%),
    linear-gradient(180deg, #07111e 0%, #030812 60%, #02050b 100%)) !important;
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(212, 175, 55, 0.25) !important;
  border-left: 2px solid rgba(212, 175, 55, 0.45) !important;
  box-shadow: 6px 0 28px rgba(0, 0, 0, 0.7);
}

.sidebar::-webkit-scrollbar {
  width: 4px;
}
.sidebar::-webkit-scrollbar-track {
  background: rgba(4, 24, 45, 0.3);
}
.sidebar::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.35);
  border-radius: 4px;
}
.sidebar::-webkit-scrollbar-thumb:hover {
  background: #f5cf72;
}

.sidebar::after {
  content: '';
  position: absolute;
  bottom: 55px;
  left: 50%;
  transform: translateX(-50%);
  width: 130px;
  height: 130px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36' fill='none'%3E%3Cpath d='M12 9.5L14 13.5L18 7.5L22 13.5L24 9.5L25 15.5H11L12 9.5Z' fill='%23D4AF37'/%3E%3Cpath d='M6 14.5C10 16 14 19 16.5 22L13 23C9 20 6.5 17 6 14.5Z' fill='%23D4AF37'/%3E%3Cpath d='M30 14.5C26 16 22 19 19.5 22L23 23C27 20 29.5 17 30 14.5Z' fill='%23D4AF37'/%3E%3Cpath d='M18 14L15.5 19.5L18 29L20.5 19.5L18 14Z' fill='%23D4AF37'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  opacity: 0.16;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.5));
  z-index: 1;
}

.brand {
  flex-shrink: 0 !important;
  height: auto !important;
  min-height: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-direction: column !important;
  color: white !important;
  text-decoration: none !important;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2) !important;
  padding: var(--hh-brand-padding, 14px 8px 10px) !important;
  text-align: center !important;
  background: var(--hh-nav-brand, linear-gradient(180deg, rgba(212, 175, 55, 0.12), rgba(4, 18, 45, 0.4))) !important;
}

.brand-icon {
  display: block;
  width: 86px;
  height: 80px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.8));
}

.brand strong {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif !important;
  font-size: var(--hh-brand-name, 13px) !important;
  font-weight: var(--hh-brand-weight, 850) !important;
  line-height: 1.08 !important;
  margin-top: 6px !important;
  color: var(--hh-nav-text, #fff5e2) !important;
  letter-spacing: var(--hh-brand-tracking, 0.14em) !important;
  text-transform: uppercase !important;
}

.brand small {
  font-size: 6.5px !important;
  letter-spacing: 1.2px !important;
  margin-top: 5px !important;
  color: #d4af37 !important;
  font-weight: 600 !important;
}

.sidebar nav {
  padding: 10px 8px !important;
  flex: none !important;
  min-height: 0 !important;
  height: auto !important;
  overflow-y: visible !important;
  overflow-x: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 0 !important;
  position: relative !important;
  z-index: 2 !important;
}

.sidebar nav::-webkit-scrollbar {
  width: 4px;
}
.sidebar nav::-webkit-scrollbar-track {
  background: rgba(4, 24, 45, 0.3);
}
.sidebar nav::-webkit-scrollbar-thumb {
  background: rgba(212, 175, 55, 0.35);
  border-radius: 3px;
}
.sidebar nav::-webkit-scrollbar-thumb:hover {
  background: #f5cf72;
}

.sidebar nav a {
  display: flex !important;
  align-items: center !important;
  gap: 11px !important;
  padding: 9px 12px !important;
  min-height: 38px !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  color: var(--hh-nav-text, #f8fafc) !important;
  text-decoration: none !important;
  border-radius: 8px !important;
  border: 1px solid transparent !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  margin: 1px 2px !important;
  box-sizing: border-box !important;
}

.sidebar nav a .icon,
.sidebar nav .icon {
  width: 17px !important;
  height: 17px !important;
  color: #eac16a !important;
  flex-shrink: 0 !important;
}

.sidebar nav a .icon svg,
.sidebar nav .icon svg {
  width: 17px !important;
  height: 17px !important;
  stroke: #eac16a !important;
}

.sidebar nav a:hover {
  background: rgba(212, 175, 55, 0.1) !important;
  color: #ffffff !important;
  border-color: rgba(212, 175, 55, 0.25) !important;
  transform: translateX(2px);
}

.sidebar nav a:hover .icon,
.sidebar nav a:hover .icon svg {
  color: #fde68a !important;
  stroke: #fde68a !important;
}

.sidebar nav a.active {
  background: var(--hh-nav-active-surface, linear-gradient(180deg, #744d1e, #3e260c)) !important;
  border: 1.5px solid #dfa745 !important;
  border-radius: 11px !important;
  color: var(--hh-nav-active-ink, #ffffff) !important;
  font-weight: 700 !important;
  box-shadow: 
    0 0 14px rgba(223, 167, 69, 0.45),
    inset 0 1px 2px rgba(255, 255, 255, 0.4),
    inset 0 -1px 2px rgba(0, 0, 0, 0.5) !important;
  padding: 8px 12px !important;
  margin: 3px 2px !important;
}

.sidebar nav a.active .icon,
.sidebar nav a.active .icon svg {
  color: #fde68a !important;
  stroke: #fde68a !important;
  filter: drop-shadow(0 0 4px rgba(253, 230, 138, 0.7));
}

.more-workspaces {
  margin: 10px 0 0 0 !important;
  border-top: 1px solid rgba(212, 175, 55, 0.15) !important;
  padding-top: 8px !important;
}

.more-workspaces summary {
  cursor: pointer !important;
  font-size: 10px !important;
  font-weight: 850 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
  color: #eac16a !important;
  padding: 8px 12px !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.sidebar-logout-section {
  flex-shrink: 0 !important;
  padding: var(--hh-sidebar-logout-padding) !important;
  border-top: 1px solid rgba(212, 175, 55, 0.15) !important;
  margin-top: auto !important;
  position: relative !important;
  z-index: 3 !important;
}

.sidebar-logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  width: 100%;
  height: 35px;
  min-height: 35px;
  padding: 0 14px;
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  color: rgba(252, 165, 165, 0.75);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
  white-space: nowrap;
  box-sizing: border-box;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-logout-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.45);
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.2);
}

.sidebar-logout-btn:active {
  transform: scale(0.985);
}

.sidebar-logout-btn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  stroke: rgba(252, 165, 165, 0.75);
  transition: stroke 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-logout-btn:hover svg {
  stroke: #ffffff;
}

.brand-bottom {
  flex-shrink: 0;
  text-align: center;
  padding: 8px 10px;
  color: rgba(228, 211, 155, 0.8);
  border-top: 1px solid rgba(212, 175, 55, 0.12);
}

.brand-bottom p {
  font-size: 7.5px;
  letter-spacing: 1.5px;
  line-height: 1.6;
  margin: 0 0 3px;
  font-weight: 700;
}

.brand-bottom span {
  font-size: 6.5px;
  letter-spacing: 1px;
  color: #94a3b8;
}

.brand-bottom small {
  display: block;
  font-size: 7px;
  margin-top: 5px;
  color: #64748b;
}

/* Workspace Layout */
.workspace {
  margin-left: 220px !important;
  width: calc(100% - 220px) !important;
  min-width: 0 !important;
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% 0%, rgba(10, 79, 142, 0.18) 0%, transparent 60%),
              linear-gradient(180deg, #030f1e 0%, #040f1d 100%);
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
}

/* Topbar */
.topbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
  border-left: 3px solid #d4af37;
  padding: 0 1.5rem;
  background: linear-gradient(90deg, rgba(4, 24, 45, 0.98) 0%, rgba(6, 30, 56, 0.98) 100%);
  backdrop-filter: blur(12px);
  box-shadow: 0 1px 20px rgba(0, 0, 0, 0.4);
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.global-search:focus-within {
  border-color: rgba(212, 175, 55, 0.4);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.08);
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
  background: rgba(212, 175, 55, 0.06);
  padding: 0.3rem 0.65rem;
  border-radius: 20px;
  border: 1px solid rgba(212, 175, 55, 0.15);
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

.btn-topbar-properties {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(212, 175, 55, 0.07);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 8px;
  color: #edcf7c;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}
.btn-topbar-properties:hover {
  background: rgba(212, 175, 55, 0.14);
  border-color: rgba(212, 175, 55, 0.5);
  color: #fff;
  box-shadow: 0 0 12px rgba(212, 175, 55, 0.2);
}
.btn-topbar-properties .icon {
  width: 14px;
  height: 14px;
  display: inline-flex;
}

.btn-gold {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #f8dfa0 0%, #d4af37 50%, #bc9240 100%);
  border: 1px solid #e4c778;
  border-radius: 8px;
  color: #04182d;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(212, 175, 55, 0.25);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-gold:hover {
  transform: translateY(-1px);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.4), 0 6px 20px rgba(212, 175, 55, 0.4);
}

.btn-gold:active {
  transform: translateY(0);
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
  background: rgba(4, 18, 45, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
  min-width: 235px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(212, 175, 55, 0.1);
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.quick-add-menu a:hover {
  background: rgba(212, 175, 55, 0.08);
  color: #f5cf72;
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
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  color: #cbd5e1;
  cursor: pointer;
  padding: 5px 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-btn:hover {
  background: rgba(212, 175, 55, 0.08);
  border-color: rgba(212, 175, 55, 0.2);
  color: #f5cf72;
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
  background: rgba(4, 18, 45, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  padding: 0.85rem;
  width: 320px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(212, 175, 55, 0.1);
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.notif-item:hover {
  background: rgba(212, 175, 55, 0.04);
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

.user-identity-wrap {
  position: relative;
}

.user-identity {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #f8fafc;
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1.5px solid rgba(212, 175, 55, 0.5);
  font-family: inherit;
  text-align: left;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-identity:hover {
  background: rgba(212, 175, 55, 0.06);
  border-color: rgba(212, 175, 55, 0.7);
}

.user-menu-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 250px;
  background: rgba(4, 18, 45, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(212, 175, 55, 0.1);
  z-index: 1000;
  padding: 10px;
  animation: fadeInMenu 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInMenu {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.user-menu-header {
  padding: 6px 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.user-menu-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #04182d;
  background: #f5cf72;
  padding: 2px 6px;
  border-radius: 4px;
  margin-bottom: 3px;
}

.user-menu-name {
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.2;
}

.user-menu-email {
  color: #94a3b8;
  font-size: 11px;
}

.user-menu-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10px;
  color: #34d399;
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-top: 4px;
}

.status-indicator {
  font-size: 8px;
  color: #34d399;
  animation: pulseStatus 2s infinite;
}

@keyframes pulseStatus {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.user-menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 0;
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px;
  font-size: 12px;
  color: #cbd5e1;
  text-decoration: none;
  border-radius: 5px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-menu-item:hover {
  background: rgba(212, 175, 55, 0.08);
  color: #f5cf72;
}

.user-menu-item .menu-icon {
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  color: #94a3b8;
}

.btn-menu-logout {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  color: #fca5a5;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 2px;
}

.btn-menu-logout:hover {
  background: #dc2626;
  border-color: #ef4444;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(220, 38, 38, 0.35);
}

.btn-menu-logout svg {
  flex-shrink: 0;
  stroke: currentColor;
}

.identity-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1.5px solid rgba(212, 175, 55, 0.5);
  background: rgba(212, 175, 55, 0.08);
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
  min-height: 130px;
  padding: 1.25rem 2rem;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
  background-size: cover;
  background-position: center 50%;
  border-bottom: 1px solid rgba(212, 175, 55, 0.12);
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
  color: rgba(212, 175, 55, 0.7);
  margin-bottom: 0.25rem;
}

.crumb-sep {
  opacity: 0.5;
}

.hero h1 {
  font-size: 34px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -0.6px;
  margin: 0 0 6px 0;
  color: #ffffff;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
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
  background: rgba(212, 175, 55, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 20px;
  padding: 3px 10px;
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
  background: rgba(4, 24, 45, 0.98);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(212, 175, 55, 0.1);
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
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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

.hushhawk-view-container {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  animation: hushhawkFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes hushhawkFadeIn {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hushhawk-view-fade-enter-active,
.hushhawk-view-fade-leave-active {
  transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.hushhawk-view-fade-enter-from {
  opacity: 0;
  transform: translateY(3px);
}

.hushhawk-view-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

/* Workspace View Wrapper */
.workspace-content {
  padding: 1.25rem 1.5rem;
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
  border-top: 1px solid rgba(212, 175, 55, 0.1);
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

.sidebar-backdrop, .sidebar-close-btn {
  display: none;
}

@media (max-width: 860px) {
  .sidebar-backdrop {
    display: block !important;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(4px);
    z-index: 1999;
  }
  .sidebar-close-btn {
    display: flex !important;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 10px;
    right: 10px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    border: none;
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    z-index: 10;
  }
  .sidebar {
    display: none !important;
    left: -240px !important;
  }
  .nav-open .sidebar {
    display: flex !important;
    position: fixed !important;
    left: 0 !important;
    top: 0 !important;
    bottom: 0 !important;
    z-index: 2000 !important;
    width: 240px !important;
    max-width: 80vw !important;
    box-shadow: 10px 0 40px rgba(0, 0, 0, 0.85) !important;
  }
  .workspace {
    margin-left: 0 !important;
    width: 100% !important;
  }
  .mobile-menu {
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
  }
  .topbar {
    padding: 0 10px !important;
    height: 52px !important;
    gap: 8px !important;
    border-left: none !important;
    overflow: visible !important;
    max-width: 100vw !important;
    box-sizing: border-box !important;
  }
  .topbar-right {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    margin-left: auto !important;
    flex-shrink: 0 !important;
  }
  .live-clock,
  .btn-topbar-properties {
    display: none !important;
  }
  .user-identity-wrap {
    position: relative !important;
    flex-shrink: 0 !important;
  }
  .user-identity {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    border-radius: 50% !important;
    padding: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
    background: rgba(212, 175, 55, 0.16) !important;
    border: 1.5px solid #d4af37 !important;
    box-sizing: border-box !important;
    cursor: pointer !important;
  }
  .user-identity .identity-text,
  .user-identity .identity-caret {
    display: none !important;
  }
  .user-identity .identity-logo {
    width: 20px !important;
    height: 20px !important;
    border-radius: 50% !important;
    box-shadow: none !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  .user-identity .identity-logo svg {
    width: 18px !important;
    height: 18px !important;
  }
  .user-menu-dropdown {
    position: fixed !important;
    top: 56px !important;
    right: 10px !important;
    left: auto !important;
    width: min(290px, calc(100vw - 20px)) !important;
    max-width: calc(100vw - 20px) !important;
    z-index: 10001 !important;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85) !important;
  }
  .quick-add-menu {
    position: fixed !important;
    top: 56px !important;
    right: 10px !important;
    width: min(280px, calc(100vw - 20px)) !important;
    z-index: 10001 !important;
  }
  .btn-gold {
    padding: 6px 10px !important;
    font-size: 11px !important;
    white-space: nowrap !important;
    flex-shrink: 0 !important;
  }
  .global-search {
    max-width: 180px !important;
    padding: 4px 8px !important;
  }
  .global-search input {
    font-size: 13px !important;
  }
  .hero {
    padding: 14px 10px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    min-height: auto !important;
  }
  .hero h1 {
    font-size: 22px !important;
  }
  .hero-motto,
  .jacksonville-calligraphy {
    display: none !important;
  }
  .principles {
    flex-wrap: wrap !important;
    gap: 8px !important;
    font-size: 10px !important;
  }
}

@media (max-width: 480px) {
  .global-search {
    display: none !important;
  }
  .btn-gold .caret-icon {
    display: none !important;
  }
}

/* ========================================================================== */
/* Access Restricted Institutional Card */
/* ========================================================================== */
.access-restricted-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 24px;
  max-width: 680px;
  margin: 40px auto;
  background: linear-gradient(135deg, rgba(14, 30, 54, 0.95), rgba(7, 20, 38, 0.98));
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 24px rgba(245, 158, 11, 0.15);
}

.restricted-shield {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.15);
  border: 2px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
  margin-bottom: 18px;
}

.access-restricted-card h2 {
  font-size: 24px;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
}

.restricted-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.8px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
  margin-bottom: 14px;
}

.restricted-message {
  font-size: 14px;
  color: #cbd5e1;
  max-width: 520px;
  line-height: 1.5;
  margin: 0 0 20px 0;
}

.restricted-meta-box {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  width: 100%;
  max-width: 480px;
  padding: 14px;
  background: rgba(5, 17, 33, 0.8);
  border: 1px solid #1a3c63;
  border-radius: 8px;
  margin-bottom: 24px;
  text-align: left;
}

.restricted-meta-box .meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
}

.restricted-meta-box .meta-label {
  color: #8da6c4;
}

.restricted-actions {
  display: flex;
  gap: 12px;
}

/* User Switcher Dropdown Styling */
.user-menu-badge.restricted-mode {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
}

.user-switcher-section {
  padding: 10px 14px;
  background: rgba(5, 17, 33, 0.6);
  border-top: 1px solid #1a3c63;
  border-bottom: 1px solid #1a3c63;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.switcher-title {
  font-size: 9.5px;
  font-weight: 800;
  color: #8da6c4;
  letter-spacing: 0.5px;
}

.switcher-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
}

.switcher-item-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: rgba(10, 28, 54, 0.5);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}

.switcher-item-btn:hover {
  background: rgba(30, 58, 95, 0.6);
  border-color: #38bdf8;
}

.switcher-item-btn.active {
  background: rgba(212, 168, 83, 0.18);
  border-color: rgba(212, 168, 83, 0.4);
}

.switch-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.switch-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.switch-info strong {
  font-size: 12px;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.switch-info small {
  font-size: 10px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>