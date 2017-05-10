import { Handle } from '@dojo/interfaces/core';
import { createHandle, createCompositeHandle } from './lang';
import Evented, { EventObject } from './Evented';

export interface EventCallback {
	(event: EventObject): void;
}

export interface EventEmitter {
	on(event: string, listener: EventCallback): EventEmitter;
	removeListener(event: string, listener: EventCallback): EventEmitter;
}

interface DOMEventObject extends EventObject {
	bubbles: boolean;
	cancelable: boolean;
}

/**
 * Provides a normalized mechanism for dispatching events for event emitters, Evented objects, or DOM nodes.
 * @param target The target to emit the event from
 * @param event The event object to emit
 * @return Boolean indicating if preventDefault was called on the event object (only relevant for DOM events;
 *     always false for other event emitters)
 */
export function emit<T extends EventObject>(target: Evented | EventTarget | EventEmitter, event: T | EventObject): boolean;
export function emit<T extends EventObject>(target: any, event: T | EventObject): boolean {
	if (
		target.dispatchEvent && /* includes window and document */
			((target.ownerDocument && target.ownerDocument.createEvent) || /* matches nodes */
			(target.document && target.document.createEvent) || /* matches window */
			target.createEvent) /* matches document */
	) {
		const nativeEvent = (target.ownerDocument || target.document || target).createEvent('HTMLEvents');
		nativeEvent.initEvent(
			event.type,
			Boolean((<DOMEventObject> event).bubbles),
			Boolean((<DOMEventObject> event).cancelable)
		);

		for (let key in event) {
			if (!(key in nativeEvent)) {
				nativeEvent[key] = (<any> event)[key];
			}
		}

		return target.dispatchEvent(nativeEvent);
	}

	if (target.emit) {
		if (target.removeListener) {
			// Node.js EventEmitter
			target.emit(event.type, event);
			return false;
		}
		else if (target.on) {
			// Dojo Evented or similar
			target.emit(event);
			return false;
		}
	}

	throw new Error('Target must be an event emitter');
}

/**
 * Provides a normalized mechanism for listening to events from event emitters, Evented objects, or DOM nodes.
 * @param target Target to listen for event on
 * @param type Event event type(s) to listen for; may a string or an array of strings
 * @param listener Callback to handle the event when it fires
 * @param capture Whether the listener should be registered in the capture phase (DOM events only)
 * @return A handle which will remove the listener when destroy is called
 */
export default function on(target: EventTarget, type: string | string[], listener: EventCallback, capture?: boolean): Handle;
export default function on(target: EventEmitter | Evented, type: string | string[], listener: EventCallback): Handle;
export default function on(target: any, type: any, listener: any, capture?: boolean): Handle {
	if (Array.isArray(type)) {
		let handles: Handle[] = type.map(function (type: string): Handle {
			return on(target, type, listener, capture);
		});

		return createCompositeHandle(...handles);
	}

	const callback = function (this: any) {
		listener.apply(this, arguments);
	};

	// DOM EventTarget
	if (target.addEventListener && target.removeEventListener) {
		target.addEventListener(type, callback, capture);
		return createHandle(function () {
			target.removeEventListener(type, callback, capture);
		});
	}

	if (target.on) {
		// EventEmitter
		if (target.removeListener) {
			target.on(type, callback);
			return createHandle(function () {
				target.removeListener(type, callback);
			});
		}
		// Evented
		else if (target.emit) {
			return target.on(type, listener);
		}
	}

	throw new TypeError('Unknown event emitter object');
}

/**
 * Provides a mechanism for listening to the next occurrence of an event from event
 * emitters, Evented objects, or DOM nodes.
 * @param target Target to listen for event on
 * @param type Event event type(s) to listen for; may be a string or an array of strings
 * @param listener Callback to handle the event when it fires
 * @param capture Whether the listener should be registered in the capture phase (DOM events only)
 * @return A handle which will remove the listener when destroy is called
 */
export function once(target: EventTarget, type: string | string[], listener: EventCallback, capture?: boolean): Handle;
export function once(target: EventEmitter | Evented, type: string | string[], listener: EventCallback): Handle;
export function once(target: any, type: any, listener: any, capture?: boolean): Handle {
	// FIXME
	// tslint:disable-next-line:no-var-keyword
	var handle = on(target, type, function (this: any) {
		handle.destroy();
		return listener.apply(this, arguments);
	}, capture);

	return handle;
}

export interface PausableHandle extends Handle {
	pause(): void;
	resume(): void;
}

/**
 * Provides a mechanism for creating pausable listeners for events from event emitters, Evented objects, or DOM nodes.
 * @param target Target to listen for event on
 * @param type Event event type(s) to listen for; may a string or an array of strings
 * @param listener Callback to handle the event when it fires
 * @param capture Whether the listener should be registered in the capture phase (DOM events only)
 * @return A handle with additional pause and resume methods; the listener will never fire when paused
 */
export function pausable(target: EventTarget, type: string | string[], listener: EventCallback, capture?: boolean): PausableHandle;
export function pausable(target: EventEmitter | Evented, type: string | string[], listener: EventCallback): PausableHandle;
export function pausable(target: any, type: any, listener: any, capture?: boolean): PausableHandle {
	let paused: boolean;

	const handle = <PausableHandle> on(target, type, function (this: any) {
		if (!paused) {
			return listener.apply(this, arguments);
		}
	}, capture);

	handle.pause = function () {
		paused = true;
	};

	handle.resume = function () {
		paused = false;
	};

	return handle;
}
