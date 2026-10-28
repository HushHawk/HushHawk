<template>
  <div class="properties-container">

    <!-- Top Command Breadcrumb & Heading -->
    <div class="prop-page-header">
      <div class="prop-top-breadcrumbs">
        <span class="crumb-link" @click="showPropertyPicker = !showPropertyPicker">
          Properties
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </span>
        <span class="crumb-sep">/</span>
        <strong>{{ currentProperty.address_line1 }}</strong>

        <!-- Property Quick Selector Dropdown -->
        <div v-if="showPropertyPicker" class="prop-selector-dropdown" @click.stop>
          <div class="ps-head">Select Property</div>
          <div
            v-for="p in properties"
            :key="p.property_id"
            class="ps-item"
            :class="{ active: p.property_id === currentProperty.property_id }"
            @click="selectProperty(p); showPropertyPicker = false"
          >
            <strong>{{ p.address_line1 }}</strong>
            <small>{{ p.city }}, {{ p.state_code }} • {{ p.parcel_raw || p.crownKey }}</small>
          </div>
        </div>
      </div>

      <div class="prop-title-row">
        <div>
          <h1 class="prop-main-title">{{ currentProperty.address_line1 }}</h1>
          <p class="prop-main-subtitle">{{ currentProperty.city }}, Florida • Property Record</p>
        </div>
      </div>
    </div>

    <!-- Main White Card Container -->
    <div class="prop-card-container">

      <!-- Property Summary Header Row -->
      <div class="prop-summary-bar">
        <div class="prop-summary-thumb">
          <img :src="heroPhotoUrl" alt="Property thumbnail" />
        </div>
        <div class="prop-summary-meta">
          <div class="prop-meta-address">{{ currentProperty.address_line1 }}</div>
          <div class="prop-meta-city">{{ currentProperty.city }}, {{ currentProperty.state_code }}</div>
          <div class="prop-meta-pills">
            <span class="pill-rehab">Rehab Project</span>
            <span class="pill-id">Property ID • {{ currentProperty.crownKey || 'HH-PROP-07120' }}</span>
          </div>
        </div>

        <div class="prop-summary-actions" @click.stop>
          <button class="btn-actions-gold" @click="actionsMenuOpen = !actionsMenuOpen">
            Actions
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>

          <!-- Actions Dropdown Menu (Matches Video frame_002) -->
          <div v-if="actionsMenuOpen" class="actions-dropdown-menu">
            <div class="dropdown-header">Select an action</div>
            <button class="action-item" @click="openCameraModal(); actionsMenuOpen = false">
              <span class="act-icon camera-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </span>
              Take Photos
            </button>
            <button class="action-item" @click="triggerUploadFiles(); actionsMenuOpen = false">
              <span class="act-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,16 12,12 8,16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
              </span>
              Upload Files
            </button>
            <button class="action-item" @click="shareSecureLink(); actionsMenuOpen = false">
              <span class="act-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </span>
              Share Secure Link
            </button>
            <button class="action-item" @click="openCreateTaskModal(); actionsMenuOpen = false">
              <span class="act-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </span>
              Create Task
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Navigation Bar (Matches Video) -->
      <div class="prop-tabs-nav">
        <button
          v-for="t in navTabs"
          :key="t.key"
          class="prop-tab-btn"
          :class="{ active: currentTab === t.key }"
          @click="currentTab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <!-- TAB 1: PHOTOS (Matches Video frame_000, frame_008) -->
      <div v-if="currentTab === 'photos'" class="tab-body-pane">
        <div class="photos-pane-header">
          <div>
            <h2 class="pane-title">Property Photos</h2>
            <p class="pane-subtitle">Photos are saved in private Amazon S3 storage and linked to this property.</p>
          </div>

          <div class="photos-pane-actions">
            <!-- Animated Green Success Pill (Matches Video frame_008) -->
            <transition name="fade-scale">
              <div v-if="recentlyAddedCount > 0" class="pill-photos-added">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <span>{{ recentlyAddedCount }} photo{{ recentlyAddedCount !== 1 ? 's' : '' }} added</span>
              </div>
            </transition>

            <button class="btn-add-photos-gold" @click="openCameraModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Photos
            </button>
          </div>
        </div>

        <!-- Photos Grid (Matches Video frame_000, 4 columns) -->
        <div v-if="loadingPhotos" class="gallery-loading">
          <div class="spinner-gold"></div>
          <span>Loading Amazon S3 property gallery…</span>
        </div>

        <div v-else-if="photos.length === 0" class="gallery-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          <p>No photos uploaded yet for this parcel.</p>
          <button class="btn-add-photos-gold" @click="openCameraModal">Take First Photo</button>
        </div>

        <div v-else class="video-photo-grid">
          <div
            v-for="photo in photos"
            :key="photo.id"
            class="video-photo-card"
            @click="openPhotoDetail(photo)"
          >
            <div class="photo-img-frame">
              <img :src="photo.data_url || defaultPhotoPlaceholder" :alt="photo.caption || photo.filename" />
            </div>
            <div class="photo-card-caption">
              <strong>{{ photo.caption || photo.original_filename || photo.filename }}</strong>
              <small>{{ formatDate(photo.photo_date || photo.created_at) }} • {{ photo.tag || 'Before' }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: OVERVIEW -->
      <div v-if="currentTab === 'overview'" class="tab-body-pane">
        <div class="overview-cards-grid">
          <div class="ov-stat-box">
            <span class="ov-stat-label">Assessed Value</span>
            <strong class="ov-stat-val gold">${{ Number(currentProperty.assessed_value || 215000).toLocaleString() }}</strong>
          </div>
          <div class="ov-stat-box">
            <span class="ov-stat-label">Property Type</span>
            <strong class="ov-stat-val">{{ currentProperty.property_type || 'Single Family Residential' }}</strong>
          </div>
          <div class="ov-stat-box">
            <span class="ov-stat-label">Parcel ID</span>
            <strong class="ov-stat-val font-mono">{{ currentProperty.parcel_raw || '071200-0010' }}</strong>
          </div>
          <div class="ov-stat-box">
            <span class="ov-stat-label">CrownKey ID</span>
            <strong class="ov-stat-val font-mono gold">{{ currentProperty.crownKey || 'HH-PROP-07120' }}</strong>
          </div>
          <div class="ov-stat-box">
            <span class="ov-stat-label">County</span>
            <strong class="ov-stat-val">Duval (DUV), Florida</strong>
          </div>
          <div class="ov-stat-box">
            <span class="ov-stat-label">Estimated Equity</span>
            <strong class="ov-stat-val gold">${{ Number(currentProperty.estimated_equity || 98000).toLocaleString() }}</strong>
          </div>
          <div class="ov-stat-box col-span-2">
            <span class="ov-stat-label">Legal Description</span>
            <strong class="ov-stat-val font-sm">{{ currentProperty.legal_description || 'NORTHLAND HEIGHTS LOT 12 BLK 4' }}</strong>
          </div>
        </div>
      </div>

      <!-- TAB 3: DOCUMENTS -->
      <div v-if="currentTab === 'documents'" class="tab-body-pane">
        <div class="pane-inline-head">
          <h3 class="pane-title">Property Documents</h3>
          <button class="btn-add-photos-gold" @click="triggerUploadFiles">
            + Upload Document
          </button>
        </div>
        <div class="simple-doc-list">
          <div class="simple-doc-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c69234" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div class="s-doc-info">
              <strong>Executed Purchase and Sale Agreement</strong>
              <small>PSA_7120_Northland.pdf • 482 KB • Oct 24, 2026</small>
            </div>
            <span class="s-doc-tag">Contract</span>
          </div>
          <div class="simple-doc-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c69234" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <div class="s-doc-info">
              <strong>First American Title Commitment</strong>
              <small>Title_Commitment_DUV_7120.pdf • 1.1 MB • Oct 26, 2026</small>
            </div>
            <span class="s-doc-tag">Title</span>
          </div>
        </div>
      </div>

      <!-- TAB 4: TASKS -->
      <div v-if="currentTab === 'tasks'" class="tab-body-pane">
        <div class="pane-inline-head">
          <h3 class="pane-title">Property Punchlist &amp; Milestones</h3>
          <button class="btn-add-photos-gold" @click="openCreateTaskModal">
            + Create Task
          </button>
        </div>
        <div class="simple-tasks-list">
          <div v-for="task in propertyTasks" :key="task.id" class="simple-task-row">
            <input type="checkbox" :checked="task.completed" @change="task.completed = !task.completed" />
            <div class="st-main">
              <span :class="{ 'line-through text-muted': task.completed }">{{ task.title }}</span>
              <small>{{ task.due }} • {{ task.priority }}</small>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 5: EXPENSES -->
      <div v-if="currentTab === 'expenses'" class="tab-body-pane">
        <div class="pane-inline-head">
          <h3 class="pane-title">Renovation Budget &amp; Receipts</h3>
        </div>
        <div class="overview-cards-grid">
          <div class="ov-stat-box">
            <span class="ov-stat-label">Total Renovation Budget</span>
            <strong class="ov-stat-val gold">$45,000</strong>
          </div>
          <div class="ov-stat-box">
            <span class="ov-stat-label">Spent to Date</span>
            <strong class="ov-stat-val gold">$14,850</strong>
          </div>
          <div class="ov-stat-box">
            <span class="ov-stat-label">Remaining Balance</span>
            <strong class="ov-stat-val">$30,150</strong>
          </div>
        </div>
      </div>

      <!-- TAB 6: TIMELINE -->
      <div v-if="currentTab === 'timeline'" class="tab-body-pane">
        <div class="pane-inline-head">
          <h3 class="pane-title">Parcel Audit History</h3>
        </div>
        <div class="simple-timeline">
          <div class="tl-event">
            <div class="tl-dot"></div>
            <div class="tl-content">
              <strong>Photos uploaded to Amazon S3 bucket</strong>
              <small>Today at 10:24 AM • Field Walkthrough</small>
            </div>
          </div>
          <div class="tl-event">
            <div class="tl-dot"></div>
            <div class="tl-content">
              <strong>Property Record Established in HushHawk CRM</strong>
              <small>Oct 24, 2026 • Duval County Lead Ingestion</small>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- ======================================================== -->
    <!-- MODAL 1: TAKE PROPERTY PHOTOS (Matches Video frame_003) -->
    <!-- ======================================================== -->
    <div v-if="modalStep === 'camera'" class="video-modal-backdrop" @click.self="closeAllModals">
      <div class="dark-camera-modal-card">
        <!-- Top bar: < Take Property Photos and Close -->
        <div class="camera-head-row">
          <button class="camera-back-btn" @click="closeAllModals">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Take Property Photos
          </button>
          <button class="camera-close-x" @click="closeAllModals">×</button>
        </div>

        <!-- Camera Viewfinder with Live Stream or Framing View -->
        <div class="camera-viewfinder-box">
          <video v-if="hasCameraStream" ref="cameraVideo" autoplay playsinline class="viewfinder-feed"></video>
          <div v-else class="viewfinder-simulated" :style="`background-image: url('${currentCameraFramePreview}')`">
            <div class="simulated-view-badge">Field Camera</div>
          </div>
          <div v-if="shutterFlashed" class="shutter-flash-overlay"></div>
        </div>

        <!-- Category Pill under Viewfinder -->
        <div class="camera-category-selector">
          <button class="cat-pill-btn" @click="cycleCategory">
            {{ activeCameraTag }}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>

        <!-- Bottom Controls: Count | Shutter Button | Next -->
        <div class="camera-bottom-controls">
          <span class="captured-count-text">
            {{ capturedQueue.length }} photo{{ capturedQueue.length !== 1 ? 's' : '' }} captured
          </span>

          <!-- Shutter Button (Matches Video frame_003: outer circle + inner circle) -->
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
    <!-- MODAL 2: REVIEW PHOTOS (Matches Video frame_004) -->
    <!-- ======================================================== -->
    <div v-if="modalStep === 'review'" class="video-modal-backdrop" @click.self="closeAllModals">
      <div class="white-modal-card review-modal-card">
        <h2 class="modal-big-title">Review Photos</h2>
        <p class="modal-sub-title">{{ capturedQueue.length }} new photos ready for {{ currentProperty.address_line1 }}</p>

        <!-- Thumbnails Row (Matches Video frame_004) -->
        <div class="review-thumbs-strip">
          <div v-for="(item, idx) in capturedQueue" :key="idx" class="review-thumb-item">
            <img :src="item.previewUrl" :alt="item.name" />
          </div>
        </div>

        <!-- Category Dropdown -->
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

        <!-- Optional Note Input -->
        <div class="review-form-field">
          <input
            v-model="reviewNote"
            type="text"
            placeholder="Optional note: Initial framing walkthrough"
            class="review-note-input"
          />
        </div>

        <!-- Bottom Action Buttons (Matches Video frame_004) -->
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
    <!-- MODAL 3: UPLOADING TO S3 (Matches Video frame_006) -->
    <!-- ======================================================== -->
    <div v-if="modalStep === 'uploading'" class="video-modal-backdrop">
      <div class="white-modal-card uploading-modal-card">
        <h2 class="modal-big-title">Uploading securely to Amazon S3</h2>
        <p class="modal-sub-title">Property: {{ currentProperty.address_line1 }} • {{ currentProperty.city }}, {{ currentProperty.state_code }}</p>

        <!-- Gold Progress Bar (Matches Video frame_006) -->
        <div class="s3-progress-track">
          <div class="s3-progress-fill" :style="`width: ${uploadProgressPercent}%`"></div>
        </div>

        <!-- Count & Percentage -->
        <div class="s3-status-numbers">
          <span>{{ currentUploadDoneIndex }} of {{ capturedQueue.length }} photos uploaded</span>
          <strong class="green-pct">{{ uploadProgressPercent }}%</strong>
        </div>

        <!-- File Checklist -->
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
    <!-- MODAL 4: PHOTO DETAIL / S3 SAVED (Matches Video frame_009) -->
    <!-- ======================================================== -->
    <div v-if="selectedDetailPhoto" class="video-modal-backdrop" @click.self="selectedDetailPhoto = null">
      <div class="white-modal-card photo-detail-card">
        <!-- Top bar: < Property Photos and Close X -->
        <div class="detail-head-row">
          <button class="detail-back-btn" @click="selectedDetailPhoto = null">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            Property Photos
          </button>
          <button class="camera-close-x" @click="selectedDetailPhoto = null">×</button>
        </div>

        <!-- Two Columns: Left Image | Right Metadata -->
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
              <span class="meta-lbl">Linked to</span>
              <strong class="meta-val">{{ currentProperty.address_line1 }}</strong>
            </div>

            <!-- Green S3 Saved Pill Badge (Matches Video frame_009) -->
            <div class="pill-s3-saved">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              S3 Saved
            </div>
          </div>
        </div>

        <!-- Footer: Storage Path + View File Details Button -->
        <div class="detail-footer-row">
          <span class="s3-storage-path font-mono">
            Storage: private S3 bucket / properties / {{ currentProperty.crownKey || 'HH-PROP-07120' }} / photos
          </span>
          <button class="btn-dark-details" @click="downloadCurrentPhoto">
            View file details
          </button>
        </div>
      </div>
    </div>

    <!-- Hidden native file input for Upload Files option -->
    <input ref="nativeFileInput" type="file" accept="image/*" multiple style="display:none" @change="onNativeFilesSelected" />

    <!-- Create Task Modal -->
    <div v-if="showTaskModal" class="video-modal-backdrop" @click.self="showTaskModal = false">
      <div class="white-modal-card" style="max-width: 440px;">
        <h2 class="modal-big-title">Create Property Task</h2>
        <p class="modal-sub-title">Assign inspection or punchlist task for {{ currentProperty.address_line1 }}</p>
        <div class="review-form-field">
          <label>Task Title</label>
          <input v-model="newTaskTitle" type="text" placeholder="e.g. Initial framing walkthrough" class="review-note-input" />
        </div>
        <div class="review-form-field">
          <label>Priority</label>
          <div class="select-wrapper">
            <select v-model="newTaskPriority">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;">
          <button class="btn-add-more-link" @click="showTaskModal = false">Cancel</button>
          <button class="btn-upload-gold" @click="saveNewTask">Create Task</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
const API_BASE = '/api/v1';

export default {
  name: 'PropertiesView',
  props: { content: { type: Object, default: () => ({}) } },
  data() {
    return {
      properties: [],
      currentProperty: {
        property_id: 'a7120000-0000-0000-0000-000000007120',
        address_line1: '7120 Northland',
        city: 'Jacksonville',
        state_code: 'FL',
        postal_code: '32204',
        crownKey: 'HH-PROP-07120',
        assessed_value: 215000,
        property_type: 'Single Family Residential',
        legal_description: 'NORTHLAND HEIGHTS LOT 12 BLK 4',
        estimated_equity: 98000,
      },
      showPropertyPicker: false,
      actionsMenuOpen: false,

      // Tabs
      currentTab: 'photos',
      navTabs: [
        { key: 'overview', label: 'Overview' },
        { key: 'photos', label: 'Photos' },
        { key: 'documents', label: 'Documents' },
        { key: 'tasks', label: 'Tasks' },
        { key: 'expenses', label: 'Expenses' },
        { key: 'timeline', label: 'Timeline' },
      ],

      // Photos
      photos: [],
      loadingPhotos: false,
      recentlyAddedCount: 0,
      recentlyAddedTimer: null,

      // Modal flow: null | 'camera' | 'review' | 'uploading'
      modalStep: null,
      selectedDetailPhoto: null,

      // Camera State
      hasCameraStream: false,
      cameraMediaStream: null,
      activeCameraTag: 'Before Photos',
      cameraSampleIndex: 0,
      shutterFlashed: false,
      sampleFrames: [
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80', // framing
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80', // bathroom demo
        'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80', // bedroom
      ],

      // Captured Photos Queue for Review & Upload
      capturedQueue: [],
      reviewCategory: 'Before Photos',
      reviewNote: 'Initial framing walkthrough',

      // S3 Uploading Simulation State (Matches Video frame_006)
      uploadProgressPercent: 0,
      currentUploadDoneIndex: 0,
      uploadChecklist: [],

      // Task modal
      showTaskModal: false,
      newTaskTitle: '',
      newTaskPriority: 'High',
      propertyTasks: [
        { id: 1, title: 'Initial framing walkthrough with general contractor', due: 'Tomorrow', priority: 'High', completed: false },
        { id: 2, title: 'Verify electrical rough-in inspection permit', due: 'Oct 30, 2026', priority: 'Medium', completed: true },
      ],

      defaultPhotoPlaceholder: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
    };
  },
  computed: {
    heroPhotoUrl() {
      if (this.photos && this.photos.length > 0 && this.photos[0].data_url) {
        return this.photos[0].data_url;
      }
      return this.defaultPhotoPlaceholder;
    },
    currentCameraFramePreview() {
      return this.sampleFrames[this.cameraSampleIndex % this.sampleFrames.length];
    }
  },
  mounted() {
    this.loadProperties();
    document.addEventListener('click', this.closeMenus);
  },
  beforeUnmount() {
    this.stopCameraStream();
    document.removeEventListener('click', this.closeMenus);
  },
  methods: {
    closeMenus() {
      this.actionsMenuOpen = false;
      this.showPropertyPicker = false;
    },
    async loadProperties() {
      try {
        const r = await fetch(`${API_BASE}/properties`);
        const data = await r.json();
        if (data && data.properties && data.properties.length > 0) {
          this.properties = data.properties;
          // Look for 7120 Northland first, otherwise pick first property
          const found = this.properties.find(p => (p.address_line1 || '').includes('7120'));
          this.selectProperty(found || this.properties[0]);
        } else {
          await this.loadPhotos(this.currentProperty.property_id);
        }
      } catch (e) {
        await this.loadPhotos(this.currentProperty.property_id);
      }
    },
    async selectProperty(prop) {
      this.currentProperty = { ...this.currentProperty, ...prop };
      await this.loadPhotos(this.currentProperty.property_id);
    },
    async loadPhotos(propertyId) {
      this.loadingPhotos = true;
      try {
        const r = await fetch(`${API_BASE}/properties/${propertyId}/photos`);
        const data = await r.json();
        if (data && data.photos && data.photos.length > 0) {
          this.photos = data.photos;
        } else {
          // Default initial 4 photos if DB empty for this property
          this.photos = [
            {
              id: 'p1',
              filename: 'front_exterior.jpg',
              original_filename: 'Front Exterior',
              tag: 'Before',
              caption: 'Front Exterior',
              photo_date: '2026-10-28',
              data_url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80'
            },
            {
              id: 'p2',
              filename: 'living_room.jpg',
              original_filename: 'Living Room',
              tag: 'Before',
              caption: 'Living Room',
              photo_date: '2026-10-28',
              data_url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=800&q=80'
            },
            {
              id: 'p3',
              filename: 'kitchen.jpg',
              original_filename: 'Kitchen',
              tag: 'Before',
              caption: 'Kitchen',
              photo_date: '2026-10-28',
              data_url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
            },
            {
              id: 'p4',
              filename: 'framing.jpg',
              original_filename: 'Framing',
              tag: 'Before',
              caption: 'Framing',
              photo_date: '2026-10-28',
              data_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80'
            }
          ];
        }
      } catch (e) {
        // Fallback photos
      } finally {
        this.loadingPhotos = false;
      }
    },

    // ===== CAMERA MODAL (Step 1) =====
    async openCameraModal() {
      this.modalStep = 'camera';
      // Prepopulate queue with 3 photos if fresh, matching video flow
      if (this.capturedQueue.length === 0) {
        this.capturedQueue = [
          { name: 'framing-01.jpg', previewUrl: this.sampleFrames[0], tag: 'Before' },
          { name: 'bathroom-02.jpg', previewUrl: this.sampleFrames[1], tag: 'Before' },
          { name: 'bedroom-03.jpg', previewUrl: this.sampleFrames[2], tag: 'Before' },
        ];
      }
      this.initCameraStream();
    },
    async initCameraStream() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
          });
          this.cameraMediaStream = stream;
          this.hasCameraStream = true;
          this.$nextTick(() => {
            if (this.$refs.cameraVideo) {
              this.$refs.cameraVideo.srcObject = stream;
            }
          });
        }
      } catch (err) {
        this.hasCameraStream = false;
      }
    },
    stopCameraStream() {
      if (this.cameraMediaStream) {
        this.cameraMediaStream.getTracks().forEach(t => t.stop());
        this.cameraMediaStream = null;
      }
      this.hasCameraStream = false;
    },
    snapPhoto() {
      this.shutterFlashed = true;
      setTimeout(() => { this.shutterFlashed = false; }, 180);

      const frameUrl = this.currentCameraFramePreview;
      const count = this.capturedQueue.length + 1;
      this.capturedQueue.push({
        name: `photo-${String(count).padStart(2, '0')}.jpg`,
        previewUrl: frameUrl,
        tag: this.activeCameraTag
      });
      this.cameraSampleIndex++;
    },
    cycleCategory() {
      const cats = ['Before Photos', 'Progress Photos', 'After Photos', 'Inspection Photos'];
      const idx = cats.indexOf(this.activeCameraTag);
      this.activeCameraTag = cats[(idx + 1) % cats.length];
    },
    goToReview() {
      if (this.capturedQueue.length === 0) return;
      this.stopCameraStream();
      this.modalStep = 'review';
    },

    // ===== REVIEW MODAL (Step 2) =====
    async startS3Upload() {
      this.modalStep = 'uploading';
      this.uploadProgressPercent = 0;
      this.currentUploadDoneIndex = 0;

      this.uploadChecklist = this.capturedQueue.map(item => ({
        name: item.name,
        status: 'pending'
      }));

      const total = this.capturedQueue.length;
      for (let i = 0; i < total; i++) {
        // Simulate progressive upload percentage
        for (let p = 1; p <= 10; p++) {
          const currentBase = (i / total) * 100;
          const stepAdd = (p / 10) * (100 / total);
          this.uploadProgressPercent = Math.min(100, Math.round(currentBase + stepAdd));
          await new Promise(r => setTimeout(r, 60));
        }

        // Mark file done
        this.uploadChecklist[i].status = 'done';
        this.currentUploadDoneIndex = i + 1;

        // Post to backend database
        try {
          const item = this.capturedQueue[i];
          const payload = {
            filename: item.name,
            original_filename: item.name.replace(/\.[^/.]+$/, "").replace(/-/g, ' ').toUpperCase(),
            tag: this.reviewCategory.replace(' Photos', ''),
            caption: this.reviewNote || item.name,
            data_url: item.previewUrl,
            file_size_bytes: 1840000,
            photo_date: new Date().toISOString().split('T')[0]
          };
          const res = await fetch(`${API_BASE}/properties/${this.currentProperty.property_id}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const saved = await res.json();
          if (res.ok) {
            this.photos.unshift(saved);
          }
        } catch (e) {
          // If offline, prepend locally
          this.photos.unshift({
            id: 'local-' + Date.now() + '-' + i,
            filename: this.capturedQueue[i].name,
            original_filename: this.capturedQueue[i].name,
            tag: this.reviewCategory.replace(' Photos', ''),
            caption: this.reviewNote,
            data_url: this.capturedQueue[i].previewUrl,
            photo_date: new Date().toISOString().split('T')[0]
          });
        }
      }

      await new Promise(r => setTimeout(r, 300));

      // Complete upload
      const addedCount = this.capturedQueue.length;
      this.modalStep = null;
      this.capturedQueue = [];

      // Trigger green pill badge: "✓ 3 photos added" (Matches Video frame_008)
      this.recentlyAddedCount = addedCount;
      if (this.recentlyAddedTimer) clearTimeout(this.recentlyAddedTimer);
      this.recentlyAddedTimer = setTimeout(() => {
        this.recentlyAddedCount = 0;
      }, 5000);
    },

    // ===== PHOTO DETAIL MODAL (Step 4, Matches Video frame_009) =====
    openPhotoDetail(photo) {
      this.selectedDetailPhoto = photo;
    },
    downloadCurrentPhoto() {
      if (!this.selectedDetailPhoto) return;
      const a = document.createElement('a');
      a.href = this.selectedDetailPhoto.data_url || this.defaultPhotoPlaceholder;
      a.download = this.selectedDetailPhoto.filename || 'property-photo.jpg';
      a.target = '_blank';
      a.click();
    },
    closeAllModals() {
      this.stopCameraStream();
      this.modalStep = null;
      this.selectedDetailPhoto = null;
    },

    // ===== ACTIONS MENU =====
    triggerUploadFiles() {
      this.$refs.nativeFileInput.click();
    },
    async onNativeFilesSelected(evt) {
      const files = Array.from(evt.target.files);
      evt.target.value = '';
      if (!files.length) return;

      const items = await Promise.all(files.map(async file => {
        const previewUrl = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(file);
        });
        return { name: file.name, previewUrl, tag: 'Before' };
      }));

      this.capturedQueue = items;
      this.modalStep = 'review';
    },
    shareSecureLink() {
      const url = `${window.location.origin}/properties?id=${this.currentProperty.property_id}`;
      navigator.clipboard.writeText(url).then(() => {
        alert('Secure link copied to clipboard:\n' + url);
      }).catch(() => {
        prompt('Copy secure property link:', url);
      });
    },
    openCreateTaskModal() {
      this.showTaskModal = true;
    },
    saveNewTask() {
      if (!this.newTaskTitle) return;
      this.propertyTasks.unshift({
        id: Date.now(),
        title: this.newTaskTitle,
        due: 'Next Week',
        priority: this.newTaskPriority,
        completed: false
      });
      this.showTaskModal = false;
      this.newTaskTitle = '';
    },

    // ===== UTILS =====
    formatDate(d) {
      if (!d) return 'Oct 28, 2026';
      try {
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } catch {
        return d;
      }
    }
  }
};
</script>

<style scoped>
/* ===== Top-Level Container (Matches Video Clean Modern Canvas) ===== */
.properties-container {
  min-height: 100vh;
  background-color: #f1f5f9;
  padding: 24px 32px 60px;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #0f172a;
  box-sizing: border-box;
}

/* ===== Header & Breadcrumbs ===== */
.prop-page-header {
  margin-bottom: 20px;
}
.prop-top-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
  position: relative;
}
.crumb-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  color: #64748b;
  font-weight: 500;
  transition: color .2s;
}
.crumb-link:hover { color: #0f172a; }
.crumb-sep { color: #cbd5e1; }
.prop-top-breadcrumbs strong { color: #0f172a; font-weight: 600; }

.prop-selector-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  min-width: 260px;
  z-index: 500;
  overflow: hidden;
  margin-top: 4px;
}
.ps-head {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}
.ps-item {
  padding: 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
}
.ps-item:hover { background: #f8fafc; }
.ps-item.active { background: #fff8e7; }
.ps-item strong { font-size: 13px; color: #0f172a; }
.ps-item small { font-size: 11px; color: #64748b; margin-top: 2px; }

.prop-main-title {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 2px;
  letter-spacing: -0.02em;
}
.prop-main-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* ===== Main White Card Container (Matches Video frame_000) ===== */
.prop-card-container {
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  overflow: hidden;
}

/* Summary Header Row */
.prop-summary-bar {
  display: flex;
  align-items: center;
  padding: 20px 24px;
  gap: 20px;
  border-bottom: 1px solid #f1f5f9;
}
.prop-summary-thumb {
  width: 170px;
  height: 105px;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
  flex-shrink: 0;
}
.prop-summary-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.prop-summary-meta {
  flex: 1;
  min-width: 0;
}
.prop-meta-address {
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 2px;
}
.prop-meta-city {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
}
.prop-meta-pills {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.pill-rehab {
  background: #e6f4ea;
  color: #137333;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 12px;
  border-radius: 12px;
}
.pill-id {
  font-size: 12px;
  color: #64748b;
}

.prop-summary-actions {
  position: relative;
  flex-shrink: 0;
}
.btn-actions-gold {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #c69234;
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  padding: 9px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity .2s;
}
.btn-actions-gold:hover { opacity: .9; }

/* Actions Dropdown (Matches Video frame_002) */
.actions-dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  min-width: 190px;
  z-index: 500;
  overflow: hidden;
  padding: 6px 0;
}
.dropdown-header {
  padding: 6px 14px 4px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
}
.action-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: none;
  border: none;
  padding: 10px 14px;
  font-size: 13px;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
  transition: background .15s;
}
.action-item:hover {
  background: #fff8e7;
  color: #c69234;
}
.act-icon {
  display: inline-flex;
  align-items: center;
  color: #64748b;
}
.act-icon.camera-icon { color: #c69234; }

/* Tabs Bar (Matches Video) */
.prop-tabs-nav {
  display: flex;
  padding: 0 24px;
  border-bottom: 1px solid #e2e8f0;
  gap: 28px;
}
.prop-tab-btn {
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  padding: 14px 2px;
  cursor: pointer;
  transition: all .2s;
}
.prop-tab-btn:hover { color: #0f172a; }
.prop-tab-btn.active {
  color: #0f172a;
  font-weight: 700;
  border-bottom-color: #c69234;
}

/* Tab Body Pane */
.tab-body-pane {
  padding: 24px;
}
.photos-pane-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}
.pane-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}
.pane-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}
.photos-pane-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pill-photos-added {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #e6f4ea;
  color: #137333;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 16px;
}
.btn-add-photos-gold {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #c69234;
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity .2s;
}
.btn-add-photos-gold:hover { opacity: .9; }

/* Photo Gallery Grid (Matches Video frame_000: 4 columns) */
.video-photo-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.video-photo-card {
  cursor: pointer;
  transition: transform .2s;
}
.video-photo-card:hover {
  transform: translateY(-2px);
}
.photo-img-frame {
  aspect-ratio: 16/10;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}
.photo-img-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.photo-card-caption {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
}
.photo-card-caption strong {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}
.photo-card-caption small {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}

.gallery-loading, .gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: #64748b;
  font-size: 14px;
}
.spinner-gold {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #c69234;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

/* Overview Cards */
.overview-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.ov-stat-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ov-stat-box.col-span-2 {
  grid-column: span 2;
}
.ov-stat-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: .04em;
}
.ov-stat-val {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.ov-stat-val.gold { color: #c69234; }
.ov-stat-val.font-mono { font-family: monospace; font-size: 14px; }
.ov-stat-val.font-sm { font-size: 13px; font-weight: 500; }

/* Simple Docs & Tasks list */
.pane-inline-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.simple-doc-list, .simple-tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.simple-doc-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.s-doc-info { flex: 1; }
.s-doc-info strong { display: block; font-size: 13px; color: #0f172a; }
.s-doc-info small { color: #64748b; font-size: 11px; }
.s-doc-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: #e2e8f0;
  color: #475569;
}
.simple-task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.st-main { flex: 1; }
.st-main span { display: block; font-size: 13px; font-weight: 600; color: #0f172a; }
.st-main small { color: #64748b; font-size: 11px; }
.line-through { text-decoration: line-through; }
.text-muted { color: #94a3b8 !important; }

/* Simple Timeline */
.simple-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-left: 10px;
  border-left: 2px solid #e2e8f0;
  margin-left: 8px;
}
.tl-event {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}
.tl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #c69234;
  margin-left: -16px;
  margin-top: 5px;
}
.tl-content strong { display: block; font-size: 13px; color: #0f172a; }
.tl-content small { font-size: 11px; color: #64748b; }

/* ======================================================== */
/* MODAL STYLES (MATCHES VIDEO)                            */
/* ======================================================== */
.video-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* MODAL 1: Dark Camera Modal (Matches Video frame_003) */
.dark-camera-modal-card {
  background: #0e1a2b;
  border-radius: 16px;
  width: 100%;
  max-width: 440px;
  padding: 20px;
  color: #ffffff;
  box-shadow: 0 25px 60px rgba(0,0,0,0.4);
  position: relative;
}
.camera-head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.camera-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.camera-close-x {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.camera-close-x:hover { color: #ffffff; }

.camera-viewfinder-box {
  width: 100%;
  aspect-ratio: 1/1;
  border-radius: 12px;
  overflow: hidden;
  background: #000000;
  position: relative;
}
.viewfinder-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
  top: 10px;
  left: 10px;
  background: rgba(0,0,0,0.6);
  color: #ffffff;
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: .05em;
}
.shutter-flash-overlay {
  position: absolute;
  inset: 0;
  background: #ffffff;
  opacity: 0.9;
  animation: flashFade .2s ease-out;
}
@keyframes flashFade { from { opacity: 0.9; } to { opacity: 0; } }

.camera-category-selector {
  display: flex;
  justify-content: center;
  margin-top: 14px;
}
.cat-pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  color: #e2e8f0;
  border: none;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.cat-pill-btn:hover { background: #334155; }

.camera-bottom-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
}
.captured-count-text {
  font-size: 13px;
  color: #ffffff;
  width: 120px;
}
.camera-shutter-ring {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: transparent;
  border: 4px solid #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: transform .1s;
}
.camera-shutter-ring:active { transform: scale(0.92); }
.camera-shutter-inner {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffffff;
  display: block;
}
.camera-next-link {
  background: none;
  border: none;
  color: #e5b842;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  width: 120px;
  text-align: right;
  padding: 0;
}
.camera-next-link.disabled { opacity: 0.4; cursor: not-allowed; }

/* MODAL 2: Review Photos (Matches Video frame_004) */
.white-modal-card {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  padding: 24px;
  box-shadow: 0 25px 60px rgba(0,0,0,0.18);
  position: relative;
  box-sizing: border-box;
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
  gap: 12px;
  margin-bottom: 20px;
}
.review-thumb-item {
  flex: 1;
  aspect-ratio: 1/1;
  border-radius: 8px;
  overflow: hidden;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
}
.review-thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.review-form-field {
  margin-bottom: 14px;
}
.review-form-field label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}
.select-wrapper { position: relative; }
.select-wrapper select, .review-note-input {
  width: 100%;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #0f172a;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
.select-wrapper select:focus, .review-note-input:focus {
  border-color: #c69234;
  background: #ffffff;
}

.review-bottom-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
}
.btn-add-more-link {
  background: none;
  border: none;
  color: #c69234;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.btn-upload-gold {
  background: #c69234;
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 700;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: opacity .2s;
}
.btn-upload-gold:hover { opacity: .9; }

/* MODAL 3: Uploading to S3 (Matches Video frame_006) */
.uploading-modal-card {
  max-width: 440px;
}
.s3-progress-track {
  width: 100%;
  height: 8px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}
.s3-progress-fill {
  height: 100%;
  background: #c69234;
  border-radius: 4px;
  transition: width .15s ease-out;
}
.s3-status-numbers {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #0f172a;
  margin-bottom: 16px;
}
.green-pct { color: #10b981; font-weight: 700; }
.s3-checklist {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.s3-check-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #334155;
}
.check-done {
  color: #10b981;
  font-weight: 800;
}
.check-pending {
  color: #94a3b8;
}

/* MODAL 4: Photo Detail (Matches Video frame_009) */
.photo-detail-card {
  max-width: 620px;
}
.detail-head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.detail-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  padding: 0;
}
.detail-content-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.detail-left-photo {
  border-radius: 10px;
  overflow: hidden;
  aspect-ratio: 4/3;
  background: #f1f5f9;
}
.detail-left-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.detail-right-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.detail-filename {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
}
.meta-field-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.meta-lbl {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
}
.meta-val {
  font-size: 13px;
  color: #0f172a;
  font-weight: 600;
}
.pill-s3-saved {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #e6f4ea;
  color: #137333;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  width: fit-content;
  margin-top: 6px;
}
.detail-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f1f5f9;
  padding-top: 14px;
  margin-top: 18px;
  gap: 12px;
  flex-wrap: wrap;
}
.s3-storage-path {
  font-size: 11px;
  color: #64748b;
}
.btn-dark-details {
  background: #0f172a;
  color: #ffffff;
  border: none;
  font-size: 12px;
  font-weight: 600;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity .2s;
}
.btn-dark-details:hover { opacity: .85; }

/* Transitions */
.fade-scale-enter-active, .fade-scale-leave-active {
  transition: opacity .25s, transform .25s;
}
.fade-scale-enter-from, .fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .video-photo-grid { grid-template-columns: repeat(2, 1fr); }
  .detail-content-columns { grid-template-columns: 1fr; }
  .overview-cards-grid { grid-template-columns: 1fr; }
  .ov-stat-box.col-span-2 { grid-column: span 1; }
}
</style>
