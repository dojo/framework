import { CrudOptions, Store, StoreOptions, UpdateResults } from '../createStore';
import { Observable, Observer } from 'dojo-core/Observable';
import WeakMap from 'dojo-shim/WeakMap';
import Map from 'dojo-shim/Map';
import Set from 'dojo-shim/Set';
import Promise from 'dojo-shim/Promise';
import { StoreObservable } from '../createStoreObservable';
import { SubcollectionStore } from '../createSubcollectionStore';
import { ComposeMixinDescriptor } from 'dojo-compose/compose';
import { after } from 'dojo-compose/aspect';

export interface StoreDelta<T> {
	updates: T[];
	deletes: string[];
	adds: T[];
	beforeAll?: T[];
	afterAll?: T[];
}

export interface ItemUpdate<T> {
	item?: T;
	id: string;
}

export interface ObservableStoreMixin<T> {
	observe(): Observable<StoreDelta<T>>;
	observe(id: string): Observable<T>;
	observe(ids: string[]): Observable<ItemUpdate<T>>;
}

export interface ObservableStoreMixinOptions<T> {
	fetchAroundUpdates?: boolean;
	scheduleUpdates?: (delta: StoreDelta<T>, sendUpdates: () => void) => void;
}

export type ObserverSetEntry<T> = { observes: Set<string>; observer: Observer<ItemUpdate<T>> };

export interface ObservableStoreState<T> {
	fetchAroundUpdates: boolean;
	itemObservers: Map<string, (Observer<T> | ObserverSetEntry<T>)[]>;
	toRemoveIndices: number[];
	observers: Observer<StoreDelta<T>>[];
	storeObservable: Observable<StoreDelta<T>>;
	updates: T[];
	deletes: string[];
	adds: T[];
	beforeAll?: T[];
	scheduleUpdates: (delta: StoreDelta<T>, sendUpdates: () => void) => void;
}

export interface ObservableStore<T, O extends CrudOptions, U extends UpdateResults<T>> extends
	ObservableStoreMixin<T>, Store<T, O, U> {}
export type ObservableStoreOptions<T, O extends CrudOptions> = ObservableStoreMixinOptions<T> & StoreOptions<T, O>;

const instanceStateMap = new WeakMap<ObservableStoreMixin<any>, ObservableStoreState<any>>();

function sendUpdates<T, O extends CrudOptions, U extends UpdateResults<T>>(
	this: ObservableStore<T, O, U>,
	after: Promise<T[] | undefined>
) {
	const state = instanceStateMap.get(this);
	function send(after?: T[]) {
		const storeDelta: StoreDelta<T> = {
			updates: state.updates.splice(0),
			deletes: state.deletes.splice(0),
			adds: state.adds.splice(0),
			beforeAll: state.beforeAll,
			afterAll: after
		};
		state.beforeAll = after;
		state.observers.forEach(function(observer: Observer<StoreDelta<T>>) {
			observer.next(storeDelta);
		});

		state.toRemoveIndices.splice(0).sort().reverse().forEach(function(removeIndex: number) {
			state.observers.splice(removeIndex, 1);
		});
	}
	after.then(function(data?: T[]) {
		send(data);
	});
}

function isObserverEntry<T>(observer: Observer<T> | ObserverSetEntry<T>): observer is ObserverSetEntry<T> {
	return (<any> observer).observes instanceof Set;
}

function isObserver<T>(observer: Observer<T> | ObserverSetEntry<T>): observer is Observer<T> {
	return !isObserverEntry(observer);
}

function notifyItemObservers<T, O extends CrudOptions, U extends UpdateResults<T>>(
	items: T[] | null,
	ids: string[],
	state: ObservableStoreState<T>,
	store: ObservableStore<T, O, U>
) {
	function notify(id: string, after?: T) {
		if (state.itemObservers.has(id)) {
			state.itemObservers.get(id)!.map(function(observerOrEntry): Observer<ItemUpdate<T>> | null {
				if (isObserverEntry(observerOrEntry)) {
					return observerOrEntry.observer;
				}
				else {
					return null;
				}
			}).filter(function(observerEntry) {
				return observerEntry;
			}).forEach(function(observer: Observer<ItemUpdate<T>>) {
				observer.next({
					item: after,
					id: id
				});
			});
			if (after) {
				state.itemObservers.get(id)!.map(function(observerOrEntry): Observer<T> | null {
					if (isObserver(observerOrEntry)) {
						return observerOrEntry;
					}
					else {
						return null;
					}
				}).filter(function(observer) {
					return observer;
				}).forEach(function(observer: Observer<T>) {
					observer.next(after);
				});
			}
		}
	}
	if (items) {
		items.forEach(function(after: T, index: number) {
			const id = ids[index] || store.identify(after)[0];
			notify(id, after);
		});
	}
	else {
		ids.forEach(function(id) {
			notify(id, undefined);
		});
	}
}

