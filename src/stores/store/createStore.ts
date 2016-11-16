import { Query } from '../query/interfaces';
import { Patch, PatchMapEntry } from '../patch/createPatch';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import Map from 'dojo-shim/Map';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { Observer, Observable } from 'rxjs/Rx';
import createStoreObservable, { StoreObservable } from './createStoreObservable';
import createInMemoryStorage, { Storage } from '../storage/createInMemoryStorage';

export const enum StoreOperation {
	Add,
	Put,
	Patch,
	Delete
}

export interface StoreOptions<T, O extends CrudOptions> {
	data?: T[];
	idProperty?: string;
	idFunction?: (item: T) => string;
	storage?: Storage<T, O>;
}

export interface CrudOptions {
	rejectOverwrite?: boolean;
	id?: string;
}

export type CrudArgument<T> = T | string | PatchMapEntry<T, T>;

export interface UpdateResults<T> {
	currentItems?: T[];
	failedData?: CrudArgument<T>[];
	successfulData: T[] | string[];
	type: StoreOperation;
}

export type PatchArgument<T> = Map<string, Patch<T, T>> | { id: string; patch: Patch<T, T> } | { id: string; patch: Patch<T, T> }[];

export interface Store<T, O extends CrudOptions, U extends UpdateResults<T>> {
	get(ids: string[] | string): Promise<T[]>;
	identify(items: T[] | T): string[];
	createId(): Promise<string>;
	add(items: T[] | T, options?: O): StoreObservable<T, U>;
	put(items: T[] | T, options?: O): StoreObservable<T, U>;
	patch(updates: PatchArgument<T>, options?: O): StoreObservable<T, U>;
	delete(ids: string[] | string): StoreObservable<string, U>;
	fetch(): Promise<T[]>;
	fetch<U>(query?: Query<T, U>): Promise<U[]>;
}

export interface StoreFactory extends ComposeFactory<Store<{}, {}, any>, StoreOptions<{}, {}>> {
	<T extends {}, O extends CrudOptions>(options?: StoreOptions<T, O>): Store<T, O, UpdateResults<T>>;
}

interface BaseStoreState<T, O, U> {
	storage: Storage<T, O>;
	initialAddPromise: Promise<any>;
}

const instanceStateMap = new WeakMap<Store<{}, {}, any>, BaseStoreState<{}, {}, any>>();

const createStore: StoreFactory = compose<Store<{}, {}, any>, StoreOptions<{}, {}>>({
	get(this: Store<{}, {}, any>, ids: string[] | string): Promise<{}[]> {
		const state = instanceStateMap.get(this);
		return state.initialAddPromise.then(function() {
			return state.storage.get(Array.isArray(ids) ? ids : [ ids ]);
		});

	},

	add(this: Store<{}, {}, any>, items: {}[] | {}, options?: CrudOptions) {
		const self = this;
		const state = instanceStateMap.get(self);
		const storeResultsPromise = state.initialAddPromise.then(function() {
			return state.storage.add(Array.isArray(items) ? items : [ items ], options);
		});
		// TODO refactoring - repetitive logic
		return createStoreObservable(
			new Observable<UpdateResults<{}>>(function subscribe(observer: Observer<UpdateResults<{}>>) {
				storeResultsPromise
					.then(function(results) {
						observer.next(results);
						observer.complete();
					}, function(error) {
						observer.error(error);
					});
			}),
			function(results: UpdateResults<{}>) {
				return results.successfulData;
			}
		);
	},

	put(this: Store<{}, {}, any>, items: {}[] | {}, options?: CrudOptions) {
		const self = this;
		const state = instanceStateMap.get(self);
		const storeResultsPromise = state.initialAddPromise.then(function() {
			return state.storage.put(Array.isArray(items) ? items : [ items ], options);
		});

		return createStoreObservable(
			new Observable<UpdateResults<{}>>(function subscribe(observer: Observer<UpdateResults<{}>>) {
				storeResultsPromise
					.then(function(results) {
						observer.next(results);
						observer.complete();
					}, function(error) {
						observer.error(error);
					});
			}),
			function(results: UpdateResults<{}>) {
				return results.successfulData;
			}
		);
	},

	patch(this: Store<{}, {}, any>, updates: PatchArgument<{}>, options?: CrudOptions) {
		const self = this;
		const state = instanceStateMap.get(self);
		let patchEntries: PatchMapEntry<{}, {}>[] = [];
		if (Array.isArray(updates)) {
			patchEntries = updates;
		}
		else if (updates instanceof Map) {
			updates.forEach(function(value, key) {
				patchEntries.push({
					id: key,
					patch: value
				});
			});
		}
		else {
			patchEntries = [ updates ];
		}
		const storeResultsPromise = state.initialAddPromise.then(function() {
			return state.storage.patch(patchEntries);
		});

		return createStoreObservable(
			new Observable<UpdateResults<{}>>(function subscribe(observer: Observer<UpdateResults<{}>>) {
				storeResultsPromise
					.then(function(results) {
						observer.next(results);
						observer.complete();
					}, function(error) {
						observer.error(error);
					});
			}),
			function(results: UpdateResults<{}>) {
				return results.successfulData;
			}
		);
	},

	delete(this: Store<{}, {}, any>, ids: string | string[]) {
		const self = this;
		const state = instanceStateMap.get(self);
		const storeResultsPromise = state.initialAddPromise.then(function() {
			return state.storage.delete(Array.isArray(ids) ? ids : [ ids ]);
		});

		return createStoreObservable(
			new Observable<UpdateResults<{}>>(function subscribe(observer: Observer<UpdateResults<{}>>) {
				storeResultsPromise
					.then(function(results) {
						observer.next(results);
						observer.complete();
					}, function(error) {
						observer.error(error);
					});
			}),
			function(results: UpdateResults<{}>) {
				return results.successfulData;
			}
		);
	},

	fetch<U>(this: Store<{}, {}, any>, query?: Query<{}, U>) {
		const state = instanceStateMap.get(this);
		return state.initialAddPromise.then(function() {
			return state.storage.fetch(query);
		});
	},

	identify(this: Store<{}, {}, any>, items: {}[] | {}) {
		return instanceStateMap.get(this).storage.identify(Array.isArray(items) ? items : [ items ]);
	},

	createId(this: Store<{}, {}, any>) {
		return instanceStateMap.get(this).storage.createId();
	}
}, <T, O extends CrudOptions>(instance: Store<T, O, UpdateResults<T>>, options: StoreOptions<T, O>) => {
	options = options || {};
	const data: T[] | undefined = options.data;
	options.data = undefined;
	const instanceState: BaseStoreState<T, O, UpdateResults<T>> = {
		storage: options.storage || createInMemoryStorage(options),
		initialAddPromise: Promise.resolve()
	};
	instanceStateMap.set(instance, instanceState);
	if (data) {
		instanceState.initialAddPromise = instance.add(data).then(null, () => {});
	}

});

export default createStore;
