import Map from 'dojo-shim/Map';
import WeakMap from 'dojo-shim/WeakMap';
import { Iterable, IterableIterator } from 'dojo-shim/iterator';
import { Handle } from 'dojo-interfaces/core';
import 'dojo-shim/Symbol';
import List from './List';

const noop = () => { };

interface Entry<V> {
	readonly handle: Handle;
	readonly value: V;
}

interface State<V> {
	readonly entryMap: Map<Identity, Entry<V>>;
	readonly idMap: WeakMap<V, Identity>;
}

const privateStateMap = new WeakMap<IdentityRegistry<any>, State<any>>();

function getState<V>(instance: IdentityRegistry<V>): State<V> {
	return privateStateMap.get(instance);
}

/**
 * Registry identities can be strings or symbols. Note that the empty string is allowed.
 */
export type Identity = string | symbol;

/**
 * A registry of values, mapped by identities.
 */
export default class IdentityRegistry<V extends Object> implements Iterable<[Identity, V]> {
	constructor() {
		privateStateMap.set(this, {
			entryMap: new Map<Identity, Entry<V>>(),
			idMap: new WeakMap<V, Identity>()
		});
	}

	/**
	 * Look up a value by its identifier.
	 *
	 * Throws if no value has been registered for the given identifier.
	 *
	 * @param id The identifier
	 * @return The value
	 */
	get(id: Identity): V {
		const entry = getState<V>(this).entryMap.get(id);
		if (!entry) {
			throw new Error(`Could not find a value for identity '${id.toString()}'`);
		}

		return entry.value;
	}

	/**
	 * Determine whether the value has been registered.
	 * @param value The value
	 * @return `true` if the value has been registered, `false` otherwise
	 */
	contains(value: V): boolean {
		return getState<V>(this).idMap.has(value);
	}

	/**
	 * Remove from the registry the value for a given identifier.
	 * @param id The identifier
	 * @return `true` if the value was removed, `false` otherwise
	 */
	delete(id: Identity): boolean {
		const entry = getState<V>(this).entryMap.get(id);
		if (!entry) {
			return false;
		}

		entry.handle.destroy();
		return true;
	}

	/**
	 * Determine whether a value has been registered for the given identifier.
	 * @param id The identifier
	 * @return `true` if a value has been registered, `false` otherwise
	 */
	has(id: Identity): boolean {
		return getState<V>(this).entryMap.has(id);
	}

	/**
	 * Look up the identifier for which the given value has been registered.
	 *
	 * Throws if the value hasn't been registered.
	 *
	 * @param value The value
	 * @return The identifier otherwise
	 */
	identify(value: V): Identity {
		if (!this.contains(value)) {
			throw new Error('Could not identify non-registered value');
		}

		return getState<V>(this).idMap.get(value);
	}

	/**
	 * Register a new value with a new identity.
	 *
	 * Throws if a different value has already been registered for the given identity,
	 * or if the value has already been registered with a different identity.
	 *
	 * @param id The identifier
	 * @param value The value
	 * @return A handle for deregistering the value. Note that when called repeatedly with
	 *   the same identifier and value combination, the same handle is returned
	 */
	register(id: Identity, value: V): Handle {
		const entryMap = getState<V>(this).entryMap;
		const existingEntry = entryMap.get(id);
		if (existingEntry && existingEntry.value !== value) {
			const str = id.toString();
			throw new Error(`A value has already been registered for the given identity (${str})`);
		}

		const existingId = this.contains(value) ? this.identify(value) : null;
		if (existingId && existingId !== id) {
			const str = (<Identity> existingId).toString();
			throw new Error(`The value has already been registered with a different identity (${str})`);
		}

		// Adding the same value with the same id is a noop, return the original handle.
		if (existingEntry && existingId) {
			return existingEntry.handle;
		}

		const handle = {
			destroy: () => {
				handle.destroy = noop;
				getState<V>(this).entryMap.delete(id);
			}
		};

		entryMap.set(id, { handle, value });
		getState<V>(this).idMap.set(value, id);

		return handle;
	}

	entries(): IterableIterator<[Identity, V]> {
		const values = new List<[Identity, V]>();

		getState<V>(this).entryMap.forEach((value: Entry<V>, key: Identity) => {
			values.add([key, value.value]);
		});

		return values.values();
	}

	values(): IterableIterator<V> {
		const values = new List<V>();

		getState<V>(this).entryMap.forEach((value: Entry<V>, key: Identity) => {
			values.add(value.value);
		});

		return values.values();
	}

	ids(): IterableIterator<Identity> {
		return getState<V>(this).entryMap.keys();
	}

	[Symbol.iterator](): IterableIterator<[Identity, V]> {
		return this.entries();
	}
};
