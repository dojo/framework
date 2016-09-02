import { OrderedMap, Map } from 'immutable';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { assign } from 'dojo-core/lang';
import Promise, { isThenable } from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable, { Destroyable } from 'dojo-compose/mixins/createDestroyable';

let uid = 0;

/**
 * Return a UID
 */
function getUID(): string {
	return (1e9 * Math.random() >>> 0) + String(uid++);
}

export type StoreIndex = number | string;

export interface MemoryStorePragma {
	/**
	 * The identity of the object
	 */
	id?: StoreIndex;

	/**
	 * Should the item be replaced if already exists.
	 */
	replace?: boolean;
}

export interface MemoryStorePromise<T> extends Promise<T> {
	/**
	 * Retrieve an object from the store based on the object's ID
	 * @param id The ID of the object to retrieve
	 */
	get(id: StoreIndex): MemoryStorePromise<T>;

	/**
	 * Put an item in the object store.
	 * @param item The item to put
	 * @param options The pragma to use when putting the object
	 */
	put(item: T, options?: MemoryStorePragma): MemoryStorePromise<T>;

	/**
	 * Add an item to the object store.
	 * @param add The item to add
	 * @param options The pragma to use when adding the object
	 */
	add(item: T, options?: MemoryStorePragma): MemoryStorePromise<T>;

	/**
	 * Patch an object in the store by providing a partial object.  The result will be a promise
	 * that resolves with the patched object.
	 * @param partial The partial object to patch the existing object with
	 * @param options The pragma to use when patching the object
	 */
	patch(partial: any, options?: MemoryStorePragma): MemoryStorePromise<T>;

	/**
	 * Remove an object from the store.
	 * @param id The ID of the object to remove
	 * @param item The object to remove
	 */
	delete(id: StoreIndex): MemoryStorePromise<boolean>;
	delete(item: T): MemoryStorePromise<boolean>;

	/**
	 * Set the stores objects to an array
	 */
	fromArray(items: T[]): MemoryStorePromise<void>;
}

export interface MemoryStoreOptions<T extends Object> {
	/**
	 * Any initial data that should populate the store
	 */
	data?: T[];

	/**
	 * The property of each object to use as the identity for the object
	 */
	idProperty?: StoreIndex;
}

export const enum ChangeTypes {
	Add = 1,
	Put,
	Patch,
	Delete
}

export interface ChangeRecord<T extends Object> {
	type: ChangeTypes;
	id: StoreIndex;
	target?: T;
}

export interface MemoryStoreMixin<T extends Object> {
	/**
	 * The property that determines the ID of the object (defaults to `id`)
	 */
	idProperty: StoreIndex;

	/**
	 * Retrieve an object from the store based on the object's ID
	 * @param id The ID of the object to retrieve
	 */
	get(id: StoreIndex): MemoryStorePromise<T>;

	/**
	 * Observe an object, any subsequent changes to the object can also be observed via the observable
	 * interface that is returned.  If the object is not present in the store, the observation will be
	 * immediatly completed.  If the object is deleted from the store, the observation will be completed
	 * @param id The ID of the object to observe
	 */
	observe(id: StoreIndex): Observable<T>;
	observe(): Observable<ChangeRecord<T>>;

	/**
	 * Put an item in the object store.
	 * @param item The item to put
	 * @param options The pragma to use when putting the object
	 */
	put(item: T, options?: MemoryStorePragma): MemoryStorePromise<T>;

	/**
	 * Add an item to the object store.
	 * @param add The item to add
	 * @param options The pragma to use when adding the object
	 */
	add(item: T, options?: MemoryStorePragma): MemoryStorePromise<T>;

	/**
	 * Patch an object in the store by providing a partial object.  The result will be a promise
	 * that resolves with the patched object.
	 * @param partial The partial object to patch the existing object with
	 * @param options The pragma to use when patching the object
	 */
	patch(partial: any, options?: MemoryStorePragma): MemoryStorePromise<T>;

