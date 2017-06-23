import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as diff from '../../src/diff';
import WidgetBase from '../../src/WidgetBase';

registerSuite({
	name: 'diff',
	'always'() {
		const foo = {};
		const result = diff.always(foo, foo);
		assert.equal(result.value, foo);
		assert.isTrue(result.changed);
	},
	'ignore'() {
		const result = diff.ignore('foo', 'bar');
		assert.equal(result.value, 'bar');
		assert.isFalse(result.changed);
	},
	'reference'() {
		const foo = {
			bar: 'bar'
		};
		const bar = {
			bar: 'bar'
		};
		const result = diff.reference(foo, bar);
		assert.equal(result.value, bar);
		assert.isTrue(result.changed);
	},
	'shallow': {
		'object'() {
			const foo = {
				bar: 'bar'
			};
			const bar = {
				bar: 'bar'
			};
			let result = diff.shallow(foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			bar.bar = 'qux';
			result = diff.shallow(foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);

			const baz = {
				bar: 'bar',
				baz: 'baz'
			};
			result = diff.shallow(foo, baz);
			assert.equal(result.value, baz);
			assert.isTrue(result.changed);

			result = diff.shallow('foo', baz);
			assert.equal(result.value, baz);
			assert.isTrue(result.changed);
		},
		'array'() {
			const foo = [ 1, 2, 3 ];
			const bar = [ 1, 2, 3 ];
			let result = diff.shallow(foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			const qux = [ 1, 3, 2];
			result = diff.shallow(foo, qux);
			assert.equal(result.value, qux);
			assert.isTrue(result.changed);
		}
	},
	'auto': {
		'widget constructor'() {
			class Foo extends WidgetBase {}
			class Bar extends WidgetBase {}
			let result = diff.auto(Foo, Bar);
			assert.equal(result.value, Bar);
			assert.isTrue(result.changed);
		},
		'function'() {
			const foo = () => {};
			const bar = () => {};
			let result = diff.auto(foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);
		},
		'object'() {
			const foo = {
				bar: 'bar'
			};
			const bar = {
				bar: 'bar'
			};
			let result = diff.auto(foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			bar.bar = 'qux';
			result = diff.auto(foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);
		},
		'other'() {
			const foo = new Date();
			let result = diff.auto(foo, foo);
			assert.equal(result.value, foo);
			assert.isFalse(result.changed);

			const bar = new Date();
			result = diff.auto(foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);
		}
	}
});
