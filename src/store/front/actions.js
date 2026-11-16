export default {
    showPageLoadProgress({ commit }, showPageLoadProgress) {
        commit('showPageLoadProgress', showPageLoadProgress);
    },
    setTheme({ commit }, theme) {
        commit('setTheme', theme);

        try {
            window.localStorage.setItem('ww-app-theme', theme);
        } catch {
            // The selected theme still applies to the current page.
        }
    },
    /*=============================================m_ÔÔ_m=============================================\
        LANG
    \================================================================================================*/
    setLang({ commit }, newLang) {
        commit('setLang', newLang);
    },
    /*=============================================m_ÔÔ_m=============================================\
        SCREEN SIZE
    \================================================================================================*/
    setIsScreenSizeActive({ commit }, { screenSize, isActive }) {
        commit('setIsScreenSizeActive', { screenSize, isActive });
    },
    setActiveLinkPopup({ commit }, { content, background, sectionId }) {
        commit('setActiveLinkPopup', { content, background, sectionId });
    },
    closeActiveLinkPopup({ commit }) {
        commit('setActiveLinkPopup', null);
    },
};
