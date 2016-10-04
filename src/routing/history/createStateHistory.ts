import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/mixins/createEvented';
import global from 'dojo-core/global';
import on from 'dojo-core/on';
import WeakMap from 'dojo-shim/WeakMap';

import { BrowserHistory, History, HistoryOptions } from './interfaces';

/**
 * A browser-based history manager that uses the history object to store the current value.
 *
 * This manager ensures the current value always starts with a slash.
 */
export type StateHistory = History;

/**
 * Options for creating StateHistory instances.
 */
export interface StateHistoryOptions extends HistoryOptions {
	/**
	 * A base pathname. The current value, as well as the emitted change value, will be relative to this base (though
	 * starting with a slash). If not set the DOM window's location's path will be used in its entirety. If the
	 * location's path is not a suffix of the base, the value will be a single slash instead.
	 *
	 * Must not contain fragment identifiers or search components.
	 */
	base?: string;

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
	base: string;
	current: string;
	browserHistory: BrowserHistory;
}

const privateStateMap = new WeakMap<StateHistory, PrivateState>();

function stripBase(base: string, path: string): string {
	if (base === '/') {
		return path;
	}

	if (path.indexOf(base) === 0) {
		return ensureLeadingSlash(path.slice(base.length));
	}
	else {
		return '/';
	}
}

function prependBase(base: string, path: string): string {
	const baseEndsWithSlash = /\/$/.test(base);
	const pathStartsWithSlash = /^\//.test(path);
	if (baseEndsWithSlash && pathStartsWithSlash) {
		return base + path.slice(1);
	}
	else if (!baseEndsWithSlash && !pathStartsWithSlash) {
		return `${base}/${path}`;
	}
	else {
		return base + path;
	}
}

function ensureLeadingSlash(path: string): string {
	return /^\//.test(path) ? path : `/${path}`;
}

const createStateHistory: StateHistoryFactory = compose.mixin(createEvented, {
	mixin: {
		get current(this: StateHistory) {
			return privateStateMap.get(this).current;
		},

		set(this: StateHistory, path: string) {
			const privateState = privateStateMap.get(this);
			const { base, browserHistory } = privateState;

			const value = ensureLeadingSlash(path);
			const fullPath = prependBase(base, path);

			privateState.current = value;
			browserHistory.pushState({}, '', fullPath);
			this.emit({ type: 'change', value });
		},

		replace(this: StateHistory, path: string) {
			const privateState = privateStateMap.get(this);
			const { base, browserHistory } = privateState;

			const value = ensureLeadingSlash(path);
			const fullPath = prependBase(base, path);

			privateState.current = value;
			browserHistory.replaceState({}, '', fullPath);
			this.emit({ type: 'change', value });
		}
	},
	initialize(instance: StateHistory, { base = '/', window }: StateHistoryOptions = { window: global }) {
		if (base !== '/') {
			if (/#/.test(base)) {
				throw new TypeError('base must not contain \'#\'');
			}
			if (/\?/.test(base)) {
				throw new TypeError('base must not contain \'?\'');
			}
		}

		const { history: browserHistory, location } = window;

		const privateState: PrivateState = {
			base,
			current: stripBase(base, location.pathname + location.search),
			browserHistory
		};
		privateStateMap.set(instance, privateState);

		instance.own(on(window, 'popstate', () => {
			const path = stripBase(base, location.pathname + location.search);

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
