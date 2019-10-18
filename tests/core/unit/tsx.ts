const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '../../../src/core/WidgetBase';
import { VNode, WidgetProperties, WNode } from '../../../src/core/interfaces';
import { tsx, fromRegistry, REGISTRY_ITEM, isVNode } from '../../../src/core/vdom';

registerSuite('tsx', {
	'create a registry wrapper'() {
		const RegistryWrapper = fromRegistry<WidgetProperties>('tag');
		assert.strictEqual((RegistryWrapper as any).type, REGISTRY_ITEM);
		const registryWrapper = new RegistryWrapper();
		assert.strictEqual(registryWrapper.name, 'tag');
		// These will always be undefined but show the type inference of properties.
		registryWrapper.__properties__ = {};
		assert.isUndefined(registryWrapper.__properties__.key);
	},
	tsx: {
		'tsx generate a VNode'() {
			const node: VNode = tsx('div', { hello: 'world' }, ['child']) as VNode;
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, { hello: 'world' });
			assert.deepEqual(node.children, ['child']);
			assert.isTrue(isVNode(node));
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
		'tsx generate a WNode from a registry type'() {
			const node: WNode = tsx({ type: 'registry' }, { hello: 'world', __autoRegistryItem: 'foo' }, [
				'child'
			]) as WNode;
			assert.deepEqual(node.widgetConstructor, 'foo');
			assert.deepEqual(node.properties, { hello: 'world' } as any);
			assert.deepEqual(node.children, ['child']);
		},
		'children arrays are spread correctly'() {
			const node: VNode = tsx('div', { hello: 'world' }, ['child', ['child-2', ['child-3']]]) as VNode;
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, { hello: 'world' });
			assert.deepEqual(node.children, ['child', 'child-2', 'child-3']);
			assert.isTrue(isVNode(node));
		},
		'defaults properties to empty object'() {
			const node: VNode = tsx('div') as VNode;
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, {});
			assert.deepEqual(node.children, []);
			assert.isTrue(isVNode(node));
		},
		'defaults `null` properties to empty object'() {
			const node: VNode = tsx('div', null as any) as VNode;
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, {});
			assert.deepEqual(node.children, []);
			assert.isTrue(isVNode(node));
		}
	}
});
