<template>
  <div class="view-container team-view">
    <!-- Top Executive Navigation Tabs -->
    <div class="team-tab-nav">
      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'members' }"
        @click="switchTab('members')"
      >
        <span class="tab-icon" v-html="icons.users"></span>
        <span class="tab-title">Team Roster &amp; Members</span>
        <span class="tab-counter">{{ members.length }}</span>
      </button>

      <button 
        type="button" 
        class="tab-btn" 
        :class="{ active: activeTab === 'roles' }"
        @click="switchTab('roles')"
      >
        <span class="tab-icon" v-html="icons.shield"></span>
        <span class="tab-title">Roles &amp; Section Permissions</span>
        <span class="tab-counter">{{ roles.length }}</span>
      </button>

      <button 
        type="button" 
        class="tab-btn audit-tab-btn" 
        :class="{ active: activeTab === 'audit' }"
        @click="switchTab('audit')"
      >
        <span class="tab-icon" v-html="icons.clock"></span>
        <span class="tab-title">Activity Log &amp; Audit Trail</span>
        <span class="tab-pill-badge">ADMIN ONLY</span>
      </button>
    </div>

    <!-- =================================================================== -->
    <!-- TAB 1: TEAM ROSTER & MEMBERS -->
    <!-- =================================================================== -->
    <div v-if="activeTab === 'members'" class="tab-pane">
      <!-- Top Metrics Bar -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon-wrap gold"><span v-html="icons.users"></span></div>
          <div class="metric-info">
            <span class="metric-label">Active Team Members</span>
            <strong class="metric-val">{{ members.length }} Personnel</strong>
            <span class="metric-change positive">● Synchronized with PostgreSQL</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-wrap cyan"><span v-html="icons.shield"></span></div>
          <div class="metric-info">
            <span class="metric-label">Configured Access Roles</span>
            <strong class="metric-val">{{ roles.length }} Defined Roles</strong>
            <span class="metric-change">Fine-grained Section Matrix</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-wrap green"><span v-html="icons.clock"></span></div>
          <div class="metric-info">
            <span class="metric-label">Audit Events Today</span>
            <strong class="metric-val">{{ auditMetrics.todayCount }} Events</strong>
            <span class="metric-change positive">Active real-time audit ledger</span>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon-wrap purple"><span v-html="icons.key"></span></div>
          <div class="metric-info">
            <span class="metric-label">Security &amp; Auth Ledger</span>
            <strong class="metric-val">{{ auditMetrics.securityEvents }} Events</strong>
            <span class="metric-change">Sign-ins, role and password changes</span>
          </div>
        </div>
      </div>

      <!-- Main Panel & Split Layout -->
      <div class="content-split" :class="{ 'has-drawer': selectedMember }">
        <div class="main-panel">
          <div class="panel-header">
            <div class="header-left">
              <h2>
                <span class="icon-title" v-html="icons.users"></span>
                Team Roster &amp; Credentials
              </h2>
              <span class="badge-count">{{ filteredMembers.length }} members listed</span>
            </div>
            <div class="header-actions">
              <button class="btn btn-secondary" @click="exportRoster">
                <span v-html="icons.download"></span>
                Export Roster CSV
              </button>
              <button class="btn btn-primary" @click="openAddMemberModal">
                <span v-html="icons.plus"></span>
                Add Team Member
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
                placeholder="Search name, phone number, email, or role..."
                aria-label="Search team"
              />
              <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
                <span v-html="icons.close"></span>
              </button>
            </div>

            <div class="filter-group">
              <label>Role Filter:</label>
              <select v-model="roleFilter" aria-label="Filter by role">
                <option value="">All Roles</option>
                <option v-for="r in roles" :key="r.role_id || r.role_key" :value="r.role_key">
                  {{ r.name }}
                </option>
              </select>
            </div>

            <div class="filter-group">
              <label>Status:</label>
              <select v-model="statusFilter" aria-label="Filter by status">
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

          </div>

          <!-- Members Table -->
          <div class="table-container" tabindex="0" aria-label="Team roster table">
            <table class="data-table team-roster-table">
              <colgroup>
                <col style="width: 170px;">
                <col style="width: 135px;">
                <col style="width: 130px;">
                <col style="width: 180px;">
                <col style="width: 115px;">
                <col style="width: 125px;">
                <col style="width: 80px;">
                <col style="width: 220px;">
              </colgroup>
              <thead>
                <tr>
                  <th class="col-member">Team Member</th>
                  <th class="col-role">Role / Tier</th>
                  <th class="col-phone">Phone Number</th>
                  <th class="col-email">Email Address</th>
                  <th class="col-workspaces">Workspaces</th>
                  <th class="col-status">Status</th>
                  <th class="col-actions actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="member in filteredMembers"
                  :key="member.id"
                  :class="{ 'row-selected': selectedMember?.id === member.id }"
                  @click="selectMember(member)"
                >
                  <td class="col-member">
                    <div class="member-cell">
                      <div class="avatar-badge" :style="{ background: member.avatarBg || '#1e3a5f' }">
                        {{ member.initials || 'TM' }}
                      </div>
                      <div class="member-meta">
                        <strong>{{ member.name }}</strong>
                        <small>{{ member.title || member.roleName || 'Specialist' }}</small>
                      </div>
                    </div>
                  </td>

                  <td class="col-role">
                    <span class="role-pill" :class="getRoleBadgeClass(member.role)">
                      {{ member.roleName || member.role }}
                    </span>
                  </td>

                  <td class="col-phone contact-cell">
                    <span class="phone-text font-mono">
                      <span class="mini-icon" v-html="icons.phone"></span>
                      {{ member.phone || '+13866273499' }}
                    </span>
                  </td>

                  <td class="col-email contact-cell">
                    <span class="email-text" :title="member.email">
                      <span class="mini-icon" v-html="icons.mail"></span>
                      {{ member.email }}
                    </span>
                  </td>

                  <td class="col-workspaces">
                    <span class="permission-count-pill" :class="{ 'full-access': (member.allowedCount >= 20 || member.role === 'SUPER_ADMIN') }">
                      {{ (member.role === 'SUPER_ADMIN' || member.allowedCount >= 23) ? 'All 23 Sections' : `${member.allowedCount || member.permissions?.length || 1} Sections` }}
                    </span>
                  </td>

                  <td class="col-status">
                    <span class="status-indicator" :class="member.status === 'Active' ? 'active' : 'offline'">
                      <span class="status-dot"></span>
                      {{ member.status || 'Active' }}
                    </span>
                  </td>

                  <td class="col-actions actions-col" @click.stop>
                    <div class="action-buttons-group">
                      <button 
                        type="button" 
                        class="btn-action-pill key-action" 
                        @click="openChangePasswordModal(member)" 
                        title="Change user password"
                      >
                        <span v-html="icons.key"></span>
                        <span>Change</span>
                      </button>

                      <button 
                        type="button" 
                        class="btn-action-pill reset-action" 
                        @click="handleQuickResetPassword(member)" 
                        title="1-Click Reset to Auto-Generated Temporary Password"
                      >
                        <span v-html="icons.refresh"></span>
                        <span>Reset</span>
                      </button>

                      <button 
                        type="button" 
                        class="btn-icon" 
                        @click="openEditMemberModal(member)" 
                        title="Edit Member Information"
                      >
                        <span v-html="icons.edit"></span>
                      </button>

                      <button 
                        v-if="member.email !== 'admin@hushhawk.com' && member.id !== '01111111-1111-1111-1111-111111111111'"
                        type="button" 
                        class="btn-icon btn-danger" 
                        @click="confirmDeleteMember(member)" 
                        title="Delete Member"
                      >
                        <span v-html="icons.trash"></span>
                      </button>
                      <button 
                        v-else
                        type="button" 
                        class="btn-icon btn-locked" 
                        disabled
                        title="System Root Administrator cannot be deleted"
                      >
                        <span v-html="icons.lock"></span>
                      </button>
                    </div>
                  </td>
                </tr>

                <tr v-if="filteredMembers.length === 0">
                  <td colspan="8" class="empty-state">
                    <div class="empty-inner">
                      <span class="empty-icon" v-html="icons.users"></span>
                      <p>No team members match your current filter parameters.</p>
                      <button class="btn btn-secondary" @click="resetMemberFilters">Clear Filters</button>
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
              <span class="drawer-badge">Team Personnel Dossier</span>
              <h3>{{ selectedMember.name }}</h3>
              <small>{{ selectedMember.title || selectedMember.roleName }} · {{ selectedMember.role }}</small>
            </div>
            <button class="close-btn" @click="selectedMember = null" aria-label="Close dossier">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="drawer-body">
            <div class="member-profile-card">
              <div class="profile-avatar" :style="{ background: selectedMember.avatarBg || '#1e3a5f' }">
                {{ selectedMember.initials || 'TM' }}
              </div>
              <div class="profile-details">
                <strong>{{ selectedMember.name }}</strong>
                <p class="phone-link"><span v-html="icons.phone"></span> {{ selectedMember.phone || '+13866273499' }}</p>
                <p><span v-html="icons.mail"></span> {{ selectedMember.email }}</p>
                <div class="profile-badges">
                  <span class="badge-tag gold">{{ selectedMember.roleName || selectedMember.role }}</span>
                  <span class="badge-tag" :class="selectedMember.status === 'Active' ? 'green' : 'gray'">
                    {{ selectedMember.status || 'Active' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Password & Security Card -->
            <div class="section-card security-card">
              <div class="card-head">
                <span class="mini-badge"><span v-html="icons.key"></span> Credential Management</span>
              </div>
              <p class="muted-note">Passwords are stored encrypted and cannot be viewed. Use Change Password to set a new one.</p>

              <div class="credential-actions">
                <button class="btn btn-secondary btn-sm" @click="openChangePasswordModal(selectedMember)">
                  <span v-html="icons.key"></span>
                  Change Password
                </button>
                <button class="btn btn-gold btn-sm" @click="handleQuickResetPassword(selectedMember)">
                  <span v-html="icons.refresh"></span>
                  1-Click Auto Reset
                </button>
              </div>
            </div>

            <!-- Authorized Workspaces List -->
            <div class="section-card">
              <div class="card-head">
                <h4>Authorized Platform Workspaces ({{ (selectedMember.permissions || []).length || 23 }})</h4>
                <small>Defined by role {{ selectedMember.roleName || selectedMember.role }}</small>
              </div>

              <div class="authorized-chips-grid">
                <span 
                  v-for="s in getMemberSections(selectedMember)" 
                  :key="s.key || s.path" 
                  class="auth-chip"
                >
                  <span class="chip-dot">●</span>
                  <span class="chip-name">{{ s.name }}</span>
                  <code class="chip-path font-mono">{{ s.path }}</code>
                </span>
              </div>
            </div>

            <!-- Action Buttons Footer -->
            <div class="drawer-actions-footer">
              <button class="btn btn-secondary" @click="openEditMemberModal(selectedMember)">
                <span v-html="icons.edit"></span>
                Edit Member Details
              </button>
              <button 
                v-if="selectedMember.email !== 'admin@hushhawk.com' && selectedMember.id !== '01111111-1111-1111-1111-111111111111'"
                class="btn btn-danger" 
                @click="confirmDeleteMember(selectedMember)"
              >
                <span v-html="icons.trash"></span>
                Delete Member
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- TAB 2: ROLES & SECTION PERMISSIONS MATRIX -->
    <!-- =================================================================== -->
    <div v-if="activeTab === 'roles'" class="tab-pane">
      <div class="roles-management-view">
        <div class="panel-header">
          <div class="header-left">
            <h2>
              <span class="icon-title" v-html="icons.shield"></span>
              Role-Based Access Control &amp; Workspace Authorization
            </h2>
            <p class="header-desc">
              Create and manage custom roles with granular section-by-section permissions. Assign any combination of the 23 platform workspaces so restricted users only see and access their designated tools.
            </p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary btn-glow" @click="openCreateRoleModal">
              <span v-html="icons.plus"></span>
              Create Custom Role
            </button>
          </div>
        </div>

        <!-- Roles Grid -->
        <div v-if="roles && roles.length > 0" class="roles-cards-grid">
          <div 
            v-for="role in roles" 
            :key="role.role_id || role.role_key" 
            class="role-card"
            :class="{ 'system-card': role.is_system }"
          >
            <div class="role-card-header">
              <div class="role-badge-row">
                <span class="role-key-tag font-mono">{{ role.role_key }}</span>
                <span v-if="role.is_system" class="system-protected-badge">SYSTEM PROTECTED</span>
                <span v-else class="custom-role-badge">CUSTOM ROLE</span>
              </div>
              <h3 class="role-name">{{ role.name }}</h3>
              <p class="role-description">{{ role.description || 'Custom assigned workspace authorization policy.' }}</p>
            </div>

            <div class="role-stats-row">
              <div class="role-stat">
                <span class="stat-label">Assigned Users</span>
                <strong class="stat-num text-gold font-mono">{{ role.user_count || 0 }} Members</strong>
              </div>
              <div class="role-stat">
                <span class="stat-label">Workspace Access</span>
                <strong class="stat-num font-mono">
                  {{ (role.permissions || []).length }} / {{ allSections.length || 23 }} Sections
                </strong>
              </div>
            </div>

            <div class="role-permissions-preview">
              <span class="preview-label">Authorized Workspaces:</span>
              <div class="preview-tags">
                <span 
                  v-for="path in (role.permissions || []).slice(0, 7)" 
                  :key="path" 
                  class="preview-tag"
                >
                  {{ getSectionName(path) }}
                </span>
                <span v-if="(role.permissions || []).length > 7" class="preview-tag more">
                  +{{ (role.permissions || []).length - 7 }} more
                </span>
                <span v-if="!role.permissions || !role.permissions.length" class="preview-tag zero">
                  No Workspaces Allowed
                </span>
              </div>
            </div>

            <div class="role-card-footer">
              <button 
                type="button" 
                class="btn btn-secondary btn-sm" 
                @click="openEditRoleModal(role)"
                title="Configure Workspace Permissions"
              >
                <span v-html="icons.sliders"></span>
                Configure Permissions
              </button>

              <button 
                v-if="!role.is_system"
                type="button" 
                class="btn-icon btn-danger btn-sm" 
                @click="confirmDeleteRole(role)" 
                title="Delete Custom Role"
              >
                <span v-html="icons.trash"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- Fallback if zero roles -->
        <div v-else class="empty-roles-card">
          <div class="empty-inner">
            <span class="empty-icon" v-html="icons.shield"></span>
            <h3>No Custom Roles Configured</h3>
            <p>Define custom roles to configure section-by-section authorization across the 23 platform workspaces.</p>
            <button class="btn btn-primary" @click="openCreateRoleModal">
              <span v-html="icons.plus"></span>
              Create Custom Role
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- TAB 3: ACTIVITY LOG & AUDIT TRAIL (ADMIN ONLY) -->
    <!-- =================================================================== -->
    <div v-if="activeTab === 'audit'" class="tab-pane">
      <div class="audit-trail-view">
        <!-- Audit Summary KPIs -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon-wrap gold"><span v-html="icons.clock"></span></div>
            <div class="metric-info">
              <span class="metric-label">Today's Audit Events</span>
              <strong class="metric-val">{{ auditMetrics.todayCount }} Logged</strong>
              <span class="metric-change positive">● Live PostgreSQL capture</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-wrap cyan"><span v-html="icons.users"></span></div>
            <div class="metric-info">
              <span class="metric-label">Active Actors &amp; Roles</span>
              <strong class="metric-val">{{ auditMetrics.uniqueActors }} Accounts</strong>
              <span class="metric-change">System &amp; Team Operators</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-wrap purple"><span v-html="icons.key"></span></div>
            <div class="metric-info">
              <span class="metric-label">Security &amp; Auth Logs</span>
              <strong class="metric-val">{{ auditMetrics.securityEvents }} Events</strong>
              <span class="metric-change">Logins, Roles, Passwords</span>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon-wrap red"><span v-html="icons.trash"></span></div>
            <div class="metric-info">
              <span class="metric-label">Critical Mutations</span>
              <strong class="metric-val">{{ auditMetrics.criticalChanges }} Deletions</strong>
              <span class="metric-change">Deletions &amp; Overrides</span>
            </div>
          </div>
        </div>

        <!-- Audit Panel -->
        <div class="main-panel">
          <div class="panel-header">
            <div class="header-left">
              <h2>
                <span class="icon-title" v-html="icons.clock"></span>
                Master Activity &amp; Audit Trail
              </h2>
              <span class="badge-count">{{ auditTotal }} total captured events</span>
            </div>
            <div class="header-actions">
              <button class="btn btn-secondary" @click="exportAuditCsv">
                <span v-html="icons.download"></span>
                Export Audit Log CSV
              </button>
              <button class="btn btn-primary" @click="fetchAuditLogs">
                <span v-html="icons.refresh"></span>
                Refresh Ledger
              </button>
            </div>
          </div>

          <!-- Comprehensive Time-Wise & Date-Wise Filter Toolbar -->
          <div class="filter-toolbar audit-toolbar">
            <div class="search-box">
              <span v-html="icons.search"></span>
              <input
                v-model="auditSearch"
                type="text"
                placeholder="Search actor, action type, entity ID, or changes..."
                aria-label="Search audit log"
                @keyup.enter="fetchAuditLogs"
              />
              <button v-if="auditSearch" class="clear-btn" @click="auditSearch = ''; fetchAuditLogs();">
                <span v-html="icons.close"></span>
              </button>
            </div>

            <!-- Date-wise Quick Filter -->
            <div class="filter-group">
              <label>Date Filter:</label>
              <select v-model="auditDatePreset" @change="handleDatePresetChange">
                <option value="all">All Recorded History</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            <!-- Custom Date Pickers if custom selected -->
            <div v-if="auditDatePreset === 'custom'" class="custom-date-inputs">
              <input 
                type="date" 
                v-model="auditStartDate" 
                class="date-input" 
                @change="fetchAuditLogs" 
                title="Start Date" 
              />
              <span class="date-sep">to</span>
              <input 
                type="date" 
                v-model="auditEndDate" 
                class="date-input" 
                @change="fetchAuditLogs" 
                title="End Date" 
              />
            </div>

            <!-- Action Category Filter -->
            <div class="filter-group">
              <label>Action Category:</label>
              <select v-model="auditCategoryFilter" @change="fetchAuditLogs">
                <option value="">All Categories</option>
                <option value="SECURITY">Security &amp; Auth (Purple)</option>
                <option value="CREATION">Creations &amp; Inserts (Green)</option>
                <option value="MODIFICATION">Modifications &amp; Edits (Yellow)</option>
                <option value="DELETION">Deletions &amp; Drops (Red)</option>
                <option value="OUTREACH">Campaigns &amp; Outreach (Cyan)</option>
              </select>
            </div>

            <button class="btn btn-secondary btn-sm" @click="fetchAuditLogs">
              Filter
            </button>
          </div>

          <!-- Audit Log Table -->
          <div class="table-container" tabindex="0" aria-label="Activity history table">
            <table class="data-table audit-table">
              <thead>
                <tr>
                  <th style="width: 190px;">Date &amp; Time (ET)</th>
                  <th style="width: 170px;">Operator / Actor</th>
                  <th style="width: 170px;">Action Category</th>
                  <th style="width: 140px;">Target Entity</th>
                  <th>What Changed</th>
                  <th class="actions-col" style="width: 110px;">Details</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in auditLogs" :key="log.id || log.auditId">
                  <td class="timestamp-cell">
                    <strong class="log-date">{{ log.dateStr }}</strong>
                    <span class="log-time font-mono">{{ log.timeStr }}</span>
                  </td>

                  <td class="actor-cell">
                    <div class="actor-wrap">
                      <div class="actor-avatar">{{ (log.actor || 'SY').slice(0, 2).toUpperCase() }}</div>
                      <div class="actor-info">
                        <strong>{{ log.actor }}</strong>
                        <small v-if="log.details?.role">{{ log.details.role }}</small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span class="audit-badge" :class="log.badgeClass">
                      {{ log.actionLabel || log.action }}
                    </span>
                  </td>

                  <td>
                    <div class="entity-box">
                      <span class="entity-type font-mono">{{ log.entityType }}</span>
                      <small v-if="log.entityId" class="entity-id font-mono">{{ log.entityId.slice(0, 8) }}...</small>
                    </div>
                  </td>

                  <td class="diff-summary-cell">
                    <div class="diff-summary-text">
                      {{ formatDiffSummary(log) }}
                    </div>
                  </td>

                  <td class="actions-col">
                    <button 
                      type="button" 
                      class="btn btn-secondary btn-xs" 
                      @click="inspectAuditDetail(log)"
                      title="View activity details"
                    >
                      Inspect JSON
                    </button>
                  </td>
                </tr>

                <tr v-if="isLoadingAudit">
                  <td colspan="6" class="empty-state">
                    <div class="empty-inner">
                      <span class="empty-icon" v-html="icons.refresh"></span>
                      <p>Loading audit ledger from PostgreSQL...</p>
                    </div>
                  </td>
                </tr>
                <tr v-else-if="auditLogs.length === 0">
                  <td colspan="6" class="empty-state">
                    <div class="empty-inner">
                      <span class="empty-icon" v-html="icons.clock"></span>
                      <p>No audit events match your selected time and date filters.</p>
                      <button class="btn btn-secondary" @click="resetAuditFilters">Reset Filters</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Footer -->
          <div class="audit-pagination">
            <span class="pagination-info">
              Showing <strong>{{ auditLogs.length }}</strong> of <strong>{{ auditTotal }}</strong> total recorded events
            </span>
            <div class="pagination-buttons">
              <button 
                class="btn btn-secondary btn-xs" 
                :disabled="auditOffset === 0" 
                @click="changeAuditPage(-1)"
              >
                Previous Page
              </button>
              <span class="page-current font-mono">Page {{ Math.floor(auditOffset / auditLimit) + 1 }}</span>
              <button 
                class="btn btn-secondary btn-xs" 
                :disabled="auditOffset + auditLimit >= auditTotal" 
                @click="changeAuditPage(1)"
              >
                Next Page
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- MODALS & TELEPORTS -->
    <!-- =================================================================== -->

    <!-- Modal 1: Add Team Member -->
    <Teleport to="body">
      <div v-if="activeModal === 'addMember'" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-badge">TEAM ONBOARDING</span>
              <h3>Add New Team Member</h3>
            </div>
            <button class="close-btn" @click="closeModal" aria-label="Close modal">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <form @submit.prevent="submitAddMember" class="modal-body">
            <div class="form-group">
              <label>Full Name *</label>
              <input 
                v-model="newMemberForm.name" 
                type="text" 
                placeholder="e.g. Jordan Miller" 
                required 
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Phone Number *</label>
                <input 
                  v-model="newMemberForm.phone" 
                  type="text" 
                  placeholder="(904) 555-0199" 
                  required 
                />
              </div>

              <div class="form-group">
                <label>Email Address *</label>
                <input 
                  v-model="newMemberForm.email" 
                  type="email" 
                  placeholder="jordan@hushhawk.com" 
                  required 
                />
              </div>
            </div>

            <div class="form-group">
              <label>Assigned Access Role *</label>
              <select v-model="newMemberForm.role" required>
                <option v-for="r in roles" :key="r.role_id || r.role_key" :value="r.role_id || r.role_key">
                  {{ r.name }} ({{ (r.permissions || []).length }} Workspaces Allowed)
                </option>
              </select>
              <small class="form-hint">
                The user will strictly only have access to the sections permitted under this role.
              </small>
            </div>

            <div class="form-group">
              <div class="label-with-action">
                <label>Access Password *</label>
                <button 
                  type="button" 
                  class="btn-text-action" 
                  @click="generateRandomPassword('newMember')"
                >
                  ⚡ Auto-Generate Strong Key
                </button>
              </div>

              <div class="password-input-wrap">
                <input 
                  :type="showNewPassword ? 'text' : 'password'" 
                  v-model="newMemberForm.password" 
                  placeholder="Enter secure password" 
                  required 
                />
                <button 
                  type="button" 
                  class="btn-input-eye" 
                  @click="showNewPassword = !showNewPassword"
                >
                  <span v-html="showNewPassword ? icons.eyeOff : icons.eye"></span>
                </button>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary">
                <span v-html="icons.check"></span>
                Create User &amp; Assign Role
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal 2: Change Password Modal -->
    <Teleport to="body">
      <div v-if="activeModal === 'changePassword'" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-dialog modal-sm">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-badge purple"><span v-html="icons.key"></span> CREDENTIAL SECURITY</span>
              <h3>Change Password: {{ passwordTargetUser?.name }}</h3>
            </div>
            <button class="close-btn" @click="closeModal" aria-label="Close modal">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <form @submit.prevent="submitChangePassword" class="modal-body">
            <p class="modal-subtext">
              Set a new secure access key for <strong>{{ passwordTargetUser?.email }}</strong>. This action will be logged in the system audit ledger.
            </p>

            <div class="form-group">
              <div class="label-with-action">
                <label>New Password *</label>
                <button 
                  type="button" 
                  class="btn-text-action" 
                  @click="generateRandomPassword('changePass')"
                >
                  ⚡ Generate
                </button>
              </div>

              <div class="password-input-wrap">
                <input 
                  :type="showChangePassword ? 'text' : 'password'" 
                  v-model="changePasswordForm.newPassword" 
                  placeholder="Enter new password" 
                  required 
                />
                <button 
                  type="button" 
                  class="btn-input-eye" 
                  @click="showChangePassword = !showChangePassword"
                >
                  <span v-html="showChangePassword ? icons.eyeOff : icons.eye"></span>
                </button>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary">
                <span v-html="icons.check"></span>
                Save &amp; Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal 3: Edit Member Details -->
    <Teleport to="body">
      <div v-if="activeModal === 'editMember'" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-badge">USER ADMINISTRATION</span>
              <h3>Edit Member: {{ editingMember?.name }}</h3>
            </div>
            <button class="close-btn" @click="closeModal" aria-label="Close modal">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <form @submit.prevent="submitEditMember" class="modal-body">
            <div class="form-group">
              <label>Full Name</label>
              <input v-model="editingMember.name" type="text" required />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Phone Number</label>
                <input v-model="editingMember.phone" type="text" required />
              </div>

              <div class="form-group">
                <label>Email Address</label>
                <input v-model="editingMember.email" type="email" required />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Assigned Role</label>
                <select v-model="editingMember.role" required>
                  <option v-for="r in roles" :key="r.role_id || r.role_key" :value="r.role_key">
                    {{ r.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Account Status</label>
                <select v-model="editingMember.status" required>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary">
                <span v-html="icons.check"></span>
                Update Member
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal 4: Create or Edit Custom Role with 23-Section Permission Matrix -->
    <Teleport to="body">
      <div v-if="activeModal === 'roleForm'" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-badge gold"><span v-html="icons.shield"></span> ROLE BUILDER</span>
              <h3>{{ isEditingRole ? `Edit Role: ${roleForm.name}` : 'Create Custom Role & Choose Section Access' }}</h3>
            </div>
            <button class="close-btn" @click="closeModal" aria-label="Close modal">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <form @submit.prevent="submitRoleForm" class="modal-body">
            <div class="form-row">
              <div class="form-group flex-2">
                <label>Role Name *</label>
                <input 
                  v-model="roleForm.name" 
                  type="text" 
                  placeholder="e.g. Direct Mail Associate, Cold Calling Specialist" 
                  required 
                />
              </div>

              <div class="form-group flex-3">
                <label>Description</label>
                <input 
                  v-model="roleForm.description" 
                  type="text" 
                  placeholder="e.g. Restricted to Dashboard and Direct Mail Campaigns" 
                />
              </div>
            </div>

            <!-- Permission Matrix Header -->
            <div class="matrix-control-bar">
              <div class="matrix-title">
                <strong>Workspace Access Matrix ({{ (roleForm.permissions || []).length }} of {{ allSections.length || 23 }} Selected)</strong>
                <small>Choose exact section permissions given to this role. Users assigned this role can only view these workspaces.</small>
              </div>
              <div class="matrix-actions">
                <button type="button" class="btn btn-secondary btn-xs" @click="selectAllSections">
                  Select All ({{ allSections.length || 23 }})
                </button>
                <button type="button" class="btn btn-secondary btn-xs" @click="clearAllSections">
                  Clear All
                </button>
              </div>
            </div>

            <!-- 23-Section Checkbox Matrix Grouped by Domain -->
            <div class="section-matrix-groups">
              <div v-for="(group, gIdx) in sectionGroups" :key="gIdx" class="matrix-group">
                <div class="group-header">
                  <span class="group-title">{{ group.category }}</span>
                  <span class="group-count">
                    {{ countSelectedInGroup(group) }} / {{ group.sections.length }} Selected
                  </span>
                </div>

                <div class="group-grid">
                  <label 
                    v-for="s in group.sections" 
                    :key="s.path" 
                    class="section-checkbox-card"
                    :class="{ checked: isSectionSelected(s.path) }"
                    @click.prevent="toggleSectionPermission(s.path)"
                  >
                    <input 
                      type="checkbox" 
                      :checked="isSectionSelected(s.path)" 
                      @click.stop="toggleSectionPermission(s.path)"
                    />
                    <div class="card-icon" v-html="icons[s.icon] || icons.house"></div>
                    <div class="card-info">
                      <strong>{{ s.name }}</strong>
                      <code class="font-mono">{{ s.path }}</code>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
              <button type="submit" class="btn btn-primary btn-glow">
                <span v-html="icons.check"></span>
                {{ isEditingRole ? 'Save Changes' : 'Create Custom Role' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Modal 5: Raw JSON Diff Viewer for Audit Trail -->
    <Teleport to="body">
      <div v-if="activeModal === 'inspectDiff'" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-dialog modal-md">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-badge cyan">AUDIT EVIDENCE</span>
              <h3>Audit Event Record: {{ selectedAuditItem?.action }}</h3>
            </div>
            <button class="close-btn" @click="closeModal" aria-label="Close modal">
              <span v-html="icons.close"></span>
            </button>
          </div>

          <div class="modal-body">
            <div class="audit-meta-summary">
              <div><strong>Recorded At:</strong> {{ selectedAuditItem?.fullTimestamp }}</div>
              <div><strong>Actor:</strong> {{ selectedAuditItem?.actor }}</div>
              <div><strong>Target:</strong> {{ selectedAuditItem?.entityType }} ({{ selectedAuditItem?.entityId }})</div>
              <div><strong>Request ID:</strong> {{ selectedAuditItem?.requestId }}</div>
            </div>

            <p class="audit-explanation">{{ formatDiffSummary(selectedAuditItem) }}</p>
            <dl v-if="auditDetailFields(selectedAuditItem).length" class="audit-field-list">
              <div v-for="field in auditDetailFields(selectedAuditItem)" :key="field.label">
                <dt>{{ field.label }}</dt>
                <dd>{{ field.value }}</dd>
              </div>
            </dl>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="closeModal">Close</button>
              <button
                type="button"
                class="btn btn-primary"
                @click="copyText(formatDiffSummary(selectedAuditItem), 'Activity summary copied!')"
              >
                Copy Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Global Floating Action Alert / Toast -->
    <Teleport to="body">
      <transition name="toast-slide">
        <div v-if="alertToast.show" class="team-toast" :class="alertToast.type">
          <div class="toast-dot"></div>
          <div class="toast-text">
            <strong>{{ alertToast.title }}</strong>
            <p>{{ alertToast.message }}</p>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script>
// Cryptographically random, 20 characters from a mixed alphabet (never derived from a fixed pattern).
function randomPassword(length = 20) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = new Uint32Array(length);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}
import { formatDiffSummary, auditDetailFields } from './teamAuditSummary.js';

import { icons } from '../icons.js';
import { toCsv, downloadCsv as saveCsv } from '../csv.js';

export const DEFAULT_SECTIONS = [
  { key: 'dashboard', path: '/home', name: 'Dashboard', category: 'Executive & Core', icon: 'house' },
  { key: 'properties', path: '/properties', name: 'Properties', category: 'Executive & Core', icon: 'house' },
  { key: 'vault', path: '/vault', name: 'Media Vault', category: 'Executive & Core', icon: 'file' },
  { key: 'seller-leads', path: '/seller-leads', name: 'Seller Leads', category: 'Acquisitions & Pipeline', icon: 'users' },
  { key: 'acquisitions', path: '/acquisitions', name: 'Acquisitions', category: 'Acquisitions & Pipeline', icon: 'handshake' },
  { key: 'follow-ups', path: '/follow-ups', name: 'Follow Ups', category: 'Acquisitions & Pipeline', icon: 'tasks' },
  { key: 'contacts', path: '/contacts', name: 'Contacts', category: 'Acquisitions & Pipeline', icon: 'user' },
  { key: 'tasks', path: '/tasks', name: 'Tasks', category: 'Acquisitions & Pipeline', icon: 'tasks' },
  { key: 'calendar', path: '/calendar', name: 'Calendar', category: 'Acquisitions & Pipeline', icon: 'calendar' },
  { key: 'communications', path: '/communications', name: 'Communications', category: 'Acquisitions & Pipeline', icon: 'mail' },
  { key: 'dispositions', path: '/dispositions', name: 'Dispositions', category: 'Dispositions & Buyers', icon: 'badgeDollar' },
  { key: 'cash-buyers', path: '/cash-buyers', name: 'Cash Buyers', category: 'Dispositions & Buyers', icon: 'users' },
  { key: 'deal-analyzer', path: '/deal-analyzer', name: 'Deal Analyzer', category: 'Dispositions & Buyers', icon: 'calculator' },
  { key: 'county-data', path: '/county-data', name: 'County Data', category: 'Intelligence & Market Data', icon: 'database' },
  { key: 'skip-tracing', path: '/skip-tracing', name: 'Skip Tracing', category: 'Intelligence & Market Data', icon: 'search' },
  { key: 'analytics', path: '/analytics', name: 'Analytics', category: 'Intelligence & Market Data', icon: 'chart' },
  { key: 'marketing', path: '/marketing', name: 'Marketing', category: 'Campaigns & Outreach', icon: 'megaphone' },
  { key: 'direct-mail', path: '/direct-mail', name: 'Direct Mail', category: 'Campaigns & Outreach', icon: 'mail' },
  { key: 'facebook-leads', path: '/facebook-leads', name: 'Facebook Leads', category: 'Campaigns & Outreach', icon: 'megaphone' },
  { key: 'contracts', path: '/contracts', name: 'Contracts', category: 'System Administration', icon: 'file' },
  { key: 'team', path: '/team', name: 'Team & RBAC', category: 'System Administration', icon: 'users' },
  { key: 'settings', path: '/settings', name: 'Settings', category: 'System Administration', icon: 'settings' },
  { key: 'automations', path: '/automations', name: 'Automations', category: 'System Administration', icon: 'zap' }
];

export const DEFAULT_ROLES = [
  {
    role_id: 'super-admin-role',
    role_key: 'SUPER_ADMIN',
    name: 'Master Administrator',
    description: 'Full uninhibited root access to all 23 platform workspaces, system settings, and audit logs.',
    permissions: DEFAULT_SECTIONS.map(s => s.path),
    is_system: true,
    user_count: 4
  },
  {
    role_id: 'acq-rep-role',
    role_key: 'ACQUISITIONS_REP',
    name: 'Acquisitions Specialist',
    description: 'Lead intake, seller negotiations, pipeline follow-ups, and purchase contracts.',
    permissions: ['/home', '/seller-leads', '/acquisitions', '/follow-ups', '/contacts', '/tasks', '/calendar', '/communications'],
    is_system: true,
    user_count: 2
  },
  {
    role_id: 'dispo-rep-role',
    role_key: 'DISPOSITIONS_REP',
    name: 'Dispositions & Buyer Desk',
    description: 'Dispositions inventory, cash buyer matching, and deal underwriting analyzer.',
    permissions: ['/home', '/dispositions', '/cash-buyers', '/deal-analyzer', '/contacts', '/communications'],
    is_system: true,
    user_count: 1
  },
  {
    role_id: 'mkt-lead-role',
    role_key: 'MARKETING_LEAD',
    name: 'Campaigns & Marketing Manager',
    description: 'Direct mail drop batches, Facebook leads, marketing metrics, and county lists.',
    permissions: ['/home', '/marketing', '/direct-mail', '/facebook-leads', '/county-data'],
    is_system: true,
    user_count: 1
  },
  {
    role_id: 'field-ops-role',
    role_key: 'FIELD_OPS',
    name: 'Field Inspector & Media',
    description: 'On-site walkthroughs, inspection media uploads to Media Vault, and property condition.',
    permissions: ['/home', '/properties', '/vault', '/tasks'],
    is_system: true,
    user_count: 1
  },
  {
    role_id: 'direct-mail-role',
    role_key: 'DIRECT_MAIL_SPECIALIST',
    name: 'Direct Mail Specialist',
    description: 'Restricted role with access solely to Dashboard and Direct Mail Campaigns.',
    permissions: ['/home', '/direct-mail'],
    is_system: false,
    user_count: 1
  }
];

export const DEFAULT_MEMBERS = [
  {
    id: "01111111-1111-1111-1111-111111111111",
    user_id: "01111111-1111-1111-1111-111111111111",
    name: "Main Administrator",
    initials: "MA",
    email: "admin@hushhawk.com",
    phone: "+19045790065",
    role: "SUPER_ADMIN",
    roleName: "Master Administrator",
    title: "System Superadmin & Architect",
    department: "Executive Leadership",
    accessLevel: "SUPER_ADMIN",
    status: "Active",
    statusClass: "status-active",
    password: "admin",
    permissions: DEFAULT_SECTIONS.map(s => s.path),
    allowedCount: 23,
    avatarBg: "#4338ca"
  }
];

export const DEFAULT_AUDIT_METRICS = {
  todayCount: 0,
  uniqueActors: 0,
  criticalChanges: 0,
  securityEvents: 0
};

export default {
  name: 'TeamView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      activeTab: 'members', // 'members' | 'roles' | 'audit'

      // Members Data
      members: [...DEFAULT_MEMBERS],
      roles: [...DEFAULT_ROLES],
      allSections: [...DEFAULT_SECTIONS],
      selectedMember: DEFAULT_MEMBERS[0],
      searchQuery: '',
      roleFilter: '',
      statusFilter: '',
      visiblePasswords: {}, // { [memberId]: boolean }
      showAllPasswords: false,

      // Modals
      activeModal: null, // 'addMember' | 'changePassword' | 'editMember' | 'roleForm' | 'inspectDiff'
      newMemberForm: {
        name: '',
        phone: '',
        email: '',
        role: 'ACQUISITIONS_REP',
        password: ''
      },
      showNewPassword: true,

      passwordTargetUser: null,
      changePasswordForm: {
        newPassword: ''
      },
      showChangePassword: true,

      editingMember: null,

      // Roles Data & Form
      isEditingRole: false,
      roleForm: {
        roleId: null,
        name: '',
        description: '',
        permissions: []
      },

      // Audit Trail Data & Filters
      auditLogs: [],
      auditTotal: 0,
      auditLimit: 25,
      auditOffset: 0,
      auditSearch: '',
      auditDatePreset: 'all', // 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'custom'
      auditStartDate: '',
      auditEndDate: '',
      auditCategoryFilter: '',
      auditMetrics: { ...DEFAULT_AUDIT_METRICS },
      selectedAuditItem: null,
      isLoadingAudit: false,

      // Toast Notification
      alertToast: {
        show: false,
        title: '',
        message: '',
        type: 'success'
      },
      toastTimeout: null
    };
  },
  computed: {
    filteredMembers() {
      const q = this.searchQuery.toLowerCase().trim();
      return this.members.filter(m => {
        const matchQ = !q || 
          m.name.toLowerCase().includes(q) || 
          (m.phone && m.phone.toLowerCase().includes(q)) || 
          (m.email && m.email.toLowerCase().includes(q)) || 
          (m.role && m.role.toLowerCase().includes(q)) ||
          (m.roleName && m.roleName.toLowerCase().includes(q));

        const matchRole = !this.roleFilter || m.role === this.roleFilter;
        const matchStatus = !this.statusFilter || m.status === this.statusFilter;

        return matchQ && matchRole && matchStatus;
      });
    },

    sectionGroups() {
      // Group the 23 sections logically
      const map = {};
      for (const s of this.allSections) {
        const cat = s.category || 'General';
        if (!map[cat]) map[cat] = [];
        map[cat].push(s);
      }
      return Object.keys(map).map(cat => ({
        category: cat,
        sections: map[cat]
      }));
    }
  },
  async mounted() {
    await Promise.all([
      this.loadSections(),
      this.loadRoles(),
      this.loadTeamMembers(),
      this.fetchAuditLogs()
    ]);
  },
  methods: {
    switchTab(tab) {
      this.activeTab = tab;
      if (tab === 'audit') {
        this.fetchAuditLogs();
      } else if (tab === 'roles') {
        this.loadRoles();
      } else if (tab === 'members') {
        this.loadTeamMembers();
      }
    },

    // -------------------------------------------------------------------------
    // API Fetchers & Network Resiliency
    // -------------------------------------------------------------------------
    async fetchApi(endpoint, options = {}) {
      const token = window.localStorage.getItem('hushhawk_auth_token');
      const headers = new Headers(options.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      try {
        const res = await fetch(endpoint, { ...options, headers });
        if (res.ok) return res;
        const { error } = await res.json().catch(() => ({}));
        this.showToast('Request failed', error || `Server returned ${res.status}`, 'error');
      } catch (error) {
        this.showToast('Request failed', error.message, 'error');
      }
      return null;
    },

    async loadSections() {
      try {
        const res = await this.fetchApi('/api/v1/rbac/sections');
        if (res) {
          const data = await res.json();
          if (data && Array.isArray(data.sections) && data.sections.length > 0) {
            this.allSections = data.sections;
          }
        }
      } catch (e) {
        console.warn('[RBAC] Fallback default sections active:', e.message);
      }
    },

    async loadRoles() {
      try {
        const res = await this.fetchApi('/api/v1/roles');
        if (res) {
          const data = await res.json();
          if (data && Array.isArray(data.roles) && data.roles.length > 0) {
            this.roles = data.roles;
          }
        }
      } catch (e) {
        console.warn('[RBAC] Fallback default roles active:', e.message);
      }
    },

    async loadTeamMembers() {
      try {
        const res = await this.fetchApi('/api/v1/team');
        if (res) {
          const data = await res.json();
          if (data && Array.isArray(data.members) && data.members.length > 0) {
            this.members = data.members;
            if (!this.selectedMember && data.members.length > 0) {
              this.selectedMember = data.members[0];
            }
          }
        }
      } catch (e) {
        console.warn('[Team] Members fetch error:', e.message);
      }
    },

    async fetchAuditLogs() {
      this.isLoadingAudit = true;
      try {
        const params = new URLSearchParams();
        params.set('limit', String(this.auditLimit));
        params.set('offset', String(this.auditOffset));

        if (this.auditSearch.trim()) params.set('search', this.auditSearch.trim());
        if (this.auditCategoryFilter) params.set('category', this.auditCategoryFilter);

        const auditDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/New_York' });
        if (this.auditDatePreset === 'today') {
          const d = auditDate.format(new Date());
          params.set('startDate', d);
          params.set('endDate', d);
        } else if (this.auditDatePreset === 'yesterday') {
          const y = auditDate.format(new Date(Date.now() - 86400000));
          params.set('startDate', y);
          params.set('endDate', y);
        } else if (this.auditDatePreset === 'last7') {
          const s = auditDate.format(new Date(Date.now() - 7 * 86400000));
          params.set('startDate', s);
        } else if (this.auditDatePreset === 'last30') {
          const s = auditDate.format(new Date(Date.now() - 30 * 86400000));
          params.set('startDate', s);
        } else if (this.auditDatePreset === 'custom') {
          if (this.auditStartDate) params.set('startDate', this.auditStartDate);
          if (this.auditEndDate) params.set('endDate', this.auditEndDate);
        }

        const res = await this.fetchApi(`/api/v1/audit/logs?${params.toString()}`);
        if (res) {
          const data = await res.json();
          if (data && data.ok) {
            this.auditLogs = Array.isArray(data.logs) ? data.logs : [];
            this.auditTotal = typeof data.total === 'number' ? data.total : 0;
            if (data.metrics) {
              this.auditMetrics = data.metrics;
            }
          }
        }
      } catch (e) {
        console.warn('[Audit] Fetch logs error:', e.message);
      } finally {
        this.isLoadingAudit = false;
      }
    },

    // -------------------------------------------------------------------------
    // Password Management
    // -------------------------------------------------------------------------
    togglePasswordVisibility(memberId) {
      this.visiblePasswords = {
        ...this.visiblePasswords,
        [memberId]: !this.visiblePasswords[memberId]
      };
    },

    generateRandomPassword(target) {
      const generated = randomPassword();

      if (target === 'newMember') {
        this.newMemberForm.password = generated;
      } else if (target === 'changePass') {
        this.changePasswordForm.newPassword = generated;
      }
      this.showToast('Password Generated', `Generated: ${generated}`, 'info');
    },

    openChangePasswordModal(member) {
      this.passwordTargetUser = member;
      this.changePasswordForm.newPassword = '';
      this.activeModal = 'changePassword';
    },

    async submitChangePassword() {
      if (!this.passwordTargetUser || !this.changePasswordForm.newPassword) return;

      try {
        const res = await this.fetchApi(`/api/v1/team/${this.passwordTargetUser.id}/password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: this.changePasswordForm.newPassword,
            actor: 'Main Administrator'
          })
        });
        const result = res ? await res.json() : { error: 'Network connection error' };
        if (res && res.ok && result.success) {
          this.passwordTargetUser.password = this.changePasswordForm.newPassword;
          this.showToast('Password Updated', `Updated access key for ${this.passwordTargetUser.name}`, 'success');
          this.closeModal();
          this.fetchAuditLogs();
        } else {
          this.showToast('Error', result.error || 'Failed to update password', 'danger');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'danger');
      }
    },

    async handleQuickResetPassword(member) {
      if (!confirm(`Are you sure you want to reset the password for ${member.name} (${member.email})? A secure temporary password will be auto-generated and logged.`)) {
        return;
      }

      try {
        const res = await this.fetchApi(`/api/v1/team/${member.id}/password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            autoGenerate: true,
            actor: 'Main Administrator'
          })
        });
        const result = res ? await res.json() : { error: 'Network connection error' };
        if (res && res.ok && result.success) {
          member.password = result.password;
          this.copyText(result.password, `Password reset to ${result.password} and copied to clipboard!`);
          this.fetchAuditLogs();
        } else {
          this.showToast('Error', result.error || 'Failed to reset password', 'danger');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'danger');
      }
    },

    // -------------------------------------------------------------------------
    // Team Members CRUD
    // -------------------------------------------------------------------------
    openAddMemberModal() {
      this.newMemberForm = {
        name: '',
        phone: '',
        email: '',
        role: this.roles.length > 0 ? (this.roles[0].role_id || this.roles[0].role_key) : 'ACQUISITIONS_REP',
        password: ''
      };
      this.activeModal = 'addMember';
    },

    async submitAddMember() {
      try {
        const res = await this.fetchApi('/api/v1/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: this.newMemberForm.name,
            phone: this.newMemberForm.phone,
            email: this.newMemberForm.email,
            role: this.newMemberForm.role,
            password: this.newMemberForm.password,
            actor: 'Main Administrator'
          })
        });

        const data = res ? await res.json() : { error: 'Network connection error' };
        if (res && res.ok && !data.error) {
          this.showToast('Member Added', `Successfully added ${this.newMemberForm.name} to team roster!`, 'success');
          this.closeModal();
          await this.loadTeamMembers();
          await this.loadRoles();
          this.fetchAuditLogs();
        } else {
          this.showToast('Error', data.error || 'Failed to add member', 'danger');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'danger');
      }
    },

    openEditMemberModal(member) {
      this.editingMember = JSON.parse(JSON.stringify(member));
      this.activeModal = 'editMember';
    },

    async submitEditMember() {
      if (!this.editingMember) return;
      try {
        const res = await this.fetchApi(`/api/v1/team/${this.editingMember.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: this.editingMember.name,
            phone: this.editingMember.phone,
            email: this.editingMember.email,
            role: this.editingMember.role,
            status: this.editingMember.status,
            actor: 'Main Administrator'
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          this.showToast('Member Updated', `Profile for ${this.editingMember.name} updated.`, 'success');
          this.closeModal();
          await this.loadTeamMembers();
          this.fetchAuditLogs();
        } else {
          this.showToast('Error', data.error || 'Failed to update member', 'danger');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'danger');
      }
    },

    async confirmDeleteMember(member) {
      if (!confirm(`Are you sure you want to remove ${member.name} (${member.email})? This action will immediately revoke their access and log an audit event.`)) {
        return;
      }
      try {
        const res = await this.fetchApi(`/api/v1/team/${member.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor: 'Main Administrator' })
        });
        const data = res ? await res.json() : { error: 'Connection failed' };
        if (res && res.ok && data.success) {
          this.showToast('Member Removed', `Removed ${member.name} from the active roster.`, 'success');
          if (this.selectedMember?.id === member.id) this.selectedMember = null;
          await this.loadTeamMembers();
          await this.loadRoles();
          this.fetchAuditLogs();
        } else {
          this.showToast('Error', data.error || 'Failed to remove member', 'danger');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'danger');
      }
    },

    // -------------------------------------------------------------------------
    // Custom Roles & Permissions Matrix
    // -------------------------------------------------------------------------
    openCreateRoleModal() {
      this.isEditingRole = false;
      this.roleForm = {
        roleId: null,
        name: '',
        description: '',
        permissions: ['/home'] // default to home dashboard
      };
      this.activeModal = 'roleForm';
    },

    openEditRoleModal(role) {
      this.isEditingRole = true;
      this.roleForm = {
        roleId: role.role_id,
        name: role.name,
        description: role.description || '',
        permissions: Array.isArray(role.permissions) ? [...role.permissions] : []
      };
      this.activeModal = 'roleForm';
    },

    selectAllSections() {
      this.roleForm.permissions = this.allSections.map(s => s.path);
    },

    clearAllSections() {
      this.roleForm.permissions = [];
    },

    isSectionSelected(path) {
      return Array.isArray(this.roleForm.permissions) && this.roleForm.permissions.includes(path);
    },

    toggleSectionPermission(path) {
      if (!Array.isArray(this.roleForm.permissions)) {
        this.roleForm.permissions = [];
      }
      const idx = this.roleForm.permissions.indexOf(path);
      if (idx > -1) {
        this.roleForm.permissions.splice(idx, 1);
      } else {
        this.roleForm.permissions.push(path);
      }
    },

    countSelectedInGroup(group) {
      if (!group || !Array.isArray(group.sections)) return 0;
      const perms = Array.isArray(this.roleForm.permissions) ? this.roleForm.permissions : [];
      return group.sections.filter(s => perms.includes(s.path)).length;
    },

    async submitRoleForm() {
      if (!this.roleForm.name.trim()) {
        this.showToast('Validation', 'Role name is required', 'warning');
        return;
      }

      try {
        const url = this.isEditingRole 
          ? `/api/v1/roles/${this.roleForm.roleId}`
          : '/api/v1/roles';
        const method = this.isEditingRole ? 'PUT' : 'POST';

        const res = await this.fetchApi(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: this.roleForm.name,
            description: this.roleForm.description,
            permissions: this.roleForm.permissions,
            actor: 'Main Administrator'
          })
        });

        const data = res ? await res.json() : { error: 'Network connection error' };
        if (res && res.ok && data.success) {
          this.showToast(
            this.isEditingRole ? 'Role Updated' : 'Role Created',
            `Saved role "${this.roleForm.name}" with ${this.roleForm.permissions.length} permitted sections.`,
            'success'
          );
          this.closeModal();
          await this.loadRoles();
          await this.loadTeamMembers();
          this.fetchAuditLogs();
        } else {
          this.showToast('Error', data.error || 'Failed to save role', 'danger');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'danger');
      }
    },

    async confirmDeleteRole(role) {
      if (!confirm(`Are you sure you want to delete the custom role "${role.name}"? Any assigned members will be safely reverted to standard specialist tier.`)) {
        return;
      }

      try {
        const res = await this.fetchApi(`/api/v1/roles/${role.role_id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actor: 'Main Administrator' })
        });
        const data = res ? await res.json() : { error: 'Network connection error' };
        if (res && res.ok && data.success) {
          this.showToast('Role Deleted', `Custom role "${role.name}" deleted.`, 'success');
          await this.loadRoles();
          await this.loadTeamMembers();
          this.fetchAuditLogs();
        } else {
          this.showToast('Error', data.error || 'Failed to delete role', 'danger');
        }
      } catch (err) {
        this.showToast('Error', err.message, 'danger');
      }
    },

    // -------------------------------------------------------------------------
    // Audit Trail Helpers
    // -------------------------------------------------------------------------
    handleDatePresetChange() {
      this.auditOffset = 0;
      this.fetchAuditLogs();
    },

    changeAuditPage(delta) {
      const newOffset = this.auditOffset + delta * this.auditLimit;
      if (newOffset >= 0 && newOffset < this.auditTotal) {
        this.auditOffset = newOffset;
        this.fetchAuditLogs();
      }
    },

    inspectAuditDetail(log) {
      this.selectedAuditItem = log;
      this.activeModal = 'inspectDiff';
    },

    formatDiffSummary,
    auditDetailFields,

    resetAuditFilters() {
      this.auditSearch = '';
      this.auditDatePreset = 'all';
      this.auditStartDate = '';
      this.auditEndDate = '';
      this.auditCategoryFilter = '';
      this.auditOffset = 0;
      this.fetchAuditLogs();
    },

    exportAuditCsv() {
      if (!this.auditLogs.length) {
        this.showToast('Export', 'No audit logs to export.', 'info');
        return;
      }
      const headers = ['Timestamp', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'Summary'];
      const rows = this.auditLogs.map(l => [l.fullTimestamp || l.createdAt, l.actor, l.action, l.entityType, l.entityId, formatDiffSummary(l)]);
      saveCsv(`HushHawk_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
      this.showToast('Export Complete', 'Audit ledger exported to CSV.', 'success');
    },

    exportRoster() {
      if (!this.members.length) return;
      const headers = ['Name', 'Phone', 'Email', 'Role', 'Status', 'Workspaces Allowed'];
      const rows = this.members.map(m => [m.name, m.phone, m.email, m.roleName || m.role, m.status, m.allowedCount || (m.permissions || []).length]);
      saveCsv(`HushHawk_Team_Roster_${new Date().toISOString().slice(0, 10)}.csv`, toCsv(headers, rows));
      this.showToast('Export Complete', 'Team roster exported to CSV.', 'success');
    },

    // -------------------------------------------------------------------------
    // Utilities & UI Helpers
    // -------------------------------------------------------------------------
    selectMember(member) {
      this.selectedMember = member;
    },

    getMemberSections(member) {
      if (!member) return [];
      if (member.role === 'SUPER_ADMIN' || member.email === 'admin@hushhawk.com') {
        return this.allSections;
      }
      const perms = member.permissions || [];
      return this.allSections.filter(s => perms.includes(s.path) || perms.includes(s.key));
    },

    getSectionName(path) {
      const match = this.allSections.find(s => s.path === path || s.key === path);
      return match ? match.name : path.replace('/', '');
    },

    getRoleBadgeClass(role) {
      if (role === 'SUPER_ADMIN') return 'gold';
      if (role?.includes('ACQUISITIONS')) return 'cyan';
      if (role?.includes('DISPO')) return 'purple';
      if (role?.includes('MARKET')) return 'green';
      return 'teal';
    },

    resetMemberFilters() {
      this.searchQuery = '';
      this.roleFilter = '';
      this.statusFilter = '';
    },

    closeModal() {
      this.activeModal = null;
      this.passwordTargetUser = null;
      this.editingMember = null;
      this.selectedAuditItem = null;
    },

    copyText(text, successMsg = 'Copied to clipboard!') {
      if (!text) return;
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      this.showToast('Copied', successMsg, 'info');
    },

    showToast(title, message, type = 'success') {
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.alertToast = { show: true, title, message, type };
      this.toastTimeout = setTimeout(() => {
        this.alertToast.show = false;
      }, 4000);
    }
  }
};
</script>

