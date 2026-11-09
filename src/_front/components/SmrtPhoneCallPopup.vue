<template>
  <transition name="call-pop-slide">
    <div v-if="call && isVisible" class="smrtphone-popup-container">
      <div class="smrtphone-card">
        <!-- Top Status Bar -->
        <div class="card-status-bar">
          <div class="status-live-pill">
            <span class="live-pulse-dot"></span>
            <span class="status-live-text">SMRTPHONE INBOUND CALL</span>
          </div>
          <div class="status-right-meta">
            <span class="call-timer font-mono">{{ displayTimer }}</span>
            <button class="call-dismiss-btn" @click="dismissCall" title="Dismiss Call Screen" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <!-- Caller ID Body -->
        <div class="card-caller-body">
          <div class="caller-avatar-ring">
            <div class="caller-avatar-circle">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFDF73" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <span class="ring-ripple"></span>
          </div>

          <div class="caller-details">
            <div class="caller-name-row">
              <strong class="caller-name">{{ call.contactName || 'Motivated Seller' }}</strong>
              <span class="caller-signal-badge">{{ call.signal || 'FORECLOSURE' }}</span>
            </div>
            <div class="caller-phone font-mono">{{ call.fromNumber || '(904) 555-0144' }}</div>
            <div class="caller-property">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>{{ call.propertyAddress || 'Duval County, Jacksonville FL' }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="card-action-bar">
          <button class="btn-action-primary" @click="openCommunications" title="Answer & Open Omnichannel Comms">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span>Open Comms &amp; Call</span>
          </button>

          <button class="btn-action-secondary" @click="openPropertyDossier" title="View Property Intel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Property Dossier</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'SmrtPhoneCallPopup',
  data() {
    return {
      call: null,
      isVisible: false,
      secondsElapsed: 0,
      pollInterval: null,
      timerInterval: null,
      lastDismissedCallId: null
    };
  },
  computed: {
    displayTimer() {
      const mins = Math.floor(this.secondsElapsed / 60);
      const secs = this.secondsElapsed % 60;
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  },
  mounted() {
    this.checkActiveCall();
    this.pollInterval = setInterval(this.checkActiveCall, 3500);

    // Global event listener for instant sub-second trigger from local simulations
    window.addEventListener('hushhawk-incoming-call', this.handleIncomingCallEvent);
  },
  beforeUnmount() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);
    window.removeEventListener('hushhawk-incoming-call', this.handleIncomingCallEvent);
  },
  methods: {
    async checkActiveCall() {
      try {
        const res = await fetch('/api/v1/integrations/smrtphone/active-call');
        if (res.ok) {
          const data = await res.json();
          if (data && data.activeCall && data.activeCall.callId !== this.lastDismissedCallId) {
            if (!this.call || this.call.callId !== data.activeCall.callId) {
              this.onNewCallArrived(data.activeCall);
            }
          }
        }
      } catch (err) {
        // Silently tolerate temporary network blip
      }
    },
    handleIncomingCallEvent(e) {
      if (e.detail && e.detail.call) {
        this.onNewCallArrived(e.detail.call);
      }
    },
    onNewCallArrived(callData) {
      this.call = callData;
      this.isVisible = true;
      this.secondsElapsed = 0;
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        this.secondsElapsed++;
      }, 1000);

      this.playCallChime();
    },
    playCallChime() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.setValueAtTime(880.00, now + 0.15); // A5

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(293.66, now); // D4
        osc2.frequency.setValueAtTime(440.00, now + 0.15); // A4

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
      } catch (_) {
        // Ignore audio policy blocks
      }
    },
    async dismissCall() {
      if (this.call) {
        this.lastDismissedCallId = this.call.callId;
      }
      this.isVisible = false;
      if (this.timerInterval) clearInterval(this.timerInterval);
      try {
        await fetch('/api/v1/integrations/smrtphone/dismiss-call', { method: 'POST' });
      } catch (_) {}
    },
    openCommunications() {
      this.dismissCall();
      if (this.$router) {
        this.$router.push('/communications');
      } else {
        window.location.href = '/communications';
      }
    },
    openPropertyDossier() {
      this.dismissCall();
      if (this.$router) {
        this.$router.push('/properties');
      } else {
        window.location.href = '/properties';
      }
    }
  }
};
</script>

<style scoped>
.smrtphone-popup-container {
  position: fixed;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  width: min(460px, calc(100vw - 24px));
  z-index: 9999999;
  pointer-events: auto;
}

.smrtphone-card {
  background: linear-gradient(135deg, #04182D 0%, #0A223C 100%);
  border: 1.5px solid #D4AF37;
  border-radius: 12px;
  box-shadow: 0 16px 40px rgba(4, 24, 45, 0.85), 0 0 24px rgba(212, 175, 55, 0.35);
  padding: 12px 16px;
  color: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  animation: cardEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardEntrance {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.card-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 10px;
}

.status-live-pill {
  display: flex;
  align-items: center;
  gap: 7px;
}

.live-pulse-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: pulseDot 1.4s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.6; }
}

.status-live-text {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #4ade80;
  text-transform: uppercase;
}

.status-right-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.call-timer {
  font-size: 0.72rem;
  color: #FFDF73;
  font-weight: 600;
}

.call-dismiss-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.call-dismiss-btn:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.1);
}

/* Caller Body */
.card-caller-body {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.caller-avatar-ring {
  position: relative;
  flex-shrink: 0;
}

.caller-avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0A223C 0%, #17385E 100%);
  border: 1.5px solid #D4AF37;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-ripple {
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 50%;
  border: 1px solid rgba(74, 222, 128, 0.6);
  animation: rippleGlow 2s infinite;
}

@keyframes rippleGlow {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.35); opacity: 0; }
}

.caller-details {
  flex: 1;
  min-width: 0;
}

.caller-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.caller-name {
  font-size: 0.95rem;
  color: #ffffff;
  font-weight: 700;
}

.caller-signal-badge {
  font-size: 0.62rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.4);
  letter-spacing: 0.3px;
}

.caller-phone {
  font-size: 0.78rem;
  color: #FFDF73;
  margin: 2px 0;
}

.caller-property {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Action Bar */
.card-action-bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.btn-action-primary {
  background: linear-gradient(135deg, #FFDF73 0%, #D4AF37 100%);
  border: none;
  color: #04182D;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-action-primary:hover {
  filter: brightness(1.1);
  box-shadow: 0 0 12px rgba(255, 223, 115, 0.5);
}

.btn-action-secondary {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #f8fafc;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.btn-action-secondary:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: #D4AF37;
  color: #FFDF73;
}

/* Slide Transition */
.call-pop-slide-enter-active,
.call-pop-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.call-pop-slide-enter-from,
.call-pop-slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -24px);
}
</style>
