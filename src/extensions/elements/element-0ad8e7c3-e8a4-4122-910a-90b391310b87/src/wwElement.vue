<template>
    <nav role="navigation">
        <ul>
            <li
                class="paginator-arrow"
                :class="{ 'hide-icon': !isEditing && currentPage === 0 }"
                aria-label="Previous page"
                @click="prev"
            >
                <span :class="{ 'paginator-arrow-placeholder': previousArrowFallback }">
                    <wwObject v-if="content.paginatorPrev" v-bind="content.paginatorPrev"></wwObject>
                </span>
                <svg
                    v-if="previousArrowFallback"
                    class="paginator-arrow-fallback"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path
                        d="m15 18-6-6 6-6"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </li>
            <template v-if="content.paginatorText">
                <li
                    v-for="(nav, index) in navigation"
                    :key="index"
                    :aria-current="nav.index === currentPage"
                    @click="goTo(nav.index)"
                >
                    <wwLayoutItemContext is-repeat :index="index">
                        <wwElement
                            v-bind="content.paginatorText"
                            :ww-props="{ text: nav.label }"
                            :states="nav.states"
                        ></wwElement>
                    </wwLayoutItemContext>
                </li>
            </template>
            <li
                class="paginator-arrow"
                :class="{ 'hide-icon': !isEditing && currentPage === nbPage - 1 }"
                aria-label="Next page"
                @click="next"
            >
                <span :class="{ 'paginator-arrow-placeholder': nextArrowFallback }">
                    <wwObject v-if="content.paginatorNext" v-bind="content.paginatorNext"></wwObject>
                </span>
                <svg v-if="nextArrowFallback" class="paginator-arrow-fallback" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                        d="m9 18 6-6-6-6"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </li>
        </ul>
    </nav>
</template>