	/**
	 * Remove an object from the store.
	 * @param id The ID of the object to remove
	 * @param item The object to remove
	 */
	delete(id: StoreIndex): MemoryStorePromise<boolean>;
	delete(item: T): MemoryStorePromise<boolean>;

	/**
	 * Set the stores objects to an array
	 */
	fromArray(items: T[]): MemoryStorePromise<void>;
}

export type MemoryStore<T extends Object> = MemoryStoreMixin<T> & Destroyable;

/**
 * The weak map that contains the data for the stores
 */
const dataWeakMap = new WeakMap<MemoryStore<Object>, OrderedMap<StoreIndex, Object>>();

/**
 * The weak map that contains any observers for the stores
 */
const itemObserverWeakMap = new WeakMap<MemoryStore<Object>, Map<StoreIndex, Observer<Object>[]>>();

// const storeObserverWeakMap = new WeakMap<MemoryStore<Object>, Observer<ChangeRecord<Object>>[]>();

export interface MemoryStoreFactory extends ComposeFactory<MemoryStore<Object>, MemoryStoreOptions<Object>> {
	<T extends Object>(options?: MemoryStoreOptions<T>): MemoryStore<T>;

	/**
	 * Creates a memory store from an array of objects
	 * @params data The array of data to create the memory store from
	 */
	fromArray<T extends Object>(data: T[]): MemoryStore<T>;
}

/**
 * The methods to decorate the MemoryStorePromise with
 */
const storeMethods = [ 'get', 'put', 'add', 'patch', 'delete', 'fromArray' ];

/**
 * Utility function that takes a result and generates a MemoryStorePromise
 * @param store The store to use as a reference when decorating the Promise
 * @param result The result to wrap, if Thenable, it will be decorated, otherwise a new Promise is created
 */
function wrapResult<R>(store: MemoryStore<Object>, result: R): MemoryStorePromise<R> {
	/* TODO: this all seems pretty expensive, there has to be a better way */
	const p = (isThenable(result) ? result : Promise.resolve(result)) as MemoryStorePromise<R>;
	storeMethods.forEach((method) => {
		(<any> p)[method] = (...args: any[]) => {
			return p.then(() => {
				return (<any> store)[method].apply(store, args);
			});
		};
	});
	return p;
}

/**
 * Utility function that takes an error and generates a rejected MemoryStorePromise
 * @param store The store to use as a reference when decorating the Promise
 * @param result The result to wrap
 */
function wrapError(store: MemoryStore<Object>, result: Error): MemoryStorePromise<Object> {
	const p = (isThenable(result) ? result : Promise.reject(result)) as MemoryStorePromise<Object>;
	storeMethods.forEach((method) => {
		(<any> p)[method] = (...args: any[]) => {
			return p.then(() => {
				return (<any> store)[method].apply(store, args);
			});
		};
	});
	return p;
}

/**
 * Create a new instance of a MemoryStore
 */
