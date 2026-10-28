export default {
    editor: {
        label: {
            en: 'Paginator',
            fr: 'Paginateur',
        },
        icon: 'dots-horizontal',
        bubble: {
            icon: 'dots-horizontal',
        },
    },
    triggerEvents: [
        { name: 'change', label: { en: 'On change' }, event: { context: { page: 0, offset: 0, limit: 0, total: 0 } } },
    ],
    properties: {
        useCustomPagination: {
            label: {
                en: 'Custom pagination',
                fr: 'Pagination personnalisée',
            },
            type: 'OnOff',
            defaultValue: false,
        },
        paginatedSourceId: {
            hidden: content => content.useCustomPagination,
            label: {
                en: 'Source',
                fr: 'Source',
            },
            type: 'PaginatedSource',
            defaultValue: null,
        },
        paginationScope: {
            hidden: content => content.useCustomPagination || !content.paginatedSourceId?.startsWith('tableView:'),
            label: { en: 'Paginate', fr: 'Paginer' },
            type: 'TextRadioGroup',
            defaultValue: 'view',
            options: {
                choices: [
                    { value: 'view', title: 'View', label: { en: 'View', fr: 'Vue' }, icon: '16/table' },
                    {
                        value: 'group',
                        title: 'Group contents',
                        label: { en: 'Group contents', fr: 'Contenu du groupe' },
                        icon: '16/group',
                    },
                ],
            },
        },
        paginatedGroup: {
            hidden: content =>
                content.useCustomPagination ||
                !content.paginatedSourceId?.startsWith('tableView:') ||
                content.paginationScope !== 'group',
            label: { en: 'Group', fr: 'Groupe' },
            type: 'Formula',
            defaultValue: null,
        },
        paginatorText: {
            hidden: true,
            defaultValue: { isWwObject: true, type: 'ww-text' },
        },
        paginatorPrev: {
            hidden: true,
            defaultValue: { isWwObject: true, type: 'ww-icon', content: { icon: 'lucide/chevron-left' } },
        },
        paginatorNext: {
            hidden: true,
            defaultValue: { isWwObject: true, type: 'ww-icon', content: { icon: 'lucide/chevron-right' } },
        },
        paginatorTotal: {
            hidden: content => !content.useCustomPagination,
            label: { en: 'Total items', fr: 'Total items' },
            type: 'Number',
            defaultValue: 10,
            bindable: true,
        },
        paginatorLimit: {
            hidden: content => !content.useCustomPagination,
            label: { en: 'Items per page', fr: 'Items per page' },
            type: 'Number',
            defaultValue: 5,
            bindable: true,
        },
        paginatorOffset: {
            hidden: content => !content.useCustomPagination,
            label: { en: 'Offset', fr: 'Offset' },
            type: 'Number',
            defaultValue: 0,
            bindable: true,
        },
    },
};
