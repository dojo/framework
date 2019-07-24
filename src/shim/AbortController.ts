import global from './global';
import has from '../core/has';
import { findIndex } from './array';

export interface AbortSignal extends EventTarget {
	aborted: boolean;
	onabort: null | ((this: AbortSignal, ev: Event) => any);
}

export interface AbortSignalConstructor {
	readonly prototype: AbortSignal;
	new (): AbortSignal;
}

// tslint:disable-next-line variable-name
export let ShimAbortSignal: AbortSignalConstructor = global.AbortSignal;

if (!has('abort-signal')) {
	global.AbortSignal = ShimAbortSignal = class implements AbortSignal {
		private _aborted = false;
		onabort: null | ((this: AbortSignal, ev: Event) => any) = null;

		listeners: { [type: string]: ((event: Event) => void)[] } = {};

		get aborted(): boolean {
			return this._aborted;
		}

		addEventListener(type: string, callback: (event: Event) => void): void {
			if (!(type in this.listeners)) {
				this.listeners[type] = [];
			}
			this.listeners[type].push(callback);
		}

		removeEventListener(type: string, callback: (event: any) => void): void {
			if (!(type in this.listeners)) {
				return;
			}

			const index = findIndex(this.listeners[type], (cb: (event: any) => void) => cb === callback);

			if (index >= 0) {
				this.listeners[type].splice(index, 1);
			}
		}

		dispatchEvent(event: Event): boolean {
			const { type } = event;
			if (type === 'abort') {
				this._aborted = true;
				if (typeof this.onabort === 'function') {
					this.onabort.call(this, event);
				}
			}

			if (!(type in this.listeners)) {
				return false;
			}

			this.listeners[type].forEach((callback: (event: any) => void) => {
				setTimeout(() => callback.call(this, event), 0);
			});

			return !event.preventDefault;
		}
	};
}

export interface AbortController {
	readonly signal: AbortSignal;
	abort(): void;
}

export interface AbortControllerConstructor {
	readonly prototype: AbortController;
	new (): AbortController;
}

// tslint:disable-next-line variable-name
export let ShimAbortController: AbortControllerConstructor = global.AbortController;

if (!has('abort-controller')) {
	global.AbortController = ShimAbortController = class implements AbortController {
		readonly signal: AbortSignal = new ShimAbortSignal();

		abort(): void {
			let event: Event;
			try {
				event = new Event('abort');
			} catch (e) {
				if (typeof document !== 'undefined') {
					event = document.createEvent('Event');
					event.initEvent('abort', false, false);
				} else {
					event = {
						type: 'abort',
						bubbles: false,
						cancelable: false
					} as Event;
				}
			}

			this.signal.dispatchEvent(event);
		}
	};
}

export default ShimAbortController;
