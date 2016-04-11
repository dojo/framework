import { byType } from 'dojo-actions/createAction';
import { Handle, EventObject } from 'dojo-core/interfaces';
import { on } from 'dojo-core/aspect';
import WeakMap from 'dojo-core/WeakMap';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable, { Destroyable } from './createDestroyable';

/* TODO: consider a has flag for dojo-actions so it isn't a hard dependency */

/**
 * A map of hashes of listeners for event types
 */
const listenersMap = new WeakMap<Evented, { [ type: string ]: EventedCallback<EventObject>}>();

/**
 * Interface describes evented callbacks
 */
export interface EventedCallback<T extends EventObject> {
	/**
	 * A callback that is called when the event fires
	 * @param event The event object
	 */
	(event: T): void;
}

export interface Actionable<T extends EventObject> {
	do(options?: { event: T; }): any;
}

/**
 * An Actionable callback type guard
 * @param value The value to guard against
 */
function isActionable(value: any): value is Actionable<EventObject> {
	return typeof value === 'object' && 'do' in value && typeof value.do === 'function';
}

export type EventedListener<E extends EventObject> = EventedCallback<E> | Actionable<E> | string;

/**
 * The options for the events
 */
export interface EventedOptions {
	/**
	 * A map of listeners to attach on initialization
	 */
	listeners?: {
		[event: string]: EventedListener<EventObject>;
	};
}

export interface Evented extends Destroyable {
	/**
	 * Emit an event
	 * @param event The event object to emit
	 */
	emit<T extends EventObject>(event: T): void;

	/* you can extend evented and use object literals to type the listener event */

	/**
	 * Attach a listener to an event and return a handle that allows the removal of
	 * the listener.
	 * @param type The name of the event
	 */
	on(type: string, listener: EventedListener<EventObject>): Handle;
}

export interface EventedFactory extends ComposeFactory<Evented, EventedOptions> { }

export function resolveEventListener<E extends EventObject>(listener: EventedListener<E>): EventedCallback<E> {
	let action: Actionable<E>;
	if (isActionable(listener)) {
		action = listener;
	}
	if (typeof listener === 'string') {
		action = byType(listener);
		if (!action) {
			throw new Error(`Cannot resolve action type "${listener}"`);
		}
	}
	return action ? function (event: E) {
		action.do({ event });
	} : <any> listener;
}

const createEvented: EventedFactory = compose({
		emit<T extends EventObject>(event: T): void {
			const method = listenersMap.get(this)[event.type];
			if (method) {
				method.call(this, event);
			}
		},
		on(type: string, listener: EventedListener<Event>): Handle {
			return on(listenersMap.get(this), type, resolveEventListener(listener));
		}
	})
	.mixin({
		mixin: createDestroyable,
		initialize(instance: Evented, options: EventedOptions) {
			/* Initialize the listener map */
			listenersMap.set(instance, {});

			if (options && 'listeners' in options) {
				for (let eventType in options.listeners) {
					instance.own(instance.on(eventType, resolveEventListener(options.listeners[eventType])));
				}
			}
		}
	});

export default createEvented;
