import { ObservableStore, ItemUpdate, StoreDelta, mergeDeltas, buildIndex } from './mixins/createObservableStoreMixin';
import { Query, QueryType } from '../query/interfaces';
import { Observable, Observer } from 'dojo-core/Observable';
import { Patch } from '../patch/createPatch';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import createFilter, { Filter } from '../query/createFilter';
import createRange, { StoreRange } from '../query/createStoreRange';
import createSort, { Sort } from '../query/createSort';
import createCompoundQuery from '../query/createCompoundQuery';
import Promise from 'dojo-shim/Promise';
import Map from 'dojo-shim/Map';
import Set from 'dojo-shim/Set';
import WeakMap from 'dojo-shim/WeakMap';
import { debounce } from 'dojo-core/util';
import { isFilter, isSort } from './mixins/createQueryTransformMixin';

export interface TrackableStoreDelta<T> extends StoreDelta<T> {
	/**
	 * Contains info for any items that were formerly in the tracked collection and are now not, regardless of how
	 * those items were removed
	 */
	removedFromTracked: { item: T; id: string; previousIndex: number; }[];
	/**
	 * Contains info for any items that are now in the tracked collection and formerly were not, regardless of how
	 * those items were added
	 */
	addedToTracked: { item: T; id: string; index: number; }[];
	/**
	 * Contains info were previously and still are in the tracked collection but have changed position, regardless of
	 * how the items were moved.
	 */
	movedInTracked: { item: T; id: string; previousIndex: number; index: number }[];
}

/**
 * Checks if this is a tracked update or not
 * @param storeDelta
 * @returns {Boolean}
 */
function isTracked<T>(storeDelta: StoreDelta<T>): storeDelta is TrackableStoreDelta<T> {
	const tracked = <TrackableStoreDelta<T>> storeDelta;
	return Boolean(tracked.removedFromTracked || tracked.addedToTracked || tracked.movedInTracked);
}

/**
 * Describes a transformation
 */
export type TransformationDescriptor<T, F> = {
	transformation: Patch<F, T> | ((item: F) => T);  idTransform?: string | ((item: T) => string)
};

/**
 * If this function is 'mapped'(Items can be identified), and it contains only transformations and incremental queries,
 * then we can update it in place, assuming that we are notified about all changes and are starting from the correct
 * data.
 * @param queriesAndTransforms
 * @param result
 * @returns {boolean|boolean}
 */
function canUpdateInPlace(
	queriesAndTransforms: Array<Query<any> | TransformationDescriptor<any, any>>,
	result: QueryTransformResult<any, any>
) {
	return isMapped(result) && queriesAndTransforms.every((queryOrTransformation) =>
		!isQuery(queryOrTransformation) || Boolean(queryOrTransformation.incremental)
	);
}

export interface QueryTransformState<T, S extends ObservableStore<any, any, any>> {
	/**
	 * Queries and transformations for this query transform result
	 */
	queriesAndTransformations: Array<Query<any> | TransformationDescriptor<any, any>>;
	/**
	 * Tracks whether we can modify the local collection in place or need to fetch to get the correct state after an
	 * update
	 */
	canUpdateInPlace: boolean;
	/**
	 * Tracks whether we're tracking this collection
	 */
	isTracking?: boolean;
	/**
	 * Optional value that indicates the amount of time to debounce the fetch called after receiving an update.
	 */
	trackingFetchDelay?: number;
	/**
	 * A debounced function that just delegates to the instance's fetch method
	 * @param instance
	 */
	fetchAndSendUpdates: (instance: QueryTransformResult<T, S>) => void;
	/**
	 * The store this query transform result comes from
	 */
	source: S;
	/**
	 * The observable that observers of this query transform result will be provided
	 */
	observable: Observable<StoreDelta<T>>;
	/**
	 * Observers of this query transform result
	 */
	observers: Observer<StoreDelta<T>>[];
	/**
	 * The local copy of the data for this view
	 */
	localData: T[];
	/**
	 * Updates ready to be send after the next fetch
	 */
	queuedUpdate?: StoreDelta<T>;
	/**
	 * Keeps track of new item IDs as updates are being queued
	 */
	currentUpdateIndex: Set<string>;
	/**
	 * Promise tracking the initial fetch if we are tracking and are not fetchingAroundUpdates
	 */
	initialFetch?: Promise<T[]>;
	/**
	 * Is the parent store fetching around updates
	 * If the parent store is fetching around updates, we will always have the latest superset of this view's data in
	 * the updates it receives locally. In that case, even if actively tracking, no additional fetches need to be
	 * performed, the local queries and transformations can just be applied to the new data directly.
	 */
	fetchAroundUpdates: boolean;
	/**
	 * Maps IDs to indices in localDAta
	 */
	localIndex: Map<string, number>;

