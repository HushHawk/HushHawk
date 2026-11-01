<template>
  <div class="hh-skeleton-wrapper" aria-busy="true" aria-label="Loading HushHawk Intelligence Platform">
    <!-- Skeleton Sidebar -->
    <aside class="hh-skel-sidebar">
      <div class="hh-skel-brand">
        <div class="hh-skel-logo hh-shimmer"></div>
        <div class="hh-skel-title hh-shimmer"></div>
        <div class="hh-skel-sub hh-shimmer"></div>
      </div>
      <div class="hh-skel-nav">
        <div v-for="i in 11" :key="'nav-' + i" class="hh-skel-nav-item">
          <div class="hh-skel-icon hh-shimmer"></div>
          <div class="hh-skel-nav-text hh-shimmer"></div>
        </div>
      </div>
      <div class="hh-skel-motto">
        <div class="hh-skel-line hh-shimmer"></div>
        <div class="hh-skel-text-sm hh-shimmer"></div>
      </div>
    </aside>

    <!-- Skeleton Workspace -->
    <main class="hh-skel-workspace">
      <!-- Topbar Skeleton -->
      <div class="hh-skel-topbar">
        <div class="hh-skel-search hh-shimmer"></div>
        <div class="hh-skel-topbar-right">
          <div class="hh-skel-badge hh-shimmer"></div>
          <div class="hh-skel-btn-gold hh-shimmer"></div>
          <div class="hh-skel-avatar hh-shimmer"></div>
        </div>
      </div>

      <!-- Hero Header Skeleton -->
      <div class="hh-skel-hero">
        <div class="hh-skel-hero-copy">
          <div class="hh-skel-crumb hh-shimmer"></div>
          <div class="hh-skel-headline hh-shimmer"></div>
          <div class="hh-skel-subhead hh-shimmer"></div>
          <div class="hh-skel-tags">
            <span class="hh-skel-tag hh-shimmer"></span>
            <span class="hh-skel-tag hh-shimmer"></span>
            <span class="hh-skel-tag hh-shimmer"></span>
          </div>
        </div>
        <div class="hh-skel-hero-right">
          <div class="hh-skel-city hh-shimmer"></div>
          <div class="hh-skel-motto-box hh-shimmer"></div>
        </div>
      </div>

      <!-- KPI Metrics Strip -->
      <div class="hh-skel-metrics">
        <div v-for="m in 10" :key="'m-' + m" class="hh-skel-kpi-card">
          <div class="hh-skel-kpi-top">
            <div class="hh-skel-kpi-icon hh-shimmer"></div>
            <div class="hh-skel-kpi-pill hh-shimmer"></div>
          </div>
          <div class="hh-skel-kpi-val hh-shimmer"></div>
          <div class="hh-skel-kpi-lbl hh-shimmer"></div>
        </div>
      </div>

      <!-- Content Grid Skeleton -->
      <div class="hh-skel-grid">
        <!-- Main Panel Table / Map Placeholder -->
        <div class="hh-skel-card hh-skel-table-card">
          <div class="hh-skel-card-header">
            <div class="hh-skel-header-title hh-shimmer"></div>
            <div class="hh-skel-header-btn hh-shimmer"></div>
          </div>
          <div class="hh-skel-filter-bar">
            <div class="hh-skel-filter-input hh-shimmer"></div>
            <div class="hh-skel-filter-select hh-shimmer"></div>
            <div class="hh-skel-filter-select hh-shimmer"></div>
          </div>
          <div class="hh-skel-table-rows">
            <div v-for="r in 5" :key="'r-' + r" class="hh-skel-row">
              <div class="hh-skel-cell w-check hh-shimmer"></div>
              <div class="hh-skel-cell w-lg hh-shimmer"></div>
              <div class="hh-skel-cell w-md hh-shimmer"></div>
              <div class="hh-skel-cell w-sm hh-shimmer"></div>
              <div class="hh-skel-cell w-badge hh-shimmer"></div>
            </div>
          </div>
        </div>

        <!-- Right Side Panel Placeholder -->
        <div class="hh-skel-card hh-skel-side-card">
          <div class="hh-skel-photo-box hh-shimmer"></div>
          <div class="hh-skel-side-meta">
            <div class="hh-skel-text-lg hh-shimmer"></div>
            <div class="hh-skel-text-sm hh-shimmer"></div>
            <div class="hh-skel-box-sm hh-shimmer"></div>
          </div>
          <div class="hh-skel-chat-bubble hh-shimmer"></div>
          <div class="hh-skel-chat-bubble alt hh-shimmer"></div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'HushHawkSkeleton'
};
</script>

<style scoped>
.hh-skeleton-wrapper {
  display: grid !important;
  grid-template-columns: 210px minmax(0, 1fr) !important;
  width: 100% !important;
  min-height: 100vh !important;
  background: #04182d !important;
  color: #f8fafc !important;
  overflow: hidden;
  box-sizing: border-box;
}

