import { Handle } from 'dojo-core/interfaces';
import Promise from 'dojo-core/Promise';
import { List, Map } from 'immutable';
import { Renderable } from './createRenderable';

export type Child = Renderable & { id?: string };

export interface ChildrenMap<C extends Child> {
	[key: string]: C;
}

export type ChildEntry<C extends Child> = [ string | number, C ];

export interface ChildListEvent<T, C extends Child> {
	children: Map<string, C> | List<C>;
	target: T;
	type: 'childlist';
}

export interface Parent {
	children: Map<string, Child> | List<Child>;
	append(child: Child | Child[]): Handle;
}

/**
 * Registry to (asynchronously) get instances by their ID.
 */
export interface Registry<T> {
	/**
	 * Asynchronously get an instance by its ID.
	 *
	 * @param id Identifier for the instance that is to be retrieved
	 * @return A promise for the instance. The promise rejects if no instance was found.
	 */
	get(id: string | symbol): Promise<T>;

	/**
	 * Look up the identifier for which the given value has been registered.
	 *
	 * Throws if the value hasn't been registered.
	 *
	 * @param value The value
	 * @return The identifier
	 */
	identify(value: T): string | symbol;
}

/**
 * Provides access to read-only registries.
 */
export interface RegistryProvider<T> {
	/**
	 * Get a registry. Different widgets expect different types of registries.
	 *
	 * Implementations should throw if the given type is not supported.
	 */
	get(type: 'actions' | 'stores' | 'widgets'): Registry<T>;
}
