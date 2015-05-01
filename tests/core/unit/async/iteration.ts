import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as iteration from 'src/async/iteration';
import Promise from 'src/Promise';
import * as array from 'src/array';
import { isEventuallyRejected, throwImmediatly } from '../../support/util';

interface ResolveFunc<T> {
	(value: T | Promise<T>): Promise<T>
	(): Promise<void>;
}

interface RejectFunc<T> {
	(reason: any): Promise<T>
	(): Promise<void>
}

interface ControlledPromise<T> extends Promise<T> {
	resolve: ResolveFunc<T>
	reject: RejectFunc<T>
}

function createTriggerablePromise<T>(): ControlledPromise<T> {
	var resolveFunc: any;
	var rejectFunc: any;
	var dfd: ControlledPromise<T>  = <ControlledPromise<T>> new Promise<T>(function (resolve, reject) {
		resolveFunc = <any> resolve;
		rejectFunc = <any> reject;
	});
	dfd.resolve = resolveFunc;
	dfd.reject = rejectFunc;
	return dfd;
}

function createTriggerablePromises<T>(amount: number): ControlledPromise<T>[] {
	var list = Array(amount);
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

function join(current:string, value: string): string {
	return current + value;
}

function findTests(findMethod: (items: any[], callback: iteration.Filterer<any>) => Promise<any>, solutions: any) {
	function getExpectedSolution(test: any): any {
		return solutions[test.parent.name][test.name];
	}

	return {
		'synchronous values': {
			'no matching values; returns undefined': function () {
				var expected: any = getExpectedSolution(this);
				var values = [ 'non-matching' ];
				return findMethod(values, helloWorldTest).then(function (result) {
					assert.strictEqual(result, expected);
				});
			},

			'one matching value': function () {
				var expected: any = getExpectedSolution(this);
				var values = [ 'non-matching', 'hello' ];
				return findMethod(values, helloWorldTest).then(function (result) {
					assert.strictEqual(result, expected);
				});
			},

			'multiple matching values; only returns the first': function () {
				var expected: any = getExpectedSolution(this);
				var values = [ 'non-matching', 'hello', 'world' ];
				return findMethod(values, helloWorldTest).then(function (result) {
					assert.strictEqual(result, expected);
				});
			}
		},

		'asynchronous values': {
			'no matching values; returns undefined': function () {
				var expected: any = getExpectedSolution(this);
				var values = [ createTriggerablePromise() ];
				var promise = findMethod(values, helloWorldTest).then(function (result) {
					assert.strictEqual(result, expected);
				});

				values[0].resolve('non-matching');

				return promise;
			},

			'one matching value': function () {
				var expected: any = getExpectedSolution(this);
				var values = [ createTriggerablePromise(), createTriggerablePromise() ];
				var promise = findMethod(values, helloWorldTest).then(function (result) {
					assert.strictEqual(result, expected);
				});

				values[0].resolve('non-matching');
				values[1].resolve('hello');

				return promise;
			},

			'multiple matching values; only returns the first': function () {
				var expected: any = getExpectedSolution(this);
				var values = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise() ];
				var promise = findMethod(values, helloWorldTest).then(function (result) {
					assert.strictEqual(result, expected);
				});

				values[0].resolve('non-matching');
				values[1].resolve('hello');
				values[2].resolve('world');

				return promise;
			},

			'mixed synchronous and asynchronous values': function () {
				var expected: any = getExpectedSolution(this);
				var values = [ createTriggerablePromise(), 'hello', createTriggerablePromise() ];
				var promise = findMethod(values, helloWorldTest).then(function (result) {
					assert.strictEqual(result, expected);
				});

				( <ControlledPromise<string>> values[0]).resolve('non-matching');
				( <ControlledPromise<string>> values[2]).resolve('world');

				return promise;
			},

			'rejected promise value': function () {
				var values = [ createTriggerablePromise() ];
				var promise = findMethod(values, helloWorldTest);

				values[0].reject();

				return isEventuallyRejected(promise);
			}
		},

		'asynchronous callback': {
			'one asynchronous result': function () {
				var expected: any = getExpectedSolution(this);
				var values = [ 'value1' ];
				var result = [ createTriggerablePromise() ];
				var promise = findMethod(values, function (value, i) {
					return result[i];
				}).then(function (value) {
					assert.strictEqual(value, expected);
				});

				result[0].resolve(true);

				return promise;
			},

			'asynchronous result with an eventually rejected promise': function () {
				var values = [ 'value1' ];
				var result = [ createTriggerablePromise() ];
				var promise = findMethod(values, function (value, i) {
					return result[i];
				});

				result[0].reject();

				return isEventuallyRejected(promise);
			}
		}
	};
}

