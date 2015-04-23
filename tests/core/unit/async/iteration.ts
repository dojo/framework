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

registerSuite({
	name: 'async/iteration',

	'.every<T>()': (function () {
		function helloWorldTest (value: any): boolean {
			return value === 'hello' || value === 'world';
		}

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
	})()
});
