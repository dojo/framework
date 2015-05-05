import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import { Handle } from 'src/interfaces';
import { queueTask } from 'src/queue';
import Scheduler from 'src/Scheduler';

registerSuite(function () {
	let scheduler: Scheduler;
	let parts: string[];

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
			let dfd = this.async(300);
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

		'when deferWhileProcessing is true': function () {
			let dfd = this.async(300);
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
			let dfd = this.async(300);
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

		'optional ID': function () {
			let dfd = this.async(300);
			scheduler = new Scheduler({ deferWhileProcessing: false });

			function test() {
				scheduler.schedule(function () {
					parts.push('first');
				}, 'first');
				scheduler.schedule(function () {
					parts.push('second');
				}, 'second');
				scheduler.schedule(function () {
					parts.push('third');

					scheduler.schedule(function () {
						parts.push('fourth');
					}, 'second');
				}, 'first');
			}

			test();
			setTimeout(dfd.callback(function () {
				assert.equal(parts.join(','), 'second,third,fourth',
					'Callbacks registered with IDs should be deduped.');
			}), 300);
		},

		'scheduler.schedule() => handle.destroy()': function () {
			let dfd = this.async(300);
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
