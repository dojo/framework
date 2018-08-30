import { History, HistoryOptions, OnChangeFunction } from './../interfaces';

export class MemoryHistory implements History {
	private _onChangeFunction: OnChangeFunction;
	private _current = '/';
	private _previous = '';

	constructor({ onChange }: HistoryOptions) {
		this._onChangeFunction = onChange;
		this._onChange();
	}

	public prefix(path: string) {
		return path;
	}

	public set(path: string) {
		if (this._current === path) {
			return;
		}
		this._previous = this._current;
		this._current = path;
		this._onChange();
	}

	public replace(path: string) {
		this.set(path);
	}

	public get current(): string {
		return this._current;
	}

	public get previous(): string {
		return this._previous;
	}

	private _onChange() {
		this._onChangeFunction(this._current);
	}
}

export default MemoryHistory;
