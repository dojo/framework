import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as object from 'src/object';

var target: any;

function createAssignTestArrayLike(source: string | any[]) {
	return function () {
		object.assign(target, source);
		assert.isDefined(target);
		assert.isUndefined(target.length, 'The length property should not be copied from array or string');
		for (var i = source.length; i--;) {
			assert.strictEqual(target[i], source[i]);
		}
	};
}

function createAssignTestUnchanged(source: any) {
	return function () {
		var original = Object.create(target);
		object.assign(target, source);

		assert.deepEqual(target, original, 'The object should not be changed');
	};
}

registerSuite({
	name: 'object',

	'.assign()': {
		beforeEach() {
			target = {
				property1: 'value1',
				property2: 'value2'
			};
		},

		'undefined first argument throws'() {
			assert.throws(function () {
				object.assign(undefined);
			});
		},

		'null first argument throws'() {
			assert.throws(function () {
				object.assign(null);
			});
		},

		'first and second arguments are defined'() {
			var source = {
				property3: 'value3',
				property4: 'value4'
			};

			var assigned = object.assign(target, source);

			assert.deepEqual(assigned, {
				property1: 'value1',
				property2: 'value2',
				property3: 'value3',
				property4: 'value4'
			});
			assert.strictEqual(assigned, target, 'The return value should be the modified target object');
		},

		'only iterates over source\'s own keys'() {
			var ancestor = { property3: 'value3' };
			var source = Object.create(ancestor);
			source.property4 = 'value4';

			object.assign(target, source);
			assert.isUndefined(target.property3, 'Target should not include a non-own property from source');
			assert.deepEqual(target, {
				property1: 'value1',
				property2: 'value2',
				property4: 'value4'
			});
		},

		'many source objects'() {
			var source1 = {
				property3: 'value3',
				property4: 'value4'
			};

			var source2 = {
				property5: 'value5',
				property6: 'value6'
			};

			var source3 = {
				property7: 'value7',
				property8: 'value8'
			};

			object.assign(target, source1, source2, source3);

			assert.deepEqual(target, {
				property1: 'value1',
				property2: 'value2',
				property3: 'value3',
				property4: 'value4',
				property5: 'value5',
				property6: 'value6',
				property7: 'value7',
				property8: 'value8'
			});
		},

		'many source objects, sparse'() {
			var source1 = {
				property3: 'value3',
				property4: 'value4'
			};

			var source3 = {
				property7: 'value7',
				property8: 'value8'
			};

			object.assign(target, source1, null, source3);

			assert.deepEqual(target, {
				property1: 'value1',
				property2: 'value2',
				property3: 'value3',
				property4: 'value4',
				property7: 'value7',
				property8: 'value8'
			});
		},

		'second argument is an array': createAssignTestArrayLike([ 1, 2, 3 ]),
		'second argument is a string': createAssignTestArrayLike('source'),

		'second argument is a number': createAssignTestUnchanged(1),
		'second argument is a boolean': createAssignTestUnchanged(true),
		'second argument is a RegExp': createAssignTestUnchanged(/\s/),
		'second argument is null': createAssignTestUnchanged(null)
	},

	'.is()': {
		'two identical strings'() {
			assert.isTrue(object.is('foo', 'foo'));
		},

		'two different strings'() {
			assert.isFalse(object.is('foo', 'bar'));
		},

		'two NaNs'() {
			assert.isTrue(object.is(NaN, NaN));
		},

		'the same object'() {
			var obj = {};
			assert.isTrue(object.is(obj, obj));
		},

		'two nulls'() {
			assert.isTrue(object.is(null, null));
		},

		'two undefineds'() {
			assert.isTrue(object.is(undefined, undefined));
		},

		'null and undefined'() {
			assert.isFalse(object.is(null, undefined));
		},

		'two arrays'() {
			assert.isFalse(object.is([], []));
		},

		'zero and negative zero'() {
			assert.isFalse(object.is(0, -0));
		},

		'two positive zeros'() {
			assert.isTrue(object.is(0, 0));
		},

		'two negative zeros'() {
			assert.isTrue(object.is(-0, -0));
		},

		'two of the same boolean'() {
			assert.isTrue(object.is(true, true));
		},

		'two different booleans'() {
			assert.isFalse(object.is(true, false));
		},

		'two different Date objects with the same value'() {
			var date = new Date();
			assert.isFalse(object.is(date, new Date(Number(date))));
		}
	}
});
