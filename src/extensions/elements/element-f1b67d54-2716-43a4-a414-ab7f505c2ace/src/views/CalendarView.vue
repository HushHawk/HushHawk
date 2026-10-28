<template>
  <div class="view-container">
    <div class="calendar-header">
      <div class="header-left">
        <h2>
          <span class="icon-title" v-html="icons.calendar"></span>
          Wholesale Closing &amp; Walkthrough Schedule
        </h2>
        <span class="calendar-sub">Jacksonville In-Field &amp; Title Operations</span>
      </div>
      <div class="header-controls">
        <div class="view-switcher">
          <button
            v-for="v in ['Week', 'Month', 'Agenda']"
            :key="v"
            class="pill-btn"
            :class="{ active: currentView === v }"
            @click="currentView = v"
          >
            {{ v }}
          </button>
        </div>
        <button class="btn btn-primary" @click="isAddModalOpen = true">
          <span v-html="icons.plus"></span>
          Book Appointment
        </button>
      </div>
    </div>

    <!-- Filter Pills by Event Type -->
    <div class="type-filter-bar">
      <button
        v-for="t in eventTypes"
        :key="t.name"
        class="type-pill"
        :class="{ active: selectedType === t.name }"
        @click="selectedType = selectedType === t.name ? '' : t.name"
      >
        <span class="type-dot" :style="{ backgroundColor: t.color }"></span>
        {{ t.name }}
      </button>
    </div>

    <!-- Main Calendar Display -->
    <div class="calendar-workspace">
      <!-- Week View Schedule -->
      <div v-if="currentView === 'Week'" class="week-grid">
        <div v-for="day in weekDays" :key="day.date" class="day-column" :class="{ today: day.isToday }">
          <div class="day-header">
            <span class="day-name">{{ day.name }}</span>
            <span class="day-num">{{ day.num }}</span>
          </div>
          <div class="day-events">
            <div
              v-for="ev in getEventsForDay(day.date)"
              :key="ev.id"
              class="event-card"
              :style="{ borderLeftColor: ev.color }"
              @click="selectEvent(ev)"
            >
              <div class="ev-time">
                <span v-html="icons.clock" class="tiny-icon"></span>
                {{ ev.time }}
              </div>
              <strong class="ev-title">{{ ev.title }}</strong>
              <span class="ev-addr">
                <span v-html="icons.pin" class="tiny-icon"></span>
                {{ ev.address }}
              </span>
              <div class="ev-footer">
                <span class="ev-type-badge" :style="{ color: ev.color }">{{ ev.type }}</span>
                <span class="ev-rep">{{ ev.repInitials }}</span>
              </div>
            </div>
            <div v-if="getEventsForDay(day.date).length === 0" class="no-events-slot">
              No field visits
            </div>
          </div>
        </div>
      </div>

      <!-- Agenda View -->
      <div v-else class="agenda-list">
        <div v-for="ev in filteredEvents" :key="ev.id" class="agenda-item" @click="selectEvent(ev)">
          <div class="agenda-date-col">
            <span class="agenda-month">OCT</span>
            <strong class="agenda-day">{{ ev.dayNum }}</strong>
          </div>
          <div class="agenda-main">
            <div class="agenda-top">
              <h4>{{ ev.title }}</h4>
              <span class="agenda-type" :style="{ color: ev.color, backgroundColor: ev.color + '22' }">{{ ev.type }}</span>
            </div>
            <div class="agenda-details">
              <span><strong>Time:</strong> {{ ev.time }}</span>
              <span><strong>Address:</strong> {{ ev.address }}</span>
              <span><strong>Assigned:</strong> {{ ev.rep }}</span>
              <span v-if="ev.lockbox"><strong>Lockbox:</strong> <code class="font-mono text-gold">{{ ev.lockbox }}</code></span>
            </div>
          </div>
          <div class="agenda-action">
            <button class="btn btn-secondary btn-sm" @click.stop="selectEvent(ev)">Details</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <div v-if="selectedEvent" class="modal-overlay" @click.self="selectedEvent = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.calendar"></span>
            Appointment Dossier: {{ selectedEvent.type }}
          </h3>
          <button class="close-btn" @click="selectedEvent = null">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <div class="modal-body">
          <div class="event-dossier">
            <h4 class="dossier-title">{{ selectedEvent.title }}</h4>
            <div class="info-row">
              <span class="k">Date &amp; Time:</span>
              <span class="v">{{ selectedEvent.dateString }} at {{ selectedEvent.time }}</span>
            </div>
            <div class="info-row">
              <span class="k">Property Address:</span>
              <span class="v">{{ selectedEvent.address }}</span>
            </div>
            <div class="info-row">
              <span class="k">CrownKey Parcel:</span>
              <span class="v font-mono text-gold">{{ selectedEvent.parcelId }}</span>
            </div>
            <div class="info-row">
              <span class="k">Primary Contact:</span>
              <span class="v">{{ selectedEvent.contactName }} ({{ selectedEvent.phone }})</span>
            </div>
            <div class="info-row" v-if="selectedEvent.lockbox">
              <span class="k">Lockbox Code:</span>
              <span class="v font-mono text-gold bold-box">{{ selectedEvent.lockbox }}</span>
            </div>
            <div class="info-row">
              <span class="k">Assigned Lead Rep:</span>
              <span class="v">{{ selectedEvent.rep }}</span>
            </div>
            <div class="event-notes-card">
              <span class="k">Walkthrough Notes / Instructions:</span>
              <p>{{ selectedEvent.notes }}</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="selectedEvent = null">Close</button>
          <button class="btn btn-primary" @click="sendDirections(selectedEvent)">
            <span v-html="icons.send"></span>
            SMS Directions &amp; Lockbox
          </button>
        </div>
      </div>
    </div>

    <!-- Book Appointment Modal -->
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>
            <span v-html="icons.calendar"></span>
            Book Field Appointment / Walkthrough
          </h3>
          <button class="close-btn" @click="isAddModalOpen = false">
            <span v-html="icons.close"></span>
          </button>
        </div>
        <form class="modal-body" @submit.prevent="saveNewAppointment">
          <div class="form-grid">
            <div class="form-group full">
              <label>Appointment Title *</label>
              <input v-model="newAppt.title" type="text" required placeholder="e.g. Seller Walkthrough & Offer Presentation" />
            </div>
            <div class="form-group full">
              <label>Property Address *</label>
              <input v-model="newAppt.address" type="text" required placeholder="e.g. 5214 Wilson Blvd, Jacksonville, FL" />
            </div>
            <div class="form-group">
              <label>Appointment Type</label>
              <select v-model="newAppt.type">
                <option value="Seller Walkthrough">Seller Walkthrough</option>
                <option value="Buyer Showing">VIP Buyer Showing</option>
                <option value="Inspection">Home Inspection</option>
                <option value="Title Closing">Title Wire &amp; Closing</option>
              </select>
            </div>
            <div class="form-group">
              <label>Assigned Rep</label>
              <select v-model="newAppt.rep">
                <option value="Marcus Vance">Marcus Vance</option>
                <option value="Sarah Jenkins">Sarah Jenkins</option>
                <option value="Elena Rostova">Elena Rostova</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input v-model="newAppt.date" type="text" placeholder="2026-10-27" />
            </div>
            <div class="form-group">
              <label>Time</label>
              <input v-model="newAppt.time" type="text" placeholder="2:00 PM" />
            </div>
            <div class="form-group">
              <label>Lockbox Code (if vacant)</label>
              <input v-model="newAppt.lockbox" type="text" placeholder="4821" />
            </div>
            <div class="form-group">
              <label>Contact Phone</label>
              <input v-model="newAppt.phone" type="tel" placeholder="(904) 555-0199" />
            </div>
            <div class="form-group full">
              <label>Field Notes / Entry Instructions</label>
              <textarea v-model="newAppt.notes" rows="3" placeholder="Seller prefers text confirmation 30 mins prior to arrival..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
            <button type="submit" class="btn btn-primary">Confirm Booking</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { icons } from '../icons.js';

