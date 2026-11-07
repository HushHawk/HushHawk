<template>
  <div class="hushhawk-notif-dropdown" @click.stop>
    <!-- Dropdown Header -->
    <div class="hushhawk-notif-head">
      <div class="head-title-wrap">
        <span class="bell-icon" v-html="icons.bell"></span>
        <strong>Escrow &amp; Pipeline Alerts</strong>
        <span class="unread-pill" :class="{ 'has-unread': unreadCount > 0 }">
          {{ unreadCount }} unread
        </span>
      </div>
      <button 
        v-if="unreadCount > 0" 
        type="button" 
        class="mark-all-btn" 
        @click.stop="handleMarkAllAsRead"
        title="Mark all notifications as read"
      >
        Mark all read
      </button>
    </div>

    <!-- Dropdown Body / Scroll List -->
    <div v-if="notifications.length" class="hushhawk-notif-list">
      <div 
        v-for="n in notifications" 
        :key="n.id || n.notification_id" 
        class="hushhawk-notif-card"
        :class="{ 'is-unread': !n.is_read }"
        @click="handleCardClick(n)"
      >
        <!-- Icon Category Badge -->
        <span class="notif-badge-icon" :class="n.color || 'blue'" v-html="getIcon(n.icon)"></span>

        <!-- Content Area -->
        <div class="notif-content">
          <div class="notif-content-top">
            <strong class="notif-title">{{ n.title }}</strong>
            <span v-if="!n.is_read" class="unread-glow-dot" title="Unread"></span>
          </div>
          <p class="notif-body">{{ n.body }}</p>
          <div class="notif-meta">
            <span class="notif-category">{{ n.category || 'SYSTEM' }}</span>
            <span class="notif-time">{{ n.time || 'Recent' }}</span>
            <button 
              type="button" 
              class="notif-delete-btn" 
              @click.stop="deleteNotification(n.id || n.notification_id)" 
              title="Dismiss notification"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="hushhawk-notif-empty">
      <span class="empty-icon" v-html="icons.bell"></span>
      <p class="empty-title">All caught up!</p>
      <small>No unread alerts. Real-time updates from Podio, Qualia escrow, and county data ingestion will stream here.</small>
    </div>

    <!-- Dropdown Footer -->
    <div v-if="notifications.length" class="hushhawk-notif-foot">
      <button type="button" class="clear-btn" @click.stop="clearAll">
        Clear all alerts
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useNotifications } from '@/_common/use/useNotifications.js';

export default {
  name: 'HushHawkNotificationDropdown',
  props: {
    icons: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['close', 'navigate'],
  setup(props, { emit }) {
    const {
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll
    } = useNotifications();

    function getIcon(iconName) {
      if (props.icons && props.icons[iconName]) {
        return props.icons[iconName];
      }
      return props.icons?.bell || '';
    }

    function handleCardClick(n) {
      markAsRead(n.id || n.notification_id);
      if (n.action_url) {
        emit('navigate', n.action_url);
        if (typeof window !== 'undefined') {
          window.location.href = n.action_url;
        }
      }
    }

    function handleMarkAllAsRead() {
      markAllAsRead();
    }

    return {
      notifications,
      unreadCount,
      loading,
      getIcon,
      handleCardClick,
      handleMarkAllAsRead,
      deleteNotification,
      clearAll
    };
  }
};
</script>

<style scoped>
.hushhawk-notif-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 340px;
  max-width: 90vw;
  background: linear-gradient(165deg, #0a213a 0%, #061526 100%);
  border: 1px solid rgba(212, 175, 55, 0.28);
  border-radius: 12px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95), 0 0 20px rgba(212, 175, 55, 0.1);
  padding: 0.85rem;
  z-index: 999999;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  font-family: inherit;
  color: #e2e8f0;
}

.hushhawk-notif-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.5rem;
}

.head-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #f8fafc;
}

.bell-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  color: #d4af37;
}

.unread-pill {
  font-size: 0.68rem;
  font-weight: 600;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 7px;
  border-radius: 999px;
}

.unread-pill.has-unread {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
}

.mark-all-btn {
  background: transparent;
  border: none;
  color: #38bdf8;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.mark-all-btn:hover {
  background: rgba(56, 189, 248, 0.12);
  text-decoration: underline;
}

.hushhawk-notif-list {
  max-height: 380px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-right: 2px;
}

.hushhawk-notif-list::-webkit-scrollbar {
  width: 4px;
}
.hushhawk-notif-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
}

.hushhawk-notif-card {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.6rem 0.65rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.15s ease;
}

.hushhawk-notif-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(212, 175, 55, 0.25);
}

.hushhawk-notif-card.is-unread {
  background: rgba(56, 189, 248, 0.05);
  border-left: 3px solid #38bdf8;
}

.notif-badge-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}

.notif-badge-icon.green {
  background: rgba(16, 185, 129, 0.18);
  color: #34d399;
}
.notif-badge-icon.gold {
  background: rgba(212, 175, 55, 0.18);
  color: #fbbf24;
}
.notif-badge-icon.cyan {
  background: rgba(6, 182, 212, 0.18);
  color: #22d3ee;
}
.notif-badge-icon.blue {
  background: rgba(59, 130, 246, 0.18);
  color: #60a5fa;
}
.notif-badge-icon.red {
  background: rgba(239, 68, 68, 0.18);
  color: #f87171;
}

.notif-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.notif-content-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notif-title {
  font-size: 0.78rem;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-glow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 8px #38bdf8;
  flex-shrink: 0;
}

.notif-body {
  font-size: 0.72rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.35;
}

.notif-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 0.65rem;
}

.notif-category {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.07);
  color: #cbd5e1;
  letter-spacing: 0.5px;
}

.notif-time {
  color: #64748b;
  margin-left: auto;
}

.notif-delete-btn {
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 3px;
  transition: color 0.15s ease;
}

.notif-delete-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
}

.hushhawk-notif-empty {
  padding: 24px 16px;
  text-align: center;
  color: #64748b;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.empty-icon {
  width: 24px;
  height: 24px;
  color: #475569;
  margin-bottom: 2px;
}

.empty-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
  margin: 0;
}

.hushhawk-notif-empty small {
  font-size: 0.68rem;
  line-height: 1.4;
}

.hushhawk-notif-foot {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 0.4rem;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 0.68rem;
  cursor: pointer;
  transition: color 0.15s ease;
}

.clear-btn:hover {
  color: #f87171;
}
</style>

