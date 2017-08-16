import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import global from '../../../src/global';
import has from '../../../src/support/has';
import { queueAnimationTask, queueMicroTask, queueTask } from '../../../src/support/queue';

registerSuite({
	name: 'queue functions',

	'.queueTask()': function (this: any) {
		const dfd = this.async(5000);
		const parts: string[] = [];

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

	'.queueTask() => handle.destroy()': function (this: any) {
		const dfd = this.async(5000);
		let parts: string[];

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

	'.queueAnimationTask()': function (this: any) {
		if (!has('host-browser')) {
			this.skip('browser required.');
		}

		const dfd = this.async(5000);
		const parts: string[] = [];

		function a() {
			queueAnimationTask(function () {
				parts.push('queueAnimationTask 1');
			});
			parts.push('start');
			queueAnimationTask(function () {
				parts.push('queueAnimationTask 2');
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
			assert.equal(parts.join(','), 'start,end,queueAnimationTask 1,queueAnimationTask 2',
				'queueAnimationTasks should be executed to the beginning of the next loop.');
		}), 300);
	},

	'.queueAnimationTask() => handle.destroy()': function (this: any) {
		if (!has('host-browser')) {
			this.skip('browser required.');
		}

		const dfd = this.async(5000);
		let parts: string[];

		function test() {
			parts = [];

			parts.push('start');
			queueAnimationTask(function () {
				parts.push('queueAnimationTask');
			}).destroy();
			parts.push('end');
		}

		test();
		setTimeout(dfd.callback(function () {
			assert.equal(parts.join(','), 'start,end');
		}), 100);
	},

	'.queueMicroTask()': function (this: any) {
		const dfd = this.async(5000);
		const parts: string[] = [];

		function a() {
			queueTask(function () {
				parts.push('queueTask 1');
			});
			queueAnimationTask(function () {
				parts.push('queueAnimationTask 1');
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
			const actual = parts.join(',');
			// Different browsers implement rAF differently, so there's no way to predict exactly
			// when in the macrotask queue any callback registered with queueAnimationTask will be
			// executed. As a result, the following just tests that queueMicroTask executes its
			// callbacks before either queueTask or queueAnimationTask.
			assert.equal(actual.indexOf('start,end,queueMicroTask'), 0);
		}), 1000);
	},

	'.queueMicroTask() => handle.destroy()': function (this: any) {
		const dfd = this.async(5000);
		let parts: string[];

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
	},

	'web workers': {
		'queue from webworker': function (this: any) {
			if (global.Blob === undefined || global.Worker === undefined) {
				this.skip('does not support blobs and/or web workers');
				return;
			}

			const baseUrl = location.origin;
			const dfd = this.async(10000);
			const blob = new Blob([ `(function() { 
self.addEventListener('message', function (event) {
	if(event.data.baseUrl) {
		var baseUrl = event.data.baseUrl;
		importScripts(baseUrl + '/node_modules/@dojo/loader/loader.js');

		require.config({
			baseUrl: baseUrl,
			packages: [
				{ name: '@dojo', location: 'node_modules/@dojo' }
			]
		});
		
		require(['_build/src/support/queue'], function (queue) {
			queue.queueTask(function() {
				self.postMessage('success');
			});
		});
	}
});
			})()` ], { type: 'application/javascript' });
			const worker = new Worker(URL.createObjectURL(blob));
			worker.addEventListener('error', (error) => {
				dfd.reject(new Error(error.message));
			});
			worker.addEventListener('message', ({ data: result }) => {
				if (result === 'success') {
					dfd.resolve();
				}
			});

			worker.postMessage({
				baseUrl
			});
		}
	}
});
