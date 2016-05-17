import compose, { ComposeFactory } from 'dojo-compose/compose';
import global from 'dojo-core/global';
import on from 'dojo-core/on';
import createEvented from 'dojo-widgets/mixins/createEvented';

import { BrowserHistory, History, HistoryOptions } from './interfaces';

/**
 * A browser-based history manager that uses the history object to store the current value.
 */
interface StateHistory extends History {
	_current?: string;
	_history?: BrowserHistory;
	_onPopstate(path: string): void;
}

/**
 * Options for creating StateHistory instances.
 */
interface StateHistoryOptions extends HistoryOptions {
	/**
	 * A DOM window object. StateHistory uses the `history` and `location` properties and
	 * listens to `popstate` events. The current value is initialized to the current path.
	 */
	window: Window;
}

interface StateHistoryFactory extends ComposeFactory<StateHistory, StateHistoryOptions> {
	/**
	 * Create a new StateHistory instance.
	 * @param options Options to use during creation. If not specified the instance assumes
	 *   the global object is a DOM window.
	 */
	(options?: StateHistoryOptions): StateHistory;

}

const createStateHistory: StateHistoryFactory = compose({
	get current () {
		return this._current;
	},

	set (path: string) {
		this._current = path;
		this._history.pushState({}, '', path);
		this.emit({
			type: 'change',
			value: path
		});
	},

	replace (path: string) {
		this._current = path;
		this._history.replaceState({}, '', path);
		this.emit({
			type: 'change',
			value: path
		});
	},

	_onPopstate (path: string) {
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