<style scoped>
.view-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding-bottom: 96px; /* Clearance so floating Partner Chat & HawkAI buttons never obscure content */
}

/* ========================================================================== */
/* Top Tab Navigation */
/* ========================================================================== */
.team-tab-nav {
  display: flex;
  gap: 8px;
  background: rgba(10, 25, 47, 0.7);
  border: 1px solid rgba(212, 168, 83, 0.2);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  max-width: 100%;
  overflow-x: auto;
  box-sizing: border-box;
  flex-wrap: wrap;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(212, 168, 83, 0.22), rgba(212, 168, 83, 0.08));
  border-color: rgba(212, 168, 83, 0.45);
  color: #f8fafc;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

.tab-icon {
  display: flex;
  align-items: center;
  color: #d4a853;
}

.tab-counter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 700;
  color: #cbd5e1;
}

.tab-btn.active .tab-counter {
  background: #d4a853;
  color: #0b1528;
}

.tab-pill-badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.25);
  color: #fbbf24;
  font-weight: 800;
  letter-spacing: 0.5px;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

/* ========================================================================== */
/* Tab Panes & Views Layout */
/* ========================================================================== */
.tab-pane {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.audit-trail-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.roles-management-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* ========================================================================== */
/* Top Metrics Grid */
/* ========================================================================== */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(8, 28, 54, 0.95), rgba(4, 21, 41, 0.98));
  border: 1px solid #1a3c63;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease, border-color 0.15s ease;
  min-width: 0;
}

