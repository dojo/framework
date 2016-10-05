import { ComposeFactory } from 'dojo-compose/compose';
import { Actionable, EventedListenersMap, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, StatefulOptions, StateChangeEvent } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import Map from 'dojo-shim/Map';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import { Registry, RegistryProvider } from './interfaces';

export type ListenerOrArray = string | symbol | (string | symbol)[];

export interface ListenersMap {
	[type: string]: ListenerOrArray;
}

export interface StatefulListenersState {
	listeners?: ListenersMap;
}

export interface StatefulListenersOptions<S extends StatefulListenersState> extends StatefulOptions<S> {
	registryProvider?: RegistryProvider<Actionable<TargettedEventObject>>;
}

export type StatefulListeners<S extends StatefulListenersState> = Stateful<S>;

export interface StatefulListenersMixinFactory extends ComposeFactory<Stateful<StatefulListenersState>, StatefulListenersOptions<StatefulListenersState>> {
	(options?: StatefulListenersOptions<StatefulListenersState>): Stateful<StatefulListenersState>;
}

// Use generics to avoid annoying repetition of the Actionable<TargettedEventObject> type.
type ResolvedListeners<T> = [T[], undefined] | [undefined, Promise<T[]>];
function carriesValue<T>(result: ResolvedListeners<T>): result is [T[], undefined] {
	return result[0] !== undefined;
}

type MixedResultOverride<T> = {
	// Property on the array to track whether it contains promises, which makes the withoutPromises() type
	// guard possible.
	containsPromises?: boolean;
	// These seem to need to be redeclared. Declared them as narrowly as possible for the actual usage below.
	push(result: T[]): number;
	push(result: Promise<T[]>): number;
};
type MixedResults<T> = (T[][] | (T[] | Promise<T[]>)[]) & MixedResultOverride<T>;
function withoutPromises<T>(mixed: MixedResults<T>): mixed is T[][] & MixedResultOverride<T> {
	return mixed.containsPromises !== true;
}

/**
 * Internal function that resolves listeners from the registry and then attaches them to the instance
 *
 * @param registry The action registry that contains the listeners to resolve
 * @param cache The cache of already resolved listeners
 * @param ref The reference to resolve
 */
function resolveListeners<T>(
	registry: Registry<T>,
	cache: Map<string | symbol, T>,
	ref: ListenerOrArray
): ResolvedListeners<T> {
	if (Array.isArray(ref)) {
		const mixed: MixedResults<T> = [];
		for (const item of ref) {
			const result = resolveListeners<T>(registry, cache, item);
			if (carriesValue(result)) {
				mixed.push(result[0]);
			}
			else {
				mixed.containsPromises = true;
				mixed.push(result[1]);
			}
		}

		const flattened: T[] = [];
		if (withoutPromises(mixed)) {
			return [flattened.concat(...mixed), undefined];
		}

		return [
			undefined,
			Promise.all(mixed)
				.then((results) => flattened.concat(...results))
		];
	}

	if (cache.has(ref)) {
		return [[<T> cache.get(ref)], undefined];
	}

	return [
		undefined,
		registry.get(ref)
			.then((action) => {
				cache.set(ref, action);
				return [action];
			})
	];
}

interface ManagementState {
	/**
	 * A cache of actions that are already resolved
	 */
	cache?: Map<string | symbol, Actionable<TargettedEventObject>>;

	/**
	 * A generation marker to be able to deal with conflicts
	 */
	generation?: number;

	/**
	 * A reference to a destruction handle to remove listeners
	 */
	handle?: Handle;

	/**
	 * A reference to the action registry which should resolve named actions
	 */
	registry: Registry<Actionable<TargettedEventObject>>;
}

/**
 * Map that holds state for manageListeners by widget instance.
 */
const managementMap = new WeakMap<StatefulListeners<StatefulListenersState>, ManagementState>();

/**
 * Internal statechange listener which replaces the listeners on the instance.
 */
function manageListeners(evt: StateChangeEvent<StatefulListenersState>): void {
	const widget: StatefulListeners<StatefulListenersState> = <any> evt.target;

	// Assume this function cannot be called without the widget being in the management map.
	const internalState = managementMap.get(widget);
	// Initialize cache.
	const { cache = new Map<string | symbol, Actionable<TargettedEventObject>>() } = internalState;
	if (!internalState.cache) {
		internalState.cache = cache;
	}
	// Increment the generation vector. Used when listeners are replaced asynchronously to ensure
	// no newer state is overriden.
	const generation = internalState.generation = (internalState.generation || 0) + 1;

	// Unsetting listeners causes previous listeners to be removed.
	const listeners: ListenersMap = evt.state.listeners || {};
	// Resolve the actions, create a listeners map that is compatible with widget.on()
	const eventTypes = Object.keys(listeners);

	const newListeners: EventedListenersMap = {};
	// `promise` will be undefined if all actions are resolved synchronously
	const promise = eventTypes.reduce<Promise<void> | undefined>((promise, eventType) => {
		const result = resolveListeners<Actionable<TargettedEventObject>>(internalState.registry, cache, listeners[eventType]);
		if (carriesValue(result)) {
			newListeners[eventType] = result[0];
			return promise;
		}

		return result[1].then((value) => {
			newListeners[eventType] = value;
			return promise;
		});
	}, undefined);

	const replaceListeners = () => {
		// Only replace listeners if there is no newer state that either already has, or soon will,
		// replace the original listeners.
		if (internalState.generation !== generation) {
			return;
		}

		if (internalState.handle) {
			internalState.handle.destroy();
		}
		internalState.handle = widget.on(newListeners);
	};

	if (promise) {
		promise
			.then(replaceListeners)
			.catch((error) => {
				widget.emit({
					type: 'error',
					target: widget,
					error
				});
			});
	} else {
		replaceListeners();
	}
}

const createStatefulListenersMixin: StatefulListenersMixinFactory = createStateful
	.mixin({
		initialize(instance: StatefulListeners<any>, { registryProvider, state }: StatefulListenersOptions<any> = {}) {
			if (registryProvider) {
				const registry = registryProvider.get('actions');
				managementMap.set(instance, { registry });

				instance.own(instance.on('statechange', manageListeners));

				/* Stateful will have already fired the statechange event at this point */
				if (state) {
					instance.setState(state);
				}
			}
		}
});

export default createStatefulListenersMixin;