	/**
	 * Handle to the subscription to the source store
	 */
	sourceHandle?: Promise<{ unsubscribe: Function }>;

	inUpdate?: Promise<any>;
}

export interface QueryTransformOptions<T, S extends ObservableStore<any, any, any>> {
	queriesAndTransformations: Array<Query<T> | TransformationDescriptor<T, any>>;
	source: S;
	isTracking?: boolean;
	trackingFetchDelay?: number;
	fetchAroundUpdates: boolean;
}

export interface QueryTransformResult<T, S extends ObservableStore<any, any, any>> {
	query(query: Query<T>): this;
	filter(filter: Filter<T>): this;
	filter(test: (item: T) => boolean): this;
	range(range: StoreRange<T>): this;
	range(start: number, count: number): this;
	sort(sort: Sort<T> | ((a: T, b: T) => number) | string, descending?: boolean): this;
	observe(): Observable<StoreDelta<T>>;
	observe(id: string): Observable<T>;
	observe(ids: string[]): Observable<ItemUpdate<T>>;
	get(ids: string | string[]): Promise<T[]>;
	transform<V>(transformation: Patch<T, V> | ((item: T) => V)): QueryTransformResult<V, S>;
	transform<V>(transformation: Patch<T, V> | ((item: T) => V), idTransform: string | ((item: V) => string)): MappedQueryTransformResult<V, S>;
	fetch(query?: Query<T>): Promise<T[]>;
	source: S;
}

export interface MappedQueryTransformResult<T, S extends ObservableStore<any, any, any>> extends QueryTransformResult<T, S> {
	/**
	 * Starts actively tracking this view, such that any time updates are made, this will fetch if necessary to make
	 * sure it has the latest data.
	 */
	track(): TrackedQueryTransformResult<T, S>;
	identify(items: T[]): string[];
	identify(item: T): string;
	identify(items: T | T[]): string | string[];
	observe(): Observable<TrackableStoreDelta<T>>;
	/**
	 * These overrides aren't actually changing the signature, they are just necessary to make typescript happy about
	 * the override of the no arg signature for observe
	 */
	observe(id: string): Observable<T>;
	observe(ids: string[]): Observable<ItemUpdate<T>>;
}

export interface TrackedQueryTransformResult<T, S extends ObservableStore<any, any, any>> extends MappedQueryTransformResult<T, S> {
	/**
	 * Create a new query transform result that is not tracking the source store but represents the same queries and
	 * transforms
	 */
	release(): MappedQueryTransformResult<T, S>;
}

/**
 * Check if this is a 'mapped' query transform result
 * @param queryTransformResult
 * @returns {boolean}
 */
function isMapped(
	queryTransformResult: QueryTransformResult<any, any>
): queryTransformResult is MappedQueryTransformResult<any, any> {
	return typeof (<MappedQueryTransformResult<any, any>> queryTransformResult).track === 'function';
}

/**
 * Check if this is a patch or just a transform function
 * @param transform
 * @returns {boolean}
 */
