import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/mixins/createEvented';
import global from 'dojo-core/global';
import on from 'dojo-core/on';

import { BrowserHistory, History, HistoryOptions } from './interfaces';

export interface StateHistoryMixin {
	_current: string;
	_history: BrowserHistory;
	_onPopstate(path: string): void;
}

/**
 * A browser-based history manager that uses the history object to store the current value.
 */
export type StateHistory = History & StateHistoryMixin;

/**
 * Options for creating StateHistory instances.
 */
export interface StateHistoryOptions extends HistoryOptions {
	/**
	 * A DOM window object. StateHistory uses the `history` and `location` properties and
	 * listens to `popstate` events. The current value is initialized to the current path.
	 */
	window: Window;
}

export interface StateHistoryFactory extends ComposeFactory<StateHistory, StateHistoryOptions> {
	/**
	 * Create a new StateHistory instance.
	 * @param options Options to use during creation. If not specified the instance assumes
	 *   the global object is a DOM window.
	 */
	(options?: StateHistoryOptions): StateHistory;
}

const createStateHistory: StateHistoryFactory = compose({
	// N.B. Set per instance in the initializer
	_current: '',
	_history: {} as BrowserHistory,

	get current (this: StateHistory) {
		return this._current;
	},

	set (this: StateHistory, path: string) {
		this._current = path;
		this._history.pushState({}, '', path);
		this.emit({
			type: 'change',
			value: path
		});
	},

	replace (this: StateHistory, path: string) {
		this._current = path;
		this._history.replaceState({}, '', path);
		this.emit({
			type: 'change',
			value: path
		});
	},

	_onPopstate (this: StateHistory, path: string) {
		// Ignore popstate for the current path. Guards against browsers firing
		// popstate on page load, see
		// <https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate>.
		if (path !== this._current) {
			this._current = path;
			this.emit({
				type: 'change',
				value: path
			});
		}
	}
}).mixin({
	mixin: createEvented,
	initialize(instance: StateHistory, { window }: StateHistoryOptions = { window: global }) {
		const { history, location } = window;
		instance._current = location.pathname + location.search;
		instance._history = history;

		instance.own(on(window, 'popstate', () => {
			instance._onPopstate(location.pathname + location.search);
		}));
	}
});

export default createStateHistory;