export default {
  name: 'CalendarView',
  props: {
    content: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      icons,
      currentView: 'Week',
      selectedType: '',
      selectedEvent: null,
      isAddModalOpen: false,
      eventTypes: [
        { name: 'Seller Walkthrough', color: '#c084fc' },
        { name: 'Buyer Showing', color: '#38bdf8' },
        { name: 'Inspection', color: '#fb923c' },
        { name: 'Title Closing', color: '#4ade80' }
      ],
      weekDays: [
        { name: 'Mon', num: '26', date: '2026-10-26', isToday: true },
        { name: 'Tue', num: '27', date: '2026-10-27', isToday: false },
        { name: 'Wed', num: '28', date: '2026-10-28', isToday: false },
        { name: 'Thu', num: '29', date: '2026-10-29', isToday: false },
        { name: 'Fri', num: '30', date: '2026-10-30', isToday: false },
        { name: 'Sat', num: '31', date: '2026-10-31', isToday: false }
      ],
      newAppt: {
        title: '',
        address: '',
        type: 'Seller Walkthrough',
        rep: 'Marcus Vance',
        date: '2026-10-27',
        time: '2:00 PM',
        lockbox: '',
        phone: '',
        notes: ''
      },
      events: [
        {
          id: 1,
          date: '2026-10-26',
          dayNum: '26',
          dateString: 'Monday, Oct 26',
          time: '11:00 AM',
          title: 'Distressed Seller Home Inspection & Offer',
          address: '4218 Commonwealth Ave, Jacksonville, FL 32254',
          parcelId: 'DUV-091822-0001',
          type: 'Seller Walkthrough',
          color: '#c084fc',
          rep: 'Marcus Vance',
          repInitials: 'MV',
          contactName: 'Evelyn Richardson',
          phone: '(904) 555-0143',
          lockbox: 'MasterLock 2841',
          notes: 'Walk interior with contractor to finalize repair estimate on rear bedroom ceiling leak.'
        },
        {
          id: 2,
          date: '2026-10-26',
          dayNum: '26',
          dateString: 'Monday, Oct 26',
          time: '2:30 PM',
          title: 'VIP Buyer Showing (River City Flip Fund)',
          address: '1540 W 23rd St, Jacksonville, FL 32209',
          parcelId: 'DUV-084721-0034',
          type: 'Buyer Showing',
          color: '#38bdf8',
          rep: 'Sarah Jenkins',
          repInitials: 'SJ',
          contactName: 'David Ross',
          phone: '(904) 555-8911',
          lockbox: '4921',
          notes: 'Buyer verified $160k liquid funds. Looking for 65% ARV margin for rental portfolio.'
        },
        {
          id: 3,
          date: '2026-10-27',
          dayNum: '27',
          dateString: 'Tuesday, Oct 27',
          time: '10:00 AM',
          title: 'Precision Roofing Contractor Estimate',
          address: '8824 Normandy Blvd, Jacksonville, FL 32221',
          parcelId: 'DUV-041920-0112',
          type: 'Inspection',
          color: '#fb923c',
          rep: 'Marcus Vance',
          repInitials: 'MV',
          contactName: 'Patricia Delgado',
          phone: '(904) 555-3382',
          lockbox: 'Gate code #9041',
          notes: 'Evaluate complete shingle tear-off vs architectural overlay.'
        },
        {
          id: 4,
          date: '2026-10-29',
          dayNum: '29',
          dateString: 'Thursday, Oct 29',
          time: '2:00 PM',
          title: 'Title Wire Disbursal & Deed Recording',
          address: '4812 Moncrief Rd, Jacksonville, FL 32208',
          parcelId: 'DUV-091823-0001',
          type: 'Title Closing',
          color: '#4ade80',
          rep: 'Sarah Jenkins',
          repInitials: 'SJ',
          contactName: 'Crown Escrow (Lisa Miller)',
          phone: '(904) 555-2100',
          lockbox: '',
          notes: '$32,500 net assignment wire scheduled to HushHawk Capital operating account.'
        }
      ]
    };
  },
  computed: {
    filteredEvents() {
      if (!this.selectedType) return this.events;
      return this.events.filter(e => e.type === this.selectedType);
    }
  },
  methods: {
    getEventsForDay(date) {
      return this.filteredEvents.filter(e => e.date === date);
    },
    selectEvent(ev) {
      this.selectedEvent = ev;
    },
    showToast(title, message, type = 'info') {
      if (typeof window !== 'undefined') {
        if (window.showHushHawkToast) {
          window.showHushHawkToast(title, message, type);
        } else {
          window.dispatchEvent(new CustomEvent('hushhawk-toast', { detail: { title, message, type } }));
        }
      }
    },
    sendDirections(ev) {
      this.showToast('Lockbox & Access Dispatched', `Sent SMS with lockbox code (${ev.lockbox || 'N/A'}) and GPS directions to ${ev.contactName} (${ev.phone || '(904) 555-0199'}).`, 'success');
    },
    saveNewAppointment() {
      const id = Date.now();
      const typeObj = this.eventTypes.find(t => t.name === this.newAppt.type) || this.eventTypes[0];
      const initials = this.newAppt.rep.split(' ').map(n => n[0]).join('');
      this.events.push({
        id,
        date: this.newAppt.date,
        dayNum: this.newAppt.date.split('-')[2] || '27',
        dateString: this.newAppt.date,
        time: this.newAppt.time,
        title: this.newAppt.title,
        address: this.newAppt.address,
        parcelId: 'DUV-' + Math.floor(100000 + Math.random() * 900000) + '-0000',
        type: this.newAppt.type,
        color: typeObj.color,
        rep: this.newAppt.rep,
        repInitials: initials,
        contactName: 'Field Contact',
        phone: this.newAppt.phone || '(904) 555-0100',
        lockbox: this.newAppt.lockbox,
        notes: this.newAppt.notes
      });
      this.isAddModalOpen = false;
      this.newAppt = {
        title: '',
        address: '',
        type: 'Seller Walkthrough',
        rep: 'Marcus Vance',
        date: '2026-10-27',
        time: '2:00 PM',
        lockbox: '',
        phone: '',
        notes: ''
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

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left h2 {
  font-size: 1.2rem;
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

.calendar-sub {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 0.2rem;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.view-switcher {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.25rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.pill-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.pill-btn.active {
  background: #edcf7c;
  color: #04182d;
}

.type-filter-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
}

.type-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  cursor: pointer;
}

.type-pill.active {
  border-color: #edcf7c;
  background: rgba(237, 207, 124, 0.1);
  color: #f8fafc;
}

.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.calendar-workspace {
  background: #07192d;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.25rem;
  min-height: 500px;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
}

/* Week Grid */
.week-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(130px, 1fr));
  gap: 0.75rem;
  min-width: 0;
}

.day-column {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  min-height: 440px;
}

.day-column.today {
  border-color: rgba(237, 207, 124, 0.35);
  background: rgba(237, 207, 124, 0.03);
}

.day-header {
  padding: 0.65rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.day-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
}

.day-num {
  font-size: 0.85rem;
  font-weight: 700;
  color: #f8fafc;
}

.day-events {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.event-card {
  background: #0d2238;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-left: 3px solid #edcf7c;
  border-radius: 6px;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: all 0.15s ease;
}

.event-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.15);
}

.ev-time {
  font-size: 0.65rem;
  color: #edcf7c;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-weight: 600;
}

.ev-title {
  font-size: 0.75rem;
  color: #f8fafc;
  line-height: 1.25;
}

.ev-addr {
  font-size: 0.65rem;
  color: #94a3b8;
  display: flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ev-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.2rem;
}

.ev-type-badge {
  font-size: 0.65rem;
  font-weight: 600;
}

.ev-rep {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.no-events-slot {
  font-size: 0.7rem;
  color: #64748b;
  text-align: center;
  padding: 2rem 0.5rem;
  font-style: italic;
}

/* Agenda View */
.agenda-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.agenda-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.85rem 1.15rem;
  cursor: pointer;
}

.agenda-date-col {
  width: 44px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.agenda-month {
  font-size: 0.65rem;
  color: #94a3b8;
  font-weight: 700;
}

.agenda-day {
  font-size: 1.25rem;
  color: #edcf7c;
}

.agenda-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.agenda-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.agenda-top h4 {
  font-size: 0.95rem;
  color: #f8fafc;
  margin: 0;
}

.agenda-type {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-weight: 600;
}

.agenda-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.event-dossier {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dossier-title {
  font-size: 1.05rem;
  color: #f8fafc;
  margin: 0 0 0.5rem 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.825rem;
}

.info-row .k {
  color: #94a3b8;
}

.info-row .v {
  color: #f8fafc;
}

.bold-box {
  background: rgba(237, 207, 124, 0.15);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.event-notes-card {
  margin-top: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.event-notes-card .k {
  font-size: 0.7rem;
  color: #edcf7c;
  text-transform: uppercase;
}

.event-notes-card p {
  font-size: 0.8rem;
  color: #cbd5e1;
  margin: 0.25rem 0 0 0;
}

.font-mono {
  font-family: monospace;
}

.text-gold {
  color: #edcf7c;
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

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
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

@media (max-width: 1200px) {
  .week-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .week-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