function isPatch<F, T>(transform: Patch<F, T> | ((item: F) => T)): transform is Patch<F, T> {
	return typeof transform !== 'function';
}

/**
 * Checks if this is a query or a transformations descriptor
 * @param queryOrTransformation
 * @returns {boolean}
 */
function isQuery<T, F>(queryOrTransformation: Query<T> | TransformationDescriptor<T, F>): queryOrTransformation is Query<T> {
	const asTransformation = queryOrTransformation as TransformationDescriptor<T, F>;
	const asQuery = queryOrTransformation as Query<T>;
	return !asTransformation.transformation && !asTransformation.idTransform && typeof asQuery.apply === 'function';
}

/**
 * Checks if this is a query or a transformations descriptor
 * @param queryOrTransformation
 * @returns {boolean}
 */
function isTransformation(queryOrTransformation: Query<any> | TransformationDescriptor<any, any>): queryOrTransformation is TransformationDescriptor<any, any> {
	const asTransformation = queryOrTransformation as TransformationDescriptor<any, any>;
	const asQuery = queryOrTransformation as Query<any>;
	return asTransformation.transformation && typeof asQuery.apply !== 'function';
}

/**
 * Applies only the transformations in the queries and transformations array to the provided item(s). Useful for
 * converting an item from its original shape to the transformed shape when querying is not needed (e.g. for observing
 * individual items).
 * @param queriesAndTransformations
 * @param item An item or an array of items
 * @returns The transformed item or items
 */
function transformData(
	queriesAndTransformations: Array<Query<any> | TransformationDescriptor<any, any>>,
	item: any | any[]
) {
	function transformSingleItem(item: any) {
		return queriesAndTransformations
			.reduce((prev, next) => {
				if (isTransformation(next)) {
					const transform = next.transformation;
					return isPatch(transform) ? transform.apply(prev) : transform(prev);
				}
				else {
					return prev;
				}
			}, item);
	}
	if (Array.isArray(item)) {
		return item.map(transformSingleItem);
	}
	else {
		return transformSingleItem(item);
	}
}

/**
 * Pulls the item out of an `ItemUpdate` object and then delegates to `transformData` to transform it before creating
 * a new `ItemUpdate` with the modified data.
 * @param queriesAndTransformations
 * @param update
 * @returns A new `ItemUpdate` with any transformations applied
 */
function transformItemUpdate<T, F>(
	queriesAndTransformations: Array<Query<T> | TransformationDescriptor<T, F>>,
	update: ItemUpdate<T>
) {
	return {
		id: update.id,
		item: update.item ? transformData(queriesAndTransformations, update.item) : update.item
	};
}

/**
 * Compares the latest data to the previous local data to build the change records for a TrackedStoreDelta. Delegates
 * to `sendUpdate` to actually send the update to observers.
 * @param state
 * @param instance
 * @param newData
 * @param newIndex
 * @param update
 */