.metric-card:hover {
  border-color: rgba(212, 168, 83, 0.35);
  transform: translateY(-1px);
}

.metric-icon-wrap {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  flex-shrink: 0;
}

.metric-icon-wrap.gold {
  color: #edcf7c;
  border: 1px solid rgba(237, 207, 124, 0.3);
  background: rgba(70, 50, 15, 0.4);
}

.metric-icon-wrap.green {
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
  background: rgba(15, 55, 30, 0.4);
}

.metric-icon-wrap.cyan {
  color: #06b6d4;
  border: 1px solid rgba(6, 182, 212, 0.3);
  background: rgba(10, 45, 60, 0.4);
}

.metric-icon-wrap.purple {
  color: #a855f7;
  border: 1px solid rgba(168, 85, 247, 0.3);
  background: rgba(45, 15, 75, 0.4);
}

.metric-icon-wrap.red {
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(65, 15, 15, 0.4);
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-val {
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.2;
  white-space: nowrap;
}

.metric-change {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-change.positive {
  color: #22c55e;
}

/* ========================================================================== */
/* Content Split & Panels */
/* ========================================================================== */
.content-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.content-split.has-drawer {
  grid-template-columns: minmax(0, 1fr) 380px;
}

@media (max-width: 1200px) {
  .content-split.has-drawer {
    grid-template-columns: minmax(0, 1fr);
  }
}

.main-panel {
  background: rgba(8, 24, 46, 0.85);
  border: 1px solid #1a3c63;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}

.header-left h2 {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.header-desc {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 4px 0 0 0;
  max-width: 800px;
  line-height: 1.45;
}

.badge-count {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.3);
  font-weight: 600;
  white-space: nowrap;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

/* ========================================================================== */
/* Filter & Search Toolbar */
/* ========================================================================== */
.filter-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: rgba(5, 17, 33, 0.7);
  border: 1px solid #153250;
  border-radius: 8px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(10, 28, 54, 0.9);
  border: 1px solid #1d4573;
  border-radius: 6px;
  padding: 6px 10px;
  flex: 1 1 220px;
  min-width: 200px;
  max-width: 100%;
  color: #94a3b8;
  box-sizing: border-box;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 13px;
  width: 100%;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  display: flex;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.filter-group label {
  font-size: 11px;
  color: #8da6c4;
  font-weight: 600;
}

.filter-group select {
  background: rgba(10, 28, 54, 0.9);
  border: 1px solid #1d4573;
  color: #f1f5f9;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.btn-toggle-all-passwords {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid #1d4573;
  background: rgba(10, 28, 54, 0.8);
  color: #94a3b8;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.btn-toggle-all-passwords:hover, .btn-toggle-all-passwords.active {
  background: rgba(212, 168, 83, 0.15);
  border-color: rgba(212, 168, 83, 0.4);
  color: #f59e0b;
}

/* ========================================================================== */
/* Data Tables */
/* ========================================================================== */
.table-container {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: visible;
  border: 1px solid #1a3c63;
  border-radius: 8px;
  background: rgba(4, 18, 36, 0.9);
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

.table-container::-webkit-scrollbar {
  height: 6px;
}
.table-container::-webkit-scrollbar-track {
  background: rgba(5, 17, 33, 0.8);
  border-radius: 3px;
}
.table-container::-webkit-scrollbar-thumb {
  background: rgba(212, 168, 83, 0.35);
  border-radius: 3px;
}
.table-container::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 168, 83, 0.65);
}

.data-table {
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;
  font-size: 12.5px;
  text-align: left;
}

.data-table th {
  padding: 10px 12px;
  font-size: 10.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8da6c4;
  background: rgba(8, 28, 54, 0.95);
  border-bottom: 1px solid #1a3c63;
  white-space: nowrap;
}

.team-roster-table .col-email {
  overflow-wrap: anywhere;
}

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(26, 60, 99, 0.5);
  color: #e2e8f0;
  vertical-align: middle;
}

.data-table tr:hover td {
  background: rgba(30, 58, 95, 0.25);
}

.data-table tr.row-selected td {
  background: rgba(212, 168, 83, 0.12);
  border-color: rgba(212, 168, 83, 0.3);
}

.team-roster-table {
  table-layout: fixed;
  width: 100%;
  min-width: 1155px;
}

/* Column Sizing & Formatting */
.col-member {
  width: 170px;
  min-width: 170px;
  max-width: 180px;
}

.col-role {
  white-space: nowrap;
  width: 135px;
  min-width: 135px;
}

.col-phone {
  white-space: nowrap;
  width: 130px;
  min-width: 130px;
}

.col-email {
  width: 180px;
  min-width: 180px;
  max-width: 200px;
}

.col-workspaces {
  white-space: nowrap;
  width: 115px;
  min-width: 115px;
}

.col-password {
  white-space: nowrap;
  width: 125px;
  min-width: 125px;
}

.col-status {
  white-space: nowrap;
  width: 80px;
  min-width: 80px;
}

.actions-col {
  white-space: nowrap;
  text-align: right;
  padding-right: 14px;
}

.audit-table .actions-col {
  min-width: 105px;
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 12px;
  color: #ffffff;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.member-meta strong {
  display: block;
  font-size: 13.5px;
  color: #ffffff;
}

.member-meta small {
  display: block;
  font-size: 11.5px;
  color: #8da6c4;
}

.contact-cell .mini-icon {
  display: inline-block;
  color: #8da6c4;
  vertical-align: middle;
  margin-right: 4px;
}

.phone-text {
  font-size: 11.5px;
  color: #38bdf8;
  white-space: nowrap;
}

.email-text {
  font-size: 11.5px;
  color: #cbd5e1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 190px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10.5px;
  font-weight: 600;
  border: 1px solid transparent;
  white-space: nowrap;
}

.role-pill.gold {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.35);
}

.role-pill.cyan {
  background: rgba(6, 182, 212, 0.15);
  color: #22d3ee;
  border-color: rgba(6, 182, 212, 0.35);
}

.role-pill.purple {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.35);
}

