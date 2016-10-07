import { Evented, EventedListener, EventedOptions, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import { Handle } from 'dojo-core/interfaces';

export { BrowserHistory } from './_alias-ambient-history';

/**
 * Event object that is emitted for the 'change' event.
 */
export interface HistoryChangeEvent extends TargettedEventObject {
	/**
	 * The new (current) value of the history. This is a path string.
	 */
	value: string;
}

/**
 * A history manager mixin.
 */
export interface HistoryMixin {
	/**
	 * Get the current value. This is a path string.
	 */
	readonly current: string;

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
}

export interface HistoryOverrides {
	/**
	 * Event emitted when the current value is changed, after the browser's history has
	 * been updated.
	 */
	on(type: 'change', listener: EventedListener<HistoryChangeEvent>): Handle;

	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export type History = Evented & HistoryMixin & HistoryOverrides;

export interface HistoryOptions extends EventedOptions {}
