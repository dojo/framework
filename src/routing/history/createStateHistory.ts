import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/mixins/createEvented';
import global from 'dojo-core/global';
import on from 'dojo-core/on';
import WeakMap from 'dojo-shim/WeakMap';

import { BrowserHistory, History, HistoryOptions } from './interfaces';

/**
 * A browser-based history manager that uses the history object to store the current value.
 */
export type StateHistory = History;

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

interface PrivateState {
	current: string;
	browserHistory: BrowserHistory;
}

const privateStateMap = new WeakMap<StateHistory, PrivateState>();

const createStateHistory: StateHistoryFactory = compose.mixin(createEvented, {
	mixin: {
		get current(this: StateHistory) {
			return privateStateMap.get(this).current;
		},

		set(this: StateHistory, path: string) {
			const privateState = privateStateMap.get(this);
			privateState.current = path;
			privateState.browserHistory.pushState({}, '', path);
			this.emit({
				type: 'change',
				value: path
			});
		},

		replace(this: StateHistory, path: string) {
			const privateState = privateStateMap.get(this);
			privateState.current = path;
			privateState.browserHistory.replaceState({}, '', path);
			this.emit({
				type: 'change',
				value: path
			});
		}
	},
	initialize(instance: StateHistory, { window }: StateHistoryOptions = { window: global }) {
		const { history: browserHistory, location } = window;

		const privateState: PrivateState = {
			current: location.pathname + location.search,
			browserHistory
		};
		privateStateMap.set(instance, privateState);

		instance.own(on(window, 'popstate', () => {
			const path = location.pathname + location.search;

			// Ignore popstate for the current path. Guards against browsers firing
			// popstate on page load, see
			// <https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate>.
			if (path !== privateState.current) {
				privateState.current = path;
				instance.emit({
					type: 'change',
					value: path
				});
			}
		}));
	}
});

export default createStateHistory;
