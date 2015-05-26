import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import { Handle } from 'src/interfaces';
import { queueMicroTask, queueTask } from 'src/queue';
import Scheduler from 'src/Scheduler';

registerSuite(function () {
	let parts: string[];
	let scheduler: Scheduler;

	function a() {
		parts.push('a');
	}
	function b() {
		parts.push('b');
	}

	return {
		name: 'Scheduler',

		beforeEach(): void {
			parts = [];
		},

		afterEach(): void {
			parts = scheduler = null;
		},

		'callback handling': function () {
			const dfd = this.async(5000);
			scheduler = new Scheduler();

			function c() {
				a();
				scheduler.schedule(function () {
					parts.push('first');
				});
				queueTask(function () {
					parts.push('third');
				});
				scheduler.schedule(function () {
					parts.push('second');
				});
				b();
			}

			c();
			setTimeout(dfd.callback(function () {
				assert.equal(parts.join(','), 'a,b,first,second,third',
					'Callbacks registered with scheduler should be executed as part of the same task.');
			}), 300);
		},

		'scheduler type': function () {
			const dfd = this.async(5000);
			const macroScheduler = new Scheduler();
			scheduler = new Scheduler({ queueFunction: queueMicroTask });

			function test() {
				macroScheduler.schedule(function () {
					parts.push('second');
				});
				scheduler.schedule(function () {
					parts.push('first');
				});
			}

			test();
			setTimeout(dfd.callback(function () {
				assert.equal(parts.join(','), 'first,second',
					'It should be possible to change the type of task being registered.');
			}), 300);
		},

		'when deferWhileProcessing is true': function () {
			const dfd = this.async(5000);
			scheduler = new Scheduler();

			function test() {
				scheduler.schedule(function () {
					parts.push('first');

					scheduler.schedule(function () {
						parts.push('third');
					});
				});
				queueTask(function () {
					parts.push('second');
				});
			}

			test();
			setTimeout(dfd.callback(function () {
				assert.equal(parts.join(','), 'first,second,third',
					'Callbacks registered while the current batch is processing should be deferred.');
			}), 300);
		},

		'when deferWhileProcessing is false': function () {
			const dfd = this.async(5000);
			scheduler = new Scheduler({ deferWhileProcessing: false });

			function test() {
				scheduler.schedule(function () {
					parts.push('first');

					scheduler.schedule(function () {
						parts.push('second');
					});
				});
					queueTask(function () {
					parts.push('third');
				});
			}

			test();
			setTimeout(dfd.callback(function () {
				assert.equal(parts.join(','), 'first,second,third',
					'Callbacks registered while the current batch is processing should be queued immediately.');
			}), 300);
		},

		'scheduler.schedule() => handle.destroy()': function () {
			const dfd = this.async(5000);
			scheduler = new Scheduler();

			function test() {
				scheduler.schedule(function () {
					parts.push('first');
				}).destroy();
				scheduler.schedule(function () {
					parts.push('second');

					scheduler.schedule(function () {
						parts.push('third');
					}).destroy();
				});
			}

			test();
			setTimeout(dfd.callback(function () {
				assert.equal(parts.join(','), 'second',
					'Destroying a callback should result in it not being called.');
			}), 300);
		}
	};
});
