import { EventObject, Handle } from 'dojo-core/interfaces';
import { Evented, EventedListener, EventedOptions } from 'dojo-widgets/mixins/createEvented';

export { BrowserHistory } from './alias-ambient-history';

/**
 * Event object that is emitted for the 'change' event.
 */
export interface HistoryChangeEvent extends EventObject {
	/**
	 * The new (current) value of the history. This is a path string.
	 */
	value: string;
}

/**
 * A history manager.
 */
export interface History extends Evented {
	/**
	 * Get the current value. This is a path string.
	 */
	current: string;

	/**
	 * Set the current value. If used with a browser implementation causes a new history entry
	 * to be added. Fires the 'change' event.
	 */
	set(path: string): void;

	/**
	 * Replace the current value. If used with a browser implementation causes the current
	 * history entry to be replaced. Fires the 'change' event.
	 */
	replace(path: string): void;

	/**
	 * Event emitted when the current value is changed, after the browser's history has
	 * been updated.
	 */
	on(type: 'change', listener: EventedListener<HistoryChangeEvent>): Handle;

	on(type: string, listener: EventedListener<EventObject>): Handle;
}

export interface HistoryOptions extends EventedOptions {}