.role-pill.green {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.35);
}

.permission-count-pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10.5px;
  font-weight: 600;
  background: rgba(30, 58, 95, 0.5);
  color: #94a3b8;
  border: 1px solid #1a3c63;
  white-space: nowrap;
}

.permission-count-pill.full-access {
  background: rgba(212, 168, 83, 0.15);
  color: #f59e0b;
  border-color: rgba(212, 168, 83, 0.35);
}

/* Password Cell */
.password-box {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(10, 25, 47, 0.6);
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid #1a3c63;
  width: fit-content;
  white-space: nowrap;
}

.password-text {
  font-size: 11.5px;
  color: #fbbf24;
  font-weight: 600;
}

.password-hidden {
  font-size: 11px;
  color: #64748b;
  letter-spacing: 1.5px;
}

.btn-icon-subtle {
  background: transparent;
  border: none;
  color: #8da6c4;
  cursor: pointer;
  padding: 2px;
  display: flex;
  border-radius: 4px;
}

.btn-icon-subtle:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

/* Status Indicator */
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #64748b;
}

.status-indicator.active .status-dot {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

.status-indicator.offline .status-dot {
  background: #ef4444;
}

/* Actions Column */
.action-buttons-group {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: nowrap;
}

.btn-action-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 7px;
  border-radius: 5px;
  font-size: 10.5px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.btn-action-pill.key-action {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.3);
}

