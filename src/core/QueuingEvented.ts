import { Handle, EventObject, EventType } from './interfaces';
import Map from '@dojo/shim/Map';
import Evented, { CustomEventTypes, isGlobMatch, EventedCallbackOrArray } from './Evented';

/**
 * An implementation of the Evented class that queues up events when no listeners are
 * listening. When a listener is subscribed, the queue will be published to the listener.
 * When the queue is full, the oldest events will be discarded to make room for the newest ones.
 *
 * @property maxEvents  The number of events to queue before old events are discarded. If zero (default), an unlimited number of events is queued.
 */
class QueuingEvented<
	M extends CustomEventTypes = {},
	T = EventType,
	O extends EventObject<T> = EventObject<T>
> extends Evented<M, T, O> {
	private _queue: Map<string | symbol, EventObject[]> = new Map();

	public maxEvents = 0;

	emit<K extends keyof M>(event: M[K]): void;
	emit(event: O): void;
	emit(event: any): void {
		super.emit(event);

		let hasMatch = false;

		this.listenersMap.forEach((method, type) => {
			// Since `type` is generic, the compiler doesn't know what type it is and `isGlobMatch` requires `string | symbol`
			if (isGlobMatch(type as any, event.type)) {
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

	on<K extends keyof M>(type: K, listener: EventedCallbackOrArray<K, M[K]>): Handle;
	on(type: T, listener: EventedCallbackOrArray<T, O>): Handle;
	on(type: any, listener: EventedCallbackOrArray<any, any>): Handle {
		let handle = super.on(type, listener);

		this.listenersMap.forEach((method, listenerType) => {
			this._queue.forEach((events, queuedType) => {
				if (isGlobMatch(listenerType as any, queuedType)) {
					events.forEach((event) => this.emit(event));
					this._queue.delete(queuedType);
				}
			});
		});

		return handle;
	}
}

export default QueuingEvented;
