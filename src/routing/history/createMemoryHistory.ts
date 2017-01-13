import compose, { ComposeFactory } from '@dojo/compose/compose';
import createEvented from '@dojo/compose/bases/createEvented';
import WeakMap from '@dojo/shim/WeakMap';

import { History, HistoryOptions } from './interfaces';

/**
 * A memory-backed history manager. Can be used outside of browsers.
 */
export type MemoryHistory = History;

/**
 * Options for creating MemoryHistory instances.
 */
export interface MemoryHistoryOptions extends HistoryOptions {
	/**
	 * The current value is set to the path.
	 */
	path: string;
}

export interface MemoryHistoryFactory extends ComposeFactory<MemoryHistory, MemoryHistoryOptions> {
	/**
	 * Create a new MemoryHistory instance.
	 * @param options Options to use during creation. If not specified the instance sets
	 *   the current value to an empty string.
	 */
	(options?: MemoryHistoryOptions): MemoryHistory;
}

interface PrivateState {
	current: string;
}

const privateStateMap = new WeakMap<MemoryHistory, PrivateState>();

const createMemoryHistory: MemoryHistoryFactory = compose.mixin(createEvented, {
	mixin: {
		get current(this: MemoryHistory) {
			return privateStateMap.get(this).current;
		},

		prefix(path: string) {
			return path;
		},

		set(this: MemoryHistory, path: string) {
			const privateState = privateStateMap.get(this);
			if (privateState.current === path) {
				return;
			}

			privateState.current = path;
			this.emit({
				type: 'change',
				value: path
			});
		},

		replace(this: MemoryHistory, path: string) {
			this.set(path);
		}
	},
	initialize(instance: MemoryHistory, { path: current }: MemoryHistoryOptions = { path: '' }) {
		privateStateMap.set(instance, { current });
	}
});

export default createMemoryHistory;
