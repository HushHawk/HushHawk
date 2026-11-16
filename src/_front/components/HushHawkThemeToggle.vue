<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const isDark = computed(() => store.getters['front/getTheme'] === 'dark');
const label = computed(() => isDark.value ? 'Switch to light theme' : 'Switch to dark theme');

function toggleTheme() {
    store.dispatch('front/setTheme', isDark.value ? 'light' : 'dark');
}
</script>

<template>
    <button type="button" class="hh-theme-toggle" :aria-label="label" :title="label" @click="toggleTheme">
        <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19m0-14-1.4 1.4M6.4 17.6 5 19"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 13.1A9 9 0 0 1 10.9 3 9 9 0 1 0 21 13.1Z"/>
        </svg>
    </button>
</template>

<style scoped>
.hh-theme-toggle {
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    padding: 0;
    border: 1px solid #ae905a80;
    border-radius: 8px;
    background: var(--hh-control, #151f2e);
    color: var(--hh-gold, #eac16a);
    cursor: pointer;
}
.hh-theme-toggle svg { width: 17px; height: 17px; }
.hh-theme-toggle:hover { border-color: currentColor; }
</style>
