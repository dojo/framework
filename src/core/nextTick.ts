import has from './has';
import { Handle } from './interfaces';
import { QueueItem } from './queue';

/**
 * Create macro-scheduler based nextTick function.
 */
function createMacroScheduler(
	schedule: ((callback: () => void, timeout?: number) => void),
	clearSchedule: ((handle: any) => void)
) {
	let queue = new CallbackQueue();
	let timer: any;

	return function(callback: () => void): Handle {
		let handle = queue.add(callback);

		if (!timer) {
			timer = schedule(function (): void {
				clearSchedule(timer);
				timer = null;
				queue.drain();
			}, 0);
		}

		return handle;
	};
}

/**
 * A queue of callbacks that will be executed in FIFO order when the queue is drained.
 */
class CallbackQueue {
	private _callbacks: QueueItem[] = [];

	add(callback: () => void): { destroy: () => void } {
		let _callback = {
			isActive: true,
			callback: callback
		};

		this._callbacks.push(_callback);
		callback = null;

		return {
			destroy: function() {
				this.destroy = function() {};
				_callback.isActive = false;
				_callback = null;
			}
		};
	}

	drain(...args: any[]): void {
		let callbacks = this._callbacks;

		// Any callbacks added after drain is called will be processed
		// the next time drain is called
		this._callbacks = [];

		for (let item of callbacks) {
			if (item && item.isActive) {
				item.callback.apply(null, args);
			}
		}
	}
}

let nextTick: (callback: () => void) => Handle;
let nodeVersion = has('host-node');

if (nodeVersion) {
	// In Node.JS 0.9.x and 0.10.x, deeply recursive process.nextTick calls can cause stack overflows, so use
	// setImmediate.
	if (nodeVersion.indexOf('0.9.') === 0 || nodeVersion.indexOf('0.10.') === 0) {
		nextTick = createMacroScheduler(setImmediate, clearImmediate);
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
					this.destroy = () => {};
					removed = true;
				}
			};
		};
	}
}
else if (has('dom-mutationobserver')) {
	let queue = new CallbackQueue();

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
	// If nothing better is available, fallback to setTimeout
	nextTick = createMacroScheduler(setTimeout, clearTimeout);
}

export default nextTick;
