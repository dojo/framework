import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { forOf, IteratorResult } from 'src/iterator';
import Symbol from 'src/Symbol';

registerSuite({
	name: 'iterator',
	'forOf': {
		'strings'() {
			const str = 'abcdefg';
			const results: string[] = [];
			const expected = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g' ];

			forOf(str, (value) => {
				results.push(value);
			});

			assert.deepEqual(results, expected);
		},
		'double byte strings'() {
			const str = '¯\\_(ツ)_/¯';
			const results: string[] = [];
			const expected = [ '¯', '\\', '_', '(', 'ツ', ')', '_', '/', '¯' ];

			forOf(str, (value) => {
				results.push(value);
			});

			assert.deepEqual(results, expected);
		},
		'utf-16'() {
			const str = '\uD801\uDC00';
			const results: string[] = [];
			const expected = [ '\uD801\uDC00' ];

			forOf(str, (value) => {
				results.push(value);
			});

			assert.deepEqual(results, expected);
		},
		'arrays'() {
			const array: any[] = [ 'foo', 'bar', {}, 1, [ 'qat', 2 ] ];
			const results: any[] = [];

			forOf(array, (value) => {
				results.push(value);
			});

			assert.deepEqual(results, array);
			assert.notStrictEqual(results, array);
		},
		'iterable'() {
			let counter = 0;
			const iterable = {
				[Symbol.iterator]() {
					return {
						next(): IteratorResult<number> {
							counter++;
							if (counter < 5) {
								return {
									value: counter,
									done: false
								};
							}
							else {
								return { done: true };
							}
						}
					};
				}
			};
			const results: number[] = [];
			const expected = [ 1, 2, 3, 4 ];

			forOf(iterable, (value) => {
				results.push(value);
			});

			assert.deepEqual(results, expected);
		},
		'scoping'() {
			const array = [ 'a', 'b' ];
			const scope = { foo: 'bar' };

			forOf(array, function (value, obj) {
				assert.strictEqual(this, scope);
				assert.strictEqual(obj, array);
			}, scope);
		},
		'doBreak': {
			strings() {
				const str = 'abcdefg';
				let counter = 0;
				const results: string[] = [];
				const expected = [ 'a', 'b', 'c' ];

				forOf(str, (value, str, doBreak) => {
					results.push(value);
					counter++;
					if (counter >= 3) {
						doBreak();
					}
				});

				assert.deepEqual(results, expected);
			},
			iterable() {
				let counter = 0;
				const iterable = {
					[Symbol.iterator]() {
						return {
							next(): IteratorResult<number> {
								counter++;
								if (counter < 5) {
									return {
										value: counter,
										done: false
									};
								}
								else {
									return { done: true };
								}
							}
						};
					}
				};
				const results: number[] = [];
				const expected = [ 1, 2 ];

				forOf(iterable, (value, obj, doBreak) => {
					results.push(value);
					if (value === 2) {
						doBreak();
					}
				});

				assert.deepEqual(results, expected);
			}
		}
	}
});
