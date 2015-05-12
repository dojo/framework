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
			(resolve, reject) => resolver = resolve,
			() => cancelerCalled = true
		).then(dfd.rejectOnError(() => {
			assert(false, 'Task should not have resolved');
		}));

		task.cancel();
		resolver();

		assert.isTrue(cancelerCalled, 'Canceler should have been called synchronously');
		assert.strictEqual(task.state, Canceled, 'Task should have Canceled state');

		setTimeout(dfd.callback(() => {}), 100);
	},

	'Task#finally': {
		'canceled resolve'() {
			let dfd = this.async();
			let resolver: any;
			let task = new Task(
				(resolve, reject) => resolver = resolve,
				() => {}
			)
			.then(dfd.rejectOnError(() => {
				assert(false, 'Task should not have resolved');
			}), dfd.rejectOnError(() => {
				assert(false, 'Task should not have rejected');
			}))
			.finally(dfd.callback(() => {}));

			task.cancel();
			resolver();
		},

		'canceled reject'() {
			let dfd = this.async();
			let resolver: any;
			let task = new Task(
				(resolve, reject) => resolver = reject,
				() => {}
			)
			.then(dfd.rejectOnError(() => {
				assert(false, 'Task should not have resolved');
			}), dfd.rejectOnError(() => {
				assert(false, 'Task should not have rejected');
			}))
			.finally(dfd.callback(() => {}));

			task.cancel();
			resolver();
		},

		'canceled with multiple children'() {
			let dfd = this.async(5000, 4);
			let resolvedTasks: any = {};
			let resolver: any;
			let task = new Task(
				(resolve, reject) => resolver = resolve,
				() => {}
			).finally(() => {
				return Task.resolve(5);
			});

			let taskA = task.finally(() => {
				dfd.resolve();
				throw new Error('foo');
			});
			let taskD = taskA.finally(dfd.callback(() => {}));
			let taskB = task.finally(dfd.callback(() => {}));
			let taskC = task.finally(dfd.callback(() => {}));

			task.cancel();
			resolver();
		},

		'canceled and resolved inside then callback'() {
			let dfd = this.async();
			let resolvedTasks: any = {};
			let resolver: any;

			let task = new Task(
				(resolve, reject) => resolver = resolve,
				() => {}
			).then(() => {
				task.cancel();
				return new Promise((resolve, reject) => {
					setTimeout(resolve);
				});
			})
			.then(dfd.rejectOnError(() => assert(false, 'should not have run')))
			.then(dfd.rejectOnError(() => assert(false, 'should not have run')))
			.finally(dfd.callback(() => {}));

			resolver();
		},

		'canceled and rejected inside then callback'() {
			let dfd = this.async();
			let resolvedTasks: any = {};
			let resolver: any;

			let task = new Task(
				(resolve, reject) => resolver = resolve,
				() => {}
			).then(() => {
				task.cancel();
				return new Promise((resolve, reject) => {
					setTimeout(reject);
				});
			})
			.then(dfd.rejectOnError(() => assert(false, 'should not have run')))
			.then(dfd.rejectOnError(() => assert(false, 'should not have run')))
			.finally(dfd.callback(() => {}));

			resolver();
		}
	}
};

addPromiseTests(suite, Task);

registerSuite(suite);
