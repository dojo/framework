import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import has from 'src/has';
import { queueTask, queueDomTask, queueMicroTask } from 'src/queue';

registerSuite({
	name: 'queue functions',

	'.queueTask()': function () {
		let parts: string[] = [];
		let dfd = this.async(300);

		function a() {
			queueTask(function () {
				parts.push('queueTask 1');
			});
			parts.push('start');
			queueTask(function () {
				parts.push('queueTask 2');
			});
		}
		function b() {
			parts.push('end');
		}
		function c() {
			a();
			b();
		}

		c();
		setTimeout(dfd.callback(function () {
			assert.equal(parts.join(','), 'start,end,queueTask 1,queueTask 2',
				'queueTasks should be executed to the beginning of the next loop.');
		}), 300);
	},

	'.queueTask() => handle.destroy()': function () {
		let parts: string[];
		let dfd = this.async(100);

		function test() {
			parts = [];

			parts.push('start');
			queueTask(function () {
				parts.push('queueTask');
			}).destroy();
			parts.push('end');
		}

		test();
		setTimeout(dfd.callback(function () {
			assert.equal(parts.join(','), 'start,end');
		}), 100);
	},

	'.queueDomTask()': function () {
		if (!has('host-browser')) {
			this.skip('browser required.');
		}

		let parts: string[] = [];
		let dfd = this.async(300);

		function a() {
			queueDomTask(function () {
				parts.push('queueDomTask 1');
			});
			parts.push('start');
			queueDomTask(function () {
				parts.push('queueDomTask 2');
			});
		}
		function b() {
			parts.push('end');
		}
		function c() {
			a();
			b();
		}

		c();
		setTimeout(dfd.callback(function () {
			assert.equal(parts.join(','), 'start,end,queueDomTask 1,queueDomTask 2',
				'queueDomTasks should be executed to the beginning of the next loop.');
		}), 300);
	},

	'.queueDomTask() => handle.destroy()': function () {
		if (!has('host-browser')) {
			this.skip('browser required.');
		}

		let parts: string[];
		let dfd = this.async(100);

		function test() {
			parts = [];

			parts.push('start');
			queueDomTask(function () {
				parts.push('queueDomTask');
			}).destroy();
			parts.push('end');
		}

		test();
		setTimeout(dfd.callback(function () {
			assert.equal(parts.join(','), 'start,end');
		}), 100);
	},

	'.queueMicroTask()': function () {
		let parts: string[] = [];
		let dfd = this.async(300);

		function a() {
			queueTask(function () {
				parts.push('queueTask 1');
			});
			queueMicroTask(function () {
				parts.push('queueMicroTask');
			});
			queueTask(function () {
				parts.push('queueTask 2');
			});
			parts.push('start');
		}
		function b() {
			parts.push('end');
		}
		function c() {
			a();
			b();
		}

		c();
		setTimeout(dfd.callback(function () {
			assert.equal(parts.join(','), 'start,end,queueMicroTask,queueTask 1,queueTask 2',
				'queueMicroTask should be executed at the end of the current event loop.');
		}), 300);
	},

	'.queueMicroTask() => handle.destroy()': function () {
		let parts: string[];
		let dfd = this.async(100);

		function test() {
			parts = [];

			parts.push('start');
			queueMicroTask(function () {
				parts.push('queueMicroTask');
			}).destroy();
			parts.push('end');
		}

		test();
		setTimeout(dfd.callback(function () {
			assert.equal(parts.join(','), 'start,end');
		}), 100);
	}
});
