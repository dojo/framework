import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as array from '../../src/array';
import has, { add as hasAdd } from '../../src/support/has';
import { Iterable, ShimIterator } from '../../src/iterator';
import 'src/Symbol';

function mixin(destination: any, source: any): any {
	for (let key in source) {
		destination[key] = source[key];
	}
	return destination;
}

function assertFrom<T>(arrayable: ArrayLike<T> | Iterable<T>, expected: T[]): void;
function assertFrom(arrayable: any, expected: any[]): void {
	let actual = array.from(arrayable);
	assert.isArray(actual);
	assert.deepEqual(expected, actual);
}

class MyArray {
	constructor() {
		Array.apply(this, arguments);
		return this;
	}
	static from = array.from;
}
MyArray.prototype = Object.create(Array.prototype);

function createDojoTests(feature: string, tests: {}) {
	const hasConfiguration = has(feature);
	const dojoTests: any = mixin({}, tests);

	dojoTests.setup = function () {
		hasAdd(feature, false, true);
	};

	dojoTests.teardown = function () {
		hasAdd(feature, hasConfiguration, true);
	};

	return dojoTests;
}

function createNativeTests(feature: string, tests: {}) {
	const hasConfiguration = has(feature);

	if (!hasConfiguration) {
		return;
	}

	const nativeTests: any = mixin({}, tests);

	nativeTests.setup = function () {
		hasAdd(feature, true, true);
	};

	nativeTests.teardown = function () {
		hasAdd(feature, hasConfiguration, true);
	};

	return nativeTests;
}

function createNativeAndDojoArrayTests(feature: string, tests: {}) {
	const nativeTests = createNativeTests(feature, tests);
	const allTests: any = {
		dojo: createDojoTests(feature, tests)
	};

	if (nativeTests) {
		allTests.native = nativeTests;
	}

	return allTests;
}

