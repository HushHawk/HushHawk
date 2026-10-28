import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';

import wwPage from './views/wwPage.vue';

import {
    initializeData,
    initializePlugins,
    initializeIntegrationInstances,
    onPageUnload,
} from '@/_common/helpers/data';
import { convertPathToRouterFormat } from '@/_common/helpers/urlParametersParsing';
import { getRuntimeEnvironment } from '@/helpers/frontEnv.js';
import { useBackAuthStore } from '@/pinia/backAuth.js';
/* wwFront:start */
import { isStaticRenderingActive } from '@/_front/rendering/staticRenderingContext';
/* wwFront:end */

/**
 * @typedef {import('vue-router').Router} Router
 * @typedef {import('vue-router').RouteRecordRaw} RouteRecordRaw
 * @typedef {import('vue-router').RouterOptions} RouterOptions
 * @typedef {import('vue-router').RouterScrollBehavior} RouterScrollBehavior
 */

/**
 * @typedef {Object} Lang
 * @property {string} lang
 * @property {boolean} [default]
 * @property {boolean} [isDefaultPath]
 */

/**
 * @typedef {Object} PageSecurity
 * @property {'authenticated' | string} [accessRule]
 * @property {string[]} [accessRoles]
 * @property {'AND' | 'OR'} [accessRolesCondition]
 */

/**
 * @typedef {Object} Page
 * @property {string} id
 * @property {Record<string, string> & { default: string }} paths
 * @property {string[]} langs
 * @property {PageSecurity} [security]
 * @property {{ userGroup: string }[]} [pageUserGroups]
 */

/**
 * @typedef {Object} DesignInfo
 * @property {string} homePageId
 * @property {Page[]} pages
 * @property {Lang[]} langs
 * @property {unknown} [auth]
 * @property {{ href?: string }} [baseTag]
 */

/** @type {Router} */
let router;
/** @type {RouteRecordRaw[]} */
const routes = [];

/** @type {RouterScrollBehavior} */
const scrollBehavior = to => {
    if (to.hash) {
        return {
            el: to.hash,
            behavior: 'smooth',
        };
    } else {
        return { top: 0 };
    }
};

 
/* wwFront:start */
import pluginsSettings from '../../plugins-settings.json';

