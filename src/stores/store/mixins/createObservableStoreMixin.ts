import createStore, { CrudOptions, Store, StoreOptions, UpdateResults } from '../createStore';
import { Observable, Observer } from 'dojo-core/Observable';
import WeakMap from 'dojo-shim/WeakMap';
import Map from 'dojo-shim/Map';
import Set from 'dojo-shim/Set';
import Promise from 'dojo-shim/Promise';
import { StoreObservable } from '../createStoreObservable';
import { ComposeFactory, ComposeMixinDescriptor } from 'dojo-compose/compose';
import { after } from 'dojo-compose/aspect';
import { Query } from '../../query/interfaces';
import { debounce } from 'dojo-core/util';

export interface StoreDelta<T> {
	/**
	 * Items updated since the last delta
	 */
	updates: T[];
	/**
	 * The IDs of any deleted items
	 */
	deletes: string[];
	/**
	 * New items added since the last delta
	 */
	adds: T[];
	/**
	 * The state of the store before any of these updates.
	 */
	beforeAll: T[];
	/**
	 * The state of the store after all of these updates.  Doesn't necessarily
	 * reflect the current state of the underlying Storage, as it updates the local
	 * storage based on the known updates if fetchAroundUpdates is false
	 */
	afterAll: T[];
}

/**
 * Combines several sequential deltas into a single delta.
 * It performs several checks to remove redundant data.
 * 	- Checks for repeated copies items with the same ID in
 * 	adds and updates, or just the same ID in deletes, and keeps
 * 	only the last.
 * 	- Checks for deletes followed by adds or updates and replaces with a
 * 	single update
 * 	- Checks for adds followed by deletes and removes both
 * 	- Checks for updates followed by deletes and removes the update
 * @param instance The instance that can identify these items
 * @param deltas The deltas to merge
 * @returns The merged delta
 */
export function mergeDeltas<T>(
	instance: { identify(items: T | T[]): string[] },
	...deltas: StoreDelta<T>[]
): StoreDelta<T> {
	const head = deltas[0] || {
			updates: [],
			adds: [],
			deletes: [],
			beforeAll: [],
			afterAll: []
		};

	/**
	 * Takes the last instance of an item repeated in the list
	 * @param items Added or updated items
	 * @returns The added or updated items with repeated items replaced by only the latest version of the item
	 */
	function takeLastItem(items: T[]): T[] {
		const found: { [ index: string ]: boolean} = {};
		const ids = instance.identify(items);
		return items.reverse().filter((_, index) => {
			const id = ids[index];
			const exists = Boolean(found[id]);
			found[id] = true;
			return !exists;
		}).reverse();
	}

	/**
	 * Takes the last instance of an id repeated in the list
	 * @param ids IDs of deleted items
	 * @returns The list with duplicates removed
	 */
	function takeLastId(ids: string[]): string[] {
		const found: { [ index: string ]: boolean} = {};
		return ids.reverse().filter((id) => {
			const exists = Boolean(found[id]);
			found[id] = true;
			return !exists;
		}).reverse();
	}

	/**
	 * Removes updates for items that were later deleted
	 * @param newDeletes Deletes from delta(s) after the updates
	 * @param oldUpdates Updates from delta(s) before the deletes
	 * @return The updates without updates for subsequently deleted items
	 */
	function removeOutdatedItems(newDeletes: string[], oldUpdates: T[]) {
		const deletedIds = newDeletes.reduce((prev, next) => {
			prev.set(next, null);
			return prev;
		}, new Map<string, any>());
		const ids = instance.identify(oldUpdates);
		return oldUpdates.filter((_, index) => {
			return !deletedIds.has(ids[index]);
		});
	}

	/**
	 * Finds cases where an older update has an add, and a newer update has a delete, and removes
	 * both, since the net effect is that the operations are cancelled out
	 * @param newDeletes Deletes form delta(s) after the adds
	 * @param oldAdds Adds from delta(s) before the deletes
	 * @returns An object with the filtered adds and deletes
	 */
	function removeCancellingUpdates(newDeletes: string[], oldAdds: T[]) {
		const deletedIds = newDeletes.reduce((prev, next) => {
			prev.set(next, null);
			return prev;
		}, new Map<string, any>());
		const ids = instance.identify(oldAdds);
		const addIds = ids.reduce((prev, next) => {
			prev.set(next, null);
			return prev;
		}, new Map<string, any>());
		return {
			oldAdds: oldAdds.filter((_, index) => {
				return !deletedIds.has(ids[index]);
			}),
			newDeletes: newDeletes.filter((id) => !addIds.has(id))
		};
	}

	/**
	 * Finds places where an item was deleted and then added or updated, and removes the delete. If the item was added,
	 * the add is also replaced with an update since it should already exist in the collection receiving the updates,
	 * as it will never receive the delete
	 * @param oldDeletes - Deletes from delta(s) before the adds and updates
	 * @param newAdds - Adds from delta(s) after the deletes
	 * @param newUpdates - Updates from delta(s) after the deletes
	 * @returns An object containing the updated deletes, adds, and updates
	 */
	function convertReplacementToUpdate(oldDeletes: string[], newAdds: T[], newUpdates: T[]) {
		const deletes = oldDeletes.reduce((prev, next) => {
			prev.set(next, null);
			return prev;
		}, new Map<string, any>());
		const addIds = instance.identify(newAdds);
		const updateIds = instance.identify(newUpdates);
		const adds = addIds.concat(updateIds).reduce((prev, next) => {
			prev.set(next, null);
			return prev;
		}, new Map<string, any>());
		const updatedUpdates = newUpdates.slice();
		return {
			oldDeletes: oldDeletes.filter((id) => !adds.has(id)),
			newAdds: newAdds.filter((item, index) => {
				const shouldKeep = !deletes.has(addIds[index]);
				if (!shouldKeep) {
					// Always add it to the beginning, because it may have been updated as well, but the add
					// has to have come first.
					updatedUpdates.unshift(item);
				}
				return shouldKeep;
			}),
			newUpdates: updatedUpdates
		};
	}

	if (deltas[1]) {
		const tail = mergeDeltas(instance, ...deltas.slice(1));
		const { oldDeletes, newAdds, newUpdates } = convertReplacementToUpdate(head.deletes, tail.adds, tail.updates);
		const oldUpdates = removeOutdatedItems(tail.deletes, head.updates);
		const { newDeletes, oldAdds } = removeCancellingUpdates(tail.deletes, head.adds);
		return {
			updates: takeLastItem([ ...oldUpdates, ...newUpdates ]),
			adds: takeLastItem([ ...oldAdds, ...newAdds ]),
			deletes: takeLastId([ ...oldDeletes, ...newDeletes ]),
			beforeAll: head.beforeAll,
			afterAll: tail.afterAll
		};
	}
	else {
		return head;
	}
}