function sendTrackedUpdate<T, S extends ObservableStore<any, any, any>>(
	state: QueryTransformState<T, S>,
	instance: MappedQueryTransformResult<T, S>,
	newData: T[],
	newIndex: Map<string, number>,
	update: StoreDelta<T>) {
	const removedFromTracked: { item: T; id: string; previousIndex: number; }[] = [];
	const addedToTracked: { item: T; id: string; index: number; }[] = [];
	const movedInTracked: { item: T; id: string; previousIndex: number; index: number }[] = [];

	const updateMap = instance.identify(update.updates).reduce((prev, next, index) => {
		prev.set(next, update.updates[index]);
		return prev;
	}, new Map<string, T>());
	// Check updates for removals first as it will have the latest data for items moved out of
	// the tracked collection.
	updateMap.forEach((item, id) => {
		if (!newIndex.has(id) && state.localIndex.has(id)) {
			removedFromTracked.push({
				item: item,
				id: id,
				previousIndex: state.localIndex.get(id)!
			});
		}
	});
	// Handle removals and moves
	state.localIndex.forEach((previousIndex, id) => {
		if (!newIndex.has(id) && !updateMap.has(id)) {
			removedFromTracked.push({
				item: state.localData[previousIndex],
				id: id,
				previousIndex: previousIndex
			});
		}
		else if (state.localIndex.get(id) !== newIndex.get(id)) {
			const index = newIndex.get(id)!;
			movedInTracked.push({
				item: newData[index],
				id: id,
				index: index,
				previousIndex: previousIndex
			});
		}
	});

	// Handle additions
	newIndex.forEach((index, id) => {
		if (!state.localIndex.has(id)) {
			addedToTracked.push({
				item: newData[index],
				id: id,
				index: index
			});
		}
	});

	const trackedUpdate: TrackableStoreDelta<T> = {
		updates: update.updates,
		adds: update.adds,
		deletes: update.deletes,
		removedFromTracked: removedFromTracked,
		movedInTracked: movedInTracked,
		addedToTracked: addedToTracked,
		beforeAll: update.beforeAll,
		afterAll: update.afterAll
	};

	sendUpdate(state, trackedUpdate);
}

/**
 * Sends the update if it actually represents any change in the data, and then removes observers that unsubscribed
 * from the list.
 * @param state
 * @param update
 */
function sendUpdate<T, S extends ObservableStore<any, any, any>>(
	state: QueryTransformState<T, S>,
	update: StoreDelta<T>
) {
	// Don't send an update if nothing happened
	if (update.deletes.length || update.updates.length || update.adds.length || (
			isTracked(update) && (
				update.movedInTracked.length || update.addedToTracked.length || update.removedFromTracked.length
			)
	)) {
		let resolveInUpdate: Function | undefined = undefined;
		state.inUpdate = new Promise((resolve) => {
			resolveInUpdate = resolve;
		});
		state.observers.forEach(function(observer) {
			observer.next(update);
		});
		resolveInUpdate!();
	}
}

/**
 * Applies all of the provided queries and transformations to the data, with some optional changes
 *  - If the instance and state are provided, then the localIndex will be checked and any items in it will be kept
 * 	  even if they would be otherwise eliminated by a filter. This is used specifically for updates, since if an item
 * 	  no longer satisifies the filters but is in the local index that means it has been modified and as a result removed
 * 	  from the tracked filter. We still want to have access to the new data for inclusion in the `removedFromTracked`
 * 	  update so that the user sees how the item changed to be removed from the collection.
 *  - If `ignoreSorts` is true, then sorts are not applied. This is useful for just filtering out data when it's not
 * 	  actually being used to represent the final, tracked, collection
 * 	- If `ignoreNonIncrementalQueries` is true, non-incremental queries like ranges are ignored. Similar to ignoreSorts,
 * 	  this is used when the data being transformed is not the full data set, since in that case non incremental queries
 * 	  are meaningless.
 *
 * @param queriesAndTransformations
 * @param data
 * @param instance
 * @param state
 * @param ignoreSorts
 * @param ignoreNonIncrementalQueries
 * @returns {any[]}
 */
function queryAndTransformData<T>(
	queriesAndTransformations: Array<Query<T> | TransformationDescriptor<T, T>>,
	data: T[],
	instance?: MappedQueryTransformResult<T, any>,
	state?: QueryTransformState<T, any>,
	ignoreSorts = false,
	ignoreNonIncrementalQueries = false
) {
	return queriesAndTransformations.reduce((prev, next) => {
		if (isTransformation(next)) {
			return transformData([ next ], prev);
		}
		else {
			if ((!ignoreSorts || next.queryType !== QueryType.Sort) && (!ignoreNonIncrementalQueries || next.incremental)) {
				if (instance && state && isFilter(next)) {
					return next
						.or(createFilter().custom((item: T) => state.localIndex.has(instance.identify(item))))
						.apply(prev);
				}
				else {
					return next.apply(prev);
				}
			}
			else {
				return prev;
			}
		}
	}, data);
}

