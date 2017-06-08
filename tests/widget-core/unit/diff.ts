import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import diff, { DiffType } from '../../src/diff';
import WidgetBase from '../../src/WidgetBase';
import { stub } from 'sinon';

registerSuite({
	name: 'diff',
	'DiffType.ALWAYS'() {
		const foo = {};
		const result = diff('myProperty', DiffType.ALWAYS, foo, foo);
		assert.equal(result.value, foo);
		assert.isTrue(result.changed);
	},
	'DiffType.IGNORE'() {
		const result = diff('myProperty', DiffType.IGNORE, 'foo', 'bar');
		assert.equal(result.value, 'bar');
		assert.isFalse(result.changed);
	},
	'DiffType.CUSTOM': {
		'diff function'() {
			const foo = 1;
			const bar = 2;
			const meta: any = {};
			let scope;
			meta.diffFunction = function (this: any) {
				scope = this;
				return {
					changed: true,
					value: 'anything'
				};
			};
			meta.scope = meta;
			const result = diff('myProperty', DiffType.CUSTOM, foo, bar, meta);
			assert.isTrue(result.changed);
			assert.equal(result.value, 'anything');
			assert.equal(scope, meta);
		},
		'no diff function'() {
			const foo = 1;
			const bar = 2;
			const result = diff('myProperty', DiffType.CUSTOM, foo, bar, {});
			assert.isFalse(result.changed);
			assert.equal(result.value, 2);
		}
	},
	'DiffType.REFERENCE'() {
		const foo = {
			bar: 'bar'
		};
		const bar = {
			bar: 'bar'
		};
		const result = diff('myProperty', DiffType.REFERENCE, foo, bar);
		assert.equal(result.value, bar);
		assert.isTrue(result.changed);
	},
	'DiffType.SHALLOW': {
		'object'() {
			const foo = {
				bar: 'bar'
			};
			const bar = {
				bar: 'bar'
			};
			let result = diff('myProperty', DiffType.SHALLOW, foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			bar.bar = 'qux';
			result = diff('myProperty', DiffType.SHALLOW, foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);

			const baz = {
				bar: 'bar',
				baz: 'baz'
			};
			result = diff('myProperty', DiffType.SHALLOW, foo, baz);
			assert.equal(result.value, baz);
			assert.isTrue(result.changed);

			result = diff('myProperty', DiffType.SHALLOW, 'foo', baz);
			assert.equal(result.value, baz);
			assert.isTrue(result.changed);
		},
		'array'() {
			const foo = [ 1, 2, 3 ];
			const bar = [ 1, 2, 3 ];
			let result = diff('myProperty', DiffType.SHALLOW, foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			const qux = [ 1, 3, 2];
			result = diff('myProperty', DiffType.SHALLOW, foo, qux);
			assert.equal(result.value, qux);
			assert.isTrue(result.changed);
		}
	},
	'DiffType.AUTO': {
		'widget constructor'() {
			class Foo extends WidgetBase {}
			class Bar extends WidgetBase {}
			let result = diff('myProperty', DiffType.AUTO, Foo, Bar);
			assert.equal(result.value, Bar);
			assert.isTrue(result.changed);
		},
		'function'() {
			const foo = () => {};
			const bar = () => {};
			let result = diff('myProperty', DiffType.AUTO, foo, bar);
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
			let result = diff('myProperty', DiffType.AUTO, foo, bar);
			assert.equal(result.value, bar);
			assert.isFalse(result.changed);

			bar.bar = 'qux';
			result = diff('myProperty', DiffType.AUTO, foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);
		},
		'other'() {
			const foo = new Date();
			let result = diff('myProperty', DiffType.AUTO, foo, foo);
			assert.equal(result.value, foo);
			assert.isFalse(result.changed);

			const bar = new Date();
			result = diff('myProperty', DiffType.AUTO, foo, bar);
			assert.equal(result.value, bar);
			assert.isTrue(result.changed);
		}
	},
	'fall-thru'() {
		const warn = stub(console, 'warn');
		const NONTYPE = 20;
		const foo = {};
		const result = diff('myProperty', NONTYPE, foo, foo);
		warn.restore();
		assert.equal(result.value, foo);
		assert.isTrue(result.changed);
		assert.isTrue(warn.calledWith(`no valid DiffType provided, will mark property 'myProperty' as changed`));
	}
});