window.wwg_designInfo = {"id":"c24283ed-60e0-4c84-8ecc-16bb598ee652","homePageId":"64b6f7f3-21a2-4e15-a6d3-80c2f4216ed2","authPluginId":null,"baseTag":null,"defaultTheme":"light","langs":[{"lang":"en","default":true}],"background":{},"workflows":[],"back":{"isServerSetup":{"staging":true,"production":true}},"auth":{"integration":"weweb-auth","connectionId":null,"unauthenticatedPageId":null,"unauthorizedPageId":null},"pages":[{"id":"properties-page","linkId":"properties-page","name":"Properties","folder":null,"paths":{"en":"properties","default":"properties"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"89e7916b-7361-47a2-b48f-497459c4630d","sectionTitle":"Properties Workspace","linkId":"e4f37413-3f37-456b-803a-4139960f6736"}],"pageUserGroups":[],"title":{"en":"Properties & Photos | HUSHHAWK"},"meta":{"desc":{"en":"Properties portfolio, field photos, renovation and documentation."},"keywords":{"en":"HUSHHAWK, properties, photos"},"socialDesc":{"en":"Properties portfolio and field photos."},"socialTitle":{"en":"Properties & Photos | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"5ac8292b-4a7d-4552-ae7e-c099f194016f","linkId":"5ac8292b-4a7d-4552-ae7e-c099f194016f","name":"Seller Leads","folder":null,"paths":{"en":"seller-leads","default":"seller-leads"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"78dd6df2-0fb9-48fc-837f-234d37be20be","sectionTitle":"Seller Leads Page Shell","linkId":"d1df2164-5c17-455d-a06b-a64924f0965a"}],"pageUserGroups":[],"title":{"en":"Seller Leads Command Center | HUSHHAWK"},"meta":{"desc":{"en":"Seller leads, motivation, scoring, follow-up and Podio-ready records."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Seller leads, motivation, scoring, follow-up and Podio-ready records."},"socialTitle":{"en":"Seller Leads Command Center | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"f405dfa0-cbe5-4a9e-b76a-205819446a89","linkId":"f405dfa0-cbe5-4a9e-b76a-205819446a89","name":"Acquisitions","folder":null,"paths":{"en":"acquisitions","default":"acquisitions"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"ca6ba612-3f4a-49c4-a63e-85cf0af0398a","sectionTitle":"Acquisitions Page Shell","linkId":"daff2c20-7844-4075-ab78-ea0ce48bb73a"}],"pageUserGroups":[],"title":{"en":"Acquisitions Pipeline | HUSHHAWK"},"meta":{"desc":{"en":"Wholesale acquisitions pipeline from new lead through contract and close."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Wholesale acquisitions pipeline from new lead through contract and close."},"socialTitle":{"en":"Acquisitions Pipeline | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"b9987b36-cabf-4d22-a61f-bb1878fbd81a","linkId":"b9987b36-cabf-4d22-a61f-bb1878fbd81a","name":"Cash Buyers","folder":null,"paths":{"en":"cash-buyers","default":"cash-buyers"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"2a35d707-c659-4a5d-8210-664fa535a8a5","sectionTitle":"Cash Buyers Page Shell","linkId":"e48804ef-5047-48e5-8272-d68bccc988e8"}],"pageUserGroups":[],"title":{"en":"Cash Buyers | HUSHHAWK"},"meta":{"desc":{"en":"Buyer profiles, buy boxes, ZIP targets and deal matching."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Buyer profiles, buy boxes, ZIP targets and deal matching."},"socialTitle":{"en":"Cash Buyers | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"c6707652-6174-47b7-84a7-042a2dee960f","linkId":"c6707652-6174-47b7-84a7-042a2dee960f","name":"Facebook Leads","folder":null,"paths":{"en":"facebook-leads","default":"facebook-leads"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"5c2958b3-179b-4a5a-8f60-a4e3d308e56a","sectionTitle":"Facebook Leads Page Shell","linkId":"965fe5af-d519-4683-8902-eff8e0b4aa82"}],"pageUserGroups":[],"title":{"en":"Facebook Lead Intelligence | HUSHHAWK"},"meta":{"desc":{"en":"Facebook scraping, identity resolution, enrichment, scoring and CRM push tracking."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Facebook scraping, identity resolution, enrichment, scoring and CRM push tracking."},"socialTitle":{"en":"Facebook Lead Intelligence | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"4ad6b22e-4151-4bf7-bc63-7dec86f377a2","linkId":"4ad6b22e-4151-4bf7-bc63-7dec86f377a2","name":"Skip Tracing","folder":null,"paths":{"en":"skip-tracing","default":"skip-tracing"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"86373344-f89d-47b0-9265-b6881c360eef","sectionTitle":"Skip Tracing Page Shell","linkId":"a7c94379-3d75-4574-b40b-4a237743c3e5"}],"pageUserGroups":[],"title":{"en":"Skip Tracing | HUSHHAWK"},"meta":{"desc":{"en":"Contact enrichment, validation, match confidence and data-completeness workflow."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Contact enrichment, validation, match confidence and data-completeness workflow."},"socialTitle":{"en":"Skip Tracing | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"a17a6122-e36c-4582-aa7d-a33451821a3f","linkId":"a17a6122-e36c-4582-aa7d-a33451821a3f","name":"Dispositions","folder":null,"paths":{"en":"dispositions","default":"dispositions"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"89e7916b-7361-47a2-b48f-497459c4630d","sectionTitle":"Dispositions Page Shell","linkId":"e4f37413-3f37-456b-803a-4139960f6736"}],"pageUserGroups":[],"title":{"en":"Dispositions Command Center | HUSHHAWK"},"meta":{"desc":{"en":"Contract inventory, buyer matching, assignments and closing readiness."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Contract inventory, buyer matching, assignments and closing readiness."},"socialTitle":{"en":"Dispositions Command Center | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"87b38826-b41a-4950-95c2-afa18dec2b38","linkId":"87b38826-b41a-4950-95c2-afa18dec2b38","name":"County Data","folder":null,"paths":{"en":"county-data","default":"county-data"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"7660f30c-4257-42b6-b08d-2f047f3e19a0","sectionTitle":"County Data Page Shell","linkId":"4ff20f30-581c-43d3-8e89-971e6e152309"}],"pageUserGroups":[],"title":{"en":"Duval County Data Intelligence | HUSHHAWK"},"meta":{"desc":{"en":"Jacksonville and Duval County lead-source intelligence and list tracking."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Jacksonville and Duval County lead-source intelligence and list tracking."},"socialTitle":{"en":"Duval County Data Intelligence | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"9d4b26e3-28a9-43e6-9b22-66f11b94aa1c","linkId":"9d4b26e3-28a9-43e6-9b22-66f11b94aa1c","name":"Communications","folder":null,"paths":{"en":"communications","default":"communications"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"e43844bf-82d9-4775-96a4-cdc66ff6f3c2","sectionTitle":"Communications Page Shell","linkId":"6e7f5db0-972b-4e1b-be20-9be83e60baa0"}],"pageUserGroups":[],"title":{"en":"Communications Center | HUSHHAWK"},"meta":{"desc":{"en":"Unified SMS and email activity linked to sellers, buyers and properties."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Unified SMS and email activity linked to sellers, buyers and properties."},"socialTitle":{"en":"Communications Center | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"a2d0d91c-0e12-4dc0-b922-5858c7917ee3","linkId":"a2d0d91c-0e12-4dc0-b922-5858c7917ee3","name":"Marketing","folder":null,"paths":{"en":"marketing","default":"marketing"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"8385542e-3bad-49ce-a4e8-1858e0d46d98","sectionTitle":"Marketing Page Shell","linkId":"ada82b97-a58c-4cd4-9ed7-8640516a99b2"}],"pageUserGroups":[],"title":{"en":"Marketing Command Center | HUSHHAWK"},"meta":{"desc":{"en":"Campaigns, lead sources, response tracking and channel performance."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Campaigns, lead sources, response tracking and channel performance."},"socialTitle":{"en":"Marketing Command Center | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"d588127b-5b3e-4f99-a6dc-7a22ef7c128b","linkId":"d588127b-5b3e-4f99-a6dc-7a22ef7c128b","name":"Contracts","folder":null,"paths":{"en":"contracts","default":"contracts"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"04f71ff5-c01f-4c81-80b6-53347159ff63","sectionTitle":"Contracts Page Shell","linkId":"f9e9367e-5fa5-4acf-be5b-0f3a74185ca8"}],"pageUserGroups":[],"title":{"en":"Contracts | HUSHHAWK"},"meta":{"desc":{"en":"Purchase agreements, assignments, title milestones and closing document tracking."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Purchase agreements, assignments, title milestones and closing document tracking."},"socialTitle":{"en":"Contracts | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"72fa8746-8396-4460-890f-36d72912cf95","linkId":"72fa8746-8396-4460-890f-36d72912cf95","name":"Direct Mail","folder":null,"paths":{"en":"direct-mail","default":"direct-mail"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"71a0e324-9688-4c10-831b-e8a2d5c112b0","sectionTitle":"Direct Mail Page Shell","linkId":"bbcd3f98-ebf4-49f7-b17e-a791525bf7e7"}],"pageUserGroups":[],"title":{"en":"Direct Mail Command Center | HUSHHAWK"},"meta":{"desc":{"en":"Mail batches, Mail IDs, templates, delivery workflow and CRM attribution."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Mail batches, Mail IDs, templates, delivery workflow and CRM attribution."},"socialTitle":{"en":"Direct Mail Command Center | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"e01977a5-5afc-427b-a25d-39b555fa3b0d","linkId":"e01977a5-5afc-427b-a25d-39b555fa3b0d","name":"Follow Ups","folder":null,"paths":{"en":"follow-ups","default":"follow-ups"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"bf07ecc7-6bc9-44c2-978f-f78ecd4ca1b1","sectionTitle":"Follow Ups Page Shell","linkId":"6a5a076a-07a3-4849-8054-f910f1ba325e"}],"pageUserGroups":[],"title":{"en":"Follow Ups & Tasks | HUSHHAWK"},"meta":{"desc":{"en":"Acquisition follow-ups, callbacks, appointments and next-action management."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Acquisition follow-ups, callbacks, appointments and next-action management."},"socialTitle":{"en":"Follow Ups & Tasks | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"dba9b37a-872b-4425-9993-79f3ceaadb92","linkId":"dba9b37a-872b-4425-9993-79f3ceaadb92","name":"Analytics","folder":null,"paths":{"en":"analytics","default":"analytics"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"c2e04261-b68e-4374-b3cb-a4b1624b0a96","sectionTitle":"Analytics Page Shell","linkId":"a3feb346-8c0a-49b8-9b86-af58036b5918"}],"pageUserGroups":[],"title":{"en":"Analytics & Reports | HUSHHAWK"},"meta":{"desc":{"en":"Pipeline KPIs, marketing attribution, conversion, revenue and team performance."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"Pipeline KPIs, marketing attribution, conversion, revenue and team performance."},"socialTitle":{"en":"Analytics & Reports | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"e2af833d-5f07-4ee1-a59b-5a41b3502933","linkId":"e2af833d-5f07-4ee1-a59b-5a41b3502933","name":"Settings","folder":null,"paths":{"en":"settings","default":"settings"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"597f76e6-fa02-435a-8eef-d4134d77028f","sectionTitle":"Settings Page Shell","linkId":"bcb72b61-bc66-47fe-8c91-0ac9d94190eb"}],"pageUserGroups":[],"title":{"en":"HushHawk Settings | HUSHHAWK"},"meta":{"desc":{"en":"System configuration, integrations, ownership controls and Podio connection readiness."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"System configuration, integrations, ownership controls and Podio connection readiness."},"socialTitle":{"en":"HushHawk Settings | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"964e5528-8760-4680-938d-5b201255047c","linkId":"964e5528-8760-4680-938d-5b201255047c","name":"Deal Analyzer","folder":null,"paths":{"en":"deal-analyzer","default":"deal-analyzer"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"36bd3d81-3e84-4a85-87c2-0f5fcd729136","sectionTitle":"Deal Analyzer Page Shell","linkId":"d5361e04-8c68-4daa-b84b-2d9783e8214d"}],"pageUserGroups":[],"title":{"en":"Deal Analyzer | HUSHHAWK"},"meta":{"desc":{"en":"ARV, rehab, assignment fee and maximum allowable offer analysis."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"ARV, rehab, assignment fee and maximum allowable offer analysis."},"socialTitle":{"en":"Deal Analyzer | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"0921099a-dc1e-4897-809d-bd39a527558d","linkId":"0921099a-dc1e-4897-809d-bd39a527558d","name":"Teams","folder":null,"paths":{"en":"team","default":"team"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"a7e526b1-0344-467a-9cca-c4e3fd518a63","sectionTitle":"Team Page Shell","linkId":"b1c37948-e94b-4b99-bd27-e9cef6b9d4fb"}],"pageUserGroups":[],"title":{"en":"Teams | HUSHHAWK"},"meta":{"desc":{"en":"HushHawk Property Intelligence users, assignments, roles and production visibility."},"keywords":{"en":"HUSHHAWK, HushHawk Property Intelligence, real estate CRM, Jacksonville, wholesale real estate"},"socialDesc":{"en":"HushHawk Property Intelligence users, assignments, roles and production visibility."},"socialTitle":{"en":"Team | HUSHHAWK"},"structuredData":{}},"metaImage":"","security":{}},{"id":"fcc2517c-a1f5-40cd-baf5-2a1b15cbf938","linkId":"fcc2517c-a1f5-40cd-baf5-2a1b15cbf938","name":"Tasks","folder":null,"paths":{"en":"tasks","default":"tasks"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"4b3e96fa-5ab1-416d-965e-b58efbb25caf","sectionTitle":"Tasks Workspace","linkId":"15d07233-ba23-4a69-a858-9c01c5a5cf5c"}],"pageUserGroups":[],"title":{"en":"Tasks | HUSHHAWK"},"meta":{},"metaImage":"","security":{}},{"id":"fab9ca83-7dde-4bd1-b2e1-2a7aab78c558","linkId":"fab9ca83-7dde-4bd1-b2e1-2a7aab78c558","name":"Calendar","folder":null,"paths":{"en":"calendar","default":"calendar"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"92576773-1ca3-4c34-9dea-cc8fe069474b","sectionTitle":"Calendar Workspace","linkId":"78611c81-a327-47fc-9e08-44fd0f299113"}],"pageUserGroups":[],"title":{"en":"Calendar | HUSHHAWK"},"meta":{},"metaImage":"","security":{}},{"id":"05c29fb9-c737-4efd-b13e-0d4d0dbd18a3","linkId":"05c29fb9-c737-4efd-b13e-0d4d0dbd18a3","name":"Contacts","folder":null,"paths":{"en":"contacts","default":"contacts"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"3ee3dd4a-03a1-4cd6-b671-f3e60b3356df","sectionTitle":"Contacts Workspace","linkId":"7e785b9f-ee3d-4fe2-a11f-2f105366b49b"}],"pageUserGroups":[],"title":{"en":"Contacts | HUSHHAWK"},"meta":{},"metaImage":"","security":{}},{"id":"4159d10e-7d54-4064-93da-bce6675b0b32","linkId":"4159d10e-7d54-4064-93da-bce6675b0b32","name":"Automations","folder":null,"paths":{"en":"automations","default":"automations"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"cc040a24-c152-4afd-af4e-757019666b07","sectionTitle":"Automation Readiness Workspace","linkId":"f57828f4-c67b-4e00-8ee5-e982e7ecdcb4"}],"pageUserGroups":[],"title":{"en":"Automations | HUSHHAWK"},"meta":{},"metaImage":"","security":{}},{"id":"64b6f7f3-21a2-4e15-a6d3-80c2f4216ed2","linkId":"64b6f7f3-21a2-4e15-a6d3-80c2f4216ed2","name":"Dashboard","folder":null,"paths":{"en":"home","default":"home"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"b0a41600-4212-49e0-b3df-cf099ce24a18","sectionTitle":"HushHawk Root Layout","linkId":"9a4e63e9-ddd5-4352-b61d-aa58d23a3012"}],"pageUserGroups":[],"title":{"en":"HUSHHAWK - Property Intelligence & CrownKey Command Center"},"meta":{"desc":{"en":"HushHawk Property Intelligence Platform: PostgreSQL Canonical Truth, CrownKey Display Reference, Neo4j Relationship Graph, Ingestion Connectors, and Custom CRM."},"keywords":{"en":"real estate wholesale, CRM, HUSHHAWK, Podio, Jacksonville FL, cash buyers, motivated sellers, acquisitions, seller leads"},"socialDesc":{"en":"HUSHHAWK Property Intelligence Platform"},"socialTitle":{"en":"HUSHHAWK Command Center"},"structuredData":{}},"metaImage":"","security":{}},{"id":"dc84b9a1-d5a2-44cb-916b-f375a54efeb8","linkId":null,"name":"Login","folder":"Auth/","paths":{"en":"login","default":"login"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"83887e3b-4114-4466-9f0c-12bf1999a3fd","sectionTitle":"Login Page Root","linkId":"497e4f65-b46c-4c3f-983e-81c23e39e55f"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"1e341664-897c-4bb8-b59c-ea327c8061ff","linkId":null,"name":"Forgot password","folder":"Auth/","paths":{"en":"forgot-password","default":"forgot-password"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"1ff2583d-f6ee-460b-a013-242276498e5a","sectionTitle":"Forgot Password Page Root","linkId":"c5f0cf89-5ac1-4ffb-82d4-e9e93ce90b91"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}},{"id":"a54ea5e7-95ee-4e15-983a-3bdad585a27a","linkId":null,"name":"Signup","folder":"Auth/","paths":{"en":"signup","default":"signup"},"langs":["en"],"cmsDataSetPath":null,"sections":[{"uid":"520e2d70-b1d1-48ed-a9a0-ec1dfac44530","sectionTitle":"Signup Page Root","linkId":"63ed5a5c-07dd-42cf-99d8-d5f26085951d"}],"pageUserGroups":[],"title":{},"meta":{"desc":{},"keywords":{},"socialDesc":{},"socialTitle":{},"structuredData":{}},"metaImage":"","security":{}}],"plugins":[]};
window.wwg_cacheVersion = 2;
window.wwg_pluginsSettings = pluginsSettings;
window.wwg_disableManifest = true;

