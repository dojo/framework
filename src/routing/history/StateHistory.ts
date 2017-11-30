import global from '@dojo/shim/global';
import on from '@dojo/core/on';
import { HistoryBase } from './HistoryBase';

import { History, BrowserHistory, HistoryOptions } from './interfaces';

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

/**
 * A browser-based history manager that uses the history object to store the current value.
 *
 * This manager ensures the current value always starts with a slash.
 */
export class StateHistory extends HistoryBase implements History {
	private _base: string;
	private _current: string;
	private _browserHistory: BrowserHistory;

	get current() {
		return this._current;
	}

	prefix(path: string) {
		const baseEndsWithSlash = /\/$/.test(this._base);
		const pathStartsWithSlash = /^\//.test(path);
		if (baseEndsWithSlash && pathStartsWithSlash) {
			return this._base + path.slice(1);
		}
		else if (!baseEndsWithSlash && !pathStartsWithSlash) {
			return `${this._base}/${path}`;
		}
		else {
			return this._base + path;
		}
	}

	set(path: string) {
		const value = ensureLeadingSlash(path);
		if (this._current === value) {
			return;
		}

		this._current = value;
		this._browserHistory.pushState({}, '', this.prefix(path));
		this.emit({ type: 'change', target: this, value });
	}

	replace(path: string) {
		const value = ensureLeadingSlash(path);
		if (this._current === value) {
			return;
		}

		this._current = value;
		this._browserHistory.replaceState({}, '', this.prefix(path));
		this.emit({ type: 'change', target: this, value });
	}

	constructor({ base = '/', window }: StateHistoryOptions = { window: global }) {
		super();

		if (base !== '/') {
			if (/#/.test(base)) {
				throw new TypeError('base must not contain \'#\'');
			}
			if (/\?/.test(base)) {
				throw new TypeError('base must not contain \'?\'');
			}
		}

		const { history: browserHistory, location } = window;

		this._base = base;
		this._current = stripBase(base, location.pathname + location.search);
		this._browserHistory = browserHistory;

		this.own(on(window, 'popstate', () => {
			const path = stripBase(base, location.pathname + location.search);

			// Ignore popstate for the current path. Guards against browsers firing
			// popstate on page load, see
			// <https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onpopstate>.
			if (path !== this._current) {
				this._current = path;
				this.emit({
					type: 'change',
					target: this,
					value: path
				});
			}
		}));
	}
}

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

function ensureLeadingSlash(path: string): string {
	return /^\//.test(path) ? path : `/${path}`;
}

export default StateHistory;