/**
 * An update for a single item, used to identify which item an update is for when multiple items are observed
 * simultaneously. Deletes are indicated by the item property being undefined.
 */
export interface ItemUpdate<T> {
	item?: T;
	id: string;
}

export interface ObservableStoreMixin<T> {
	/**
	 * Observe the entire store, receiving deltas indicating the changes to the store.
	 * When observing, an initial update will be sent with the last known state of the store in the `afterAll` property.
	 * If fetchAroundUpdates is true, the store's local data will by synchronized with the underlying Storage.
	 * If fetchAroundUpdates is not true, then the data will be the result of locally applying updates to the data
	 * retrieved from the last fetch.
	 */
	observe(): Observable<StoreDelta<T>>;
	/**
	 * Receives the current state of the item with the specified ID whenever it is updated. This observable will be
	 * completed if the item is deleted
	 * @param id The ID of the item to observe
	 */
	observe(id: string): Observable<T>;
	/**
	 * Receives the current state of the items in an `ItemUpdate` object whenever they are updated. When any of the
	 * items are deleted an `ItemUpdate` with the item's ID and no item property will be sent out. When all of the
	 * observed items are deleted the observable will be completed.
	 * @param ids - The IDS of the items to observe
	 */
	observe(ids: string[]): Observable<ItemUpdate<T>>;
}

export interface ObservableStoreMixinOptions<T> {
	/**
	 * If true, then the local collection will automatically fetch to get the latest data from the store whenver
	 * an update is made.
	 */
	fetchAroundUpdates?: boolean;
	/**
	 * Specifies how long the fetch around updates should be debounced to avoid rapidly fetching when many updates
	 * are made within close proximity. Defaults to 200 milliseconds
	 */
	fetchAroundUpdateDebounce?: number;
}

export type ObserverSetEntry<T> = { observes: Set<string>; observer: Observer<ItemUpdate<T>> };

