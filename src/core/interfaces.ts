export type EventType = string | symbol;

/**
 * The base event object, which provides a `type` property
 */
export interface EventObject<T = EventType> {
	/**
	 * The type of the event
	 */
	readonly type: T;
}

export interface EventErrorObject<T = EventType> extends EventObject<T> {
	/**
	 * The error that is the subject of this event
	 */
	readonly error: Error;
}

/**
 * An interface for an object which provides a cancelable event API.  By calling the
 * `.preventDefault()` method on the object, the event should be cancelled and not
 * proceed any further
 */
export interface EventCancelableObject<T = EventType> extends EventObject<T> {
	/**
	 * Can the event be canceled?
	 */
	readonly cancelable: boolean;

	/**
	 * Was the event canceled?
	 */
	readonly defaultPrevented: boolean;

	/**
	 * Cancel the event
	 */
	preventDefault(): void;
}

/**
 * Used through the toolkit as a consistent API to manage how callers can "cleanup"
 * when doing a function.
 */
export interface Handle {
	/**
	 * Perform the destruction/cleanup logic associated with this handle
	 */
	destroy(): void;
}

/**
 * A general interface that can be used to renference a general index map of values of a particular type
 */
export interface Hash<T> {
	[ id: string ]: T;
}

/**
 * A base map of styles where each key is the name of the style attribute and the value is a string
 * which represents the style
 */
export interface StylesMap {
	[style: string]: string;
}
