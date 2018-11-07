import global from '../../shim/global';
import { History as HistoryInterface, HistoryOptions, OnChangeFunction } from './../interfaces';

const trailingSlash = new RegExp(/\/$/);
const leadingSlash = new RegExp(/^\//);

function stripBase(base: string, path: string): string {
	if (base === '/') {
		return path;
	}

	if (path.indexOf(base) === 0) {
		return path.slice(base.length - 1);
	}
	return '/';
}

export class StateHistory implements HistoryInterface {
	private _current: string;
	private _onChangeFunction: OnChangeFunction;
	private _window: Window;
	private _base: string;

	constructor({ onChange, window = global.window, base = global.__public_path__ || '/' }: HistoryOptions) {
		if (/(#|\?)/.test(base)) {
			throw new TypeError("base must not contain '#' or '?'");
		}
		this._onChangeFunction = onChange;
		this._window = window;
		this._base = base;
		if (!trailingSlash.test(this._base)) {
			this._base = `${this._base}/`;
		}
		if (!leadingSlash.test(this._base)) {
			this._base = `/${this._base}`;
		}
		this._window.addEventListener('popstate', this._onChange, false);
		this._onChange();
	}

	public prefix(path: string) {
		if (path[0] === '#') {
			path = path.slice(1);
		}
		if (path[0] === '/') {
			path = path.slice(1);
		}
		return `${this._base}${path}`;
	}

	public set(path: string) {
		this._window.history.pushState({}, '', this.prefix(stripBase(this._base, path)));
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

export default StateHistory;