.btn-action-pill.key-action:hover {
  background: rgba(168, 85, 247, 0.25);
  color: #ffffff;
}

.btn-action-pill.reset-action {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
}

.btn-action-pill.reset-action:hover {
  background: rgba(245, 158, 11, 0.25);
  color: #ffffff;
}

.btn-icon {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 1px solid #1a3c63;
  background: rgba(10, 28, 54, 0.8);
  color: #8da6c4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.btn-icon:hover {
  border-color: #38bdf8;
  color: #38bdf8;
}

.btn-icon.btn-danger {
  border-color: rgba(239, 68, 68, 0.4);
  color: #f87171;
  background: rgba(239, 68, 68, 0.08);
}

.btn-icon.btn-danger:hover {
  border-color: #ef4444;
  color: #ffffff;
  background: #ef4444;
}

.btn-icon.btn-locked {
  border-color: rgba(148, 163, 184, 0.2);
  color: #64748b;
  background: rgba(15, 23, 42, 0.4);
  cursor: not-allowed;
  opacity: 0.6;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px 16px !important;
}

.empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon {
  color: #475569;
  font-size: 32px;
}

/* ========================================================================== */
/* Detail Drawer */
/* ========================================================================== */
.detail-drawer {
  background: rgba(8, 24, 46, 0.95);
  border: 1px solid #1a3c63;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: fit-content;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #1a3c63;
  background: rgba(5, 17, 33, 0.7);
}

