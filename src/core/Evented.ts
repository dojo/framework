import { Handle, EventObject } from '@dojo/interfaces/core';
import { on } from './aspect';

export default class Evented {
	/**
	 * Emits an event, firing listeners registered for it.
	 * @param event The event object to emit
	 */
	emit<T extends EventObject>(data: T): void {
		const type = '__on' + data.type;
		const method: Function = (<any> this)[type];
		if (method) {
			method.call(this, data);
		}
	}

	/**
	 * Listens for an event, calling the listener whenever the event fires.
	 * @param type Event type to listen for
	 * @param listener Callback to handle the event when it fires
	 * @return A handle which will remove the listener when destroy is called
	 */
	on(type: string, listener: (event: EventObject) => void): Handle {
		const name = '__on' + type;
		if (!(<any> this)[name]) {
			// define a non-enumerable property (see #77)
			Object.defineProperty(this, name, {
				configurable: true,
				value: undefined,
				writable: true
			});
		}
		return on(this, name, listener);
	}
}
