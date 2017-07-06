import global from '@dojo/shim/global';
import on from '@dojo/core/on';
import { HistoryBase } from './HistoryBase';
import { History, HistoryOptions } from './interfaces';

/**
 * Options for creating HashHistory instances.
 */
export interface HashHistoryOptions extends HistoryOptions {
	/**
	 * A DOM window object. HashHistory uses the `location` property and
	 * listens to `hashchange` events. The current value is initialized to the
	 * initial hash.
	 */
	window: Window;
}

export class HashHistory extends HistoryBase implements History {
	private _current: string;
	private _browserLocation: Location;

	get current() {
		return this._current;
	}

	constructor({ window }: HashHistoryOptions = { window: global }) {
		super({});

		const { location: browserLocation } = window;

		this._current = browserLocation.hash.slice(1);
		this._browserLocation = browserLocation;

		this.own(on(window, 'hashchange', () => {
			const path = this._normalizePath(browserLocation.hash);

			// Ignore hashchange for the current path. Guards against browsers firing hashchange when the history
			// manager sets the hash.
			if (path !== this._current) {
				this._current = path;
				this.emit({
					type: 'change',
					value: path
				});
			}
		}));
	}

	public prefix(path: string) {
		if (path[0] !== '#') {
			return `#${path}`;
		}
		return path;
	}

	private _normalizePath(path: string): string {
		if (path[0] === '#') {
			path = path.slice(1);
		}
		return path;
	}

	set(path: string) {
		path = this._normalizePath(path);
		if (this._current === path) {
			return;
		}

		this._current = path;
		this._browserLocation.hash = this.prefix(path);
		this.emit({
			type: 'change',
			value: path
		});
	}

	replace(path: string) {
		path = this._normalizePath(path);
		if (this._current === path) {
			return;
		}

		this._current = path;

		const { pathname, search } = this._browserLocation;
		this._browserLocation.replace(pathname + search + this.prefix(path));

		this.emit({
			type: 'change',
			value: path
		});
	}
}

export default HashHistory;
