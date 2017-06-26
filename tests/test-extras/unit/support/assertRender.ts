import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import AssertionError from '../../../src/support/AssertionError';
import assertRender from '../../../src/support/assertRender';
import { v, w } from '@dojo/widget-core/d';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { HNode, WidgetProperties, WNode } from '@dojo/widget-core/interfaces';

interface MockWidgetProperties extends WidgetProperties {
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

registerSuite({
	name: 'support/assertRender',

	'v()': {
		'tag equal'() {
			assertRender(
				v('div'),
				v('div')
			);
		},

		'array HNodes equal'() {
			assertRender(
				[ v('div'), v('span') ],
				[ v('div'), v('span') ]
			);
		},

		'actual HNodes array and expected HNode not equal'() {
			assert.throws(() => {
				assertRender(
					[ v('div'), v('span') ],
					v('div')
				);
			}, AssertionError, 'Render unexpected');
		},

		'expected HNode and expected HNode array not equal'() {
			assert.throws(() => {
				assertRender(
					v('div'),
					[ v('div'), v('span') ]
				);
			}, AssertionError, 'Render unexpected');
		},

		'tag difference'() {
			assert.throws(() => {
				assertRender(v('div'), v('span'));
			}, AssertionError, 'Render unexpected');
		},

		'properties equal'() {
			assertRender(
				v('div', { styles: { 'color': 'black' } }),
				v('div', { styles: { 'color': 'black' } })
			);
		},

		'properties not equal'() {
			assert.throws(() => {
				assertRender(
					v('div', { styles: { 'color': 'black' } }),
					v('div', { styles: { 'color': 'white' } })
				);
			}, AssertionError, 'Render unexpected');
		},

		'function properties equal'() {
			assertRender(
				v('div', { afterCreate() { } }),
				v('div', { afterCreate() { } })
			);
		},

		'unexpected function property'() {
			assert.throws(() => {
				assertRender(
					v('div', { afterCreate() { } }),
					v('div', { })
				);
			}, AssertionError, 'Render unexpected');
		},

		'missing function property'() {
			assert.throws(() => {
				assertRender(
					v('div', { }),
					v('div', { afterCreate() { } })
				);
			}, AssertionError, 'Render unexpected');
		},

		'empty children'() {
			assertRender(
				v('div', { }, []),
				v('div', { }, [])
			);
		},

		'string children equal'() {
			assertRender(
				v('div', { }, [ 'foo' ]),
				v('div', { }, [ 'foo' ])
			);
		},

		'missing child'() {
			assert.throws(() => {
				assertRender(
					v('div', { }, [ 'foo' ]),
					v('div', { }, [ 'foo', 'bar' ])
				);
			}, AssertionError, 'Render unexpected');
		},

		'extra child'() {
			assert.throws(() => {
				assertRender(
					v('div', { }, [ 'foo', 'bar' ]),
					v('div', { }, [ 'foo' ])
				);
			}, AssertionError, 'Render unexpected');
		},

		'HNode children equal'() {
			assertRender(
				v('div', { }, [ v('span', {}, [ 'foo' ]) ]),
				v('div', { }, [ v('span', {}, [ 'foo' ]) ])
			);
		},

		'HNode children not equal'() {
			assert.throws(() => {
				assertRender(
					v('div', { }, [ v('span', {}, [ 'foo' ]) ]),
					v('div', { }, [ v('i', {}, [ 'foo' ]) ])
				);
			}, AssertionError, 'Render unexpected');
		},

		'WNode children equal'() {
			assertRender(
				v('div', { }, [ v('span', {}, [ w(MockWidget, { foo: 'bar', baz() { } }) ]) ]),
				v('div', { }, [ v('span', {}, [ w(MockWidget, { foo: 'bar', baz() { } }) ]) ])
			);
		},

		'WNode children not equal'() {
			assert.throws(() => {
				assertRender(
					v('div', { }, [ v('span', {}, [ w(MockWidget, { foo: 'bar', baz() { } }) ]) ]),
					v('div', { }, [ v('span', {}, [ w(MockWidget, { foo: 'baz', baz() { } }) ]) ])
				);
			}, AssertionError, 'Render unexpected');
		}
	},

	'w()': {
		'class equal'() {
			assertRender(
				w(MockWidget, {}),
				w(MockWidget, {})
			);
		},

		'WNode array equal'() {
			assertRender(
				[ w(MockWidget, {}) ],
				[ w(MockWidget, {}) ]
			);
		},

		'string constructors equal'() {
			assertRender(
				w('foo', {}),
				w('foo', {})
			);
		},

		'class equal, different properties'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { foo: 'bar' }),
					w(MockWidget, { bar: 2 })
				);
			}, AssertionError, 'Render unexpected');
		},

		'property missing'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { foo: 'bar' }),
					w(MockWidget, { })
				);
			}, AssertionError, 'Render unexpected');
		},

		'property different'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { foo: 'bar' }),
					w(MockWidget, { foo: 'baz' })
				);
			}, AssertionError, 'Render unexpected');
		},

		'property extra'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { foo: 'bar' }),
					w(MockWidget, { foo: 'bar', bar: 2 })
				);
			}, AssertionError, 'Render unexpected');
		},

		'properties have functions'() {
			assertRender(
				w(MockWidget, { baz() {} }),
				w(MockWidget, { baz() {} })
			);
		},

		'added function'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { baz() {} }),
					w(MockWidget, { })
				);
			}, AssertionError, 'Render unexpected');
		},

		'missing function'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { }),
					w(MockWidget, { baz() {} })
				);
			}, AssertionError, 'Render unexpected');
		},

		'class unequal'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, {}),
					w(OtherWidget, {})
				);
			}, AssertionError, 'Render unexpected');
		},

		'string constructor unequal'() {
			assert.throws(() => {
				assertRender(
					w('foo', {}),
					w('bar', {})
				);
			}, AssertionError, 'Render unexpected');
		},

		'empty children'() {
			assertRender(
				w(MockWidget, {}, []),
				w(MockWidget, {}, [])
			);
		},

		'string children equal'() {
			assertRender(
				w(MockWidget, {}, [ 'foo' ]),
				w(MockWidget, {}, [ 'foo' ])
			);
		},

		'HNode children equal'() {
			assertRender(
				w(MockWidget, {}, [ v('div') ]),
				w(MockWidget, {}, [ v('div') ])
			);
		},

		'WNode children equal'() {
			assertRender(
				w(MockWidget, {}, [ w(OtherWidget, {}) ]),
				w(MockWidget, {}, [ w(OtherWidget, {}) ])
			);
		},

		'unexpected children'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { }, [ w(OtherWidget, {}) ]),
					w(MockWidget, { })
				);
			}, AssertionError, 'Render unexpected');
		},

		'missing children'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { }),
					w(MockWidget, { }, [ w(OtherWidget, {}) ])
				);
			}, AssertionError, 'Render unexpected');
		},

		'extra child'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { }, [ w(OtherWidget, {}), w(OtherWidget, {}) ]),
					w(MockWidget, { }, [ w(OtherWidget, {}) ])
				);
			}, AssertionError, 'Render unexpected');
		},

		'missing child'() {
			assert.throws(() => {
				assertRender(
					w(MockWidget, { }, [ w(OtherWidget, {}) ]),
					w(MockWidget, { }, [ w(OtherWidget, {}), w(OtherWidget, {}) ])
				);
			}, AssertionError, 'Render unexpected');
		},

		'bind property ignored'() {
			const bind = new MockWidget();
			assertRender(
				w(MockWidget, <any> { bind }),
				w(MockWidget, { })
			);
		}
	},

	'strings': {
		'equal'() {
			assertRender('foo', 'foo');
		},

		'unequal'() {
			assert.throws(() => {
				assertRender('foo', 'bar');
			}, AssertionError, 'Render unexpected');
		}
	},

	'null': {
		'equal'() {
			assertRender(null, null);
		},

		'unequal'() {
			assert.throws(() => {
				assertRender(null, 'bar');
			}, AssertionError, 'Render unexpected');
		}
	},

	'throws with message'() {
		assert.throws(() => {
			assertRender(null, 'bar', 'foo');
		}, AssertionError, 'Render unexpected: foo');
	},

	'options': {
		'isWNode'() {
			let called = false;
			assertRender(w(MockWidget, {}), w(MockWidget, {}), {
				isWNode(node: any): node is WNode {
					called = true;
					return true;
				}
			});
			assert.isTrue(called, 'isWNode should have been called');
		},

		'isHNode'() {
			let called = false;
			assertRender(v('div'), v('div'), {
				isHNode(node: any): node is HNode {
					called = true;
					return true;
				}
			});
			assert.isTrue(called, 'isHNode should have been called');
		},

		'allowFunctionValues'() {
			assert.throws(() => {
				assertRender(w(MockWidget, { baz() { } }), w(MockWidget, { baz() { } }), {
					allowFunctionValues: false
				});
			}, TypeError, 'Value of property named "baz" from first argument is not a primative, plain Object, or Array.');
		},

		'ignoreProperties'() {
			assertRender(v('div', { foo: 'bar', bar: 2 }), v('div', { foo: 'bar' }), {
				ignoreProperties(prop): boolean {
					return prop === 'bar';
				}
			});
		},

		'ignorePropertyValues': {
			'is passed'() {
				assertRender(v('div', { foo: 'bar', bar: 2 }), v('div', { foo: 'bar', bar: 3 }), {
					ignorePropertyValues(prop): boolean {
						return prop === 'bar';
					}
				});
			},

			'overrides defaults'() {
				const bind = new MockWidget();
				assert.throws(() => {
					assertRender(w<any>(MockWidget, { bind }), w<any>(MockWidget, { bind: true }), {
						ignoreProperties: [ 'foo' ]
					});
				}, TypeError, 'Value of property named "bind" from first argument is not a primative, plain Object, or Array.');
			}
		}
	}
});
