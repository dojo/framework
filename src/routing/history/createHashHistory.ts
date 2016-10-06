import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/mixins/createEvented';
import global from 'dojo-core/global';
import on from 'dojo-core/on';

import { History, HistoryOptions } from './interfaces';

export interface HashHistoryMixin {
	_current: string;
	_location: Location;
	_onHashchange(path: string): void;
}

/**
 * A browser-based history manager that uses the location hash to store the current value.
 */
export type HashHistory = History & HashHistoryMixin;

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

export interface HashHistoryFactory extends ComposeFactory<HashHistory, HashHistoryOptions> {
	/**
	 * Create a new HashHistory instance.
	 * @param options Options to use during creation. If not specified the instance assumes
	 *   the global object is a DOM window.
	 */
	(options?: HashHistoryOptions): HashHistory;
}

const createHashHistory: HashHistoryFactory = compose({
	// N.B. Set per instance in the initializer
	_current: '',
	_location: {} as Location,

	get current (this: HashHistory) {
		return this._current;
	},

	set (this: HashHistory, path: string) {
		this._current = path;
		this._location.hash = '#' + path;
		this.emit({
			type: 'change',
			value: path
		});
	},

	replace (this: HashHistory, path: string) {
		this._current = path;

		const { pathname, search } = this._location;
		this._location.replace(pathname + search + '#' + path);

		this.emit({
			type: 'change',
			value: path
		});
	},

	_onHashchange (this: HashHistory, path: string) {
		this._current = path;
		this.emit({
			type: 'change',
			value: path
		});
	}
}).mixin({
	mixin: createEvented,
	initialize(instance: HashHistory, { window }: HashHistoryOptions = { window: global }) {
		const { location } = window;
		instance._current = location.hash.slice(1);
		instance._location = location;

		instance.own(on(window, 'hashchange', () => {
			instance._onHashchange(location.hash.slice(1));
		}));
	}
});

export default createHashHistory;
