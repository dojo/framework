import global from '../global';
import has from './has';
import { Handle } from '../interfaces';

function executeTask(item: QueueItem | undefined): void {
	if (item && item.isActive && item.callback) {
		item.callback();
	}
}

function getQueueHandle(item: QueueItem, destructor?: (...args: any[]) => any): Handle {
	return {
		destroy: function (this: Handle) {
			this.destroy = function () {};
			item.isActive = false;
			item.callback = null;

			if (destructor) {
				destructor();
			}
		}
	};
}

interface PostMessageEvent extends Event {
	source: any;
	data: string;
}

export interface QueueItem {
	isActive: boolean;
	callback: null | ((...args: any[]) => any);
}

let checkMicroTaskQueue: () => void;
let microTasks: QueueItem[];

/**
 * Schedules a callback to the macrotask queue.
 *
 * @param callback the function to be queued and later executed.
 * @returns An object with a `destroy` method that, when called, prevents the registered callback from executing.
 */
export const queueTask = (function() {
	let destructor: (...args: any[]) => any;
	let enqueue: (item: QueueItem) => void;

	// Since the IE implementation of `setImmediate` is not flawless, we will test for `postMessage` first.
	if (has('postmessage')) {
		const queue: QueueItem[] = [];

		global.addEventListener('message', function (event: PostMessageEvent): void {
			// Confirm that the event was triggered by the current window and by this particular implementation.
			if (event.source === global && event.data === 'dojo-queue-message') {
				event.stopPropagation();

				if (queue.length) {
					executeTask(queue.shift());
				}
			}
		});

		enqueue = function (item: QueueItem): void {
			queue.push(item);
			global.postMessage('dojo-queue-message', '*');
		};
	}
	else if (has('setimmediate')) {
		destructor = global.clearImmediate;
		enqueue = function (item: QueueItem): any {
			return setImmediate(executeTask.bind(null, item));
		};
	}
	else {
		destructor = global.clearTimeout;
		enqueue = function (item: QueueItem): any {
			return setTimeout(executeTask.bind(null, item), 0);
		};
	}

	function queueTask(callback: (...args: any[]) => any): Handle {
		const item: QueueItem = {
			isActive: true,
			callback: callback
		};
		const id: any = enqueue(item);

		return getQueueHandle(item, destructor && function () {
				destructor(id);
			});
	}

	// TODO: Use aspect.before when it is available.
	return has('microtasks') ? queueTask : function (callback: (...args: any[]) => any): Handle {
			checkMicroTaskQueue();
			return queueTask(callback);
		};
})();

// When no mechanism for registering microtasks is exposed by the environment, microtasks will
// be queued and then executed in a single macrotask before the other macrotasks are executed.
if (!has('microtasks')) {
	let isMicroTaskQueued = false;

	microTasks = [];
	checkMicroTaskQueue = function (): void {
		if (!isMicroTaskQueued) {
			isMicroTaskQueued = true;
			queueTask(function () {
				isMicroTaskQueued = false;

				if (microTasks.length) {
					let item: QueueItem | undefined;
					while (item = microTasks.shift()) {
						executeTask(item);
					}
				}
			});
		}
	};
}

/**
 * Schedules an animation task with `window.requestAnimationFrame` if it exists, or with `queueTask` otherwise.
 *
 * Since requestAnimationFrame's behavior does not match that expected from `queueTask`, it is not used there.
 * However, at times it makes more sense to delegate to requestAnimationFrame; hence the following method.
 *
 * @param callback the function to be queued and later executed.
 * @returns An object with a `destroy` method that, when called, prevents the registered callback from executing.
 */
export const queueAnimationTask = (function () {
	if (!has('raf')) {
		return queueTask;
	}

	function queueAnimationTask(callback: (...args: any[]) => any): Handle {
		const item: QueueItem = {
			isActive: true,
			callback: callback
		};
		const rafId: number = requestAnimationFrame(executeTask.bind(null, item));

		return getQueueHandle(item, function () {
			cancelAnimationFrame(rafId);
		});
	}

	// TODO: Use aspect.before when it is available.
	return has('microtasks') ? queueAnimationTask : function (callback: (...args: any[]) => any): Handle {
			checkMicroTaskQueue();
			return queueAnimationTask(callback);
		};
})();

/**
 * Schedules a callback to the microtask queue.
 *
 * Any callbacks registered with `queueMicroTask` will be executed before the next macrotask. If no native
 * mechanism for scheduling macrotasks is exposed, then any callbacks will be fired before any macrotask
 * registered with `queueTask` or `queueAnimationTask`.
 *
 * @param callback the function to be queued and later executed.
 * @returns An object with a `destroy` method that, when called, prevents the registered callback from executing.
 */
export let queueMicroTask = (function () {
	let enqueue: (item: QueueItem) => void;

	if (has('host-node')) {
		enqueue = function (item: QueueItem): void {
			global.process.nextTick(executeTask.bind(null, item));
		};
	}
	else if (has('es6-promise')) {
		enqueue = function (item: QueueItem): void {
			global.Promise.resolve(item).then(executeTask);
		};
	}
	else if (has('dom-mutationobserver')) {
		/* tslint:disable-next-line:variable-name */
		const HostMutationObserver = global.MutationObserver || global.WebKitMutationObserver;
		const node = document.createElement('div');
		const queue: QueueItem[] = [];
		const observer = new HostMutationObserver(function (): void {
			while (queue.length > 0) {
				const item = queue.shift();
				if (item && item.isActive && item.callback) {
					item.callback();
				}
			}
		});

		observer.observe(node, { attributes: true });

		enqueue = function (item: QueueItem): void {
			queue.push(item);
			node.setAttribute('queueStatus', '1');
		};
	}
	else {
		enqueue = function (item: QueueItem): void {
			checkMicroTaskQueue();
			microTasks.push(item);
		};
	}

	return function (callback: (...args: any[]) => any): Handle {
		const item: QueueItem = {
			isActive: true,
			callback: callback
		};

		enqueue(item);

		return getQueueHandle(item);
	};
})();
