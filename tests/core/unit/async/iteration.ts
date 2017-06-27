import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as iteration from '../../../src/async/iteration';
import { ShimIterator } from '@dojo/shim/iterator';
import Promise from '@dojo/shim/Promise';
import { isEventuallyRejected, throwImmediatly } from '../../support/util';

interface ResolveFunc<T> {
	(value: T | Promise<T>): Promise<T>;
	(): Promise<void>;
}

interface RejectFunc<T> {
	(reason: any): Promise<T>;
	(): Promise<void>;
}

interface ControlledPromise<T> extends Promise<T> {
	resolve: ResolveFunc<T>;
	reject: RejectFunc<T>;
}

function createTriggerablePromise<T>(): ControlledPromise<T> {
	let resolveFunc: any;
	let rejectFunc: any;
	const dfd: ControlledPromise<T>  = <ControlledPromise<T>> new Promise<T>(function (resolve, reject) {
		resolveFunc = <any> resolve;
		rejectFunc = <any> reject;
	});
	dfd.resolve = resolveFunc;
	dfd.reject = rejectFunc;
	return dfd;
}

function createTriggerablePromises<T>(amount: number): ControlledPromise<T>[] {
	const list = Array(amount);
	for (amount--; amount >= 0; amount--) {
		list[amount] = createTriggerablePromise<T>();
	}
	return list;
}

function helloWorldTest (value: any): boolean {
	return value === 'hello' || value === 'world';
}

function doublerMapper (value: any): any {
	return value * 2;
}

function assertTrue (value: boolean): void {
	assert.isTrue(value);
}

function assertFalse (value: boolean): void {
	assert.isFalse(value);
}

function getIterable(useIterator: boolean, values: any[]): any {
	return useIterator ? new ShimIterator(values) : values;
}

function join(current: string, value: string): string {
	return current + value;
}

function findTests(findMethod: (items: any[], callback: iteration.Filterer<any>) => Promise<any>, solutions: any) {
	function getExpectedSolution(test: any): any {
		return solutions[test.parent.name][test.name];
	}

	function getTests(useIterator: boolean = false): any {
		return {
			'synchronous values': {
				'no matching values; returns undefined': function (this: any) {
					const expected: any = getExpectedSolution(this);
					const values = [ 'non-matching' ];
					const iterable = getIterable(useIterator, values);
					return findMethod(iterable, helloWorldTest).then(function (result) {
						assert.strictEqual(result, expected);
					});
				},

				'one matching value': function (this: any) {
					const expected: any = getExpectedSolution(this);
					const values = [ 'non-matching', 'hello' ];
					const iterable = getIterable(useIterator, values);
					return findMethod(iterable, helloWorldTest).then(function (result) {
						assert.strictEqual(result, expected);
					});
				},

				'multiple matching values; only returns the first': function (this: any) {
					const expected: any = getExpectedSolution(this);
					const values = [ 'non-matching', 'hello', 'world' ];
					const iterable = getIterable(useIterator, values);
					return findMethod(iterable, helloWorldTest).then(function (result) {
						assert.strictEqual(result, expected);
					});
				}
			},

			'asynchronous values': {
				'no matching values; returns undefined': function (this: any) {
					const expected: any = getExpectedSolution(this);
					const values = [ createTriggerablePromise() ];
					const iterable = getIterable(useIterator, values);
					const promise = findMethod(iterable, helloWorldTest).then(function (result) {
						assert.strictEqual(result, expected);
					});

					values[0].resolve('non-matching');

					return promise;
				},

				'one matching value': function (this: any) {
					const expected: any = getExpectedSolution(this);
					const values = [ createTriggerablePromise(), createTriggerablePromise() ];
					const iterable = getIterable(useIterator, values);
					const promise = findMethod(iterable, helloWorldTest).then(function (result) {
						assert.strictEqual(result, expected);
					});

					values[0].resolve('non-matching');
					values[1].resolve('hello');

					return promise;
				},

				'multiple matching values; only returns the first': function (this: any) {
					const expected: any = getExpectedSolution(this);
					const values = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise() ];
					const iterable = getIterable(useIterator, values);
					const promise = findMethod(iterable, helloWorldTest).then(function (result) {
						assert.strictEqual(result, expected);
					});

					values[0].resolve('non-matching');
					values[1].resolve('hello');
					values[2].resolve('world');

					return promise;
				},

				'mixed synchronous and asynchronous values': function (this: any) {
					const expected: any = getExpectedSolution(this);
					const values = [ createTriggerablePromise(), 'hello', createTriggerablePromise() ];
					const iterable = getIterable(useIterator, values);
					const promise = findMethod(iterable, helloWorldTest).then(function (result) {
						assert.strictEqual(result, expected);
					});

					( <ControlledPromise<string>> values[0]).resolve('non-matching');
					( <ControlledPromise<string>> values[2]).resolve('world');

					return promise;
				},

				'rejected promise value': function () {
					const values = [ createTriggerablePromise() ];
					const iterable = getIterable(useIterator, values);
					const promise = findMethod(iterable, helloWorldTest);

					values[0].reject();

					return isEventuallyRejected(promise);
				}
			},

			'asynchronous callback': {
				'one asynchronous result': function (this: any) {
					const expected: any = getExpectedSolution(this);
					const values = [ 'value1' ];
					const iterable = getIterable(useIterator, values);
					const result = [ createTriggerablePromise() ];
					const promise = findMethod(iterable, function (value, i) {
						return result[i];
					}).then(function (value) {
						assert.strictEqual(value, expected);
					});

					result[0].resolve(true);

					return promise;
				},

				'asynchronous result with an eventually rejected promise': function () {
					const values = [ 'value1' ];
					const iterable = getIterable(useIterator, values);
					const result = [ createTriggerablePromise() ];
					const promise = findMethod(iterable, function (value, i) {
						return result[i];
					});

					result[0].reject();

					return isEventuallyRejected(promise);
				}
			}
		};
	}

	return {
		'array-like value': getTests(false),
		'iterator value': getTests(true)
	};
}

