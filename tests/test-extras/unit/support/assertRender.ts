import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import AssertionError from '../../../src/support/AssertionError';
import assertRender from '../../../src/support/assertRender';
import { v, w } from '@dojo/widget-core/d';
import WidgetBase from '@dojo/widget-core/WidgetBase';
import { WidgetProperties } from '@dojo/widget-core/interfaces';

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
	name: 'support/vdom',

	'assertRender()': {
		'v()': {
			'tag equal'() {
				assertRender(
					v('div'),
					v('div')
				);
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

			'bind value ignored'() {
				const bind = new MockWidget();
				assertRender(
					w(MockWidget, { bind }),
					w(MockWidget, { bind: true })
				);
			},

			'bind extra'() {
				const bind = new MockWidget();
				assert.throws(() => {
					assertRender(
						w(MockWidget, { bind }),
						w(MockWidget, { })
					);
				});
			},

			'bind missing'() {
				const bind = new MockWidget();
				assert.throws(() => {
					assertRender(
						w(MockWidget, { }),
						w(MockWidget, { bind })
					);
				});
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
		}
	}
});
