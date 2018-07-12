const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from './../../src/WidgetBase';
import { VNode, WidgetProperties, WNode } from '../../src/interfaces';
import { tsx, fromRegistry, REGISTRY_ITEM } from '../../src/tsx';
import { VNODE } from './../../src/d';

registerSuite('tsx', {
	'create a registry wrapper'() {
		const RegistryWrapper = fromRegistry<WidgetProperties>('tag');
		assert.strictEqual((RegistryWrapper as any).type, REGISTRY_ITEM);
		const registryWrapper = new RegistryWrapper();
		assert.strictEqual(registryWrapper.name, 'tag');
		// These will always be undefined but show the type inference of properties.
		registryWrapper.properties = {};
		assert.isUndefined(registryWrapper.properties.key);
	},
	tsx: {
		'tsx generate a VNode'() {
			const node: VNode = tsx('div', { hello: 'world' }, ['child']) as VNode;
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, { hello: 'world' });
			assert.deepEqual(node.children, ['child']);
			assert.strictEqual(node.type, VNODE);
		},
		'tsx generate a WNode'() {
			const node: WNode = tsx(WidgetBase, { hello: 'world' }, ['child']) as WNode;
			assert.deepEqual(node.widgetConstructor, WidgetBase);
			assert.deepEqual(node.properties, { hello: 'world' } as any);
			assert.deepEqual(node.children, ['child']);
		},
		'tsx generate a WNode from a RegistryWrapper'() {
			const RegistryWrapper = fromRegistry<WidgetProperties>('tag');
			const node: WNode = tsx(RegistryWrapper, { hello: 'world' }, ['child']) as WNode;
			assert.deepEqual(node.widgetConstructor, 'tag');
			assert.deepEqual(node.properties, { hello: 'world' } as any);
			assert.deepEqual(node.children, ['child']);
		},
		'children arrays are spread correctly'() {
			const node: VNode = tsx('div', { hello: 'world' }, ['child', ['child-2', ['child-3']]]) as VNode;
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, { hello: 'world' });
			assert.deepEqual(node.children, ['child', 'child-2', 'child-3']);
			assert.strictEqual(node.type, VNODE);
		},
		'defaults properties to empty object'() {
			const node: VNode = tsx('div') as VNode;
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, {});
			assert.deepEqual(node.children, []);
			assert.strictEqual(node.type, VNODE);
		},
		'defaults `null` properties to empty object'() {
			const node: VNode = tsx('div', null as any) as VNode;
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, {});
			assert.deepEqual(node.children, []);
			assert.strictEqual(node.type, VNODE);
		}
	}
});
