import { ComposeFactory } from 'dojo-compose/compose';
import { EventTargettedObject, Handle } from 'dojo-interfaces/core';
import { Destroyable } from 'dojo-interfaces/bases';
import Promise from 'dojo-shim/Promise';
import { List, Map } from 'immutable';
import { VNode } from 'maquette';

export interface Child extends Renderable, Destroyable {
	readonly id: string;

	/**
	 * A reference to the widget's parent
	 */
	parent: Parent | null;
}

/**
 * A type alias that describes an entry in a parent map or list
 */
export type ChildEntry<C extends Child> = [ string | number, C ];

export interface ChildListEvent<T, C extends Child> extends EventTargettedObject<T> {
	children: Map<string, C> | List<C>;
}

export interface ChildrenMap<C extends Child> {
	[child: string]: C;
}

export interface Parent {
	append(child: Child[] | Child): Handle;

	children: Map<string, Child> | List<Child>;

	invalidate?(): void;
}

/**
 * A special type of registry that allows realization of children on a parent
 */
export interface CreatableRegistry<T extends Child> extends Registry<T> {
	/**
	 * Realize a child of the specified parent, returning a promise which resolves with
	 * a tuple that contains the ID and the realized instance.
	 *
	 * @param parent The parent where the realized child should be attached to
	 * @param factory The factory that should be used to realize the child
	 * @param options Any options that should be passed to the factory when realizing the child
	 */
	create<U extends T, O>(factory: ComposeFactory<U, O>, options?: O): Promise<[ string, U ]>;

	/**
	 * Check if the registry constains a widget with the identifier provided.
	 *
	 * @param id Identifier for the instance to check whether exists in the registry.
	 * @return A promise for the result of the has check. The promise resolves to `true` if
	 *   an instance is found and `false` otherwise.
	 */
	has(id: string | symbol): Promise<boolean>;
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
	get<U extends T & Child>(type: 'widgets'): CreatableRegistry<U>;
	get(type: 'actions' | 'stores'): Registry<T>;
	get(type: string): Registry<T>;
}

export interface Renderable {
	/**
	 * Takes no arguments and returns a VNode
	 */
	render(): VNode;

	/**
	 * The tag name to be used
	 */
	tagName: string;
}

export interface RenderFunction {
	(): VNode;
}

export type StylesHash = { [style: string]: string; };
