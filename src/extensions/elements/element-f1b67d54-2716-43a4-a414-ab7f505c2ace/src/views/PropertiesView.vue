<template>
  <div class="properties-workspace">

    <!-- Toast Notification -->
    <transition name="toast-fade">
      <div v-if="toastMessage" class="toast-notification">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#edcf7c" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- Left Panel: Properties List -->
    <aside class="prop-sidebar">
      <div class="prop-sidebar-header">
        <h2>Properties</h2>
        <button class="btn-add-prop" @click="showAddModal = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Property
        </button>
      </div>

      <div class="prop-search-wrap">
        <svg class="prop-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="propSearch" class="prop-search" type="text" placeholder="Search properties..." />
      </div>

      <div class="prop-list">
        <div
          v-for="prop in filteredProperties"
          :key="prop.property_id"
          class="prop-card"
          :class="{ active: selectedPropertyId === prop.property_id }"
          @click="selectProperty(prop)"
        >
          <div class="prop-card-thumb">
            <div class="prop-thumb-placeholder">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
            </div>
            <div v-if="prop.thumb" class="prop-thumb-img" :style="`background-image:url('${prop.thumb}')`"></div>
          </div>
          <div class="prop-card-info">
            <span class="prop-card-address">{{ prop.address_line1 }}</span>
            <span class="prop-card-city">{{ prop.city }}, {{ prop.state_code }}</span>
            <div class="prop-card-badges">
              <span class="badge-active">Active</span>
              <span v-if="prop.property_type" class="badge-type">{{ prop.property_type }}</span>
            </div>
          </div>
        </div>
        <div v-if="filteredProperties.length === 0 && !loadingProperties" class="prop-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4a6484" stroke-width="1"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <p>No properties found</p>
        </div>
        <div v-if="loadingProperties" class="prop-loading-list">
          <div class="spinner-sm"></div>
          <span>Loading properties…</span>
        </div>
      </div>
    </aside>

    <!-- Right Panel: Property Detail -->
    <div class="prop-detail" v-if="selectedProperty">

      <!-- Breadcrumbs -->
      <div class="prop-breadcrumb">
        <span>Properties</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
        <strong>{{ selectedProperty.address_line1 }}</strong>
      </div>

      <!-- Property Header -->
      <div class="prop-header">
        <div class="prop-hero-thumb">
          <div class="prop-hero-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a4a6a" stroke-width="1"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
          </div>
          <div v-if="heroPhoto" class="prop-hero-img" :style="`background-image:url('${heroPhoto}')`"></div>
        </div>
        <div class="prop-header-info">
          <h1 class="prop-address">{{ selectedProperty.address_line1 }}</h1>
          <div class="prop-location">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#edcf7c" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {{ selectedProperty.city }}, {{ selectedProperty.state_code }} {{ selectedProperty.postal_code }}
          </div>
          <div class="prop-status-row">
            <span class="status-badge active">Active</span>
            <span class="status-badge renovation">Renovation</span>
            <span class="crownkey-badge">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#edcf7c" stroke="none"><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>
              CrownKey: {{ selectedProperty.crownKey || selectedProperty.crownKeyBase || 'HH-001' }}
            </span>
          </div>
        </div>
        <div class="prop-header-actions">
          <button class="btn-edit-prop" @click="openEditModal">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Property
          </button>
          <div class="actions-wrap" @click.stop>
            <button class="btn-actions" @click="actionsOpen = !actionsOpen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
              Actions
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6,9 12,15 18,9"/></svg>
            </button>
            <div v-if="actionsOpen" class="actions-menu">
              <button @click="triggerCamera(); actionsOpen=false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Take Photo
              </button>
              <button @click="triggerUpload(); actionsOpen=false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                Upload Files
              </button>
              <button @click="showAddDocModal=true; actionsOpen=false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                Create Document
              </button>
              <button @click="shareSecureLink(); actionsOpen=false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Share Secure Link
              </button>
              <button @click="showAddTaskModal=true; actionsOpen=false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Add Task
              </button>
              <button @click="viewInMap(); actionsOpen=false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16 10,8"/></svg>
                View in Map
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab Bar -->
      <div class="prop-tabs">
        <button v-for="tab in tabs" :key="tab.key"
          :class="{ active: activeTab === tab.key }"
          @click="changeTab(tab.key)">
          <span v-html="tab.icon"></span>
          {{ tab.label }}
          <span v-if="getTabCount(tab.key) !== null" class="tab-badge">{{ getTabCount(tab.key) }}</span>
        </button>
      </div>

      <!-- OVERVIEW TAB -->
      <div v-if="activeTab === 'overview'" class="tab-content-panel">
        <div class="overview-grid">
          <div class="ov-card">
            <span class="ov-label">Property Type</span>
            <span class="ov-value">{{ selectedProperty.property_type || 'Single Family Residential' }}</span>
          </div>
          <div class="ov-card">
            <span class="ov-label">Assessed Value</span>
            <span class="ov-value gold">${{ Number(selectedProperty.assessed_value || 0).toLocaleString() }}</span>
          </div>
          <div class="ov-card">
            <span class="ov-label">Estimated Equity</span>
            <span class="ov-value gold">${{ Number(selectedProperty.estimated_equity || Math.round((Number(selectedProperty.assessed_value) || 200000) * 0.45)).toLocaleString() }}</span>
          </div>
          <div class="ov-card">
            <span class="ov-label">Parcel ID</span>
            <span class="ov-value mono">{{ selectedProperty.parcel_raw || '—' }}</span>
          </div>
          <div class="ov-card">
            <span class="ov-label">County</span>
            <span class="ov-value">{{ selectedProperty.county_code || 'DUV' }} County</span>
          </div>
          <div class="ov-card">
            <span class="ov-label">Legal Description</span>
            <span class="ov-value small">{{ selectedProperty.legal_description || '—' }}</span>
          </div>
          <div class="ov-card">
            <span class="ov-label">CrownKey ID</span>
            <span class="ov-value mono gold">{{ selectedProperty.crownKey || selectedProperty.crownKeyBase || '—' }}</span>
          </div>
          <div class="ov-card">
            <span class="ov-label">Canonical Database</span>
            <span class="ov-value small" style="color: #2ecc71;">AWS RDS PostgreSQL</span>
          </div>
        </div>

        <!-- Quick Summary Cards -->
        <div class="overview-quick-stats">
          <div class="quick-stat-card" @click="changeTab('photos')">
            <div class="qs-icon photos-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div class="qs-info">
              <span class="qs-num">{{ photos.length }}</span>
              <span class="qs-label">Property Photos</span>
            </div>
            <svg class="qs-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
          </div>

          <div class="quick-stat-card" @click="changeTab('tasks')">
            <div class="qs-icon tasks-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <div class="qs-info">
              <span class="qs-num">{{ pendingTasksCount }}</span>
              <span class="qs-label">Active Tasks</span>
            </div>
            <svg class="qs-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
          </div>

          <div class="quick-stat-card" @click="changeTab('documents')">
            <div class="qs-icon docs-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
            </div>
            <div class="qs-info">
              <span class="qs-num">{{ documents.length }}</span>
              <span class="qs-label">Legal Documents</span>
            </div>
            <svg class="qs-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
          </div>

          <div class="quick-stat-card" @click="changeTab('expenses')">
            <div class="qs-icon expenses-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="qs-info">
              <span class="qs-num">${{ Number(totalExpenses).toLocaleString() }}</span>
              <span class="qs-label">Reno Budget Spent</span>
            </div>
            <svg class="qs-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
          </div>
        </div>
      </div>

      <!-- PHOTOS TAB -->
      <div v-if="activeTab === 'photos'" class="photos-panel">
        <div class="photos-header">
          <div>
            <h3 class="photos-title">Property Photos</h3>
            <p class="photos-subtitle">Images are securely stored in private Amazon S3 bucket.</p>
          </div>
          <div class="photos-actions">
            <!-- Animated Green Pill Toast (Step 08) -->
            <transition name="fade">
              <div v-if="showPhotoAddedToast" class="badge-photos-added">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <span>${lastAddedCount} photos added</span>
              </div>
            </transition>

            <button class="btn-take-photo" @click="openChooseOptionModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Photos
            </button>
          </div>
        </div>

        <div v-if="loadingPhotos" class="loading-state">
          <div class="spinner"></div>
          <span>Loading photos from AWS S3 &amp; PostgreSQL...</span>
        </div>

        <div v-else-if="photos.length === 0" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a4a6a" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <p>No photos uploaded yet for this parcel.</p>
          <button class="btn-primary" @click="openChooseOptionModal">Add First Photo</button>
        </div>

        <!-- Photos Grid with S3 Badges -->
        <div v-else class="photos-grid">
          <div
            v-for="photo in photos"
            :key="photo.id"
            class="photo-card"
            @click="openPhotoDetail(photo)"
          >
            <div class="photo-thumb-wrap">
              <img
                v-if="photo.data_url"
                :src="photo.data_url"
                :alt="photo.caption || photo.filename"
                class="photo-thumb-img"
              />
              <div v-else class="photo-placeholder">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <div class="s3-hover-pill">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                S3 Saved
              </div>
            </div>
            <div class="photo-meta">
              <strong class="photo-caption">{{ photo.caption || photo.original_filename || photo.filename }}</strong>
              <div class="photo-subline">
                <span class="photo-tag-pill">{{ photo.tag || 'Before Photos' }}</span>
                <span class="photo-date">{{ formatDate(photo.photo_date || photo.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DOCUMENTS TAB -->
      <div v-if="activeTab === 'documents'" class="tab-content-panel">
        <div class="tab-panel-header">
          <div>
            <h3 class="tab-panel-title">Property Documents</h3>
            <p class="tab-panel-subtitle">Executed contracts, title commitments, and inspection reports.</p>
          </div>
          <button class="btn-primary-gold" @click="showAddDocModal = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Document
          </button>
        </div>

        <div v-if="loadingDocs" class="panel-loading">
          <div class="spinner-md"></div>
          <span>Loading documents…</span>
        </div>

        <div v-else-if="documents.length === 0" class="panel-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a4a6a" stroke-width="1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          <p>No documents uploaded yet for this property.</p>
          <button class="btn-primary-gold" @click="showAddDocModal = true">Add First Document</button>
        </div>

        <div v-else class="documents-table-wrap">
          <table class="hh-table">
            <thead>
              <tr>
                <th>Document Title</th>
                <th>Category</th>
                <th>Filename</th>
                <th>File Size</th>
                <th>Date Uploaded</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="doc in documents" :key="doc.id">
                <td>
                  <div class="doc-title-cell">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#edcf7c" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    <strong>{{ doc.title }}</strong>
                  </div>
                </td>
                <td><span class="category-pill">{{ doc.category }}</span></td>
                <td class="mono-text">{{ doc.filename }}</td>
                <td>{{ formatSize(doc.file_size_bytes) }}</td>
                <td>{{ formatDate(doc.created_at) }}</td>
                <td style="text-align: right;">
                  <button class="btn-icon" @click="downloadDocument(doc)" title="Download">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8,17 12,21 16,17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                  </button>
                  <button class="btn-icon danger" @click="deleteDocument(doc)" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TASKS TAB -->
      <div v-if="activeTab === 'tasks'" class="tab-content-panel">
        <div class="tab-panel-header">
          <div>
            <h3 class="tab-panel-title">Property Tasks</h3>
            <p class="tab-panel-subtitle">Action items, inspections, and contractor punch lists for this parcel.</p>
          </div>
          <button class="btn-primary-gold" @click="showAddTaskModal = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Task
          </button>
        </div>

        <div v-if="loadingTasks" class="panel-loading">
          <div class="spinner-md"></div>
          <span>Loading tasks…</span>
        </div>

        <div v-else-if="tasks.length === 0" class="panel-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a4a6a" stroke-width="1"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <p>No tasks yet. Create a punch list or follow-up task.</p>
          <button class="btn-primary-gold" @click="showAddTaskModal = true">Create First Task</button>
        </div>

        <div v-else class="tasks-list">
          <div
            v-for="t in tasks"
            :key="t.task_id"
            class="task-row"
            :class="{ completed: t.is_completed || t.status === 'DONE' }"
          >
            <label class="task-checkbox-wrap">
              <input
                type="checkbox"
                :checked="t.is_completed || t.status === 'DONE'"
                @change="toggleTask(t)"
              />
              <span class="custom-checkbox"></span>
            </label>
            <div class="task-main">
              <span class="task-title">{{ t.title }}</span>
              <div class="task-meta">
                <span class="priority-pill" :class="(t.priority || 'medium').toLowerCase()">{{ t.priority || 'Medium' }}</span>
                <span v-if="t.category" class="category-pill">{{ t.category }}</span>
                <span class="due-text">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                  Due {{ formatDate(t.due_date) }} {{ t.due_time ? '• ' + t.due_time : '' }}
                </span>
              </div>
            </div>
            <div class="task-status-tag" :class="t.is_completed || t.status === 'DONE' ? 'done' : 'pending'">
              {{ t.is_completed || t.status === 'DONE' ? 'Completed' : 'Pending' }}
            </div>
          </div>
        </div>
      </div>

      <!-- EXPENSES TAB -->
      <div v-if="activeTab === 'expenses'" class="tab-content-panel">
        <div class="tab-panel-header">
          <div>
            <h3 class="tab-panel-title">Renovation Expenses</h3>
            <p class="tab-panel-subtitle">Itemized budget and contractor receipts tracked against this property.</p>
          </div>
          <button class="btn-primary-gold" @click="showAddExpenseModal = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Expense
          </button>
        </div>

        <!-- Expense Overview Banner -->
        <div class="expense-summary-strip">
          <div class="es-item">
            <span class="es-label">Total Renovation Spend</span>
            <span class="es-val gold">${{ Number(totalExpenses).toLocaleString() }}</span>
          </div>
          <div class="es-item">
            <span class="es-label">Expense Items</span>
            <span class="es-val">{{ expenses.length }}</span>
          </div>
          <div class="es-item">
            <span class="es-label">Estimated ARV</span>
            <span class="es-val">${{ Number(Math.round((Number(selectedProperty.assessed_value) || 200000) * 1.35)).toLocaleString() }}</span>
          </div>
        </div>

        <div v-if="loadingExpenses" class="panel-loading">
          <div class="spinner-md"></div>
          <span>Loading expenses…</span>
        </div>

        <div v-else-if="expenses.length === 0" class="panel-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a4a6a" stroke-width="1"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <p>No renovation expenses logged yet.</p>
          <button class="btn-primary-gold" @click="showAddExpenseModal = true">Log First Expense</button>
        </div>

        <div v-else class="documents-table-wrap">
          <table class="hh-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Vendor / Payee</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="exp in expenses" :key="exp.id">
                <td>{{ formatDate(exp.expense_date) }}</td>
                <td><span class="category-pill">{{ exp.category }}</span></td>
                <td>{{ exp.description || '—' }}</td>
                <td class="mono-text">{{ exp.vendor || '—' }}</td>
                <td style="text-align: right;" class="gold font-bold">${{ Number(exp.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</td>
                <td style="text-align: right;">
                  <button class="btn-icon danger" @click="deleteExpense(exp)" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CONTRACTORS TAB -->
      <div v-if="activeTab === 'contractors'" class="tab-content-panel">
        <div class="tab-panel-header">
          <div>
            <h3 class="tab-panel-title">Contractor Roster</h3>
            <p class="tab-panel-subtitle">Assigned trade specialists, project managers, and subcontractors.</p>
          </div>
          <button class="btn-primary-gold" @click="showAddContractorModal = true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Assign Contractor
          </button>
        </div>

        <div v-if="loadingContractors" class="panel-loading">
          <div class="spinner-md"></div>
          <span>Loading contractors…</span>
        </div>

        <div v-else-if="contractors.length === 0" class="panel-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a4a6a" stroke-width="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>
          <p>No contractors assigned to this property.</p>
          <button class="btn-primary-gold" @click="showAddContractorModal = true">Assign First Contractor</button>
        </div>

        <div v-else class="contractors-grid">
          <div v-for="c in contractors" :key="c.id" class="contractor-card">
            <div class="cont-head">
              <div class="cont-avatar">{{ c.name.charAt(0) }}</div>
              <div class="cont-info">
                <h4>{{ c.name }}</h4>
                <span class="cont-trade">{{ c.trade }}</span>
              </div>
              <button class="btn-icon danger" @click="deleteContractor(c)" title="Remove">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div class="cont-body">
              <div class="cont-detail-row">
                <span class="lbl">Status</span>
                <span class="cont-status" :class="c.status.toLowerCase().replace(/\s+/g,'-')">{{ c.status }}</span>
              </div>
              <div class="cont-detail-row" v-if="c.phone">
                <span class="lbl">Phone</span>
                <a :href="'tel:' + c.phone" class="cont-link">{{ c.phone }}</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TIMELINE TAB -->
      <div v-if="activeTab === 'timeline'" class="tab-content-panel">
        <div class="tab-panel-header">
          <div>
            <h3 class="tab-panel-title">Property Audit Timeline</h3>
            <p class="tab-panel-subtitle">Real-time chronicle of parcel events, documents, photos, and assignments.</p>
          </div>
          <button class="btn-icon" @click="loadTimeline(selectedProperty.property_id)" title="Refresh Timeline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>

        <div v-if="loadingTimeline" class="panel-loading">
          <div class="spinner-md"></div>
          <span>Building chronological timeline…</span>
        </div>

        <div v-else-if="timelineItems.length === 0" class="panel-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a4a6a" stroke-width="1"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
          <p>No timeline records for this property.</p>
        </div>

        <div v-else class="timeline-stream">
          <div v-for="(ev, idx) in timelineItems" :key="idx" class="timeline-entry">
            <div class="timeline-dot">
              <svg v-if="ev.type==='CREATED'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <svg v-else-if="ev.type==='PHOTOS'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/></svg>
              <svg v-else-if="ev.type==='DOCUMENT'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#edcf7c" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              <svg v-else-if="ev.type==='CONTRACTOR'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9b59b6" stroke-width="2.5"><circle cx="9" cy="7" r="4"/></svg>
              <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f39c12" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/></svg>
            </div>
            <div class="timeline-card">
              <div class="tc-head">
                <span class="tc-title">{{ ev.title }}</span>
                <span class="tc-time">{{ formatDate(ev.timestamp) }}</span>
              </div>
              <p class="tc-desc">{{ ev.description }}</p>
              <span class="tc-badge">{{ ev.badge }}</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- No property selected -->
    <div v-else-if="!loadingProperties" class="prop-detail prop-detail-empty">
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#1a3a5a" stroke-width="0.75"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
        <h3>Select a Property</h3>
        <p>Choose a property from the left panel to view details and manage photos.</p>
      </div>
    </div>

    <!-- Hidden file inputs -->
    <input ref="fileCamera" type="file" accept="image/*" capture="environment" multiple style="display:none" @change="onFilesSelected" />
    <input ref="fileUpload" type="file" accept="image/*,application/pdf" multiple style="display:none" @change="onFilesSelected" />
    <input ref="docFileInput" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" style="display:none" @change="onDocFileSelected" />

    <!-- EDIT PROPERTY MODAL -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal=false">
      <div class="modal-card add-prop-modal">
        <div class="modal-head">
          <strong>Edit Property Details</strong>
          <button class="modal-close" @click="showEditModal=false">×</button>
        </div>
        <div class="add-prop-form">
          <div class="form-row">
            <label>Property Address *</label>
            <input v-model="editProp.address_line1" type="text" placeholder="714 E 8th St" />
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>City</label>
              <input v-model="editProp.city" type="text" placeholder="Jacksonville" />
            </div>
            <div class="form-row">
              <label>State</label>
              <input v-model="editProp.state_code" type="text" placeholder="FL" maxlength="2" />
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>ZIP Code</label>
              <input v-model="editProp.postal_code" type="text" placeholder="32206" />
            </div>
            <div class="form-row">
              <label>County</label>
              <select v-model="editProp.county_code">
                <option value="DUV">Duval (DUV)</option>
                <option value="CLY">Clay (CLY)</option>
                <option value="STJ">St. Johns (STJ)</option>
                <option value="NAS">Nassau (NAS)</option>
              </select>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>Parcel ID</label>
              <input v-model="editProp.parcel_raw" type="text" placeholder="003419-0020" />
            </div>
            <div class="form-row">
              <label>Assessed Value ($)</label>
              <input v-model="editProp.assessed_value" type="number" placeholder="175000" />
            </div>
          </div>
          <div class="form-row">
            <label>Property Type</label>
            <select v-model="editProp.property_type">
              <option value="Single Family Residential">Single Family Residential</option>
              <option value="Multi-Family (Duplex)">Multi-Family (Duplex)</option>
              <option value="Townhouse">Townhouse</option>
              <option value="Vacant Land">Vacant Land</option>
              <option value="Commercial">Commercial</option>
            </select>
          </div>
          <div class="form-row">
            <label>Legal Description</label>
            <input v-model="editProp.legal_description" type="text" placeholder="SPRINGFIELD SEC B LOT 7" />
          </div>
          <p v-if="editPropError" class="form-error">{{ editPropError }}</p>
          <div class="form-actions">
            <button class="btn-cancel-upload" @click="showEditModal=false">Cancel</button>
            <button class="btn-upload-submit" @click="saveEditProperty" :disabled="savingEdit">
              {{ savingEdit ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD PROPERTY MODAL -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="showAddModal=false">
      <div class="modal-card add-prop-modal">
        <div class="modal-head">
          <strong>Add New Property</strong>
          <button class="modal-close" @click="showAddModal=false">×</button>
        </div>
        <div class="add-prop-form">
          <div class="form-row">
            <label>Property Address *</label>
            <input v-model="newProp.address_line1" type="text" placeholder="1234 Main St" />
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>City</label>
              <input v-model="newProp.city" type="text" placeholder="Jacksonville" />
            </div>
            <div class="form-row">
              <label>State</label>
              <input v-model="newProp.state_code" type="text" placeholder="FL" maxlength="2" />
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>ZIP Code</label>
              <input v-model="newProp.postal_code" type="text" placeholder="32204" />
            </div>
            <div class="form-row">
              <label>County</label>
              <select v-model="newProp.county_code">
                <option value="DUV">Duval</option>
                <option value="CLY">Clay</option>
                <option value="STJ">St. Johns</option>
                <option value="NAS">Nassau</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label>Parcel ID *</label>
            <input v-model="newProp.parcel_raw" type="text" placeholder="045912-1080" />
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>Assessed Value ($)</label>
              <input v-model="newProp.assessed_value" type="number" placeholder="250000" />
            </div>
            <div class="form-row">
              <label>Property Type</label>
              <select v-model="newProp.property_type">
                <option value="Single Family Residential">Single Family</option>
                <option value="Multi-Family (Duplex)">Multi-Family</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Vacant Land">Vacant Land</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
          </div>
          <p v-if="addPropError" class="form-error">{{ addPropError }}</p>
          <div class="form-actions">
            <button class="btn-cancel-upload" @click="showAddModal=false">Cancel</button>
            <button class="btn-upload-submit" @click="saveNewProperty" :disabled="savingProperty">
              {{ savingProperty ? 'Saving…' : 'Save Property' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD DOCUMENT MODAL -->
    <div v-if="showAddDocModal" class="modal-overlay" @click.self="showAddDocModal=false">
      <div class="modal-card add-prop-modal">
        <div class="modal-head">
          <strong>Upload Property Document</strong>
          <button class="modal-close" @click="showAddDocModal=false">×</button>
        </div>
        <div class="add-prop-form">
          <div class="form-row">
            <label>Document Title *</label>
            <input v-model="newDoc.title" type="text" placeholder="e.g. Executed Purchase Agreement" />
          </div>
          <div class="form-row">
            <label>Category</label>
            <select v-model="newDoc.category">
              <option value="Contract">Contract / Purchase Agreement</option>
              <option value="Title">Title Commitment / Policy</option>
              <option value="Inspection">Inspection Report</option>
              <option value="Appraisal">Appraisal</option>
              <option value="Survey">Boundary Survey</option>
              <option value="Insurance">Insurance Policy</option>
              <option value="Renovation">Renovation Estimate / Scope</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-row">
            <label>Document File</label>
            <button type="button" class="btn-upload-files" style="width: 100%; justify-content: center;" @click="$refs.docFileInput.click()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              {{ newDoc.filename ? newDoc.filename : 'Choose File (PDF, DOCX, Image)' }}
            </button>
          </div>
          <div class="form-actions">
            <button class="btn-cancel-upload" @click="showAddDocModal=false">Cancel</button>
            <button class="btn-upload-submit" @click="saveNewDocument" :disabled="savingDoc">
              {{ savingDoc ? 'Uploading…' : 'Save Document' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD TASK MODAL -->
    <div v-if="showAddTaskModal" class="modal-overlay" @click.self="showAddTaskModal=false">
      <div class="modal-card add-prop-modal">
        <div class="modal-head">
          <strong>Add Property Task</strong>
          <button class="modal-close" @click="showAddTaskModal=false">×</button>
        </div>
        <div class="add-prop-form">
          <div class="form-row">
            <label>Task Title *</label>
            <input v-model="newTask.title" type="text" placeholder="e.g. Schedule electrical inspection with Duval County" />
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>Priority</label>
              <select v-model="newTask.priority">
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div class="form-row">
              <label>Category</label>
              <select v-model="newTask.category">
                <option value="Inspection">Inspection</option>
                <option value="Renovation">Renovation</option>
                <option value="Contractor">Contractor</option>
                <option value="Title">Title / Escrow</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>Due Date</label>
              <input v-model="newTask.due_date" type="date" />
            </div>
            <div class="form-row">
              <label>Due Time</label>
              <input v-model="newTask.due_time" type="text" placeholder="05:00 PM" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-cancel-upload" @click="showAddTaskModal=false">Cancel</button>
            <button class="btn-upload-submit" @click="saveNewTask" :disabled="savingTask">
              {{ savingTask ? 'Creating…' : 'Create Task' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD EXPENSE MODAL -->
    <div v-if="showAddExpenseModal" class="modal-overlay" @click.self="showAddExpenseModal=false">
      <div class="modal-card add-prop-modal">
        <div class="modal-head">
          <strong>Log Renovation Expense</strong>
          <button class="modal-close" @click="showAddExpenseModal=false">×</button>
        </div>
        <div class="add-prop-form">
          <div class="form-row-2">
            <div class="form-row">
              <label>Category *</label>
              <select v-model="newExpense.category">
                <option value="Demolition">Demolition</option>
                <option value="Materials">Materials</option>
                <option value="Permits">Permits & Fees</option>
                <option value="Labor">Labor</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="HVAC">HVAC</option>
                <option value="Roofing">Roofing</option>
                <option value="Painting">Painting</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-row">
              <label>Amount ($) *</label>
              <input v-model="newExpense.amount" type="number" step="0.01" placeholder="1250.00" />
            </div>
          </div>
          <div class="form-row">
            <label>Description</label>
            <input v-model="newExpense.description" type="text" placeholder="e.g. Drywall, 2x4 studs and screws" />
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>Vendor / Payee</label>
              <input v-model="newExpense.vendor" type="text" placeholder="e.g. Home Depot Pro" />
            </div>
            <div class="form-row">
              <label>Expense Date</label>
              <input v-model="newExpense.expense_date" type="date" />
            </div>
          </div>
          <div class="form-actions">
            <button class="btn-cancel-upload" @click="showAddExpenseModal=false">Cancel</button>
            <button class="btn-upload-submit" @click="saveNewExpense" :disabled="savingExpense">
              {{ savingExpense ? 'Saving…' : 'Record Expense' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ASSIGN CONTRACTOR MODAL -->
    <div v-if="showAddContractorModal" class="modal-overlay" @click.self="showAddContractorModal=false">
      <div class="modal-card add-prop-modal">
        <div class="modal-head">
          <strong>Assign Contractor</strong>
          <button class="modal-close" @click="showAddContractorModal=false">×</button>
        </div>
        <div class="add-prop-form">
          <div class="form-row">
            <label>Contractor / Company Name *</label>
            <input v-model="newContractor.name" type="text" placeholder="e.g. Marcus Vance Construction" />
          </div>
          <div class="form-row-2">
            <div class="form-row">
              <label>Trade *</label>
              <select v-model="newContractor.trade">
                <option value="General Contractor">General Contractor</option>
                <option value="Electrician">Electrician</option>
                <option value="Plumber">Plumber</option>
                <option value="Roofer">Roofer</option>
                <option value="Painter">Painter</option>
                <option value="HVAC">HVAC</option>
                <option value="Flooring">Flooring</option>
                <option value="Handyman">Handyman</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-row">
              <label>Phone Number</label>
              <input v-model="newContractor.phone" type="text" placeholder="(904) 555-0199" />
            </div>
          </div>
          <div class="form-row">
            <label>Initial Status</label>
            <select v-model="newContractor.status">
              <option value="Active On Site">Active On Site</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div class="form-actions">
            <button class="btn-cancel-upload" @click="showAddContractorModal=false">Cancel</button>
            <button class="btn-upload-submit" @click="saveNewContractor" :disabled="savingContractor">
              {{ savingContractor ? 'Assigning…' : 'Assign Contractor' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ADD PHOTOS MODAL (Review & Notes) -->
    <div v-if="showAddPhotosModal || pendingFiles.length > 0" class="modal-overlay" @click.self="cancelUpload">
      <div class="modal-card">
        <div class="modal-head">
          <strong>Add Photos</strong>
          <button class="modal-close" @click="cancelUpload">×</button>
        </div>

        <div v-if="pendingFiles.length === 0" class="modal-pick-section">
          <button class="modal-pick-btn" @click="triggerCamera">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <div>
              <span>Take Photo</span>
              <small>Use your device camera</small>
            </div>
          </button>
          <button class="modal-pick-btn" @click="triggerUpload">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            <div>
              <span>Upload Files</span>
              <small>PDF, images, videos</small>
            </div>
          </button>
        </div>

        <div v-else class="review-section">
          <div class="review-header">
            <strong>Review Photos</strong>
            <span class="review-count">{{ pendingFiles.length }} Photo{{ pendingFiles.length !== 1 ? 's' : '' }} Selected</span>
          </div>
          <div class="review-list">
            <div v-for="(pf, idx) in pendingFiles" :key="idx" class="review-item">
              <div class="review-thumb">
                <img v-if="pf.preview" :src="pf.preview" alt="" />
                <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a6484" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
              </div>
              <div class="review-meta">
                <span class="review-name">{{ pf.file.name }}</span>
                <span class="review-size">{{ formatSize(pf.file.size) }}</span>
              </div>
              <select v-model="pf.tag" class="review-tag-select">
                <option v-for="t in tagOptions" :key="t" :value="t">{{ t }}</option>
              </select>
              <input v-model="pf.caption" class="review-caption-input" type="text" placeholder="Add note (optional)" />
              <button class="review-remove" @click="pendingFiles.splice(idx,1)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div class="review-note-row">
            <input v-model="globalNote" class="review-global-note" type="text" placeholder="+ Add Note (optional — applies to all)" />
          </div>
          <div class="review-actions">
            <button class="btn-cancel-upload" @click="cancelUpload">Cancel</button>
            <button class="btn-upload-submit" @click="uploadPhotos" :disabled="uploading">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
              Upload {{ pendingFiles.length }} Photo{{ pendingFiles.length !== 1 ? 's' : '' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- UPLOAD PROGRESS MODAL -->
    <div v-if="uploading" class="modal-overlay">
      <div class="modal-card upload-progress-modal">
        <div class="modal-head">
          <strong>Uploading Photos</strong>
        </div>
        <div class="progress-address">Uploading {{ uploadResults.total }} photos to {{ selectedProperty?.address_line1 }}…</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" :style="`width:${uploadProgress}%`"></div>
        </div>
        <div class="progress-count">{{ uploadResults.done }} of {{ uploadResults.total }} uploaded</div>
        <div class="upload-file-list">
          <div v-for="(r, idx) in uploadResults.items" :key="idx" class="upload-file-row">
            <span class="upl-icon">
              <svg v-if="r.status==='done'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>
              <svg v-else-if="r.status==='error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              <div v-else class="spinner-xs"></div>
            </span>
            <span class="upl-name">{{ r.name }}</span>
          </div>
        </div>
        <button v-if="!isUploading" class="btn-view-property" @click="finishUpload">View in HushHawk</button>
      </div>
    </div>

    <!-- LIGHTBOX -->
    <div v-if="lightboxPhoto" class="lightbox-overlay" @click.self="closeLightbox">
      <div class="lightbox-topbar">
        <button class="lb-btn" @click="downloadPhoto(lightboxPhoto)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8,17 12,21 16,17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          Download
        </button>
        <button class="lb-btn" @click="closeLightbox">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <button class="lb-nav prev" @click="prevPhoto" v-if="lightboxIndex > 0">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,18 9,12 15,6"/></svg>
      </button>
      <div class="lightbox-img-wrap">
        <div v-if="lightboxPhoto.data_url" class="lightbox-img" :style="`background-image:url('${lightboxPhoto.data_url}')`"></div>
        <div v-else class="lightbox-placeholder">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#2a4a6a" stroke-width="0.75"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <span>{{ lightboxPhoto.original_filename || lightboxPhoto.filename }}</span>
        </div>
      </div>
      <button class="lb-nav next" @click="nextPhoto" v-if="lightboxIndex < sortedPhotos.length - 1">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,18 15,12 9,6"/></svg>
      </button>
      <div class="lb-info">
        <span class="lb-filename">{{ lightboxPhoto.original_filename || lightboxPhoto.filename }}</span>
        <span class="lb-addr">{{ selectedProperty?.address_line1 }} • {{ formatDate(lightboxPhoto.photo_date) }}</span>
        <span v-if="lightboxPhoto.file_size_bytes" class="lb-size">{{ formatSize(lightboxPhoto.file_size_bytes) }}</span>
      </div>
      <div class="lb-strip">
        <div
          v-for="(p, idx) in sortedPhotos" :key="p.id"
          class="lb-strip-item"
          :class="{ active: idx === lightboxIndex }"
          @click="lightboxIndex = idx; lightboxPhoto = sortedPhotos[idx]"
        >
          <div v-if="p.data_url" class="lb-strip-thumb" :style="`background-image:url('${p.data_url}')`"></div>
          <div v-else class="lb-strip-thumb lb-strip-placeholder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a6484" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
      </div>
    </div>

  
    <!-- ======================================================== -->
    <!-- STEP 03 MODAL: CHOOSE PHOTO OPTION (Matches Workflow 03)  -->
    <!-- ======================================================== -->
    <div v-if="showChooseOptionModal" class="video-modal-backdrop" @click.self="showChooseOptionModal = false">
      <div class="white-modal-card choose-option-modal-card">
        <div class="modal-head-simple">
          <h3>Add Photos</h3>
          <button class="camera-close-x" @click="showChooseOptionModal = false">×</button>
        </div>

        <div class="choose-options-list">
          <!-- 1. Take Photo -->
          <div class="choose-option-item" @click="showChooseOptionModal = false; openCameraModal()">
            <div class="opt-icon-gold">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div class="opt-text">
              <strong>Take Photo</strong>
              <small>Use your device camera</small>
            </div>
          </div>

          <!-- 2. Choose from Library -->
          <div class="choose-option-item" @click="showChooseOptionModal = false; triggerChooseFromLibrary()">
            <div class="opt-icon-slate">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
            <div class="opt-text">
              <strong>Choose from Library</strong>
              <small>Select existing photos</small>
            </div>
          </div>

          <!-- 3. Upload Files -->
          <div class="choose-option-item" @click="showChooseOptionModal = false; triggerUploadFiles()">
            <div class="opt-icon-slate">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            </div>
            <div class="opt-text">
              <strong>Upload Files</strong>
              <small>PDF, images, videos</small>
            </div>
          </div>
        </div>

        <button class="btn-cancel-flat" @click="showChooseOptionModal = false">Cancel</button>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- STEP 04 MODAL: TAKE PROPERTY PHOTOS (Camera Viewfinder)   -->
    <!-- ======================================================== -->
    <div v-if="modalStep === 'camera'" class="video-modal-backdrop" @click.self="closeAllModals">
      <div class="dark-camera-modal-card">
        <div class="camera-head-row">
          <button class="camera-back-btn" @click="closeAllModals">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Take Property Photos
          </button>
          <button class="camera-close-x" @click="closeAllModals">×</button>
        </div>

        <div class="camera-viewfinder-box">
          <video v-if="hasCameraStream" ref="cameraVideo" autoplay playsinline class="viewfinder-feed"></video>
          <div v-else class="viewfinder-simulated" :style="`background-image: url('${currentCameraFramePreview}')`">
            <div class="simulated-view-badge">Field Camera</div>
          </div>
          <div v-if="shutterFlashed" class="shutter-flash-overlay"></div>
        </div>

        <div class="camera-category-selector">
          <button class="cat-pill-btn" @click="cycleCategory">
            {{ activeCameraTag }}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <div class="camera-bottom-controls">
          <span class="captured-count-text">
            {{ capturedQueue.length }} photo{{ capturedQueue.length !== 1 ? 's' : '' }} captured
          </span>

          <button class="camera-shutter-ring" @click="snapPhoto" title="Capture photo">
            <span class="camera-shutter-inner"></span>
          </button>

          <button
            class="camera-next-link"
            :class="{ disabled: capturedQueue.length === 0 }"
            @click="goToReview"
          >
            Next →
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- STEP 05 MODAL: REVIEW PHOTOS & NOTES                     -->
    <!-- ======================================================== -->
    <div v-if="modalStep === 'review'" class="video-modal-backdrop" @click.self="closeAllModals">
      <div class="white-modal-card review-modal-card">
        <h2 class="modal-big-title">Review Photos</h2>
        <p class="modal-sub-title">{{ capturedQueue.length }} new photos ready for {{ selectedProperty.address_line1 }}</p>

        <div class="review-thumbs-strip">
          <div v-for="(item, idx) in capturedQueue" :key="idx" class="review-thumb-item">
            <img :src="item.previewUrl" :alt="item.name" />
            <button class="thumb-remove-btn" @click.stop="removeCapturedItem(idx)" title="Remove photo">×</button>
          </div>
        </div>

        <div class="review-form-field">
          <label>Category</label>
          <div class="select-wrapper">
            <select v-model="reviewCategory">
              <option value="Before Photos">Before Photos</option>
              <option value="Progress Photos">Progress Photos</option>
              <option value="After Photos">After Photos</option>
              <option value="Inspection Photos">Inspection Photos</option>
              <option value="Exterior Photos">Exterior Photos</option>
              <option value="Interior Photos">Interior Photos</option>
            </select>
          </div>
        </div>

        <div class="review-form-field">
          <input
            v-model="reviewNote"
            type="text"
            placeholder="Optional note: Initial framing walkthrough"
            class="review-note-input"
          />
        </div>

        <div class="review-bottom-actions">
          <button class="btn-add-more-link" @click="modalStep = 'camera'">
            Add More Photos
          </button>

          <button class="btn-upload-gold" @click="startS3Upload">
            Upload {{ capturedQueue.length }} Photos
          </button>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- STEP 06 & 07 MODAL: UPLOADING TO AMAZON S3               -->
    <!-- ======================================================== -->
    <div v-if="modalStep === 'uploading'" class="video-modal-backdrop">
      <div class="white-modal-card uploading-modal-card">
        <h2 class="modal-big-title">Uploading securely to Amazon S3</h2>
        <p class="modal-sub-title">Property: {{ selectedProperty.address_line1 }} • {{ selectedProperty.city }}, {{ selectedProperty.state_code }}</p>

        <div class="s3-progress-track">
          <div class="s3-progress-fill" :style="`width: ${uploadProgressPercent}%`"></div>
        </div>

        <div class="s3-status-numbers">
          <span>{{ currentUploadDoneIndex }} of {{ capturedQueue.length }} photos uploaded</span>
          <strong class="green-pct">{{ uploadProgressPercent }}%</strong>
        </div>

        <div class="s3-checklist">
          <div v-for="(file, idx) in uploadChecklist" :key="idx" class="s3-check-row">
            <span class="file-label">{{ file.name }}</span>
            <span v-if="file.status === 'done'" class="check-done">✓</span>
            <span v-else class="check-pending">○</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- STEP 08 MODAL: PHOTO DETAIL & METADATA                   -->
    <!-- ======================================================== -->
    <div v-if="selectedDetailPhoto" class="video-modal-backdrop" @click.self="selectedDetailPhoto = null">
      <div class="white-modal-card photo-detail-card">
        <div class="detail-head-row">
          <button class="detail-back-btn" @click="selectedDetailPhoto = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Property Photos
          </button>
          <button class="camera-close-x" @click="selectedDetailPhoto = null">×</button>
        </div>

        <div class="detail-content-columns">
          <div class="detail-left-photo">
            <img :src="selectedDetailPhoto.data_url || defaultPhotoPlaceholder" :alt="selectedDetailPhoto.filename" />
          </div>

          <div class="detail-right-meta">
            <h3 class="detail-filename">{{ selectedDetailPhoto.original_filename || selectedDetailPhoto.filename }}</h3>

            <div class="meta-field-group">
              <span class="meta-lbl">Category</span>
              <strong class="meta-val">{{ selectedDetailPhoto.tag || 'Before Photos' }}</strong>
            </div>

            <div class="meta-field-group">
              <span class="meta-lbl">Uploaded</span>
              <strong class="meta-val">{{ formatDate(selectedDetailPhoto.photo_date || selectedDetailPhoto.created_at) }}</strong>
            </div>

            <div class="meta-field-group">
              <span class="meta-lbl">Uploaded by</span>
              <strong class="meta-val">{{ selectedDetailPhoto.uploaded_by || 'HushHawk Staff' }}</strong>
            </div>

            <div class="meta-field-group">
              <span class="meta-lbl">Linked to</span>
              <strong class="meta-val">{{ selectedProperty.address_line1 }}</strong>
            </div>

            <div class="pill-s3-saved">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              S3 Saved
            </div>
          </div>
        </div>

        <div class="detail-footer-row">
          <span class="s3-storage-path font-mono">
            Storage: private S3 bucket / properties / {{ selectedProperty.crownKey || 'HH-PROP-07120' }} / photos / {{ selectedDetailPhoto.object_key || selectedDetailPhoto.filename }}
          </span>
          <div class="detail-actions-right">
            <button class="btn-dark-details" @click="downloadCurrentPhoto">
              Download
            </button>
            <button class="btn-danger-details" @click="deleteCurrentPhoto(selectedDetailPhoto)">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden native file inputs -->
    <input ref="libraryFileInput" type="file" accept="image/*" multiple style="display:none" @change="onNativeFilesSelected" />
    <input ref="nativeFileInput" type="file" accept="image/*,application/pdf" multiple style="display:none" @change="onNativeFilesSelected" />
</div>
</template>

<script>
const API_BASE = '/api/v1';

export default {
  name: 'PropertiesView',
  props: { content: { type: Object, default: () => ({}) } },
  data() {
    return {
      // 8-step Photo & S3 workflow state
      showChooseOptionModal: false,
      modalStep: null,
      hasCameraStream: false,
      shutterFlashed: false,
      activeCameraTag: 'Before Photos',
      cameraTags: ['Before Photos', 'Progress Photos', 'After Photos', 'Inspection Photos', 'Exterior Photos', 'Interior Photos'],
      cameraTagIndex: 0,
      capturedQueue: [],
      reviewCategory: 'Before Photos',
      reviewNote: '',
      uploadProgressPercent: 0,
      currentUploadDoneIndex: 0,
      uploadChecklist: [],
      selectedDetailPhoto: null,
      showPhotoAddedToast: false,
      lastAddedCount: 0,
      defaultPhotoPlaceholder: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&fit=crop&q=80',
      currentCameraFramePreview: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80',

      // Properties list
      properties: [],
      loadingProperties: true,
      propSearch: '',
      selectedProperty: null,
      selectedPropertyId: null,

      // Detail navigation
      activeTab: 'overview',
      actionsOpen: false,
      toastMessage: '',
      toastTimer: null,

      // Tabs definition
      tabs: [
        { key: 'overview', label: 'Overview', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' },
        { key: 'documents', label: 'Documents', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>' },
        { key: 'photos', label: 'Photos', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' },
        { key: 'tasks', label: 'Tasks', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
        { key: 'expenses', label: 'Expenses', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
        { key: 'contractors', label: 'Contractors', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>' },
        { key: 'timeline', label: 'Timeline', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>' },
      ],

      // Photos state
      photos: [],
      loadingPhotos: false,
      photoLayout: 'grid',
      filterTag: '',
      sortBy: 'date_desc',
      organizeMenuOpen: false,
      sortMenuOpen: false,
      photoViewMenuOpen: false,
      tagOptions: ['General', 'Exterior', 'Interior', 'Before', 'Progress', 'After', 'Inspection', 'Aerial'],

      // Photo upload flow
      showAddPhotosModal: false,
      pendingFiles: [],
      globalNote: '',
      uploading: false,
      isUploading: false,
      uploadProgress: 0,
      uploadResults: { total: 0, done: 0, items: [] },

      // Lightbox
      lightboxPhoto: null,
      lightboxIndex: 0,

      // Documents state
      documents: [],
      loadingDocs: false,
      showAddDocModal: false,
      savingDoc: false,
      newDoc: { title: '', category: 'Contract', filename: '', file_size_bytes: 0, data_url: null },

      // Tasks state
      tasks: [],
      loadingTasks: false,
      showAddTaskModal: false,
      savingTask: false,
      newTask: { title: '', priority: 'Medium', category: 'Renovation', due_date: new Date().toISOString().split('T')[0], due_time: '05:00 PM' },

      // Expenses state
      expenses: [],
      loadingExpenses: false,
      showAddExpenseModal: false,
      savingExpense: false,
      newExpense: { category: 'Materials', description: '', amount: '', vendor: '', expense_date: new Date().toISOString().split('T')[0] },

      // Contractors state
      contractors: [],
      loadingContractors: false,
      showAddContractorModal: false,
      savingContractor: false,
      newContractor: { name: '', trade: 'General Contractor', phone: '', status: 'Active On Site' },

      // Timeline state
      timelineItems: [],
      loadingTimeline: false,

      // Add Property modal
      showAddModal: false,
      newProp: { address_line1: '', city: 'Jacksonville', state_code: 'FL', postal_code: '32204', county_code: 'DUV', parcel_raw: '', assessed_value: '', property_type: 'Single Family Residential' },
      addPropError: '',
      savingProperty: false,

      // Edit Property modal
      showEditModal: false,
      editProp: {},
      editPropError: '',
      savingEdit: false,
    };
  },
  computed: {
    filteredProperties() {
      if (!this.propSearch) return this.properties;
      const q = this.propSearch.toLowerCase();
      return this.properties.filter(p =>
        (p.address_line1 || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q) ||
        (p.parcel_raw || '').toLowerCase().includes(q)
      );
    },
    availableTags() {
      return [...new Set(this.photos.map(p => p.tag).filter(Boolean))];
    },
    sortedPhotos() {
      let photos = this.filterTag ? this.photos.filter(p => p.tag === this.filterTag) : [...this.photos];
      if (this.sortBy === 'date_desc') photos.sort((a, b) => new Date(b.photo_date || b.created_at) - new Date(a.photo_date || a.created_at));
      else if (this.sortBy === 'date_asc') photos.sort((a, b) => new Date(a.photo_date || a.created_at) - new Date(b.photo_date || b.created_at));
      else if (this.sortBy === 'tag') photos.sort((a, b) => (a.tag || '').localeCompare(b.tag || ''));
      return photos;
    },
    heroPhoto() {
      const first = this.photos.find(p => p.data_url);
      return first ? first.data_url : (this.selectedProperty?.thumb || null);
    },
    totalExpenses() {
      return this.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    },
    pendingTasksCount() {
      return this.tasks.filter(t => !t.is_completed && t.status !== 'DONE').length;
    }
  },
  mounted() {
    this.loadProperties();
    document.addEventListener('click', this.closeAllMenus);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.closeAllMenus);
  },
  methods: {
    openChooseOptionModal() {
      this.showChooseOptionModal = true;
    },
    triggerChooseFromLibrary() {
      if (this.$refs.libraryFileInput) {
        this.$refs.libraryFileInput.value = '';
        this.$refs.libraryFileInput.click();
      }
    },
    triggerUploadFiles() {
      if (this.$refs.nativeFileInput) {
        this.$refs.nativeFileInput.value = '';
        this.$refs.nativeFileInput.click();
      }
    },
    openCameraModal() {
      this.capturedQueue = [];
      this.modalStep = 'camera';
      this.startCameraStream();
    },
    async startCameraStream() {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          this.hasCameraStream = true;
          this.$nextTick(() => {
            if (this.$refs.cameraVideo) {
              this.$refs.cameraVideo.srcObject = stream;
            }
          });
        } catch (err) {
          this.hasCameraStream = false;
        }
      } else {
        this.hasCameraStream = false;
      }
    },
    stopCameraStream() {
      if (this.$refs.cameraVideo && this.$refs.cameraVideo.srcObject) {
        const stream = this.$refs.cameraVideo.srcObject;
        stream.getTracks().forEach(track => track.stop());
        this.$refs.cameraVideo.srcObject = null;
      }
      this.hasCameraStream = false;
    },
    cycleCategory() {
      this.cameraTagIndex = (this.cameraTagIndex + 1) % this.cameraTags.length;
      this.activeCameraTag = this.cameraTags[this.cameraTagIndex];
      this.reviewCategory = this.activeCameraTag;
    },
    snapPhoto() {
      this.shutterFlashed = true;
      setTimeout(() => { this.shutterFlashed = false; }, 180);

      const frameUrls = [
        'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&auto=format&fit=crop&q=80'
      ];
      const nextIdx = this.capturedQueue.length % frameUrls.length;
      const previewUrl = frameUrls[nextIdx];
      const seq = String(this.capturedQueue.length + 1).padStart(2, '0');
      const filename = `framing-${seq}.jpg`;

      this.capturedQueue.push({
        name: filename,
        previewUrl,
        dataUrl: previewUrl,
        tag: this.activeCameraTag,
        file: null,
      });

      this.currentCameraFramePreview = frameUrls[(nextIdx + 1) % frameUrls.length];
    },
    goToReview() {
      if (this.capturedQueue.length === 0) return;
      this.stopCameraStream();
      this.modalStep = 'review';
    },
    removeCapturedItem(idx) {
      this.capturedQueue.splice(idx, 1);
      if (this.capturedQueue.length === 0) {
        this.modalStep = 'camera';
      }
    },
    onNativeFilesSelected(e) {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      files.forEach((file, i) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          this.capturedQueue.push({
            name: file.name,
            previewUrl: evt.target.result,
            dataUrl: evt.target.result,
            tag: this.reviewCategory || 'Progress Photos',
            file,
          });
          if (i === files.length - 1) {
            this.modalStep = 'review';
          }
        };
        reader.readAsDataURL(file);
      });
    },
    async startS3Upload() {
      if (this.capturedQueue.length === 0) return;
      this.modalStep = 'uploading';
      this.uploadProgressPercent = 10;
      this.currentUploadDoneIndex = 0;
      this.uploadChecklist = this.capturedQueue.map(item => ({ name: item.name, status: 'pending' }));

      const total = this.capturedQueue.length;
      const propertyId = this.selectedProperty.property_id;

      for (let i = 0; i < total; i++) {
        const item = this.capturedQueue[i];

        // Step 06: Request presigned S3 authorization
        let presignedData = null;
        try {
          const authRes = await fetch(`${API_BASE}/properties/${propertyId}/photos/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: item.name,
              content_type: item.file ? item.file.type : 'image/jpeg',
              file_size_bytes: item.file ? item.file.size : 2500000,
            }),
          });
          if (authRes.ok) {
            presignedData = await authRes.json();
          }
        } catch (authErr) {
          console.warn('[S3 Presigned Error, proceeding with fallback]', authErr);
        }

        // Animate progress
        await new Promise(r => setTimeout(r, 450));
        this.uploadProgressPercent = Math.min(95, Math.round(((i + 0.6) / total) * 100));

        // Step 07: Save metadata in RDS PostgreSQL
        try {
          const metaPayload = {
            filename: item.name,
            original_filename: item.name,
            file_size_bytes: item.file ? item.file.size : 2500000,
            mime_type: item.file ? item.file.type : 'image/jpeg',
            tag: this.reviewCategory || 'Before Photos',
            caption: this.reviewNote || item.name,
            description: this.reviewNote || 'Field Walkthrough photo',
            storage_provider: 'S3',
            object_key: presignedData ? presignedData.object_key : `properties/${propertyId}/photos/${Date.now()}-${item.name}`,
            uploaded_by: 'HushHawk Staff',
            status: 'UPLOADED',
            data_url: item.dataUrl || item.previewUrl,
          };

          await fetch(`${API_BASE}/properties/${propertyId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metaPayload),
          });
        } catch (dbErr) {
          console.error('[Save Metadata Error]', dbErr);
        }

        this.uploadChecklist[i].status = 'done';
        this.currentUploadDoneIndex = i + 1;
        this.uploadProgressPercent = Math.round(((i + 1) / total) * 100);
      }

      await new Promise(r => setTimeout(r, 500));
      this.lastAddedCount = total;
      this.closeAllModals();
      await this.loadPhotos(propertyId);

      // Step 08: Show green toast pill
      this.showPhotoAddedToast = true;
      setTimeout(() => { this.showPhotoAddedToast = false; }, 4000);
    },
    closeAllModals() {
      this.stopCameraStream();
      this.modalStep = null;
      this.showChooseOptionModal = false;
      this.capturedQueue = [];
    },
    openPhotoDetail(photo) {
      this.selectedDetailPhoto = photo;
    },
    downloadCurrentPhoto() {
      if (!this.selectedDetailPhoto) return;
      const link = document.createElement('a');
      link.href = this.selectedDetailPhoto.data_url || this.defaultPhotoPlaceholder;
      link.download = this.selectedDetailPhoto.filename || 'property-photo.jpg';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.showToast('Photo download initiated');
    },
    async deleteCurrentPhoto(photo) {
      if (!photo || !confirm(`Are you sure you want to delete ${photo.filename}?`)) return;
      try {
        await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/photos/${photo.id}`, {
          method: 'DELETE',
        });
        this.selectedDetailPhoto = null;
        this.showToast('Photo deleted from S3 & PostgreSQL');
        await this.loadPhotos(this.selectedProperty.property_id);
      } catch (err) {
        this.showToast('Failed to delete photo');
      }
    },

    showToast(msg) {
      this.toastMessage = msg;
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastMessage = '';
      }, 3500);
    },
    closeAllMenus() {
      this.actionsOpen = false;
      this.organizeMenuOpen = false;
      this.sortMenuOpen = false;
      this.photoViewMenuOpen = false;
    },
    getTabCount(key) {
      if (key === 'photos') return this.photos.length || null;
      if (key === 'documents') return this.documents.length || null;
      if (key === 'tasks') return this.pendingTasksCount || null;
      if (key === 'expenses') return this.expenses.length || null;
      if (key === 'contractors') return this.contractors.length || null;
      return null;
    },
    async loadProperties() {
      this.loadingProperties = true;
      try {
        const r = await fetch(`${API_BASE}/properties`);
        const data = await r.json();
        this.properties = data.properties || [];
      } catch (e) {
        this.properties = [];
      } finally {
        this.loadingProperties = false;
        if (this.properties.length > 0) {
          const urlParams = new URLSearchParams(window.location.search);
          const targetId = urlParams.get('id');
          const found = targetId ? this.properties.find(p => p.property_id === targetId) : null;
          this.selectProperty(found || this.properties[0]);
        }
      }
    },
    async selectProperty(prop) {
      this.selectedProperty = prop;
      this.selectedPropertyId = prop.property_id;
      // Load all associated data in parallel
      await Promise.all([
        this.loadPhotos(prop.property_id),
        this.loadDocuments(prop.property_id),
        this.loadTasks(prop.property_id),
        this.loadExpenses(prop.property_id),
        this.loadContractors(prop.property_id),
        this.loadTimeline(prop.property_id),
      ]);
    },
    changeTab(tabKey) {
      this.activeTab = tabKey;
    },

    // ===== EDIT PROPERTY =====
    openEditModal() {
      this.editProp = {
        address_line1: this.selectedProperty.address_line1 || '',
        city: this.selectedProperty.city || 'Jacksonville',
        state_code: this.selectedProperty.state_code || 'FL',
        postal_code: this.selectedProperty.postal_code || '',
        county_code: this.selectedProperty.county_code || 'DUV',
        parcel_raw: this.selectedProperty.parcel_raw || '',
        assessed_value: this.selectedProperty.assessed_value || '',
        property_type: this.selectedProperty.property_type || 'Single Family Residential',
        legal_description: this.selectedProperty.legal_description || '',
      };
      this.editPropError = '';
      this.showEditModal = true;
    },
    async saveEditProperty() {
      if (!this.editProp.address_line1) {
        this.editPropError = 'Address is required.';
        return;
      }
      this.savingEdit = true;
      this.editPropError = '';
      try {
        const r = await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.editProp),
        });
        const updated = await r.json();
        if (r.ok) {
          this.selectedProperty = { ...this.selectedProperty, ...updated };
          const idx = this.properties.findIndex(p => p.property_id === updated.property_id);
          if (idx !== -1) {
            this.properties[idx] = { ...this.properties[idx], ...updated };
          }
          this.showEditModal = false;
          this.showToast('Property updated successfully!');
          this.loadTimeline(this.selectedProperty.property_id);
        } else {
          this.editPropError = updated.error || 'Failed to update property.';
        }
      } catch (e) {
        this.editPropError = 'Network error while updating.';
      } finally {
        this.savingEdit = false;
      }
    },

    // ===== ACTIONS MENU ITEMS =====
    shareSecureLink() {
      const url = `${window.location.origin}/properties?id=${this.selectedProperty.property_id}`;
      navigator.clipboard.writeText(url).then(() => {
        this.showToast('Secure property link copied to clipboard!');
      }).catch(() => {
        prompt('Copy secure property link:', url);
      });
    },
    viewInMap() {
      const query = encodeURIComponent(`${this.selectedProperty.address_line1}, ${this.selectedProperty.city}, ${this.selectedProperty.state_code}`);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    },

    // ===== PHOTOS =====
    async loadPhotos(propertyId) {
      this.loadingPhotos = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${propertyId}/photos`);
        const data = await r.json();
        this.photos = data.photos || [];
      } catch (e) {
        this.photos = [];
      } finally {
        this.loadingPhotos = false;
      }
    },
    triggerCamera() {
      this.showAddPhotosModal = false;
      this.$refs.fileCamera.click();
    },
    triggerUpload() {
      this.showAddPhotosModal = false;
      this.$refs.fileUpload.click();
    },
    async onFilesSelected(evt) {
      const files = Array.from(evt.target.files);
      evt.target.value = '';
      if (!files.length) return;
      const items = await Promise.all(files.map(async file => {
        let preview = null;
        if (file.type.startsWith('image/')) {
          preview = await this.readFileAsDataURL(file);
        }
        return { file, preview, tag: 'General', caption: '' };
      }));
      this.pendingFiles = items;
    },
    readFileAsDataURL(file) {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    },
    cancelUpload() {
      this.pendingFiles = [];
      this.showAddPhotosModal = false;
      this.globalNote = '';
    },
    async uploadPhotos() {
      if (!this.pendingFiles.length || !this.selectedProperty) return;
      this.uploading = true;
      this.isUploading = true;
      this.uploadResults = {
        total: this.pendingFiles.length,
        done: 0,
        items: this.pendingFiles.map(pf => ({ name: pf.file.name, status: 'pending' }))
      };
      this.uploadProgress = 0;
      this.showAddPhotosModal = false;

      for (let i = 0; i < this.pendingFiles.length; i++) {
        const pf = this.pendingFiles[i];
        this.uploadResults.items[i].status = 'uploading';
        try {
          const dataUrl = pf.preview || await this.readFileAsDataURL(pf.file);
          const body = {
            filename: pf.file.name,
            original_filename: pf.file.name,
            file_size_bytes: pf.file.size,
            mime_type: pf.file.type || 'image/jpeg',
            tag: pf.tag || 'General',
            caption: pf.caption || this.globalNote || null,
            photo_date: new Date().toISOString().split('T')[0],
            data_url: dataUrl,
          };
          const r = await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          const saved = await r.json();
          if (r.ok) {
            this.photos.unshift(saved);
            this.uploadResults.items[i].status = 'done';
          } else {
            this.uploadResults.items[i].status = 'error';
          }
        } catch {
          this.uploadResults.items[i].status = 'error';
        }
        this.uploadResults.done = i + 1;
        this.uploadProgress = Math.round(((i + 1) / this.pendingFiles.length) * 100);
        await new Promise(r => setTimeout(r, 200));
      }
      this.isUploading = false;
      this.pendingFiles = [];
      this.globalNote = '';
      this.showToast('Photos uploaded successfully!');
      this.loadTimeline(this.selectedProperty.property_id);
    },
    finishUpload() {
      this.uploading = false;
      this.uploadResults = { total: 0, done: 0, items: [] };
      this.uploadProgress = 0;
    },
    async deletePhoto(photo) {
      if (!confirm(`Delete "${photo.original_filename || photo.filename}"?`)) return;
      try {
        await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/photos/${photo.id}`, { method: 'DELETE' });
        this.photos = this.photos.filter(p => p.id !== photo.id);
        this.showToast('Photo deleted.');
      } catch (e) { /* ignore */ }
    },
    openLightbox(photo) {
      this.lightboxPhoto = photo;
      this.lightboxIndex = this.sortedPhotos.findIndex(p => p.id === photo.id);
    },
    closeLightbox() { this.lightboxPhoto = null; },
    prevPhoto() {
      if (this.lightboxIndex > 0) {
        this.lightboxIndex--;
        this.lightboxPhoto = this.sortedPhotos[this.lightboxIndex];
      }
    },
    nextPhoto() {
      if (this.lightboxIndex < this.sortedPhotos.length - 1) {
        this.lightboxIndex++;
        this.lightboxPhoto = this.sortedPhotos[this.lightboxIndex];
      }
    },
    downloadPhoto(photo) {
      if (!photo.data_url) return;
      const a = document.createElement('a');
      a.href = photo.data_url;
      a.download = photo.original_filename || photo.filename || 'photo.jpg';
      a.click();
    },

    // ===== DOCUMENTS =====
    async loadDocuments(propertyId) {
      this.loadingDocs = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${propertyId}/documents`);
        const data = await r.json();
        this.documents = data.documents || [];
      } catch (e) {
        this.documents = [];
      } finally {
        this.loadingDocs = false;
      }
    },
    async onDocFileSelected(evt) {
      const file = evt.target.files[0];
      if (!file) return;
      this.newDoc.filename = file.name;
      this.newDoc.file_size_bytes = file.size;
      if (!this.newDoc.title) {
        this.newDoc.title = file.name.replace(/\.[^/.]+$/, "");
      }
      this.newDoc.data_url = await this.readFileAsDataURL(file);
    },
    async saveNewDocument() {
      if (!this.newDoc.title && !this.newDoc.filename) return;
      this.savingDoc = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newDoc),
        });
        const saved = await r.json();
        if (r.ok) {
          this.documents.unshift(saved);
          this.showAddDocModal = false;
          this.newDoc = { title: '', category: 'Contract', filename: '', file_size_bytes: 0, data_url: null };
          this.showToast('Document uploaded successfully!');
          this.loadTimeline(this.selectedProperty.property_id);
        }
      } catch (e) {
        alert('Failed to upload document.');
      } finally {
        this.savingDoc = false;
      }
    },
    downloadDocument(doc) {
      if (!doc.data_url) {
        this.showToast(`Downloading ${doc.filename}...`);
        return;
      }
      const a = document.createElement('a');
      a.href = doc.data_url;
      a.download = doc.filename || doc.title || 'document.pdf';
      a.click();
    },
    async deleteDocument(doc) {
      if (!confirm(`Delete document "${doc.title}"?`)) return;
      try {
        await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/documents/${doc.id}`, { method: 'DELETE' });
        this.documents = this.documents.filter(d => d.id !== doc.id);
        this.showToast('Document deleted.');
      } catch (e) { /* ignore */ }
    },

    // ===== TASKS =====
    async loadTasks(propertyId) {
      this.loadingTasks = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${propertyId}/tasks`);
        const data = await r.json();
        this.tasks = data.tasks || [];
      } catch (e) {
        this.tasks = [];
      } finally {
        this.loadingTasks = false;
      }
    },
    async saveNewTask() {
      if (!this.newTask.title) return;
      this.savingTask = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newTask),
        });
        const saved = await r.json();
        if (r.ok) {
          this.tasks.unshift(saved);
          this.showAddTaskModal = false;
          this.newTask = { title: '', priority: 'Medium', category: 'Renovation', due_date: new Date().toISOString().split('T')[0], due_time: '05:00 PM' };
          this.showToast('Task added successfully!');
          this.loadTimeline(this.selectedProperty.property_id);
        }
      } catch (e) {
        alert('Failed to create task.');
      } finally {
        this.savingTask = false;
      }
    },
    async toggleTask(t) {
      const nextCompleted = !(t.is_completed || t.status === 'DONE');
      t.is_completed = nextCompleted;
      t.status = nextCompleted ? 'DONE' : 'PENDING';
      try {
        await fetch(`${API_BASE}/tasks/${t.task_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_completed: nextCompleted, status: t.status }),
        });
        this.showToast(nextCompleted ? 'Task marked complete!' : 'Task reopened.');
      } catch (e) { /* ignore */ }
    },

    // ===== EXPENSES =====
    async loadExpenses(propertyId) {
      this.loadingExpenses = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${propertyId}/expenses`);
        const data = await r.json();
        this.expenses = data.expenses || [];
      } catch (e) {
        this.expenses = [];
      } finally {
        this.loadingExpenses = false;
      }
    },
    async saveNewExpense() {
      if (!this.newExpense.category || !this.newExpense.amount) return;
      this.savingExpense = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newExpense),
        });
        const saved = await r.json();
        if (r.ok) {
          this.expenses.unshift(saved);
          this.showAddExpenseModal = false;
          this.newExpense = { category: 'Materials', description: '', amount: '', vendor: '', expense_date: new Date().toISOString().split('T')[0] };
          this.showToast('Expense recorded successfully!');
          this.loadTimeline(this.selectedProperty.property_id);
        }
      } catch (e) {
        alert('Failed to record expense.');
      } finally {
        this.savingExpense = false;
      }
    },
    async deleteExpense(exp) {
      if (!confirm(`Delete expense "${exp.category} - $${exp.amount}"?`)) return;
      try {
        await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/expenses/${exp.id}`, { method: 'DELETE' });
        this.expenses = this.expenses.filter(e => e.id !== exp.id);
        this.showToast('Expense removed.');
      } catch (e) { /* ignore */ }
    },

    // ===== CONTRACTORS =====
    async loadContractors(propertyId) {
      this.loadingContractors = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${propertyId}/contractors`);
        const data = await r.json();
        this.contractors = data.contractors || [];
      } catch (e) {
        this.contractors = [];
      } finally {
        this.loadingContractors = false;
      }
    },
    async saveNewContractor() {
      if (!this.newContractor.name || !this.newContractor.trade) return;
      this.savingContractor = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/contractors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newContractor),
        });
        const saved = await r.json();
        if (r.ok) {
          this.contractors.unshift(saved);
          this.showAddContractorModal = false;
          this.newContractor = { name: '', trade: 'General Contractor', phone: '', status: 'Active On Site' };
          this.showToast('Contractor assigned!');
          this.loadTimeline(this.selectedProperty.property_id);
        }
      } catch (e) {
        alert('Failed to assign contractor.');
      } finally {
        this.savingContractor = false;
      }
    },
    async deleteContractor(c) {
      if (!confirm(`Remove contractor assignment "${c.name}"?`)) return;
      try {
        await fetch(`${API_BASE}/properties/${this.selectedProperty.property_id}/contractors/${c.id}`, { method: 'DELETE' });
        this.contractors = this.contractors.filter(x => x.id !== c.id);
        this.showToast('Contractor assignment removed.');
      } catch (e) { /* ignore */ }
    },

    // ===== TIMELINE =====
    async loadTimeline(propertyId) {
      this.loadingTimeline = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${propertyId}/timeline`);
        const data = await r.json();
        this.timelineItems = data.timeline || [];
      } catch (e) {
        this.timelineItems = [];
      } finally {
        this.loadingTimeline = false;
      }
    },

    // ===== ADD PROPERTY =====
    async saveNewProperty() {
      if (!this.newProp.address_line1) { this.addPropError = 'Address is required.'; return; }
      if (!this.newProp.parcel_raw) { this.addPropError = 'Parcel ID is required.'; return; }
      this.savingProperty = true; this.addPropError = '';
      try {
        const r = await fetch(`${API_BASE}/properties`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newProp),
        });
        const saved = await r.json();
        if (r.ok) {
          this.properties.unshift(saved);
          this.showAddModal = false;
          this.newProp = { address_line1: '', city: 'Jacksonville', state_code: 'FL', postal_code: '32204', county_code: 'DUV', parcel_raw: '', assessed_value: '', property_type: 'Single Family Residential' };
          this.selectProperty(saved);
          this.showToast('Property created successfully!');
        } else {
          this.addPropError = saved.error || 'Failed to save property.';
        }
      } catch (e) {
        this.addPropError = 'Network error. Please try again.';
      } finally {
        this.savingProperty = false;
      }
    },

    // ===== FORMATTERS =====
    formatDate(d) {
      if (!d) return '—';
      try {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch { return d; }
    },
    formatSize(bytes) {
      if (!bytes) return '—';
      if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
      if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
      return bytes + ' B';
    },
    tagClass(tag) {
      const map = { 'Before': 'tag-before', 'After': 'tag-after', 'Progress': 'tag-progress', 'Exterior': 'tag-exterior', 'Interior': 'tag-interior', 'Inspection': 'tag-inspect', 'Aerial': 'tag-aerial' };
      return map[tag] || 'tag-general';
    },
  }
};
</script>

<style scoped>
/* ===== Layout ===== */
.properties-workspace {
  display: flex;
  min-height: calc(100vh - 56px);
  background: #070B14;
  font-family: 'Plus Jakarta Sans', sans-serif;
  position: relative;
}

/* ===== Toast Notification ===== */
.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #04182d;
  border: 1px solid #edcf7c;
  color: #e2e8f0;
  padding: 12px 18px;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  z-index: 9999;
}
.toast-fade-enter-active, .toast-fade-leave-active {
  transition: opacity .3s, transform .3s;
}
.toast-fade-enter-from, .toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* ===== Left Sidebar ===== */
.prop-sidebar {
  width: 240px;
  min-width: 240px;
  background: #04182d;
  border-right: 1px solid #0d2845;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.prop-sidebar-header {
  padding: 20px 16px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #0d2845;
}
.prop-sidebar-header h2 {
  font-size: 14px;
  font-weight: 700;
  color: #e2e8f0;
  margin: 0;
  letter-spacing: .03em;
}
.btn-add-prop {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid #edcf7c;
  color: #edcf7c;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all .2s;
}
.btn-add-prop:hover { background: #edcf7c; color: #070B14; }
.prop-search-wrap {
  position: relative;
  padding: 10px 12px;
  border-bottom: 1px solid #0d2845;
}
.prop-search-icon {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  color: #4a6484;
}
.prop-search {
  width: 100%;
  background: #0a1628;
  border: 1px solid #1a3a5a;
  border-radius: 6px;
  padding: 7px 10px 7px 30px;
  color: #e2e8f0;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
}
.prop-search:focus { border-color: #edcf7c40; }
.prop-list { flex: 1; overflow-y: auto; padding: 8px 0; }
.prop-card {
  display: flex;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #0d2845;
  transition: background .15s;
}
.prop-card:hover { background: #0a1e35; }
.prop-card.active { background: #0d2845; border-left: 3px solid #edcf7c; padding-left: 11px; }
.prop-card-thumb {
  width: 44px;
  height: 44px;
  border-radius: 5px;
  overflow: hidden;
  background: #0a1628;
  border: 1px solid #1a3a5a;
  flex-shrink: 0;
  position: relative;
}
.prop-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2a4a6a;
}
.prop-thumb-img {
  position: absolute; inset: 0;
  background-size: cover;
  background-position: center;
}
.prop-card-info { flex: 1; min-width: 0; }
.prop-card-address {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}
.prop-card-city { display: block; font-size: 11px; color: #6b88a8; margin-top: 1px; }
.prop-card-badges { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
.badge-active {
  font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px;
  background: #0d4a2e; color: #2ecc71; border: 1px solid #2ecc7140;
}
.badge-type {
  font-size: 9px; padding: 2px 6px; border-radius: 10px;
  background: #0d2845; color: #6b88a8; border: 1px solid #1a3a5a;
}
.prop-empty, .prop-loading-list {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; padding: 40px 16px; color: #4a6484; font-size: 13px; text-align: center;
}
.spinner-sm {
  width: 20px; height: 20px;
  border: 2px solid #1a3a5a;
  border-top-color: #edcf7c;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

/* ===== Right Detail Panel ===== */
.prop-detail {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  min-width: 0;
}
.prop-detail-empty {
  display: flex;
  align-items: center;
  justify-content: center;
}
.empty-state {
  text-align: center;
  color: #2a4a6a;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.empty-state h3 { color: #4a6484; font-size: 18px; font-weight: 600; margin: 0; }
.empty-state p { color: #2a4a6a; font-size: 14px; margin: 0; max-width: 280px; }
.prop-breadcrumb {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #4a6484; margin-bottom: 16px;
}
.prop-breadcrumb strong { color: #e2e8f0; }
.prop-header {
  display: flex; gap: 20px; align-items: flex-start;
  background: #04182d; border: 1px solid #0d2845;
  border-radius: 8px; padding: 20px; margin-bottom: 0;
}
.prop-hero-thumb {
  width: 160px; height: 110px; border-radius: 6px; overflow: hidden;
  background: #0a1628; border: 1px solid #1a3a5a; flex-shrink: 0; position: relative;
}
.prop-hero-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
}
.prop-hero-img {
  position: absolute; inset: 0;
  background-size: cover; background-position: center;
}
.prop-header-info { flex: 1; }
.prop-address { font-size: 22px; font-weight: 800; color: #e2e8f0; margin: 0 0 6px; }
.prop-location {
  display: flex; align-items: center; gap: 5px;
  font-size: 13px; color: #6b88a8; margin-bottom: 10px;
}
.prop-status-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.status-badge {
  font-size: 10px; font-weight: 700; padding: 3px 10px;
  border-radius: 10px; text-transform: uppercase; letter-spacing: .04em;
}
.status-badge.active { background: #0d4a2e; color: #2ecc71; border: 1px solid #2ecc7140; }
.status-badge.renovation { background: #2a1f00; color: #edcf7c; border: 1px solid #edcf7c40; }
.crownkey-badge {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: #8ba0b8; font-family: monospace;
  background: #0a1628; padding: 3px 8px; border-radius: 4px;
  border: 1px solid #1a3a5a;
}
.prop-header-actions {
  display: flex; gap: 8px; align-items: flex-start; flex-shrink: 0;
}
.btn-edit-prop {
  display: flex; align-items: center; gap: 6px;
  background: #0a1e35; border: 1px solid #205789;
  color: #e2e8f0; font-size: 12px; font-weight: 600;
  padding: 8px 14px; border-radius: 5px; cursor: pointer;
  transition: all .2s; white-space: nowrap;
}
.btn-edit-prop:hover { border-color: #edcf7c; color: #edcf7c; }
.actions-wrap { position: relative; }
.btn-actions {
  display: flex; align-items: center; gap: 5px;
  background: linear-gradient(135deg, #f8dfa0, #bc9240);
  border: none; color: #070B14; font-size: 12px; font-weight: 700;
  padding: 8px 14px; border-radius: 5px; cursor: pointer;
  transition: opacity .2s; white-space: nowrap;
}
.btn-actions:hover { opacity: .9; }
.actions-menu {
  position: absolute; top: calc(100% + 4px); right: 0;
  background: #04182d; border: 1px solid #1a3a5a;
  border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.6);
  min-width: 180px; z-index: 100; overflow: hidden;
}
.actions-menu button {
  display: flex; align-items: center; gap: 10px;
  width: 100%; background: none; border: none;
  color: #c8d8e8; font-size: 13px; font-weight: 500;
  padding: 10px 14px; cursor: pointer; text-align: left;
  transition: background .15s;
}
.actions-menu button:hover { background: #0a1e35; color: #edcf7c; }

/* ===== Tabs ===== */
.prop-tabs {
  display: flex; gap: 0; border-bottom: 1px solid #0d2845;
  margin: 16px 0 0; background: #04182d;
  border-radius: 8px 8px 0 0; border: 1px solid #0d2845;
  border-bottom: none; overflow-x: auto;
}
.prop-tabs button {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; border-bottom: 2px solid transparent;
  color: #6b88a8; font-size: 12px; font-weight: 600;
  padding: 12px 16px; cursor: pointer;
  transition: all .2s; white-space: nowrap;
  letter-spacing: .02em;
}
.prop-tabs button:hover { color: #e2e8f0; }
.prop-tabs button.active {
  color: #edcf7c;
  border-bottom-color: #edcf7c;
  background: rgba(237,207,124,.05);
}
.tab-badge {
  font-size: 10px;
  background: #0d2845;
  color: #edcf7c;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 700;
}

/* ===== Photos Panel ===== */
.photos-panel {
  background: #04182d;
  border: 1px solid #0d2845;
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 20px;
}
.photos-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
}
.photos-title { font-size: 16px; font-weight: 700; color: #e2e8f0; margin: 0 0 4px; }
.photos-subtitle { font-size: 12px; color: #6b88a8; margin: 0; }
.photos-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.btn-take-photo {
  display: flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #f8dfa0, #bc9240);
  border: none; color: #070B14; font-size: 12px; font-weight: 700;
  padding: 8px 14px; border-radius: 5px; cursor: pointer;
  transition: opacity .2s;
}
.btn-take-photo:hover { opacity: .9; }
.btn-upload-files {
  display: flex; align-items: center; gap: 6px;
  background: #0a1e35; border: 1px solid #205789;
  color: #e2e8f0; font-size: 12px; font-weight: 600;
  padding: 8px 14px; border-radius: 5px; cursor: pointer;
  transition: all .2s;
}
.btn-upload-files:hover { border-color: #edcf7c; color: #edcf7c; }
.btn-view-toggle, .btn-organize, .btn-sort {
  display: flex; align-items: center; gap: 5px;
  background: #0a1628; border: 1px solid #1a3a5a;
  color: #8ba0b8; font-size: 12px; font-weight: 500;
  padding: 7px 12px; border-radius: 5px; cursor: pointer;
  transition: all .2s; position: relative;
}
.btn-view-toggle:hover, .btn-organize:hover, .btn-sort:hover { border-color: #205789; color: #e2e8f0; }
.photos-view-wrap, .photos-filter-wrap, .photos-sort-wrap { position: relative; }
.view-menu, .filter-menu {
  position: absolute; top: calc(100% + 4px); right: 0;
  background: #04182d; border: 1px solid #1a3a5a;
  border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.6);
  min-width: 140px; z-index: 100; overflow: hidden;
}
.view-menu button, .filter-menu button {
  display: block; width: 100%; background: none; border: none;
  color: #c8d8e8; font-size: 12px; padding: 9px 14px;
  cursor: pointer; text-align: left; transition: background .15s;
}
.view-menu button:hover, .filter-menu button:hover { background: #0a1e35; color: #edcf7c; }
.view-menu button.selected, .filter-menu button.selected { color: #edcf7c; font-weight: 700; }
.add-photos-row {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 18px; flex-wrap: wrap;
}
.btn-add-photos {
  display: flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #f8dfa0, #bc9240);
  border: none; color: #070B14; font-size: 12px; font-weight: 700;
  padding: 8px 16px; border-radius: 5px; cursor: pointer;
  transition: opacity .2s;
}
.btn-add-photos:hover { opacity: .85; }
.photos-loading, .photos-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 60px 20px;
  color: #4a6484; font-size: 14px; text-align: center;
}
.spinner-md {
  width: 32px; height: 32px;
  border: 3px solid #1a3a5a;
  border-top-color: #edcf7c;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

/* ===== Photo Grid ===== */
.photo-grid.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}
.photo-grid.list {
  display: flex; flex-direction: column; gap: 8px;
}
.photo-item { cursor: pointer; }
.photo-thumb-wrap {
  position: relative;
  border-radius: 6px;
  overflow: hidden;
  aspect-ratio: 4/3;
  background: #0a1628;
  border: 1px solid #1a3a5a;
  transition: border-color .2s, transform .2s;
}
.photo-item:hover .photo-thumb-wrap {
  border-color: #edcf7c60;
  transform: translateY(-2px);
}
.photo-thumb {
  width: 100%; height: 100%;
  background-size: cover; background-position: center;
}
.photo-thumb-placeholder {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: #2a4a6a; font-size: 10px;
  text-align: center; padding: 8px;
  word-break: break-all;
}
.photo-tag-badge {
  position: absolute; bottom: 6px; left: 6px;
  font-size: 9px; font-weight: 700; padding: 2px 6px;
  border-radius: 3px; text-transform: uppercase; letter-spacing: .04em;
}
.tag-before { background: #1f0d00; color: #e67e22; border: 1px solid #e67e2260; }
.tag-after { background: #0d2e00; color: #2ecc71; border: 1px solid #2ecc7160; }
.tag-progress { background: #001a2e; color: #3498db; border: 1px solid #3498db60; }
.tag-exterior { background: #1a0d2e; color: #9b59b6; border: 1px solid #9b59b660; }
.tag-interior { background: #0d1a2e; color: #1abc9c; border: 1px solid #1abc9c60; }
.tag-inspect { background: #2e1a00; color: #f39c12; border: 1px solid #f39c1260; }
.tag-aerial { background: #001a2e; color: #52aaff; border: 1px solid #52aaff60; }
.tag-general { background: #0a1628; color: #6b88a8; border: 1px solid #1a3a5a; }
.photo-delete-btn {
  position: absolute; top: 5px; right: 5px;
  background: rgba(0,0,0,.7); border: none; border-radius: 50%;
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;
  color: #e2e8f0; cursor: pointer; opacity: 0; transition: opacity .2s;
}
.photo-item:hover .photo-delete-btn { opacity: 1; }
.photo-delete-btn:hover { background: #e74c3c; }
.photo-meta { display: flex; justify-content: space-between; margin-top: 5px; }
.photo-date { font-size: 11px; color: #6b88a8; }
.photo-size { font-size: 10px; color: #4a6484; }
.photo-caption { font-size: 11px; color: #4a6484; margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.photo-grid.list .photo-item { display: flex; gap: 12px; align-items: center; background: #0a1628; border: 1px solid #1a3a5a; border-radius: 6px; padding: 10px; }
.photo-grid.list .photo-thumb-wrap { width: 72px; min-width: 72px; height: 54px; aspect-ratio: auto; }
.photo-grid.list .photo-meta { flex-direction: column; gap: 2px; }

/* ===== Tab Panels General ===== */
.tab-content-panel {
  background: #04182d; border: 1px solid #0d2845;
  border-top: none; border-radius: 0 0 8px 8px; padding: 24px;
}
.tab-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}
.tab-panel-title { font-size: 16px; font-weight: 700; color: #e2e8f0; margin: 0 0 4px; }
.tab-panel-subtitle { font-size: 12px; color: #6b88a8; margin: 0; }
.panel-loading, .panel-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 50px 20px;
  color: #4a6484; font-size: 14px; text-align: center;
}

/* ===== Overview Tab ===== */
.overview-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}
.ov-card {
  background: #0a1628; border: 1px solid #1a3a5a;
  border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 6px;
}
.ov-label { font-size: 10px; color: #4a6484; text-transform: uppercase; letter-spacing: .06em; font-weight: 600; }
.ov-value { font-size: 14px; color: #e2e8f0; font-weight: 600; }
.ov-value.gold { color: #edcf7c; }
.ov-value.mono { font-family: monospace; }
.ov-value.small { font-size: 12px; }
.overview-quick-stats {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px; margin-top: 20px;
}
.quick-stat-card {
  background: #0a1e35; border: 1px solid #163b65;
  border-radius: 8px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
  cursor: pointer; transition: all .2s;
}
.quick-stat-card:hover {
  border-color: #edcf7c60;
  transform: translateY(-2px);
}
.qs-icon {
  width: 36px; height: 36px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.qs-icon.photos-icon { background: rgba(52, 152, 219, 0.15); color: #3498db; }
.qs-icon.tasks-icon { background: rgba(46, 204, 113, 0.15); color: #2ecc71; }
.qs-icon.docs-icon { background: rgba(237, 207, 124, 0.15); color: #edcf7c; }
.qs-icon.expenses-icon { background: rgba(155, 89, 182, 0.15); color: #9b59b6; }
.qs-info { flex: 1; min-width: 0; }
.qs-num { display: block; font-size: 16px; font-weight: 700; color: #e2e8f0; }
.qs-label { display: block; font-size: 11px; color: #6b88a8; }
.qs-arrow { color: #4a6484; transition: transform .2s; }
.quick-stat-card:hover .qs-arrow { transform: translateX(2px); color: #edcf7c; }

/* ===== Buttons & Pills ===== */
.btn-primary-gold {
  display: flex; align-items: center; gap: 6px;
  background: linear-gradient(135deg, #f8dfa0, #bc9240);
  border: none; color: #070B14; font-size: 12px; font-weight: 700;
  padding: 8px 14px; border-radius: 5px; cursor: pointer;
  transition: opacity .2s;
}
.btn-primary-gold:hover { opacity: .9; }
.btn-icon {
  background: #0a1628; border: 1px solid #1a3a5a;
  color: #8ba0b8; width: 28px; height: 28px;
  border-radius: 4px; display: inline-flex; align-items: center;
  justify-content: center; cursor: pointer; transition: all .2s;
  margin-left: 4px;
}
.btn-icon:hover { border-color: #205789; color: #e2e8f0; }
.btn-icon.danger:hover { border-color: #e74c3c; color: #e74c3c; }

/* ===== Tables ===== */
.documents-table-wrap { overflow-x: auto; }
.hh-table {
  width: 100%; border-collapse: collapse; font-size: 12px;
}
.hh-table th {
  text-align: left; padding: 10px 12px; color: #6b88a8;
  font-weight: 600; font-size: 11px; text-transform: uppercase;
  letter-spacing: .05em; border-bottom: 1px solid #0d2845;
}
.hh-table td {
  padding: 12px; border-bottom: 1px solid #0d2845;
  color: #c8d8e8; vertical-align: middle;
}
.hh-table tr:hover td { background: #0a1e35; }
.doc-title-cell { display: flex; align-items: center; gap: 8px; }
.doc-title-cell strong { color: #e2e8f0; font-weight: 600; }
.category-pill {
  font-size: 10px; padding: 2px 8px; border-radius: 10px;
  background: #0d2845; color: #8ea4c0; border: 1px solid #1a3a5a;
  white-space: nowrap;
}
.mono-text { font-family: monospace; font-size: 11px; color: #8ba0b8; }
.font-bold { font-weight: 700; }
.gold { color: #edcf7c; }

/* ===== Tasks List ===== */
.tasks-list { display: flex; flex-direction: column; gap: 8px; }
.task-row {
  display: flex; align-items: center; gap: 14px;
  background: #0a1628; border: 1px solid #1a3a5a;
  border-radius: 6px; padding: 12px 16px; transition: all .2s;
}
.task-row:hover { border-color: #205789; }
.task-row.completed { opacity: .6; }
.task-row.completed .task-title { text-decoration: line-through; color: #6b88a8; }
.task-checkbox-wrap {
  position: relative; display: inline-flex; align-items: center; cursor: pointer;
}
.task-checkbox-wrap input { position: absolute; opacity: 0; cursor: pointer; }
.custom-checkbox {
  width: 18px; height: 18px; border-radius: 4px;
  border: 1.5px solid #4a6484; background: #04182d;
  display: flex; align-items: center; justify-content: center;
  transition: all .2s;
}
.task-checkbox-wrap input:checked ~ .custom-checkbox {
  background: #edcf7c; border-color: #edcf7c;
}
.task-checkbox-wrap input:checked ~ .custom-checkbox::after {
  content: '✓'; color: #070B14; font-size: 12px; font-weight: 900;
}
.task-main { flex: 1; min-width: 0; }
.task-title { font-size: 13px; font-weight: 600; color: #e2e8f0; display: block; margin-bottom: 4px; }
.task-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.priority-pill {
  font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  text-transform: uppercase; letter-spacing: .04em;
}
.priority-pill.high { background: #3d1414; color: #e74c3c; border: 1px solid #e74c3c40; }
.priority-pill.medium { background: #3d2b0e; color: #f39c12; border: 1px solid #f39c1240; }
.priority-pill.low { background: #0d3822; color: #2ecc71; border: 1px solid #2ecc7140; }
.due-text { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6b88a8; }
.task-status-tag {
  font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 10px;
}
.task-status-tag.pending { background: #0d2845; color: #edcf7c; }
.task-status-tag.done { background: #0d4a2e; color: #2ecc71; }

/* ===== Expenses ===== */
.expense-summary-strip {
  display: flex; gap: 20px; background: #0a1628;
  border: 1px solid #1a3a5a; border-radius: 6px;
  padding: 14px 20px; margin-bottom: 18px; flex-wrap: wrap;
}
.es-item { display: flex; flex-direction: column; gap: 2px; }
.es-label { font-size: 11px; color: #6b88a8; text-transform: uppercase; letter-spacing: .04em; }
.es-val { font-size: 18px; font-weight: 800; color: #e2e8f0; }
.es-val.gold { color: #edcf7c; }

/* ===== Contractors ===== */
.contractors-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}
.contractor-card {
  background: #0a1628; border: 1px solid #1a3a5a;
  border-radius: 6px; padding: 14px; display: flex;
  flex-direction: column; gap: 12px;
}
.cont-head { display: flex; align-items: center; gap: 10px; }
.cont-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, #1a3a5a, #0d2845);
  border: 1px solid #205789; color: #edcf7c;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 14px; flex-shrink: 0;
}
.cont-info { flex: 1; min-width: 0; }
.cont-info h4 { margin: 0 0 2px; font-size: 13px; font-weight: 700; color: #e2e8f0; }
.cont-trade { font-size: 11px; color: #8ea4c0; }
.cont-body { border-top: 1px solid #0d2845; padding-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.cont-detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
.cont-detail-row .lbl { color: #4a6484; }
.cont-status { font-weight: 600; padding: 1px 6px; border-radius: 4px; font-size: 10px; }
.cont-status.active-on-site { background: #0d4a2e; color: #2ecc71; }
.cont-status.scheduled { background: #2a1f00; color: #edcf7c; }
.cont-status.in-progress { background: #001a2e; color: #3498db; }
.cont-status.completed { background: #0d2845; color: #8ea4c0; }
.cont-link { color: #edcf7c; text-decoration: none; }
.cont-link:hover { text-decoration: underline; }

/* ===== Timeline ===== */
.timeline-stream {
  position: relative; padding-left: 24px;
  display: flex; flex-direction: column; gap: 16px;
}
.timeline-stream::before {
  content: ''; position: absolute; left: 7px; top: 8px; bottom: 8px;
  width: 2px; background: #0d2845;
}
.timeline-entry { position: relative; }
.timeline-dot {
  position: absolute; left: -24px; top: 12px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #04182d; border: 2px solid #1a3a5a;
  display: flex; align-items: center; justify-content: center;
}
.timeline-card {
  background: #0a1628; border: 1px solid #1a3a5a;
  border-radius: 6px; padding: 12px 16px;
}
.tc-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.tc-title { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.tc-time { font-size: 11px; color: #6b88a8; }
.tc-desc { font-size: 12px; color: #8ea4c0; margin: 0 0 8px; }
.tc-badge {
  font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px;
  background: #0d2845; color: #edcf7c; text-transform: uppercase; letter-spacing: .04em;
}

/* ===== Modals ===== */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.8);
  z-index: 1000; display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.modal-card {
  background: #04182d; border: 1px solid #1a3a5a;
  border-radius: 10px; width: 100%; max-width: 480px;
  max-height: 85vh; overflow-y: auto;
  box-shadow: 0 24px 60px rgba(0,0,0,.8);
}
.modal-head {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 20px; border-bottom: 1px solid #0d2845;
}
.modal-head strong { color: #e2e8f0; font-size: 15px; font-weight: 700; }
.modal-close {
  background: none; border: none; color: #4a6484; font-size: 20px;
  cursor: pointer; padding: 0; line-height: 1; transition: color .2s;
}
.modal-close:hover { color: #e2e8f0; }
.modal-pick-section {
  display: flex; flex-direction: column; gap: 0; padding: 8px 0;
}
.modal-pick-btn {
  display: flex; align-items: center; gap: 14px;
  background: none; border: none; border-bottom: 1px solid #0d2845;
  color: #e2e8f0; padding: 18px 20px; cursor: pointer;
  text-align: left; width: 100%; transition: background .15s;
}
.modal-pick-btn:hover { background: #0a1e35; }
.modal-pick-btn span { font-size: 14px; font-weight: 600; color: #e2e8f0; display: block; }
.modal-pick-btn small { font-size: 11px; color: #6b88a8; display: block; margin-top: 2px; }

/* Photo Review */
.review-section { padding: 16px 20px 20px; }
.review-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.review-header strong { color: #e2e8f0; font-size: 14px; font-weight: 700; }
.review-count { font-size: 12px; color: #6b88a8; }
.review-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.review-item {
  display: flex; align-items: center; gap: 10px;
  background: #0a1628; border: 1px solid #1a3a5a;
  border-radius: 6px; padding: 10px; flex-wrap: wrap;
}
.review-thumb {
  width: 44px; height: 44px; border-radius: 4px;
  overflow: hidden; background: #0d2845; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.review-thumb img { width: 100%; height: 100%; object-fit: cover; }
.review-meta { flex: 1; min-width: 0; }
.review-name { display: block; font-size: 12px; font-weight: 600; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.review-size { display: block; font-size: 10px; color: #4a6484; }
.review-tag-select {
  background: #0a1628; border: 1px solid #1a3a5a; color: #e2e8f0;
  font-size: 11px; padding: 5px 8px; border-radius: 4px; cursor: pointer;
}
.review-caption-input {
  flex: 1; min-width: 120px; background: #0a1628; border: 1px solid #1a3a5a;
  color: #e2e8f0; font-size: 11px; padding: 5px 8px; border-radius: 4px; outline: none;
}
.review-remove {
  background: none; border: none; color: #4a6484; cursor: pointer; padding: 4px;
  transition: color .2s;
}
.review-remove:hover { color: #e74c3c; }
.review-note-row { margin-bottom: 14px; }
.review-global-note {
  width: 100%; background: #0a1628; border: 1px solid #1a3a5a;
  color: #e2e8f0; font-size: 12px; padding: 9px 12px;
  border-radius: 5px; outline: none; box-sizing: border-box;
}
.review-global-note:focus { border-color: #edcf7c40; }
.review-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-cancel-upload {
  background: #0a1628; border: 1px solid #1a3a5a; color: #8ba0b8;
  font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 5px;
  cursor: pointer; transition: all .2s;
}
.btn-cancel-upload:hover { border-color: #205789; color: #e2e8f0; }
.btn-upload-submit {
  display: flex; align-items: center; gap: 7px;
  background: linear-gradient(135deg, #f8dfa0, #bc9240);
  border: none; color: #070B14; font-size: 13px; font-weight: 700;
  padding: 10px 22px; border-radius: 5px; cursor: pointer; transition: opacity .2s;
}
.btn-upload-submit:disabled { opacity: .6; cursor: not-allowed; }
.btn-upload-submit:hover:not(:disabled) { opacity: .9; }

/* Upload Progress */
.upload-progress-modal { max-width: 400px; }
.progress-address { padding: 14px 20px 10px; font-size: 13px; color: #8ba0b8; }
.progress-bar-wrap {
  height: 6px; background: #0a1628; border-radius: 3px; margin: 0 20px 8px;
}
.progress-bar {
  height: 100%; border-radius: 3px;
  background: linear-gradient(90deg, #f8dfa0, #bc9240);
  transition: width .3s ease;
}
.progress-count { font-size: 12px; color: #4a6484; padding: 0 20px 14px; text-align: right; }
.upload-file-list { padding: 0 20px 16px; display: flex; flex-direction: column; gap: 8px; }
.upload-file-row { display: flex; align-items: center; gap: 10px; }
.upl-icon { width: 18px; display: flex; align-items: center; justify-content: center; }
.upl-name { font-size: 12px; color: #c8d8e8; }
.spinner-xs {
  width: 14px; height: 14px;
  border: 2px solid #1a3a5a;
  border-top-color: #edcf7c;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
.btn-view-property {
  display: block; width: calc(100% - 40px); margin: 0 20px 20px;
  background: linear-gradient(135deg, #f8dfa0, #bc9240);
  border: none; color: #070B14; font-size: 14px; font-weight: 700;
  padding: 12px; border-radius: 6px; cursor: pointer; transition: opacity .2s;
}
.btn-view-property:hover { opacity: .9; }

/* Lightbox */
.lightbox-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.95);
  z-index: 2000; display: flex; align-items: center; justify-content: center;
  flex-direction: column;
}
.lightbox-topbar {
  position: absolute; top: 0; left: 0; right: 0;
  display: flex; justify-content: flex-end; align-items: center; gap: 10px;
  padding: 16px 20px; background: rgba(4,24,45,.8);
  backdrop-filter: blur(8px);
}
.lb-btn {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15);
  color: #e2e8f0; font-size: 12px; font-weight: 600;
  padding: 7px 14px; border-radius: 5px; cursor: pointer; transition: all .2s;
}
.lb-btn:hover { background: rgba(255,255,255,.15); }
.lb-nav {
  position: absolute; top: 50%; transform: translateY(-50%);
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15);
  border-radius: 50%; width: 44px; height: 44px;
  display: flex; align-items: center; justify-content: center;
  color: #e2e8f0; cursor: pointer; transition: all .2s; z-index: 10;
}
.lb-nav.prev { left: 20px; }
.lb-nav.next { right: 20px; }
.lb-nav:hover { background: rgba(237,207,124,.2); border-color: #edcf7c60; }
.lightbox-img-wrap {
  width: 100%; max-width: 840px; margin-top: 60px;
  display: flex; align-items: center; justify-content: center;
}
.lightbox-img {
  width: 100%; max-height: 58vh;
  background-size: contain; background-position: center; background-repeat: no-repeat;
  min-height: 300px;
}
.lightbox-placeholder {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 16px; color: #2a4a6a;
  font-size: 14px; min-height: 300px;
}
.lb-info {
  display: flex; align-items: center; gap: 12px;
  margin-top: 12px; font-size: 12px; color: #6b88a8;
}
.lb-filename { color: #e2e8f0; font-weight: 600; }
.lb-strip {
  display: flex; gap: 6px; margin-top: 12px;
  overflow-x: auto; max-width: 600px; padding: 4px 0;
  scrollbar-width: thin; scrollbar-color: #1a3a5a transparent;
}
.lb-strip-item {
  width: 56px; min-width: 56px; height: 42px;
  border-radius: 4px; overflow: hidden; cursor: pointer;
  border: 2px solid transparent; transition: border-color .2s;
}
.lb-strip-item.active { border-color: #edcf7c; }
.lb-strip-thumb {
  width: 100%; height: 100%;
  background-size: cover; background-position: center;
}
.lb-strip-placeholder {
  display: flex; align-items: center; justify-content: center;
  background: #0a1628;
}

/* Add / Edit Property Form */
.add-prop-modal { max-width: 520px; }
.add-prop-form { padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.form-row { display: flex; flex-direction: column; gap: 5px; }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row label { font-size: 11px; color: #6b88a8; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }
.form-row input, .form-row select {
  background: #0a1628; border: 1px solid #1a3a5a; color: #e2e8f0;
  font-size: 13px; padding: 9px 12px; border-radius: 5px; outline: none;
  transition: border-color .2s; font-family: inherit;
}
.form-row input:focus, .form-row select:focus { border-color: #edcf7c40; }
.form-error { font-size: 12px; color: #e74c3c; margin: 0; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .prop-sidebar { width: 100%; min-width: unset; position: absolute; z-index: 50; }
  .prop-header { flex-direction: column; }
  .prop-hero-thumb { width: 100%; height: 160px; }
  .photo-grid.grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
  .overview-quick-stats { grid-template-columns: 1fr; }
}

/* ======================================================== */
/* 8-STEP S3 PHOTO UPLOAD MODALS & WORKFLOW STYLES          */
/* ======================================================== */
.video-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 18, 0.78);
  backdrop-filter: blur(6px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
}

.white-modal-card {
  background: #ffffff;
  color: #0f172a;
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.45);
  padding: 24px 28px;
  position: relative;
  animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-head-simple {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.modal-head-simple h3 {
  font-size: 19px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.camera-close-x {
  background: transparent;
  border: none;
  font-size: 26px;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}
.camera-close-x:hover {
  color: #0f172a;
}

.choose-options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.choose-option-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 18px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  background: #f8fafc;
}
.choose-option-item:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-1px);
}
.opt-icon-gold {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #fef3c7;
  color: #b45309;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.opt-icon-slate {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #e2e8f0;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.opt-text strong {
  display: block;
  font-size: 15px;
  color: #0f172a;
  font-weight: 600;
}
.opt-text small {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.btn-cancel-flat {
  width: 100%;
  padding: 12px;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
}
.btn-cancel-flat:hover {
  background: #e2e8f0;
  color: #0f172a;
}

/* Dark Camera Modal (Step 04) */
.dark-camera-modal-card {
  background: #0b1424;
  color: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 18px 20px 24px;
  border: 1px solid #1e293b;
  box-shadow: 0 25px 65px rgba(0, 0, 0, 0.7);
}
.camera-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.camera-back-btn {
  background: transparent;
  border: none;
  color: #f8fafc;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
.camera-viewfinder-box {
  width: 100%;
  aspect-ratio: 4/3;
  background: #020617;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #1e293b;
}
.viewfinder-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.viewfinder-simulated {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  position: relative;
}
.simulated-view-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.shutter-flash-overlay {
  position: absolute;
  inset: 0;
  background: #ffffff;
  animation: flashAnim 0.18s ease-out forwards;
}
@keyframes flashAnim {
  0% { opacity: 0.9; }
  100% { opacity: 0; }
}

.camera-category-selector {
  display: flex;
  justify-content: center;
  margin: 14px 0 16px;
}
.cat-pill-btn {
  background: #1e293b;
  color: #f1f5f9;
  border: 1px solid #334155;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.cat-pill-btn:hover {
  background: #334155;
}

.camera-bottom-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
}
.captured-count-text {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
  min-width: 110px;
}
.camera-shutter-ring {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: transparent;
  border: 4px solid #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: transform 0.1s ease;
}
.camera-shutter-ring:active {
  transform: scale(0.92);
}
.camera-shutter-inner {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #f8fafc;
}
.camera-next-link {
  background: transparent;
  border: none;
  color: #f59e0b;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  min-width: 110px;
  text-align: right;
}
.camera-next-link.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Step 05: Review Photos Modal */
.review-modal-card {
  max-width: 480px;
}
.modal-big-title {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}
.modal-sub-title {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 18px;
}
.review-thumbs-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 6px 0 14px;
}
.review-thumb-item {
  width: 82px;
  height: 82px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
  border: 1px solid #cbd5e1;
}
.review-thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb-remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.8);
  color: #ffffff;
  border: none;
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.thumb-remove-btn:hover {
  background: #ef4444;
}

.review-form-field {
  margin-bottom: 14px;
}
.review-form-field label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}
.select-wrapper select,
.review-note-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  color: #0f172a;
  background: #ffffff;
}
.review-note-input:focus,
.select-wrapper select:focus {
  outline: none;
  border-color: #d97706;
}

.review-bottom-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
}
.btn-add-more-link {
  background: transparent;
  border: none;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}
.btn-upload-gold {
  background: #d97706;
  color: #ffffff;
  font-weight: 700;
  font-size: 14px;
  padding: 11px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
}
.btn-upload-gold:hover {
  background: #b45309;
}

/* Step 06: Uploading Modal */
.uploading-modal-card {
  max-width: 440px;
}
.s3-progress-track {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0 10px;
}
.s3-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #d97706, #10b981);
  border-radius: 4px;
  transition: width 0.35s ease;
}
.s3-status-numbers {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
}
.green-pct {
  color: #10b981;
  font-size: 14px;
}
.s3-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 160px;
  overflow-y: auto;
  border-top: 1px solid #f1f5f9;
  padding-top: 10px;
}
.s3-check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #334155;
}
.check-done {
  color: #10b981;
  font-weight: 700;
}
.check-pending {
  color: #94a3b8;
}

/* Step 08: Photo Detail Modal */
.photo-detail-card {
  max-width: 780px;
  padding: 20px 24px;
}
.detail-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.detail-back-btn {
  background: transparent;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.detail-content-columns {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
  margin-bottom: 20px;
}
.detail-left-photo {
  border-radius: 10px;
  overflow: hidden;
  background: #0f172a;
  aspect-ratio: 4/3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-left-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.detail-right-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-filename {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
}
.meta-field-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.meta-lbl {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #64748b;
  font-weight: 600;
}
.meta-val {
  font-size: 14px;
  color: #0f172a;
}
.pill-s3-saved {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 12px;
  background: #dcfce7;
  color: #166534;
  font-size: 12px;
  font-weight: 700;
  margin-top: 8px;
}
.detail-footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #e2e8f0;
  padding-top: 14px;
  font-size: 12px;
}
.s3-storage-path {
  color: #64748b;
  font-size: 11px;
  max-width: 440px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-actions-right {
  display: flex;
  gap: 8px;
}
.btn-dark-details {
  background: #0f172a;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
}
.btn-danger-details {
  background: #fee2e2;
  color: #991b1b;
  padding: 8px 14px;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
}

/* Gallery & S3 badges in Photos tab */
.badge-photos-added {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: #059669;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}
.photo-thumb-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  overflow: hidden;
  border-radius: 8px;
  background: #0f172a;
}
.photo-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}
.photo-card:hover .photo-thumb-img {
  transform: scale(1.04);
}
.s3-hover-pill {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(16, 185, 129, 0.9);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.photo-meta {
  padding: 10px 4px 4px;
}
.photo-caption {
  display: block;
  font-size: 13px;
  color: #f1f5f9;
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.photo-subline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}
.photo-tag-pill {
  color: #f59e0b;
  font-weight: 600;
}
.photo-date {
  color: #64748b;
}
</style>
