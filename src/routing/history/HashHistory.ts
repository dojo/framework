import global from '../../shim/global';
import { History, HistoryOptions, OnChangeFunction } from './../interfaces';

export class HashHistory implements History {
	private _onChangeFunction: OnChangeFunction;
	private _current: string;
	private _previous = '';
	private _window: Window;

	constructor({ window = global.window, onChange }: HistoryOptions) {
		this._onChangeFunction = onChange;
		this._window = window;
		this._window.addEventListener('hashchange', this._onChange, false);
		this._current = this.normalizePath(this._window.location.hash);
		this._onChangeFunction(this._current);
	}

	public normalizePath(path: string): string {
		return path.replace('#', '');
	}

	public replace(path: string) {
		this._window.history.replaceState(undefined, '', this.prefix(path));
	}

	public prefix(path: string) {
		if (path[0] !== '#') {
			return `#${path}`;
		}
		return path;
	}

	public set(path: string) {
		this._window.location.hash = this.prefix(path);
	}

	public get current(): string {
		return this._current;
	}

	public get previous(): string {
		return this._previous;
	}

	public destroy() {
		this._window.removeEventListener('hashchange', this._onChange);
	}

	private _onChange = () => {
		const requestPath = this.normalizePath(this._window.location.hash);
		if (requestPath === this._current) {
			return;
		}
		this._previous = this._current;
		this._current = this.normalizePath(this._window.location.hash);
		this._onChangeFunction(this._current);
	};
}

export default HashHistory;