.drawer-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #d4a853;
  letter-spacing: 0.5px;
}

.drawer-title h3 {
  font-size: 17px;
  color: #ffffff;
  margin: 2px 0 0 0;
}

.drawer-title small {
  font-size: 12px;
  color: #8da6c4;
}

.drawer-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.member-profile-card {
  display: flex;
  gap: 14px;
  align-items: center;
}

.profile-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.profile-details strong {
  display: block;
  font-size: 15px;
  color: #ffffff;
}

.profile-details p {
  font-size: 12px;
  color: #94a3b8;
  margin: 2px 0;
}

.profile-badges {
  display: flex;
  gap: 6px;
  margin-top: 6px;
}

.badge-tag {
  font-size: 10.5px;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-weight: 600;
}

.badge-tag.gold {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.badge-tag.green {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
}

.section-card {
  background: rgba(5, 17, 33, 0.6);
  border: 1px solid #153250;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-card.security-card {
  border-color: rgba(168, 85, 247, 0.3);
  background: rgba(20, 10, 35, 0.4);
}

.mini-badge {
  font-size: 11px;
  font-weight: 700;
  color: #c084fc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.credential-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.credential-row label {
  font-size: 11px;
  color: #94a3b8;
}

.password-display-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(10, 25, 47, 0.8);
  border: 1px solid #1a3c63;
  border-radius: 6px;
}

