import global from './global';
import { Handle } from './interfaces';
import has, { add as hasAdd } from './has';

hasAdd('postmessage', 'postMessage' in global);

function executeTask(item: QueueItem): void {
	if (item.isActive) {
		item.callback();
	}
}

function getQueueHandle(item: QueueItem): Handle {
	return {
		destroy: function () {
			this.destroy = function () {};
			item.isActive = false;
			item.callback = null;
		}
	};
}

interface PostMessageEvent extends Event {
	source: any;
	data: string;
}

export interface QueueItem {
	isActive: boolean;
	callback: (...args: any[]) => any;
}

export let queueTask = (function() {
	let enqueue: (item: QueueItem) => void;

	// Since the IE implementation of `setImmediate` is not flawless, we will test for
	// `postMessage` first.
	if (has('postmessage')) {
		let queue: QueueItem[] = [];

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
		enqueue = function (item: QueueItem): void {
			setImmediate(executeTask.bind(null, item));
		};
	}
	else {
		enqueue = function (item: QueueItem): void {
			setTimeout(executeTask.bind(null, item), 0);
		};
	}

	return function (callback: (...args: any[]) => any): Handle {
		let item: QueueItem = {
			isActive: true,
			callback: callback
		};

		enqueue(item);

		return getQueueHandle(item);
	};
})();

export let queueMicroTask = (function () {
	// TODO: Should ./Promise be imported for the `has('promise')` test?
	let hasPromise: boolean = ('Promise' in global);
	let nodeVersion: string = has('host-node');
	let enqueue: (item: QueueItem) => void;

	if (!hasPromise && !nodeVersion && !has('dom-mutationobserver')) {
		return queueTask;
	}

	if (hasPromise) {
		enqueue = function (item: QueueItem): void {
			global.Promise.resolve(item).then(executeTask);
		};
	}
	else if (nodeVersion) {
		enqueue = function (item: QueueItem): void {
			global.process.nextTick(executeTask.bind(null, item));
		};
	}
	else {
		let HostMutationObserver = global.MutationObserver || global.WebKitMutationObserver;
		let queue: QueueItem[] = [];
		let node = document.createElement('div');
		let observer = new HostMutationObserver(function (): void {
			var item: QueueItem = queue.length && queue.shift();

			if (item && item.isActive) {
				item.callback();
			}
		});

		observer.observe(node, { attributes: true });

		enqueue = function (item: QueueItem): void {
			queue.push(item);
			node.setAttribute('queueStatus', '1');
		};
	}

	return function (callback: (...args: any[]) => any): Handle {
		let item: QueueItem = {
			isActive: true,
			callback: callback
		};

		enqueue(item);

		return getQueueHandle(item);
	};
})();
