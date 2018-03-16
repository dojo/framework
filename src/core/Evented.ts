import Map from '@dojo/shim/Map';
import { Handle, EventType, EventObject } from './interfaces';
import { Destroyable } from './Destroyable';

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
		} else {
			regex = new RegExp(`^${globString.replace(/\*/g, '.*')}$`);
			regexMap.set(globString, regex);
		}
		return regex.test(targetString);
	} else {
		return globString === targetString;
	}
}

export type EventedCallback<T = EventType, E extends EventObject<T> = EventObject<T>> = {
	/**
	 * A callback that takes an `event` argument
	 *
	 * @param event The event object
	 */

	(event: E): boolean | void;
};

export interface CustomEventTypes<T extends EventObject<any> = EventObject<any>> {
	[index: string]: T;
}

/**
 * A type which is either a targeted event listener or an array of listeners
 * @template T The type of target for the events
 * @template E The event type for the events
 */
export type EventedCallbackOrArray<T = EventType, E extends EventObject<T> = EventObject<T>> =
	| EventedCallback<T, E>
	| EventedCallback<T, E>[];

/**
 * Event Class
 */
export class Evented<
	M extends CustomEventTypes = {},
	T = EventType,
	O extends EventObject<T> = EventObject<T>
> extends Destroyable {
	// The following member is purely so TypeScript remembers the type of `M` when extending so
	// that the utilities in `on.ts` will work https://github.com/Microsoft/TypeScript/issues/20348
	// tslint:disable-next-line
	protected __typeMap__?: M;
	/**
	 * map of listeners keyed by event type
	 */
	protected listenersMap: Map<T | keyof M, EventedCallback<T, O>[]> = new Map();

	/**
	 * Emits the event object for the specified type
	 *
	 * @param event the event to emit
	 */
	emit<K extends keyof M>(event: M[K]): void;
	emit(event: O): void;
	emit(event: any): void {
		this.listenersMap.forEach((methods, type) => {
			if (isGlobMatch(type as any, event.type)) {
				methods.forEach((method) => {
					method.call(this, event);
				});
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
	on<K extends keyof M>(type: K, listener: EventedCallbackOrArray<K, M[K]>): Handle;
	on(type: T, listener: EventedCallbackOrArray<T, O>): Handle;
	on(type: any, listener: EventedCallbackOrArray<any, any>): Handle {
		if (Array.isArray(listener)) {
			const handles = listener.map((listener) => this._addListener(type, listener));
			return {
				destroy() {
					handles.forEach((handle) => handle.destroy());
				}
			};
		}
		return this._addListener(type, listener);
	}

	private _addListener(type: T | keyof M, listener: EventedCallback<T, O>) {
		const listeners = this.listenersMap.get(type) || [];
		listeners.push(listener);
		this.listenersMap.set(type, listeners);
		return {
			destroy: () => {
				const listeners = this.listenersMap.get(type) || [];
				listeners.splice(listeners.indexOf(listener), 1);
			}
		};
	}
}

export default Evented;