function reduceTests(reduceMethod: (items: (any | Promise<any>)[], callback: iteration.Reducer<any, any>, initialvalue?: any) => Promise<any>, solutions: any) {
	function getExpectedSolution(test: any): any {
		return solutions[test.parent.name][test.name];
	}

	function getTests(useIterator: boolean = false): any {
		const valueType = useIterator ? 'iterator' : 'array';

		return {
			'synchronous values': {
				[`reduce an empty ${valueType} without initial value is eventually rejected`]: function () {
					const value = getIterable(useIterator, []);
					const promise = (<any> reduceMethod)(value);

					return isEventuallyRejected(promise);
				},

				'reduce a single value without an initial value; should not call callback': function (this: any) {
					const expected: any = getExpectedSolution(this);

					const values = [ 'h' ];
					const iterable = getIterable(useIterator, values);
					return reduceMethod(iterable, throwImmediatly).then(function (value) {
						assert.strictEqual(value, expected);
					});
				},

				'reduce multiple values': function (this: any) {
					const expected: any = getExpectedSolution(this);

					const values = [ 'h', 'e', 'l', 'l', 'o' ];
					const iterable = getIterable(useIterator, values);
					return reduceMethod(iterable, join).then(function (value) {
						assert.strictEqual(value, expected);
					});
				},

				'reduce multiple values with initializer': function (this: any) {
					const expected: any = getExpectedSolution(this);

					const values = [ 'w', 'o', 'r', 'l', 'd' ];
					const iterable = getIterable(useIterator, values);
					return reduceMethod(iterable, join, 'hello ').then(function (value) {
						assert.strictEqual(value, expected);
					});
				}
			},

			'asynchronous values': {
				'reduce a single value without initial value; should not call callback': function (this: any) {
					const expected: any = getExpectedSolution(this);

					const values = [ createTriggerablePromise() ];
					const iterable = getIterable(useIterator, values);
					const promise = reduceMethod(iterable, throwImmediatly).then(function (value) {
						assert.strictEqual(value, expected);
					});

					values[0].resolve('h');

					return promise;
				},

				'reduce multiple values': function (this: any) {
					const expected: any = getExpectedSolution(this);

					const values = createTriggerablePromises(5);
					const iterable = getIterable(useIterator, values);
					const promise = reduceMethod(iterable, join).then(function (value) {
						assert.strictEqual(value, expected);
					});

					values[0].resolve('h');
					values[1].resolve('e');
					values[2].resolve('l');
					values[3].resolve('l');
					values[4].resolve('o');

					return promise;
				},

				'reduce multiple values with initializer': function (this: any) {
					const expected: any = getExpectedSolution(this);

					const values = createTriggerablePromises(5);
					const iterable = getIterable(useIterator, values);
					const promise = reduceMethod(iterable, join, 'hello ').then(function (value) {
						assert.strictEqual(value, expected);
					});

					values[0].resolve('w');
					values[1].resolve('o');
					values[2].resolve('r');
					values[3].resolve('l');
					values[4].resolve('d');

					return promise;
				},

				'reduce multiple mixed values': function (this: any) {
					const expected: any = getExpectedSolution(this);

					const values = [ 'h', 'e', 'l', 'l', createTriggerablePromise()];
					const iterable = getIterable(useIterator, values);
					const promise = reduceMethod(iterable, join).then(function (value) {
						assert.strictEqual(value, expected);
					});

					(<ControlledPromise<{}>> values[4]).resolve('o');

					return promise;
				},

				'one promised value is rejected': function () {
					const values = createTriggerablePromises(1);
					const iterable = getIterable(useIterator, values);
					const promise = reduceMethod(iterable, join);

					values[0].reject();

					return isEventuallyRejected(promise);
				}
			},

			'asynchronous callback': {
				'multiple asynchronous reductions': function (this: any) {
					const { step, initialIndex, callbackValues } = getExpectedSolution(this);
					const values: string[] = 'hello'.split('');
					const iterable = getIterable(useIterator, values);
					const results = createTriggerablePromises<string>(values.length);
					let previousIndex = initialIndex;
					const promise = reduceMethod(iterable,
						function (previous: string, value: string, index: number, array: string[]): Promise<string> {
							assert.strictEqual(value, values[index]);
							assert.strictEqual(index, previousIndex + step);
							previousIndex = index;
							assert.deepEqual(values, array);
							if (index !== initialIndex) {
								return results[index - step].then(function (result) {
									assert.strictEqual(previous, result);
									return results[index];
								});
							}
							return results[index];
						});

					results.forEach(function (result, i) {
						result.resolve(callbackValues[i]);
					});

					return promise;
				},

				'one promised reduction is rejected': function () {
					const values: string[] = 'hello'.split('');
					const iterable = getIterable(useIterator, values);
					const promise = reduceMethod(iterable, function (): Promise<string> {
						throw new Error('expected');
					});

					return isEventuallyRejected(promise);
				}
			}
		};
	}

	const arrayLikeTests = getTests(false);
	arrayLikeTests['synchronous values']['reduces a sparse array'] = function (this: any) {
		const expected: any = getExpectedSolution(this);

		const values = Array(10);
		values[1] = 'h';
		values[3] = 'e';
		values[5] = 'l';
		values[7] = 'l';
		values[9] = 'o';
		return reduceMethod(values, join).then(function (value) {
			assert.strictEqual(value, expected);
		});
	};
	arrayLikeTests['asynchronous values']['reduces a sparse array'] = function (this: any) {
		const expected: any = getExpectedSolution(this);

		const values = Array(10);
		values[1] = createTriggerablePromise();
		values[4] = 'e';
		values[5] = 'l';
		values[7] = 'l';
		values[8] = 'o';

		const promise = reduceMethod(values, join).then(function (value) {
			assert.strictEqual(value, expected);
		});

		values[1].resolve('h');

		return promise;
	};

	return {
		'array-like value': arrayLikeTests,
		'iterator value': getTests(true)
	};
};

