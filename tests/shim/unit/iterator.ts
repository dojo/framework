import { ShimIterator } from '../../src/iterator';
import '../../src/Symbol';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('iterator', {
	'for..of': {

		'strings'() {
			const str = 'abcdefg';
			const results: string[] = [];
			const expected = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g' ];

			for (const value of str) {
				results.push(value);
			}

			assert.deepEqual(results, expected);
		},

		'double byte strings'() {
			const str = '¯\\_(ツ)_/¯';
			const results: string[] = [];
			const expected = [ '¯', '\\', '_', '(', 'ツ', ')', '_', '/', '¯' ];

			for (const value of str) {
				results.push(value);
			}

			assert.deepEqual(results, expected);
		},

		'utf-16'() {
			const str = '\uD801\uDC00';
			const results: string[] = [];
			const expected = [ '\uD801\uDC00' ];

			for (const value of str) {
				results.push(value);
			}

			assert.deepEqual(results, expected);
		},

		'arrays'() {
			const array: any[] = [ 'foo', 'bar', {}, 1, [ 'qat', 2 ] ];
			const results: any[] = [];

			for (const value of array) {
				results.push(value);
			}

			assert.deepEqual(results, array);
			assert.notStrictEqual(results, array);
		},

		'iterable'() {
			let counter = 0;
			const iterable = {
				[Symbol.iterator]() {
					return {
						next(): {value: number | undefined, done: boolean}  {
							counter++;
							if (counter < 5) {
								return {
									value: counter,
									done: false
								};
							}
							else {
								return { done: true, value: undefined };
							}
						}
					};
				}
			};
			const results: (undefined | number)[] = [];
			const expected = [ 1, 2, 3, 4 ];

			for (const value of iterable) {
				results.push(value);
			}

			assert.deepEqual(results, expected);
		}
	},

	'class ShimIterator': {

		'iterable'() {
			let counter = 0;
			let nativeIterator: any;
			const iterable = {
				[Symbol.iterator]() {
					return nativeIterator = {
						next(): {value: number | undefined, done: boolean} {
							counter++;
							if (counter < 5) {
								return {
									value: counter,
									done: false
								};
							}
							else {
								return { done: true, value: undefined };
							}
						}
					};
				}
			};
			const results: (undefined | number)[] = [];
			const expected = [ 1, 2, 3, 4 ];
			const iterator = new ShimIterator(iterable);
			assert.strictEqual((<any> iterator)._nativeIterator, nativeIterator);
			let result = iterator.next();
			while (!result.done) {
				results.push(result.value);
				result = iterator.next();
			}
			assert.deepEqual(results, expected);
		},

		'arrayLike'() {
			const obj: { [idx: number]: number; length: number; } = {
				0: 1,
				1: 2,
				2: 3,
				3: 4,
				length: 4
			};
			const results: number[] = [];
			const expected = [ 1, 2, 3, 4 ];
			const iterator = new ShimIterator(obj);
			assert.isUndefined((<any> iterator)._nativeIterator);
			let result = iterator.next();
			while (!result.done) {
				results.push(result.value);
				result = iterator.next();
			}
			assert.deepEqual(results, expected);
		}

	}
});