/** @type {Lang} */
const defaultLang = window.wwg_designInfo.langs.find(({ default: isDefault }) => isDefault) || {
    lang: 'en',
    default: true,
};
const isServerRendering = import.meta.env.SSR;

/**
 * @param {Page} page
 * @param {Lang} lang
 * @param {string} [forcedPath]
 */
const registerRoute = (page, lang, forcedPath) => {
    const langSlug = !lang.default || lang.isDefaultPath ? `/${lang.lang}` : '';
    let path =
        forcedPath ||
        (page.id === window.wwg_designInfo.homePageId ? '/' : `/${page.paths[lang.lang] || page.paths.default}`);

    path = convertPathToRouterFormat(path);

    routes.push({
        path: langSlug + path,
        component: wwPage,
        name: `page-${page.id}-${lang.lang}${forcedPath ? '-' + forcedPath.replace(/[^a-zA-Z0-9]/g, '') : ''}`,
        meta: {
            pageId: page.id,
            lang,
            isPrivate: !!page.pageUserGroups?.length,
        },
        async beforeEnter(to, from) {
            if (to.name === from.name) return;
            //Set page lang
            wwLib.wwLang.defaultLang = defaultLang.lang;
            wwLib.$store.dispatch('front/setLang', lang.lang);

            if (!isStaticRenderingActive()) {
                const canContinue = await initializePageRuntime(page, to);
                if (!canContinue) return null;
            }

            try {
                const { default: registerPageComponents } = await import(`@/pages/${page.id.split('_')[0]}.js`);
                await registerPageComponents(window.vm);
                await wwLib.wwWebsiteData.fetchPage(page.id);

                //Scroll to section or on top after page change
                if (isStaticRenderingActive()) {
                    return;
                } else if (to.hash) {
                    const targetElement = document.getElementById(to.hash.replace('#', ''));
                    if (targetElement) targetElement.scrollIntoView();
                } else {
                    document.body.scrollTop = document.documentElement.scrollTop = 0;
                }

                return;
            } catch (err) {
                wwLib.$store.dispatch('front/showPageLoadProgress', false);
                if (isStaticRenderingActive()) throw err;

                if (err.redirectUrl) {
                    return { path: err.redirectUrl || '404' };
                } else {
                    //Any other error: go to target page using window.location
                    window.location = to.fullPath;
                }
            }
        },
    });
};