const createMemoryStore = compose<MemoryStoreMixin<Object>, MemoryStoreOptions<Object>>({
		idProperty: 'id',

		get(this: MemoryStore<Object>, id: StoreIndex): MemoryStorePromise<Object> {
			const data = dataWeakMap.get(this);
			return wrapResult(this, data && data.get(String(id)));
		},

		observe<T>(this: MemoryStore<Object>, id?: StoreIndex): Observable<T> {
			if (id) {
				return new Observable<T>((observer: Observer<T>) => {
					this.get(String(id)).then((item: T) => {
						if (item) {
							observer.next(item);
							const observers = itemObserverWeakMap.get(this);
							const observerArray: Observer<Object>[] = observers && observers.has(String(id)) ? observers.get(String(id)) : [];
							observerArray.push(observer);
							itemObserverWeakMap.set(this, (observers ? observers : Map<StoreIndex, Observer<Object>[]>()).set(String(id), observerArray));
						}
						else {
							observer.error(new Error(`ID "${id}" not found in store`));
						}
					});
				});
			}
			else {
				return new Observable<T>(function subscribe(observer: Observer<T>) {
					//
				});
			}
		},

		put(this: MemoryStore<Object>, item: { [property: string]: number | string; }, options?: MemoryStorePragma): MemoryStorePromise<Object> {
			const data = dataWeakMap.get(this);
			const idProperty = this.idProperty;
			const id =  options && 'id' in options
				? options.id
				: idProperty in item
					? item[idProperty]
					: getUID();
			if (options && options.replace === false && data && data.has(String(id))) {
				return wrapError(this, Error(`Duplicate ID "${id}" when pragma "replace" is false`));
			}
			item[idProperty] = id;
			dataWeakMap.set(this, (data ? data : OrderedMap<StoreIndex, Object>()).set(String(id), item));

			const observers = itemObserverWeakMap.get(this);
			if (observers && observers.has(String(id))) {
				observers.get(String(id)).forEach((observer) => observer.next(item));
			}
			return wrapResult(this, item);
		},

		add(this: MemoryStore<Object>, item: Object, options?: MemoryStorePragma): MemoryStorePromise<Object> {
			return this.put(item, assign(options ? options : {}, { replace: false }));
		},

		patch(this: MemoryStore<Object>, partial: { [property: string]: number | string; }, options?: MemoryStorePragma): MemoryStorePromise<Object> {
			const idProperty = this.idProperty;
			const id = options && 'id' in options ? options.id : partial[idProperty];
			if (!id) {
				return wrapError(this, new Error(`Object ID must either be passed in "partial.${idProperty}" or "options.id"`));
			}
			return wrapResult(this, this.get(id).then((item) => {
				options = options || {};
				options.id = id;
				return this.put(assign(item || {}, partial), options);
			}));
		},

		delete(this: MemoryStore<Object>, item: StoreIndex | { [property: string]: number | string; }): MemoryStorePromise<boolean> {
			const store: MemoryStore<Object> = this;

			/**
			 * Complete any observers associated with this items id
			 */
			function completeObservable(id: StoreIndex) {
				const observers = itemObserverWeakMap.get(store);
				if (observers && observers.has(String(id))) {
					observers.get(String(id)).forEach((observer) => observer.complete());
					itemObserverWeakMap.set(store, observers.delete(id));
				}
			}

			const idProperty = store.idProperty;
			const data = dataWeakMap.get(store);
			if (typeof item === 'object') {
				if (idProperty in item && data && data.has(String(item[idProperty]))) {
					dataWeakMap.set(store, data.delete(String(item[idProperty])));
					completeObservable(item[idProperty]);
					return wrapResult(store, true);
				}
			}
			else {
				if (data && data.has(String(item))) {
					dataWeakMap.set(store, data.delete(String(item)));
					completeObservable(item);
					return wrapResult(store, true);
				}
			}
			return wrapResult(store, false);
		},
		fromArray(this: MemoryStore<Object>, items: Object[]): MemoryStorePromise<void> {
			const store: MemoryStore<Object> = this;
			const map: Object = {};
			const idProperty = store.idProperty;
			items.forEach((item: { [prop: string]: StoreIndex }, idx: number) => {
				const id = idProperty in item ? item[idProperty] : idx;
				item[idProperty] = id;
				(<any> map)[id] = item;
			});
			dataWeakMap.set(store, OrderedMap<StoreIndex, Object>(map));
			return wrapResult(store, undefined);
		}
	}, (instance, options) => {
		if (options) {
			if (options.idProperty) {
				instance.idProperty = options.idProperty;
			}
			if (options.data) {
				instance.fromArray(options.data);
			}
		}
	})
	.mixin(createDestroyable)
	.static({
		fromArray(data: any[]): MemoryStore<any> {
			return createMemoryStore({ data });
		}
	}) as MemoryStoreFactory;

export default createMemoryStore;
