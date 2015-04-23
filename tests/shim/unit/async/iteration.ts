import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import iteration = require('src/async/iteration');

interface resolveFunc<T> {
	(value:T | Promise<T>): Promise<T>
}

interface rejectFunc<T> {
	(reason: any): Promise<T>
}

interface ControlledPromise<T> extends Promise<T> {
	resolve: resolveFunc<T>
	reject: rejectFunc<T>
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

registerSuite({
	name: 'async/iteration',

	'.every<T>()': (function () {
		function assertTrue (value: boolean): void {
			assert.isTrue(value);
		}

		function assertFalse (value: boolean): void {
			assert.isFalse(value);
		}

		return {
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
			},

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
				var promise = iteration.every(values, helloWorldTest).then(undefined, function () {
					return true; // expect the rejection
				});

				values[1].reject();
				return promise;
			},

			'callback returns asynchronous results': function () {
				var values: any[] = [ 'unimportant', 'values' ];
				return iteration.every<string>(values, function () {
					return Promise.resolve(true);
				}).then(assertTrue);
			},

			'callback returns asynchronous results with eventually rejected promise': function () {
				var values: any[] = [ 'unimportant', 'values' ];
				return iteration.every(values, <any> function () {
					throw new Error('kablewie!');
				}).then(undefined, function () {
					return true; // expect the rejection
				});
			},

			'callback returns multiple asynchronous results with a failure and every exits immediately': function () {
				var values: any[] = [ 'unimportant', 'values' ];
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
		};
	})(),

	'.filter()': (function () {
		return {
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
					var promise = iteration.filter(values, helloWorldTest).then(undefined, function () {
						return true; // expect rejection
					});

					values[0].reject(new Error('kaboom!'));

					return promise;
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
					return iteration.filter(values, <any> function () {
						throw new Error('kaboom!');
					}).then(undefined, function () {
						return true; // expect rejection
					});
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
		};
	})()
});
