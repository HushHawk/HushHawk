<template>
<section class="hushhawk-command-center hushhawk-gold dashboard-gold" :class="{ 'nav-open': navOpen }">
  <!-- Mobile Backdrop -->
  <div v-if="navOpen" class="sidebar-backdrop" @click="navOpen = false"></div>

  <!-- Main Workspace -->
  <div class="workspace">
    <div class="topbar">
      <button class="mobile-menu" aria-label="Open navigation" @click="navOpen = !navOpen" :aria-expanded="navOpen">
        <span v-html="icons.sliders"></span>
      </button>

      <a class="masthead-brand" href="/home" @click="handleNav('/home', $event)">
        <img src="/icons/brand/hushhawk-emblem.svg" alt="" width="40" height="40">
        <span>HushHawk<small>Real estate intelligence</small></span>
      </a>
      <label class="global-search">
      <span class="icon" v-html="icons.search"></span>
      <input
        v-model="query"
        :disabled="isEditing"
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

      <a href="/properties" class="btn-topbar-properties" @click="guard" title="Manage Properties &amp; Field Photos">
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
          <a href="/properties" @click="guard">
            <span class="qa-icon" v-html="icons.house"></span> View Properties &amp; Photos
          </a>
          <a href="/dispositions" @click="guard">
            <span class="qa-icon" v-html="icons.badgeDollar"></span> Add Contract to Dispo
          </a>
          <a href="/cash-buyers" @click="guard">
            <span class="qa-icon" v-html="icons.users"></span> Add Cash Buyer
          </a>
          <a href="/contracts" @click="guard">
            <span class="qa-icon" v-html="icons.file"></span> Create New Contract
          </a>
          <a href="/follow-ups" @click="guard">
            <span class="qa-icon" v-html="icons.clock"></span> Schedule Follow-Up
          </a>
          <a href="/tasks" @click="guard">
            <span class="qa-icon" v-html="icons.tasks"></span> Add Task Milestone
          </a>
          <a href="/deal-analyzer" @click="guard">
            <span class="qa-icon" v-html="icons.calculator"></span> Underwrite New Deal
          </a>
          <a href="/team" @click="guard">
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
          @navigate="guard" 
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
            <small>{{ activeUserRole }}</small>
          </div>
          <span class="identity-caret">⌄</span>
        </button>

        <!-- User Dropdown Menu with One-Click Logout -->
        <div v-if="isUserMenuOpen" class="user-menu-dropdown" @click.stop>
          <div class="user-menu-header">
            <span class="user-menu-badge">MAIN ADMIN</span>
            <strong class="user-menu-name">{{ activeUserName }}</strong>
            <span class="user-menu-email">{{ activeUserEmail }}</span>
            <span class="user-menu-status">
              <span class="status-indicator">●</span> SESSION ACTIVE
            </span>
          </div>

          <div class="user-menu-divider"></div>

          <a href="/settings" class="user-menu-item" @click="guard($event); isUserMenuOpen = false;">
            <span class="menu-icon" v-html="icons.settings"></span>
            <span>System Configuration</span>
          </a>

          <a href="/team" class="user-menu-item" @click="guard($event); isUserMenuOpen = false;">
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
  <div class="dashboard-body">
  <!-- Left Navigation Sidebar -->
  <aside class="sidebar">
    <button v-if="navOpen" class="sidebar-close-btn" @click="navOpen = false" title="Close Menu" aria-label="Close menu">✕</button>
    <a href="/home" class="brand" @click="handleNav('/home', $event)">
      <span class="brand-icon" v-html="icons.logo"></span>
      <strong>HUSHHAWK<br>INTELLIGENCE</strong>
      <small>PEOPLE • PROPERTIES • PROSPERITY</small>
    </a>

    <nav aria-label="HushHawk navigation">
      <a
        v-for="item in primaryNavigation"
        :key="item.path"
        :href="item.path"
        :aria-current="item.path === '/home' ? 'page' : undefined"
        :class="{ active: item.path === '/home' }"
        @click="handleNav(item.path, $event)"
      >
        <span class="icon" v-html="icons[item.icon] || icons.house"></span>
        {{ item.name }}
      </a>

      <details class="more-workspaces">
        <summary>More Workspaces</summary>
        <a
          v-for="item in secondaryNavigation"
          :key="item.path"
          :href="item.path"
          :aria-current="item.path === '/home' ? 'page' : undefined"
          :class="{ active: item.path === '/home' }"
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

    <div class="sidebar-foil" aria-hidden="true"><img src="/icons/brand/hushhawk-emblem.svg" alt=""></div>

  </aside>

  <main class="command">
    <div class="dashboard-columns">
      <div class="dashboard-main">
        <header class="dashboard-heading">
          <div>
            <p>Jacksonville operations</p>
            <h1>HushHawk <em>Command Center</em></h1>
          </div>
          <div class="dashboard-status-actions">
            <span class="dashboard-location"><span class="icon" v-html="icons.house"></span> Duval / Clay</span>
            <button
              type="button"
              class="btn-live-sync"
              :class="{ 'is-loading': isRefreshingAll || isSyncingPodio, 'has-issue': hasFetchIssue }"
              :disabled="isRefreshingAll || isSyncingPodio"
              @click="refreshAllData"
              :title="'Podio Live CRM · ' + podioStatusText + ' · Click to refresh all feeds'"
            >
              <span class="sync-dot" :class="{ spinning: isRefreshingAll || isSyncingPodio, warn: hasFetchIssue }"></span>
              <span>{{ (isRefreshingAll || isSyncingPodio) ? 'Syncing Feeds…' : (hasFetchIssue ? 'Podio Warning · Click to Retry' : (podioConnected ? 'Podio Live (' + (podioLeadsCount ?? 0) + ' Leads)' : podioProblem)) }}</span>
            </button>
            <button
              type="button"
              class="btn-icon-refresh"
              :class="{ 'is-loading': isRefreshingAll || isSyncingPodio }"
              :disabled="isRefreshingAll || isSyncingPodio"
              @click="refreshAllData"
              title="Refresh &amp; sync all live platform and database records"
              aria-label="Refresh all data"
            >
              <span class="refresh-svg" :class="{ spinning: isRefreshingAll || isSyncingPodio }" v-html="icons.refresh"></span>
            </button>
          </div>
        </header>
        <div class="metrics"><a v-for="m in metrics" :key="m.label" :href="m.href" :title="m.help" @click="guard" class="metric"><span class="metric-icon" v-html="icons[m.iconKey] || icons.house"></span><div><span class="metric-label">{{m.label}}</span><strong>{{m.value}}</strong><span v-if="m.note" class="metric-note">{{m.note}}</span></div></a></div>
        <!-- Fully Functional Deal-Flow Funnel (12 Milestones) -->
        <article class="panel pipeline hushhawk-funnel-card">
          <div class="panel-title funnel-header">
            <div class="funnel-title-left">
              <h3><span class="panel-title-icon" v-html="icons.zap"></span> Deal-Flow Funnel</h3>
              <span class="funnel-milestones-tag">12 milestones</span>
              <span class="funnel-summary-badge" v-if="funnelData.totalDeals">
                <strong>{{ funnelData.totalDeals }} Active Deals</strong> · {{ formatMoney(funnelData.totalPipelineVolume) }} Vol
              </span>
            </div>
            <div class="funnel-header-right">
              <span class="funnel-rev-stat" v-if="funnelData.totalProjectedRevenue">
                Est. Fees: <strong>{{ formatMoney(funnelData.totalProjectedRevenue) }}</strong>
              </span>
              <button type="button" class="btn-funnel-add" @click="openAddDeal(selectedMilestoneIndex !== null ? selectedMilestoneIndex : 0)" title="Add Deal to Pipeline">
                <span class="tiny-svg" v-html="icons.plus"></span> Add Deal
              </button>
              <button v-if="selectedMilestoneIndex !== null" type="button" class="btn-funnel-close-tray" @click="closeFunnelDrawer" title="Close Stage Inspector">
                ✕ Close Details
              </button>
            </div>
          </div>

          <!-- 3-Phase Realm Indicator -->
          <div class="funnel-phase-ribbon">
            <div class="phase-pill phase-acq" :class="{ 'phase-highlight': selectedMilestoneIndex !== null && selectedMilestoneIndex <= 3 }">
              <span class="phase-circle"></span>
              <span class="phase-title">01–04 Acquisitions</span>
              <span class="phase-stat">{{ phaseDealsCount(0, 3) }} deals</span>
            </div>
            <div class="phase-pill phase-contracts" :class="{ 'phase-highlight': selectedMilestoneIndex !== null && selectedMilestoneIndex >= 4 && selectedMilestoneIndex <= 7 }">
              <span class="phase-circle"></span>
              <span class="phase-title">05–08 Contracts &amp; Title</span>
              <span class="phase-stat">{{ phaseDealsCount(4, 7) }} deals</span>
            </div>
            <div class="phase-pill phase-dispo" :class="{ 'phase-highlight': selectedMilestoneIndex !== null && selectedMilestoneIndex >= 8 && selectedMilestoneIndex <= 11 }">
              <span class="phase-circle"></span>
              <span class="phase-title">09–12 Dispositions</span>
              <span class="phase-stat">{{ phaseDealsCount(8, 11) }} deals</span>
            </div>
          </div>

          <!-- 12 Milestone Chevron Cards -->
          <div class="stage-grid funnel-stage-grid">
            <div
              v-for="(stageName, i) in stages"
              :key="stageName"
              class="stage-box"
              :class="{
                'is-selected': selectedMilestoneIndex === i,
                'has-active-deals': (getMilestoneCount(i) > 0),
                'stage-terminal': i === 11
              }"
              :style="{'--stage': stageColors[i]}"
              @click="selectMilestone(i)"
              :title="'Click to inspect deals in milestone ' + String(i + 1).padStart(2, '0') + ': ' + stageName"
            >
              <div class="stage-box-top">
                <strong class="stage-box-num">{{ String(i + 1).padStart(2, '0') }}</strong>
                <span class="stage-deal-count" :class="{ 'active-count': getMilestoneCount(i) > 0 }">
                  {{ getMilestoneCount(i) }} {{ getMilestoneCount(i) === 1 ? 'deal' : 'deals' }}
                </span>
              </div>
              <div class="stage-box-label">{{ stageName }}</div>
              <div class="stage-box-footer">
                <span class="stage-box-vol">{{ getMilestoneVolumeStr(i) }}</span>
                <a
                  :href="i < 4 ? '/acquisitions' : i < 8 ? '/contracts' : '/dispositions'"
                  @click.stop="guard"
                  class="stage-workspace-link"
                  :title="'Go to ' + (i < 4 ? 'Acquisitions' : i < 8 ? 'Contracts' : 'Dispositions') + ' Workspace'"
                >
                  ↗
                </a>
              </div>
              <div v-if="selectedMilestoneIndex === i" class="stage-active-arrow"></div>
            </div>
          </div>

          <!-- Interactive Milestone Inspector Tray (Drawer) -->
          <div v-if="selectedMilestoneIndex !== null" class="funnel-inspector-tray">
            <div class="inspector-tray-header">
              <div class="ith-left">
                <span class="ith-badge" :style="{ borderColor: stageColors[selectedMilestoneIndex], color: stageColors[selectedMilestoneIndex] }">
                  MILESTONE {{ String(selectedMilestoneIndex + 1).padStart(2, '0') }} · {{ selectedMilestoneObj?.phase || (selectedMilestoneIndex < 4 ? 'Acquisitions' : selectedMilestoneIndex < 8 ? 'Contracts & Title' : 'Dispositions') }}
                </span>
                <h4 class="ith-title">{{ selectedMilestoneObj?.name || stages[selectedMilestoneIndex] }}</h4>
                <p class="ith-desc">{{ selectedMilestoneObj?.description || 'Active deals progressing through this pipeline milestone stage.' }}</p>
              </div>
              <div class="ith-right">
                <div class="ith-metric">
                  <span class="lbl">Stage Deals:</span>
                  <strong>{{ selectedMilestoneDeals.length }}</strong>
                </div>
                <div class="ith-metric">
                  <span class="lbl">Stage Volume:</span>
                  <strong>{{ formatMoney(selectedMilestoneVolume) }}</strong>
                </div>
                <div class="ith-metric">
                  <span class="lbl">Est. Fees:</span>
                  <strong class="gold-accent">{{ formatMoney(selectedMilestoneFee) }}</strong>
                </div>
                <a
                  :href="selectedMilestoneIndex < 4 ? '/acquisitions' : selectedMilestoneIndex < 8 ? '/contracts' : '/dispositions'"
                  @click="guard"
                  class="btn-open-workspace"
                >
                  Open Full Workspace ↗
                </a>
                <button type="button" class="btn-close-tray" @click="closeFunnelDrawer" aria-label="Close tray">✕</button>
              </div>
            </div>

            <!-- Deals List in Selected Milestone -->
            <div class="inspector-tray-body">
              <div v-if="selectedMilestoneDeals.length === 0" class="tray-empty-state">
                <p>No active properties currently in <strong>{{ stages[selectedMilestoneIndex] }}</strong>.</p>
                <button type="button" class="btn-quick-add-to-stage" @click="openAddDeal(selectedMilestoneIndex)">
                  + Add Deal to {{ stages[selectedMilestoneIndex] }}
                </button>
              </div>

              <div v-else class="tray-deals-grid">
                <div
                  v-for="deal in selectedMilestoneDeals"
                  :key="deal.id"
                  class="tray-deal-card"
                >
                  <div class="tdc-top">
                    <div class="tdc-address-group">
                      <span class="tdc-code">{{ deal.code || deal.id }}</span>
                      <strong class="tdc-street">{{ deal.address }}</strong>
                      <span class="tdc-city">{{ [deal.city, deal.state].filter(Boolean).join(', ') }} {{ deal.zip }}{{ deal.county ? ' (' + deal.county + ' County)' : '' }}</span>
                    </div>
                    <span class="tdc-days-tag" :class="{ 'stale': deal.daysInStage >= 3 }">
                      {{ deal.daysInStage || 0 }}d in stage
                    </span>
                  </div>

                  <div class="tdc-metrics-grid">
                    <div class="tdc-metric-item">
                      <span class="lbl">Seller Contact</span>
                      <strong>{{ deal.seller || 'Seller Record' }}</strong>
                      <small v-if="deal.phone">{{ deal.phone }}</small>
                    </div>
                    <div class="tdc-metric-item">
                      <span class="lbl">Buyer / Assignment</span>
                      <strong>{{ deal.buyer && deal.buyer !== '—' ? deal.buyer : 'Unassigned (Dispo Pending)' }}</strong>
                      <small v-if="deal.titleAgency">{{ deal.titleAgency }}</small>
                    </div>
                    <div class="tdc-metric-item">
                      <span class="lbl">Contract Price</span>
                      <strong>{{ formatMoney(deal.buyPrice) }}</strong>
                      <small v-if="deal.arv">ARV: {{ formatMoney(deal.arv) }}</small>
                    </div>
                    <div class="tdc-metric-item">
                      <span class="lbl">Wholesale Fee</span>
                      <strong class="gold-fee">+{{ formatMoney(deal.fee) }}</strong>
                      <small v-if="deal.closingDate">Target Close: {{ deal.closingDate }}</small>
                    </div>
                  </div>

                  <div class="tdc-notes" v-if="deal.notes">
                    <span class="note-pill">INTEL:</span> {{ deal.notes }}
                  </div>

                  <div class="tdc-actions-bar">
                    <span class="tdc-source">Source: {{ deal.source || 'Direct Mail' }}</span>
                    <div class="tdc-action-buttons">
                      <button
                        v-if="deal.milestoneIndex < 11"
                        type="button"
                        class="btn-advance-milestone"
                        :disabled="isAdvancingDeal[deal.id]"
                        @click="advanceDeal(deal, deal.milestoneIndex + 1)"
                      >
                        <span v-if="isAdvancingDeal[deal.id]">Advancing…</span>
                        <span v-else>Advance to {{ getMilestoneName(deal.milestoneIndex + 1) }} →</span>
                      </button>
                      <span v-else class="status-funded-badge">✓ Closed &amp; Fee Collected</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Feedback Toast -->
          <div v-if="advanceToast" class="funnel-toast-banner" :class="advanceToast.type">
            <span>{{ advanceToast.message }}</span>
          </div>

          <!-- Quick Add Deal Modal -->
          <Teleport to="body">
            <div v-if="isAddDealOpen" class="funnel-modal-backdrop" @click="isAddDealOpen = false">
              <div class="funnel-modal-window" @click.stop>
                <div class="fm-header">
                  <h4>+ Add Deal to Funnel Pipeline</h4>
                  <button type="button" class="btn-fm-close" @click="isAddDealOpen = false">✕</button>
                </div>
                <form @submit.prevent="submitNewDeal" class="fm-form">
                  <div class="fm-field">
                    <label>Property Address *</label>
                    <input v-model="addDealForm.address" required placeholder="e.g. 10451 Normandy Blvd" />
                  </div>
                  <div class="fm-row">
                    <div class="fm-field">
                      <label>City</label>
                      <input v-model="addDealForm.city" placeholder="Jacksonville" />
                    </div>
                    <div class="fm-field">
                      <label>ZIP Code</label>
                      <input v-model="addDealForm.zip" required placeholder="32221" />
                    </div>
                  </div>
                  <div class="fm-row">
                    <div class="fm-field">
                      <label>Seller Name</label>
                      <input v-model="addDealForm.seller" placeholder="e.g. Marcus Reed" />
                    </div>
                    <div class="fm-field">
                      <label>Pipeline Milestone</label>
                      <select v-model="addDealForm.milestoneIndex">
                        <option v-for="(name, idx) in stages" :key="name" :value="idx">
                          {{ String(idx + 1).padStart(2, '0') }} - {{ name }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="fm-row">
                    <div class="fm-field">
                      <label>Contract / Offer Consideration ($)</label>
                      <input v-model.number="addDealForm.buyPrice" type="number" step="1000" />
                    </div>
                    <div class="fm-field">
                      <label>Projected Assignment Fee ($)</label>
                      <input v-model.number="addDealForm.fee" type="number" step="500" />
                    </div>
                  </div>
                  <div class="fm-actions">
                    <button type="button" class="btn-fm-cancel" @click="isAddDealOpen = false">Cancel</button>
                    <button type="submit" class="btn-fm-submit">Save &amp; Insert Deal</button>
                  </div>
                </form>
              </div>
            </div>
          </Teleport>
        </article>
        <ExecutiveOutreachActions />
        <LeadConversationDesk />
        <div class="dashboard-secondary">
          <article class="panel leads">
            <div class="panel-title">
              <h3><span class="panel-title-icon" v-html="icons.users"></span> Recent Seller Leads</h3>
              <a href="/seller-leads" @click="guard">View all ↗</a>
            </div>
            <div class="leads-table-container">
              <table>
                <thead>
                  <tr><th>Name</th><th>Property</th><th>ZIP</th><th>Status</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in (filteredLeads || []).slice(0, 5)" :key="r.name">
                    <td>{{r.name}}</td>
                    <td><a href="/seller-leads" @click="guard">{{r.address}}</a></td>
                    <td>{{r.zip}}</td>
                    <td><span :class="'status '+r.status">{{r.status}}</span></td>
                  </tr>
                </tbody>
              </table>
              <p v-if="!((filteredLeads || []).length)" class="panel-note">No matching leads.</p>
            </div>
            <div class="leads-footer" v-if="(filteredLeads || []).length > 5">
              <a href="/seller-leads" @click="guard">View all {{ filteredLeads.length }} leads in CRM ↗</a>
            </div>
            <button v-if="zip" class="clear-filter" @click="clearZip">ZIP {{zip}} × Clear</button>
          </article>

          <article class="panel sources">
            <div class="panel-title">
              <h3><span class="panel-title-icon" v-html="icons.pieChart"></span> Lead Source Mix</h3>
              <span class="live-tag"><span class="tiny-dot-green"></span> Live Ingestion</span>
            </div>
            <div class="source-body">
              <div class="donut" :style="{ background: donutGradient }">
                <div><strong>{{ leads.length }}</strong><small>Loaded leads</small></div>
              </div>
              <p v-if="!sources.length" class="hh-panel-empty">No lead sources recorded.</p>
              <ul v-else class="sources-list">
                <li v-for="s in sources.slice(0, 5)" :key="s.name">
                  <i :style="{background:s.color}"></i>
                  <span>{{s.name}}</span>
                  <b>{{s.value}}%</b>
                </li>
              </ul>
            </div>
            <div class="sources-footer">
              <span>Source: <strong>HushHawk leads (first source)</strong></span>
              <a href="/marketing" @click="guard">Breakdown ↗</a>
            </div>
          </article>

          <article class="panel analyzer">
            <div class="panel-title">
              <h3><span class="panel-title-icon" v-html="icons.calculator"></span> Deal Snapshot</h3>
              <a href="/deal-analyzer" @click="guard">Analyze ↗</a>
            </div>
            <div v-if="activeSnapshot" class="analyzer-body">
              <div class="analyzer-prop-header">
                <strong class="property">{{activeSnapshot.address}}</strong>
                <p class="analyzer-prop-sub">{{activeSnapshot.cityStateZip}}</p>
              </div>
              <dl class="analyzer-dl">
                <div><dt>County value</dt><dd>{{money(activeSnapshot.countyValue)}}</dd></div>
                <div><dt>Living area</dt><dd>{{activeSnapshot.livingArea ? activeSnapshot.livingArea.toLocaleString() + ' sqft' : '—'}}</dd></div>
                <div><dt>Year built</dt><dd>{{activeSnapshot.yearBuilt || '—'}}</dd></div>
                <div><dt>Owner of record</dt><dd>{{activeSnapshot.owner || '—'}}</dd></div>
              </dl>
            </div>
            <div v-if="activeSnapshot" class="analyzer-footer">
              <small class="profit-sub">From the county property appraiser roll. Open the Deal Analyzer for an ARV estimate from nearby sales.</small>
            </div>
            <div v-else style="padding: 16px; text-align: center; color: #64748b; font-size: 11px;">
              No deals currently underwritten. Use the Deal Analyzer to calculate MAO, repair budgets, and spreads.
            </div>
          </article>
        </div>

        <div class="right-stack">
          <article class="panel priorities">
            <div class="panel-title">
              <h3><span class="panel-title-icon" v-html="icons.check"></span> Today’s Priorities</h3>
              <a href="/tasks" @click="guard">View all ↗</a>
            </div>
            <div class="tasks-container">
              <label v-for="(task,i) in (tasks || []).slice(0, 5)" :key="task">
                <input type="checkbox" v-model="checked" :value="i" :disabled="isEditing" @change="onTaskToggle(i)"/>
                <span :class="{done:checked.includes(i)}">{{task}}</span>
              </label>
            </div>
            <div class="priorities-footer">
              <small class="panel-note">{{(checked || []).length}} / {{(tasks || []).length}} complete · on track</small>
              <a href="/tasks" @click="guard">Manage Tasks ↗</a>
            </div>
          </article>

          <article class="panel imports">
            <div class="panel-title">
              <h3><span class="panel-title-icon" v-html="icons.database"></span> County Intelligence</h3>
              <a href="/county-data" @click="guard">Review county data ↗</a>
            </div>
            <div class="imports-container">
              <div v-for="r in imports" :key="r.name" class="import-row">
                <span class="check"><span class="tiny-svg" v-html="icons.check"></span></span>
                <strong>{{r.name}}</strong>
                <span class="import-count">{{r.count}} <small>records</small></span>
              </div>
            </div>
            <div class="imports-footer">
              <span>Jurisdiction: <strong>Northeast Florida (FL)</strong></span>
              <a href="/county-data" @click="guard">GIS Maps ↗</a>
            </div>
          </article>
        </div>
      </div>

      <aside class="dashboard-context" aria-label="Market and communications">
        <article id="market-intel" class="panel map-panel" tabindex="-1">
          <CountyMap :uid="uid+'-market-map'" :content="{}" @trigger-event="onZip"/>
        </article>

        <!-- Email Center Matching Reference Standard -->
        <article class="panel email-center-panel">
          <div class="panel-title ec-title">
            <div class="ec-title-left">
              <h3><span class="panel-title-icon" v-html="icons.mail"></span> Email Center</h3>
            </div>
            <span v-if="totalUnreadEmails" class="ec-supported-badge">{{ totalUnreadEmails }} unread</span>
          </div>
          <div class="ec-tabs-bar" role="group" aria-label="Email category">
            <button
              v-for="cat in emailCategories"
              :key="cat.name"
              type="button"
              class="ec-tab-btn"
              :class="{ active: selectedEmailCategory === cat.name }"
              :aria-pressed="selectedEmailCategory === cat.name"
              @click="selectedEmailCategory = cat.name"
            >
              {{ cat.name }} <span class="ec-tab-count">{{ cat.count }}</span>
            </button>
          </div>
          <div class="ec-inbox-list">
            <div
              v-for="(inbox, idx) in filteredEmailList"
              :key="inbox.id || idx"
              class="ec-inbox-item"
              :class="{ 'is-selected': activeEmailIdx === idx }"
              @click="openEmailInbox(inbox, idx)"
              title="Click to open this email thread in Communications"
            >
              <span class="ec-dot-blue"></span>
              <div class="ec-inbox-info">
                <strong class="ec-inbox-name">{{ inbox.name }}</strong>
                <span class="ec-inbox-meta">{{ inbox.received }}</span>
              </div>
              <span class="ec-inbox-badge" :class="{ 'unread-tag': inbox.unreadCount }">
                {{ inbox.unreadCount ? 'Unread: ' + inbox.unreadCount : inbox.status || 'Ready to Send' }}
              </span>
            </div>
            <p v-if="!filteredEmailList.length" class="hh-panel-empty">No emails in this category.</p>
          </div>
          <div class="ec-actions-bar">
            <button type="button" class="btn-ec-compose hh-action" @click="openComposeEmail">
              <span class="tiny-svg" v-html="icons.edit"></span> Compose
            </button>
            <a href="/communications" @click="guard" class="btn-ec-view-inbox hh-action hh-action-highlight">
              View inbox <span aria-hidden="true">→</span>
            </a>
          </div>

          <!-- Interactive Dashboard Email Modal -->
          <Teleport to="body">
            <div v-if="isEmailModalOpen && selectedEmail" class="email-modal-backdrop" @click.self="isEmailModalOpen = false">
              <div class="email-modal-card" @click.stop>
                <div class="em-header">
                  <div class="em-header-left">
                    <span class="em-icon" v-html="icons.mail"></span>
                    <div>
                      <h4>{{ selectedEmail.id && String(selectedEmail.id).startsWith('new') ? 'Compose Outbound Email' : 'Email Dispatch Desk' }}</h4>
                      <small>{{ selectedEmail.name || 'Direct Communication Relay' }}</small>
                    </div>
                  </div>
                  <button type="button" class="btn-em-close" @click="isEmailModalOpen = false">✕</button>
                </div>
                <div class="em-body">
                  <div class="em-row">
                    <div class="em-field">
                      <label>Recipient Name</label>
                      <input v-model="selectedEmail.name" placeholder="e.g. Apex Private Holdings" />
                    </div>
                    <div class="em-field">
                      <label>Recipient Email</label>
                      <input v-model="selectedEmail.email" placeholder="e.g. acquisitions@apexre.com" />
                    </div>
                  </div>
                  <div class="em-row">
                    <div class="em-field">
                      <label>Subject Line</label>
                      <input v-model="selectedEmail.subject" placeholder="Subject line" />
                    </div>
                    <div class="em-field">
                      <label>Property / Target</label>
                      <input v-model="selectedEmail.property" placeholder="e.g. 10451 Normandy Blvd" />
                    </div>
                  </div>
                  <div class="em-field">
                    <label>Email Message Content (SendGrid / SMTP Relay)</label>
                    <textarea v-model="selectedEmail.body" rows="5" placeholder="Write outbound email message here..."></textarea>
                  </div>
                </div>
                <div class="em-footer">
                  <div class="em-footer-left">
                    <a href="/communications" @click="guard" class="btn-em-comms">Open Comms Hub ↗</a>
                  </div>
                  <div class="em-footer-right">
                    <button type="button" class="btn-em-cancel" @click="isEmailModalOpen = false">Cancel</button>
                    <button type="button" class="btn-em-send" :disabled="isSendingEmail || !selectedEmail.body?.trim()" @click="dispatchDashboardEmail">
                      {{ isSendingEmail ? 'Dispatching…' : 'Send Email Now ↗' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Teleport>
        </article>

        <!-- Messages (Team Chat) Matching Reference Standard -->
        <article class="panel team-messages-panel">
          <div class="panel-title tm-title">
            <div class="tm-title-left">
              <h3><span class="panel-title-icon" v-html="icons.text"></span> Messages</h3>
              <span class="tm-unread-badge" v-if="teamUnreadCount">{{ teamUnreadCount }} Unread</span>
            </div>
            <div class="tm-channel-selector">
              <select v-model="selectedChatChannel" aria-label="Message channel" @change="onChatChannelChange">
                <option value="team">Team Chat</option>
                <option value="acquisitions">Acquisitions</option>
                <option value="disposition">Disposition</option>
                <option value="direct">Direct Leads</option>
              </select>
              <button type="button" class="btn-tm-open hh-action" @click="openPartnerChat()">
                Open chat <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
          <div class="tm-messages-list">
            <div
              v-for="msg in teamMessages"
              :key="msg.id"
              class="tm-msg-row"
              @click="openPartnerChat(msg)"
              title="Click to open full conversation in Partner Chat"
            >
              <span class="tm-avatar" :class="'avatar-' + msg.roleColor">{{ msg.initials }}</span>
              <div class="tm-msg-content">
                <div class="tm-msg-header">
                  <strong class="tm-sender">{{ msg.sender }}</strong>
                  <span class="tm-time">{{ msg.time }}</span>
                </div>
                <p class="tm-text">{{ msg.text }}</p>
              </div>
            </div>
            <p v-if="!teamMessages.length" class="hh-panel-empty">No messages yet. Start the conversation below.</p>
          </div>
          <form @submit.prevent="sendTeamMessage" class="tm-quick-reply-form">
            <input v-model="teamReplyDraft" aria-label="Team message" placeholder="Write a message…" />
            <button type="submit" class="hh-action hh-action-primary" :disabled="!teamReplyDraft.trim()">Send</button>
          </form>
        </article>
      </aside>
    </div>

    <!-- Jacksonville Market Movement 30 Days (Bottom Status Bar) -->
    <section class="jax-market-movement-bar">
      <div class="jmm-left">
        <span class="jmm-bar-icon" v-html="icons.chart"></span>
        <strong>Jacksonville Market Intelligence</strong>
      </div>
      <p>Local pricing and inventory feed unavailable.</p>
      <a href="#market-intel" @click="guard" class="btn-market-intel">View Market Intel →</a>
    </section>
  <section class="pulse"><div class="pulse-heading"><strong><i></i> CAPITAL DESK</strong><div class="feed-tabs"><button :class="{active:feedMode==='deals'}" @click="!isEditing&&(feedMode='deals')">Deal Pulse</button><button :class="{active:feedMode==='markets'}" @click="!isEditing&&(feedMode='markets')">Market Watch</button></div><span v-if="feedMode==='deals'">LIVE CRM SIGNALS</span><button v-if="feedMode==='deals'" @click="!isEditing&&(paused=!paused)" :aria-pressed="paused">{{paused?'Resume':'Pause'}}</button></div><div class="tape-window" v-show="feedMode==='deals'"><div class="tape" :class="{paused}"><span v-for="(item,i) in signalTape" :key="i" :aria-hidden="i>=signalsCount"><b>{{item.code}}</b> {{item.label}} <strong>{{item.value}}</strong><em>▲ {{item.change}}</em></span></div></div></section>
  <section class="market-tape" v-show="feedMode==='markets'"><div class="market-label"><b>MARKET WATCH</b><span>External quotes · timing varies by exchange</span><a href="https://www.tradingview.com/markets/" target="_blank" rel="noopener noreferrer">TradingView ↗</a></div><div ref="marketHost" class="tradingview-widget-container"><div class="market-placeholder">{{marketError?'Market feed unavailable. Open TradingView ↗':'Loading market quotes…'}}</div></div></section>
  <footer class="footer"><span>HUSHHAWK PROPERTY INTELLIGENCE</span><span>EXECUTE WITH PRECISION. CLOSE WITH CONFIDENCE.</span><span>JACKSONVILLE, FL</span></footer>
  </main>
  </div>

  <!-- Global System Refresh Toast Notification -->
  <div v-if="refreshToast" class="system-refresh-toast" :class="refreshToast.type">
    <span class="srt-icon">{{ refreshToast.type === 'success' ? '✓' : refreshToast.type === 'warning' ? '⚠️' : '✕' }}</span>
    <span class="srt-text">{{ refreshToast.message }}</span>
  </div>
  </div>
</section>
</template>
<script>
import HushHawkThemeToggle from '@/_front/components/HushHawkThemeToggle.vue';
import {computed,ref,onMounted,onBeforeUnmount} from 'vue';
import CountyMap from './components/CountyMap.vue';
import LeadConversationDesk from './components/LeadConversationDesk.vue';
import ExecutiveOutreachActions from './components/ExecutiveOutreachActions.vue';
import '@/assets/css/hushhawk-gold.css';
import './dashboard-gold.css';
import HushHawkNotificationDropdown from '@/_front/components/HushHawkNotificationDropdown.vue';
import { useNotifications } from '@/_common/use/useNotifications.js';
import { icons } from '../../element-f1b67d54-2716-43a4-a414-ab7f505c2ace/src/icons.js';
import { navigation } from '../../element-f1b67d54-2716-43a4-a414-ab7f505c2ace/src/navigation.js';
export default {components:{HushHawkThemeToggle,CountyMap,LeadConversationDesk,ExecutiveOutreachActions,HushHawkNotificationDropdown},props:{uid:{type:String,required:true},content:{type:Object,required:true},},setup(props){
const uid=computed(()=>props.uid||'dashboard');
const isEditing=computed(()=>{return false;});
const navOpen=ref(false);
const primaryNavigation=computed(()=>navigation.slice(0, 11));
const secondaryNavigation=computed(()=>navigation.slice(11));
function handleNav(path, e) {
  if (isEditing.value) {
    if (e) e.preventDefault();
    return;
  }
  isQuickAddOpen.value = false;
  navOpen.value = false;
  if (path === '/home' || (typeof window !== 'undefined' && path === window.location.pathname)) {
    if (e) e.preventDefault();
    return;
  }
  if (e) e.preventDefault();
  if (typeof window !== 'undefined' && window.wwLib?.wwApp?.goTo) {
    window.wwLib.wwApp.goTo(path);
  } else if (typeof window !== 'undefined') {
    window.location.href = path;
  }
}
const feedMode=ref('markets');const query=ref(''),zip=ref(''),checked=ref([]),draft=ref(''),draftStatus=ref(''),paused=ref(false),activeEmail=ref(null),clock=ref(''),marketHost=ref(null),marketError=ref(false);let timer,marketTimer;
const {
  notifications,
  unreadCount,
  isNotifOpen,
  initNotificationPolling
} = useNotifications();
const isQuickAddOpen=ref(false),currentTime=ref('09:42 AM');
const isUserMenuOpen=ref(false),activeUser=ref(null);
const activeUserName=computed(()=>activeUser.value?.name||'Main Administrator');
const activeUserRole=computed(()=>activeUser.value?.role||'Superadmin & Managing Partner');
const activeUserEmail=computed(()=>activeUser.value?.email||'admin@hushhawk.com');

function handleLogout() {
  if (typeof window !== 'undefined') {
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
      console.error('Logout error:', e);
    }
    window.location.href = '/login';
  }
}
let clickOutsideHandler=null;
const metrics=ref([
  {iconKey:'users',label:'Total Seller Leads',value:'0',change:'Live',href:'/seller-leads'},
  {iconKey:'phone',label:'Contact Rate',value:'0%',change:'Active',href:'/communications'},
  {iconKey:'calendar',label:'Appointments Set',value:'0',change:'Live',href:'/calendar'},
  {iconKey:'file',label:'Offers Pending',value:'0',change:'Active',href:'/acquisitions'},
  {iconKey:'handshake',label:'Under Contract',value:'0',change:'Live',href:'/contracts'},
  {iconKey:'badgeDollar',label:'Assignment Revenue',value:'$0',change:'Live',href:'/analytics'},
  {iconKey:'calculator',label:'Avg. MAO',value:'$0',change:'Real',href:'/deal-analyzer'},
  {iconKey:'house',label:'Avg. ARV',value:'$0',change:'Real',href:'/deal-analyzer'},
  {iconKey:'users',label:'Cash Buyer Matches',value:'0',change:'Live',href:'/cash-buyers'},
  {iconKey:'dollar',label:'Dispo Opportunities',value:'0',change:'Live',href:'/dispositions'}
]);
const emails=ref([]);
const emailCategories = ref([
  { name: 'Inquiries', count: 0 },
  { name: 'Proposals', count: 0 },
  { name: 'Title', count: 0 },
  { name: 'Decisions', count: 0 },
  { name: 'Other', count: 0 }
]);
const selectedEmailCategory = ref('Inquiries');
const activeEmailIdx = ref(0);

const rawInboxes = ref([]);

const filteredEmailList = computed(() => {
  if (selectedEmailCategory.value && selectedEmailCategory.value !== 'Other') {
    const list = rawInboxes.value.filter(it => it.category === selectedEmailCategory.value);
    if (list.length) return list;
  }
  return rawInboxes.value;
});

const totalUnreadEmails = computed(() => {
  return rawInboxes.value.reduce((acc, it) => acc + (it.unreadCount || 0), 0);
});

const selectedChatChannel = ref('team');
const teamReplyDraft = ref('');
const teamMessages = ref([]);
const teamUnreadCount = ref(0);
const activeChatThreadId = ref('00000000-0000-0000-0000-000000000001');

// Email Center Dashboard State
const isEmailModalOpen = ref(false);
const selectedEmail = ref(null);
const isSendingEmail = ref(false);

function currentUserName() {
  try {
    const raw = window.sessionStorage.getItem('hushhawk_session') || window.localStorage.getItem('hushhawk_session');
    const parsed = raw ? JSON.parse(raw) : {};
    return (parsed.user || parsed).name || '';
  } catch (e) {
    return '';
  }
}

async function sendTeamMessage() {
  if (!teamReplyDraft.value.trim()) return;
  const draftText = teamReplyDraft.value.trim();
  const threadId = activeChatThreadId.value;
  if (!threadId) {
    showFunnelToast('Open a conversation before sending a message.', 'error');
    return;
  }
  try {
    const res = await fetch(`/api/v1/chat/threads/${threadId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_text: draftText })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    const name = currentUserName();
    teamMessages.value.push({
      id: data.message?.id || data.id || ('sent-' + Date.now()),
      sender: name,
      initials: name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      roleColor: 'gold',
      text: draftText,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    });
    teamReplyDraft.value = '';
  } catch (err) {
    showFunnelToast('Message not sent: ' + err.message, 'error');
  }
}

function openComposeEmail() {
  selectedEmail.value = {
    id: 'new-' + Date.now(),
    name: '',
    email: '',
    subject: '',
    property: '',
    body: `\n\nBest regards,\n${currentUserName()}`,
    category: 'Proposals'
  };
  isEmailModalOpen.value = true;
}

function openEmailInbox(inbox, idx) {
  activeEmailIdx.value = idx;
  selectedEmail.value = {
    ...inbox,
    body: inbox.body || (inbox.category === 'Title'
      ? 'Please find attached the signed contract package and escrow deposit confirmation for title clearance.'
      : 'Reviewing off-market single family deal in Duval County. Let us know if you want the underwriting and assignment package.')
  };
  isEmailModalOpen.value = true;
}

async function dispatchDashboardEmail() {
  if (!selectedEmail.value || isSendingEmail.value) return;
  isSendingEmail.value = true;
  try {
    const emailTargetId = String(selectedEmail.value.id).startsWith('new') ? '00000000-0000-0000-0000-000000000001' : selectedEmail.value.id;
    const res = await fetch('/api/v1/outreach-actions/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: emailTargetId,
        subject: selectedEmail.value.subject,
        body: selectedEmail.value.body
      })
    });
    if (res.ok) {
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast('Email Dispatched', `Relayed to ${selectedEmail.value.name || selectedEmail.value.email}. Recorded in interaction ledger.`, 'success');
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title: 'Email Dispatched', message: `Relayed to ${selectedEmail.value.name || selectedEmail.value.email}.`, type: 'success' } }));
        }
      }
      isEmailModalOpen.value = false;
      if (rawInboxes.value[activeEmailIdx.value]) {
        rawInboxes.value[activeEmailIdx.value].status = 'SENT';
      }
    }
  } catch (err) {
    console.warn('[Dashboard Email Dispatch Warn]:', err.message);
  } finally {
    isSendingEmail.value = false;
  }
}

function openPartnerChat(msg = null) {
  if (typeof window !== 'undefined') {
    const detail = {};
    if (msg && msg.property_id) {
      detail.property_id = msg.property_id;
    }
    window.dispatchEvent(new CustomEvent('open-partner-chat', { detail }));
  }
}

async function onChatChannelChange() {
  try {
    const resThreads = await fetch('/api/v1/chat/threads');
    if (resThreads.ok) {
      const chatData = await resThreads.json();
      const tList = chatData.threads || [];
      let targetThread = tList[0];
      if (selectedChatChannel.value === 'acquisitions') {
        targetThread = tList.find(t => t.title && t.title.includes('123 Main')) || targetThread;
      } else if (selectedChatChannel.value === 'disposition') {
        targetThread = tList.find(t => t.title && t.title.includes('881 Main')) || targetThread;
      } else if (selectedChatChannel.value === 'direct') {
        targetThread = tList.find(t => t.title && t.title.includes('3245 Main')) || targetThread;
      } else {
        targetThread = tList.find(t => t.thread_type === 'general') || targetThread;
      }
      if (targetThread) {
        activeChatThreadId.value = targetThread.id;
        const resMsgs = await fetch(`/api/v1/chat/threads/${targetThread.id}/messages`);
        if (resMsgs.ok) {
          const mData = await resMsgs.json();
          const msgs = mData.messages || [];
          if (msgs.length) {
            teamMessages.value = msgs.slice(-5).map(m => ({
              id: m.id,
              sender: m.sender_name,
              initials: (m.sender_name || 'AR').split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase(),
              roleColor: m.sender_name.includes('Alex') ? 'gold' : 'blue',
              text: m.message_text,
              time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
              property_id: m.property_id
            }));
          }
        }
      }
    }
  } catch (e) {
    console.warn('[ChannelChange] fetch err:', e.message);
  }
}

const activeChat=ref(null);
const activeSnapshot=ref(null);
function money(v){return v==null?'—':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);}
const rawTasks=ref([]);
const tasks=ref([]);
const imports=ref([{name:'Duval County',count:'0'},{name:'Clay County',count:'0'}]);
const leads=ref([]);
const filteredLeads=computed(()=>(leads.value||[]).filter(r=>(!zip.value||r.zip===zip.value)&&[r.name,r.address,r.zip,r.status].join(' ').toLowerCase().includes(query.value.toLowerCase().trim())));
const stages=['Lead received','Contact made','Appointment','Offer sent','Signed','Sent to title','EMD confirmed','Title cleared','Dispo launched','Buyer chosen','Assignment','Closed + funded'];
const stageColors=['#187ed4','#268dc7','#3b77d0','#7b63d1','#9a57c0','#b55b94','#bc7770','#c99339','#d2a93c','#78b854','#3ca962','#0fa85a'];

const funnelData = ref({
  totalDeals: 0,
  totalPipelineVolume: 0,
  totalProjectedRevenue: 0,
  totalArv: 0,
  phases: [],
  milestones: []
});
const selectedMilestoneIndex = ref(null);
const isAdvancingDeal = ref({});
const advanceToast = ref(null);
const isAddDealOpen = ref(false);
const isSyncingPodio = ref(false);
const podioLeadsCount = ref(null);
const podioConnected = ref(false);
const podioProblem = ref('Podio not connected');
const podioStatusText = ref('Checking Podio…');

async function checkPodioStatus() {
  try {
    const res = await fetch('/api/v1/integrations/podio/status');
    if (res.ok) {
      const data = await res.json();
      podioConnected.value = Boolean(data.connected);
      if (data.connected) {
        podioLeadsCount.value = data.leadsCount ?? 0;
        podioStatusText.value = `Connected (${data.leadsCount ?? 0} leads, ${data.propertiesCount ?? 0} properties, ${data.propertiesAwaitingParcel ?? 0} awaiting parcel)`;
      } else {
        podioStatusText.value = data.error || 'Not connected';
        podioProblem.value = data.status === 'NOT_CONFIGURED' ? 'Podio not configured on the server' : (data.status === 'ERROR' ? 'Podio error: ' + (data.error || 'unreachable') : 'Podio not connected');
      }
    }
  } catch (e) {
    podioConnected.value = false;
    podioStatusText.value = 'Podio status unavailable';
    podioProblem.value = 'Podio status unavailable (server unreachable or signed out)';
  }
}

async function syncPodioLive() {
  if (isSyncingPodio.value) return;
  isSyncingPodio.value = true;
  try {
    const res = await fetch('/api/v1/integrations/podio/sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      podioLeadsCount.value = data.leadsSynced ?? podioLeadsCount.value;
      podioStatusText.value = `Synced (${data.leadsSynced ?? 0} leads)`;
      showFunnelToast(`Podio Sync Complete: ${data.leadsSynced} leads & ${data.propertiesSynced} properties synchronized live!`, 'success');
      await loadDashboardData();
    } else {
      showFunnelToast('Podio Sync in progress.', 'info');
    }
  } catch (e) {
    showFunnelToast('Podio Sync Error: ' + e.message, 'error');
  } finally {
    isSyncingPodio.value = false;
  }
}

// Global System Refresh & Data Fetch Recovery Button
const isRefreshingAll = ref(false);
const hasFetchIssue = ref(false);
const fetchIssueMsg = ref('');
const refreshToast = ref(null);
let refreshToastTimer = null;

function showRefreshToast(message, type = 'success') {
  refreshToast.value = { message, type };
  if (refreshToastTimer) clearTimeout(refreshToastTimer);
  refreshToastTimer = setTimeout(() => {
    refreshToast.value = null;
  }, 4000);
}

async function refreshAllData() {
  if (isRefreshingAll.value) return;
  isRefreshingAll.value = true;
  hasFetchIssue.value = false;
  fetchIssueMsg.value = '';

  const issues = [];
  try {
    // 1. Podio Integration Status
    try {
      await checkPodioStatus();
    } catch (e) {
      issues.push('Podio CRM');
    }

    // 2. Metrics, Signals, County Intelligence
    try {
      const res = await fetch('/api/v1/dashboard/metrics');
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) metrics.value = data.metrics;
        if (data.signals) signals.value = data.signals;
        if (data.countyIntelligence) imports.value = data.countyIntelligence;
      } else {
        issues.push('Metrics');
      }
    } catch (e) {
      issues.push('Metrics');
    }

    // 3. Deal Funnel
    try {
      await loadFunnelData();
    } catch (e) {
      issues.push('Funnel Deals');
    }

    // 4. Tasks
    try {
      const resTasks = await fetch('/api/v1/tasks');
      if (resTasks.ok) {
        const tData = await resTasks.json();
        if (tData.tasks && tData.tasks.length) {
          rawTasks.value = tData.tasks;
          tasks.value = tData.tasks.map(t => t.title);
          checked.value = tData.tasks
            .map((t, idx) => (t.is_completed || t.done || t.completed || t.status === 'COMPLETED' || t.status === 'Done') ? idx : -1)
            .filter(idx => idx !== -1);
        }
      }
    } catch (e) {
      issues.push('Tasks');
    }

    // 5. Communications & Emails
    try {
      const resComm = await fetch('/api/v1/communications');
      if (resComm.ok) {
        const cData = await resComm.json();
        const list = cData.threads || cData.communications || cData.messages || cData;
        if (Array.isArray(list) && list.length) {
          emails.value = list.filter(m => [m.type, m.channel].some(value => String(value).toLowerCase() === 'email')).map(m => ({
            name: m.sender || m.name || m.contact || m.recipient || 'Contact',
            subject: m.subject || 'Email conversation',
            body: m.content || m.body || m.preview || m.lastMessage || '',
            time: m.time || m.timestamp || 'Today'
          }));
          const text = list.find(m => [m.type, m.channel].some(value => ['sms', 'text'].includes(String(value).toLowerCase())));
          if (text) {
            activeChat.value = {
              name: text.contact || text.name || 'Contact',
              role: text.role || 'Active Lead',
              avatar: ((text.contact || text.name || 'AL').split(' ').map(n=>n[0]).join('').slice(0, 2)).toUpperCase(),
              status: text.time ? 'Active · ' + text.time : 'Active SMS conversation',
              messages: (Array.isArray(text.messages) ? text.messages : []).slice(-3)
                .map(message => ({ text: message.text, outgoing: message.sender === 'rep' || message.outgoing }))
            };
          }
        }
      }
    } catch (e) {
      issues.push('Communications');
    }

    // 5b. Outreach Inboxes
    try {
      const resEmails = await fetch('/api/v1/outreach-actions/emails');
      if (resEmails.ok) {
        const eData = await resEmails.json();
        const emailList = eData.emails || [];
        if (emailList.length) {
          rawInboxes.value = emailList.map((em, idx) => ({
            id: em.id || (idx + 1),
            name: em.recipient_name || em.email,
            email: em.email,
            category: (em.recipient_role && em.recipient_role.includes('Buyer')) ? 'Proposals' : 'Title',
            received: 'Today',
            unreadCount: 0,
            status: em.status === 'QUEUED' ? 'Ready to Send' : 'Active',
            subject: em.subject,
            property: em.property_address
          }));

          const titleCount = emailList.filter(em => !(em.recipient_role && em.recipient_role.includes('Buyer'))).length;
          const proposalsCount = emailList.filter(em => (em.recipient_role && em.recipient_role.includes('Buyer'))).length;
          emailCategories.value = [
            { name: 'Inquiries', count: emailList.length },
            { name: 'Proposals', count: proposalsCount },
            { name: 'Title', count: titleCount },
            { name: 'Decisions', count: 0 },
            { name: 'Other', count: 0 }
          ];
        }
      }
    } catch (e) {
      issues.push('Email Inboxes');
    }

    // 5c. Team Partner Chat Messages
    try {
      const resThreads = await fetch('/api/v1/chat/threads');
      if (resThreads.ok) {
        const chatData = await resThreads.json();
        teamUnreadCount.value = chatData.total_unread || 0;
        const tList = chatData.threads || [];
        if (tList.length) {
          const topThread = tList[0];
          const resMsgs = await fetch(`/api/v1/chat/threads/${topThread.id}/messages`);
          if (resMsgs.ok) {
            const mData = await resMsgs.json();
            const msgs = mData.messages || [];
            if (msgs.length) {
              teamMessages.value = msgs.slice(-5).map(m => ({
                id: m.id,
                sender: m.sender_name,
                initials: (m.sender_name || 'AR').split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase(),
                roleColor: m.sender_name.includes('Alex') ? 'gold' : 'blue',
                text: m.message_text,
                time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              }));
            }
          }
        }
      }
    } catch (e) {
      issues.push('Team Messages');
    }

    // 6. Properties & Deal Underwriting Snapshot
    try {
      const resProp = await fetch('/api/v1/properties');
      if (resProp.ok) {
        const pData = await resProp.json();
        const propsList = pData.properties || [];
        const validProp = propsList.find(p => p.address_line1 && p.assessed_value && Number(p.assessed_value) > 0);
        if (validProp) {
          const meta = validProp.metadata || {};
          activeSnapshot.value = {
            address: validProp.address_line1,
            cityStateZip: [validProp.city, validProp.state_code].filter(Boolean).join(', ') + ' ' + (validProp.postal_code || '') + (validProp.property_type ? ' · ' + validProp.property_type : ''),
            countyValue: Number(validProp.assessed_value),
            livingArea: Number(meta.living_area_sqft) || null,
            yearBuilt: Number(meta.year_built) || null,
            owner: meta.county_owner_of_record || ''
          };
        }
      }
    } catch (e) {
      issues.push('Properties');
    }

    // 7. Seller Leads
    try {
      const resLeads = await fetch('/api/v1/seller-leads');
      if (resLeads.ok) {
        const lData = await resLeads.json();
        if (lData.leads && lData.leads.length) {
          leads.value = lData.leads.filter(l => !l.leadKind || l.leadKind === 'SELLER' || l.leadKind === 'NEEDS_REVIEW').map(l => ({
            name: l.name || 'Seller Lead',
            address: l.address && l.address !== 'No Property Address on File' ? l.address : '',
            zip: l.zip || '',
            status: l.status || 'New',
            source: l.source || 'Unknown'
          }));
        }
      }
    } catch (e) {
      issues.push('Leads');
    }

    // Broadcast global event so LeadDesk and OutreachActions refresh as well
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hushhawk:refresh-data'));
    }

    if (issues.length > 0) {
      hasFetchIssue.value = true;
      fetchIssueMsg.value = `Some data was unreachable (${issues.join(', ')}). Click retry.`;
      showRefreshToast(`⚠️ Refreshed with notice: ${issues.join(', ')}`, 'warning');
    } else {
      hasFetchIssue.value = false;
      showRefreshToast(`✓ All system data & Podio refreshed live!`, 'success');
    }
  } catch (err) {
    hasFetchIssue.value = true;
    fetchIssueMsg.value = `Data fetch error: ${err.message}. Click retry.`;
    showRefreshToast(`Refresh Error: ${err.message}`, 'error');
  } finally {
    isRefreshingAll.value = false;
  }
}
const addDealForm = ref({
  address: '',
  city: '',
  zip: '',
  seller: '',
  buyPrice: '',
  fee: '',
  milestoneIndex: 0
});

function formatMoney(val) {
  if (val == null || isNaN(val)) return '$0';
  return '$' + Math.round(Number(val)).toLocaleString('en-US');
}

function formatK(val) {
  if (!val || isNaN(val)) return '—';
  const num = Number(val);
  if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return '$' + Math.round(num / 1000) + 'K';
  return '$' + num;
}

function getMilestoneCount(idx) {
  const m = funnelData.value?.milestones?.[idx];
  return m ? (m.count || 0) : 0;
}

function getMilestoneVolumeStr(idx) {
  const m = funnelData.value?.milestones?.[idx];
  return (m && m.volume) ? formatK(m.volume) : '—';
}

function phaseDealsCount(start, end) {
  const ms = funnelData.value?.milestones || [];
  let count = 0;
  for (let i = start; i <= end; i++) {
    if (ms[i]) count += ms[i].count || 0;
  }
  return count;
}

function getMilestoneName(idx) {
  return stages[idx] || `Milestone ${idx + 1}`;
}

const selectedMilestoneObj = computed(() => {
  if (selectedMilestoneIndex.value === null) return null;
  return funnelData.value?.milestones?.[selectedMilestoneIndex.value] || null;
});

const selectedMilestoneDeals = computed(() => {
  return selectedMilestoneObj.value?.deals || [];
});

const selectedMilestoneVolume = computed(() => {
  return selectedMilestoneObj.value?.volume || 0;
});

const selectedMilestoneFee = computed(() => {
  return selectedMilestoneObj.value?.fee || 0;
});

function selectMilestone(i) {
  if (selectedMilestoneIndex.value === i) {
    selectedMilestoneIndex.value = null;
  } else {
    selectedMilestoneIndex.value = i;
  }
}

function closeFunnelDrawer() {
  selectedMilestoneIndex.value = null;
}

let toastTimer = null;
function showFunnelToast(msg, type = 'success') {
  advanceToast.value = { message: msg, type };
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    advanceToast.value = null;
  }, 4500);
}

async function loadFunnelData() {
  try {
    const res = await fetch('/api/v1/deal-funnel');
    if (res.ok) {
      funnelData.value = await res.json();
    }
  } catch (err) {
    console.warn('[Funnel] Load error:', err);
  }
}

async function advanceDeal(deal, targetIndex) {
  if (!deal || isAdvancingDeal.value[deal.id]) return;
  const nextIdx = targetIndex !== undefined ? targetIndex : deal.milestoneIndex + 1;
  if (nextIdx > 11) return;

  isAdvancingDeal.value = { ...isAdvancingDeal.value, [deal.id]: true };
  try {
    const res = await fetch('/api/v1/deal-funnel/advance', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId: deal.id,
        targetMilestoneIndex: nextIdx,
        notes: `Advanced from Command Center Funnel to milestone ${nextIdx + 1}: ${stages[nextIdx]}`
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.funnel) {
        funnelData.value = data.funnel;
      } else {
        await loadFunnelData();
      }
      showFunnelToast(`✓ ${deal.address} advanced to "${data.nextMilestone?.name || stages[nextIdx]}"!`);
    } else {
      const err = await res.json();
      showFunnelToast(`Failed to advance deal: ${err.error || 'Server error'}`, 'error');
    }
  } catch (e) {
    showFunnelToast(`Error advancing deal: ${e.message}`, 'error');
  } finally {
    isAdvancingDeal.value = { ...isAdvancingDeal.value, [deal.id]: false };
  }
}

function openAddDeal(idx = 0) {
  addDealForm.value = {
    address: '',
    city: '',
    zip: '',
    seller: '',
    buyPrice: '',
    fee: '',
    milestoneIndex: idx
  };
  isAddDealOpen.value = true;
}

async function submitNewDeal() {
  if (!addDealForm.value.address) return;
  try {
    const res = await fetch('/api/v1/deal-funnel/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addDealForm.value)
    });
    if (res.ok) {
      isAddDealOpen.value = false;
      await loadFunnelData();
      showFunnelToast(`✓ New deal "${addDealForm.value.address}" added to pipeline!`);
    } else {
      const err = await res.json();
      showFunnelToast(`Failed to add deal: ${err.error || 'Server error'}`, 'error');
    }
  } catch (e) {
    showFunnelToast(`Error adding deal: ${e.message}`, 'error');
  }
}
const sources=computed(()=>{
  const allLeads = leads.value || [];
  const total = allLeads.length;
  if (!total) return [];
  const counts = {};
  allLeads.forEach(l => {
    const s = l.source || 'Unknown';
    counts[s] = (counts[s] || 0) + 1;
  });
  const colorMap = {
    'Direct Mail': '#f64a68',
    'County Data': '#16c798',
    'Driving for Dollars': '#f3c34e',
    'Driving for $': '#f3c34e',
    'Website': '#a273ed',
    'Emailing': '#249bff',
    'Cold Call': '#3ca962',
    'Cold Calling': '#3ca962',
    'SMS Campaign': '#bc7770',
    'Other': '#8199b3'
  };
  return Object.entries(counts).map(([name, count]) => ({
    name,
    value: Math.round((count / total) * 100),
    color: colorMap[name] || '#dfbb61'
  })).sort((a, b) => b.value - a.value);
});
const donutGradient=computed(()=>{
  const sList = sources.value || [];
  if (!sList.length || sList.every(s => !s.value)) return '#143954';
  let acc = 0;
  const stops = [];
  sList.forEach(s => {
    const start = acc;
    acc += s.value;
    stops.push(`${s.color} ${start}% ${acc}%`);
  });
  return `conic-gradient(${stops.join(', ')})`;
});
const signals=ref([
  {code:'DUVAL',label:'Lead flow',value:'0',change:'Live'},
  {code:'BUYERS',label:'Cash buyers',value:'0',change:'Active'},
  {code:'CONTRACT',label:'Under contract',value:'0',change:'Live'},
  {code:'YIELD',label:'Assignment rev',value:'$0K',change:'Locked'},
  {code:'DEALS',label:'Dispo opportunities',value:'0',change:'Active'}
]);
const signalTape=computed(()=>[...(signals.value||[]),...(signals.value||[])]);
const signalsCount=computed(()=>(signals.value||[]).length);
function guard(e, customPath) {
  if (isEditing.value) {
    if (e) e.preventDefault();
    return;
  }
  const href = customPath || e?.currentTarget?.getAttribute?.('href') || e?.target?.closest?.('a')?.getAttribute?.('href');
  if (href && href.startsWith('/')) {
    handleNav(href, e);
  }
}
function chooseEmail(i){if(!isEditing.value)activeEmail.value=activeEmail.value===i?null:i;}
function saveDraft(){if(isEditing.value||!draft.value.trim())return;try{wwLib.getFrontWindow().sessionStorage.setItem('elite-dashboard-draft',draft.value);draftStatus.value='Draft saved to communications hub';}catch(e){draftStatus.value='Draft kept on this page';}}

async function loadDashboardData() {
  try {
    const res = await fetch('/api/v1/dashboard/metrics');
    if (res.ok) {
      const data = await res.json();
      if (data.metrics) metrics.value = data.metrics;
      if (data.signals) signals.value = data.signals;
      if (data.countyIntelligence) imports.value = data.countyIntelligence;
    }
  } catch (e) {}

  try {
    const resTasks = await fetch('/api/v1/tasks');
    if (resTasks.ok) {
      const tData = await resTasks.json();
      if (tData.tasks && tData.tasks.length) {
        rawTasks.value = tData.tasks;
        tasks.value = tData.tasks.map(t => t.title);
        checked.value = tData.tasks
          .map((t, idx) => (t.is_completed || t.done || t.completed || t.status === 'COMPLETED' || t.status === 'Done') ? idx : -1)
          .filter(idx => idx !== -1);
      }
    }
  } catch (e) {}

  try {
    const resComm = await fetch('/api/v1/communications');
    if (resComm.ok) {
      const cData = await resComm.json();
      const list = cData.threads || cData.communications || cData.messages || cData;
      if (Array.isArray(list) && list.length) {
        emails.value = list.filter(m => [m.type, m.channel].some(value => String(value).toLowerCase() === 'email')).map(m => ({
          name: m.sender || m.name || m.contact || m.recipient || 'Contact',
          subject: m.subject || 'Email conversation',
          body: m.content || m.body || m.preview || m.lastMessage || '',
          time: m.time || m.timestamp || 'Today'
        }));
        const text = list.find(m => [m.type, m.channel].some(value => ['sms', 'text'].includes(String(value).toLowerCase())));
        if (text) {
          activeChat.value = {
            name: text.contact || text.name || 'Contact',
            role: text.role || 'Active Lead',
            avatar: ((text.contact || text.name || 'AL').split(' ').map(n=>n[0]).join('').slice(0, 2)).toUpperCase(),
            status: text.time ? 'Active · ' + text.time : 'Active SMS conversation',
            messages: (Array.isArray(text.messages) ? text.messages : []).slice(-3)
              .map(message => ({ text: message.text, outgoing: message.sender === 'rep' || message.outgoing }))
          };
        }
      }
    }
  } catch (e) {}

  try {
    const resEmails = await fetch('/api/v1/outreach-actions/emails');
    if (resEmails.ok) {
      const eData = await resEmails.json();
      const emailList = eData.emails || [];
      if (emailList.length) {
        rawInboxes.value = emailList.map((em, idx) => ({
          id: em.id || (idx + 1),
          name: em.recipient_name || em.email,
          email: em.email,
          category: (em.recipient_role && em.recipient_role.includes('Buyer')) ? 'Proposals' : 'Title',
          received: 'Today',
          unreadCount: 0,
          status: em.status === 'QUEUED' ? 'Ready to Send' : 'Active',
          subject: em.subject,
          property: em.property_address
        }));

        const titleCount = emailList.filter(em => !(em.recipient_role && em.recipient_role.includes('Buyer'))).length;
        const proposalsCount = emailList.filter(em => (em.recipient_role && em.recipient_role.includes('Buyer'))).length;
        emailCategories.value = [
          { name: 'Inquiries', count: emailList.length },
          { name: 'Proposals', count: proposalsCount },
          { name: 'Title', count: titleCount },
          { name: 'Decisions', count: 0 },
          { name: 'Other', count: 0 }
        ];
      }
    }
  } catch (e) {}

  try {
    const resThreads = await fetch('/api/v1/chat/threads');
    if (resThreads.ok) {
      const chatData = await resThreads.json();
      teamUnreadCount.value = chatData.total_unread || 0;
      const tList = chatData.threads || [];
      if (tList.length) {
        const topThread = tList[0];
        const resMsgs = await fetch(`/api/v1/chat/threads/${topThread.id}/messages`);
        if (resMsgs.ok) {
          const mData = await resMsgs.json();
          const msgs = mData.messages || [];
          if (msgs.length) {
            teamMessages.value = msgs.slice(-5).map(m => ({
              id: m.id,
              sender: m.sender_name,
              initials: (m.sender_name || 'AR').split(' ').map(n=>n[0]).join('').slice(0, 2).toUpperCase(),
              roleColor: m.sender_name.includes('Alex') ? 'gold' : 'blue',
              text: m.message_text,
              time: new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
            }));
          }
        }
      }
    }
  } catch (e) {}

  try {
    const resProp = await fetch('/api/v1/properties');
    if (resProp.ok) {
      const pData = await resProp.json();
      const propsList = pData.properties || [];
      const validProp = propsList.find(p => p.address_line1 && p.assessed_value && Number(p.assessed_value) > 0);
      if (validProp) {
        const meta = validProp.metadata || {};
        activeSnapshot.value = {
          address: validProp.address_line1,
          cityStateZip: [validProp.city, validProp.state_code].filter(Boolean).join(', ') + ' ' + (validProp.postal_code || '') + (validProp.property_type ? ' · ' + validProp.property_type : ''),
          countyValue: Number(validProp.assessed_value),
          livingArea: Number(meta.living_area_sqft) || null,
          yearBuilt: Number(meta.year_built) || null,
          owner: meta.county_owner_of_record || ''
        };
      }
    }
  } catch (e) {}

  try {
    const resLeads = await fetch('/api/v1/seller-leads');
    if (resLeads.ok) {
      const lData = await resLeads.json();
      if (lData.leads && lData.leads.length) {
        leads.value = lData.leads.map(l => ({
          name: l.name || 'Seller Lead',
          address: l.address && l.address !== 'No Property Address on File' ? l.address : (l.email || 'Jacksonville, FL'),
          zip: l.zip || '',
          status: l.status || 'New',
          source: l.source || 'Unknown'
        }));
      }
    } else {
      const resFb = await fetch('/api/v1/facebook-leads');
      if (resFb.ok) {
        const lData = await resFb.json();
        if (lData.leads && lData.leads.length) {
          leads.value = lData.leads.map(l => ({
            name: l.name || l.author || 'Seller Lead',
            address: l.propertyAddress || l.address || 'Jacksonville, FL',
            zip: l.zip || '',
            status: l.status || 'New',
            source: l.source || 'Unknown'
          }));
        }
      }
    }
  } catch (e) {}
}

async function onTaskToggle(i) {
  const t = rawTasks.value[i];
  if (!t) return;
  const isDone = checked.value.includes(i);
  try {
    await fetch('/api/v1/tasks/' + (t.task_id || t.id), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: isDone, done: isDone, status: isDone ? 'COMPLETED' : 'PENDING' })
    });
  } catch (e) {}
}

function onZip(event){zip.value=event.event?.zip||'';}
function clearZip(){if(!isEditing.value)zip.value='';}
onMounted(()=>{
  const tick=()=>{
    const now=new Date();
    clock.value=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',minute:'2-digit'}).format(now);
    currentTime.value=now.toLocaleTimeString('en-US',{
      timeZone:'America/New_York',
      hour:'2-digit',
      minute:'2-digit',
      hour12:true
    });
  };
  loadFunnelData();
  tick();
  loadDashboardData();
  checkPodioStatus();
  timer=setInterval(tick,30000);
  initNotificationPolling();
  clickOutsideHandler=(e)=>{
    if(!e.target.closest('.quick-add-wrap')){
      isQuickAddOpen.value=false;
    }
    if(!e.target.closest('.notif-dropdown')&&!e.target.closest('.notification-btn')&&!e.target.closest('.hushhawk-notif-dropdown')){
      isNotifOpen.value=false;
    }
    if(!e.target.closest('.user-identity-wrap')){
      isUserMenuOpen.value=false;
    }
  };
  if(typeof document!=='undefined'){
    document.addEventListener('click',clickOutsideHandler);
  }
  if(typeof window!=='undefined'){
    try{
      const raw=window.sessionStorage.getItem('hushhawk_session')||window.localStorage.getItem('hushhawk_session');
      if(raw){
        activeUser.value=JSON.parse(raw);
      }
    }catch(e){}
  }
  try{draft.value=wwLib.getFrontWindow().sessionStorage.getItem('elite-dashboard-draft')||'';}catch(e){}
if(isEditing.value)return;
const doc=wwLib.getFrontDocument(),host=marketHost.value;if(!host)return;
const widget=doc.createElement('div');widget.className='tradingview-widget-container__widget';host.appendChild(widget);
const script=doc.createElement('script');script.type='text/javascript';script.src='https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';script.async=true;
script.textContent=JSON.stringify({symbols:[{proName:'NASDAQ:NVDA',title:'NVIDIA'},{proName:'NASDAQ:AAPL',title:'Apple'},{proName:'NASDAQ:MSFT',title:'Microsoft'},{proName:'NASDAQ:TSLA',title:'Tesla'},{proName:'AMEX:SPY',title:'S&P 500 ETF'},{proName:'AMEX:VNQ',title:'Real Estate ETF'},{proName:'BITSTAMP:BTCUSD',title:'Bitcoin'}],colorTheme:'dark',locale:'en',isTransparent:true,showSymbolLogo:true,displayMode:'adaptive'});
script.onerror=()=>marketError.value=true;host.appendChild(script);
marketTimer=setTimeout(()=>{if(!host.querySelector('iframe'))marketError.value=true;},15000);
});
onBeforeUnmount(()=>{
  clearInterval(timer);
  clearTimeout(marketTimer);
  if(typeof document!=='undefined'&&clickOutsideHandler){
    document.removeEventListener('click',clickOutsideHandler);
  }
  if(marketHost.value)marketHost.value.innerHTML='';
});
return{icons,uid,feedMode,isEditing,metrics,query,zip,checked,tasks,imports,filteredLeads,leads,stages,stageColors,sources,donutGradient,emails,activeEmail,chooseEmail,activeChat,activeSnapshot,notifications,unreadCount,money,draft,draftStatus,saveDraft,paused,signals,signalTape,signalsCount,clock,marketHost,marketError,onZip,clearZip,guard,isQuickAddOpen,isNotifOpen,currentTime,navOpen,primaryNavigation,secondaryNavigation,handleNav,isUserMenuOpen,activeUserName,activeUserRole,activeUserEmail,handleLogout,funnelData,selectedMilestoneIndex,selectedMilestoneObj,selectedMilestoneDeals,selectedMilestoneVolume,selectedMilestoneFee,isAdvancingDeal,advanceToast,isAddDealOpen,addDealForm,formatMoney,formatK,getMilestoneCount,getMilestoneVolumeStr,phaseDealsCount,getMilestoneName,selectMilestone,closeFunnelDrawer,advanceDeal,openAddDeal,submitNewDeal,isSyncingPodio,podioLeadsCount,podioStatusText,podioConnected,podioProblem,onTaskToggle,syncPodioLive,emailCategories,selectedEmailCategory,activeEmailIdx,filteredEmailList,totalUnreadEmails,selectedChatChannel,teamReplyDraft,teamMessages,teamUnreadCount,sendTeamMessage,openComposeEmail,openEmailInbox,openPartnerChat,onChatChannelChange,isRefreshingAll,hasFetchIssue,fetchIssueMsg,refreshToast,refreshAllData,isEmailModalOpen,selectedEmail,isSendingEmail,dispatchDashboardEmail,activeChatThreadId};
}};
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

/* Dashboard navigation */
.sidebar {
  width: 220px !important;
  min-width: 220px !important;
  max-width: 220px !important;
  display: flex !important;
  flex-direction: column !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain !important;
  scrollbar-width: thin !important;
  scrollbar-color: rgba(212, 175, 55, 0.4) transparent !important;
  box-sizing: border-box !important;
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

.sidebar .more-workspaces {
  margin: 10px 0 0 0 !important;
  border-top: 1px solid rgba(212, 175, 55, 0.15) !important;
  padding-top: 8px !important;
}

.sidebar .more-workspaces summary {
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
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  text-align: center !important;
  gap: 8px !important;
  width: 100% !important;
  height: 38px !important;
  min-height: 38px !important;
  padding: 0 14px !important;
  background: var(--hh-nav-logout-surface, rgba(10, 16, 28, 0.75)) !important;
  border: 1px solid rgba(212, 175, 55, 0.35) !important;
  border-radius: 9px !important;
  color: #fca5a5 !important;
  font-family: inherit !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  letter-spacing: 0.3px !important;
  cursor: pointer !important;
  backdrop-filter: blur(8px) !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

.sidebar-logout-btn:hover {
  background: rgba(239, 68, 68, 0.18) !important;
  border-color: rgba(239, 68, 68, 0.6) !important;
  color: #ffffff !important;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.35) !important;
  transform: translateY(-1px);
}

.sidebar-logout-btn svg {
  width: 15px !important;
  height: 15px !important;
  stroke: #fca5a5 !important;
  transition: stroke 0.2s ease !important;
}

.sidebar-logout-btn:hover svg {
  stroke: #ffffff !important;
}

.sidebar .more-workspaces summary {
  cursor: pointer;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #edcf7c;
  padding: 6px 10px;
  font-weight: 700;
}

.sidebar-logout-section {
  flex-shrink: 0;
  padding: 8px 10px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: auto;
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
  padding: 10px;
  color: #e4d39b;
  border-top: 1px solid rgba(212, 175, 55, 0.12);
}

.brand-bottom p {
  font-size: 8px;
  letter-spacing: 1.4px;
  line-height: 1.5;
  margin: 0 0 3px;
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
  margin-top: 5px;
  color: #64748b;
}

/* Workspace Layout */
.workspace {
  margin-left: 220px !important;
  width: calc(100% - 220px) !important;
  min-width: 0 !important;
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% 0%, rgba(10, 79, 142, 0.18) 0%, transparent 60%), linear-gradient(180deg, #030f1e 0%, #040f1d 100%);
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
  gap: 0.45rem;
  font-size: 0.75rem;
  color: #f8fafc;
  background: rgba(4, 20, 38, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  border: 1px solid rgba(212, 175, 55, 0.4);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  flex-shrink: 0;
}

.clock-label {
  color: #cbd5e1;
  font-weight: 600;
}

.live-clock strong {
  color: #fde68a;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-shadow: 0 0 6px rgba(253, 230, 138, 0.35);
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
  background: rgba(212, 175, 55, 0.15);
  border-color: #edcf7c;
  color: #fff;
  box-shadow: 0 0 10px rgba(237, 207, 124, 0.25);
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
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-gold:hover {
  transform: translateY(-1px);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.4), 0 4px 14px rgba(212, 175, 55, 0.35);
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
  transition: all 0.15s ease;
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
  border-radius: 8px;
  color: #cbd5e1;
  cursor: pointer;
  padding: 6px;
  transition: all 0.2s ease;
}

.notification-btn:hover {
  border-color: rgba(212, 175, 55, 0.4);
  color: #f5cf72;
}

.notif-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  background: #f87171;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 10px;
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

/* ================== COMMAND DASHBOARD STYLES ================== */
.command {
  --navy: #0A1128;
  --white: #fff;
  background: radial-gradient(ellipse at 40% 0%, rgba(10, 79, 142, 0.2) 0%, rgba(5, 26, 48, 0.95) 55%, #041427 100%);
  color: var(--white);
  font-family: 'Plus Jakarta Sans', Arial, sans-serif;
  width: 100%;
  min-width: 0;
  container-type: inline-size;
  padding: 0 16px 14px;
  box-sizing: border-box;
}

.command * { box-sizing: border-box; }
.command a { text-decoration: none; color: #65c9ff; }
.command :is(button, input, select, textarea) { font-family: inherit; }
.command button, .command a { cursor: pointer; }
.command button:focus-visible, .command a:focus-visible, .command input:focus-visible { outline: 2px solid #f5cf72; outline-offset: 2px; }
.command button:disabled { cursor: default; opacity: .5; }
.command :deep(svg), .command :deep(.svg-icon) { display: block; width: 100%; height: 100%; }

.demo-line i, .pulse-heading i {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #28dca1;
  margin-right: 5px;
  box-shadow: 0 0 8px #28dca188;
}

/* Dashboard Hero */
.hero {
  min-height: 128px;
  background-position: center 54%;
  background-size: cover;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 14px;
  margin: 0 -16px 12px;
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
}

.eyebrow {
  color: rgba(212, 175, 55, 0.85);
  font-size: 8.5px;
  letter-spacing: 2px;
  font-weight: 700;
}

.hero h1 {
  font-size: clamp(24px, 3cqw, 38px);
  line-height: 1.15;
  letter-spacing: -0.8px;
  margin: 4px 0;
  font-weight: 850;
  color: #ffffff;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.6);
}

.hero h1 em {
  font-style: normal;
  color: #f5cf72;
  background: linear-gradient(135deg, #fff2cc 0%, #d4af37 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero h2 {
  font-size: 14px;
  margin: 0 0 6px;
  font-weight: 600;
  color: #e2e8f0;
}

.hero p {
  font-size: 11px;
  color: #94a3b8;
  margin: 0;
}

.principles {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 13px;
  font-size: 8.5px;
  letter-spacing: 1.4px;
  color: #e3cd95;
}

.principles span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(212, 175, 55, 0.08);
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 20px;
  padding: 3px 10px;
  font-size: 8.5px;
  letter-spacing: 1.4px;
  color: #f5cf72;
}

.p-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 13px;
  height: 13px;
  min-width: 13px;
  min-height: 13px;
  flex-shrink: 0;
  color: #f5cf72;
}

.city {
  text-align: center;
  margin-right: 6%;
  transform: rotate(-4deg);
}

.city strong {
  display: block;
  font: italic 42px Georgia, serif;
  color: #f9dc90;
  text-shadow: 0 3px 10px #001025;
}

.city span {
  font-size: 8px;
  letter-spacing: 2px;
  color: #cbd5e1;
}

.demo-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 8.5px;
  padding: 6px 2px;
  color: #94a3b8;
}

.demo-line i {
  background: #eac56b;
  box-shadow: none;
  width: 5px;
  height: 5px;
}

/* ================== KPI METRICS CARDS (PREMIUM) ================== */
.metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 80px;
  padding: 12px 16px;
  background: rgba(6, 26, 48, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(212, 175, 55, 0.18);
  border-radius: 10px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
  min-width: 0;
  overflow: hidden;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.metric:hover {
  border-color: rgba(212, 175, 55, 0.45);
  background: rgba(10, 36, 66, 0.85);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45), 0 0 15px rgba(212, 175, 55, 0.15);
}

.metric > div {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.metric-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 8px;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.2);
  color: #f5cf72;
  flex-shrink: 0;
}

.metric:nth-child(6) .metric-icon { color: #f5cf72; }
.metric:last-child .metric-icon { color: #fa5d73; }

.metric-label {
  font-size: 11.5px;
  color: #94a3b8;
  font-weight: 600;
  line-height: 1.3;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}

.metric strong {
  font-size: 24px;
  color: #ffffff;
  display: block;
  font-weight: 850;
  letter-spacing: -0.5px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}

.metric-note { display: block; font-size: 11px; opacity: 0.72; margin-top: 2px; letter-spacing: 0.02em; }
.metric small {
  font-size: 11px;
  color: #22c55e;
  font-weight: 700;
  white-space: nowrap;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric small span {
  font-size: 9.5px;
  color: #7c9ab5;
  font-weight: 400;
}

/* ================== PRIMARY GRID PANELS (GLASS CARDS) ================== */
.primary-grid {
  display: grid;
  grid-template-columns: 2.03fr 1fr 1.04fr 1.08fr;
  gap: 10px;
  align-items: stretch;
}

.panel {
  min-width: 0;
  border: 1px solid rgba(212, 175, 55, 0.18);
  border-radius: 10px;
  overflow: hidden !important;
  background: rgba(5, 22, 42, 0.85);
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: border-color 0.2s ease;
  display: flex !important;
  flex-direction: column !important;
  box-sizing: border-box !important;
}

.panel:hover {
  border-color: rgba(212, 175, 55, 0.32);
}

.panel-title {
  height: 36px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.15);
  background: linear-gradient(180deg, rgba(212, 175, 55, 0.06) 0%, rgba(4, 18, 35, 0.4) 100%);
}

.panel-title h3 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin: 0;
  white-space: nowrap;
  font-weight: 750;
  color: #f8fafc;
}

.panel-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 15px;
  height: 15px;
  min-width: 15px;
  min-height: 15px;
  flex-shrink: 0;
  color: #f5cf72;
}

.panel-title a, .panel-title > span {
  font-size: 9px;
  white-space: nowrap;
  color: #edcf7c;
  font-weight: 600;
  transition: color 0.15s ease;
}

.panel-title a:hover {
  color: #ffffff;
}

.inbox, .chat {
  display: flex;
  flex-direction: column;
}

/* Mail List */
.mail-list button {
  display: flex;
  position: relative;
  gap: 8px;
  text-align: left;
  width: 100%;
  background: none;
  color: #eaf4ff;
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 10px;
  min-height: 62px;
  transition: background 0.15s ease;
}

.mail-list button:hover, .mail-list button.selected {
  background: rgba(212, 175, 55, 0.08);
}

.mail-dot {
  width: 6px;
  height: 6px;
  background: #f83c60;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

.mail-list button > div { min-width: 0; flex: 1; }
.mail-list strong { font-size: 9.5px; display: block; padding-right: 40px; color: #f8fafc; }
.mail-list b { font-size: 9px; display: block; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #edcf7c; font-weight: 600; }
.mail-list p { margin: 3px 0 0; font-size: 8px; color: #94a3b8; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.mail-list time { position: absolute; top: 12px; right: 10px; font-size: 7.5px; color: #64748b; }
.email-preview { padding: 10px; font-size: 9px; background: rgba(4, 18, 35, 0.6); }
.email-preview p { line-height: 1.5; color: #cbd5e1; }
.email-preview b { font-size: 10px; color: #f5cf72; }
.panel-note { font-size: 8.5px; color: #94a3b8; margin: 0; padding: 8px 10px; }
.inbox > .panel-note { margin-top: auto; }

/* Chat Box */
.contact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(140deg, #d4af37, #855f17);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: bold;
  color: #04182d;
}

.contact strong { font-size: 11px; color: #f8fafc; }
.contact small { font-size: 8.5px; color: #94a3b8; }
.contact p { font-size: 8px; margin: 3px 0; color: #94a3b8; }

.bubbles {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 0 1 auto;
}

.bubbles p {
  margin: 0;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 9.5px;
  line-height: 1.4;
  border-radius: 8px 8px 8px 0;
  max-width: 92%;
  align-self: flex-start;
  color: #f1f5f9;
}

.bubbles .outgoing {
  background: linear-gradient(135deg, #d4af37, #a07d2d);
  color: #04182d;
  font-weight: 600;
  align-self: flex-end;
  border-radius: 8px 8px 0 8px;
}

.chat form {
  display: flex;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(4, 18, 35, 0.5);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.chat form input {
  width: 0;
  flex: 1;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: white;
  font-size: 9.5px;
}

.chat form input:focus {
  border-color: rgba(212, 175, 55, 0.5);
  outline: none;
}

.chat form button {
  background: linear-gradient(135deg, #f5cf72, #d4af37);
  color: #04182d;
  font-weight: 700;
  border: 0;
  border-radius: 6px;
  font-size: 9px;
  padding: 6px 10px;
  transition: filter 0.15s ease;
}

.chat form button:hover {
  filter: brightness(1.1);
}

/* Right Stack: Priorities & Imports */
.right-stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
}

.priorities { display: flex; flex-direction: column; height: auto; min-height: auto; }
.tasks-container {
  max-height: 180px;
  overflow-y: auto;
}
.tasks-container label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 9px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  cursor: pointer;
}
.tasks-container label:hover {
  background: rgba(212, 175, 55, 0.05);
}

.priorities input {
  accent-color: #f5cf72;
  width: 13px;
  height: 13px;
  margin: 0;
}

.done {
  text-decoration: line-through;
  color: #64748b;
}

.imports { display: flex; flex-direction: column; height: auto; min-height: auto; }
.imports-container {
  max-height: 180px;
  overflow-y: auto;
}
.imports-container > div {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 10px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 9.5px;
}

.imports strong { font-weight: 600; color: #f8fafc; }
.imports > div > span:last-child { margin-left: auto; text-align: right; color: #edcf7c; font-size: 9.5px; font-weight: 600; }
.imports small { display: block; font-size: 7.5px; color: #94a3b8; }
.check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.3);
  display: grid;
  place-items: center;
  color: #4ade80;
}
.tiny-svg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}
.imports > a {
  font-size: 8.5px;
  display: block;
  text-align: right;
  padding: 8px 10px;
  color: #edcf7c;
  font-weight: 600;
}

/* ================== SECONDARY GRID ================== */
.secondary-grid {
  display: grid;
  grid-template-columns: 1.45fr 1.4fr 1fr 1.18fr;
  gap: 10px;
  margin-top: 10px;
}

/* ================== DEAL-FLOW FUNNEL (12 MILESTONES) ================== */
.hushhawk-funnel-card {
  margin-top: 10px;
  background: rgba(5, 22, 42, 0.92);
  border: 1px solid rgba(212, 175, 55, 0.28);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(245, 207, 114, 0.15);
}

.funnel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(90deg, rgba(212, 175, 55, 0.12) 0%, rgba(4, 18, 35, 0.6) 100%);
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
}

.funnel-title-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.funnel-title-left h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 6px;
}

.funnel-milestones-tag {
  font-size: 9.5px;
  padding: 2px 7px;
  border-radius: 12px;
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid rgba(212, 175, 55, 0.35);
  color: #f5cf72;
  font-weight: 600;
}

.funnel-summary-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.35);
  color: #4ade80;
}
.funnel-summary-badge strong {
  color: #86efac;
}

.funnel-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.funnel-rev-stat {
  font-size: 10px;
  color: #94a3b8;
}
.funnel-rev-stat strong {
  color: #f5cf72;
  font-weight: 700;
}

.btn-funnel-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(180, 140, 30, 0.5));
  border: 1px solid #f5cf72;
  color: #fef08a;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-funnel-add:hover {
  background: linear-gradient(135deg, #f5cf72, #d4af37);
  color: #04182d;
  box-shadow: 0 0 10px rgba(245, 207, 114, 0.4);
}

.btn-funnel-close-tray {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #cbd5e1;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-funnel-close-tray:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #fca5a5;
}

/* Phase Ribbon */
.funnel-phase-ribbon {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 6px 10px;
  background: rgba(4, 18, 35, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.phase-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 9.5px;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.phase-circle {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #64748b;
}
.phase-acq .phase-circle { background: #38bdf8; }
.phase-contracts .phase-circle { background: #c084fc; }
.phase-dispo .phase-circle { background: #4ade80; }

.phase-name { font-weight: 600; color: #e2e8f0; }
.phase-stat { margin-left: auto; font-size: 8.5px; color: #94a3b8; }

.phase-pill.phase-highlight {
  border-color: #f5cf72;
  background: rgba(212, 175, 55, 0.12);
  color: #fef08a;
  box-shadow: inset 0 0 8px rgba(245, 207, 114, 0.2);
}

/* 12 Milestone Grid */
.funnel-stage-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 10px;
}

.stage-box {
  position: relative;
  min-height: 58px;
  background: linear-gradient(155deg, rgba(20, 42, 68, 0.8), rgba(6, 20, 36, 0.95));
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 6px;
  padding: 6px 7px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.stage-box:hover {
  border-color: #f5cf72;
  background: linear-gradient(155deg, rgba(30, 60, 96, 0.9), rgba(10, 30, 52, 0.98));
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 0 10px rgba(245, 207, 114, 0.25);
  transform: translateY(-2px);
}

.stage-box.is-selected {
  border-color: #f5cf72 !important;
  background: linear-gradient(155deg, rgba(74, 52, 18, 0.9), rgba(30, 22, 10, 0.98)) !important;
  box-shadow: 0 0 18px rgba(245, 207, 114, 0.4), inset 0 1px 0 #ffe0a3 !important;
}

.stage-box.has-active-deals {
  border-top: 2px solid var(--stage, #f5cf72);
}

.stage-box.stage-terminal {
  border-color: rgba(34, 197, 94, 0.4);
  background: linear-gradient(155deg, rgba(20, 60, 36, 0.8), rgba(8, 28, 18, 0.95));
}
.stage-box.stage-terminal:hover {
  border-color: #22c55e;
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.35);
}

.stage-box-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.stage-box-num {
  font-size: 13px;
  font-weight: 800;
  color: #f5cf72;
  letter-spacing: -0.3px;
}

.stage-deal-count {
  font-size: 8px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.stage-deal-count.active-count {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.4);
}

.stage-box-label {
  font-size: 9px;
  font-weight: 650;
  line-height: 1.25;
  color: #f1f5f9;
  margin: 3px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-box-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-top: 2px;
}

.stage-box-vol {
  font-size: 8.5px;
  font-weight: 700;
  color: #cbd5e1;
}

.stage-workspace-link {
  font-size: 9px;
  color: #edcf7c;
  opacity: 0.7;
  padding: 0 2px;
  transition: all 0.15s ease;
}
.stage-workspace-link:hover {
  opacity: 1;
  color: #ffffff;
  transform: scale(1.2);
}

.stage-active-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #f5cf72;
}

/* Inspector Tray (Drawer) */
.funnel-inspector-tray {
  margin: 4px 10px 10px;
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(7, 28, 52, 0.98) 0%, rgba(4, 18, 35, 0.99) 100%);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(245, 207, 114, 0.15);
  overflow: hidden;
  animation: traySlideDown 0.25s ease-out;
}

@keyframes traySlideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

.inspector-tray-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.2);
  background: rgba(212, 175, 55, 0.05);
  flex-wrap: wrap;
  gap: 10px;
}

.ith-badge {
  display: inline-block;
  font-size: 8.5px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 10px;
  border: 1px solid;
  margin-bottom: 3px;
}

.ith-title {
  margin: 0;
  font-size: 14px;
  font-weight: 750;
  color: #ffffff;
}

.ith-desc {
  margin: 2px 0 0;
  font-size: 9.5px;
  color: #94a3b8;
}

.ith-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ith-metric {
  display: flex;
  flex-direction: column;
  font-size: 9px;
  color: #94a3b8;
}
.ith-metric strong {
  font-size: 12px;
  color: #ffffff;
  font-weight: 700;
}
.ith-metric strong.gold-accent {
  color: #f5cf72;
}

.btn-open-workspace {
  background: rgba(212, 175, 55, 0.18);
  border: 1px solid #f5cf72;
  color: #fef08a;
  font-size: 10px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 4px;
  text-decoration: none;
  transition: all 0.15s ease;
}
.btn-open-workspace:hover {
  background: #f5cf72;
  color: #04182d;
}

.btn-close-tray {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #cbd5e1;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
}
.btn-close-tray:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: #ef4444;
  color: #fca5a5;
}

.inspector-tray-body {
  padding: 12px;
  max-height: 380px;
  overflow-y: auto;
}

.tray-empty-state {
  text-align: center;
  padding: 24px 12px;
  color: #94a3b8;
  font-size: 11px;
}
.btn-quick-add-to-stage {
  margin-top: 8px;
  background: rgba(212, 175, 55, 0.2);
  border: 1px solid #f5cf72;
  color: #fef08a;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-quick-add-to-stage:hover {
  background: #f5cf72;
  color: #04182d;
}

.tray-deals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

.tray-deal-card {
  background: rgba(4, 18, 35, 0.7);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.2s ease;
}
.tray-deal-card:hover {
  border-color: #f5cf72;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.tdc-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
}

.tdc-address-group {
  display: flex;
  flex-direction: column;
}
.tdc-code {
  font-size: 8px;
  font-family: monospace;
  color: #f5cf72;
  font-weight: 700;
}
.tdc-street {
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
}
.tdc-city {
  font-size: 8.5px;
  color: #94a3b8;
}

.tdc-days-tag {
  font-size: 8px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  white-space: nowrap;
}
.tdc-days-tag.stale {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.4);
}

.tdc-metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
}

.tdc-metric-item {
  display: flex;
  flex-direction: column;
  font-size: 8px;
  color: #94a3b8;
}
.tdc-metric-item strong {
  font-size: 10px;
  color: #f1f5f9;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tdc-metric-item small {
  font-size: 7.5px;
  color: #64748b;
}
.gold-fee {
  color: #4ade80 !important;
  font-weight: 700 !important;
}

.tdc-notes {
  font-size: 8px;
  color: #cbd5e1;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 6px;
  border-radius: 4px;
  border-left: 2px solid #f5cf72;
}
.note-pill {
  font-weight: 700;
  color: #f5cf72;
  font-size: 7.5px;
}

.tdc-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.tdc-source {
  font-size: 7.5px;
  color: #64748b;
}

.btn-advance-milestone {
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.3), rgba(180, 140, 30, 0.5));
  border: 1px solid #f5cf72;
  color: #fef08a;
  font-size: 9px;
  font-weight: 750;
  padding: 4px 9px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-advance-milestone:hover:not(:disabled) {
  background: linear-gradient(135deg, #f5cf72, #d4af37);
  color: #04182d;
  box-shadow: 0 0 10px rgba(245, 207, 114, 0.4);
}
.btn-advance-milestone:disabled {
  opacity: 0.6;
  cursor: wait;
}

.status-funded-badge {
  font-size: 8.5px;
  font-weight: 750;
  color: #4ade80;
  background: rgba(34, 197, 94, 0.15);
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

/* Toast Banner */
.funnel-toast-banner {
  margin: 6px 10px;
  padding: 6px 12px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid #22c55e;
  color: #86efac;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  animation: fadeIn 0.2s ease;
}
.funnel-toast-banner.error {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #fca5a5;
}

/* Interactive Email Modal Styles */
.email-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.email-modal-card {
  width: 100%;
  max-width: 540px;
  background: linear-gradient(180deg, #091c30 0%, #041120 100%);
  border: 1px solid #f5cf72;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 24px rgba(245, 207, 114, 0.2);
  overflow: hidden;
}

.em-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  background: rgba(212, 175, 55, 0.08);
}

.em-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.em-icon {
  display: flex;
  color: #f5cf72;
}

.em-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  color: #f5cf72;
  letter-spacing: 0.5px;
}

.em-header small {
  color: #94a3b8;
  font-size: 10px;
  display: block;
}

.btn-em-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}
.btn-em-close:hover {
  color: #fff;
}

.em-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.em-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.em-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.em-field label {
  font-size: 10px;
  font-weight: 700;
  color: #cbd5e1;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.em-field input,
.em-field textarea {
  background: #030d17;
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  color: #f8fafc;
  font-size: 11px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.em-field input:focus,
.em-field textarea:focus {
  outline: none;
  border-color: #f5cf72;
  box-shadow: 0 0 8px rgba(245, 207, 114, 0.2);
}

.em-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.em-footer-right {
  display: flex;
  gap: 8px;
}

.btn-em-cancel {
  background: transparent;
  border: 1px solid #475569;
  color: #94a3b8;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-em-cancel:hover {
  border-color: #cbd5e1;
  color: #fff;
}

.btn-em-comms {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s;
}
.btn-em-comms:hover {
  color: #f5cf72;
}

.btn-em-send {
  background: linear-gradient(135deg, #f5cf72, #d4af37);
  color: #04182d;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(245, 207, 114, 0.3);
  transition: all 0.2s;
}
.btn-em-send:hover:not(:disabled) {
  box-shadow: 0 4px 14px rgba(245, 207, 114, 0.5);
  transform: translateY(-1px);
}
.btn-em-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Modal Window */
.funnel-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.funnel-modal-window {
  width: 100%;
  max-width: 480px;
  background: linear-gradient(180deg, #091c30 0%, #041120 100%);
  border: 1px solid #f5cf72;
  border-radius: 10px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(245, 207, 114, 0.2);
  overflow: hidden;
}

.fm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.25);
  background: rgba(212, 175, 55, 0.08);
}
.fm-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 750;
  color: #f5cf72;
}
.btn-fm-close {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
}
.btn-fm-close:hover { color: #ffffff; }

.fm-form {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fm-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.fm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fm-field label {
  font-size: 9px;
  font-weight: 600;
  color: #cbd5e1;
}
.fm-field input, .fm-field select {
  background: rgba(2, 10, 20, 0.8);
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 4px;
  padding: 6px 8px;
  font-size: 10.5px;
  color: #ffffff;
  outline: none;
}
.fm-field input:focus, .fm-field select:focus {
  border-color: #f5cf72;
  box-shadow: 0 0 8px rgba(245, 207, 114, 0.3);
}

.fm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.btn-fm-cancel {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  font-size: 10px;
  padding: 5px 12px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-fm-submit {
  background: linear-gradient(135deg, #f5cf72, #d4af37);
  border: 1px solid #ffe0a3;
  color: #04182d;
  font-size: 10px;
  font-weight: 750;
  padding: 5px 14px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-fm-submit:hover {
  box-shadow: 0 0 12px rgba(245, 207, 114, 0.5);
}

.pipeline-footer {
  padding: 0 8px 8px;
  color: #94a3b8;
  font-size: 7.5px;
  display: flex;
  justify-content: space-between;
}
.pipeline-footer span { color: #4ade80; font-weight: 700; }

table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
th { text-align: left; color: #94a3b8; font-weight: 600; padding: 6px 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
td { padding: 6px 8px; border-top: 1px solid rgba(255, 255, 255, 0.04); white-space: nowrap; color: #e2e8f0; }
td a { color: var(--hh-link, #f5cf72) !important; }
.status { font-size: 7.5px; padding: 2px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 700; }
.status.Contacted { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
.status.Appointment { background: rgba(212, 175, 55, 0.2); color: #f5cf72; }
.leads-table-container {
  max-height: 190px;
  overflow-y: auto;
}
.leads-footer {
  padding: 6px 10px;
  background: rgba(4, 18, 35, 0.6);
  font-size: 8px;
  text-align: right;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  margin-top: auto;
}
.leads-footer a {
  color: #edcf7c !important;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.15s ease;
}
.leads-footer a:hover {
  color: #ffffff !important;
}
.clear-filter { margin: 2px 6px 6px; background: rgba(212, 175, 55, 0.15); color: #f5cf72; border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 4px; font-size: 8px; padding: 3px 6px; }

/* Donut & Sources */
.source-body { display: flex; align-items: center; gap: 12px; padding: 12px 10px; }
.donut {
  flex-shrink: 0;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}
.donut > div {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #04182d;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
.donut strong { font-size: 16px; color: #ffffff; }
.donut small { font-size: 7.5px; color: #94a3b8; }
.sources ul { list-style: none; padding: 0; margin: 0; flex: 1; min-width: 0; }
.sources li { display: flex; align-items: center; gap: 5px; font-size: 7.5px; margin: 7px 0; color: #cbd5e1; }
.sources li i { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.sources li b { margin-left: auto; color: #ffffff; }
.sources li span { min-width: 0; overflow-wrap: anywhere; }
.sources li b { flex-shrink: 0; }

/* Deal Snapshot */
.panel.analyzer {
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
  overflow: hidden !important;
}
.analyzer-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  padding: 2px 0 4px;
}
.analyzer-prop-header {
  padding: 8px 12px 4px;
}
.analyzer-prop-header .property {
  font-size: 11.5px !important;
  display: block !important;
  padding: 0 !important;
  margin: 0 !important;
  color: var(--hh-light-control-ink, #ffffff) !important;
  font-weight: 700 !important;
  letter-spacing: 0.15px;
  line-height: 1.3 !important;
}
.analyzer-prop-header p,
.analyzer-prop-header .analyzer-prop-sub {
  font-size: 9.5px !important;
  color: var(--hh-light-muted, #94a3b8) !important;
  margin: 2px 0 0 !important;
  line-height: 1.35 !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.analyzer dl, .analyzer-dl {
  margin: 4px 12px;
  font-size: 8.5px;
  padding: 0;
}
.analyzer dl div, .analyzer-dl div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 3px 0;
}
.analyzer dt, .analyzer-dl dt { color: #94a3b8; margin: 0; font-size: 8.5px; }
.analyzer dd, .analyzer-dl dd { margin: 0; color: var(--hh-light-control-ink, #ffffff); font-weight: 600; font-size: 9px; }
.profit {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 4px 10px 4px;
  padding: 5px 9px;
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 6px;
  background: rgba(34, 197, 94, 0.08);
  color: var(--hh-success, #4ade80);
  font-size: 8.5px;
}
.profit span {
  font-size: 8.5px;
  color: var(--hh-success, #4ade80);
  font-weight: 600;
}
.profit strong {
  font-size: 13px !important;
  color: var(--hh-light-control-ink, #ffffff);
  font-weight: 850;
}
.analyzer-footer {
  padding: 7px 12px;
  background: var(--hh-surface, rgba(4, 18, 35, 0.75));
  font-size: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom-left-radius: 9px !important;
  border-bottom-right-radius: 9px !important;
  margin-top: auto;
  box-sizing: border-box !important;
  overflow: hidden !important;
}
.profit-sub, .analyzer-footer small {
  font-size: 8px !important;
  color: var(--hh-light-muted, #94a3b8) !important;
  display: block !important;
  padding: 0 !important;
  margin: 0 !important;
  line-height: 1.35 !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Pulse & Capital Desk */
.pulse {
  margin-top: 10px;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 8px;
  background: rgba(4, 18, 35, 0.9);
  overflow: hidden;
}
.pulse-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(212, 175, 55, 0.12);
  font-size: 8.5px;
}
.pulse-heading > strong { color: #f5cf72; font-size: 9.5px; letter-spacing: 1.2px; }
.pulse-heading > span { color: #94a3b8; font-size: 7.5px; letter-spacing: .7px; }
.pulse-heading button { margin-left: auto; background: transparent; border: 0; color: #edcf7c; font-size: 8.5px; cursor: pointer; }
.tape-window { overflow: hidden; }
.tape { display: flex; width: max-content; animation: tapeMove 45s linear infinite; }
.tape.paused, .tape:hover { animation-play-state: paused; }
.tape > span {
  padding: 8px 18px;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 9.5px;
  color: #94a3b8;
}
.tape b { color: #f5cf72; letter-spacing: 1px; }
.tape strong { color: #ffffff; font-variant-numeric: tabular-nums; }
.tape em { color: #4ade80; font-style: normal; font-size: 8.5px; }

.market-tape { margin-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.08); }
.market-label { display: flex; align-items: center; gap: 10px; padding: 6px 4px; font-size: 7.5px; color: #94a3b8; }
.market-label b { color: #f5cf72; letter-spacing: 1px; font-size: 8.5px; }
.market-label a { margin-left: auto; color: #edcf7c; }

.footer {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  border-top: 1px solid rgba(212, 175, 55, 0.1);
  padding-top: 10px;
  margin-top: 10px;
  font-size: 7.5px;
  letter-spacing: 1px;
  color: #64748b;
}

@keyframes tapeMove { to { transform: translateX(-50%); } }

/* ================== RESPONSIVE MEDIA QUERIES ================== */
@media (max-width: 1200px) {
  .city { margin-right: 4%; }
  .city strong { font-size: 32px; }
  .primary-grid { grid-template-columns: 1.75fr 1fr 1fr 1.1fr; }
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
    padding: 14px 12px !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    min-height: auto !important;
  }
  .hero h1 { font-size: 24px !important; }
  .hero h2 { font-size: 13px !important; }
  .hero p { font-size: 12px !important; max-width: 100% !important; }
  .city { display: none !important; }
  .principles { flex-wrap: wrap !important; gap: 8px !important; font-size: 10px !important; }
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
  .metric { min-height: 64px !important; padding: 8px 10px !important; }
  .metric strong { font-size: 18px !important; }
  .primary-grid, .secondary-grid {
    grid-template-columns: 1fr !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
    width: 100% !important;
  }
}

@media (max-width: 480px) {
  .global-search { display: none !important; }
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 8px !important; }
  .metric { min-height: 56px !important; padding: 8px 10px !important; }
  .metric strong { font-size: 16px !important; }
  .metric small, .metric .metric-label { font-size: 10px !important; }
  .stage-grid { grid-template-columns: repeat(2, 1fr) !important; }
  .btn-gold .caret-icon { display: none !important; }
  .btn-gold { font-size: 11px !important; padding: 6px 8px !important; }
}
</style>