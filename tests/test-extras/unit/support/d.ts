import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import { stub } from 'sinon';
import {
	assignChildProperties,
	assignProperties,
	compareProperty,
	findIndex,
	findKey,
	replaceChild,
	replaceChildProperties,
	replaceProperties
} from '../../../src/support/d';

import { v, w } from '@dojo/widget-core/d';
import AssertionError from '../../../src/support/AssertionError';
import assertRender from '../../../src/support/assertRender';

registerSuite({
	name: 'support/virtualDom',

	'assignChildProperties()': {
		'by index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			assignChildProperties(actual, 1, { target: '_blank' });

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link', target: '_blank' }) ]));
		},

		'does not resolve'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assert.throws(() => {
				assignChildProperties(actual, 0, { target: '_blank' });
			}, TypeError, 'Index of "0" is not resolving to a valid target');
		}
	},

	'assignProperties()': {
		'basic'() {
			const actual = v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]));

			assignProperties(actual, { styles: { 'font-weight': 'bold' } });

			assertRender(actual, v('div', { styles: { 'font-weight': 'bold' } }, [ null, v('a', { href: '#link' }) ]));
		},
		'with class function'() {
			const actual = v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]));

			assignProperties(actual, { classes: () => {
				return { testClass: true };
			}});

			assertRender(actual, v('div', { styles: { 'color': 'blue' }, classes: { testClass: true } }, [ null, v('a', { href: '#link' }) ]));
		}
	},

	'compareProperty()': {
		'equals'() {
			let called = false;
			const obj = {};
			const compareString = compareProperty((value: string, name, parent) => {
				assert.strictEqual(name, 'bar');
				assert.strictEqual(parent, obj);
				called = true;
				return value === 'foo';
			});
			assert.isUndefined(compareString.diff('foo', 'bar', obj));
			assert.isTrue(called);
		},

		'unequal'() {
			let called = false;
			const compareNothing = compareProperty(() => {
				called = true;
				return false;
			});
			assert.throws(() => {
				compareNothing.diff('foo', 'bar', {});
			}, AssertionError, 'The value of property "bar" is unexpected.');
			assert.isTrue(called);
		}
	},

	'replaceChild()': {
		'by index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			replaceChild(actual, 0, v('dfn'));

			assertRender(actual, v('div', {}, [ v('dfn'), v('a', { href: '#link' }) ]));
		},

		'by string index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			replaceChild(actual, '0', v('dfn'));

			assertRender(actual, v('div', {}, [ v('dfn'), v('a', { href: '#link' }) ]));
		},

		'no children'() {
			const actual = w('widget', {});

			assertRender(actual, w('widget', {}));

			replaceChild(actual, 0, v('span'));

			assertRender(actual, w('widget', {}, [ v('span') ]));
		},

		'by string deep index'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]));

			replaceChild(actual, '0,0', 'baz');

			assertRender(actual, v('div', {}, [ v('span', {}, [ 'baz' ]), v('a', { href: '#link' }) ]));
		},

		'final item missing children'() {
			const actual = v('div', [ v('span', [ w('widget', { }) ]) ]);

			assertRender(actual, v('div', [ v('span', [ w('widget', { }) ]) ]));

			replaceChild(actual, '0,0,0', 'foo');

			assertRender(actual, v('div', [ v('span', [ w('widget', { }, [ 'foo' ]) ]) ]));
		},

		'string index resolving to a non child node throws'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);

			assert.throws(() => {
				replaceChild(actual, '0,0,0', 'bar');
			}, TypeError, 'Index of "0,0,0" is not resolving to a valid target');
		},

		'string index resolve to an earlier non child node throws'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);

			assert.throws(() => {
				replaceChild(actual, '3,0,0', 'bar');
			}, TypeError, 'Index of "3,0,0" is not resolving to a valid target');
		}
	},

	'replaceChildProperties()': {
		'by index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			replaceChildProperties(actual, 1, { target: '_blank' });

			assertRender(actual, v('div', {}, [ null, v('a', { target: '_blank' }) ]));
		},

		'throws when final child can\'t have properties'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', {}, [ null, v('a', { href: '#link' }) ]));

			assert.throws(() => {
				replaceChildProperties(actual, 0, { target: '_blank' });
			}, TypeError, 'Index of "0" is not resolving to a valid target');
		}
	},

	'replaceProperties()': {
		'basic'() {
			const actual = v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]);

			assertRender(actual, v('div', { styles: { 'color': 'blue' } }, [ null, v('a', { href: '#link' }) ]));

			replaceProperties(actual, { classes: { 'foo': true } });

			assertRender(actual, v('div', { classes: { 'foo': true } }, [ null, v('a', { href: '#link' }) ]));
		}
	},

	'findKey()': {
		'key not found'() {
			assert.isUndefined(findKey(v('div'), 'foo'), 'should not find a key');
		},

		'key not found with children'() {
			assert.isUndefined(findKey(v('div', [ v('span', { key: 'bar' }), 'foo', null ]), 'foo'), 'should not find key');
		},

		'key is in root node'() {
			assertRender(findKey(v('div', { key: 'foo' }), 'foo')!, v('div', { key: 'foo' }), 'should find root node');
		},

		'key is in child'() {
			assertRender(findKey(v('div', { key: 'bar' }, [ v('span', { key: 'foo' }), 'foo', null ]), 'foo')!, v('span', { key: 'foo' }), 'should find child node');
		},

		'key is object'() {
			const obj = {};
			assertRender(findKey(v('div', { key: 'bar' }, [ v('span', { key: obj }), 'foo', null ]), obj)!, v('span', { key: obj }), 'should find child node');
		},

		'value is WNode'() {
			const vnode = w<any>('widget', {
					onClick() { }
				}, [
					w<any>('sub-widget', { key: 'foo', onClick() { } }),
					w<any>('sub-widget', { key: 'bar', onClick() { } })
				]);

			assertRender(findKey(vnode, 'foo')!, w<any>('sub-widget', { key: 'foo', onClick() { } }), 'should find widget');
		},

		'duplicate keys warn'() {
			const warnStub = stub(console, 'warn');

			const fixture = v('div', { key: 'foo' }, [
				v('span', { key: 'parent1' }, [
					v('i', { key: 'icon', id: 'i1' })
				]),
				v('span', { key: 'parent2' }, [
					v('i', { key: 'icon', id: 'i2' })
				])
			]);

			assertRender(findKey(fixture, 'icon')!, v('i', { key: 'icon', id: 'i1' }), 'should find first key');
			assert.strictEqual(warnStub.callCount, 1, 'should have been called once');
			assert.strictEqual(warnStub.lastCall.args[0], 'Duplicate key of "icon" found.', 'should have logged duplicate key');
			warnStub.restore();
		}
	},

	'findIndex()': {
		'by string index'() {
			const actual = v('div', {}, [ null, v('a', { href: '#link' }) ]);
			assertRender(findIndex(actual, '1')!, v('a', { href: '#link' }));
		},

		'no children returns undefined'() {
			const actual = w('widget', {});
			assert.isUndefined(findIndex(actual, 0));
		},

		'by string deep index'() {
			const actual = v('div', {}, [ v('span', {}, [ v('a', { href: '#link' }) ]) ]);
			assertRender(findIndex(actual, '0,0')!, v('a', { href: '#link' }));
		},

		'final item missing children returns undefined'() {
			const actual = v('div', [ v('span', [ w('widget', { }) ]) ]);
			assert.isUndefined(findIndex(actual, '0,0,0'));
		},

		'string index resolving to a non child returns undefined'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);
			assert.isUndefined(findIndex(actual, '0,0,0'));
		},

		'string index resolve to an earlier non child node returns undefined'() {
			const actual = v('div', {}, [ v('span', {}, [ 'foobar' ]), v('a', { href: '#link' }) ]);
			assert.isUndefined(findIndex(actual, '3,0,0'));
		}
	}
});