/**
 * Removes items from adds and updates, and IDs from deletes, that don't belong in this query transform result. The
 * observers of this view don't want to see unrelated updates. currentUpdateIndex is used when operating on batch
 * updates. If updates are processed in a batch, an item might be added in one, and then removed in a later update. The
 * newly added item will not yet be represented in the local data because the update needs to be localized before it
 * can be used to update the local data. A single map can be passed as the currentUpdateIndex in multiple calls to
 * localizeUpdate, and can then serve as a signal that even though a deleted ID isn't in the local index it is still
 * a relevant update
 * @param state
 * @param update
 * @param instance
 * @param currentUpdateIndex
 * @returns {{deletes: string[], adds: any[], updates: any[], beforeAll: any[], afterAll: any[]}}
 */
function localizeUpdate<T, S extends ObservableStore<T, any, any>>(
	state: QueryTransformState<T, S>,
	update: StoreDelta<T>,
	instance?: MappedQueryTransformResult<T, any>,
	currentUpdateIndex?: Set<string>
) {

	// Don't apply range queries, sorts, etc. to adds and updates, because those don't make sense in that context
	const adds = queryAndTransformData(state.queriesAndTransformations, update.adds,  undefined, undefined, true, true);
	const updates = queryAndTransformData(state.queriesAndTransformations, update.updates, instance, state, true, true);
	if (instance && currentUpdateIndex) {
		instance.identify(adds.concat(updates)).map((id) => currentUpdateIndex.add(id));
	}
	const deletes = update.deletes.filter((id) =>
		state.localIndex.has(id) || currentUpdateIndex && currentUpdateIndex.has(id)
	);
	// Applying range queries to beforeAll and afterAll may not be completely accurate, in the case that
	// we are not eagerly fetching or tracking, but the data would definitely not be accurate if we don't apply them
	// and we shouldn't be returning more data than the queries require.
	const beforeAll = queryAndTransformData(state.queriesAndTransformations, update.beforeAll);
	const afterAll = queryAndTransformData(state.queriesAndTransformations, update.afterAll);

	return {
		deletes: deletes,
		adds: adds,
		updates: updates,
		beforeAll: beforeAll,
		afterAll: afterAll
	};
}

const instanceStateMap = new WeakMap<QueryTransformResult<any, any>, QueryTransformState<any, any>>();

export interface QueryTransformResultFactory extends ComposeFactory<QueryTransformResult<any, any>, QueryTransformState<any, any>> {
	<T, S extends ObservableStore<any, any, any>>(options?: QueryTransformOptions<T, S>): QueryTransformResult<T, S>;
}

export interface MappedQueryTransformResultFactory extends ComposeFactory<MappedQueryTransformResult<any, any>, QueryTransformState<any, any>> {
	<T, S extends ObservableStore<any, any, any>>(options?: QueryTransformOptions<T, S>): MappedQueryTransformResult<T, S>;
}

export interface TrackedQueryTransformResultFactory extends ComposeFactory<TrackedQueryTransformResult<any, any>, QueryTransformState<any, any>> {
	<T, S extends ObservableStore<any, any, any>>(options?: QueryTransformOptions<T, S>): TrackedQueryTransformResult<T, S>;
}