registerSuite({
	name: 'array',

	'.from()': createNativeAndDojoArrayTests('es6-array-from', {
		'from undefined: throws': function () {
			assert.throws(function () {
				array.from(<any> undefined);
			}, TypeError);
		},

		'from null: throws': function () {
			assert.throws(function () {
				array.from(<any> null);
			});
		},

		'from array-like': (function () {
			let obj: { [item: string]: any; length: number; };

			return {
				beforeEach: function () {
					obj = {
						'0': 'zero',
						'1': 'one',
						'2': 'two',
						length: 3
					};
				},

				'object': function () {
					assertFrom(obj, [ 'zero', 'one', 'two' ]);
				},

				'object with NaN length': function () {
					obj.length = Number.NaN;
					assertFrom(obj, []);
				},

				'object with negative length': function () {
					obj.length = -1;
					assertFrom(obj, []);
				},

				'object with infinite length: throws': function () {
					obj.length = Number.POSITIVE_INFINITY;
					assert.throws(function () {
						array.from(obj);
					});
				},

				'object with float length': function () {
					obj.length = Math.PI;
					assertFrom(obj, [ 'zero', 'one', 'two' ]);
				},

				'object with too-long-length': function () {
					obj.length = 5;
					assertFrom(obj, [ 'zero', 'one', 'two', undefined, undefined ]);
				}
			};
		})(),

		'from not-array-like object': function () {
			assertFrom(<any> {
				'0': 'zero',
				'1': 'one',
				'2': 'two'
			}, []);
		},

		'from iterator': {
			'ShimIterator': function () {
				assertFrom(new ShimIterator({
					0: 'zero',
					1: 'one',
					2: 'two',
					length: 3
				}), [ 'zero', 'one', 'two' ]);
			},

			'Custom iterator': function () {
				const iterator = {
					[Symbol.iterator]() {
						return {
							index: 0,
							next(this: any) {
								return this.index < 5 ? { value: this.index++, done: false } : { done: true, value: undefined };
							}
						};
					}
				};
				assertFrom(iterator, [ 0, 1, 2, 3, 4 ]);
			}
		},

		'from boolean': function () {
			assertFrom(<any> false, []);
		},

		'from number': function () {
			assertFrom(<any> 1, []);
		},

		'from string': function () {
			let actual = array.from('hello');
			assert.isArray(actual);
			assert.deepEqual([ 'h', 'e', 'l', 'l', 'o' ], actual);
		},

		'from array': function () {
			assertFrom([ 1, 2, 3 ], [ 1, 2, 3 ]);
		},

		'with optional map function': function () {
			let actual = array.from([ 1, 2, 3 ], function (value: any) {
				return value * 2;
			});
			assert.isArray(actual);
			assert.deepEqual([ 2, 4, 6 ], actual);
		},

		'with optional map function and this argument': function () {
			let thing = {
				count: 0,
				mapFunction: function (this: any) {
					return this.count++;
				}
			};
			let actual = array.from([ 1, 2, 3 ], thing.mapFunction, thing);
			assert.isArray(actual);
			assert.deepEqual([ 0, 1, 2 ], actual);
		},

		'with union type': function () {
			let thing: ArrayLike<number> | Iterable<number> = {
				'0': 0,
				'1': 1,
				'2': 2,
				length: 3,
				[Symbol.iterator]() {
					return {
						index: 0,
						next(this: any) {
							return this.index < 3 ? { value: this.index++, done: false } : { done: true, value: undefined };
						}
					};
				}
			};
			let actual = array.from(thing);
			assert.deepEqual([ 0, 1, 2 ], actual);
		}
	}),

	'.of()': createNativeAndDojoArrayTests('es6-array-of', {
		'empty arguments': function () {
			assert.deepEqual(array.of(), []);
		},

		'single argument': function () {
			// This is the reason for using of() rather than Array()
			assert.deepEqual(array.of(1), [ 1 ]);
		},

		'multiple arguments': function () {
			assert.deepEqual(array.of('one', 'two', 'three'), [ 'one', 'two', 'three' ]);
		}
	}),

	'#fill()': createNativeAndDojoArrayTests('es6-array-fill', {
		'basic fill array': function () {
			let actual = array.fill([ 1, 2, 3 ], 9);
			assert.deepEqual(actual, [ 9, 9, 9 ]);
		},

		'fill with start': function () {
			let actual = array.fill([ 1, 2, 3 ], 9, 1);
			assert.deepEqual(actual, [ 1, 9, 9 ]);
		},

		'fill with negative start': function () {
			let actual = array.fill([ 1, 2, 3 ], 9, -1);
			assert.deepEqual(actual, [ 1, 2, 9 ]);
		},

		'fill with nonsense start results in 0 start': function () {
			let expected = [ 9, 9, 9 ];
			assert.deepEqual(array.fill([ 1, 2, 3 ], 9, NaN), expected);
		},

		'fill with start exceeding length results in nothing filled': function () {
			let actual = array.fill([ 1, 2, 3 ], 9, Number.POSITIVE_INFINITY);
			assert.deepEqual(actual, [ 1, 2, 3 ]);
		},

		'fill with negative start larger than length results in 0 start': function () {
			let actual = array.fill([ 1, 2, 3 ], 9, Number.NEGATIVE_INFINITY);
			assert.deepEqual(actual, [ 9, 9, 9 ]);
		},

		'fill with valid start and end': function () {
			let actual = array.fill([ 1, 2, 3 ], 9, 1, 2);
			assert.deepEqual(actual, [ 1, 9, 3 ]);
		},

		'fill with negative end': function () {
			let actual = array.fill([ 1, 2, 3 ], 9, 0, -1);
			assert.deepEqual(actual, [ 9, 9, 3 ]);
		},

		'fill with nonsense end results in no change': function () {
			let actual = array.fill([ 1, 2, 3 ], 9, 0, NaN);
			assert.deepEqual(actual, [ 1, 2, 3 ]);
		},

		'fill with 0 start and negative end larger than length results in nothing filled': function () {
			let actual = array.fill([ 1, 2, 3 ], 9, 0, -4);
			assert.deepEqual(actual, [ 1, 2, 3 ]);
		},

		'fill with array-like object': function () {
			let obj: ArrayLike<number> = {
				0: 1,
				1: 2,
				2: 3,
				length: 3
			};
			let actual = array.fill(obj, 9);
			assert.deepEqual(actual, {
				0: 9,
				1: 9,
				2: 9,
				length: 3
			});
		}
	}),

	'#findIndex()': createNativeAndDojoArrayTests('es6-array-findindex', (function () {
		function callback(element: string) {
			return element === 'goose';
		}

		return {
			'item found': function () {
				let haystack = [ 'duck', 'duck', 'goose' ];
				assert.strictEqual(array.findIndex(haystack, callback), 2);
			},

			'item not found': function () {
				let haystack = [ 'duck', 'duck', 'duck' ];
				assert.strictEqual(array.findIndex(haystack, callback), -1);
			},

			'item found in array-like object': function () {
				let haystack: ArrayLike<string> = {
					0: 'duck',
					1: 'duck',
					2: 'goose',
					length: 3
				};
				assert.strictEqual(array.findIndex(haystack, callback), 2);
			},

			'callback is missing: throws': function () {
				assert.throws(function () {
					array.findIndex([], <any> undefined);
				});
			},

			'callback with this argument': function () {
				let thing = {
					callback: function (this: any, value: number) {
						return this.needle === value;
					},
					needle: 3
				};
				let haystack: number[] = [ 0, 1, 2, 3, 4 ];
				assert.strictEqual(array.findIndex(haystack, thing.callback, thing), 3);
			}
		};
	})()),

	'#find()': createNativeAndDojoArrayTests('es6-array-find', (function () {
		function callback(element: number) {
			return element > 5;
		}

		return {
			'item found': function () {
				let haystack = [ 2, 4, 6, 8 ];
				assert.strictEqual(array.find(haystack, callback), 6);
			},

			'item not found': function () {
				let haystack = [ 1, 2, 3, 4 ];
				assert.isUndefined(array.find(haystack, callback));
			}
		};
	})()),

	'#copyWithin()': createNativeAndDojoArrayTests('es6-array-copywithin', {
		'returns source array': function () {
			let arr: any[] = [];
			assert.equal(array.copyWithin(arr, 0, 0), arr);
		},

		'null target: throws': function () {
			assert.throws(function () {
				array.copyWithin(<any> null, 0, 0);
			}, TypeError);
		},

		'array-like object': function () {
			let obj: ArrayLike<string> = {
				0: 'zero',
				1: 'one',
				2: 'two',
				'length': 3
			};
			let expected = {
				0: 'two',
				1: 'one',
				2: 'two',
				'length': 3
			};
			let actual = array.copyWithin(obj, 0, -1);
			assert.deepEqual(actual, expected);
		},

		'sparse array-like object': function () {
			let obj: ArrayLike<string> = {
				5: 'five',
				10: 'ten',
				'length': 15
			};
			let expected = {
				4: 'five',
				10: 'ten',
				'length': 15
			};
			let actual = array.copyWithin(obj, 4, 5, 10);
			assert.deepEqual(actual, expected);
		},

		'negative length array-like object': function () {
			let obj: ArrayLike<string> = {
				0: 'zero',
				1: 'one',
				2: 'two',
				'length': NaN
			};
			let expected = {
				0: 'zero',
				1: 'one',
				2: 'two',
				'length': NaN
			};
			let actual = array.copyWithin(obj, 1, 0);
			assert.deepEqual(actual, expected);
		},

		'parameterized tests': (function () {
			let tests: { [n: string]: any; } = {};
			let parameters: any[] = [
				[ 'null case', [ 1, 2, 3, 4, 5 ], 0 ],
				[ 'positive offset', [ 1, 2, 1, 2, 3 ], 2 ],
				[ 'negative offset subtracts from length', [ 1, 2, 1, 2, 3 ], -3 ],
				[ 'positive start', [ 1, 2, 4, 5, 5 ], 2, 3 ],
				[ 'negative end subtracts from length', [ 1, 2, 3, 5, 5 ], 2, -2 ],
				[ 'positive end', [ 5, 2, 3, 4, 5 ], 0, 4, 5 ],
				[ 'negative end subtracts from length', [ 3, 2, 3, 4, 5 ], 0, 2, -2 ],
				[ 'non-number end leaves data unchanged', [1, 2, 3, 4, 5], 0, 0, NaN]
			];
			parameters.forEach(function ([ name, expected, offset, start, end ]: [ string, number[], number, number, number ]) {
				tests[name] = function () {
					let arr = [ 1, 2, 3, 4, 5 ];
					let actual = array.copyWithin(arr, offset, start, end);
					assert.strictEqual(actual, arr, 'a new array should not be created');
					assert.deepEqual(actual, expected);
				};
			});

			return tests;
		})()
	}),

	'#includes': createNativeAndDojoArrayTests('es7-array-includes', (function() {
		let arr: number[];
		return {
			beforeEach() {
				arr = [ 1, 2, NaN, 3, 4, 5 ];
			},

			'item found'() {
				assert.isTrue(array.includes(arr, 2));
			},

			'item not found from given starting index'() {
				assert.isFalse(array.includes(arr, 1, 2));
			},

			'item not found'() {
				assert.isFalse(array.includes(arr, 17));
			},

			'NaN found'() {
				assert.isTrue(array.includes(arr, NaN));
			},

			'NaN not found'() {
				assert.isFalse(array.includes(arr, NaN, 3));
				assert.isFalse(array.includes([ 1, 2, 3 ], NaN));
			}
		};
	})()),

	'extension support': createDojoTests('es6-array-from', {
		'.from()': function () {
			let actual = MyArray.from([ 1, 2, 3 ]);
			assert.instanceOf(actual, MyArray);
		}
	})
});
