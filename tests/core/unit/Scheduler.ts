const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { queueMicroTask, queueTask } from '../../src/queue';
import Scheduler from '../../src/Scheduler';

registerSuite('Scheduler', () => {
	let parts: string[];
	let scheduler: Scheduler;

	function a() {
		parts.push('a');
	}
	function b() {
		parts.push('b');
	}

	return {
		beforeEach(): void {
			parts = [];
			scheduler = new Scheduler();
		},

		tests: {
			'callback handling': function(this: any) {
				const dfd = this.async(5000);

				function c() {
					a();
					scheduler.schedule(function() {
						parts.push('first');
					});
					queueTask(function() {
						parts.push('third');
					});
					scheduler.schedule(function() {
						parts.push('second');
					});
					b();
				}

				c();
				setTimeout(
					dfd.callback(function() {
						assert.equal(
							parts.join(','),
							'a,b,first,second,third',
							'Callbacks registered with scheduler should be executed as part of the same task.'
						);
					}),
					300
				);
			},

			'scheduler type': function(this: any) {
				const dfd = this.async(5000);
				const macroScheduler = new Scheduler();
				scheduler = new Scheduler({ queueFunction: queueMicroTask });

				function test() {
					macroScheduler.schedule(function() {
						parts.push('second');
					});
					scheduler.schedule(function() {
						parts.push('first');
					});
				}

				test();
				setTimeout(
					dfd.callback(function() {
						assert.equal(
							parts.join(','),
							'first,second',
							'It should be possible to change the type of task being registered.'
						);
					}),
					300
				);
			},

			'when deferWhileProcessing is true': function(this: any) {
				const dfd = this.async(5000);

				function test() {
					scheduler.schedule(function() {
						parts.push('first');

						scheduler.schedule(function() {
							parts.push('third');
						});
					});
					queueTask(function() {
						parts.push('second');
					});
				}

				test();
				setTimeout(
					dfd.callback(function() {
						assert.equal(
							parts.join(','),
							'first,second,third',
							'Callbacks registered while the current batch is processing should be deferred.'
						);
					}),
					300
				);
			},

			'when deferWhileProcessing is false': function(this: any) {
				const dfd = this.async(5000);
				scheduler = new Scheduler({ deferWhileProcessing: false });

				function test() {
					scheduler.schedule(function() {
						parts.push('first');

						scheduler.schedule(function() {
							parts.push('second');
						});
					});
					queueTask(function() {
						parts.push('third');
					});
				}

				test();
				setTimeout(
					dfd.callback(function() {
						assert.equal(
							parts.join(','),
							'first,second,third',
							'Callbacks registered while the current batch is processing should be queued immediately.'
						);
					}),
					300
				);
			},

			'scheduler.schedule() => handle.destroy()': function(this: any) {
				const dfd = this.async(5000);

				function test() {
					scheduler
						.schedule(function() {
							parts.push('first');
						})
						.destroy();
					scheduler.schedule(function() {
						parts.push('second');

						scheduler
							.schedule(function() {
								parts.push('third');
							})
							.destroy();
					});
				}

				test();
				setTimeout(
					dfd.callback(function() {
						assert.equal(
							parts.join(','),
							'second',
							'Destroying a callback should result in it not being called.'
						);
					}),
					300
				);
			}
		}
	};
});
