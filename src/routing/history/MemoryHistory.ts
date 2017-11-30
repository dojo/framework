import { HistoryBase } from './HistoryBase';
import { History, HistoryOptions } from './interfaces';

/**
 * Options for creating MemoryHistory instances.
 */
export interface MemoryHistoryOptions extends HistoryOptions {
	/**
	 * The current value is set to the path.
	 */
	path: string;
}

/**
 * A memory-backed history manager. Can be used outside of browsers.
 */
export class MemoryHistory extends HistoryBase implements History {
	private _current: string;

	get current() {
		return this._current;
	}

	constructor({ path: current }: MemoryHistoryOptions = { path: '' }) {
		super();
		this._current = current;
	}

	prefix(path: string) {
		return path;
	}

	set(path: string) {
		if (this._current === path) {
			return;
		}

		this._current = path;
		this.emit({
			type: 'change',
			target: this,
			value: path
		});
	}

	replace(path: string) {
		this.set(path);
	}
}

export default MemoryHistory;
