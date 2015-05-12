import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import Task, { Canceled } from 'src/async/Task';
import Promise from 'src/Promise';
import { addPromiseTests } from '../Promise';

let suite = {
	name: 'Task',

	'Task#cancel'() {
		let dfd = this.async();
		let cancelerCalled = false;
		let resolver: any;
		let task = new Task(
			function (resolve) {
				resolver = resolve;
			},
			function () {
				cancelerCalled = true;
			}
		).then(dfd.rejectOnError(function () {
			assert(false, 'Task should not have resolved');
		}));

		task.cancel();
		resolver();

		assert.isTrue(cancelerCalled, 'Canceler should have been called synchronously');
		assert.strictEqual(task.state, Canceled, 'Task should have Canceled state');

		setTimeout(dfd.callback(function () {}), 100);
	},

	'Task#finally': {
		'canceled resolve'() {
			let dfd = this.async();
			let resolver: any;
			let task = new Task(
				function (resolve) {
					resolver = resolve;
				},
				function () {}
			)
			.then(dfd.rejectOnError(function () {
				assert(false, 'Task should not have resolved');
			}), dfd.rejectOnError(function () {
				assert(false, 'Task should not have rejected');
			}))
			.finally(dfd.callback(function () {}));

			task.cancel();
			resolver();
		},

		'canceled reject'() {
			let dfd = this.async();
			let resolver: any;
			let task = new Task(
				function (resolve, reject) {
					resolver = reject;
				},
				function () {}
			)
			.then(dfd.rejectOnError(function () {
				assert(false, 'Task should not have resolved');
			}), dfd.rejectOnError(function () {
				assert(false, 'Task should not have rejected');
			}))
			.finally(dfd.callback(function () {}));

			task.cancel();
			resolver();
		},

		'canceled with multiple children'() {
			let dfd = this.async(5000, 4);
			let resolvedTasks: any = {};
			let resolver: any;
			let task = new Task(
				function (resolve, reject) {
					resolver = resolve;
				},
				function () {}
			).finally(function () {
				return Task.resolve(5);
			});

			let taskA = task.finally(function () {
				dfd.resolve();
				throw new Error('foo');
			});
			let taskD = taskA.finally(dfd.callback(function () {}));
			let taskB = task.finally(dfd.callback(function () {}));
			let taskC = task.finally(dfd.callback(function () {}));

			task.cancel();
			resolver();
		},

		'canceled and resolved inside then callback'() {
			let dfd = this.async();
			let resolvedTasks: any = {};
			let resolver: any;

			let task = new Task(
				function (resolve, reject) {
					resolver = resolve;
				},
				function () {}
			).then(function () {
				task.cancel();
				return new Promise(function (resolve, reject) {
					setTimeout(resolve);
				});
			})
			.then(dfd.rejectOnError(function () {
				assert(false, 'should not have run');
			}))
			.then(dfd.rejectOnError(function () {
				assert(false, 'should not have run');
			}))
			.finally(dfd.callback(function () {}));

			resolver();
		},

		'canceled and rejected inside then callback'() {
			let dfd = this.async();
			let resolvedTasks: any = {};
			let resolver: any;

			let task = new Task(
				function (resolve, reject) {
					resolver = resolve;
				},
				function () {}
			).then(function () {
				task.cancel();
				return new Promise(function (resolve, reject) {
					setTimeout(reject);
				});
			})
			.then(dfd.rejectOnError(function () {
				assert(false, 'should not have run');
			}))
			.then(dfd.rejectOnError(function () {
				assert(false, 'should not have run');
			}))
			.finally(dfd.callback(function () {}));

			resolver();
		}
	}
};

addPromiseTests(suite, Task);

registerSuite(suite);
