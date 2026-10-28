import emitter from 'tiny-emitter/instance';
import services from './services/index.js';
import { useIconsStore } from '@/pinia/icons';

 /* wwFront:start */
// eslint-disable-next-line no-undef
;
// The token maps of the newer types: `typeof` keeps an empty map when a publisher older than this code leaves the
// placeholder in place.
// eslint-disable-next-line no-undef
const LIBRARY_RADIUS = typeof {} === 'undefined' ? {} : {};
// eslint-disable-next-line no-undef
const LIBRARY_SHADOWS = typeof {} === 'undefined' ? {} : {};
// eslint-disable-next-line no-undef
const LIBRARY_BORDERS = typeof {} === 'undefined' ? {} : {};
/* wwFront:end */

import { computed, reactive } from 'vue';
import { useBackTableViewsStore } from '@/pinia/backTableViews.js';
import { useBackAuthStore } from '@/pinia/backAuth.js';
import { getRuntimeEnvironment } from '@/helpers/frontEnv.js';
import { useEnvVariablesStore } from '@/pinia/envVariables.js';
import { createEnvironmentVariablesContext } from './services/environmentVariables';

let runtimeActivationError;

export default {
    ...services,
     $on(event, fn) {
        emitter.on(event, fn);
    },
    $once(event, fn) {
        emitter.once(event, fn);
    },
    $emit(event, ...args) {
        if (!event) {
            return;
        }
        emitter.emit(event, ...args);
    },
    $off(event, fn) {
        emitter.off(event, fn);
    },
     front: {},
    $focus: null,
    env: process.env.NODE_ENV,
    runtimeActivated: false,
    async initFront({ router, store, staticRendering = false }) {
 
        this.front.router = router;
        /* wwFront:start */
        this.$store = store;
        /* wwFront:end */

        //Init services
        this.wwLog.init();

 
        await this.wwWebsiteData.init();
        this.wwLang.init(router);

        /* wwFront:start */
        // eslint-disable-next-line no-undef
        ;
        /* wwFront:end */

 
        if (!staticRendering) this.activateRuntime();
    },
    activateRuntime() {
        if (this.runtimeActivated) return;
        if (runtimeActivationError) throw runtimeActivationError;

        try {
            void this.wwPluginHelper.activatePlugins();
            services.scrollStore.start();
            services.keyboardEventStore.start();
            services.pwaStore.start();
            this.runtimeActivated = true;
        } catch (error) {
            runtimeActivationError = error;
            throw error;
        }
    },
     // TODO: Verify with Alexis, still uses wwImageMultiLang
    getResponsiveStyleProp({ store, style, uid, states = [], prop }) {
        store = store || wwLib.getFrontWindow().wwLib.$store;
        if (!style && uid) {
            const wwObject = this.$store.getters['websiteData/getWwObjects'][uid];
            if (!wwObject) return '';
            style = (wwObject._state || {}).style || {};
        }

        const screenSizes = store.getters['front/getScreenSizes'];
        const screenSize = store.getters['front/getScreenSize'];

        let value = '';

        for (const media in screenSizes) {
            if (style[media] && typeof style[media][prop] !== 'undefined') {
                value = style[media][prop];
            }
            if (media === screenSize) {
                break;
            }
        }
        for (const state of states) {
            for (const media in screenSizes) {
                if (style[`${state}_${media}`] && style[`${state}_${media}`][prop]) {
                    value = style[`${state}_${media}`][prop];
                }
                if (media === screenSize) {
                    break;
                }
            }
        }

        return value;
    },
    globalContext: reactive({
        auth: computed(() => {
            const backAuthStore = useBackAuthStore(wwLib.$pinia);
            return {
                user: backAuthStore.user,
                session: backAuthStore.session,
                isAuthenticated: backAuthStore.isAuthenticated,
            };
        }),
        env: computed(() => {
            const envVariablesStore = useEnvVariablesStore(wwLib.$pinia);
            let env = wwLib.getEnvironment();
            if (env === 'preview') env = 'production';
            return createEnvironmentVariablesContext(Object.values(envVariablesStore.values), env);
        }),
        tableViews: computed(() => {
            const backTableViewsStore = useBackTableViewsStore(wwLib.$pinia);
            return backTableViewsStore?.data;
        }),
        page: computed(() => {
            const page = wwLib.$store.getters['websiteData/getPage'];
            if (!page) return {};
            else if (!page.cmsDataSetPath) return { ...pageSanitizer(page) };
            return { ...pageSanitizer(page), data: wwLib.$store.getters['data/getPageCollectionData'] };
        }),
        pageParameters: computed(() => {
            const pageParameters = Object.values(wwLib.$store.getters['data/getPageParameterVariables']);
            const pageParametersValueMap = {};
            for (const pageParameter of pageParameters) pageParametersValueMap[pageParameter.id] = pageParameter.value;
            return pageParametersValueMap;
        }),
        pages: computed(() => {
            const pages = wwLib.$store.getters['websiteData/getPages'];
            const pagesValueMap = {};
            for (const page of pages) pagesValueMap[page.id] = pageSanitizer(page);
            return pagesValueMap;
        }),
        colors: computed(() => {
            const theme = wwLib.$store.getters['front/getTheme'];
             /* wwFront:start */
            // eslint-disable-next-line no-unreachable, no-undef
            return theme === 'dark' ? {"702de9b1-4d57-47c9-8102-295901b861fa":"#0A1128","17e69283-d00e-40b2-8a7e-1f2bcc91e18a":"#3B82F6","ba4e948c-58f3-4e38-afb7-0c76a5c8b472":"#0F172A","f325d1d5-41bf-4fea-bdc4-e18a2d9c68c6":"#10B981","00a0feb1-b4aa-4aff-bdca-2581e0ef5ede":"#451A03","44be636a-d119-460b-b86b-28551f7a6167":"#1E293B","7ed7258f-b6d6-4567-9f5a-2c7a6a684f12":"#450A0A","b563c8ea-b5cd-4950-ac34-983a20eacf71":"#EF4444","345378ae-c3e4-468f-a82e-8b99195ea6fe":"#064E3B","22b58d82-aeea-4274-b3f1-02d7adf016f5":"#F8FAFC","e133e327-b4a1-439d-be88-d91207b49f9d":"#CBD5E1","3855ae27-e908-4610-a572-f49058e6a426":"#F59E0B","1a7bb57f-a485-47e0-8fed-98ad7f553b6c":"#FFFFFF","71e24801-0356-4fdb-ac9c-9484bc84ef7c":"#1E293B","dacf6d89-481f-4709-a2ec-c8b13d22e0af":"#0F172A","e588e755-a402-48d1-9d28-822854fbe1ce":"#334155","5068cb3b-48bc-4dc8-a46f-eb6e0a8d2984":"#94A3B8","92c94e9a-6783-49fa-a06b-8c0dce50ed27":"#F59E0B","24bcac43-9e8c-40be-88da-e3619285b749":"#1E293B","614c2430-bcf4-4252-b7c2-725a94661f7a":"#EAB308","606b9809-8abd-44ce-b314-0b0ba43271b7":"#070B14","bcca0c9b-9e9b-4b4a-a20c-bf79b217d4c4":"#0D1527","8501043c-632a-401d-9413-d3523cdbce4e":"#111A30"} : {"702de9b1-4d57-47c9-8102-295901b861fa":"#0A1128","17e69283-d00e-40b2-8a7e-1f2bcc91e18a":"#1D4ED8","ba4e948c-58f3-4e38-afb7-0c76a5c8b472":"#0D1B2A","f325d1d5-41bf-4fea-bdc4-e18a2d9c68c6":"#16A34A","00a0feb1-b4aa-4aff-bdca-2581e0ef5ede":"#FFFBEB","44be636a-d119-460b-b86b-28551f7a6167":"#EFF6FF","7ed7258f-b6d6-4567-9f5a-2c7a6a684f12":"#FEF2F2","b563c8ea-b5cd-4950-ac34-983a20eacf71":"#DC2626","345378ae-c3e4-468f-a82e-8b99195ea6fe":"#ECFDF5","22b58d82-aeea-4274-b3f1-02d7adf016f5":"#0F172A","e133e327-b4a1-439d-be88-d91207b49f9d":"#334155","3855ae27-e908-4610-a572-f49058e6a426":"#D97706","1a7bb57f-a485-47e0-8fed-98ad7f553b6c":"#FFFFFF","71e24801-0356-4fdb-ac9c-9484bc84ef7c":"#FFFFFF","dacf6d89-481f-4709-a2ec-c8b13d22e0af":"#F8FAFC","e588e755-a402-48d1-9d28-822854fbe1ce":"#E2E8F0","5068cb3b-48bc-4dc8-a46f-eb6e0a8d2984":"#64748B","92c94e9a-6783-49fa-a06b-8c0dce50ed27":"#D97706","24bcac43-9e8c-40be-88da-e3619285b749":"#1E293B","614c2430-bcf4-4252-b7c2-725a94661f7a":"#CA8A04","606b9809-8abd-44ce-b314-0b0ba43271b7":"#070B14","bcca0c9b-9e9b-4b4a-a20c-bf79b217d4c4":"#0D1527","8501043c-632a-401d-9413-d3523cdbce4e":"#111A30"};
            /* wwFront:end */
        }),
        spacings:
         /* wwFront:start */
        // eslint-disable-next-line no-unreachable, no-undef
        {"dd9ab379-3dcf-46d1-8018-c2bcf545f225":"8px","603c77bd-7ef5-4d5b-84a1-045a51400ad3":"16px","07c3cbe2-c712-4335-857f-bfa973fc9366":"32px","cbbd1aa8-0b5a-47cb-a2f3-ad4405248788":"4px","4de58efc-ec80-4444-8793-fcaf94bb73e8":"24px"},
        /* wwFront:end */
        typographies:
         /* wwFront:start */
        // eslint-disable-next-line no-unreachable, no-undef
        {"6384bbff-207b-406e-9c4f-7f3e9e71c5b2":"600 16px/1.4 'Plus Jakarta Sans', sans-serif","c3aebbdf-f719-47fd-9ba2-a395339bf402":"500 12px/1.4 'Plus Jakarta Sans', sans-serif","38f3b53a-0e54-4808-af01-ab9277b8ff31":"700 20px/1.3 'Plus Jakarta Sans', sans-serif","0d1953f1-6084-4f48-9329-87102faf3f38":"600 14px/1.5 'Plus Jakarta Sans', sans-serif","79be3ccc-1eaa-45eb-acc8-07f4c460367e":"800 28px/1.2 'Plus Jakarta Sans', sans-serif","e357d25d-4c35-43ad-8061-c2bae2353aac":"400 14px/1.5 'Plus Jakarta Sans', sans-serif","f8a83eb3-e634-4d80-8724-00436b5f3655":"800 24px/1.1 'Plus Jakarta Sans', sans-serif","2b0fe15a-75a1-44af-9fad-35d45fb0726c":"700 11px/1.2 'Plus Jakarta Sans', sans-serif","689d0a69-13c1-4123-b39b-4aeaf9416070":"700 11px/1.2 'Plus Jakarta Sans', sans-serif","1cb24f3c-2ff3-4387-be6a-39f3e9331e15":"500 10px/1.25 'Plus Jakarta Sans', sans-serif"},
        /* wwFront:end */
        // The newer token types (see LIBRARY_RADIUS). Shadows and borders keep their var(--color): the CSS resolves it.
        radius:
         /* wwFront:start */
        LIBRARY_RADIUS,
        /* wwFront:end */
        shadows:
         /* wwFront:start */
        LIBRARY_SHADOWS,
        /* wwFront:end */
        borders:
         /* wwFront:start */
        LIBRARY_BORDERS,
        /* wwFront:end */
        browser: computed(() => {
            const router = wwLib.manager ? wwLib.getEditorRouter() : wwLib.getFrontRouter();
            const currentRoute = router.currentRoute.value;
            let currentQueries = currentRoute.query;
             return {
                url: window.location.origin + currentRoute.fullPath,
                path: currentRoute.path,
                // verify if auth plugin
                 /* wwFront:start */
                // eslint-disable-next-line no-dupe-keys
                source: currentQueries._source,
                /* wwFront:end */
                query: currentQueries,
                domain: window.location.hostname,
                baseUrl: window.location.origin,
                breakpoint: wwLib.$store.getters['front/getScreenSize'],
                environment: wwLib.getEnvironment(),
                theme: wwLib.$store.getters['front/getTheme'],
            };
        }),
        pwa: services.pwaStore.pwa,
        screen: services.scrollStore.screen,
        componentPositionInfo: services.scrollStore.componentPositionInfo,
    }),

    pageData: computed(() => {
        const lang = wwLib.$store.getters['front/getLang'];
        const cmsDataSetPath = wwLib.$store.getters['websiteData/getPage'].cmsDataSetPath;
        if (!cmsDataSetPath) {
            return { lang };
        }

        return { lang, data: wwLib.$store.getters['data/getPageCollectionData'] };
    }),

    getEnvironment() {
        return getRuntimeEnvironment();
    },

    useBaseTag() {
        return (
            wwLib.getEnvironment() === 'production' &&
            window.wwg_designInfo.baseTag &&
            window.wwg_designInfo.baseTag.href
        );
    },

    getBaseTag() {
        let baseTag = window.wwg_designInfo.baseTag?.href || '';
        if (!baseTag.startsWith('/')) {
            baseTag = '/' + baseTag;
        }
        if (!baseTag.endsWith('/')) {
            baseTag += '/';
        }
        return baseTag;
    },

    /**
     * @PUBLIC_API
     */
    getFrontWindow() {
        // This is called for every compiled CSS declaration and Vue timing measurement.
        // In the canvas document there is no nested editor iframe: a class selector would
        // scan the entire rendered page on every call. The editor iframe has a fixed ID.
        return document.getElementById('ww-manager-iframe')?.contentWindow || window;
    },

    /**
     * @PUBLIC_API
     */
    getFrontDocument() {
        return this.getFrontWindow().document;
    },

    /**
     * @PUBLIC_API
     */
    getFrontRouter() {
        return this.front.router;
    },

    /**
     * @PUBLIC_API
     */
    getEditorWindow() {
         // eslint-disable-next-line no-unreachable
        return null;
    },

    /**
     * @PUBLIC_API
     */
    getEditorDocument() {
         // eslint-disable-next-line no-unreachable
        return null;
    },

    /**
     * @PUBLIC_API
     */
    getEditorRouter() {
        return this.editor.router;
    },

    /**
     * @PUBLIC_API
     * @DEPRECATED wwLib.wwApp.goTo
     */
    goTo(...args) {
        wwLib.wwLog.warn('wwLib.goTo is DEPRECATED, use wwLib.wwApp.goTo instead');
        wwLib.wwApp.goTo(...args);
    },

    /**
     * @PUBLIC_API
     * @DEPRECATED wwLib.wwUtils.getStyleFromToken
     */
    getStyleFromToken(...args) {
        // wwLib.wwLog.warn('wwLib.getStyleFromToken is DEPRECATED, use wwLib.wwUtils.getStyleFromToken instead');
        return wwLib.wwUtils.getStyleFromToken(...args);
    },

    /**
     * @PUBLIC_API
     * @DEPRECATED wwLib.wwUtils.getTypoFromToken
     */
    getTypoFromToken(...args) {
        // wwLib.wwLog.warn('wwLib.getTypoFromToken is DEPRECATED, use wwLib.wwUtils.getTypoFromToken instead');
        return wwLib.wwUtils.getTypoFromToken(...args);
    },

    /**
     * @PUBLIC_API
     * @DEPRECATED
     */
    element(value) {
        wwLib.wwLog.warn('wwLib.element is DEPRECATED');
        if (typeof value === 'object') {
            return { isWwObject: true, ...value };
        } else {
            return { isWwObject: true, type: value };
        }
    },

    /**
     * @PUBLIC_API
     * @DEPRECATED wwLib.wwUtils.resolveObjectPropertyPath
     */
    resolveObjectPropertyPath(...args) {
        // wwLib.wwLog.warn(
        //     'wwLib.resolveObjectPropertyPath is DEPRECATED, use wwLib.wwUtils.resolveObjectPropertyPath instead'
        // );
        return wwLib.wwUtils.resolveObjectPropertyPath(...args);
    },

    /**
     * @PUBLIC_API
     * @DEPRECATED wwLib.wwWorkflow.executeGlobal
     */
    async executeWorkflow(...args) {
        wwLib.wwLog.warn('wwLib.executeWorkflow is DEPRECATED, use wwLib.wwWorkflow.executeGlobal instead');
        return wwLib.wwWorkflow.executeGlobal(...args);
    },

    /**
     * @PUBLIC_API
     * @EDITOR
     * @DEPRECATED wwLib.wwEditor.findParentUidByFlag
     */
    findParentUidByFlag(...args) {
        wwLib.wwLog.warn('wwLib.wwEditor.findParentUidByFlag is DEPRECATED, use wwLib.findParentUidByFlag instead');
        return wwLib.wwEditor.findParentUidByFlag(...args);
    },

    /**
     * @PUBLIC_API
     * @EDITOR
     * @DEPRECATED wwLib.wwEditor.selectParentByFlag
     */
    selectParentByFlag(...args) {
        wwLib.wwLog.warn('wwLib.wwEditor.selectParentByFlag is DEPRECATED, use wwLib.selectParentByFlag instead');
        return wwLib.wwEditor.selectParentByFlag(...args);
    },

    /**
     * @PUBLIC_API
     * @DEPRECATED wwLib.wwElement.useCreate
     */
    useCreateElement() {
        wwLib.wwLog.warn('wwLib.useCreateElement is DEPRECATED, use wwLib.wwElement.useCreate instead');
        return this.wwElement.useCreate();
    },

    /**
     * @PUBLIC_API
     * @DEPRECATED wwLib.wwElement.useLayoutStyle
     */
    useLayoutStyle() {
        wwLib.wwLog.warn('wwLib.useLayoutStyle is DEPRECATED, use wwLib.wwElement.useLayoutStyle instead');
        return wwLib.wwElement.useLayoutStyle();
    },

    /**
     * @PUBLIC_API
     */
    useIcons() {
        const store = useIconsStore();
        return {
            getIcon: store.getIcon,
        };
    },
};

 
function pageSanitizer(page) {
    const keysToInclude = [
        'id',
        'name',
        'folder',
        'metaImage',
        'pageLoaded',
        'paths',
        'langs',
        'meta',
        'title',
        'sections',
        'pageUserGroups',
    ];

    const _page = {};
    keysToInclude.forEach(key => {
        _page[key] = page[key];
    });

    _page.meta && delete _page.meta.__typename;
    for (const section of _page.sections || []) {
        delete section.__typename;
    }

    const lang = wwLib.$store.getters['front/getLang'];
    if (_page.paths) _page.path = _page.paths[lang] || _page.paths.default;
    else _page.path = null;

    _page.lang = lang;

    return _page;
}