export interface ObservableStoreState<T> {
	fetchAroundUpdates: boolean;
	/**
	 * A debounced function called to fetch the latest data and send updates to observers after each crud operation,
	 * if fetchAroundUpdates is true.
	 */
	fetchAndSendUpdates: (store: ObservableStore<T, any, any>) => void;
	/**
	 * Maps item IDs to observers for that item, or sets of observers. For Single item observers this is a one-to-many
	 * relationship. For `ObserverSetEntries`, this is a many to many relationship, each item can be observed as a part
	 * of many sets, and each set is linked to all of the items within it.
	 */
	itemObservers: Map<string, (Observer<T> | ObserverSetEntry<T>)[]>;
	/**
	 * All the observers of the store
	 */
	observers: Observer<StoreDelta<T>>[];
	/**
	 * The single observable provided to all observers of the store
	 */
	storeObservable: Observable<StoreDelta<T>>;
	/**
	 * Updates currently waiting to be merged and sent
	 */
	queuedUpdates: StoreDelta<T>[];
	/**
	 * The latest local data
	 */
	localData: T[];
	/**
	 * Maps item IDs to indices in `localData`
	 */
	localIndex: Map<string, number>;
	/**
	 * When `fetchAroundUpdates` is true, this promise is used to wait for the first fetch before sending out initial
	 * updates, since `localData` will be out of date as soon as the fetch completes.
	 */
	initialFetch?: Promise<any>;

	/**
	 * Tracks whether the mixin is currently sending an update, so that items observers are not removed from the
	 * collection is one unsubscribes while they're being iterated through
	 */
	inUpdate?: Promise<any>;
}

export interface ObservableStore<T, O extends CrudOptions, U extends UpdateResults<T>> extends
	ObservableStoreMixin<T>, Store<T, O, U> {}

export type ObservableStoreOptions<T, O extends CrudOptions> = ObservableStoreMixinOptions<T> & StoreOptions<T, O>;

export interface ObservableStoreFactory extends ComposeFactory<ObservableStore<{}, {}, any>, ObservableStoreOptions<{}, {}>> {
	<T extends {}, O extends CrudOptions>(options?: ObservableStoreOptions<T, O>): ObservableStore<T, O, UpdateResults<T>>;
}

const instanceStateMap = new WeakMap<ObservableStoreMixin<any>, ObservableStoreState<any>>();

/**
 * Takes a collection of items and creates a new copy modified according to the provided updates. This can be used to
 * attempt to track updates in the local collection when fetching after each update is disabled.
 * @param store
 * @param state
 * @param data
 * @param update
 * @returns A new collection with the modifications specified by the update
 */
function addUpdateDelete<T, O extends CrudOptions, U extends UpdateResults<T>>(
	store: ObservableStore<T, O, U>,
	state: ObservableStoreState<T>,
	data: T[],
	update: StoreDelta<T>
) {
	const newData = data.slice();
	update.adds.forEach((item) => {
		newData.push(item);
	});

	store.identify(update.updates).forEach((id, index) => {
		if (state.localIndex.has(id)) {
			newData[state.localIndex.get(id)!] = update.updates[index];
		}
		else {
			newData.push(update.updates[index]);
		}
	});

	update.deletes.sort().reverse().forEach((id) => {
		if (state.localIndex.has(id)) {
			newData.splice(state.localIndex.get(id)!, 1);
		}
	});

	return newData;
}

/**
 * Build a map of ids to indices for the provided collection. This requires that the array of IDs is either what
 * the index if for, or that the array of items the IDs represent is in the same order, which is already the case
 * if the IDs were generated using the Store's identify function.
 * @param ids - The IDS to build the index for
 * @returns An index mapping ids to indices
 */
export function buildIndex(ids: string[]): Map<string, number> {
	return ids.reduce((map, id, index) => {
		map.set(id, index);
		return map;
	}, new Map<string, number>());
}

/**
 * Merges the latest queued updates, updates the local data and index based on the latest data,
 * sends out updates to observers, and then removes observers that unsubscribed during the update process from the list
 * of observers. If after is provided, it is assumed that that is the latest data for the store, if it is not provided
 * the local data is updated according to the merged delta and that is used as the new local data.
 * @param store
 * @param after - Optional array of items containing the latest data for the store.
 */
