import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { WidgetBase } from './../../src/WidgetBase';
import { HNode, WidgetProperties, WNode } from '../../src/interfaces';
import { tsx, fromRegistry, REGISTRY_ITEM } from '../../src/tsx';
import { HNODE } from './../../src/d';

registerSuite({
	name: 'tsx',
	'create a registry wrapper'() {
		const RegistryWrapper = fromRegistry<WidgetProperties>('tag');
		assert.strictEqual((<any> RegistryWrapper).type, REGISTRY_ITEM);
		const registryWrapper = new RegistryWrapper();
		assert.strictEqual(registryWrapper.name, 'tag');
		// These will always be undefined but show the type inference of properties.
		registryWrapper.properties = {};
		assert.isUndefined(registryWrapper.properties.key);
	},
	tsx: {
		'tsx generate a HNode'() {
			const node: HNode = <HNode> tsx('div', { hello: 'world' }, [ 'child' ]);
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, { hello: 'world' });
			assert.deepEqual(node.children, [ 'child' ]);
			assert.strictEqual(node.type, HNODE);
		},
		'tsx generate a WNode'() {
			const node: WNode = <WNode> tsx(WidgetBase, { hello: 'world' }, [ 'child' ]);
			assert.deepEqual(node.widgetConstructor, WidgetBase);
			assert.deepEqual(node.properties, { hello: 'world' });
			assert.deepEqual(node.children, [ 'child' ]);
		},
		'tsx generate a WNode from a RegistryWrapper'() {
			const RegistryWrapper = fromRegistry<WidgetProperties>('tag');
			const node: WNode = <WNode> tsx(RegistryWrapper, { hello: 'world' }, [ 'child' ]);
			assert.deepEqual(node.widgetConstructor, 'tag');
			assert.deepEqual(node.properties, { hello: 'world' });
			assert.deepEqual(node.children, [ 'child' ]);
		},
		'children arrays are spread correctly'() {
			const node: HNode = <HNode> tsx('div', { hello: 'world' }, [ 'child', [ 'child-2', [ 'child-3' ] ] ]);
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, { hello: 'world' });
			assert.deepEqual(node.children, [ 'child', 'child-2', 'child-3' ]);
			assert.strictEqual(node.type, HNODE);
		},
		'defaults properties to empty object'() {
			const node: HNode = <HNode> tsx('div');
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, {});
			assert.deepEqual(node.children, []);
			assert.strictEqual(node.type, HNODE);
		},
		'defaults `null` properties to empty object'() {
			const node: HNode = <HNode> tsx('div', <any> null);
			assert.deepEqual(node.tag, 'div');
			assert.deepEqual(node.properties, {});
			assert.deepEqual(node.children, []);
			assert.strictEqual(node.type, HNODE);
		}
	}
});
