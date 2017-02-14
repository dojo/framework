import { EventObject, Handle } from '@dojo/interfaces/core';
import Map from '@dojo/shim/Map';
import Evented, { isGlobMatch } from './Evented';

/**
 * An implementation of the Evented class that queues up events when no listeners are
 * listening. When a listener is subscribed, the queue will be published to the listener.
 * When the queue is full, the oldest events will be discarded to make room for the newest ones.
 *
 * @property maxEvents  The number of events to queue before old events are discarded. If zero (default), an unlimited number of events is queued.
 */
export default class QueuingEvented extends Evented {
	private _queue: Map<string, EventObject[]>;
	private _originalOn: (...args: any[]) => Handle;

	maxEvents: number = 0;

	constructor() {
		super();

		this._queue = new Map<string, EventObject[]>();
		this._originalOn = this.on;
		this.on = function (this: QueuingEvented, ...args: any[]): Handle {
			let handle = this._originalOn(...args);

			this.listenersMap.forEach((method, listenerType) => {
				this._queue.forEach((events, queuedType) => {
					if (isGlobMatch(listenerType, queuedType)) {
						events.forEach((event) => this.emit(event));
						this._queue.delete(queuedType);
					}
				});
			});

			return handle;
		};
	}

	emit<E extends EventObject>(event: E): void {
		super.emit(event);

		let hasMatch = false;

		this.listenersMap.forEach((method, type) => {
			if (isGlobMatch(type, event.type)) {
				hasMatch = true;
			}
		});

		if (!hasMatch) {
			let queue = this._queue.get(event.type);

			if (!queue) {
				queue = [];
				this._queue.set(event.type, queue);
			}

			queue.push(event);

			if (this.maxEvents > 0) {
				while (queue.length > this.maxEvents) {
					queue.shift();
				}
			}
		}
	}
}