function reduceTests(reduceMethod: (items: (any | Promise<any>)[], callback: iteration.Reducer<any, any>, initialvalue?: any) => Promise<any>, solutions: any) {
	function getExpectedSolution(test: any): any {
		return solutions[test.parent.name][test.name];
	}

	return {
		'synchronous values': {
			'reduce an empty array without initial value is eventually rejected': function () {
				var promise = (<any> reduceMethod)([]);

				return isEventuallyRejected(promise);
			},

			'reduce a single value without an initial value; should not call callback': function () {
				var expected: any = getExpectedSolution(this);

				var values = [ 'h' ];
				return reduceMethod(values, throwImmediatly).then(function (value) {
					assert.strictEqual(value, expected);
				});
			},

			'reduce multiple values': function () {
				var expected: any = getExpectedSolution(this);

				var values = [ 'h', 'e', 'l', 'l', 'o' ];
				return reduceMethod(values, join).then(function (value) {
					assert.strictEqual(value, expected);
				});
			},

			'reduce multiple values with initializer': function () {
				var expected: any = getExpectedSolution(this);

				var values = [ 'w', 'o', 'r', 'l', 'd' ];
				return reduceMethod(values, join, 'hello ').then(function (value) {
					assert.strictEqual(value, expected);
				});
			},

			'reduces a sparse array': function () {
				var expected: any = getExpectedSolution(this);

				var values = Array(10);
				values[1] = 'h';
				values[3] = 'e';
				values[5] = 'l';
				values[7] = 'l';
				values[9] = 'o';
				return reduceMethod(values, join).then(function (value) {
					assert.strictEqual(value, expected);
				});
			}
		},

		'asynchronous values': {
			'reduce a single value without initial value; should not call callback': function () {
				var expected: any = getExpectedSolution(this);

				var values = [ createTriggerablePromise() ];
				var promise = reduceMethod(values, throwImmediatly).then(function (value) {
					assert.strictEqual(value, expected);
				});

				values[0].resolve('h');

				return promise;
			},

			'reduce multiple values': function () {
				var expected: any = getExpectedSolution(this);

				var values = createTriggerablePromises(5);
				var promise = reduceMethod(values, join).then(function (value) {
					assert.strictEqual(value, expected);
				});

				values[0].resolve('h');
				values[1].resolve('e');
				values[2].resolve('l');
				values[3].resolve('l');
				values[4].resolve('o');

				return promise;
			},

			'reduce multiple values with initializer': function () {
				var expected: any = getExpectedSolution(this);

				var values = createTriggerablePromises(5);
				var promise = reduceMethod(values, join, 'hello ').then(function (value) {
					assert.strictEqual(value, expected);
				});

				values[0].resolve('w');
				values[1].resolve('o');
				values[2].resolve('r');
				values[3].resolve('l');
				values[4].resolve('d');

				return promise;
			},

			'reduce multiple mixed values': function () {
				var expected: any = getExpectedSolution(this);

				var values = [ 'h', 'e','l', 'l', createTriggerablePromise()];
				var promise = reduceMethod(values, join).then(function (value) {
					assert.strictEqual(value, expected);
				});

				(<ControlledPromise<{}>> values[4]).resolve('o');

				return promise;
			},

			'one promised value is rejected': function () {
				var values = createTriggerablePromises(1);
				var promise = reduceMethod(values, join);

				values[0].reject();

				return isEventuallyRejected(promise);
			},

			'reduces a sparse array': function () {
				var expected: any = getExpectedSolution(this);

				var values = Array(10);
				values[1] = createTriggerablePromise();
				values[4] = 'e';
				values[5] = 'l';
				values[7] = 'l';
				values[8] = 'o';

				var promise = reduceMethod(values, join).then(function (value) {
					assert.strictEqual(value, expected);
				});

				values[1].resolve('h');

				return promise;
			}
		},

		'asynchronous callback': {
			'multiple asynchronous reductions': function () {
				var { step, initialIndex, callbackValues } = getExpectedSolution(this);
				var values: string[] = 'hello'.split('');
				var results = createTriggerablePromises(values.length);
				var previousIndex = initialIndex;
				var promise = reduceMethod(values,
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
				var values: string[] = 'hello'.split('');
				var promise = reduceMethod(values, function (): Promise<string> {
					throw new Error('expected');
				});

				return isEventuallyRejected(promise);
			}
		}
	};
};

function haltImmediatelyTests(haltingMethod: (items: (any | Promise<any>)[], callback: iteration.Filterer<any>) => Promise<boolean>, solutions: any) {
	function getParameters(test: any): any {
		return solutions[test.parent.name][test.name];
	}

	function testAsynchronousValues() {
		var { results, assertion } = getParameters(this);
		var values = createTriggerablePromises(results.length);
		var promise = haltingMethod(values, helloWorldTest).then(assertion);

		values.forEach(function (value, index) {
			value.resolve(results[index]);
		});
		return promise;
	}

	return {
		'synchronous values': {
			'one synchronous value': function () {
				var { values, assertion } = getParameters(this);
				return haltingMethod(values, helloWorldTest).then(assertion);
			},

			'multiple synchronous values': function () {
				var { values, assertion } = getParameters(this);
				return haltingMethod(values, helloWorldTest).then(assertion);
			},

			'multiple synchronous values with failure': function () {
				var { values, assertion } = getParameters(this);
				return haltingMethod(values, helloWorldTest).then(assertion);
			}
		},

		'asynchronous values': {
			'one asynchronous value': function () {
				return testAsynchronousValues.call(this);
			},

			'multiple asynchronous values': function () {
				return testAsynchronousValues.call(this);
			},

			'multiple asynchronous values with failure': function () {
				return testAsynchronousValues.call(this);
			},

			'mixed synchronous and asynchronous values': function () {
				var { results, assertion } = getParameters(this);
				var values: any[] = [
					results[0],
					createTriggerablePromise<string>()
				];
				var promise = haltingMethod(values, helloWorldTest).then(assertion);

				values[1].resolve(results[1]);
				return promise;
			},

			'rejected promise value': function () {
				var values: any[] = [
					'hello',
					createTriggerablePromise<string>()
				];
				var promise = haltingMethod(values, helloWorldTest);

				values[1].reject();

				return isEventuallyRejected(promise);
			}
		},

		'asynchronous callback': {
			'callback returns asynchronous results': function () {
				var { resolution, assertion } = getParameters(this);
				var values: any[] = ['unimportant', 'values'];
				return haltingMethod(values, function () {
					return Promise.resolve(resolution);
				}).then(assertion);
			},

			'callback returns asynchronous results with eventually rejected promise': function () {
				var values: any[] = ['unimportant', 'values'];
				var promise = haltingMethod(values, <any> function () {
					throw new Error('kablewie!');
				});

				return isEventuallyRejected(promise);
			}
		}
	}
}

registerSuite({
	name: 'async/iteration',

	'.every<T>()': (function () {
		var tests: any = haltImmediatelyTests(iteration.every, {
				'synchronous values': {
					'one synchronous value': { values: [ 'hello' ], assertion: assertTrue },
					'multiple synchronous values': { values: [ 'hello', 'world' ], assertion: assertTrue },
					'multiple synchronous values with failure': { values: [ 'hello', 'world', 'potato' ], assertion: assertFalse },
				},
				'asynchronous values': {
					'one asynchronous value': { results: [ 'hello' ], assertion: assertTrue },
					'multiple asynchronous values': { results: [ 'hello', 'world' ], assertion: assertTrue },
					'multiple asynchronous values with failure': { results: [ 'hello', 'world', 'potato' ], assertion: assertFalse },
					'mixed synchronous and asynchronous values': { results: [ 'hello', 'world' ], assertion: assertTrue },
				},
				'asynchronous callback': {
					'callback returns asynchronous results': { resolution: true, assertion: assertTrue },
				}
			}
		);

		tests['asynchronous callback']['callback returns multiple asynchronous results with a failure and every exits immediately'] = function () {
			var values: any[] = ['unimportant', 'values'];
			var response: Promise<boolean>[] = [
				createTriggerablePromise(),
				createTriggerablePromise()
			];
			var promise = iteration.every<any>(values, function (value: any, i: number) {
				return response[i];
			}).then(assertFalse);

			(<ControlledPromise<boolean>> response[1]).resolve(false);

			return <any> promise;
		};

		return tests;
	})(),

	'.filter()': {
		'synchronous values': {
			'one passing value': function () {
				var values = ['hello'];
				return iteration.filter(values, helloWorldTest).then(function (results) {
					assert.deepEqual(results, values);
				});
			},

			'one failing value': function () {
				var values = ['failing value'];
				return iteration.filter(values, helloWorldTest).then(function (results) {
					assert.deepEqual(results, []);
				});
			},

			'mixed passing and failing values': function () {
				var values = ['hello', 'failing value', 'world'];
				return iteration.filter(values, helloWorldTest).then(function (results) {
					assert.deepEqual(results, ['hello', 'world']);
				});
			}
		},

		'asynchronous values': {
			'one passing value': function () {
				var values = [ createTriggerablePromise() ];
				var promise = iteration.filter(values, helloWorldTest).then(function (results) {
					assert.deepEqual(results, [ 'hello' ]);
				});

				values[0].resolve('hello');

				return promise;
			},

			'one failing value': function () {
				var values = [ createTriggerablePromise() ];
				var promise = iteration.filter(values, helloWorldTest).then(function (results) {
					assert.deepEqual(results, [ ]);
				});

				values[0].resolve('failing value');

				return promise;
			},

			'mixed passing and failing values': function () {
				var values = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise() ];
				var promise = iteration.filter(values, helloWorldTest).then(function (results) {
					assert.deepEqual(results, [ 'hello', 'world' ]);
				});

				values[0].resolve('hello');
				values[2].resolve('world');
				values[1].resolve('failing value');

				return promise;
			},

			'rejected value': function () {
				var values = [ createTriggerablePromise() ];
				var promise = iteration.filter(values, helloWorldTest);

				values[0].reject(new Error('kaboom!'));

				return isEventuallyRejected(promise);
			}
		},

		'asynchronous callback': {
			'one asynchronous result': function () {
				var values = [ 'unimportant' ];
				return iteration.filter(values, function () {
					return Promise.resolve(true);
				}).then(function (results) {
					assert.deepEqual(results, values);
				});
			},

			'asynchronous results with an eventually rejected promise': function () {
				var values = [ 'unimportant' ];
				var promise = iteration.filter(values, <any> function () {
					throw new Error('kaboom!');
				});

				return isEventuallyRejected(promise);
			},

			'mixed matched/unmatched asynchronous results': function () {
				var values = [ 'hello', 'world', 'non-matching' ];
				var pass = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise()];
				var promise = iteration.filter(values, function (value, i) {
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
	},

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
				var values = [ 1 ];
				return iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2 ]);
				});
			},

			'transform multiple values': function () {
				var values = [ 1, 2, 3 ];
				return iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2, 4, 6 ]);
				});
			}
		},

		'asynchronous values': {
			'transform a single value': function () {
				var values = [ createTriggerablePromise() ];
				var promise = iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2 ]);
				});

				values[0].resolve(1);

				return promise;
			},

			'transform multiple values': function () {
				var values = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise() ];
				var promise = iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2, 4, 6 ]);
				});

				values[0].resolve(1);
				values[1].resolve(2);
				values[2].resolve(3);

				return promise;
			},

			'transform multiple mixed values': function () {
				var values: any[] = [ createTriggerablePromise(), 2, createTriggerablePromise(), 4 ];
				var promise = iteration.map(values, doublerMapper).then(function (values) {
					assert.deepEqual(values, [ 2, 4, 6, 8 ]);
				});

				values[0].resolve(1);
				values[2].resolve(3);

				return promise;
			},

			'one promised value is rejected': function () {
				var values = [ createTriggerablePromise() ];
				var promise = iteration.map(values, doublerMapper);

				values[0].reject();

				return isEventuallyRejected(promise);
			}
		},

		'asynchronous callback': {
			'one asynchronous mapping': function () {
				var values = [ 'unused' ];
				var results = [ createTriggerablePromise() ];
				var promise = iteration.map(values, function (value, i) {
					return results[i];
				}).then(function (values) {
					assert.deepEqual(values, [ 2 ])
				});

				results[0].resolve(2);

				return promise;
			},

			'multiple asynchronous mappings': function () {
				var values = [ 'unused', 'unused', 'unused' ];
				var results = [ createTriggerablePromise(), createTriggerablePromise(), createTriggerablePromise() ];
				var promise = iteration.map(values, function (value, i) {
					return results[i];
				}).then(function (values) {
					assert.deepEqual(values, [ 2, 4, 6 ])
				});

				results[0].resolve(2);
				results[1].resolve(4);
				results[2].resolve(6);

				return promise;
			},

			'one promised mapping is rejected': function () {
				var values = [ 'unused' ];
				var results = [ createTriggerablePromise() ];
				var promise = iteration.map(values, function (value, i) {
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
			})
		},

		'synchronous values': function () {
			var values = 'hello'.split('');
			var expected = values;

			var composite: number[] = [];
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
			var values = createTriggerablePromises(5);
			var expected = 'hello'.split('');

			var composite: number[] = [];
			var promise = iteration.series(values, function (value, index, array) {
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
			var values = 'hello'.split('');
			var results = createTriggerablePromises(5);
			var promise = iteration.series(values, function (value, index, array) {
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
		var tests: any = haltImmediatelyTests(iteration.some, {
				'synchronous values': {
					'one synchronous value': { values: [ 'hello' ], assertion: assertTrue },
					'multiple synchronous values': { values: [ 'non-matching', 'world' ], assertion: assertTrue },
					'multiple synchronous values with failure': { values: [ 'non-matching', 'non-matching' ], assertion: assertFalse },
				},
				'asynchronous values': {
					'one asynchronous value': { results: [ 'hello' ], assertion: assertTrue },
					'multiple asynchronous values': { results: [ 'non-matching', 'world' ], assertion: assertTrue },
					'multiple asynchronous values with failure': { results: [ 'non-matching', 'non-matching' ], assertion: assertFalse },
					'mixed synchronous and asynchronous values': { results: [ 'non-matching', 'world' ], assertion: assertTrue },
				},
				'asynchronous callback': {
					'callback returns asynchronous results': { resolution: true, assertion: assertTrue },
				}
			}
		);

		tests['asynchronous callback']['callback returns multiple asynchronous results with a match and every exits immediately'] = function (): Promise<any> {
			var values: any[] = [ 'unused', 'unused' ];
			var response: Promise<boolean>[] = createTriggerablePromises(2);
			var promise = iteration.some<any>(values, function (value: any, i: number) {
				return response[i];
			}).then(assertTrue);

			(<ControlledPromise<boolean>> response[0]).resolve(false);
			(<ControlledPromise<boolean>> response[1]).resolve(true);

			return <any> promise;
		};

		return tests;
	})()
});
