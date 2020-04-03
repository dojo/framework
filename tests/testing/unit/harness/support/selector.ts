const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { adapter, parseSelector } from '../../../../../src/testing/harness/support/selector';
import { v, w } from '../../../../../src/core/vdom';
import { WidgetBase } from '../../../../../src/core/WidgetBase';
import { DNode, WNode } from '../../../../../src/core/interfaces';

describe('selector', () => {
	describe('adapter', () => {
		it('is tag', () => {
			assert.isTrue(adapter.isTag(v('div')));
			assert.isFalse(adapter.isTag('string'));
			assert.isFalse(adapter.isTag(null));
			assert.isFalse(adapter.isTag(undefined));
			assert.isFalse(adapter.isTag(w(WidgetBase, {})));
		});

		it('getName', () => {
			assert.strictEqual(adapter.getName(v('div')), 'div');
			assert.isUndefined(adapter.getName('string'));
			assert.isUndefined(adapter.getName(null));
			assert.isUndefined(adapter.getName(undefined));
			assert.isUndefined(adapter.getName(w(WidgetBase, {})));
		});

		it('get text', () => {
			assert.strictEqual(adapter.getText(v('div')), '');
			assert.strictEqual(adapter.getText(w(WidgetBase, {})), '');
			assert.strictEqual(adapter.getText(undefined), '');
			assert.strictEqual(adapter.getText(null), '');
			assert.strictEqual(adapter.getText('string'), '');
		});

		it('remove subsets', () => {
			let dNode: DNode = v('div');
			assert.strictEqual(adapter.removeSubsets(dNode), dNode);
			dNode = w(WidgetBase, {});
			assert.strictEqual(adapter.removeSubsets(dNode), dNode);
			dNode = undefined;
			assert.strictEqual(adapter.removeSubsets(dNode), dNode);
			dNode = null;
			assert.strictEqual(adapter.removeSubsets(dNode), dNode);
			dNode = 'string';
			assert.strictEqual(adapter.removeSubsets(dNode), dNode);
		});

		it('has attribute', () => {
			assert.isFalse(adapter.hasAttrib(v('span'), 'key'));
			assert.isTrue(adapter.hasAttrib(v('span', { key: 'foo' }), 'key'));
			assert.isFalse(adapter.hasAttrib(w(WidgetBase, {}), 'key'));
			assert.isTrue(adapter.hasAttrib(w(WidgetBase, { key: 'foo' }), 'key'));
			assert.isFalse(adapter.hasAttrib('string', 'key'));
			assert.isFalse(adapter.hasAttrib(null, 'key'));
			assert.isFalse(adapter.hasAttrib(undefined, 'key'));
		});

		it('get attribute value', () => {
			assert.isUndefined(adapter.getAttributeValue(v('span'), 'key'));
			assert.strictEqual(adapter.getAttributeValue(v('span', { key: 'foo' }), 'key'), 'foo');
			assert.isUndefined(adapter.getAttributeValue(w(WidgetBase, {}), 'key'));
			assert.strictEqual(adapter.getAttributeValue(w(WidgetBase, { key: 'foo' }), 'key'), 'foo');
			assert.isUndefined(adapter.getAttributeValue('string', 'key'));
			assert.isUndefined(adapter.getAttributeValue(null, 'key'));
			assert.isUndefined(adapter.getAttributeValue(undefined, 'key'));
		});

		it('get children', () => {
			assert.deepEqual(adapter.getChildren(v('div', [v('span')])), [v('span')]);
			assert.deepEqual(adapter.getChildren(v('div', {}, [w(WidgetBase, {})])), [w(WidgetBase, {})]);
			assert.deepEqual(adapter.getChildren(w(WidgetBase, {}, [v('span')])), [v('span')]);
			assert.deepEqual(adapter.getChildren(w(WidgetBase, {}, [w(WidgetBase, {})])), [w(WidgetBase, {})]);
			assert.deepEqual(adapter.getChildren(w(WidgetBase, {})), []);
			assert.deepEqual(adapter.getChildren(v('div')), undefined);
			assert.deepEqual(adapter.getChildren(undefined), []);
			assert.deepEqual(adapter.getChildren(null), []);
			assert.deepEqual(adapter.getChildren('string'), []);
		});

		it('find one', () => {
			const predicate = (elem: WNode) => elem.properties.key === 'foo';
			let found = adapter.findOne(predicate, [w(WidgetBase, { key: 'foo' })]);
			assert.deepEqual(found, w(WidgetBase, { key: 'foo' }));
			found = adapter.findOne(predicate, [w(WidgetBase, {}, [v('div', { key: 'foo' })])]);
			assert.deepEqual(found, v('div', { key: 'foo' }));
			found = adapter.findOne(predicate, [w(WidgetBase, {})]);
			assert.isNull(found);
		});

		it('find all', () => {
			const predicate = (elem: WNode) => elem.properties.key === 'foo';
			let found = adapter.findAll(predicate, [w(WidgetBase, { key: 'foo' })]);
			assert.deepEqual(found, [w(WidgetBase, { key: 'foo' })]);
			found = adapter.findAll(predicate, [w(WidgetBase, {}, [v('div', { key: 'foo' })])]);
			assert.deepEqual(found, [v('div', { key: 'foo' })]);
			found = adapter.findAll(predicate, [w(WidgetBase, {})]);
			assert.deepEqual(found, []);
		});

		it('exists one', () => {
			const predicate = (elem: WNode) => elem.properties.key === 'foo';
			let found = adapter.existsOne(predicate, [w(WidgetBase, { key: 'foo' })]);
			assert.isTrue(found);
			found = adapter.existsOne(predicate, [w(WidgetBase, {})]);
			assert.isFalse(found);
		});

		it('get sibling', () => {
			const node: any = w(WidgetBase, {}, [w(WidgetBase, {})]);
			node.children[0].parent = node;
			assert.deepEqual(adapter.getSiblings(node.children[0]), node.children);
		});

		it('get parent', () => {
			const node: any = w(WidgetBase, {}, [w(WidgetBase, {})]);
			node.children[0].parent = node;
			assert.deepEqual(adapter.getParent(node.children[0]), node);
		});
	});

	describe('parse selector', () => {
		it('Should parse `@` into key selector', () => {
			assert.strictEqual(parseSelector('@key'), '[key="key"]');
		});
		it('Should parse `@` into key selector as part of a bigger selector preserving ordering', () => {
			assert.strictEqual(parseSelector('div span@key .root'), 'div span[key="key"] .root');
		});
	});
});