.pass-val {
  font-size: 13px;
  color: #fbbf24;
  font-weight: 700;
}

.credential-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 4px;
}

.authorized-chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}

.auth-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(10, 28, 54, 0.8);
  border: 1px solid #1d4573;
  border-radius: 6px;
  font-size: 11px;
}

.chip-dot {
  color: #22c55e;
  font-size: 8px;
}

.chip-path {
  color: #64748b;
  font-size: 10px;
}

.drawer-actions-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

/* ========================================================================== */
/* Tab 2: Custom Roles Grid & Header */
/* ========================================================================== */
.roles-management-view .panel-header {
  background: linear-gradient(135deg, rgba(8, 28, 54, 0.95), rgba(4, 21, 41, 0.98));
  border: 1px solid #1a3c63;
  border-radius: 10px;
  padding: 22px 26px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}

.roles-management-view .header-left {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.roles-management-view .header-left h2 {
  font-size: 19px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.roles-management-view .header-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
  max-width: 820px;
}

.roles-management-view .header-actions {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 2px;
}

.roles-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
  width: 100%;
}

.empty-roles-card {
  background: linear-gradient(135deg, rgba(8, 28, 54, 0.95), rgba(4, 21, 41, 0.98));
  border: 1px dashed #1a3c63;
  border-radius: 10px;
  padding: 48px 24px;
  text-align: center;
  width: 100%;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
}