export const createQueryTransformResult: QueryTransformResultFactory = compose<QueryTransformResult<any, any>, any>({
	query(this: QueryTransformResult<any, any>, query: Query<any>) {
		const state = instanceStateMap.get(this);
		const options: QueryTransformOptions<any, any> = {
			source: state.source,
			queriesAndTransformations: [ ...state.queriesAndTransformations, query ],
			trackingFetchDelay: state.trackingFetchDelay,
			fetchAroundUpdates: state.fetchAroundUpdates
		};
		if (isMapped(this)) {
			return createMappedQueryTransformResult(options);
		}
		else {
			return createQueryTransformResult(options);
		}
	},
	filter(this: QueryTransformResult<any, any>, filterOrTest: Filter<any> | ((item: any) => boolean)) {
		let filter: Filter<any>;
		if (isFilter(filterOrTest)) {
			filter = filterOrTest;
		}
		else {
			filter = createFilter<any>().custom(<(item: any) => boolean> filterOrTest);
		}

		return this.query(filter);
	},

	range(this: QueryTransformResult<any, any>, rangeOrStart: StoreRange<any> | number, count?: number) {
		let range: StoreRange<any>;
		if (typeof count !== 'undefined') {
			range = createRange<any>(<number> rangeOrStart, count);
		}
		else {
			range = <StoreRange<any>> rangeOrStart;
		}

		return this.query(range);
	},

	sort(this: QueryTransformResult<any, any>, sortOrComparator: Sort<any> | ((a: any, b: any) => number), descending?: boolean) {
		let sort: Sort<any>;
		if (isSort(sortOrComparator)) {
			sort = sortOrComparator;
		}
		else {
			sort = createSort(sortOrComparator, descending);
		}

		return this.query(sort);
	},
	observe(this: QueryTransformResult<any, any>, idOrIds?: string | string[]) {
		const state = instanceStateMap.get(this);
		if (!idOrIds) {
			if (!state.sourceHandle) {
				const waitForFetchPromise: Promise<any> = state.initialFetch || Promise.resolve();
				state.sourceHandle = waitForFetchPromise.then(() => {
					return state.source.observe().subscribe((update: StoreDelta<any>) => {
						const state = instanceStateMap.get(this);
						const mapped = this;
						if (isMapped(mapped)) {
							if (state.fetchAroundUpdates || !state.isTracking) {
								update = localizeUpdate(state, update, mapped);
								const newData = update.afterAll;
								const newIndex = buildIndex(mapped.identify(newData));
								sendTrackedUpdate(state, mapped, newData, newIndex, update);
								state.localData = newData;
								state.localIndex = newIndex;
							}
							else {
								// Combine batched updates, use `currentUpdateIndex` to make sure deletes of items added and then deleted within
								// the span of the queued updates are not lost. These will be cancelled out by mergeDeltas, but both need
								// to be there to properly get cancelled out, otherwise the delete gets removed and the add survives, resulting
								// in an incorrect update
								update = localizeUpdate(state, update, mapped, state.currentUpdateIndex);
								state.queuedUpdate = state.queuedUpdate ?
									mergeDeltas(mapped, state.queuedUpdate, update) : update;
								// Unfortunately if we have a non-incremental query and we are tracking, we will need to fetch
								// after each update. This is debounced to avoid rapidly issuing fetch requests in the case that a
								// series of updates are received in a short amount of time.
								state.fetchAndSendUpdates(mapped);
							}
						}
						else {
							update = localizeUpdate(state, update);
							sendUpdate(state, update);
						}
					});
				});
			}
			return state.observable;
		}
		else {
			if (Array.isArray(idOrIds)) {
				return state.source
					.observe(idOrIds)
					.map((update: ItemUpdate<any>) => transformItemUpdate(state.queriesAndTransformations, update));
			}
			else {
				return state.source
					.observe(idOrIds)
					.map((update: any) => transformData(state.queriesAndTransformations, update));
			}
		}
	},
	get(this: QueryTransformResult<any, any>, ids: string | string[]) {
		const state = instanceStateMap.get(this);
		const promise: Promise<any> = state.initialFetch || Promise.resolve();
		const mapped = isMapped(this);
		return promise.then(() => {
			if (mapped) {
				if (Array.isArray(ids)) {
					return ids.map((id) => state.localData[state.localIndex.get(id)!])
						.filter((item) => Boolean(item));
				}
				else {
					return state.localData[state.localIndex.get(ids)!];
				}
			}
			else {
				return this.source.get(ids).then((data: {} | {}[]) => {
					if (Array.isArray(data)) {
						return queryAndTransformData(state.queriesAndTransformations, data);
					}
					else {
						return queryAndTransformData(state.queriesAndTransformations, [ data ])[0];
					}
				});
			}
		});
	},
	transform<V>(
		this: QueryTransformResult<any, any>,
		transformation: Patch<any, V> | ((item: any) => V),
		idTransform?: string | ((item: V) => string)
	): any {
		const state = instanceStateMap.get(this);
		const options: QueryTransformOptions<any, any> = {
			source: state.source,
			queriesAndTransformations: [
				...state.queriesAndTransformations,
				{ transformation: transformation, idTransform: idTransform }
			],
			trackingFetchDelay: state.trackingFetchDelay,
			fetchAroundUpdates: state.fetchAroundUpdates
		};
		if (idTransform) {
			return createMappedQueryTransformResult(options);
		}
		else {
			return createQueryTransformResult(options);
		}
	},
	fetch(this: QueryTransformResult<any, any>, query?: Query<any>) {
		const state = instanceStateMap.get(this);

		let firstQuery = createCompoundQuery();
		const queriesAndTransformations = state.queriesAndTransformations.slice();
		let nextQuery = queriesAndTransformations.shift();
		// Get the queries that can be passed through to the store. This includes all queries up to and including the
		// first non incremental query(e.g. a range query) or up to and not including the first transformation
		while (nextQuery && isQuery(nextQuery) && nextQuery.incremental) {
			firstQuery = firstQuery.withQuery(nextQuery);
			nextQuery = queriesAndTransformations.shift();
		}
		if (nextQuery && isQuery(nextQuery)) {
			firstQuery = firstQuery.withQuery(nextQuery);
		}
		else if (nextQuery) {
			queriesAndTransformations.unshift(nextQuery);
		}

		const mapped: MappedQueryTransformResult<any, any> | undefined = isMapped(this) ?
			this as MappedQueryTransformResult<any, any> : undefined;
		let nextUpdate: StoreDelta<any> = (state.queuedUpdate && mapped) ? state.queuedUpdate : {
			adds: [],
			updates: [],
			deletes: [],
			beforeAll: [],
			afterAll: []
		};
		state.currentUpdateIndex.clear();
		state.queuedUpdate = undefined;

		const resultsPromise = state.source.fetch(firstQuery).then((newData: any[]) => {
			// If this is mapped or there is no parent query we should apply the query transform result's own queries
			// first so that the locally cached data can be properly updated
			newData = queryAndTransformData(
				(mapped || !query) ? queriesAndTransformations : [ ...queriesAndTransformations, query ],
				newData
			);

			if (mapped) {
				const ids = mapped.identify(newData);
				const newIndex = buildIndex(ids);
				// Update this way if this is not an initial fetch. If this is the initial fetch, then this
				// data(or subsequent data) will already be provided to observers in the initial notification, so don't
				// send a redundant one.
				if (resultsPromise !== state.initialFetch) {
					nextUpdate.beforeAll = state.localData;
					nextUpdate.afterAll = newData;
					sendTrackedUpdate(state, mapped, newData, newIndex, nextUpdate);
				}
				state.localIndex = newIndex;
				state.localData = newData;
				if (query) {
					newData = query.apply(newData);
				}
			}
			return newData;
		});

		if (!state.initialFetch) {
			state.initialFetch = resultsPromise;
		}

		return resultsPromise;
	},

	get source(this: QueryTransformResult<any, any>) {
		return instanceStateMap.get(this).source;
	}
}, (instance: QueryTransformResult<any, any>, options?: QueryTransformOptions<any, any>) => {
	if (!options) {
		throw Error('Query Transform result cannot be created without providing a source store');
	}
	const observable = new Observable<StoreDelta<any>>((observer: Observer<StoreDelta<any>>) => {
		const state = instanceStateMap.get(instance);
		state.observers.push(observer);
		if (isMapped(instance)) {
			const fetchPromise: Promise<any> = state.initialFetch || Promise.resolve();
			fetchPromise.then(() => {
				const addedToTracked: { item: any; id: string; index: number; }[] = [];
				state.localIndex.forEach((index, id) => {
					addedToTracked.push({
						index: index,
						item: state.localData[index],
						id: id
					});
				});
				const trackedDelta: TrackableStoreDelta<any> = {
					updates: [],
					deletes: [],
					adds: [],
					addedToTracked: addedToTracked,
					removedFromTracked: [],
					movedInTracked: [],
					afterAll: state.localData,
					beforeAll: []
				};
				observer.next(trackedDelta);
			});
		}
		else {
			observer.next({
				updates: [],
				adds: [],
				deletes: [],
				beforeAll: [],
				afterAll: state.localData
			});
		}
		return () => {
			function remove(observer: Observer<StoreDelta<any>>) {
				state.observers.splice(state.observers.indexOf(observer), 1);
				if (!state.observers.length && state.sourceHandle) {
					state.sourceHandle.then((subscription) => {
						if (!state.observers.length) {
							subscription.unsubscribe();
						}

					});
				}
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
	});

	const updateInPlace = canUpdateInPlace(options.queriesAndTransformations, instance);

	const state: QueryTransformState<any, any> = {
		source: options.source,
		observers: [],
		canUpdateInPlace: updateInPlace,
		observable: observable,
		localData: [],
		localIndex: new Map<string, number>(),
		queriesAndTransformations: options.queriesAndTransformations,
		isTracking: options.isTracking,
		trackingFetchDelay: options.trackingFetchDelay,
		currentUpdateIndex: new Set<string>(),
		fetchAndSendUpdates: debounce((instance: QueryTransformResult<any, any>) => {
			instance.fetch();
		}, options.trackingFetchDelay || 20),
		fetchAroundUpdates: options.fetchAroundUpdates
	};
	instanceStateMap.set(instance, state);

	if (options.isTracking && !options.fetchAroundUpdates) {
		instance.fetch();
	}

});

// TODO - Figure out how to get these factory types to work
const createMappedQueryTransformResult: MappedQueryTransformResultFactory = <any> createQueryTransformResult
	.mixin({
		mixin: compose({
			track(this: MappedQueryTransformResult<any, any>): TrackedQueryTransformResult<any, any> {
				const state = instanceStateMap.get(this);
				return createTrackedQueryTransformResult({
					isTracking: true,
					source: state.source,
					trackingFetchDelay: state.trackingFetchDelay,
					queriesAndTransformations: state.queriesAndTransformations,
					fetchAroundUpdates: state.fetchAroundUpdates
				});
			},
			identify(this: QueryTransformResult<any, any>, items: any[] | any): string | string[] {
				const state = instanceStateMap.get(this);
				const lastTransformation = state.queriesAndTransformations.reduce<TransformationDescriptor<any, any> | undefined>(
					(prev, next) => isTransformation(next) ? next : prev, undefined
				);
				const itemArray = Array.isArray(items) ? items : [ items ];
				if (lastTransformation) {
					const idTransform = lastTransformation.idTransform!;
					if (typeof idTransform === 'string') {
						return itemArray.map((item) => item[idTransform]);
					}
					else {
						return itemArray.map(idTransform);
					}
				}
				return state.source.identify(items);
			}
		})
	});

export const createTrackedQueryTransformResult: TrackedQueryTransformResultFactory = <any> createMappedQueryTransformResult
	.mixin({
		mixin: compose({
			release(this: QueryTransformResult<any, any>) {
				const state = instanceStateMap.get(this);
				return createMappedQueryTransformResult({
					isTracking: false,
					source: state.source,
					queriesAndTransformations: state.queriesAndTransformations,
					fetchAroundUpdates: state.fetchAroundUpdates
				});
			}
		})
	});

export default createMappedQueryTransformResult;