for (const page of window.wwg_designInfo.pages) {
    for (const lang of window.wwg_designInfo.langs) {
        if (!page.langs.includes(lang.lang)) continue;
        registerRoute(page, lang);
        if (page.id === window.wwg_designInfo.homePageId) {
            registerRoute(page, lang, '/home');
        }
    }
}

const page404 = window.wwg_designInfo.pages.find(page => page.paths.default === '404');
if (page404) {
    for (const lang of window.wwg_designInfo.langs) {
        // Create routes /:lang/:pathMatch(.*)* etc for all langs of the 404 page
        if (!page404.langs.includes(lang.lang)) continue;
        registerRoute(
            page404,
            {
                default: false,
                lang: lang.lang,
            },
            '/:pathMatch(.*)*'
        );
    }
    // Create route /:pathMatch(.*)* using default project lang
    registerRoute(page404, { default: true, isDefaultPath: false, lang: defaultLang.lang }, '/:pathMatch(.*)*');
} else {
    routes.push({
        path: '/:pathMatch(.*)*',
        redirect: null,
        async beforeEnter() {
            window.location.href = '/404';
        },
    });
}

const isProd = getRuntimeEnvironment() === 'production';

async function initializePageRuntime(page, route) {
    const backAuthStore = useBackAuthStore(wwLib.$pinia);
    if (!wwLib.wwAuth.plugin && !backAuthStore.projectAuth && window.wwg_designInfo.auth) {
        backAuthStore.setProjectAuth(window.wwg_designInfo.auth);
    }

    await initializePlugins();
    await initializeIntegrationInstances();

    if (!wwLib.wwAuth.plugin) {
        await backAuthStore.refresh();
        const projectAuth = backAuthStore.projectAuth || {};

        if (page.security?.accessRule !== 'authenticated') return true;
        if (!backAuthStore.isAuthenticated) {
            window.location.href = `${wwLib.wwPageHelper.getPagePath(
                projectAuth.unauthenticatedPageId
            )}?_source=${route.path}`;
            return false;
        }
        if (!page.security.accessRoles?.length) return true;

        const hasAccess =
            page.security.accessRolesCondition === 'AND'
                ? backAuthStore.matchAllRoles(page.security.accessRoles)
                : backAuthStore.matchAnyRoles(page.security.accessRoles);
        if (hasAccess) return true;

        window.location.href = `${wwLib.wwPageHelper.getPagePath(
            projectAuth.unauthorizedPageId
        )}?_source=${route.path}`;
        return false;
    }

    if (!page.pageUserGroups?.length) return true;
    await wwLib.wwAuth.init();

    if (!wwLib.wwAuth.getIsAuthenticated()) {
        window.location.href = `${wwLib.wwPageHelper.getPagePath(
            wwLib.wwAuth.getUnauthenticatedPageId()
        )}?_source=${route.path}`;
        return false;
    }

    if (
        page.pageUserGroups.length > 1 &&
        !wwLib.wwAuth.matchUserGroups(page.pageUserGroups.map(({ userGroup }) => userGroup))
    ) {
        window.location.href = `${wwLib.wwPageHelper.getPagePath(
            wwLib.wwAuth.getUnauthorizedPageId()
        )}?_source=${route.path}`;
        return false;
    }

    return true;
}