.empty-roles-card .empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  max-width: 440px;
  margin: 0 auto;
}

.empty-roles-card .empty-icon {
  width: 44px;
  height: 44px;
  color: #d4a853;
  display: grid;
  place-items: center;
}

.empty-roles-card h3 {
  font-size: 18px;
  color: #ffffff;
  margin: 0;
  font-weight: 700;
}

.empty-roles-card p {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.5;
}

.role-card {
  background: linear-gradient(135deg, rgba(8, 28, 54, 0.95), rgba(4, 21, 41, 0.98));
  border: 1px solid #1a3c63;
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.role-card:hover {
  transform: translateY(-2px);
  border-color: #d4a853;
}

.role-badge-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-key-tag {
  font-size: 11px;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  padding: 2px 7px;
  border-radius: 4px;
}

.system-protected-badge {
  font-size: 9.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  font-weight: 800;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.custom-role-badge {
  font-size: 9.5px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  font-weight: 800;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.role-name {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin: 6px 0 2px 0;
}

.role-description {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
  min-height: 34px;
}

.role-stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 10px;
  background: rgba(5, 17, 33, 0.6);
  border: 1px solid #153250;
  border-radius: 6px;
}

.role-stat .stat-label {
  display: block;
  font-size: 10.5px;
  color: #8da6c4;
  text-transform: uppercase;
}

.role-stat .stat-num {
  font-size: 13.5px;
  color: #ffffff;
}

.role-permissions-preview {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-label {
  font-size: 11px;
  font-weight: 600;
  color: #8da6c4;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.preview-tag {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(10, 28, 54, 0.9);
  color: #cbd5e1;
  border: 1px solid #1d4573;
}

.preview-tag.more {
  background: rgba(212, 168, 83, 0.15);
  color: #fbbf24;
  border-color: rgba(212, 168, 83, 0.3);
}

.role-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 10px;
  border-top: 1px solid #1a3c63;
  margin-top: auto;
}

/* ========================================================================== */
/* Tab 3: Activity Log & Audit Trail */
/* ========================================================================== */
.audit-table .timestamp-cell :is(.log-date, .log-time) {
  display: block;
}

.log-date {
  font-size: 12.5px;
  color: #ffffff;
}

.log-time {
  font-size: 11px;
  color: #38bdf8;
}

.actor-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actor-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1e3a5f;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
}

.actor-info strong {
  display: block;
  font-size: 12.5px;
  color: #ffffff;
}

.actor-info small {
  display: block;
  font-size: 10.5px;
  color: #8da6c4;
}

.audit-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.audit-badge.badge-success {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.4);
}

.audit-badge.badge-warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.audit-badge.badge-danger {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.audit-badge.badge-purple {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.4);
}

.audit-badge.badge-cyan {
  background: rgba(6, 182, 212, 0.2);
  color: #22d3ee;
  border: 1px solid rgba(6, 182, 212, 0.4);
}

.audit-badge.badge-info {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.4);
}

.entity-box {
  display: flex;
  flex-direction: column;
}

.entity-type {
  font-size: 11.5px;
  color: #e2e8f0;
  font-weight: 600;
}

.entity-id {
  font-size: 10.5px;
  color: #64748b;
}

.diff-summary-cell {
  min-width: 220px;
  max-width: 380px;
}

.diff-summary-text {
  font-size: 12px;
  color: #cbd5e1;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.audit-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-top: 1px solid #1a3c63;
  background: rgba(5, 17, 33, 0.6);
  border-radius: 0 0 8px 8px;
}

.pagination-info {
  font-size: 12px;
  color: #94a3b8;
}

.pagination-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-current {
  font-size: 12px;
  color: #fbbf24;
}

.custom-date-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.date-input {
  background: rgba(10, 28, 54, 0.9);
  border: 1px solid #1d4573;
  color: #ffffff;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.date-sep {
  color: #64748b;
  font-size: 11px;
}

/* ========================================================================== */
/* Role Matrix Form & Modals */
/* ========================================================================== */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 9999;
  padding: 20px;
}

.modal-dialog {
  background: linear-gradient(135deg, #091b33, #041427);
  border: 1px solid #1d4573;
  border-radius: 12px;
  width: 100%;
  max-width: 580px;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  animation: modalFadeIn 0.2s ease;
}

.modal-dialog.modal-sm { max-width: 440px; }
.modal-dialog.modal-md { max-width: 680px; }
.modal-dialog.modal-lg { max-width: 860px; max-height: 90vh; display: flex; flex-direction: column; }

@keyframes modalFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  border-bottom: 1px solid #1a3c63;
  background: rgba(5, 17, 33, 0.8);
}

.modal-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #38bdf8;
}

.modal-badge.gold { color: #fbbf24; }
.modal-badge.purple { color: #c084fc; }
.modal-badge.cyan { color: #22d3ee; }

.modal-title-group h3 {
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
  margin: 3px 0 0 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}

.close-btn:hover { color: #ffffff; }

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

.modal-subtext {
  font-size: 12.5px;
  color: #94a3b8;
  margin: 0;
  line-height: 1.45;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
}

.form-group input, .form-group select {
  background: rgba(10, 28, 54, 0.85);
  border: 1px solid #1d4573;
  border-radius: 6px;
  padding: 8px 12px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
}

.form-group input:focus, .form-group select:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-row .flex-2 { grid-column: span 1; }
.form-row .flex-3 { grid-column: span 1; }

.form-hint {
  font-size: 11px;
  color: #64748b;
}

.label-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-text-action {
  background: transparent;
  border: none;
  color: #f59e0b;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.password-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrap input {
  width: 100%;
  padding-right: 36px;
}

.btn-input-eye {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  color: #8da6c4;
  cursor: pointer;
  display: flex;
}

/* Matrix Control Bar */
.matrix-control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(5, 17, 33, 0.8);
  border: 1px solid #1a3c63;
  border-radius: 8px;
}

.matrix-title strong {
  display: block;
  font-size: 13px;
  color: #ffffff;
}

.matrix-title small {
  display: block;
  font-size: 11px;
  color: #8da6c4;
}

.matrix-actions {
  display: flex;
  gap: 6px;
}

/* Matrix Groups */
.section-matrix-groups {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 480px;
  min-height: 240px;
  overflow-y: auto;
  padding-right: 6px;
  width: 100%;
}

.matrix-group {
  background: rgba(6, 20, 38, 0.6);
  border: 1px solid #14304e;
  border-radius: 8px;
  padding: 12px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(26, 60, 99, 0.4);
}

.group-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #d4a853;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-count {
  font-size: 11px;
  color: #8da6c4;
  font-weight: 600;
}

.group-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 8px;
}

.section-checkbox-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(10, 28, 54, 0.6);
  border: 1px solid #1a3c63;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.section-checkbox-card:hover {
  background: rgba(15, 38, 72, 0.8);
  border-color: #38bdf8;
}

.section-checkbox-card.checked {
  background: rgba(212, 168, 83, 0.15);
  border-color: rgba(212, 168, 83, 0.45);
}

.section-checkbox-card input[type="checkbox"] {
  accent-color: #d4a853;
  width: 15px;
  height: 15px;
  cursor: pointer;
}

.card-icon {
  color: #8da6c4;
  display: flex;
}

.section-checkbox-card.checked .card-icon {
  color: #fbbf24;
}

.card-info strong {
  display: block;
  font-size: 12px;
  color: #ffffff;
}

.card-info code {
  display: block;
  font-size: 10px;
  color: #64748b;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid #1a3c63;
}

/* JSON Viewer */
.audit-meta-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px;
  background: rgba(5, 17, 33, 0.8);
  border: 1px solid #1a3c63;
  border-radius: 6px;
  font-size: 12px;
  color: #cbd5e1;
}

.json-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #8da6c4;
  text-transform: uppercase;
}

.audit-field-list {
  display: grid;
  gap: 8px;
  margin: 0 0 16px;
}
.audit-field-list div {
  display: grid;
  grid-template-columns: minmax(90px, 1fr) 2fr;
  gap: 12px;
}
.audit-field-list dt {
  font-weight: 600;
}
.audit-field-list dd {
  margin: 0;
  overflow-wrap: anywhere;
}

/* ========================================================================== */
/* Buttons & Globals */
/* ========================================================================== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #d4a853, #b8860b);
  color: #0b1528;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #e5ba65, #c9971c);
  box-shadow: 0 0 12px rgba(212, 168, 83, 0.4);
}

.btn-primary.btn-glow {
  box-shadow: 0 0 10px rgba(212, 168, 83, 0.25);
}

.btn-secondary {
  background: rgba(10, 28, 54, 0.8);
  border-color: #1a3c63;
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: rgba(18, 48, 88, 0.9);
  border-color: #38bdf8;
}

.btn-gold {
  background: rgba(212, 168, 83, 0.2);
  color: #fbbf24;
  border-color: rgba(212, 168, 83, 0.4);
}

.btn-gold:hover {
  background: rgba(212, 168, 83, 0.35);
  color: #ffffff;
}

.btn-danger {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #f87171;
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #ffffff;
}

.btn-sm { padding: 5px 10px; font-size: 11.5px; }
.btn-xs { padding: 3px 8px; font-size: 10.5px; }

/* Toast */
.team-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  background: #091e38;
  border: 1px solid #d4a853;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  z-index: 99999;
}

.team-toast .toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}

.team-toast.danger .toast-dot { background: #ef4444; }
.team-toast.info .toast-dot { background: #38bdf8; }

.team-toast strong {
  display: block;
  font-size: 12.5px;
  color: #ffffff;
}

.team-toast p {
  margin: 0;
  font-size: 11.5px;
  color: #94a3b8;
}

.toast-slide-enter-active, .toast-slide-leave-active {
  transition: all 0.3s ease;
}

.toast-slide-enter-from, .toast-slide-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