<script>
export default {
    props: {
        content: { type: Object, required: true },
    },
    emits: ['trigger-event', 'update:content', 'update:content:effect'],
    setup() {
        const { resolveMappingFormula } = wwLib.wwFormula.useFormula();
        return { resolveMappingFormula };
    },
    mounted() {
    },
    watch: {
        'content.useCustomPagination'(value) {
            if (value) this.$emit('update:content', { paginatedSourceId: null });
        },
    },
    computed: {
        previousArrowFallback() {
            return this.usesDefaultArrow(this.content.paginatorPrev, ['fas fa-angle-left', 'lucide/chevron-left']);
        },
        nextArrowFallback() {
            return this.usesDefaultArrow(this.content.paginatorNext, ['fas fa-angle-right', 'lucide/chevron-right']);
        },
        isEditing() {
            // eslint-disable-next-line no-unreachable
            return false;
        },
        sourceType() {
            if (!this.content.paginatedSourceId) return null;
            const [type] = this.content.paginatedSourceId.split(':');
            return type;
        },
        sourceId() {
            if (!this.content.paginatedSourceId) return null;
            const [, id] = this.content.paginatedSourceId.split(':');
            return id;
        },
        tableViewPaginationOptions() {
            if (this.content.paginationScope !== 'group') return undefined;
            const configured = this.content.paginatedGroup;
            const group = configured?.code && configured?.type ? this.resolveMappingFormula(configured) : configured;
            return { group };
        },
        paginationOptions() {
            if (this.content.useCustomPagination) {
                return {
                    limit: this.content.paginatorLimit,
                    offset: this.content.paginatorOffset,
                    total: this.content.paginatorTotal,
                };
            }

            if (this.sourceType === 'tableView' && this.sourceId) {
                if (this.content.paginationScope === 'group' && !this.tableViewPaginationOptions?.group) return null;
                return wwLib.wwTableView.getPaginationOptions(this.sourceId, this.tableViewPaginationOptions);
            }

            if (this.sourceType === 'collection' && this.sourceId) {
                return wwLib.wwCollection.getPaginationOptions(this.sourceId);
            }

            return null;
        },
        nbPage() {
            if (!this.paginationOptions) return 1;
            const nbPage = Math.ceil(this.paginationOptions.total / this.paginationOptions.limit);
            return isNaN(nbPage) ? 1 : nbPage;
        },
        currentPage() {
            if (!this.paginationOptions) return 0;
            const currentPage = Math.floor(this.paginationOptions.offset / this.paginationOptions.limit);
            return isNaN(currentPage) ? 0 : currentPage;
        },
        navigation() {
            const lastPage = this.nbPage - 1;
            const prev = this.currentPage - 1;
            const next = this.currentPage + 1;
            let index = 0;
            let navigation = [];
            navigation.push({ label: '1', index: 0, states: 0 === this.currentPage ? ['active'] : [] });

            // Prev page
            if (prev > index) {
                // Separator
                if (prev > index + 1) {
                    navigation.push({ label: '...', index: -1 });
                }
                navigation.push({ label: `${prev + 1}`, index: prev });
                index = prev;
            }

            // Current page
            if (this.currentPage !== 0 && this.currentPage !== lastPage) {
                navigation.push({ label: `${this.currentPage + 1}`, index: this.currentPage, states: ['active'] });
                index = this.currentPage;
            }

            // NextPage
            if (next < lastPage && next > index) {
                navigation.push({ label: `${next + 1}`, index: next });
                index = next;
                // Separator
                if (next < lastPage - 1) {
                    navigation.push({ label: '...', index: -1 });
                }
            }

            // Last page
            if (lastPage > index) {
                navigation.push({
                    label: `${lastPage + 1}`,
                    index: lastPage,
                    states: lastPage === this.currentPage ? ['active'] : [],
                });
            }

            return navigation;
        },
    },
    methods: {
        usesDefaultArrow(reference, defaults) {
            if (!reference) return false;
            const element = reference.uid
                ? wwLib.$store?.getters['websiteData/getWwObjects']?.[reference.uid]
                : reference;
            const content = element?.content;
            if (!content) return false;
            // Responsive and state-specific custom icons continue to use the nested Icon element.
            if (
                Object.entries(content).some(
                    ([key, value]) => key !== 'default' && value && Object.hasOwn(value, 'icon')
                )
            )
                return false;
            return defaults.includes(content.default?.icon ?? content.icon);
        },
        goTo(index) {
            if (!this.paginationOptions) return;
            const group = this.tableViewPaginationOptions?.group;
            const groupPageUnloaded =
                !this.content.useCustomPagination &&
                this.content.paginationScope === 'group' &&
                this.paginationOptions.total > 0 &&
                group &&
                !(group.rows || group.children || []).length;
            if (index !== -1 && (index !== this.currentPage || groupPageUnloaded)) {
                if (!this.content.useCustomPagination) {
                    if (this.sourceType === 'tableView' && this.sourceId) {
                        wwLib.wwTableView.setOffset(
                            this.sourceId,
                            index * this.paginationOptions.limit,
                            this.tableViewPaginationOptions
                        );
                    } else if (this.sourceType === 'collection' && this.sourceId) {
                        wwLib.wwCollection.setOffset(this.sourceId, index * this.paginationOptions.limit);
                    }
                }

                this.$emit('trigger-event', {
                    name: 'change',
                    event: {
                        context: {
                            offset: index * this.paginationOptions.limit,
                            page: index + 1,
                            total: this.paginationOptions.total,
                            limit: this.paginationOptions.limit,
                        },
                    },
                });
            }
        },
        prev() {
            if (this.currentPage > 0) {
                this.goTo(this.currentPage - 1);
            }
        },
        next() {
            if (this.currentPage < this.nbPage - 1) {
                this.goTo(this.currentPage + 1);
            }
        },
    },
};
</script>

<style lang="scss" scoped>
ul {
    display: flex;
    align-items: center;
    justify-content: center;
    list-style: none;
    margin: 0;
    padding: 0;
    li {
        margin: 0;
        padding: 0;
        user-select: none;
        cursor: pointer;
        margin: 0;
    }
}
.hide-icon {
    opacity: 0;
    pointer-events: none;
}
.paginator-arrow {
    position: relative;
}
.paginator-arrow-placeholder {
    visibility: hidden;
}
.paginator-arrow-fallback {
    position: absolute;
    width: 1em;
    height: 1em;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
}
</style>
