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
		let _callback = {
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
		let callbacks = this._callbacks;
		let item: QueueItem<T>;
		let count = callbacks.length;

		// Any callbacks added after drain is called will be processed
		// the next time drain is called
		this._callbacks = [];

		for (let i = 0; i < count; i++) {
			item = callbacks[i];
			if (item && item.active) {
				item.callback.apply(null, args);
			}
		}
	}
}

function noop(): void { }
declare let process: any;
let nextTick: (callback: () => void) => Handle;
let nodeVersion = has('host-node');
if (nodeVersion) {
	// In Node.JS 0.9.x and 0.10.x, deeply recursive process.nextTick calls can cause stack overflows, so use
	// setImmediate.
	if (nodeVersion.indexOf('0.9.') === 0 || nodeVersion.indexOf('0.10.') === 0) {
		nextTick = function (callback: () => void): Handle {
			let timer = setImmediate(callback);
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
			let removed = false;
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
	let queue = new CallbackQueue<() => void>();

	if (has('dom-mutationobserver')) {
		nextTick = (function (): typeof nextTick {
			let MutationObserver = this.MutationObserver || this.WebKitMutationObserver;
			let element = document.createElement('div');
			let observer = new MutationObserver(function (): void {
				queue.drain();
			});

			observer.observe(element, { attributes: true });

			return function(callback: () => void): Handle {
				let handle = queue.add(callback);
				element.setAttribute('drainQueue', '1');
				return handle;
			};
		})();
	}
	else {
		nextTick = (function (): typeof nextTick {
			// Node.js returns a Timer object from setTimeout, HTML5 specifies a number
			let timer: any;
			return function(callback: () => void): Handle {
				let handle = queue.add(callback);

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
