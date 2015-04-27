import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as iteration from 'src/async/iteration';
import Promise from 'src/async/Promise';

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

function isEventuallyRejected(promise: Promise<any>): Promise<any> {
	return promise.then<any>(function () {
		throw new Error('unexpected code path');
	}, function () {
		return true; // expect rejection
	});
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

registerSuite({
	name: 'async/iteration',

	'.every<T>()': {
		'synchronous values': {
			'one synchronous value': function () {
				var values = ['hello'];
				return iteration.every(values, helloWorldTest).then(assertTrue);
			},

			'multiple synchronous values': function () {
				var values = [ 'hello', 'world' ];
				return iteration.every<string>(values, helloWorldTest).then(assertTrue);
			},

			'multiple synchronous values with failure': function () {
				var values = [ 'hello', 'world', 'potato' ];
				return iteration.every(values, helloWorldTest).then(assertFalse);
			}
		},

		'asynchronous values': {
			'one asynchronous value': function () {
				var values = [ createTriggerablePromise<string>() ];
				var promise = iteration.every(values, helloWorldTest).then(assertTrue);

				values[0].resolve('hello');
				return promise;
			},

			'multiple asynchronous values': function () {
				var values = [
					createTriggerablePromise<string>(),
					createTriggerablePromise<string>()
				];
				var promise = iteration.every(values, helloWorldTest).then(assertTrue);

				values[0].resolve('hello');
				values[1].resolve('world');
				return promise;
			},

			'multiple asynchronous values with failure': function () {
				var values = [
					createTriggerablePromise<string>(),
					createTriggerablePromise<string>()
				];
				var promise = iteration.every(values, helloWorldTest).then(assertFalse);

				values[0].resolve('hello');
				values[1].resolve('potato');
				return promise;
			},

			'mixed synchronous and asynchronous values': function () {
				var values: any[] = [
					'hello',
					createTriggerablePromise<string>()
				];
				var promise = iteration.every(values, helloWorldTest).then(assertTrue);

				values[1].resolve('world');
				return promise;
			},

			'rejected promise value': function () {
				var values: any[] = [
					'hello',
					createTriggerablePromise<string>()
				];
				var promise = iteration.every(values, helloWorldTest);

				values[1].reject();

				return isEventuallyRejected(promise);
			}
		},

		'asynchronous callback': {
			'callback returns asynchronous results': function () {
				var values: any[] = ['unimportant', 'values'];
				return iteration.every<string>(values, function () {
					return Promise.resolve(true);
				}).then(assertTrue);
			},

			'callback returns asynchronous results with eventually rejected promise': function () {
				var values: any[] = ['unimportant', 'values'];
				var promise = iteration.every(values, <any> function () {
					throw new Error('kablewie!');
				});

				return isEventuallyRejected(promise);
			},

			'callback returns multiple asynchronous results with a failure and every exits immediately': function () {
				var values: any[] = ['unimportant', 'values'];
				var response: any[] = [
					createTriggerablePromise(),
					createTriggerablePromise()
				];
				var promise = iteration.every<any>(values, function (value: any, i: number) {
					return response[i];
				}).then(assertFalse);

				response[1].resolve(false);

				return promise;
			}
		}
	},

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

	'.reduce()': {
		'synchronous values': {
			'reduce an empty array without initial value is eventually rejected': function () {
				var promise = (<any> iteration.reduce)([]);

				return isEventuallyRejected(promise);
			},

			'reduce a single value': function () {
				var values = [ 'h' ];
				return iteration.reduce(values, join).then(function (value) {
					assert.strictEqual(value, 'h');
				});
			},

			'reduce multiple values': function () {
				var values = [ 'h', 'e', 'l', 'l', 'o' ];
				return iteration.reduce(values, join).then(function (value) {
					assert.strictEqual(value, 'hello');
				});
			},

			'reduce multiple values with initializer': function () {
				var values = [ 'w', 'o', 'r', 'l', 'd' ];
				return iteration.reduce(values, join, 'hello ').then(function (value) {
					assert.strictEqual(value, 'hello world');
				});
			},

			'reduces a sparse array': function () {
				var values = Array(10);
				values[1] = 'h';
				values[3] = 'e';
				values[5] = 'l';
				values[7] = 'l';
				values[9] = 'o';
				return iteration.reduce(values, join).then(function (value) {
					assert.strictEqual(value, 'hello');
				});
			}
		},

		'asynchronous values': {
			'reduce a single value': function () {

			},

			'reduce multiple values': function () {

			},

			'reduce multiple values with initializer': function () {

			},

			'reduce multiple mixed values': function () {

			},

			'one promised value is rejected': function () {

			},

			'reduces a sparse array': function () {

			}
		},

		'asynchronous callback': {
			'one asynchronous reduction': function () {

			},

			'multiple asynchronous reductions': function () {

			},

			'one promised reduction is rejected': function () {

			}
		}
	},

	'.reduceRight()': {
		'synchronous values': {

		},

		'asynchronous values': {

		},

		'asynchronous callback': {

		}
	},

	'.series()': {
		'synchronous values': {

		},

		'asynchronous values': {

		},

		'asynchronous callback': {

		}
	},

	'.some()': {
		'synchronous values': {

		},

		'asynchronous values': {

		},

		'asynchronous callback': {

		}
	}
});
