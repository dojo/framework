import global from '@dojo/shim/global';
import { History as HistoryInterface, HistoryOptions, OnChangeFunction } from './../interfaces';

export class StateHistory implements HistoryInterface {
	private _current: string;
	private _onChangeFunction: OnChangeFunction;
	private _window: Window;
	private _base: string;

	constructor({ onChange, window = global.window, base = '/' }: HistoryOptions) {
		if (/(#|\?)/.test(base)) {
			throw new TypeError("base must not contain '#' or '?'");
		}
		this._onChangeFunction = onChange;
		this._window = window;
		this._base = base;
		this._current = this._window.location.pathname + this._window.location.search;
		this._window.addEventListener('popstate', this._onChange, false);
		this._onChange();
	}

	public prefix(path: string) {
		const baseEndsWithSlash = /\/$/.test(this._base);
		const pathStartsWithSlash = /^\//.test(path);
		if (baseEndsWithSlash && pathStartsWithSlash) {
			return this._base + path.slice(1);
		} else if (!baseEndsWithSlash && !pathStartsWithSlash) {
			return `${this._base}/${path}`;
		} else {
			return this._base + path;
		}
	}

	public set(path: string) {
		const value = ensureLeadingSlash(path);
		this._window.history.pushState({}, '', this.prefix(value));
		this._onChange();
	}

	public get current(): string {
		return this._current;
	}

	private _onChange = () => {
		const value = stripBase(this._base, this._window.location.pathname + this._window.location.search);
		if (this._current === value) {
			return;
		}
		this._current = value;
		this._onChangeFunction(this._current);
	};
}

function stripBase(base: string, path: string): string {
	if (base === '/') {
		return path;
	}

	if (path.indexOf(base) === 0) {
		return ensureLeadingSlash(path.slice(base.length));
	} else {
		return '/';
	}
}

function ensureLeadingSlash(path: string): string {
	if (path[0] !== '/') {
		return `/${path}`;
	}
	return path;
}

export default StateHistory;
