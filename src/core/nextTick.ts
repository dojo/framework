import global from './global';
import has from './has';
import { Handle } from './interfaces';

/**
 * An item in a CallbackQueue.
 */
interface QueueItem<T extends Function> {
	active: boolean;
	callback: T;
}

/**
 * A queue of callbacks that will be executed in FIFO order when the queue is drained.
 */
class CallbackQueue<T extends Function> {
	private _callbacks: QueueItem<T>[] = [];

	add(callback: T): { destroy: () => void } {
		var _callback = {
			active: true,
			callback: callback
		};

		this._callbacks.push(_callback);
		callback = null;

		return {
			destroy: function() {
				this.destroy = function() { };
				_callback.active = false;
				_callback = null;
			}
		};
	}

	drain(...args: any[]): void {
		var callbacks = this._callbacks;
		var item: QueueItem<T>;
		var count = callbacks.length;

		// Any callbacks added after drain is called will be processed
		// the next time drain is called
		this._callbacks = [];

		for (var i = 0; i < count; i++) {
			item = callbacks[i];
			if (item && item.active) {
				item.callback.apply(null, args);
			}
		}
	}
}

function noop(): void { }
declare var process: any;
var nextTick: (callback: () => void) => Handle;
var nodeVersion = has('host-node');
if (nodeVersion) {
	// Node.JS 0.10 added `setImmediate` and then started throwing warnings when people called `nextTick` recursively;
	// Node.JS 0.11 supposedly removes this behaviour, so only target 0.10
	if (has('setimmediate') && nodeVersion.indexOf('0.10.') === 0) {
		nextTick = function (callback: () => void): Handle {
			var timer = setImmediate(callback);
			return {
				destroy: function(): void {
					this.destroy = noop;
					clearImmediate(timer);
				}
			};
		};
	}
	else {
		nextTick = function(callback: () => void): Handle {
			var removed = false;
			process.nextTick(function (): void {
				// There isn't an API to remove a pending call from `process.nextTick`
				if (removed) {
					return;
				}

				callback();
			});

			return {
				destroy: function (): void {
					this.destroy = noop;
					removed = true;
				}
			};
		};
	}
}
else {
	var queue = new CallbackQueue<() => void>();

	if (has('dom-mutationobserver')) {
		nextTick = (function (): typeof nextTick {
			var MutationObserver = this.MutationObserver || this.WebKitMutationObserver;
			var element = document.createElement('div');
			var observer = new MutationObserver(function (): void {
				queue.drain();
			});

			observer.observe(element, { attributes: true });

			return function(callback: () => void): Handle {
				var handle = queue.add(callback);
				element.setAttribute('drainQueue', '1');
				return handle;
			};
		})();
	}
	else {
		nextTick = (function (): typeof nextTick {
			// Node.js returns a Timer object from setTimeout, HTML5 specifies a number
			var timer: any;
			return function(callback: () => void): Handle {
				var handle = queue.add(callback);

				if (!timer) {
					timer = setTimeout(function (): void {
						clearTimeout(timer);
						timer = null;
						queue.drain();
					}, 0);
				}

				return handle;
			};
		})();
	}
}

export default nextTick;