/**
 * Initializes the current route's traditional runtime dependencies after Vue has
 * hydrated the static projection. Static rendering remains active until this resolves,
 * so client islands and dynamic bindings cannot run against a partial runtime.
 */
export async function initializeCurrentRouteRuntime() {
    const route = router.currentRoute.value;
    const page = window.wwg_designInfo.pages.find(candidate => candidate.id === route.meta.pageId);
    if (!page) throw new Error(`Unable to initialize runtime for route ${route.fullPath}: page is unavailable.`);

    const canContinue = await initializePageRuntime(page, route);
    if (!canContinue) return { status: 'redirected' };
    return { status: 'ready', route };
}

/**
 * Starts the data phase without delaying the mounted lifecycle, matching normal
 * navigation where collections and workflows may initialize after the first render.
 */
export function startCurrentRouteDataInitialization(route) {
    return initializeData(route);
}

function createFrontHistory(serverRendering) {
    if (serverRendering) return createMemoryHistory();

    if (isProd && window.wwg_designInfo.baseTag?.href) {
        let baseTag = window.wwg_designInfo.baseTag.href;
        if (!baseTag.startsWith('/')) {
            baseTag = '/' + baseTag;
        }
        if (!baseTag.endsWith('/')) {
            baseTag += '/';
        }
        return createWebHistory(baseTag);
    }

    return createWebHistory();
}

export function createFrontRouter({ serverRendering = false } = {}) {
    const frontRouter = createRouter({
        history: createFrontHistory(serverRendering),
        routes,
        scrollBehavior,
    });

    //Trigger on page unload
    let isFirstNavigation = true;
    frontRouter.beforeEach(async (to, from) => {
        if (to.name === from.name) return;
        if (!isFirstNavigation && !serverRendering) await onPageUnload();
        isFirstNavigation = false;
        wwLib.globalVariables._navigationId++;
        return;
    });

    //Init page
    frontRouter.afterEach((to, from, failure) => {
        wwLib.$store.dispatch('front/showPageLoadProgress', false);
        let fromPath = from.path;
        let toPath = to.path;
        if (!fromPath.endsWith('/')) fromPath = fromPath + '/';
        if (!toPath.endsWith('/')) toPath = toPath + '/';
        if (failure || (from.name && toPath === fromPath) || serverRendering || isStaticRenderingActive()) return;
        void initializeData(to);
    });

    return frontRouter;
}

router = createFrontRouter({ serverRendering: isServerRendering });
/* wwFront:end */

export default router;