/* Premium Golden-Navy Shimmer */
.hh-shimmer {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(212, 172, 71, 0.14) 50%,
    rgba(255, 255, 255, 0.04) 100%
  ) !important;
  background-size: 200% 100% !important;
  animation: hh-shimmer-sweep 1.8s infinite ease-in-out !important;
  border-radius: 4px;
}

@keyframes hh-shimmer-sweep {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Sidebar Skeleton */
.hh-skel-sidebar {
  width: 210px;
  background: linear-gradient(180deg, #08274a 0%, #041a33 80%);
  border-right: 1px solid #1a3c63;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
}

.hh-skel-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid #14355a;
}

.hh-skel-logo {
  width: 52px;
  height: 52px;
  border-radius: 12px;
}

.hh-skel-title {
  width: 110px;
  height: 14px;
}

.hh-skel-sub {
  width: 70px;
  height: 8px;
}

.hh-skel-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.hh-skel-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
}

.hh-skel-icon {
  width: 18px;
  height: 18px;
  border-radius: 4px;
}

.hh-skel-nav-text {
  height: 12px;
  flex: 1;
  border-radius: 3px;
}

.hh-skel-motto {
  border-top: 1px solid #1a3c63;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hh-skel-line {
  height: 10px;
  width: 90%;
}

.hh-skel-text-sm {
  height: 8px;
  width: 60%;
}

/* Workspace Skeleton */
.hh-skel-workspace {
  background: radial-gradient(ellipse at 50% 0%, #0c2b4d 0%, #04182d 75%);
  padding: 0 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  box-sizing: border-box;
}

/* Topbar */
.hh-skel-topbar {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #163659;
}

.hh-skel-search {
  width: 280px;
  height: 32px;
  border-radius: 20px;
}

.hh-skel-topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hh-skel-badge {
  width: 120px;
  height: 28px;
  border-radius: 6px;
}

.hh-skel-btn-gold {
  width: 90px;
  height: 32px;
  border-radius: 6px;
}

.hh-skel-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

/* Hero Header */
.hh-skel-hero {
  height: 120px;
  background: linear-gradient(135deg, rgba(8, 39, 74, 0.7) 0%, rgba(4, 26, 51, 0.9) 100%);
  border: 1px solid #1d436e;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.hh-skel-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hh-skel-crumb {
  width: 140px;
  height: 10px;
}

.hh-skel-headline {
  width: 240px;
  height: 24px;
}

.hh-skel-subhead {
  width: 180px;
  height: 12px;
}

.hh-skel-tags {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.hh-skel-tag {
  width: 60px;
  height: 16px;
  border-radius: 10px;
}

.hh-skel-hero-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
}

.hh-skel-city {
  width: 130px;
  height: 32px;
}

.hh-skel-motto-box {
  width: 90px;
  height: 20px;
}

/* Metrics Row */
.hh-skel-metrics {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}

@media (max-width: 768px) {
  .hh-skel-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}

.hh-skel-kpi-card {
  background: rgba(10, 34, 61, 0.6);
  border: 1px solid #1a3c63;
  border-radius: 6px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hh-skel-kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hh-skel-kpi-icon {
  width: 22px;
  height: 22px;
  border-radius: 4px;
}

.hh-skel-kpi-pill {
  width: 38px;
  height: 14px;
  border-radius: 8px;
}

.hh-skel-kpi-val {
  width: 65%;
  height: 20px;
}

.hh-skel-kpi-lbl {
  width: 85%;
  height: 10px;
}

/* Grid Layout */
.hh-skel-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  flex: 1;
}

.hh-skel-card {
  background: rgba(8, 30, 54, 0.7);
  border: 1px solid #1a3c63;
  border-radius: 8px;
  padding: 16px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hh-skel-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hh-skel-header-title {
  width: 160px;
  height: 18px;
}

.hh-skel-header-btn {
  width: 90px;
  height: 26px;
}

.hh-skel-filter-bar {
  display: flex;
  gap: 10px;
}

.hh-skel-filter-input {
  flex: 1;
  height: 32px;
  border-radius: 4px;
}

.hh-skel-filter-select {
  width: 120px;
  height: 32px;
  border-radius: 4px;
}

.hh-skel-table-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}

.hh-skel-row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 38px;
  background: rgba(12, 38, 66, 0.4);
  border-radius: 4px;
  padding: 0 10px;
}

.hh-skel-cell {
  height: 14px;
}
.w-check { width: 18px; height: 18px; }
.w-lg { width: 28%; }
.w-md { width: 22%; }
.w-sm { width: 14%; }
.w-badge { width: 60px; height: 20px; border-radius: 10px; }

/* Side card */
.hh-skel-photo-box {
  height: 140px;
  border-radius: 6px;
}

.hh-skel-side-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hh-skel-text-lg {
  width: 70%;
  height: 18px;
}

.hh-skel-box-sm {
  width: 100%;
  height: 48px;
  border-radius: 6px;
  margin-top: 6px;
}

.hh-skel-chat-bubble {
  width: 80%;
  height: 36px;
  border-radius: 8px;
  margin-top: 6px;
}

.hh-skel-chat-bubble.alt {
  align-self: flex-end;
  width: 70%;
}
</style>

