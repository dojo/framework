const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import AssertionError from '../../../src/support/AssertionError';
import assertRender from '../../../src/support/assertRender';
import { v, w } from '@dojo/widget-core/d';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { VNode, SupportedClassName, WidgetProperties, WNode } from '@dojo/widget-core/interfaces';

interface MockWidgetProperties extends WidgetProperties {
	classes?: SupportedClassName | SupportedClassName[];
	foo?: string;
	bar?: number;
	baz?: () => void;
}

class MockWidget extends WidgetBase<MockWidgetProperties> {
	render() {
		return v('div');
	}
}

class OtherWidget extends WidgetBase<MockWidgetProperties> {
	render() {
		return v('div');
	}
}

registerSuite('support/assertRender', {
	'v()': {
		'tag equal'() {
			assertRender(v('div'), v('div'));
		},

		'array VNodes equal'() {
			assertRender([v('div'), v('span')], [v('div'), v('span')]);
		},

		'actual VNodes array and expected VNode not equal'() {
			assert.throws(
				() => {
					assertRender([v('div'), v('span')], v('div'));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'expected VNode and expected VNode array not equal'() {
			assert.throws(
				() => {
					assertRender(v('div'), [v('div'), v('span')]);
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'tag difference'() {
			assert.throws(
				() => {
					assertRender(v('div'), v('span'));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'properties equal'() {
			assertRender(v('div', { styles: { color: 'black' } }), v('div', { styles: { color: 'black' } }));
		},

		'properties not equal'() {
			assert.throws(
				() => {
					assertRender(v('div', { styles: { color: 'black' } }), v('div', { styles: { color: 'white' } }));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'function properties equal'() {
			assertRender(v('div', { func() {} }), v('div', { func() {} }));
		},

		'unexpected function property'() {
			assert.throws(
				() => {
					assertRender(v('div', { func() {} }), v('div', {}));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'missing function property'() {
			assert.throws(
				() => {
					assertRender(v('div', {}), v('div', { func() {} }));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'empty children'() {
			assertRender(v('div', {}, []), v('div', {}, []));
		},

		'missing children'() {
			assert.throws(
				() => {
					assertRender(v('div', {}), v('div', {}, []));
				},
				AssertionError,
				'Render unexpected: Expected children'
			);
		},

		'unexpected children'() {
			assert.throws(
				() => {
					assertRender(v('div', {}, []), v('div', {}));
				},
				AssertionError,
				'Render unexpected: Unxpected children'
			);
		},

		'string children equal'() {
			assertRender(v('div', {}, ['foo']), v('div', {}, ['foo']));
		},

		'string children unequal'() {
			assert.throws(
				() => {
					assertRender(v('div', {}, ['foo']), v('div', {}, ['bar']));
				},
				AssertionError,
				'Render unexpected: Unexpected string values'
			);
		},

		'rendered string child equal'() {
			const actual = v('div', {}, [v('', {})]);
			(actual.children![0] as any).text = 'foo';
			assertRender(actual, v('div', {}, ['foo']));
		},

		'rendered string child not equal'() {
			const actual = v('div', {}, [v('', {})]);
			(actual.children![0] as any).text = 'foo';
			assert.throws(
				() => {
					assertRender(actual, v('div', {}, ['bar']));
				},
				AssertionError,
				'Render unexpected: Expected text differs from rendered text: [0]'
			);
		},

		'missing child'() {
			assert.throws(
				() => {
					assertRender(v('div', {}, ['foo']), v('div', {}, ['foo', 'bar']));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'extra child'() {
			assert.throws(
				() => {
					assertRender(v('div', {}, ['foo', 'bar']), v('div', {}, ['foo']));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'VNode children equal'() {
			assertRender(v('div', {}, [v('span', {}, ['foo'])]), v('div', {}, [v('span', {}, ['foo'])]));
		},

		'VNode children not equal'() {
			assert.throws(
				() => {
					assertRender(v('div', {}, [v('span', {}, ['foo'])]), v('div', {}, [v('i', {}, ['foo'])]));
				},
				AssertionError,
				'Render unexpected: Tags do not match: [0]'
			);
		},

		'WNode children equal'() {
			assertRender(
				v('div', {}, [v('span', {}, [w(MockWidget, { foo: 'bar', baz() {} })])]),
				v('div', {}, [v('span', {}, [w(MockWidget, { foo: 'bar', baz() {} })])])
			);
		},

		'WNode children not equal'() {
			assert.throws(
				() => {
					assertRender(
						v('div', {}, [v('span', {}, [w(MockWidget, { foo: 'bar', baz() {} })])]),
						v('div', {}, [v('span', {}, [w(MockWidget, { foo: 'baz', baz() {} })])])
					);
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'compare unique classes only'() {
			assertRender(
				v('div', { classes: ['foo', null, 'bar'] }),
				v('div', { classes: [null, 'bar', 'foo', undefined] })
			);

			assertRender(v('div', { classes: null }), v('div', { classes: [] }));

			assertRender(v('div', { classes: 'foo' }), v('div', { classes: ['foo'] }));

			assertRender(v('div', { classes: 'foo' }), v('div', { classes: 'foo' }));

			assert.throws(
				() => {
					assertRender(v('div', { classes: 'foo' }), v('div', { classes: ['bar'] }));
				},
				AssertionError,
				'The value of property "classes" is unexpected.'
			);

			assert.throws(
				() => {
					assertRender(
						v('div', { classes: ['foo', null, 'bar'] }),
						v('div', { classes: ['foo', null, 'baz'] })
					);
				},
				AssertionError,
				'The value of property "classes" is unexpected.'
			);

			assert.throws(
				() => {
					assertRender(v('div', { classes: ['foo', 'bar', 'baz'] }), v('div', { classes: ['foo', 'bar'] }));
				},
				AssertionError,
				'The value of property "classes" is unexpected.'
			);
		}
	},

	'w()': {
		'class equal'() {
			assertRender(w(MockWidget, {}), w(MockWidget, {}));
		},

		'WNode array equal'() {
			assertRender([w(MockWidget, {})], [w(MockWidget, {})]);
		},

		'string constructors equal'() {
			assertRender(w('foo', {}), w('foo', {}));
		},

		'class equal, different properties'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, { foo: 'bar' }), w(MockWidget, { bar: 2 }));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'property missing'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, { foo: 'bar' }), w(MockWidget, {}));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'property different'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, { foo: 'bar' }), w(MockWidget, { foo: 'baz' }));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'property extra'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, { foo: 'bar' }), w(MockWidget, { foo: 'bar', bar: 2 }));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'properties have functions'() {
			assertRender(w(MockWidget, { baz() {} }), w(MockWidget, { baz() {} }));
		},

		'added function'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, { baz() {} }), w(MockWidget, {}));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'missing function'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, {}), w(MockWidget, { baz() {} }));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'class unequal'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, {}), w(OtherWidget, {}));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'string constructor unequal'() {
			assert.throws(
				() => {
					assertRender(w('foo', {}), w('bar', {}));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'empty children'() {
			assertRender(w(MockWidget, {}, []), w(MockWidget, {}, []));
		},

		'string children equal'() {
			assertRender(w(MockWidget, {}, ['foo']), w(MockWidget, {}, ['foo']));
		},

		'VNode children equal'() {
			assertRender(w(MockWidget, {}, [v('div')]), w(MockWidget, {}, [v('div')]));
		},

		'WNode children equal'() {
			assertRender(w(MockWidget, {}, [w(OtherWidget, {})]), w(MockWidget, {}, [w(OtherWidget, {})]));
		},

		'unexpected children'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, {}, [w(OtherWidget, {})]), w(MockWidget, {}));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'missing children'() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, {}), w(MockWidget, {}, [w(OtherWidget, {})]));
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'extra child'() {
			assert.throws(
				() => {
					assertRender(
						w(MockWidget, {}, [w(OtherWidget, {}), w(OtherWidget, {})]),
						w(MockWidget, {}, [w(OtherWidget, {})])
					);
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'missing child'() {
			assert.throws(
				() => {
					assertRender(
						w(MockWidget, {}, [w(OtherWidget, {})]),
						w(MockWidget, {}, [w(OtherWidget, {}), w(OtherWidget, {})])
					);
				},
				AssertionError,
				'Render unexpected'
			);
		},

		'bind property ignored'() {
			const bind = new MockWidget();
			assertRender(w(MockWidget, <any>{ bind }), w(MockWidget, {}));
		},

		'compare unique classes only'() {
			assertRender(
				w(MockWidget, { classes: ['foo', null, 'bar'] }),
				w(MockWidget, { classes: [null, 'bar', 'foo', undefined] })
			);

			assertRender(w(MockWidget, { classes: null }), w(MockWidget, { classes: [] }));

			assertRender(w(MockWidget, { classes: 'foo' }), w(MockWidget, { classes: ['foo'] }));

			assertRender(w(MockWidget, { classes: 'foo' }), w(MockWidget, { classes: 'foo' }));

			assert.throws(
				() => {
					assertRender(w(MockWidget, { classes: 'foo' }), w(MockWidget, { classes: ['bar'] }));
				},
				AssertionError,
				'The value of property "classes" is unexpected.'
			);

			assert.throws(
				() => {
					assertRender(
						w(MockWidget, { classes: ['foo', null, 'bar'] }),
						w(MockWidget, { classes: ['foo', null, 'baz'] })
					);
				},
				AssertionError,
				'The value of property "classes" is unexpected.'
			);

			assert.throws(
				() => {
					assertRender(
						w(MockWidget, { classes: ['foo', 'bar', 'baz'] }),
						w(MockWidget, { classes: ['foo', 'bar'] })
					);
				},
				AssertionError,
				'The value of property "classes" is unexpected.'
			);
		}
	},

	strings: {
		equal() {
			assertRender('foo', 'foo');
		},

		unequal() {
			assert.throws(
				() => {
					assertRender('foo', 'bar');
				},
				AssertionError,
				'Render unexpected'
			);
		}
	},

	null: {
		equal() {
			assertRender(null, null);
		},

		unequal() {
			assert.throws(
				() => {
					assertRender(null, 'bar');
				},
				AssertionError,
				'Render unexpected'
			);
		}
	},

	'throws with message'() {
		assert.throws(
			() => {
				assertRender(null, 'bar', 'foo');
			},
			AssertionError,
			'Render unexpected: DNode type mismatch, expected "string" actual "null": foo'
		);
		assert.throws(
			() => {
				assertRender('bar', null, 'foo');
			},
			AssertionError,
			'Render unexpected: DNode type mismatch, expected "null" actual "string": foo'
		);
	},

	options: {
		isWNode() {
			let called = false;
			assertRender(w(MockWidget, {}), w(MockWidget, {}), {
				isWNode(node: any): node is WNode {
					called = true;
					return true;
				}
			});
			assert.isTrue(called, 'isWNode should have been called');
		},

		isVNode() {
			let called = false;
			assertRender(v('div'), v('div'), {
				isVNode(node: any): node is VNode {
					called = true;
					return true;
				}
			});
			assert.isTrue(called, 'isVNode should have been called');
		},

		allowFunctionValues() {
			assert.throws(
				() => {
					assertRender(w(MockWidget, { baz() {} }), w(MockWidget, { baz() {} }), {
						allowFunctionValues: false
					});
				},
				TypeError,
				'Value of property named "baz" from first argument is not a primative, plain Object, or Array.'
			);
		},

		ignoreProperties() {
			assertRender(v('div', { foo: 'bar', bar: 2 }), v('div', { foo: 'bar' }), {
				ignoreProperties(prop): boolean {
					return prop === 'bar';
				}
			});
		},

		ignorePropertyValues: {
			'is passed'() {
				assertRender(v('div', { foo: 'bar', bar: 2 }), v('div', { foo: 'bar', bar: 3 }), {
					ignorePropertyValues(prop): boolean {
						return prop === 'bar';
					}
				});
			},

			'overrides defaults'() {
				const bind = new MockWidget();
				assert.throws(
					() => {
						assertRender(w<any>(MockWidget, { bind }), w<any>(MockWidget, { bind: true }), {
							ignoreProperties: ['foo']
						});
					},
					TypeError,
					'Value of property named "bind" from first argument is not a primative, plain Object, or Array.'
				);
			}
		},

		'diff should exclude ignored properties and property values'() {
			try {
				assertRender(v('div', { foo: 'bar', bar: 2, baz: 2 }), v('div', { foo: 'baz', baz: 3 }), {
					ignoreProperties(prop): boolean {
						return prop === 'bar';
					},
					ignorePropertyValues(prop): boolean {
						return prop === 'baz';
					}
				});
			} catch (err) {
				assert.deepEqual(
					err.actual,
					{ foo: 'bar' },
					'Should have excluded ignored properties from "actual" value'
				);
				assert.deepEqual(
					err.expected,
					{ foo: 'baz' },
					'Should have excluded ignored properties from "expected" value'
				);
			}
		}
	}
});