function haltImmediatelyTests(haltingMethod: (items: (any | Promise<any>)[], callback: iteration.Filterer<any>) => Promise<boolean>, solutions: any) {
	function getParameters(test: any): any {
		return solutions[test.parent.name][test.name];
	}

	function getTests(useIterator: boolean = false): any {
		function testAsynchronousValues(this: any) {
			const { results, assertion } = getParameters(this);
			const values = createTriggerablePromises(results.length);
			const iterable = getIterable(useIterator, values);
			const promise = haltingMethod(iterable, helloWorldTest).then(assertion);

			values.forEach(function (value, index) {
				value.resolve(results[index]);
			});
			return promise;
		}

		return {
			'synchronous values': {
				'one synchronous value': function (this: any) {
					const { values, assertion } = getParameters(this);
					const iterable = getIterable(useIterator, values);
					return haltingMethod(iterable, helloWorldTest).then(assertion);
				},

				'multiple synchronous values': function (this: any) {
					const { values, assertion } = getParameters(this);
					const iterable = getIterable(useIterator, values);
					return haltingMethod(iterable, helloWorldTest).then(assertion);
				},

				'multiple synchronous values with failure': function (this: any) {
					const { values, assertion } = getParameters(this);
					const iterable = getIterable(useIterator, values);
					return haltingMethod(iterable, helloWorldTest).then(assertion);
				}
			},

			'asynchronous values': {
				'one asynchronous value': function (this: any) {
					return testAsynchronousValues.call(this);
				},

				'multiple asynchronous values': function (this: any) {
					return testAsynchronousValues.call(this);
				},

				'multiple asynchronous values with failure': function (this: any) {
					return testAsynchronousValues.call(this);
				},

				'mixed synchronous and asynchronous values': function (this: any) {
					const { results, assertion } = getParameters(this);
					const values: any[] = [
						results[0],
						createTriggerablePromise<string>()
					];
					const iterable = getIterable(useIterator, values);
					const promise = haltingMethod(iterable, helloWorldTest).then(assertion);

					values[1].resolve(results[1]);
					return promise;
				},

				'rejected promise value': function () {
					const values: any[] = [
						'hello',
						createTriggerablePromise<string>()
					];
					const iterable = getIterable(useIterator, values);
					const promise = haltingMethod(iterable, helloWorldTest);

					values[1].reject();

					return isEventuallyRejected(promise);
				}
			},

			'asynchronous callback': {
				'callback returns asynchronous results': function (this: any) {
					const { resolution, assertion } = getParameters(this);
					const values: any[] = [ 'unimportant', 'values' ];
					const iterable = getIterable(useIterator, values);
					return haltingMethod(iterable, function () {
						return Promise.resolve(resolution);
					}).then(assertion);
				},

				'callback returns asynchronous results with eventually rejected promise': function () {
					const values: any[] = [ 'unimportant', 'values' ];
					const iterable = getIterable(useIterator, values);
					const promise = haltingMethod(iterable, <any> function () {
						throw new Error('kablewie!');
					});

					return isEventuallyRejected(promise);
				}
			}
		};
	}

	return {
		'array-like value': getTests(false),
		'iterator value': getTests(true)
	};
}

