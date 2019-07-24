const { assert } = intern.getPlugin('chai');
const { registerSuite } = intern.getPlugin('jsdom');
import { assign } from '../../../src/shim/object';
import { DNode, VNode, WNode } from '../../../src/core/interfaces';
import { WidgetBase } from '../../../src/core/WidgetBase';
import { dom, v, w, isWNode, isVNode } from '../../../src/core/vdom';
import { decorate } from '../../../src/core/util';

interface ChildProperties {
	myChildProperty: string;
}

interface TestProperties {
	required: boolean;
}

class TestChildWidget extends WidgetBase<ChildProperties> {
	render() {
		return v('div');
	}
}

class FooWidget extends WidgetBase<any> {}

class TestWidget extends WidgetBase<TestProperties, WNode<TestChildWidget>> {
	render() {
		return v('outernode', { type: 'mytype' }, [
			v('child-one'),
			v('child-two'),
			v('child-three'),
			v('child-four'),
			'my text',
			null,
			w(FooWidget, { myProperty: true }),
			w(FooWidget, { myProperty: true })
		]);
	}
}

registerSuite('d', {
	w: {
		'create WNode wrapper using constructor with properties'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const dNode = w(WidgetBase, properties);

			assert.deepEqual(dNode.widgetConstructor, WidgetBase);
			assert.deepEqual(dNode.properties, properties);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using label with properties'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const dNode = w('my-widget', properties);

			assert.deepEqual(dNode.widgetConstructor, 'my-widget');
			assert.deepEqual(dNode.properties, { id: 'id', classes: ['world'] } as any);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using constructor with children'() {
			const dNode = w(TestWidget, { required: true }, [w(TestChildWidget, { myChildProperty: '' })]);

			assert.deepEqual(dNode.widgetConstructor, TestWidget);
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using constructor with VNode children'() {
			const dNode = w(TestChildWidget, { myChildProperty: '' }, [v('div')]);

			assert.deepEqual(dNode.widgetConstructor, TestChildWidget);
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using constructor with properties and children'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const dNode = w(WidgetBase, properties, [w(WidgetBase, properties)]);

			assert.deepEqual(dNode.widgetConstructor, WidgetBase);
			assert.deepEqual(dNode.properties, properties);
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'create WNode wrapper using string label with properties and children'() {
			const properties: any = { id: 'id', classes: ['world'] };
			const dNode = w('my-widget', properties, [w(WidgetBase, properties)]);

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
			assert.strictEqual(dNode.widgetConstructor, symbolLabel);
			assert.deepEqual(dNode.properties, { id: 'id', classes: ['world'] } as any);
			assert.lengthOf(dNode.children, 1);
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
		},
		'should merge properties onto a WNode'() {
			class Foo extends WidgetBase<{ foo: string; bar: number }> {}
			const dNode = w(Foo, { foo: 'foo', bar: 1 }, ['child']);
			assert.strictEqual(dNode.widgetConstructor, Foo);
			assert.deepEqual(dNode.properties, { foo: 'foo', bar: 1 });
			assert.lengthOf(dNode.children, 1);
			assert.strictEqual(dNode.children[0], 'child');
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
			const mergedNode = w(dNode, { foo: 'bar' });
			// maintains properties typings, this errors
			// w(dNode, { foo: 1 });
			assert.strictEqual(mergedNode.widgetConstructor, Foo);
			assert.deepEqual(mergedNode.properties, { foo: 'bar', bar: 1 });
			assert.lengthOf(mergedNode.children, 1);
			assert.strictEqual(dNode.children[0], 'child');
			assert.isTrue(isWNode(mergedNode));
			assert.isFalse(isVNode(mergedNode));
		},
		'should replace children on a WNode'() {
			class Foo extends WidgetBase<any, string> {}
			const dNode = w(Foo, {}, ['original']);
			assert.strictEqual(dNode.widgetConstructor, Foo);
			assert.deepEqual(dNode.properties, {});
			assert.lengthOf(dNode.children, 1);
			assert.strictEqual(dNode.children[0], 'original');
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
			const mergedNode = w(dNode, {}, ['updated', 'children']);
			// maintains children typings, this errors
			// w(dNode, { }, [ v('div') ]);
			assert.strictEqual(mergedNode.widgetConstructor, Foo);
			assert.deepEqual(mergedNode.properties, {});
			assert.lengthOf(mergedNode.children, 2);
			assert.strictEqual(mergedNode.children[0], 'updated');
			assert.strictEqual(mergedNode.children[1], 'children');
			assert.isTrue(isWNode(mergedNode));
			assert.isFalse(isVNode(mergedNode));
		},
		'should replace children with an empty array on a WNode'() {
			class Foo extends WidgetBase<any, string> {}
			const dNode = w(Foo, {}, ['original']);
			assert.strictEqual(dNode.widgetConstructor, Foo);
			assert.deepEqual(dNode.properties, {});
			assert.lengthOf(dNode.children, 1);
			assert.strictEqual(dNode.children[0], 'original');
			assert.isTrue(isWNode(dNode));
			assert.isFalse(isVNode(dNode));
			const mergedNode = w(dNode, {}, []);
			assert.strictEqual(mergedNode.widgetConstructor, Foo);
			assert.deepEqual(mergedNode.properties, {});
			assert.lengthOf(mergedNode.children, 0);
			assert.isTrue(isWNode(mergedNode));
			assert.isFalse(isVNode(mergedNode));
		}
	},
	v: {
		'create VNode wrapper'() {
			const vNode = v('div');
			assert.isUndefined(vNode.children);
			assert.equal(vNode.tag, 'div');
			assert.isTrue(isVNode(vNode));
			assert.isFalse(isWNode(vNode));
		},
		'create VNode wrapper with children'() {
			const vNode = v('div', {}, [v('div'), v('div')]);
			assert.lengthOf(vNode.children!, 2);
			assert.isTrue(isVNode(vNode));
			assert.isFalse(isWNode(vNode));
		},
		'create VNode wrapper with children as options param'() {
			const vNode = v('div', [v('div'), v('div')]);
			assert.lengthOf(vNode.children!, 2);
			assert.isTrue(isVNode(vNode));
			assert.isFalse(isWNode(vNode));
		},
		'create VNode wrapper with text node children'() {
			const vNode = v('div', {}, ['This Text Node', 'That Text Node']);
			assert.lengthOf(vNode.children!, 2);
			assert.isTrue(isVNode(vNode));
			assert.isFalse(isWNode(vNode));
		},
		'should mix properties onto passed vnode properties'() {
			const children = ['child'];
			const vnode = v('div', { a: 'a', b: 'b' }, children);
			const mergedVNode = v(vnode, { c: 'c', b: 'c' });
			assert.strictEqual(mergedVNode.tag, 'div');
			assert.deepEqual(mergedVNode.properties, { a: 'a', b: 'c', c: 'c', styles: {}, classes: [] });
			assert.strictEqual(mergedVNode.children, children);
		},
		'should replace children on passed vnode'() {
			const children = ['new child'];
			const vnode = v('div', { a: 'a', b: 'b' }, ['child']);
			const mergedVNode = v(vnode, { c: 'c', b: 'c' }, children);
			assert.strictEqual(mergedVNode.tag, 'div');
			assert.deepEqual(mergedVNode.properties, { a: 'a', b: 'c', c: 'c', styles: {}, classes: [] });
			assert.strictEqual(mergedVNode.children, children);
		},
		'should merge styles onto passed vnode properties'() {
			const vnode = v('div', { styles: { color: 'red', width: '100px' } });
			const mergedVNode = v(vnode, { styles: { width: '200px', height: '100px' } });
			assert.strictEqual(mergedVNode.tag, 'div');
			assert.deepEqual(mergedVNode.properties.styles, { color: 'red', width: '200px', height: '100px' });
		},
		'should merge classes onto passed vnode properties with no classes'() {
			const vnode = v('div');
			const mergedVNode = v(vnode, { classes: 'baz' });
			assert.strictEqual(mergedVNode.tag, 'div');
			assert.deepEqual(mergedVNode.properties.classes, ['baz']);
		},
		'should merge classes onto passed vnode properties with string classes'() {
			const vnode = v('div', { classes: 'foo' });
			const mergedVNode = v(vnode, { classes: ['baz'] });
			assert.strictEqual(mergedVNode.tag, 'div');
			assert.deepEqual(mergedVNode.properties.classes, ['foo', 'baz']);
		},
		'should merge classes onto passed vnode properties with an array of classes'() {
			const vnode = v('div', { classes: ['foo', 'bar'] });
			const mergedVNode = v(vnode, { classes: ['baz'] });
			assert.strictEqual(mergedVNode.tag, 'div');
			assert.deepEqual(mergedVNode.properties.classes, ['foo', 'bar', 'baz']);
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
	dom: {
		'creates VNode with the DOM node attached, associated tagname and default diff type'() {
			const div = document.createElement('div');
			const vnode = dom(
				{
					node: div,
					props: { foo: 1, bar: 'bar' },
					attrs: { baz: 'baz' }
				},
				[v('div'), w(WidgetBase, {})]
			);
			assert.strictEqual(vnode.domNode, div);
			assert.strictEqual(vnode.tag, 'div');
			assert.deepEqual(vnode.properties, { foo: 1, bar: 'bar' });
			assert.deepEqual(vnode.attributes, { baz: 'baz' });
			assert.deepEqual(vnode.children, [v('div'), w(WidgetBase, {})] as any);
			assert.strictEqual(vnode.diffType, 'none');
		},
		'creates an empty properties and attribute object and undefined children when not passed'() {
			const span = document.createElement('span');
			const vnode = dom({
				node: span
			});
			assert.strictEqual(vnode.domNode, span);
			assert.strictEqual(vnode.tag, 'span');
			assert.deepEqual(vnode.properties, {});
			assert.deepEqual(vnode.attributes, {});
			assert.deepEqual(vnode.children, undefined);
			assert.strictEqual(vnode.diffType, 'none');
		},

		'can override the default diffType'() {
			const span = document.createElement('span');
			const vnode = dom({
				node: span,
				diffType: 'dom'
			});
			assert.strictEqual(vnode.domNode, span);
			assert.strictEqual(vnode.tag, 'span');
			assert.deepEqual(vnode.properties, {});
			assert.deepEqual(vnode.attributes, {});
			assert.deepEqual(vnode.children, undefined);
			assert.strictEqual(vnode.diffType, 'dom');
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
			decorate(node, { modifier, predicate: isWNode });
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
		'Calling the breaker drains the node queue'() {
			const nodeOne = w(WidgetBase, {});
			const nodeTwo = 'text node';
			const nodeThree = v('div');
			const nodeFour = v('div');
			const nodes = [nodeOne, nodeTwo, nodeThree, nodeFour];
			decorate(nodes, {
				modifier: (node: DNode, breaker: Function) => {
					if (isVNode(node)) {
						node.properties = { ...node.properties, key: 'key' };
						breaker();
					}
				}
			});
			assert.isUndefined(nodeOne.properties.key);
			assert.strictEqual(nodeTwo, 'text node');
			assert.strictEqual(nodeThree.properties.key, 'key');
			assert.isUndefined(nodeFour.properties.key);
		},
		'Passing shallow will only direct the top node or nodes'() {
			const childOne = v('div');
			const nodeOne = w(WidgetBase, {}, [childOne]);
			const nodeTwo = 'text node';
			const childTwo = v('div');
			const nodeThree = v('div', {}, [childTwo]);
			const nodeFour = v('div');
			const nodes = [nodeOne, nodeTwo, nodeThree, nodeFour];
			decorate(nodes, {
				modifier: (node: DNode, breaker: Function) => {
					if (isVNode(node) || isWNode(node)) {
						node.properties = { ...node.properties, key: 'key' };
					}
				},
				shallow: true
			});
			assert.strictEqual(nodeOne.properties.key, 'key');
			assert.strictEqual(nodeTwo, 'text node');
			assert.strictEqual(nodeThree.properties.key, 'key');
			assert.strictEqual(nodeFour.properties.key, 'key');
			assert.isUndefined(childOne.properties.key);
			assert.isUndefined(childTwo.properties.key);
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
			decorate(children, { modifier });
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