function sendUpdates<T, O extends CrudOptions, U extends UpdateResults<T>>(
	store: ObservableStore<T, O, U>,
	after?: T[]
) {
	const state = instanceStateMap.get(store);
	const storeDelta = mergeDeltas(store, ...state.queuedUpdates.splice(0));
	after = after || addUpdateDelete(store, state, state.localData, storeDelta);

	storeDelta.beforeAll = state.localData;
	storeDelta.afterAll = after;
	state.localData = after;
	state.localIndex = buildIndex(store.identify(after));

	let resolveInUpdate: Function | undefined = undefined;
	state.inUpdate = new Promise((resolve) => {
		resolveInUpdate = resolve;
	});
	state.observers.forEach(function(observer) {
		observer.next(storeDelta);
	});
	resolveInUpdate!();
}

/**
 * Determines whether this is a single observer or a set entry
 * @param observer
 * @returns {boolean}
 */
function isObserverEntry<T>(observer: Observer<T> | ObserverSetEntry<T>): observer is ObserverSetEntry<T> {
	return (<any> observer).observes instanceof Set;
}

/**
 * Determines whether this is a single observer or a set entry
 * @param observer
 * @returns {boolean}
 */
function isObserver<T>(observer: Observer<T> | ObserverSetEntry<T>): observer is Observer<T> {
	return !isObserverEntry(observer);
}

/**
 * Iterates through the provided items and/or IDs and notifies observers. If items is provided, then the
 * observers for that item, and the observers for sets of items that include that are updated. If items is null, then
 * these are delete notifications for observers of multiple items. In this case, no update is sent to individual
 * observers, and observers of sets receive `ItemUpdate` objects with the IDs of the deleted items and an undefined item
 *
 * @param items Items to send updates for, or null if these are delete notifications for item set observers
 * @param ids - IDs of the items, should be in the same order as items
 * @param state
 * @param store
 */
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
			const id = ids[index] || store.identify(after);
			notify(id, after);
		});
	}
	else {
		ids.forEach(function(id) {
			notify(id, undefined);
		});
	}
}

/**
 * Queues the appropriate update and then either starts up a fetch or just triggers sending the updates depending
 * on the `fetchAroundUpdates` property
 * @param state
 * @param store
 * @param updates Updated items
 * @param adds Added items
 * @param deletes Deleted IDs
 */