registerSuite({
	name: 'async/iteration',

	'.every<T>()': (function () {
		const tests: any = haltImmediatelyTests(iteration.every, {
				'synchronous values': {
					'one synchronous value': { values: [ 'hello' ], assertion: assertTrue },
					'multiple synchronous values': { values: [ 'hello', 'world' ], assertion: assertTrue },
					'multiple synchronous values with failure': { values: [ 'hello', 'world', 'potato' ], assertion: assertFalse }
				},
				'asynchronous values': {
					'one asynchronous value': { results: [ 'hello' ], assertion: assertTrue },
					'multiple asynchronous values': { results: [ 'hello', 'world' ], assertion: assertTrue },
					'multiple asynchronous values with failure': { results: [ 'hello', 'world', 'potato' ], assertion: assertFalse },
					'mixed synchronous and asynchronous values': { results: [ 'hello', 'world' ], assertion: assertTrue }
				},
				'asynchronous callback': {
					'callback returns asynchronous results': { resolution: true, assertion: assertTrue }
				}
			}
		);
		const asyncArrayTests = tests['array-like value']['asynchronous callback'];

		asyncArrayTests['callback returns multiple asynchronous results with a failure and every exits immediately'] = function () {
			const values: any[] = ['unimportant', 'values'];
			const response: Promise<boolean>[] = [
				createTriggerablePromise(),
				createTriggerablePromise()
			];
			const promise = iteration.every<any>(values, function (value: any, i: number) {
				return response[i];
			}).then(assertFalse);

			(<ControlledPromise<boolean>> response[1]).resolve(false);

			return <any> promise;
		};

		return tests;
	})(),

	'.filter()': (function () {
		function getTests(useIterator: boolean = false): any {
			return {
				'synchronous values': {
					'one passing value': function () {
						const values = [ 'hello' ];
						const iterable = getIterable(useIterator, values);
						return iteration.filter(iterable, helloWorldTest).then(function (results) {
							assert.deepEqual(results, values);
						});
					},

					'one failing value': function () {
						const values = [ 'failing value' ];
						const iterable = getIterable(useIterator, values);
						return iteration.filter(iterable, helloWorldTest).then(function (results) {
							assert.deepEqual(results, []);
						});
					},

					'mixed passing and failing values': function () {
						const values = [ 'hello', 'failing value', 'world' ];
						const iterable = getIterable(useIterator, values);
						return iteration.filter(iterable, helloWorldTest).then(function (results) {
							assert.deepEqual(results, [ 'hello', 'world' ]);
						});
					}
				},

				'asynchronous values': {
					'one passing value': function () {
						const values = [ createTriggerablePromise() ];
						const iterable = getIterable(useIterator, values);
						const promise = iteration.filter(iterable, helloWorldTest).then(function (results) {
							assert.deepEqual(results, [ 'hello' ]);
						});

						values[0].resolve('hello');

						return promise;
					},

					'one failing value': function () {
						const values = [ createTriggerablePromise() ];
						const iterable = getIterable(useIterator, values);
						const promise = iteration.filter(iterable, helloWorldTest).then(function (results) {
							assert.deepEqual(results, [ ]);
						});

						values[0].resolve('failing value');

						return promise;
					},

					'mixed passing and failing values': function () {
						const values = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise() ];
						const iterable = getIterable(useIterator, values);
						const promise = iteration.filter(iterable, helloWorldTest).then(function (results) {
							assert.deepEqual(results, [ 'hello', 'world' ]);
						});

						values[0].resolve('hello');
						values[2].resolve('world');
						values[1].resolve('failing value');

						return promise;
					},

					'rejected value': function () {
						const values = [ createTriggerablePromise() ];
						const iterable = getIterable(useIterator, values);
						const promise = iteration.filter(iterable, helloWorldTest);

						values[0].reject(new Error('kaboom!'));

						return isEventuallyRejected(promise);
					}
				},

				'asynchronous callback': {
					'one asynchronous result': function () {
						const values = [ 'unimportant' ];
						const iterable = getIterable(useIterator, values);
						return iteration.filter(iterable, function () {
							return Promise.resolve(true);
						}).then(function (results) {
							assert.deepEqual(results, values);
						});
					},

					'asynchronous results with an eventually rejected promise': function () {
						const values = [ 'unimportant' ];
						const iterable = getIterable(useIterator, values);
						const promise = iteration.filter(iterable, <any> function () {
							throw new Error('kaboom!');
						});

						return isEventuallyRejected(promise);
					},

					'mixed matched/unmatched asynchronous results': function () {
						const values = [ 'hello', 'world', 'non-matching' ];
						const iterable = getIterable(useIterator, values);
						const pass = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise()];
						const promise = iteration.filter(iterable, function (value, i) {
							return pass[i];
						}).then(function (results) {
							assert.deepEqual(results, [ 'hello', 'world' ]);
						});

						pass[0].resolve(true);
						pass[1].resolve(true);
						pass[2].resolve(false);

						return promise;
					}
				}
			};
		}

		return {
			'array-like value': getTests(false),
			'iterator value': getTests(true)
		};
	})(),

	'.find()': findTests(iteration.find, { // solutions
		'synchronous values': {
			'no matching values; returns undefined': undefined,
			'one matching value': 'hello',
			'multiple matching values; only returns the first': 'hello'
		},
		'asynchronous values': {
			'no matching values; returns undefined': undefined,
			'one matching value': 'hello',
			'multiple matching values; only returns the first': 'hello',
			'mixed synchronous and asynchronous values': 'hello'
		},
		'asynchronous callback': {
			'one asynchronous result': 'value1'
		}
	}),

	'.findIndex()': findTests(iteration.findIndex, { // solutions
		'synchronous values': {
			'no matching values; returns undefined': -1,
			'one matching value': 1,
			'multiple matching values; only returns the first': 1
		},
		'asynchronous values': {
			'no matching values; returns undefined': -1,
			'one matching value': 1,
			'multiple matching values; only returns the first': 1,
			'mixed synchronous and asynchronous values': 1
		},
		'asynchronous callback': {
			'one asynchronous result': 0
		}
	}),

	'.map()': {
		'synchronous values': {
			'transform a single value': function () {
				const values = [ 1 ];
				return iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2 ]);
				});
			},

			'transform multiple values': function () {
				const values = [ 1, 2, 3 ];
				return iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2, 4, 6 ]);
				});
			}
		},

		'asynchronous values': {
			'transform a single value': function () {
				const values = [ createTriggerablePromise() ];
				const promise = iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2 ]);
				});

				values[0].resolve(1);

				return promise;
			},

			'transform multiple values': function () {
				const values = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise() ];
				const promise = iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2, 4, 6 ]);
				});

				values[0].resolve(1);
				values[1].resolve(2);
				values[2].resolve(3);

				return promise;
			},

			'transform multiple mixed values': function () {
				const values: any[] = [ createTriggerablePromise(), 2, createTriggerablePromise(), 4 ];
				const promise = iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2, 4, 6, 8 ]);
				});

				values[0].resolve(1);
				values[2].resolve(3);

				return promise;
			},

			'one promised value is rejected': function () {
				const values = [ createTriggerablePromise() ];
				const promise = iteration.map(values, doublerMapper);

				values[0].reject();

				return isEventuallyRejected(promise);
			}
		},

		'asynchronous callback': {
			'one asynchronous mapping': function () {
				const values = [ 'unused' ];
				const results = [ createTriggerablePromise() ];
				const promise = iteration.map(values, function (value, i) {
					return results[i];
				}).then(function (values) {
					assert.deepEqual(values, [ 2 ]);
				});

				results[0].resolve(2);

				return promise;
			},

			'multiple asynchronous mappings': function () {
				const values = [ 'unused', 'unused', 'unused' ];
				const results = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise() ];
				const promise = iteration.map(values, function (value, i) {
					return results[i];
				}).then(function (values) {
					assert.deepEqual(values, [ 2, 4, 6 ]);
				});

				results[0].resolve(2);
				results[1].resolve(4);
				results[2].resolve(6);

				return promise;
			},

			'one promised mapping is rejected': function () {
				const values = [ 'unused' ];
				const results = [ createTriggerablePromise() ];
				const promise = iteration.map(values, function (value, i) {
					return results[i];
				});

				results[0].reject();

				return isEventuallyRejected(promise);
			}
		}
	},

	'.reduce()': reduceTests(iteration.reduce, {
		'synchronous values': {
			'reduce a single value without an initial value; should not call callback': 'h',
			'reduce multiple values': 'hello',
			'reduce multiple values with initializer': 'hello world',
			'reduces a sparse array': 'hello'
		},

		'asynchronous values': {
			'reduce a single value without initial value; should not call callback': 'h',
			'reduce multiple values': 'hello',
			'reduce multiple values with initializer': 'hello world',
			'reduce multiple mixed values': 'hello',
			'reduces a sparse array': 'hello'
		},

		'asynchronous callback': {
			'multiple asynchronous reductions': { step: 1, initialIndex: 0,
				callbackValues: [ 'h', 'he', 'hel', 'hell', 'hello' ] }
		}
	}),

	'.reduceRight()': reduceTests(iteration.reduceRight, {
		'synchronous values': {
			'reduce a single value without an initial value; should not call callback': 'h',
			'reduce multiple values': 'olleh',
			'reduce multiple values with initializer': 'hello dlrow',
			'reduces a sparse array': 'olleh'
		},

		'asynchronous values': {
			'reduce a single value without initial value; should not call callback': 'h',
			'reduce multiple values': 'olleh',
			'reduce multiple values with initializer': 'hello dlrow',
			'reduce multiple mixed values': 'olleh',
			'reduces a sparse array': 'olleh'
		},

		'asynchronous callback': {
			'multiple asynchronous reductions': { step: -1, initialIndex: 4,
				callbackValues: [ 'olleh', 'olle', 'oll', 'ol', 'o' ]  }
		}
	}),

	'.series()': {
		'no values returns an empty array': function () {
			return iteration.series([], throwImmediatly).then(function (result) {
				assert.deepEqual(result, []);
			});
		},

		'synchronous values': function () {
			const values = 'hello'.split('');
			const expected = values;

			const composite: number[] = [];
			return iteration.series(values, function (value, index, array) {
				composite.push(index);
				assert.deepEqual(array, expected);
				return value;
			}).then(function (results) {
				assert.deepEqual(composite, [ 0, 1, 2, 3, 4 ]);
				assert.deepEqual(results, values);
			});
		},

		'asynchronous values': function () {
			const values = createTriggerablePromises(5);
			const expected = 'hello'.split('');

			const composite: number[] = [];
			const promise = iteration.series(values, function (value, index, array) {
				composite.push(index);
				assert.deepEqual(array, expected);
				return value;
			}).then(function (results) {
				assert.deepEqual(composite, [ 0, 1, 2, 3, 4 ]);
				assert.deepEqual(results, expected);
			});

			values[1].resolve('e');
			values[3].resolve('l');
			values[2].resolve('l');
			values[0].resolve('h');
			values[4].resolve('o');

			return promise;
		},

		'asynchronous callback': function () {
			const values = 'hello'.split('');
			const results = createTriggerablePromises(5);
			const promise = iteration.series(values, function (value, index, array) {
				assert.strictEqual(value, array[index]);
				return results[index].then(function () {
					return index;
				});
			}).then(function (results) {
				assert.deepEqual(results, [ 0, 1, 2, 3, 4 ]);
			});

			results[1].resolve();
			results[3].resolve();
			results[0].resolve();
			results[2].resolve();
			results[4].resolve();

			return promise;
		}
	},

	'.some()': (function () {
		const tests: any = haltImmediatelyTests(iteration.some, {
				'synchronous values': {
					'one synchronous value': { values: [ 'hello' ], assertion: assertTrue },
					'multiple synchronous values': { values: [ 'non-matching', 'world' ], assertion: assertTrue },
					'multiple synchronous values with failure': { values: [ 'non-matching', 'non-matching' ], assertion: assertFalse }
				},
				'asynchronous values': {
					'one asynchronous value': { results: [ 'hello' ], assertion: assertTrue },
					'multiple asynchronous values': { results: [ 'non-matching', 'world' ], assertion: assertTrue },
					'multiple asynchronous values with failure': { results: [ 'non-matching', 'non-matching' ], assertion: assertFalse },
					'mixed synchronous and asynchronous values': { results: [ 'non-matching', 'world' ], assertion: assertTrue }
				},
				'asynchronous callback': {
					'callback returns asynchronous results': { resolution: true, assertion: assertTrue }
				}
			}
		);
		const asyncArrayTests = tests['array-like value']['asynchronous callback'];

		asyncArrayTests['callback returns multiple asynchronous results with a match and every exits immediately'] = function (): Promise<any> {
			const values: any[] = [ 'unused', 'unused' ];
			const response: Promise<boolean>[] = createTriggerablePromises(2);
			const promise = iteration.some<any>(values, function (value: any, i: number) {
				return response[i];
			}).then(assertTrue);

			(<ControlledPromise<boolean>> response[0]).resolve(false);
			(<ControlledPromise<boolean>> response[1]).resolve(true);

			return <any> promise;
		};

		return tests;
	})()
});
