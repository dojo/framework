import createStore, { StoreOptions, CrudOptions, Store, PatchArgument } from './createStore';
import { UpdateResults } from '../storage/createInMemoryStorage';
import { ComposeFactory } from 'dojo-compose/compose';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import { StoreObservable } from './createStoreObservable';
import { Query } from '../query/createQuery';
import { mixin } from 'dojo-core/lang';

export interface SubcollectionOptions<T, O extends CrudOptions, U extends UpdateResults<T>> extends StoreOptions<T, O> {
	source?: Store<T, O, U>;
}

interface SubcollectionState<T, O extends CrudOptions, U extends UpdateResults<T>> {
	source?: Store<T, O, U>;
	factory: Function;
}

const instanceStateMap = new WeakMap<SubcollectionStore<{}, {}, any, any>, SubcollectionState<{}, {}, any>>();

/**
 * This type is primarily intended for consumption by other mixins that require knowledge of a store's
 * source, e.g. querying/tracking.
 */
export interface SubcollectionStore<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> extends Store<T, O, U> {
	createSubcollection(options?: {}): C & this;
	readonly source: (C & this) | undefined;
	readonly factory: (options: O) => (C & this) | undefined;
	getOptions(): SubcollectionOptions<T, O, U>;
}

export interface SubcollectionFactory extends ComposeFactory<SubcollectionStore<{}, {}, any, SubcollectionStore<{}, {}, any, any>>, SubcollectionOptions<{}, {}, any>> {
	<T extends {}, O extends CrudOptions>(options?: SubcollectionOptions<T, O, UpdateResults<T>>): SubcollectionStore<T, O, UpdateResults<T>, Store<T, O, UpdateResults<T>>>;
}

const createSubcollectionStore: SubcollectionFactory = createStore
	.extend({
		get source(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>) {
			const state = instanceStateMap.get(this);
			return state && state.source;
		},

		get factory(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>) {
			const state = instanceStateMap.get(this);
			return state && state.factory;
		},

		createSubcollection(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, options?: {}) {
			// Need to reassign the factory or compose throws an error for instantiating
			// with new
			const factory = this.factory;
			const defaultOptions = this.getOptions();
			return factory(mixin(defaultOptions, options || {}));
		},

		getOptions(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>): SubcollectionOptions<{}, {}, any> {
			return {
				source: this.source || this,
				// Provide something to prevent the Subcollection from instantiating its own storage. The type doesn't
				// matter because it'll never be used.
				storage: <any> true
			};
		}
	}).mixin({
		initialize<T, O extends CrudOptions, U extends UpdateResults<T>>(
			instance: SubcollectionStore<T, O, U, Store<{}, {}, any>>,
			options?: SubcollectionOptions<T, O, U>) {
			options = options || {};
			instanceStateMap.set(instance, {
				source: options.source,
				factory: instance.constructor
			});
		},
		aspectAdvice: {
			around: {
				get(get: (ids: string | string[]) => Promise<{}[]>) {
					return function(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, ids: string | string[]) {
						if (this.source) {
							return this.source.get(ids);
						}
						else {
							return get.call(this, ids);
						}
					};
				},

				add(add: (items: {} | {}[], options?: CrudOptions) => StoreObservable<{}, any>) {
					return function(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, items: {} | {}[], options?: CrudOptions) {
						if (this.source) {
							return this.source.add(items, options);
						}
						else {
							return add.call(this, items, options);
						}
					};
				},

				delete(_delete: (ids: string | string[]) => Promise<string[]>) {
					return function(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, ids: string | string[]) {
						if (this.source) {
							return this.source.delete(ids);
						}	 else {
							return _delete.call(this, ids);
						}
					};
				},

				put(put: (items: {} | {}[], options?: CrudOptions) => StoreObservable<{}, any>) {
					return function(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, items: {} | {}[], options?: CrudOptions) {
						if (this.source) {
							return this.source.put(items, options);
						}
						else {
							return put.call(this, items, options);
						}
					};
				},

				patch(patch: (updates: PatchArgument<{}>, options?: CrudOptions) => StoreObservable<{}, any>) {
					return function(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, updates: PatchArgument<{}>, options?: CrudOptions) {
						if (this.source) {
							return this.source.patch(updates, options);
						}
						else {
							return patch.call(this, updates, options);
						}
					};
				},

				fetch(fetch: (query?: Query<{}, {}>) => Promise<{}[]>) {
					return function(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, query?: Query<{}, {}>) {
						if (this.source) {
							return this.source.fetch(query);
						}
						else {
							return fetch.call(this, query);
						}
					};
				},

				identify(identify: (items: {} | {}[]) => string[]) {
					return function(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, items: {} | {}[]) {
						if (this.source) {
							return this.source.identify(items);
						}
						else {
							return identify.call(this, items);
						}
					};
				},

				createId(createId: () => Promise<string>) {
					return function(this: SubcollectionStore<{}, {}, any, Store<{}, {}, any>>, items: {} | {}[]) {
						if (this.source) {
							return this.source.createId();
						}
						else {
							return createId.call(this);
						}
					};
				}
			}
		}
	});

export default createSubcollectionStore;
