<template>
  <div class="vault-workspace">
    <!-- Top Stats Row -->
    <div class="vault-stats-row">
      <div class="vstat-card">
        <div class="vstat-icon gold-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="vstat-info">
          <span class="vstat-label">Total Vault Files</span>
          <strong class="vstat-val font-mono">{{ totalFilesCount }}</strong>
          <small class="vstat-sub text-gold">Institutional Vault</small>
        </div>
      </div>

      <div class="vstat-card">
        <div class="vstat-icon cyan-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <div class="vstat-info">
          <span class="vstat-label">Stored Photos</span>
          <strong class="vstat-val font-mono">{{ totalPhotosCount }}</strong>
          <small class="vstat-sub text-cyan">High-Res Field Media</small>
        </div>
      </div>

      <div class="vstat-card">
        <div class="vstat-icon purple-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <div class="vstat-info">
          <span class="vstat-label">Documents &amp; Contracts</span>
          <strong class="vstat-val font-mono">{{ totalDocsCount }}</strong>
          <small class="vstat-sub text-purple">Title, Deeds &amp; PDFs</small>
        </div>
      </div>

      <div class="vstat-card">
        <div class="vstat-icon emerald-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div class="vstat-info">
          <span class="vstat-label">Linked to Properties</span>
          <strong class="vstat-val font-mono">{{ linkedFilesCount }}</strong>
          <small class="vstat-sub text-emerald">Active Portfolio Media</small>
        </div>
      </div>

      <div class="vstat-card">
        <div class="vstat-icon amber-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
            <line x1="6" y1="6" x2="6.01" y2="6"/>
            <line x1="6" y1="18" x2="6.01" y2="18"/>
          </svg>
        </div>
        <div class="vstat-info">
          <span class="vstat-label">S3 Vault Storage</span>
          <strong class="vstat-val font-mono">{{ totalStorageFormatted }}</strong>
          <small class="vstat-sub text-amber">AWS S3 · AES256 Encrypted</small>
        </div>
      </div>
    </div>

    <!-- Drag & Drop Uploader Section -->
    <div class="vault-upload-panel">
      <div class="upload-panel-header">
        <div class="uph-left">
          <div class="uph-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <h2 class="uph-title">AWS S3 Private Vault Uploader</h2>
            <p class="uph-desc">Direct institutional ingestion into private Amazon S3 bucket with automatic metadata indexing in PostgreSQL RDS.</p>
          </div>
        </div>
        <div class="uph-badge">
          <span class="live-dot"></span>
          <span>AWS S3 (us-east-2) · Connected</span>
        </div>
      </div>

      <!-- Drag and Drop Dropzone -->
      <div
        class="vault-dropzone"
        :class="{ 'dropzone-active': isDragging }"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
        @click="triggerFileInput"
      >
        <input
          ref="vaultFileInput"
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          class="hidden-file-input"
          @change="onFilesSelected"
        />
        <div class="dropzone-content">
          <div class="dropzone-icon-wrap">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
              <path d="M12 12v9"/>
              <path d="m16 16-4-4-4 4"/>
            </svg>
          </div>
          <h3 class="dropzone-title">Drag &amp; Drop Files or Photos Here</h3>
          <p class="dropzone-subtitle">or <button type="button" class="btn-browse-link" @click.stop="triggerFileInput">browse local computer</button></p>
          <div class="dropzone-meta">
            <span>Supports JPG, PNG, WEBP, PDF, DOCX, XLSX, TXT up to 50MB</span>
            <span class="bullet-sep">·</span>
            <span>AES256 Server-Side Encryption</span>
          </div>
        </div>
      </div>

      <!-- Upload Options & Queue Area -->
      <div v-if="uploadQueue.length > 0" class="upload-queue-container">
        <div class="queue-controls-bar">
          <div class="qc-field">
            <label>Asset Category:</label>
            <select v-model="selectedCategory" class="qc-select">
              <option value="Photos">Property Photos</option>
              <option value="Documents">Legal Documents</option>
              <option value="Contracts">Purchase &amp; Sale Contracts</option>
              <option value="Inspections">Inspection &amp; Scope of Work</option>
              <option value="Marketing">Marketing &amp; Disposition Blasts</option>
              <option value="Blueprints">Blueprints &amp; Floor Plans</option>
              <option value="Title & Escrow">Title &amp; Escrow Deeds</option>
              <option value="Receipts">Rehab Receipts &amp; Invoices</option>
            </select>
          </div>

          <div class="qc-field">
            <label>Immediate Property Link (Optional):</label>
            <select v-model="selectedPropertyId" class="qc-select">
              <option value="">Keep Unassigned in Central Vault</option>
              <option v-for="prop in propertiesList" :key="prop.property_id" :value="prop.property_id">
                {{ prop.address_line1 }} ({{ prop.city }}, {{ prop.state_code }})
              </option>
            </select>
          </div>

          <div class="qc-actions">
            <button class="btn-secondary-sm" @click="clearUploadQueue" :disabled="isUploading">
              Clear Queue
            </button>
            <button class="btn-primary-gold" @click="startBatchUpload" :disabled="isUploading">
              <span v-if="!isUploading">Upload {{ uploadQueue.length }} {{ uploadQueue.length === 1 ? 'File' : 'Files' }} to S3</span>
              <span v-else>Uploading to S3 ({{ uploadProgressDone }} / {{ uploadQueue.length }})…</span>
            </button>
          </div>
        </div>

        <!-- Queue Items List -->
        <div class="queue-items-grid">
          <div v-for="(item, idx) in uploadQueue" :key="idx" class="queue-item-card">
            <div class="queue-item-thumb">
              <img v-if="item.previewUrl" :src="item.previewUrl" :alt="item.file.name" />
              <div v-else class="queue-file-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
            </div>
            <div class="queue-item-details">
              <strong class="queue-item-name" :title="item.file.name">{{ item.file.name }}</strong>
              <div class="queue-item-sub">
                <span>{{ formatBytes(item.file.size) }}</span>
                <span class="bullet-sep">·</span>
                <span>{{ item.file.type || 'Binary' }}</span>
              </div>
              <div v-if="item.status === 'uploading'" class="queue-progress-bar">
                <div class="qpb-fill" :style="{ width: item.progress + '%' }"></div>
              </div>
              <div v-else-if="item.status === 'done'" class="queue-status-done text-emerald">
                <span>Uploaded</span>
              </div>
              <div v-else-if="item.status === 'error'" class="queue-status-error text-rose">
                <span>Error: {{ item.error }}</span>
              </div>
            </div>
            <button v-if="!isUploading && item.status === 'pending'" class="queue-item-remove" @click="removeFromQueue(idx)" title="Remove from queue">
              ×
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Vault Explorer Bar & Filter Controls -->
    <div class="vault-explorer-header">
      <div class="explorer-tabs">
        <button
          class="exp-tab-btn"
          :class="{ active: activeFilterType === 'all' }"
          @click="activeFilterType = 'all'"
        >
          <span>All Assets</span>
          <span class="exp-count">{{ totalFilesCount }}</span>
        </button>
        <button
          class="exp-tab-btn"
          :class="{ active: activeFilterType === 'photos' }"
          @click="activeFilterType = 'photos'"
        >
          <span>Photos &amp; Images</span>
          <span class="exp-count">{{ totalPhotosCount }}</span>
        </button>
        <button
          class="exp-tab-btn"
          :class="{ active: activeFilterType === 'documents' }"
          @click="activeFilterType = 'documents'"
        >
          <span>Documents &amp; PDFs</span>
          <span class="exp-count">{{ totalDocsCount }}</span>
        </button>
        <button
          class="exp-tab-btn"
          :class="{ active: activeFilterType === 'linked' }"
          @click="activeFilterType = 'linked'"
        >
          <span>Linked to Properties</span>
          <span class="exp-count">{{ linkedFilesCount }}</span>
        </button>
      </div>

      <div class="explorer-controls">
        <!-- Search Input -->
        <div class="vault-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search filenames, tags, or property addresses…"
            @input="filterFiles"
          />
        </div>

        <!-- Category Dropdown Filter -->
        <select v-model="selectedCategoryFilter" class="vault-filter-select" @change="filterFiles">
          <option value="All">All Categories</option>
          <option value="Photos">Property Photos</option>
          <option value="Documents">Legal Documents</option>
          <option value="Contracts">Contracts</option>
          <option value="Inspections">Inspections</option>
          <option value="Marketing">Marketing</option>
          <option value="Blueprints">Blueprints</option>
          <option value="Title & Escrow">Title &amp; Escrow</option>
          <option value="Receipts">Receipts</option>
        </select>

        <!-- View Switcher (Grid / List) -->
        <div class="view-switch-group">
          <button
            class="view-switch-btn"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Grid View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button
            class="view-switch-btn"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="List View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
        </div>

        <button class="btn-refresh-vault" @click="loadVaultFiles" title="Refresh Vault Ledger">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6"/>
            <path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading Indicator -->
    <div v-if="isLoadingFiles" class="vault-loading-state">
      <div class="vault-spinner"></div>
      <span>Querying AWS S3 Private Vault &amp; PostgreSQL RDS…</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredFilesList.length === 0" class="vault-empty-state">
      <div class="empty-icon-wrap">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </div>
      <h3>No Assets Found in This Filter</h3>
      <p>Drag and drop photos, deeds, or contracts onto the uploader above to securely ingest them into the AWS S3 Private Vault.</p>
      <button class="btn-primary-gold" @click="triggerFileInput">
        Upload First File
      </button>
    </div>

    <!-- Grid View Mode -->
    <div v-else-if="viewMode === 'grid'" class="vault-grid-layout">
      <div v-for="file in filteredFilesList" :key="file.id" class="vault-asset-card">
        <!-- Thumbnail Container -->
        <div class="card-thumb-container" @click="openPreviewModal(file)">
          <img
            v-if="isImageFile(file)"
            :src="file.data_url || getDownloadPlaceholder(file)"
            :alt="file.filename"
            class="card-img-thumb"
            loading="lazy"
          />
          <div v-else class="card-doc-placeholder">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <span class="doc-ext-badge">{{ getFileExtension(file.filename) }}</span>
          </div>

          <!-- Category Pill -->
          <span class="card-cat-badge">{{ file.category || 'Photos' }}</span>

          <!-- Hover Overlay with Quick Actions -->
          <div class="card-hover-overlay">
            <button class="cho-btn" @click.stop="openPreviewModal(file)" title="View High-Res Preview">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
            <button class="cho-btn" @click.stop="downloadFile(file)" title="Download File">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button class="cho-btn" @click.stop="openAssignModal(file)" title="Assign / Use on Property">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Card Body -->
        <div class="card-body">
          <strong class="card-filename" :title="file.original_filename || file.filename">
            {{ file.original_filename || file.filename }}
          </strong>

          <!-- Property Link Badge -->
          <div class="card-prop-badge-wrap">
            <span v-if="file.linked_property_id" class="prop-link-badge text-emerald" :title="file.property_address">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              <span>{{ file.property_address || 'Linked Property' }}</span>
            </span>
            <span v-else class="prop-link-badge text-slate">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <span>Central Vault · Unassigned</span>
            </span>
          </div>

          <!-- Metadata Row -->
          <div class="card-meta-row">
            <span>{{ formatBytes(file.file_size_bytes) }}</span>
            <span class="bullet-sep">·</span>
            <span>{{ formatDate(file.created_at) }}</span>
          </div>

          <!-- Action Buttons Bar -->
          <div class="card-actions-bar">
            <button class="btn-card-action btn-assign" @click="openAssignModal(file)" title="Attach or Use on Property">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>{{ file.linked_property_id ? 'Reassign' : 'Use on Property' }}</span>
            </button>

            <button class="btn-card-action btn-copy" @click="copyAssetLink(file)" title="Copy Direct S3 URI / CDN Key">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>{{ copiedId === file.id ? 'Copied' : 'Copy Key' }}</span>
            </button>

            <button class="btn-card-action btn-delete" @click="confirmDeleteFile(file)" title="Delete from Vault &amp; S3">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- List View Mode -->
    <div v-else class="vault-list-layout">
      <table class="vault-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Category</th>
            <th>Linked Property</th>
            <th>File Size</th>
            <th>Storage Key</th>
            <th>Uploaded</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="file in filteredFilesList" :key="file.id">
            <td class="cell-asset" @click="openPreviewModal(file)">
              <div class="table-asset-preview">
                <img v-if="isImageFile(file)" :src="file.data_url || getDownloadPlaceholder(file)" :alt="file.filename" />
                <div v-else class="table-doc-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
              </div>
              <div class="table-asset-info">
                <strong class="tai-name">{{ file.original_filename || file.filename }}</strong>
                <small class="tai-sub">{{ file.mime_type }}</small>
              </div>
            </td>
            <td>
              <span class="table-cat-badge">{{ file.category || 'Photos' }}</span>
            </td>
            <td>
              <span v-if="file.linked_property_id" class="table-prop-tag text-emerald">
                {{ file.property_address || 'Assigned' }}
              </span>
              <span v-else class="table-prop-tag text-slate">Unassigned</span>
            </td>
            <td class="font-mono text-slate">{{ formatBytes(file.file_size_bytes) }}</td>
            <td class="font-mono text-xs text-slate truncate" :title="file.object_key">{{ file.object_key }}</td>
            <td class="text-slate text-sm">{{ formatDate(file.created_at) }}</td>
            <td class="text-right">
              <div class="table-actions-row">
                <button class="tbl-btn" @click="openAssignModal(file)" title="Use on Property">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                  </svg>
                </button>
                <button class="tbl-btn" @click="downloadFile(file)" title="Download">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button class="tbl-btn" @click="copyAssetLink(file)" title="Copy Key">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button class="tbl-btn tbl-delete" @click="confirmDeleteFile(file)" title="Delete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODAL 1: Assign to Property -->
    <div v-if="showAssignModal" class="vault-modal-backdrop" @click="showAssignModal = false">
      <div class="vault-modal-card" @click.stop>
        <div class="vm-header">
          <div class="vm-title-wrap">
            <div class="vm-header-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
            </div>
            <div>
              <h3>Assign Asset to Property</h3>
              <p>Link this photo or document directly to a property's photo gallery and file ledger.</p>
            </div>
          </div>
          <button class="vm-close-btn" @click="showAssignModal = false">×</button>
        </div>

        <div class="vm-body">
          <!-- Selected Asset Preview -->
          <div v-if="targetAssignFile" class="assign-asset-badge">
            <div class="aab-thumb">
              <img v-if="isImageFile(targetAssignFile)" :src="targetAssignFile.data_url || getDownloadPlaceholder(targetAssignFile)" />
              <div v-else class="aab-doc-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
            </div>
            <div class="aab-info">
              <strong>{{ targetAssignFile.original_filename || targetAssignFile.filename }}</strong>
              <small>{{ targetAssignFile.category }} · {{ formatBytes(targetAssignFile.file_size_bytes) }}</small>
            </div>
          </div>

          <!-- Property Search / Selector -->
          <div class="vm-field">
            <label>Select Target Property:</label>
            <div class="prop-search-input-wrap">
              <input
                v-model="propertyModalSearch"
                type="text"
                placeholder="Search by address, city, or CrownKey…"
                class="vm-input"
              />
            </div>
            <div class="modal-props-list">
              <div
                v-for="prop in filteredModalProperties"
                :key="prop.property_id"
                class="modal-prop-item"
                :class="{ selected: targetPropertyId === prop.property_id }"
                @click="targetPropertyId = prop.property_id"
              >
                <div class="mpi-radio">
                  <span v-if="targetPropertyId === prop.property_id" class="radio-check">●</span>
                </div>
                <div class="mpi-details">
                  <strong>{{ prop.address_line1 }}</strong>
                  <small>{{ prop.city }}, {{ prop.state_code }} {{ prop.postal_code }} · Parcel: {{ prop.parcel_raw || 'Pending' }}</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Tag Selection -->
          <div class="vm-field">
            <label>Photo / Document Tag:</label>
            <select v-model="targetAssignTag" class="vm-select">
              <option value="Exterior">Exterior / Front Elevation</option>
              <option value="Interior">Interior / Living &amp; Kitchen</option>
              <option value="Roof/Structure">Roof, Foundation &amp; Structure</option>
              <option value="Aerial/Drone">Aerial / Drone View</option>
              <option value="Floor Plan/Blueprint">Floor Plan / Blueprint</option>
              <option value="Title/Deed">Title Commitment &amp; Deed</option>
              <option value="Inspection Report">Inspection &amp; Scope of Work</option>
              <option value="Rehab Estimate">Repair / Rehab Estimate</option>
              <option value="General">General Documentation</option>
            </select>
          </div>
        </div>

        <div class="vm-footer">
          <button class="btn-secondary-sm" @click="showAssignModal = false">Cancel</button>
          <button class="btn-primary-gold" :disabled="!targetPropertyId || isAssigning" @click="executePropertyAssignment">
            <span v-if="!isAssigning">Confirm &amp; Attach to Property</span>
            <span v-else>Assigning…</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL 2: High-Resolution Preview Modal -->
    <div v-if="showPreviewModal && previewFile" class="vault-modal-backdrop" @click="showPreviewModal = false">
      <div class="preview-modal-card" @click.stop>
        <div class="pm-header">
          <div class="pm-title">
            <strong :title="previewFile.original_filename || previewFile.filename">{{ previewFile.original_filename || previewFile.filename }}</strong>
            <small>{{ previewFile.category }} · {{ formatBytes(previewFile.file_size_bytes) }}</small>
          </div>
          <div class="pm-actions">
            <button class="pm-btn" @click="downloadFile(previewFile)" title="Download">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Download</span>
            </button>
            <button class="pm-btn" @click="openAssignModal(previewFile); showPreviewModal = false;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              </svg>
              <span>Use on Property</span>
            </button>
            <button class="pm-close-btn" @click="showPreviewModal = false">×</button>
          </div>
        </div>

        <div class="pm-body">
          <div v-if="isImageFile(previewFile)" class="pm-image-wrap">
            <img :src="previewFile.data_url || getDownloadPlaceholder(previewFile)" :alt="previewFile.filename" />
          </div>
          <div v-else class="pm-doc-wrap">
            <div class="doc-icon-huge">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h3>{{ previewFile.original_filename || previewFile.filename }}</h3>
            <p>Encrypted document stored in AWS S3 Private Vault.</p>
            <button class="btn-primary-gold" @click="downloadFile(previewFile)">
              Download Document ({{ formatBytes(previewFile.file_size_bytes) }})
            </button>
          </div>

          <!-- Metadata Sidebar -->
          <div class="pm-sidebar">
            <h4>Vault Specifications</h4>
            <div class="pms-row">
              <span>Storage Provider:</span>
              <strong>{{ previewFile.storage_provider || 'AWS S3' }}</strong>
            </div>
            <div class="pms-row">
              <span>Encryption:</span>
              <strong>AES256 Server-Side</strong>
            </div>
            <div class="pms-row">
              <span>S3 Object Key:</span>
              <strong class="font-mono text-xs truncate" :title="previewFile.object_key">{{ previewFile.object_key }}</strong>
            </div>
            <div class="pms-row">
              <span>MIME Type:</span>
              <strong>{{ previewFile.mime_type }}</strong>
            </div>
            <div class="pms-row">
              <span>Linked Property:</span>
              <strong>{{ previewFile.property_address || 'Unassigned (Central Vault)' }}</strong>
            </div>
            <div class="pms-row">
              <span>Uploaded At:</span>
              <strong>{{ formatDate(previewFile.created_at) }}</strong>
            </div>
            <div class="pms-row">
              <span>Uploaded By:</span>
              <strong>{{ previewFile.uploaded_by || 'Main Administrator' }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const API_BASE = '/api/v1';

export default {
  name: 'VaultView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      allFiles: [],
      filteredFilesList: [],
      propertiesList: [],
      activeFilterType: 'all',
      selectedCategoryFilter: 'All',
      searchQuery: '',
      viewMode: 'grid',
      isLoadingFiles: false,
      isDragging: false,
      uploadQueue: [],
      isUploading: false,
      uploadProgressDone: 0,
      selectedCategory: 'Photos',
      selectedPropertyId: '',
      copiedId: null,

      // Modals
      showAssignModal: false,
      targetAssignFile: null,
      targetPropertyId: '',
      targetAssignTag: 'Exterior',
      propertyModalSearch: '',
      isAssigning: false,

      showPreviewModal: false,
      previewFile: null,
    };
  },
  computed: {
    totalFilesCount() {
      return this.allFiles.length;
    },
    totalPhotosCount() {
      return this.allFiles.filter(f => this.isImageFile(f)).length;
    },
    totalDocsCount() {
      return this.allFiles.filter(f => !this.isImageFile(f)).length;
    },
    linkedFilesCount() {
      return this.allFiles.filter(f => !!f.linked_property_id).length;
    },
    totalStorageFormatted() {
      const sum = this.allFiles.reduce((acc, f) => acc + (parseInt(f.file_size_bytes) || 0), 0);
      return this.formatBytes(sum);
    },
    filteredModalProperties() {
      const q = (this.propertyModalSearch || '').trim().toLowerCase();
      if (!q) return this.propertiesList;
      return this.propertiesList.filter(p => {
        return (
          (p.address_line1 || '').toLowerCase().includes(q) ||
          (p.city || '').toLowerCase().includes(q) ||
          (p.parcel_raw || '').toLowerCase().includes(q)
        );
      });
    }
  },
  mounted() {
    this.loadVaultFiles();
    this.loadProperties();
  },
  methods: {
    async loadVaultFiles() {
      this.isLoadingFiles = true;
      try {
        const res = await fetch(`${API_BASE}/vault/files`);
        const data = await res.json();
        this.allFiles = data.files || [];
        this.filterFiles();
      } catch (err) {
        console.error('[Vault Load Error]', err.message);
        this.allFiles = [];
        this.filteredFilesList = [];
      } finally {
        this.isLoadingFiles = false;
      }
    },
    async loadProperties() {
      try {
        const res = await fetch(`${API_BASE}/properties`);
        const data = await res.json();
        this.propertiesList = data.properties || [];
      } catch (err) {
        console.error('[Properties Load Error]', err.message);
        this.propertiesList = [];
      }
    },
    filterFiles() {
      let list = [...this.allFiles];

      // 1. Filter Type
      if (this.activeFilterType === 'photos') {
        list = list.filter(f => this.isImageFile(f));
      } else if (this.activeFilterType === 'documents') {
        list = list.filter(f => !this.isImageFile(f));
      } else if (this.activeFilterType === 'linked') {
        list = list.filter(f => !!f.linked_property_id);
      }

      // 2. Category
      if (this.selectedCategoryFilter !== 'All') {
        list = list.filter(f => f.category === this.selectedCategoryFilter);
      }

      // 3. Search Query
      const q = (this.searchQuery || '').trim().toLowerCase();
      if (q) {
        list = list.filter(f => {
          return (
            (f.filename || '').toLowerCase().includes(q) ||
            (f.original_filename || '').toLowerCase().includes(q) ||
            (f.tag || '').toLowerCase().includes(q) ||
            (f.description || '').toLowerCase().includes(q) ||
            (f.property_address || '').toLowerCase().includes(q)
          );
        });
      }

      this.filteredFilesList = list;
    },
    isImageFile(file) {
      if (!file) return false;
      const mime = (file.mime_type || '').toLowerCase();
      if (mime.startsWith('image/')) return true;
      const fn = (file.filename || '').toLowerCase();
      return fn.endsWith('.jpg') || fn.endsWith('.jpeg') || fn.endsWith('.png') || fn.endsWith('.webp') || fn.endsWith('.gif') || fn.endsWith('.svg');
    },
    getFileExtension(filename) {
      if (!filename) return 'FILE';
      const parts = filename.split('.');
      return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
    },
    formatBytes(bytes) {
      const b = parseInt(bytes) || 0;
      if (b === 0) return '0 B';
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
      return (b / (1024 * 1024)).toFixed(2) + ' MB';
    },
    formatDate(dateStr) {
      if (!dateStr) return 'Just now';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    getDownloadPlaceholder(file) {
      return '';
    },
    triggerFileInput() {
      if (this.$refs.vaultFileInput) {
        this.$refs.vaultFileInput.click();
      }
    },
    onDragOver() {
      this.isDragging = true;
    },
    onDragLeave() {
      this.isDragging = false;
    },
    onDrop(e) {
      this.isDragging = false;
      const files = e.dataTransfer ? e.dataTransfer.files : [];
      this.addFilesToQueue(files);
    },
    onFilesSelected(e) {
      const files = e.target ? e.target.files : [];
      this.addFilesToQueue(files);
      if (this.$refs.vaultFileInput) {
        this.$refs.vaultFileInput.value = '';
      }
    },
    addFilesToQueue(files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let previewUrl = null;
        if (file.type && file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }
        this.uploadQueue.push({
          file,
          previewUrl,
          progress: 0,
          status: 'pending',
          error: null
        });
      }
    },
    removeFromQueue(idx) {
      this.uploadQueue.splice(idx, 1);
    },
    clearUploadQueue() {
      this.uploadQueue = [];
      this.uploadProgressDone = 0;
    },
    async startBatchUpload() {
      if (this.uploadQueue.length === 0 || this.isUploading) return;
      this.isUploading = true;
      this.uploadProgressDone = 0;

      for (let i = 0; i < this.uploadQueue.length; i++) {
        const item = this.uploadQueue[i];
        if (item.status === 'done') continue;

        item.status = 'uploading';
        item.progress = 20;

        try {
          // 1. Get Presigned S3 Upload Authorization
          const authRes = await fetch(`${API_BASE}/vault/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: item.file.name,
              content_type: item.file.type || 'application/octet-stream',
              file_size_bytes: item.file.size,
              category: this.selectedCategory
            })
          });

          if (!authRes.ok) throw new Error('Could not acquire S3 upload authorization');
          const auth = await authRes.json();
          item.progress = 40;

          // 2. Direct browser-to-S3 presigned PUT upload
          if (auth.upload_url && typeof auth.upload_url === 'string' && auth.upload_url.startsWith('https://')) {
            try {
              await fetch(auth.upload_url, {
                method: 'PUT',
                headers: auth.headers || { 'Content-Type': item.file.type || 'application/octet-stream' },
                body: item.file
              });
            } catch (putErr) {
              console.warn('[Direct S3 PUT skipped / server will persist buffer]', putErr.message);
            }
          }
          item.progress = 70;

          // 3. Read preview base64 data URL
          const dataUrl = await this.readFileAsDataUrl(item.file);
          item.progress = 85;

          // 4. Register in PostgreSQL RDS core.vault_files
          const regRes = await fetch(`${API_BASE}/vault/files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: item.file.name,
              original_filename: item.file.name,
              file_size_bytes: item.file.size,
              mime_type: item.file.type || 'application/octet-stream',
              category: this.selectedCategory,
              object_key: auth.object_key,
              data_url: dataUrl,
              linked_property_id: this.selectedPropertyId || null,
              uploaded_by: 'Main Administrator'
            })
          });

          if (!regRes.ok) throw new Error('Database registration failed');

          item.progress = 100;
          item.status = 'done';
          this.uploadProgressDone++;
        } catch (err) {
          console.error('[Upload Error]', err);
          item.status = 'error';
          item.error = err.message;
        }
      }

      this.isUploading = false;
      await this.loadVaultFiles();
    },
    readFileAsDataUrl(file) {
      return new Promise((resolve) => {
        if (!file || file.size > 25 * 1024 * 1024) {
          return resolve(null);
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    },
    openAssignModal(file) {
      this.targetAssignFile = file;
      this.targetPropertyId = file.linked_property_id || '';
      this.targetAssignTag = file.tag || 'Exterior';
      this.propertyModalSearch = '';
      this.showAssignModal = true;
    },
    async executePropertyAssignment() {
      if (!this.targetAssignFile || !this.targetPropertyId) return;
      this.isAssigning = true;
      try {
        const res = await fetch(`${API_BASE}/vault/files/${this.targetAssignFile.id}/assign-property`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            property_id: this.targetPropertyId,
            tag: this.targetAssignTag
          })
        });

        if (!res.ok) throw new Error('Failed to assign property');
        this.showAssignModal = false;
        await this.loadVaultFiles();
      } catch (err) {
        alert('Assignment Error: ' + err.message);
      } finally {
        this.isAssigning = false;
      }
    },
    openPreviewModal(file) {
      this.previewFile = file;
      this.showPreviewModal = true;
    },
    async downloadFile(file) {
      try {
        const res = await fetch(`${API_BASE}/vault/files/${file.id}/download-url`);
        const data = await res.json();
        const url = data.download_url || file.data_url;
        if (!url) {
          alert('No download URL available for this file.');
          return;
        }
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_filename || file.filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.error('[Download Error]', err.message);
        if (file.data_url) {
          const a = document.createElement('a');
          a.href = file.data_url;
          a.download = file.original_filename || file.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }
    },
    copyAssetLink(file) {
      const link = file.object_key || file.filename;
      if (navigator && navigator.clipboard) {
        navigator.clipboard.writeText(link);
        this.copiedId = file.id;
        setTimeout(() => {
          if (this.copiedId === file.id) this.copiedId = null;
        }, 2000);
      }
    },
    async confirmDeleteFile(file) {
      const ok = confirm(`Delete "${file.original_filename || file.filename}" from AWS S3 Private Vault? This action cannot be undone.`);
      if (!ok) return;

      try {
        const res = await fetch(`${API_BASE}/vault/files/${file.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        await this.loadVaultFiles();
      } catch (err) {
        alert('Delete Error: ' + err.message);
      }
    }
  }
};
</script>

<style scoped>
.vault-workspace {
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #f8fafc;
  font-family: inherit;
  padding-bottom: 40px;
}

/* 1. Stats Row */
.vault-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}
.vstat-card {
  background: #0f172a;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.vstat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 175, 55, 0.45);
}
.vstat-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.gold-icon { color: #d4af37; border-color: rgba(212, 175, 55, 0.3); }
.cyan-icon { color: #38bdf8; border-color: rgba(56, 189, 248, 0.3); }
.purple-icon { color: #c084fc; border-color: rgba(192, 132, 252, 0.3); }
.emerald-icon { color: #34d399; border-color: rgba(52, 211, 153, 0.3); }
.amber-icon { color: #fbbf24; border-color: rgba(251, 191, 36, 0.3); }

.vstat-info {
  display: flex;
  flex-direction: column;
}
.vstat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #94a3b8;
}
.vstat-val {
  font-size: 22px;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
}
.vstat-sub {
  font-size: 10px;
  margin-top: 2px;
}

/* 2. Upload Panel */
.vault-upload-panel {
  background: #0f172a;
  border: 1px solid rgba(212, 175, 55, 0.25);
  border-radius: 10px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}
.upload-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.uph-left {
  display: flex;
  gap: 14px;
  align-items: center;
}
.uph-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.uph-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #f8fafc;
}
.uph-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}
.uph-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.3);
  padding: 5px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  color: #34d399;
}
.live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px #34d399;
}

/* Dropzone */
.vault-dropzone {
  border: 2px dashed rgba(212, 175, 55, 0.35);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
  padding: 36px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}
.vault-dropzone:hover, .vault-dropzone.dropzone-active {
  border-color: #d4af37;
  background: rgba(212, 175, 55, 0.05);
}
.hidden-file-input {
  display: none;
}
.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.dropzone-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(212, 175, 55, 0.1);
  color: #d4af37;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.dropzone-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #f8fafc;
}
.dropzone-subtitle {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}
.btn-browse-link {
  background: none;
  border: none;
  padding: 0;
  color: #d4af37;
  text-decoration: underline;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.dropzone-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}

/* Upload Queue */
.upload-queue-container {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.queue-controls-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  margin-bottom: 16px;
}
.qc-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 220px;
}
.qc-field label {
  font-size: 11px;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.qc-select {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #f8fafc;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
}
.qc-select:focus {
  border-color: #d4af37;
}
.qc-actions {
  display: flex;
  gap: 10px;
}
.btn-secondary-sm {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
}
.btn-primary-gold {
  background: linear-gradient(135deg, #d4af37 0%, #b45309 100%);
  border: none;
  color: #0a1128;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(212, 175, 55, 0.3);
}
.btn-primary-gold:disabled, .btn-secondary-sm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.queue-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.queue-item-card {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 10px;
  display: flex;
  gap: 12px;
  align-items: center;
  position: relative;
}
.queue-item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 4px;
  overflow: hidden;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.queue-item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.queue-item-details {
  flex: 1;
  min-width: 0;
}
.queue-item-name {
  display: block;
  font-size: 12px;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.queue-item-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}
.queue-progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}
.qpb-fill {
  height: 100%;
  background: #d4af37;
  transition: width 0.3s ease;
}
.queue-item-remove {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
}
.queue-item-remove:hover { color: #f43f5e; }

/* 3. Explorer Bar */
.vault-explorer-header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  align-items: center;
  background: #0f172a;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
}
.explorer-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.exp-tab-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  transition: all 0.15s ease;
}
.exp-tab-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.05);
}
.exp-tab-btn.active {
  color: #d4af37;
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.25);
}
.exp-count {
  background: rgba(0, 0, 0, 0.3);
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 9999px;
  font-family: monospace;
}
.explorer-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}
.vault-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 6px 12px;
  color: #94a3b8;
}
.vault-search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #f8fafc;
  font-size: 12px;
  width: 180px;
}
.vault-filter-select {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #f8fafc;
  padding: 6px 10px;
  font-size: 12px;
  outline: none;
}
.view-switch-group {
  display: flex;
  background: #1e293b;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.view-switch-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 6px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.view-switch-btn.active {
  background: rgba(212, 175, 55, 0.2);
  color: #d4af37;
}
.btn-refresh-vault {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #94a3b8;
  padding: 6px 10px;
  cursor: pointer;
}
.btn-refresh-vault:hover { color: #f8fafc; border-color: #d4af37; }

/* 4. Grid Layout */
.vault-grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.vault-asset-card {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.vault-asset-card:hover {
  transform: translateY(-2px);
  border-color: rgba(212, 175, 55, 0.5);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}
.card-thumb-container {
  height: 140px;
  background: #1e293b;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.card-img-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-doc-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.doc-ext-badge {
  font-size: 10px;
  font-weight: 700;
  background: rgba(212, 175, 55, 0.2);
  color: #d4af37;
  padding: 2px 6px;
  border-radius: 4px;
}
.card-cat-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #f8fafc;
  backdrop-filter: blur(4px);
}
.card-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(10, 17, 40, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.card-thumb-container:hover .card-hover-overlay {
  opacity: 1;
}
.cho-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(212, 175, 55, 0.4);
  color: #d4af37;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}
.cho-btn:hover {
  transform: scale(1.1);
  background: #d4af37;
  color: #0a1128;
}

.card-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.card-filename {
  font-size: 13px;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-prop-badge-wrap {
  display: flex;
  align-items: center;
}
.prop-link-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
}
.bullet-sep {
  color: #475569;
}
.card-actions-bar {
  display: flex;
  gap: 6px;
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.btn-card-action {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
}
.btn-card-action:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}
.btn-assign:hover {
  border-color: #34d399;
  color: #34d399;
}
.btn-copy:hover {
  border-color: #d4af37;
  color: #d4af37;
}
.btn-delete:hover {
  border-color: #f43f5e;
  color: #f43f5e;
}

/* 5. List View Table */
.vault-list-layout {
  background: #0f172a;
  border: 1px solid rgba(212, 175, 55, 0.2);
  border-radius: 8px;
  overflow-x: auto;
}
.vault-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.vault-table th {
  text-align: left;
  padding: 12px 14px;
  background: #1e293b;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.vault-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #f8fafc;
}
.vault-table tr:hover td {
  background: rgba(255, 255, 255, 0.02);
}
.cell-asset {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.table-asset-preview {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  overflow: hidden;
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.table-asset-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.table-asset-info {
  display: flex;
  flex-direction: column;
}
.tai-name {
  font-size: 12px;
  color: #f8fafc;
}
.tai-sub {
  font-size: 10px;
  color: #64748b;
}
.table-cat-badge {
  background: rgba(255, 255, 255, 0.06);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
}
.table-prop-tag {
  font-size: 11px;
  font-weight: 500;
}
.table-actions-row {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.tbl-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.tbl-btn:hover { border-color: #d4af37; color: #d4af37; }
.tbl-delete:hover { border-color: #f43f5e; color: #f43f5e; }

/* 6. Modals */
.vault-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 24, 45, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}
.vault-modal-card {
  background: #0f172a;
  border: 1px solid rgba(212, 175, 55, 0.35);
  border-radius: 10px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
}
.vm-header {
  padding: 18px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.vm-title-wrap {
  display: flex;
  gap: 12px;
  align-items: center;
}
.vm-header-icon {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  background: rgba(212, 175, 55, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.vm-title-wrap h3 {
  margin: 0;
  font-size: 16px;
  color: #f8fafc;
}
.vm-title-wrap p {
  margin: 2px 0 0;
  font-size: 11px;
  color: #94a3b8;
}
.vm-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 20px;
  cursor: pointer;
}
.vm-close-btn:hover { color: #f8fafc; }

.vm-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
  overflow-y: auto;
}
.assign-asset-badge {
  display: flex;
  gap: 12px;
  align-items: center;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 12px;
}
.aab-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  overflow: hidden;
  background: #0f172a;
}
.aab-thumb img { width: 100%; height: 100%; object-fit: cover; }
.aab-info strong { display: block; font-size: 12px; color: #f8fafc; }
.aab-info small { font-size: 10px; color: #94a3b8; }

.vm-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.vm-field label {
  font-size: 11px;
  text-transform: uppercase;
  color: #94a3b8;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.vm-input, .vm-select {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 8px 12px;
  color: #f8fafc;
  font-size: 13px;
  outline: none;
}
.vm-input:focus, .vm-select:focus { border-color: #d4af37; }

.modal-props-list {
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: #0a1128;
}
.modal-prop-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
}
.modal-prop-item:hover { background: rgba(255, 255, 255, 0.04); }
.modal-prop-item.selected { background: rgba(212, 175, 55, 0.15); border-color: #d4af37; }
.mpi-radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.radio-check { font-size: 10px; color: #d4af37; line-height: 1; }
.mpi-details strong { display: block; font-size: 12px; color: #f8fafc; }
.mpi-details small { font-size: 10px; color: #94a3b8; }

.vm-footer {
  padding: 14px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* Preview Modal */
.preview-modal-card {
  background: #0f172a;
  border: 1px solid rgba(212, 175, 55, 0.4);
  border-radius: 10px;
  width: 100%;
  max-width: 860px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pm-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pm-title strong { display: block; font-size: 15px; color: #f8fafc; }
.pm-title small { font-size: 11px; color: #94a3b8; }
.pm-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}
.pm-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
.pm-btn:hover { border-color: #d4af37; color: #d4af37; }
.pm-close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 22px;
  cursor: pointer;
}
.pm-close-btn:hover { color: #f8fafc; }

.pm-body {
  display: grid;
  grid-template-columns: 1fr 280px;
  flex: 1;
  overflow: hidden;
}
.pm-image-wrap {
  background: #020617;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: auto;
}
.pm-image-wrap img {
  max-width: 100%;
  max-height: 55vh;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
}
.pm-doc-wrap {
  background: #020617;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  gap: 12px;
}
.pm-sidebar {
  background: #1e293b;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.pm-sidebar h4 {
  margin: 0;
  font-size: 12px;
  text-transform: uppercase;
  color: #d4af37;
  letter-spacing: 0.05em;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.pms-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pms-row span { font-size: 11px; color: #94a3b8; }
.pms-row strong { font-size: 12px; color: #f8fafc; }

/* Loading & Empty States */
.vault-loading-state, .vault-empty-state {
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}
.vault-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(212, 175, 55, 0.2);
  border-top-color: #d4af37;
  border-radius: 50%;
  animation: vspin 0.8s linear infinite;
}
@keyframes vspin {
  to { transform: rotate(360deg); }
}

/* Utilities */
.text-gold { color: #d4af37; }
.text-cyan { color: #38bdf8; }
.text-purple { color: #c084fc; }
.text-emerald { color: #34d399; }
.text-amber { color: #fbbf24; }
.text-slate { color: #94a3b8; }
.text-rose { color: #f43f5e; }
.text-right { text-align: right; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }

@media (max-width: 768px) {
  .pm-body {
    grid-template-columns: 1fr;
  }
  .pm-sidebar {
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}
</style>

