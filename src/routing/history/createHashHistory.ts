import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/mixins/createEvented';
import global from 'dojo-core/global';
import on from 'dojo-core/on';
import WeakMap from 'dojo-shim/WeakMap';

import { History, HistoryOptions } from './interfaces';

/**
 * A browser-based history manager that uses the location hash to store the current value.
 */
export type HashHistory = History;

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

interface PrivateState {
	current: string;
	browserLocation: Location;
}

const privateStateMap = new WeakMap<HashHistory, PrivateState>();

const createHashHistory: HashHistoryFactory = compose.mixin(createEvented, {
	mixin: {
		get current(this: HashHistory) {
			return privateStateMap.get(this).current;
		},

		set(this: HashHistory, path: string) {
			const privateState = privateStateMap.get(this);
			if (privateState.current === path) {
				return;
			}

			privateState.current = path;
			privateState.browserLocation.hash = '#' + path;
			this.emit({
				type: 'change',
				value: path
			});
		},

		replace(this: HashHistory, path: string) {
			const privateState = privateStateMap.get(this);
			if (privateState.current === path) {
				return;
			}

			privateState.current = path;

			const { pathname, search } = privateState.browserLocation;
			privateState.browserLocation.replace(pathname + search + '#' + path);

			this.emit({
				type: 'change',
				value: path
			});
		}
	},
	initialize(instance: HashHistory, { window }: HashHistoryOptions = { window: global }) {
		const { location: browserLocation } = window;

		const privateState: PrivateState = {
			current: browserLocation.hash.slice(1),
			browserLocation
		};
		privateStateMap.set(instance, privateState);

		instance.own(on(window, 'hashchange', () => {
			const path = browserLocation.hash.slice(1);

			// Ignore hashchange for the current path. Guards against browsers firing hashchange when the history
			// manager sets the hash.
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

export default createHashHistory;
