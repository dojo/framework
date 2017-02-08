import { EventObject, EventTargettedObject, EventErrorObject, Handle } from '@dojo/interfaces/core';
import { EventedListener, EventedListenerOrArray, EventedListenersMap, EventedCallback } from '@dojo/interfaces/bases';
import { Actionable } from '@dojo/interfaces/abilities';
import { on } from '@dojo/core/aspect';
import Map from '@dojo/shim/Map';
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
 * Interface for Evented constructor options
 */
export interface EventedOptions {
	/**
	 * Optional listeners to add
	 */
	listeners?: EventedListenersMap<any>;
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
function isGlobMatch(globString: string, targetString: string): boolean {
	if (globString.indexOf('*') !== -1) {
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
export class Evented extends Destroyable {

	/**
	 * map of listeners keyed by event type
	 */
	private listenersMap: Map<string, EventedCallback<EventObject>> = new Map<string, EventedCallback<EventObject>>();

	/**
	 * @constructor
	 * @param options The constructor argurments
	 */
	constructor(options: EventedOptions) {
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
	 * Regsister a callback for a specific event type
	 *
	 * @param listeners map of listeners
	 */
	on(listeners: EventedListenersMap<Evented>): Handle;

	/**
	 * @param type the type of the event
	 * @param listener the listener to attach
	 */
	on(type: string, listener: EventedListenerOrArray<Evented, EventTargettedObject<Evented>>): Handle;

	/**
	 * @param type the type for `error`
	 * @param listener the listener to attach
	 */
	on(type: 'error', listener: EventedListenerOrArray<Evented, EventErrorObject<Evented>>): Handle;
	on(...args: any[]): Handle {
		if (args.length === 2) {
			const [ type, listeners ] = <[ string, EventedListenerOrArray<any, EventTargettedObject<any>>]> args;
			if (Array.isArray(listeners)) {
				const handles = listeners.map((listener) => on(this.listenersMap, type, resolveListener(listener)));
				return handlesArraytoHandle(handles);
			}
			else {
				return on(this.listenersMap, type, resolveListener(listeners));
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
	}
}
