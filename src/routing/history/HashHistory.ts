import global from '../../shim/global';
import { History, HistoryOptions, OnChangeFunction } from './../interfaces';

export class HashHistory implements History {
	private _onChangeFunction: OnChangeFunction;
	private _current = '/';
	private _window: Window;

	constructor({ window = global.window, onChange }: HistoryOptions) {
		this._onChangeFunction = onChange;
		this._window = window;
	}

	public start() {
		this._window.addEventListener('hashchange', this._onChange, false);
		this._current = this.normalizePath(this._window.location.hash);
		this._onChangeFunction(this._current);
	}

	public normalizePath(path: string): string {
		return path.replace('#', '');
	}

	public prefix(path: string) {
		if (path[0] !== '#') {
			return `#${path}`;
		}
		return path;
	}

	public set(path: string) {
		this._window.location.hash = this.prefix(path);
		this._onChange();
	}

	public replace(path: string) {
		const { pathname, search } = this._window.location;
		this._window.location.replace(pathname + search + this.prefix(path));
		this._onChange();
	}

	public get current(): string {
		return this._current;
	}

	public destroy() {
		this._window.removeEventListener('hashchange', this._onChange);
	}

	private _onChange = () => {
		const path = this.normalizePath(this._window.location.hash);
		if (path !== this._current) {
			this._current = path;
			this._onChangeFunction(this._current);
		}
	};
}

export default HashHistory;
