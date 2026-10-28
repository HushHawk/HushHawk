import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../src/wwElement.vue', import.meta.url), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
function paginator(content) {
    const group = { id: 'false', count: 36, childrenPageInfo: { limit: 30, offset: 0, total: 36 } };
    const calls = [];
    const wwLib = {
        wwFormula: {
            useFormula: () => ({
                resolveMappingFormula: formula => (formula.code === 'context.item.data' ? group : null),
            }),
        },
        wwTableView: {
            getPaginationOptions(id, options) {
                calls.push(['options', options]);
                return options?.group === group ? group.childrenPageInfo : null;
            },
            setOffset(id, offset, options) {
                calls.push(['offset', offset, options]);
            },
        },
    };
    const component = vm.runInNewContext(script.replace('export default', 'globalThis.component ='), { wwLib });
    const instance = {
        content: { paginatedSourceId: 'tableView:qa', paginationScope: 'group', ...content },
        $emit() {},
    };
    Object.assign(instance, component.setup?.(instance, {}));
    for (const [name, getter] of Object.entries(component.computed))
        Object.defineProperty(instance, name, { get: () => getter.call(instance) });
    for (const [name, method] of Object.entries(component.methods)) instance[name] = method.bind(instance);
    return { instance, group, calls };
}

test('evaluates a repeated group formula for pagination and page changes', () => {
    const { instance, group, calls } = paginator({ paginatedGroup: { code: 'context.item.data', type: 'f' } });
    assert.equal(instance.nbPage, 2);
    instance.goTo(1);
    const changed = calls.find(([kind]) => kind === 'offset');
    assert.equal(changed[1], 30);
    assert.equal(changed[2].group, group);
});

test('does not paginate the root when the group formula is empty or invalid', () => {
    for (const paginatedGroup of [null, { code: 'missing', type: 'f' }]) {
        const { instance, calls } = paginator({ paginatedGroup });
        instance.goTo(1);
        assert.equal(instance.nbPage, 1);
        assert.equal(calls.length, 0);
    }
});

test('loads page one when a selected group has no loaded rows', () => {
    const { instance, group, calls } = paginator({ paginatedGroup: { code: 'context.item.data', type: 'f' } });
    group.rows = [];
    instance.goTo(0);
    const changed = calls.find(([kind]) => kind === 'offset');
    assert.ok(changed, 'clicking page one must request its unloaded rows');
    assert.equal(changed[1], 0);
    assert.equal(changed[2].group, group);
});

test('keeps clicking the current loaded page or an empty group a no-op', () => {
    const { instance, group, calls } = paginator({ paginatedGroup: { code: 'context.item.data', type: 'f' } });
    group.rows = [{ id: 'loaded' }];
    instance.goTo(0);
    group.rows = [];
    group.childrenPageInfo.total = 0;
    instance.goTo(0);
    assert.equal(calls.filter(([kind]) => kind === 'offset').length, 0);
});

test('renders default arrows without an icon pack and preserves custom icons', () => {
    const { instance } = paginator({
        paginatorPrev: { content: { default: { icon: 'fas fa-angle-left' } } },
        paginatorNext: { content: { icon: 'lucide/chevron-right' } },
    });
    assert.equal(instance.previousArrowFallback, true);
    assert.equal(instance.nextArrowFallback, true);
    instance.content.paginatorPrev = { content: { default: { icon: 'custom/previous' } } };
    assert.equal(instance.previousArrowFallback, false);
    instance.content.paginatorNext = {
        content: { default: { icon: 'lucide/chevron-right' }, mobile: { icon: 'custom/next' } },
    };
    assert.equal(instance.nextArrowFallback, false);
});
