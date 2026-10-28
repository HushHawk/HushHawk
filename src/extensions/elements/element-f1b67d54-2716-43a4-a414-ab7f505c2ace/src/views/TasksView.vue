<template>
  <div class="view-container">
    <!-- Top Metrics -->
    <div class="metrics-grid">
      <div v-for="(m, i) in metrics" :key="m.label" class="metric-card">
        <div class="metric-icon-wrap" :class="{ red: i === 2, gold: i === 1, cyan: i === 0, green: i === 3 }">
          <span v-html="icons[m.icon]"></span>
        </div>
        <div class="metric-info">
          <span class="metric-label">{{ m.label }}</span>
          <strong class="metric-val">{{ m.value }}</strong>
          <span class="metric-change" :class="{ positive: m.change.includes('+'), negative: m.change.includes('-') }">
            {{ m.change }}
          </span>
        </div>
      </div>
    </div>

    <!-- Main Workspace -->
    <div class="main-panel">
      <div class="panel-header">
        <div class="header-left">
          <h2>
            <span class="icon-title" v-html="icons.tasks"></span>
            Wholesale Operations &amp; Title Escrow Task Matrix
          </h2>
          <span class="badge-count">{{ filteredTasks.length }} active tasks</span>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" @click="isAddModalOpen = true">
            <span v-html="icons.plus"></span>
            Create Task
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-toolbar">
        <div class="search-box">
          <span v-html="icons.search"></span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search task title, assigned rep, deal address, or milestone..."
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
            <span v-html="icons.close"></span>
          </button>
        </div>

        <div class="filter-group">
          <label>Category:</label>
          <select v-model="categoryFilter">
            <option value="">All Categories</option>
            <option value="Title & Escrow">Title &amp; Escrow</option>
            <option value="Acquisitions">Acquisitions</option>
            <option value="Dispositions">Dispositions</option>
            <option value="Underwriting">Underwriting</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Priority:</label>
          <select v-model="priorityFilter">
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent / Escrow Milestone</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Assignee:</label>
          <select v-model="assigneeFilter">
            <option value="">All Reps</option>
            <option value="Marcus Vance">Marcus Vance</option>
            <option value="Sarah Jenkins">Sarah Jenkins</option>
            <option value="Elena Rostova">Elena Rostova</option>
          </select>
        </div>

        <button v-if="hasActiveFilters" class="btn btn-subtle" @click="resetFilters">
          <span v-html="icons.refresh"></span>
          Reset
        </button>
      </div>

      <!-- Tasks Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th width="40">Status</th>
              <th>Task Description</th>
              <th>Linked Asset / Deal</th>
              <th>Category</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Assigned Rep</th>
              <th width="80">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="task in filteredTasks"
              :key="task.id"
              :class="{ completed: task.done }"
            >
              <td>
                <button
                  class="checkbox-btn"
                  :class="{ checked: task.done }"
                  @click="toggleTask(task)"
                >
                  <span v-if="task.done" v-html="icons.check"></span>
                </button>
              </td>
              <td>
                <div class="task-title-cell">
                  <span class="task-title" :class="{ strike: task.done }">{{ task.title }}</span>
                  <span class="task-desc">{{ task.description }}</span>
                </div>
              </td>
              <td>
                <div v-if="task.deal" class="deal-cell">
                  <span class="deal-addr">
                    <span v-html="icons.pin" class="tiny-icon"></span>
                    {{ task.deal }}
                  </span>
                  <span class="deal-parcel font-mono">{{ task.parcel }}</span>
                </div>
                <span v-else class="text-muted">General Operation</span>
              </td>
              <td>
                <span class="category-chip" :class="task.category.toLowerCase().replace(/[\s&]+/g, '-')">
                  {{ task.category }}
                </span>
              </td>
              <td>
                <span class="due-pill" :class="task.dueStatus.toLowerCase()">
                  {{ task.dueDate }}
                </span>
              </td>
              <td>
                <span class="priority-badge" :class="task.priority.toLowerCase()">
                  {{ task.priority }}
                </span>
              </td>
              <td>
                <div class="rep-chip">
                  <span class="rep-avatar">{{ task.repInitials }}</span>
                  <span>{{ task.assignee }}</span>
                </div>
              </td>
              <td>
                <div class="action-wrap">
                  <button class="btn btn-subtle btn-sm" title="Delete Task" @click="deleteTask(task.id)">
                    <span v-html="icons.trash"></span>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredTasks.length === 0">
              <td colspan="8" class="empty-state">
                <div class="empty-box">
                  <span class="empty-icon" v-html="icons.tasks"></span>
                  <p>No wholesale tasks match your filter criteria.</p>
                  <button class="btn btn-secondary" @click="resetFilters">Reset Filters</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Task Modal -->
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.tasks"></span>
            Create Wholesale Operational Task
          </h3>
          <button class="close-btn" @click="isAddModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <form class="modal-body" @submit.prevent="saveNewTask">
          <div class="form-grid">
            <div class="form-group full">
              <label>Task Title *</label>
              <input v-model="newTask.title" type="text" required placeholder="e.g. Request Title Search on Commonwealth" />
            </div>
            <div class="form-group full">
              <label>Linked Deal / Address</label>
              <input v-model="newTask.deal" type="text" placeholder="e.g. 4218 Commonwealth Ave, Jacksonville, FL" />
            </div>
            <div class="form-group">
              <label>Category</label>
              <select v-model="newTask.category">
                <option value="Title & Escrow">Title &amp; Escrow</option>
                <option value="Acquisitions">Acquisitions</option>
                <option value="Dispositions">Dispositions</option>
                <option value="Underwriting">Underwriting</option>
              </select>
            </div>
            <div class="form-group">
              <label>Priority</label>
              <select v-model="newTask.priority">
                <option value="Urgent">Urgent / Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div class="form-group">
              <label>Due Date</label>
              <input v-model="newTask.dueDate" type="text" placeholder="Today 5:00 PM" />
            </div>
            <div class="form-group">
              <label>Assign To</label>
              <select v-model="newTask.assignee">
                <option value="Marcus Vance">Marcus Vance</option>
                <option value="Sarah Jenkins">Sarah Jenkins</option>
                <option value="Elena Rostova">Elena Rostova</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Description &amp; Checklist Instructions</label>
              <textarea v-model="newTask.description" rows="3" placeholder="Confirm wire transfer receipt and municipal lien estoppel with closing officer..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Task</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'TasksView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      searchQuery: '',
      categoryFilter: '',
      priorityFilter: '',
      assigneeFilter: '',
      isAddModalOpen: false,
      metrics: [
        { label: 'Open Tasks', value: '18', change: '8 on track', icon: 'tasks' },
        { label: 'Due Today', value: '7', change: 'Escrow heavy', icon: 'clock' },
        { label: 'Overdue Milestones', value: '2', change: '-1 resolved', icon: 'bell' },
        { label: 'Completed This Week', value: '41', change: '+18% velocity', icon: 'check' }
      ],
      newTask: {
        title: '',
        deal: '',
        category: 'Title & Escrow',
        priority: 'High',
        dueDate: 'Today 5:00 PM',
        assignee: 'Marcus Vance',
        description: ''
      },
      tasks: [
        {
          id: 1,
          title: 'Deposit $2,500 Earnest Money (EMD) to First American',
          description: 'Wire confirmation must be uploaded to title portal for PSA-2026-084.',
          deal: '4812 Moncrief Rd, Jacksonville, FL 32208',
          parcel: 'DUV-091823-0001',
          category: 'Title & Escrow',
          dueDate: 'Today 2:00 PM',
          dueStatus: 'urgent',
          priority: 'Urgent',
          assignee: 'Sarah Jenkins',
          repInitials: 'SJ',
          done: false
        },
        {
          id: 2,
          title: 'Verify Cash Buyer Proof of Funds ($160k liquid)',
          description: 'River City Flip Fund submitted letter of intent for 23rd St.',
          deal: '1540 W 23rd St, Jacksonville, FL 32209',
          parcel: 'DUV-084721-0034',
          category: 'Dispositions',
          dueDate: 'Today 4:30 PM',
          dueStatus: 'today',
          priority: 'High',
          assignee: 'Sarah Jenkins',
          repInitials: 'SJ',
          done: false
        },
        {
          id: 3,
          title: 'Contractor Walkthrough & Roof Leak Estimate',
          description: 'Meet Precision Roofing Jax at property to inspect rear bedroom slope.',
          deal: '4218 Commonwealth Ave, Jacksonville, FL 32254',
          parcel: 'DUV-091822-0001',
          category: 'Underwriting',
          dueDate: 'Tomorrow 10:00 AM',
          dueStatus: 'upcoming',
          priority: 'High',
          assignee: 'Marcus Vance',
          repInitials: 'MV',
          done: false
        },
        {
          id: 4,
          title: 'Order Duval County Code Enforcement Estoppel',
          description: 'Check municipal weed lien status and magistrate fine schedule.',
          deal: '1105 Dunn Ave, Jacksonville, FL 32218',
          parcel: 'DUV-062810-0019',
          category: 'Title & Escrow',
          dueDate: 'Overdue 1 day',
          dueStatus: 'overdue',
          priority: 'Urgent',
          assignee: 'Elena Rostova',
          repInitials: 'ER',
          done: false
        },
        {
          id: 5,
          title: 'Send Assignment Contract for E-Signature to Apex Holdings',
          description: '$37,000 wholesale assignment spread. $5,000 non-refundable deposit.',
          deal: '1540 W 23rd St, Jacksonville, FL 32209',
          parcel: 'DUV-084721-0034',
          category: 'Dispositions',
          dueDate: 'Today 6:00 PM',
          dueStatus: 'today',
          priority: 'High',
          assignee: 'Sarah Jenkins',
          repInitials: 'SJ',
          done: false
        },
        {
          id: 6,
          title: 'Pull Recent Cash Sales Comps within 0.5-Mile Radius',
          description: 'Normandy Blvd area has had 3 wholesale flips recorded in last 45 days.',
          deal: '8824 Normandy Blvd, Jacksonville, FL 32221',
          parcel: 'DUV-041920-0112',
          category: 'Acquisitions',
          dueDate: 'Friday',
          dueStatus: 'upcoming',
          priority: 'Medium',
          assignee: 'Elena Rostova',
          repInitials: 'ER',
          done: true
        }
      ]
    };
  },
  computed: {
    hasActiveFilters() {
      return Boolean(this.searchQuery || this.categoryFilter || this.priorityFilter || this.assigneeFilter);
    },
    filteredTasks() {
      return this.tasks.filter(t => {
        if (this.categoryFilter && t.category !== this.categoryFilter) return false;
        if (this.priorityFilter && t.priority !== this.priorityFilter) return false;
        if (this.assigneeFilter && t.assignee !== this.assigneeFilter) return false;
        if (this.searchQuery) {
          const q = this.searchQuery.toLowerCase();
          return (
            t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            (t.deal && t.deal.toLowerCase().includes(q)) ||
            t.assignee.toLowerCase().includes(q)
          );
        }
        return true;
      });
    }
  },
  methods: {
    toggleTask(t) {
      t.done = !t.done;
      if (t.done && typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Milestone Completed', `"${t.title.slice(0, 40)}..." marked complete.`, 'success');
      }
    },
    deleteTask(id) {
      const task = this.tasks.find(t => t.id === id);
      this.tasks = this.tasks.filter(t => t.id !== id);
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Task Removed', `"${task ? task.title.slice(0, 35) : ''}..." removed from task matrix.`, 'info');
      }
    },
    resetFilters() {
      this.searchQuery = '';
      this.categoryFilter = '';
      this.priorityFilter = '';
      this.assigneeFilter = '';
    },
    saveNewTask() {
      const id = Date.now();
      const initials = this.newTask.assignee.split(' ').map(n => n[0]).join('');
      const assignedRep = this.newTask.assignee;
      const taskTitle = this.newTask.title;
      this.tasks.unshift({
        id,
        title: this.newTask.title,
        description: this.newTask.description,
        deal: this.newTask.deal,
        parcel: 'DUV-' + Math.floor(100000 + Math.random() * 900000) + '-0000',
        category: this.newTask.category,
        dueDate: this.newTask.dueDate,
        dueStatus: 'today',
        priority: this.newTask.priority,
        assignee: this.newTask.assignee,
        repInitials: initials,
        done: false
      });
      this.isAddModalOpen = false;
      if (typeof window.showHushHawkToast === 'function') {
        window.showHushHawkToast('Task Created', `"${taskTitle.slice(0, 35)}..." assigned to ${assignedRep}.`, 'success');
      }
      this.newTask = {
        title: '',
        deal: '',
        category: 'Title & Escrow',
        priority: 'High',
        dueDate: 'Today 5:00 PM',
        assignee: 'Marcus Vance',
        description: ''
      };
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

.metric-icon-wrap.red {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
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

.metric-change.negative {
  color: #f87171;
}

.main-panel {
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

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-left h2 {
  font-size: 1.15rem;
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

.badge-count {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  color: #94a3b8;
}

.filter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  flex: 1;
  min-width: 220px;
}

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: #f8fafc;
  font-size: 0.85rem;
  width: 100%;
}

.clear-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.filter-group label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.filter-group select {
  background: #04182d;
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-size: 0.8rem;
  outline: none;
}

.table-container {
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  text-align: left;
}

.data-table th {
  background: rgba(255, 255, 255, 0.03);
  color: #94a3b8;
  padding: 0.75rem 0.9rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.data-table td {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
}

.data-table tr.completed {
  opacity: 0.5;
}

.checkbox-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4ade80;
}

.checkbox-btn.checked {
  background: rgba(74, 222, 128, 0.2);
  border-color: #4ade80;
}

.task-title-cell {
  display: flex;
  flex-direction: column;
}

.task-title {
  font-weight: 600;
  color: #f8fafc;
}

.task-title.strike {
  text-decoration: line-through;
  color: #94a3b8;
}

.task-desc {
  font-size: 0.75rem;
  color: #94a3b8;
}

.deal-cell {
  display: flex;
  flex-direction: column;
}

.deal-addr {
  font-size: 0.8rem;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.deal-parcel {
  font-size: 0.7rem;
  color: #edcf7c;
}

.category-chip {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  color: #cbd5e1;
}

.due-pill {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.due-pill.urgent, .due-pill.overdue {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.due-pill.today {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.due-pill.upcoming {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.priority-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.priority-badge.urgent {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.priority-badge.high {
  background: rgba(237, 207, 124, 0.15);
  color: #edcf7c;
}

.priority-badge.medium {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.rep-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.rep-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #1e293b;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
}

.font-mono {
  font-family: monospace;
}

.tiny-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
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

.btn-primary {
  background: #edcf7c;
  color: #04182d;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-subtle {
  background: transparent;
  color: #94a3b8;
}

.btn-subtle:hover {
  color: #f8fafc;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: #07192d;
  border: 1px solid rgba(237, 207, 124, 0.3);
  border-radius: 12px;
  width: 100%;
  max-width: 540px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h3 {
  font-size: 1.05rem;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.form-group label {
  font-size: 0.75rem;
  color: #94a3b8;
}

.form-group input,
.form-group select,
.form-group textarea {
  background: #04182d;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  color: #f8fafc;
  font-size: 0.825rem;
  outline: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.close-btn {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

@media (max-width: 1024px) {
  .metrics-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
