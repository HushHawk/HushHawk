<template>
     <!-- wwFront:start -->
    <router-view />
    <HawkAdminCopilot />
    <PartnerChatMessenger />
    <!-- wwFront:end -->
</template>

<script>
import { reactive, computed, provide, onMounted, watch } from 'vue';
import HawkAdminCopilot from './components/HawkAdminCopilot.vue';
import PartnerChatMessenger from './components/PartnerChatMessenger.vue';

export default {
    components: {
        HawkAdminCopilot,
        PartnerChatMessenger,
    },
    setup() {
        const wwFrontState = reactive({
            lang: computed(() => wwLib.$store.getters['front/getLang']),
            pageId: computed(() => wwLib.$store.getters['websiteData/getPageId']),
            screenSize: computed(() => wwLib.$store.getters['front/getScreenSize']),
            screenSizes: computed(() => wwLib.$store.getters['front/getScreenSizes']),
        });
        provide('wwFrontState', wwFrontState);

     },
};
</script>

<style>
 </style>