function isSubcollectionStore(store: any): store is SubcollectionStore<any, any, any, any> {
	return Boolean(store.createSubcollection);
}

function createObservableStoreMixin<T, O extends CrudOptions, U extends UpdateResults<T>>(): ComposeMixinDescriptor<
	Store<T, O, U>,
	CrudOptions,
	ObservableStoreMixin<T>,
	ObservableStoreMixinOptions<T>
> {
	return 	{
		mixin: {
			observe(this: ObservableStore<T, O, U>, idOrIds?: string | string[]): any {
				if (isSubcollectionStore(this)) {
					const subcollectionStore = <SubcollectionStore<any, any, any, any>> <any> this;
					if (subcollectionStore.source) {
						return subcollectionStore.source.observe(idOrIds);
					}
				}
				if (idOrIds) {
					const self = <ObservableStore<T, O, U>> this;
					const state = instanceStateMap.get(self);
					if (Array.isArray(idOrIds)) {
						const ids = <string[]> idOrIds;

						const idSet = new Set<string>(ids);
						const observable = new Observable<ItemUpdate<T>>(function subscribe(observer: Observer<ItemUpdate<T>>) {
							const observerEntry: ObserverSetEntry<T> = {
								observes: idSet,
								observer: observer
							};
							ids.forEach(function(id: string) {
								if (state.itemObservers.has(id)) {
									state.itemObservers.get(id)!.push(observerEntry);
								}
								else {
									state.itemObservers.set(id, [observerEntry]);
								}
							});
							let isStarted = false;
							observer.next = after(observer.next, (result: any) => {
								isStarted = true;
								return result;
							});
							observer.error = after(observer.error, (result: any) => {
								isStarted = true;
								return result;
							});
							observer.complete = after(observer.complete, (result: any) => {
								isStarted = true;
								return result;
							});

							self.get(ids).then(function(items: T[]) {
								if (!isStarted) {
									const retrievedIdSet = new Set<string>(self.identify(items));
									let missingItemIds = ids.filter(id => !retrievedIdSet.has(id));

									if (retrievedIdSet.size !== idSet.size || missingItemIds.length) {
										observer.error(new Error(`ID(s) "${missingItemIds}" not found in store`));
									}
									else {
										items.forEach((item, index) => observer.next({
											item: item,
											id: ids[index]
										}));
									}
								}
							});
						});
						return observable;
					}
					else {
						const id = <string> idOrIds;
						return new Observable<T>(function subscribe(observer: Observer<T>) {
							self.get(id).then(function(item: T) {
								if (!item) {
									observer.error(new Error(`ID "${id}" not found in store`));
								}
								else {
									if (state.itemObservers.has(id)) {
										state.itemObservers.get(id)!.push(observer);
									}
									else {
										state.itemObservers.set(id, [ observer ]);
									}
									observer.next(item);
								}
							});
						});
					}
				}
				else {
					return instanceStateMap.get(this).storeObservable;
				}
			}
		},
		aspectAdvice: {
			after: {
				put(this: ObservableStore<T, O, U>, result: StoreObservable<T, any>) {
					const self = this;
					const state = instanceStateMap.get(self);

					let fetchedDataPromise: Promise<T[] | undefined>;
					if (state.fetchAroundUpdates) {
						fetchedDataPromise = self.fetch();
					}
					else {
						fetchedDataPromise = Promise.resolve(undefined);
					}
					result.then(function(updatedItems: T[]) {
						notifyItemObservers(updatedItems, [], state, self);
						state.updates = state.updates.concat(updatedItems);
						state.scheduleUpdates(state, sendUpdates.bind(self, fetchedDataPromise));
					});
					return result;
				},

				patch(this: ObservableStore<T, O, U>, result: StoreObservable<T, U>) {
					const self = this;
					const state = instanceStateMap.get(self);

					let fetchedDataPromise: Promise<T[] | undefined>;
					if (state.fetchAroundUpdates) {
						fetchedDataPromise = self.fetch();
					}
					else {
						fetchedDataPromise = Promise.resolve(undefined);
					}
					result.then(function(updatedItems: T[]) {
						notifyItemObservers(updatedItems, [], state, self);
						state.updates = state.updates.concat(updatedItems);
						state.scheduleUpdates(state, sendUpdates.bind(self, fetchedDataPromise));
					});
					return result;
				},

				add(this: ObservableStore<T, O, U>, result: StoreObservable<T, U>) {
					const self = this;
					const state = instanceStateMap.get(self);
					if (state) {
						let fetchedDataPromise: Promise<T[] | undefined>;
						if (state.fetchAroundUpdates) {
							fetchedDataPromise = self.fetch();
						}
						else {
							fetchedDataPromise = Promise.resolve(undefined);
						}

						result.then(function(addedItems: T[]) {
							notifyItemObservers(addedItems, [], state, self);
							state.adds = state.adds.concat(addedItems);
							state.scheduleUpdates(state, sendUpdates.bind(self, fetchedDataPromise));
						});
					}
					return result;
				},

				delete(this: ObservableStore<T, O, U>, result: StoreObservable<string, any>, ids: string | string[]) {
					const self = this;
					const state = instanceStateMap.get(self);

					let fetchedDataPromise: Promise<T[] | undefined>;
					if (state.fetchAroundUpdates) {
						fetchedDataPromise = self.fetch();
					}
					else {
						fetchedDataPromise = Promise.resolve(undefined);
					}

					result.then(function(deleted: string[]) {
						notifyItemObservers(null, deleted, state, self);
						deleted.forEach(function(id: string) {
							if (state.itemObservers.has(id)) {
								state.itemObservers.get(id)!.forEach(function(observerOrEntry) {
									if (isObserverEntry(observerOrEntry)) {
										observerOrEntry.observes.delete(id);
										if (!observerOrEntry.observes.size) {
											observerOrEntry.observer.complete();
										}
									}
									else if (isObserver(observerOrEntry)) {
										observerOrEntry.complete();
									}
								});
								state.itemObservers.delete(id);
							}
						});
						state.deletes = state.deletes.concat(deleted);
						state.scheduleUpdates(state, sendUpdates.bind(self, fetchedDataPromise));
					});
					return result;
				}
			}
		},
		initialize<T, O extends CrudOptions, U extends UpdateResults<T>>(instance: ObservableStore<T, O, U>, options?: ObservableStoreOptions<T, O>) {
			options = options || {};
			const itemObservers = new Map<string, (Observer<T> | ObserverSetEntry<T>)[]>();
			const storeObservable = new Observable<StoreDelta<T>>(function(this: ObservableStoreMixin<T>, observer: Observer<StoreDelta<T>>) {
				const state = instanceStateMap.get(this);
				state.observers.push(observer);
				return () => {
					return state.toRemoveIndices.push(state.observers.indexOf(observer));
				};
			}.bind(instance));
			const state: ObservableStoreState<T> = {
				fetchAroundUpdates: Boolean(options.fetchAroundUpdates),
				scheduleUpdates: options.scheduleUpdates || function(storeDelta: StoreDelta<T>, sendUpdates: () => void) {
					sendUpdates();
				},
				itemObservers: itemObservers,
				toRemoveIndices: [],
				observers: [],
				storeObservable: storeObservable,
				updates: [],
				deletes: [],
				adds: []
			};
			if (options.fetchAroundUpdates) {
				instance.fetch().then(function(data) {
					state.beforeAll = data;
				});
			}

			if (isSubcollectionStore(instance)) {
				const subcollectionStore = <SubcollectionStore<any, any, any, any>> <any> instance;
				subcollectionStore.getOptions = after(subcollectionStore.getOptions, function(options?: { fetchAroundUpdates?: boolean }) {
					options = options || {};
					options.fetchAroundUpdates = state.fetchAroundUpdates;

					return options;
				});
			}

			instanceStateMap.set(instance, state);
		}
	};
}
export default createObservableStoreMixin;
