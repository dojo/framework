const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { assign } from '@dojo/core/lang';
import { DNode, VNode, WNode, WidgetProperties } from '../../src/interfaces';
import { WidgetBase } from '../../src/WidgetBase';
import { v, w, decorate, WNODE, VNODE, isWNode, isVNode } from '../../src/d';

interface ChildProperties extends WidgetProperties {
	myChildProperty: string;
}

interface TestProperties extends WidgetProperties {
	required: boolean;
}

class TestChildWidget extends WidgetBase<ChildProperties> {
	render() {
		return v('div');
	}
}

class TestWidget extends WidgetBase<TestProperties, WNode<TestChildWidget>> {
	render() {
		return v('outernode', { type: 'mytype' }, [
			v('child-one'),
			v('child-two'),
			v('child-three'),
			v('child-four'),
			'my text',
			null,
			w(WidgetBase, { myProperty: true }),
			w(WidgetBase, { myProperty: true })
		]);
	}
}

registerSuite('d', {
	w: {
		'create WNode wrapper using constructor with properties'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const dNode = w(WidgetBase, properties);

			assert.equal(dNode.type, WNODE);
			assert.deepEqual(dNode.widgetConstructor, WidgetBase);
			assert.deepEqual(dNode.properties, { id: 'id', classes: ['world'] });
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using label with properties'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const dNode = w('my-widget', properties);

			assert.equal(dNode.type, WNODE);
			assert.deepEqual(dNode.widgetConstructor, 'my-widget');
			assert.deepEqual(dNode.properties, { id: 'id', classes: ['world'] } as any);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using constructor with children'() {
			const dNode = w(TestWidget, { required: true }, [w(TestChildWidget, { myChildProperty: '' })]);

			assert.equal(dNode.type, WNODE);
			assert.deepEqual(dNode.widgetConstructor, TestWidget);
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using constructor with VNode children'() {
			const dNode = w(TestChildWidget, { myChildProperty: '' }, [v('div')]);

			assert.equal(dNode.type, WNODE);
			assert.deepEqual(dNode.widgetConstructor, TestChildWidget);
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using constructor with properties and children'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const dNode = w(WidgetBase, properties, [w(WidgetBase, properties)]);

			assert.equal(dNode.type, WNODE);
			assert.deepEqual(dNode.widgetConstructor, WidgetBase);
			assert.deepEqual(dNode.properties, { id: 'id', classes: ['world'] });
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using string label with properties and children'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const dNode = w('my-widget', properties, [w(WidgetBase, properties)]);

			assert.equal(dNode.type, WNODE);
			assert.deepEqual(dNode.widgetConstructor, 'my-widget');
			assert.deepEqual(dNode.properties, { id: 'id', classes: ['world'] } as any);
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using symbol label with properties and children'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const symbolLabel = Symbol();

			const dNode = w(symbolLabel, properties, [w(WidgetBase, properties)]);
			assert.equal(dNode.type, WNODE);
			assert.strictEqual(dNode.widgetConstructor, symbolLabel);
			assert.deepEqual(dNode.properties, { id: 'id', classes: ['world'] } as any);
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		}
	},
	v: {
		'create VNode wrapper'() {
			const vNode = v('div');
			assert.isUndefined(vNode.children);
			assert.equal(vNode.tag, 'div');
			assert.equal(vNode.type, VNODE);
			assert.isTrue(isVNode(vNode));
			assert.isFalse(isWNode(vNode));
		},
		'create VNode wrapper with children'() {
			const vNode = v('div', {}, [v('div'), v('div')]);
			assert.lengthOf(vNode.children!, 2);
			assert.equal(vNode.type, VNODE);
			assert.isTrue(isVNode(vNode));
			assert.isFalse(isWNode(vNode));
		},
		'create VNode wrapper with children as options param'() {
			const vNode = v('div', [v('div'), v('div')]);
			assert.lengthOf(vNode.children!, 2);
			assert.equal(vNode.type, VNODE);
			assert.isTrue(isVNode(vNode));
			assert.isFalse(isWNode(vNode));
		},
		'create VNode wrapper with text node children'() {
			const vNode = v('div', {}, ['This Text Node', 'That Text Node']);
			assert.lengthOf(vNode.children!, 2);
			assert.equal(vNode.type, VNODE);
			assert.isTrue(isVNode(vNode));
			assert.isFalse(isWNode(vNode));
		},
		'create VNode wrapper with deferred properties'() {
			const props = () => {
				return { a: 'a' };
			};
			const vNode = v('div', props);

			assert.deepEqual(vNode.properties, {});
			assert.strictEqual(vNode.deferredPropertiesCallback, props);
		}
	},
	decorator: {
		'modifies only nodes that match predicate'() {
			const testWidget = new TestWidget();
			const modifier = (node: WNode): void => {
				(node.properties as any)['decorated'] = true;
			};
			const node = testWidget.render();
			assert.isOk(node);
			decorate(node, modifier, isWNode);
			if (node) {
				const children = <any[]>node.children;
				assert.isUndefined(children[0].properties['decorated']);
				assert.isUndefined(children[1].properties['decorated']);
				assert.isUndefined(children[2].properties['decorated']);
				assert.isUndefined(children[3].properties['decorated']);
				assert.strictEqual(children[4], 'my text');
				assert.isNull(children[5]);
				assert.isTrue(children[6].properties['decorated']);
				assert.isTrue(children[7].properties['decorated']);
			}
		},
		'modifies no node when predicate not matched'() {
			const testWidget = new TestWidget();
			const predicate = (node: DNode): node is WNode => {
				return false;
			};
			const modifier = (node: WNode): void => {
				(node.properties as any)['decorated'] = true;
			};
			const node = testWidget.render();
			assert.isOk(node);
			decorate(node, modifier, predicate);
			if (node) {
				const children = node.children as any[];
				assert.isUndefined(children[0].properties['decorated']);
				assert.isUndefined(children[1].properties['decorated']);
				assert.isUndefined(children[2].properties['decorated']);
				assert.isUndefined(children[3].properties['decorated']);
				assert.strictEqual(children[4], 'my text');
				assert.isNull(children[5]);
				assert.isUndefined(children[6].properties['decorated']);
				assert.isUndefined(children[7].properties['decorated']);
			}
		},
		'applies modifier to all nodes when no predicate supplied'() {
			const testWidget = new TestWidget();
			const modifier = (node: DNode): void => {
				if (isWNode(node)) {
					(node.properties as any)['decorated'] = true;
				} else if (isVNode(node)) {
					assign(node.properties, { id: 'id' });
				}
			};
			const children: any = (<VNode>testWidget.render()).children;
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
			const testWidget = new TestWidget();
			const magicNode = v('magic');
			const modifier = (node: DNode): void => {
				if (node === null) {
					node = magicNode;
				} else if (typeof node === 'string') {
					node = 'replaced string';
				}
			};
			const children: any = (<VNode>testWidget.render()).children;
			assert.isOk(children);
			decorate(children, modifier);
			if (children) {
				assert.strictEqual(children[4], 'my text');
				assert.isNull(children[5]);
			}
		}
	},
	'isVNode and isWNode': {
		'isWNode returns false for null'() {
			assert.isFalse(isWNode(null));
		},
		'isWNode returns false for a string'() {
			assert.isFalse(isWNode('string'));
		},
		'isVNode returns false for null'() {
			assert.isFalse(isVNode(null));
		},
		'isVNode returns false for a string'() {
			assert.isFalse(isVNode('string'));
		}
	}
});
