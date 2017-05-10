import { Actionable } from '@dojo/interfaces/abilities';
import { EventedListener, EventedListenerOrArray, EventedListenersMap } from '@dojo/interfaces/bases';
import { EventTargettedObject, EventErrorObject, Handle } from '@dojo/interfaces/core';
import Map from '@dojo/shim/Map';
import { on as aspectOn } from './aspect';
import { Destroyable } from './Destroyable';

/**
 * Determines is the value is Actionable (has a `.do` function)
 *
 * @param value the value to check
 * @returns boolean indicating is the value is Actionable
 */
function isActionable(value: any): value is Actionable<any, any> {
	return Boolean(value && typeof value.do === 'function');
}

/**
 * Resolve listeners.
 */
function resolveListener<T, E extends EventTargettedObject<T>>(listener: EventedListener<T, E>): EventedCallback<E> {
	return isActionable(listener) ? (event: E) => listener.do({ event }) : listener;
}

/**
 * Handles an array of handles
 *
 * @param handles an array of handles
 * @returns a single Handle for handles passed
 */
function handlesArraytoHandle(handles: Handle[]): Handle {
	return {
		destroy() {
			handles.forEach((handle) => handle.destroy());
		}
	};
}

/**
 * The base event object, which provides a `type` property
 */
export interface EventObject {
	/**
	 * The type of the event
	 */
	readonly type: string | symbol;
}

export interface EventedCallback<E extends EventObject> {
	/**
	 * A callback that takes an `event` argument
	 *
	 * @param event The event object
	 */
	(event: E): boolean | void;
}

/**
 * Interface for Evented constructor options
 */
export interface EventedOptions {
	/**
	 * Optional listeners to add
	 */
	listeners?: EventedListenersMap<any>;
}

export interface BaseEventedEvents {
	/**
	 * Regsister a callback for a specific event type
	 *
	 * @param listeners map of listeners
	 */
	(listeners: EventedListenersMap<Evented>): Handle;

	/**
	 * @param type the type of the event
	 * @param listener the listener to attach
	 */
	(type: string | symbol, listener: EventedListenerOrArray<Evented, EventTargettedObject<Evented>>): Handle;

	/**
	 * @param type the type for `error`
	 * @param listener the listener to attach
	 */
	(type: 'error', listener: EventedListenerOrArray<Evented, EventErrorObject<Evented>>): Handle;
}

export interface Evented {
	on: BaseEventedEvents;
}

/**
 * Map of computed regular expressions, keyed by string
 */
const regexMap = new Map<string, RegExp>();

/**
 * Determines is the event type glob has been matched
 *
 * @returns boolean that indicates if the glob is matched
 */
export function isGlobMatch(globString: string | symbol, targetString: string | symbol): boolean {
	if (typeof targetString === 'string' && typeof globString === 'string' && globString.indexOf('*') !== -1) {
		let regex: RegExp;
		if (regexMap.has(globString)) {
			regex = regexMap.get(globString)!;
		}
		else {
			regex = new RegExp(`^${ globString.replace(/\*/g, '.*') }$`);
			regexMap.set(globString, regex);
		}
		return regex.test(targetString);

	} else {
		return globString === targetString;
	}
}

/**
 * Event Class
 */
export class Evented extends Destroyable implements Evented {

	/**
	 * map of listeners keyed by event type
	 */
	protected listenersMap: Map<string, EventedCallback<EventObject>> = new Map<string, EventedCallback<EventObject>>();

	/**
	 * @constructor
	 * @param options The constructor argurments
	 */
	constructor(options: EventedOptions = {}) {
		super();
		const { listeners } = options;
		if (listeners) {
			this.own(this.on(listeners));
		}
	}

	/**
	 * Emits the event objet for the specified type
	 *
	 * @param event the event to emit
	 */
	emit<E extends EventObject>(event: E): void {
		this.listenersMap.forEach((method, type) => {
			if (isGlobMatch(type, event.type)) {
				method.call(this, event);
			}
		});
	}

	/**
	 * Catch all handler for various call signatures. The signatures are defined in
	 * `BaseEventedEvents`.  You can add your own event type -> handler types by extending
	 * `BaseEventedEvents`.  See example for details.
	 *
	 * @param args
	 *
	 * @example
	 *
	 * interface WidgetBaseEvents extends BaseEventedEvents {
	 *     (type: 'properties:changed', handler: PropertiesChangedHandler): Handle;
	 * }
	 * class WidgetBase extends Evented {
	 *    on: WidgetBaseEvents;
	 * }
	 *
	 * @return {any}
	 */
	on: BaseEventedEvents = function (this: Evented, ...args: any[]) {
		if (args.length === 2) {
			const [ type, listeners ] = <[ string, EventedListenerOrArray<any, EventTargettedObject<any>>]> args;
			if (Array.isArray(listeners)) {
				const handles = listeners.map((listener) => aspectOn(this.listenersMap, type, resolveListener(listener)));
				return handlesArraytoHandle(handles);
			}
			else {
				return aspectOn(this.listenersMap, type, resolveListener(listeners));
			}
		}
		else if (args.length === 1) {
			const [ listenerMapArg ] = <[EventedListenersMap<any>]> args;
			const handles = Object.keys(listenerMapArg).map((type) => this.on(type, listenerMapArg[type]));
			return handlesArraytoHandle(handles);
		}
		else {
			throw new TypeError('Invalid arguments');
		}
	};
}

export default Evented;
