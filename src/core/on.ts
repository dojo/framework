import { Handle, EventObject } from './interfaces';
import { createHandle, createCompositeHandle } from './lang';
import Evented from './Evented';

export interface EventCallback {
	(event: EventObject): void;
}

export interface EventEmitter {
	on(event: string, listener: EventCallback): EventEmitter;
	removeListener(event: string, listener: EventCallback): EventEmitter;
}

export interface EventTarget {
	accessKey?: string;
	addEventListener(event: string, listener: EventCallback, capture?: boolean): void;
	removeEventListener(event: string, listener: EventCallback, capture?: boolean): void;
}

export interface ExtensionEvent {
	(target: any, listener: EventCallback, capture?: boolean): Handle;
}

interface DOMEventObject extends EventObject {
	bubbles: boolean;
	cancelable: boolean;
}

/**
 * Provides a normalized mechanism for dispatching events for event emitters, Evented objects, or DOM nodes.
 * @param target The target to emit the event from
 * @param event The event object to emit
 * @return Boolean indicating Whether the event was canceled (this will always be false for event emitters)
 */
export function emit(target: EventTarget, event: EventObject): boolean;
export function emit(target: EventEmitter, event: EventObject): boolean;
export function emit(target: Evented, event: EventObject): boolean;
export function emit(target: any, event: EventObject): boolean {
	if (target.dispatchEvent && target.ownerDocument && target.ownerDocument.createEvent) {
		let nativeEvent = target.ownerDocument.createEvent('HTMLEvents');
		nativeEvent.initEvent(
			event.type,
			Boolean((<DOMEventObject>event).bubbles),
			Boolean((<DOMEventObject>event).cancelable)
		);

		for (let key in event) {
			if (!(key in nativeEvent)) {
				nativeEvent[key] = (<any>event)[key];
			}
		}

		return target.dispatchEvent(nativeEvent);
	}

	if (target.emit) {
		if (target.removeListener) {
			target.emit(event.type, event);
			return false;
		}
		else if (target.on) {
			target.emit(event);
			return false;
		}
	}

	throw new Error('Target must be an event emitter');
}

/**
 * Provides a normalized mechanism for listening to events from event emitters, Evented objects, or DOM nodes.
 * @param target Target to listen for event on
 * @param type Event type(s) to listen for; may be strings or extension events
 * @param listener Callback to handle the event when it fires
 * @param capture Whether the listener should be registered in the capture phase (DOM events only)
 * @return A handle which will remove the listener when destroy is called
 */
export default function on(target: EventTarget, type: string, listener: EventCallback, capture?: boolean): Handle;
export default function on(target: EventTarget, type: ExtensionEvent, listener: EventCallback, capture?: boolean): Handle;
export default function on(target: EventTarget, type: (string | ExtensionEvent)[], listener: EventCallback, capture?: boolean): Handle;
export default function on(target: EventEmitter, type: string, listener: EventCallback): Handle;
export default function on(target: EventEmitter, type: ExtensionEvent, listener: EventCallback): Handle;
export default function on(target: EventEmitter, type: (string | ExtensionEvent)[], listener: EventCallback): Handle;
export default function on(target: Evented, type: string, listener: EventCallback): Handle;
export default function on(target: Evented, type: ExtensionEvent, listener: EventCallback): Handle;
export default function on(target: Evented, type: (string | ExtensionEvent)[], listener: EventCallback): Handle;
export default function on(target: any, type: any, listener: any, capture?: boolean): Handle {
	if (type.call) {
		return type.call(this, target, listener, capture);
	}

	if (Array.isArray(type)) {
		let handles: Handle[] = type.map(function (type: string): Handle {
			return on(target, type, listener, capture);
		});

		return createCompositeHandle(...handles);
	}

	const callback = function () {
		listener.apply(this, arguments);
	};

	if (target.addEventListener && target.removeEventListener) {
		target.addEventListener(type, callback, capture);
		return createHandle(function () {
			target.removeEventListener(type, callback, capture);
		});
	}

	if (target.on) {
		if (target.removeListener) {
			target.on(type, callback);
			return createHandle(function () {
				target.removeListener(type, callback);
			});
		}
		else if (target.emit) {
			return target.on(type, listener);
		}
	}

	throw new TypeError('Unknown event emitter object');
}