function sendUpdatesOrFetch<T, O extends CrudOptions, U extends UpdateResults<T>>(
	state: ObservableStoreState<T>,
	store: ObservableStore<T, O, U>,
	updates: T[],
	adds: T[],
	deletes: string[]
) {
	state.queuedUpdates.push({
		updates: updates,
		adds: adds,
		deletes: deletes,
		beforeAll: [],
		afterAll: []
	});
	if (state.fetchAroundUpdates) {
		state.fetchAndSendUpdates(store);
	}
	else {
		sendUpdates(store);
	}
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
							const foundIds = new Set<string>();
							observer.next = after(observer.next, (result: any, itemUpdate: ItemUpdate<T>) => {
								foundIds.add(itemUpdate.id);
								return result;
							});

							self.get(ids).then(function(items: T[]) {
								if (foundIds.size !== ids.length) {
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
				/**
				 * After fetching, sends updates if no query was used. If a custom query was used then the data retrieved
				 * is not indicative of the local data and can't be used. We shouldn't apply the query locally because we
				 * have no knowledge of the underlying storage implementation or the amount of data and it may be too much
				 * data to retrieve or update in memory. If this is the initialFetch, don't update since that update
				 * will be sent to each subscriber at the time of subscription. If we're not sending updates, still set
				 * the local data and index to the newly retrieved data.
				 * @param result
				 * @param query
				 * @returns {Promise<T[]>}
				 */
				fetch(this: ObservableStore<T, O, U>, result: Promise<T[]>, query?: Query<T>) {
					if (!query) {
						result.then((data) => {
							const state = instanceStateMap.get(this);
							if (result !== state.initialFetch) {
								sendUpdates(this, data);
							}
							else {
								state.localData = data;
								state.localIndex = buildIndex(this.identify(data));
							}
						});
					}
					return result;
				},

				/**
				 * After the put is completed, notify the item observers, and then either queue a fetch to send updates
				 * if fetchAroundUpdates is true, or just send updates if not.
				 * @param result
				 * @returns {StoreObservable<T, any>}
				 */
				put(this: ObservableStore<T, O, U>, result: StoreObservable<T, any>) {
					result.then((updatedItems: T[]) => {
						const state = instanceStateMap.get(this);
						notifyItemObservers(updatedItems, [], state, this);
						sendUpdatesOrFetch(state, this, updatedItems, [], []);
					});
					return result;
				},

				/**
				 * After the patch is completed, notify the item observers, and then either queue a fetch to send updates
				 * if fetchAroundUpdates is true, or just send updates if not.
				 * @param result
				 * @returns {StoreObservable<T, any>}
				 */
				patch(this: ObservableStore<T, O, U>, result: StoreObservable<T, U>) {
					result.then((updatedItems: T[]) => {
						const state = instanceStateMap.get(this);
						notifyItemObservers(updatedItems, [], state, this);
						sendUpdatesOrFetch(state, this, updatedItems, [], []);
					});
					return result;
				},

				/**
				 * After the add is completed notify observers. If this is the initial add AND we are fetching around
				 * updates, then the first update to subscribers will already contain this data, since the initial fetch
				 * is performed after the initial add. In this case we do not need to send an update. We can tell this
				 * is the first add because it'll be triggered in the createStore base before the state is created for
				 * this instance in the mixin's initializer
				 * @param result
				 * @returns {StoreObservable<T, U>}
				 */
				add(this: ObservableStore<T, O, U>, result: StoreObservable<T, U>) {
					const isFirstAdd = !instanceStateMap.get(this);

					result.then((addedItems: T[]) => {
						const state = instanceStateMap.get(this);
						if (!isFirstAdd || !state.fetchAroundUpdates) {
							sendUpdatesOrFetch(state, this, [], addedItems, []);
						}
					});
					return result;
				},

				/**
				 * After the items are deleted, notify item set observers of the deletion of one of the items they are
				 * observing, and then complete any observables that need to be completed.
				 * Completing observables is dones as follows
				 * 	- For observers of a single item, just complete the observer
				 * 	- For observers of a set of items
				 * 		- Remove the deleted ID of this item from the set of observed IDs
				 * 		- If there are now no observed IDs for the set, complete the observable
				 * 	- Remove the item observer entry for the deleted ID
				 * @param result
				 * @param ids
				 * @returns {StoreObservable<string, any>}
				 */
				delete(this: ObservableStore<T, O, U>, result: StoreObservable<string, any>, ids: string | string[]) {
					result.then((deleted: string[]) => {
						const state = instanceStateMap.get(this);
						notifyItemObservers(null, deleted, state, this);
						deleted.forEach(function(id: string) {
							if (state.itemObservers.has(id)) {
								state.itemObservers.get(id)!.forEach(function(observerOrEntry) {
									if (isObserver(observerOrEntry)) {
										observerOrEntry.complete();
									}
									else {
										observerOrEntry.observes.delete(id);
										if (!observerOrEntry.observes.size) {
											observerOrEntry.observer.complete();
										}
									}
								});
								state.itemObservers.delete(id);
							}
						});
						sendUpdatesOrFetch(state, this, [], [], deleted);
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
				if (state.initialFetch) {
					state.initialFetch.then(() => {
						observer.next({
							updates: [],
							deletes: [],
							adds: [],
							beforeAll: [],
							afterAll: state.localData
						});
					});
				}
				else {
					observer.next({
						updates: [],
						deletes: [],
						adds: [],
						beforeAll: [],
						afterAll: state.localData
					});
				}
				return () => {
					function remove(observer: Observer<StoreDelta<any>>) {
						state.observers.splice(state.observers.indexOf(observer), 1);
					}
					if (state.inUpdate) {
						state.inUpdate.then(() => {
							remove(observer);
						});
					}
					else {
						remove(observer);
					}
				};
			}.bind(instance));
			const state: ObservableStoreState<T> = {
				fetchAroundUpdates: Boolean(options.fetchAroundUpdates),
				fetchAndSendUpdates: debounce((store: ObservableStore<T, O, U>) => {
					store.fetch();
				}, options.fetchAroundUpdateDebounce || 20),
				itemObservers: itemObservers,
				observers: [],
				storeObservable: storeObservable,
				queuedUpdates: [],
				localData: [],
				localIndex: new Map<string, number>()
			};
			if (options.fetchAroundUpdates) {
				state.initialFetch = instance.fetch();
			}

			instanceStateMap.set(instance, state);
		}
	};
}
export default createObservableStoreMixin;

export const createObservableStore: ObservableStoreFactory = createStore
	.mixin(createObservableStoreMixin());
