import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { assign } from '@dojo/core/lang';
import { WidgetProperties, WNode, DNode, HNode } from './../../src/interfaces';
import createWidgetBase from '../../src/createWidgetBase';
import { v, w, decorate, registry, WNODE, HNODE, isWNode, isHNode } from '../../src/d';
import FactoryRegistry from './../../src/FactoryRegistry';

class TestFactoryRegistry extends FactoryRegistry {
	clear() {
		this.registry.clear();
	}
}

const createTestWidget = createWidgetBase.override({
	getNode() {
		return v('outernode', { type: 'mytype' }, [
			v('child-one'),
			v('child-two'),
			v('child-three'),
			v('child-four'),
			'my text',
			null,
			w(createWidgetBase, { myProperty: true }),
			w(createWidgetBase, { myProperty: true })
		]);
	}
});

registerSuite({
	name: 'd',
	'provides default factory registry'() {
		assert.isObject(registry);
	},
	w: {
		'create WNode wrapper'() {
			const properties: WidgetProperties = { id: 'id', classes: [ 'world' ] };
			const dNode = w(createWidgetBase, properties);
			assert.deepEqual(dNode.factory, createWidgetBase);
			assert.deepEqual(dNode.properties, { id: 'id', classes: [ 'world' ]});
			assert.equal(dNode.type, WNODE);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isHNode(dNode));
		},
		'create WNode wrapper using a factory label'() {
			registry.define('my-widget', createWidgetBase);
			const properties: WidgetProperties = { id: 'id', classes: [ 'world' ] };
			const dNode = w('my-widget', properties);
			assert.deepEqual(dNode.factory, 'my-widget');
			assert.deepEqual(dNode.properties, { id: 'id', classes: [ 'world' ] });
			assert.equal(dNode.type, WNODE);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isHNode(dNode));
		},
		'create WNode wrapper with children'() {
			const properties: WidgetProperties = { id: 'id', classes: [ 'world' ] };
			const dNode = w(createWidgetBase, properties, [ w(createWidgetBase, properties) ]);
			assert.deepEqual(dNode.factory, createWidgetBase);
			assert.deepEqual(dNode.properties, { id: 'id', classes: [ 'world' ] });
			assert.lengthOf(dNode.children, 1);
			assert.equal(dNode.type, WNODE);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isHNode(dNode));
		}
	},
	v: {
		'create HNode wrapper'() {
			const hNode = v('div');
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 0);
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		},
		'create HNode wrapper with options'() {
			const hNode = v('div', { innerHTML: 'Hello World' });
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 0);
			const render = hNode.render();
			assert.equal(render.vnodeSelector, 'div');
			assert.equal(render.properties && render.properties.innerHTML, 'Hello World');
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		},
		'create HNode wrapper with children'() {
			const hNode = v('div', {}, [ v('div'), v('div') ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		},
		'create HNode wrapper with children as options param'() {
			const hNode = v('div', [ v('div'), v('div') ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		},
		'create HNode wrapper with text node children'() {
			const hNode = v('div', {}, [ 'This Text Node', 'That Text Node' ]);
			assert.isFunction(hNode.render);
			assert.lengthOf(hNode.children, 2);
			assert.equal(hNode.type, HNODE);
			assert.isTrue(isHNode(hNode));
			assert.isFalse(isWNode(hNode));
		}
	},
	decorator: {
		'modifies only nodes that match predicate'() {
			const testWidget = createTestWidget();
			const predicate = (node: DNode): boolean => {
				return isWNode(node);
			};
			const modifier = (node: DNode): void => {
				if (isWNode(node)) {
					node.properties['decorated'] = true;
				}
			};
			const node = <HNode> testWidget.getNode();
			assert.isOk(node);
			decorate(node, modifier, predicate);
			if (node) {
				const children = <(WNode|HNode)[]> node.children;
				assert.isUndefined(children![0].properties['decorated']);
				assert.isUndefined(children![1].properties['decorated']);
				assert.isUndefined(children![2].properties['decorated']);
				assert.isUndefined(children![3].properties['decorated']);
				assert.strictEqual(children![4], 'my text');
				assert.isNull(children![5]);
				assert.isTrue(children![6].properties['decorated']);
				assert.isTrue(children![7].properties['decorated']);
			}
		},
		'modifies no node when predicate not matched'() {
			const testWidget = createTestWidget();
			const predicate = (node: DNode): boolean => {
				return false;
			};
			const modifier = (node: DNode): void => {
				if (isWNode(node)) {
					node.properties['decorated'] = true;
				}
			};
			const node = <HNode> testWidget.getNode();
			assert.isOk(node);
			decorate(node, modifier, predicate);
			if (node) {
				const children = <(WNode|HNode)[]> node.children;
				assert.isUndefined(children![0].properties['decorated']);
				assert.isUndefined(children![1].properties['decorated']);
				assert.isUndefined(children![2].properties['decorated']);
				assert.isUndefined(children![3].properties['decorated']);
				assert.strictEqual(children![4], 'my text');
				assert.isNull(children![5]);
				assert.isUndefined(children![6].properties['decorated']);
				assert.isUndefined(children![7].properties['decorated']);
			}
		},
		'applies modifier to all nodes when no predicate supplied'() {
			const testWidget = createTestWidget();
			const modifier = (node: DNode): void => {
				if (isWNode(node)) {
					node.properties['decorated'] = true;
				}
				else if (isHNode(node)) {
					assign(node.properties, { id: 'id' });
				}
			};
			const children: any = (<HNode> testWidget.getNode()).children;
			assert.isOk(children);
			decorate(children, modifier);
			if (children) {
				assert.strictEqual(children[0].properties['id'], 'id');
				assert.strictEqual(children[1].properties['id'], 'id');
				assert.strictEqual(children[2].properties['id'], 'id');
				assert.strictEqual(children[3].properties['id'], 'id');
				assert.strictEqual(children[4], 'my text');
				assert.isNull(children[5]);
				assert.isTrue(children[6].properties['decorated']);
				assert.isTrue(children[7].properties['decorated']);
			}
		},
		'cannot replace or modify actual node'() {
			const testWidget = createTestWidget();
			const magicNode = v('magic');
			const modifier = (node: DNode): void => {
				if (node === null) {
					node = magicNode;
				}
				else if (typeof node === 'string') {
					node = 'replaced string';
				}
			};
			const children: any = (<HNode> testWidget.getNode()).children;
			assert.isOk(children);
			decorate(children, modifier);
			if (children) {
				assert.strictEqual(children[4], 'my text');
				assert.isNull(children[5]);
			}
		}
	},
	'isHNode and isWNode': {
		'isWNode returns false for null'() {
			assert.isFalse(isWNode(null));
		},
		'isWNode returns false for a string'() {
			assert.isFalse(isWNode('string'));
		},
		'isHNode returns false for null'() {
			assert.isFalse(isHNode(null));
		},
		'isHNode returns false for a string'() {
			assert.isFalse(isHNode('string'));
		}
	}
});
