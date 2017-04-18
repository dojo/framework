import { Observable, Observer } from '@dojo/core/Observable';
import { debounce } from '@dojo/core/util';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';
import Set from '@dojo/shim/Set';
import { Query, QueryType, FetchResult } from '../interfaces';
import { ItemUpdate, StoreDelta, mergeDeltas, buildIndex } from './ObservableStore';
import Patch from '../patch/Patch';
import CompoundQuery from '../query/CompoundQuery';
import createFilter, { Filter } from '../query/createFilter';
import createSort, { Sort } from '../query/createSort';
import createRange, { StoreRange } from '../query/createStoreRange';
import { isFilter, isSort, QueryableStoreInterface } from './QueryableStore';

export interface TrackableStoreDelta<T> extends StoreDelta<T> {
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

	/**
	 * Contains info for any items that were formerly in the tracked collection and are now not, regardless of how
	 * those items were removed
	 */
	removedFromTracked: { item: T; id: string; previousIndex: number; }[];
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
	result: QueryResultInterface<any, any>
) {
	return isMapped(result) && queriesAndTransforms.every((queryOrTransformation) =>
		!isQuery(queryOrTransformation) || Boolean(queryOrTransformation.incremental)
	);
}

export interface QueryableStoreInterfaceOptions<T, S extends QueryableStoreInterface<any, any, any>> {
	fetchAroundUpdates: boolean;
	isTracking?: boolean;
	queriesAndTransformations: Array<Query<T> | TransformationDescriptor<T, any>>;
	source: S;
	trackingFetchDelay?: number;
}

export interface QueryResultInterface<T, S extends QueryableStoreInterface<any, any, any>> {
	source: S;
	fetch(query?: Query<T>): FetchResult<T>;
	filter(filter: Filter<T>): this;
	filter(test: (item: T) => boolean): this;
	get(ids: string | string[]): Promise<T[]>;
	observe(): Observable<StoreDelta<T>>;
	observe(id: string): Observable<T>;
	observe(ids: string[]): Observable<ItemUpdate<T>>;
	query(query: Query<T>): this;
	range(range: StoreRange<T>): this;
	range(start: number, count: number): this;
	sort(sort: Sort<T> | ((a: T, b: T) => number) | string, descending?: boolean): this;
	transform<V>(transformation: Patch<T, V> | ((item: T) => V)): QueryResultInterface<V, S>;
	transform<V>(transformation: Patch<T, V> | ((item: T) => V), idTransform: string | ((item: V) => string)): MappedQueryResult<V, S>;
}

export interface MappedQueryResultInterface<
	T, S extends QueryableStoreInterface<any, any, any>
> extends QueryResultInterface<T, S> {
	identify(items: T[]): string[];
	identify(item: T): string;
	identify(items: T | T[]): string | string[];

	/**
	 * These overrides aren't actually changing the signature, they are just necessary to make typescript happy about
	 * the override of the no arg signature for observe
	 */
	observe(): Observable<TrackableStoreDelta<T>>;
	observe(id: string): Observable<T>;
	observe(ids: string[]): Observable<ItemUpdate<T>>;

	/**
	 * Starts actively tracking this view, such that any time updates are made, this will fetch if necessary to make
	 * sure it has the latest data.
	 */
	track(): TrackedQueryResultInterface<T, S>;
}

export interface TrackedQueryResultInterface<
	T, S extends QueryableStoreInterface<any, any, any>
> extends MappedQueryResultInterface<T, S> {
	/**
	 * Create a new query transform result that is not tracking the source store but represents the same queries and
	 * transforms
	 */
	release(): MappedQueryResultInterface<T, S>;
}

/**
 * Check if this is a 'mapped' query transform result
 * @param queryTransformResult
 * @returns {boolean}
 */
function isMapped(
	queryTransformResult: QueryResultInterface<any, any>
): queryTransformResult is MappedQueryResultInterface<any, any> {
	return typeof (<MappedQueryResultInterface<any, any>> queryTransformResult).track === 'function';
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

export class QueryResult<T, S extends QueryableStoreInterface<any, any, any>> implements QueryResultInterface<T, S> {
	/**
	 * Tracks whether we can modify the local collection in place or need to fetch to get the correct this after an
	 * update
	 */
	protected _canUpdateInPlace: boolean;

	/**
	 * Keeps track of new item IDs as updates are being queued
	 */
	protected _currentUpdateIndex = new Set<string>();

	/**
	 * A debounced function that just delegates to the instance's fetch method
	 * @param instance
	 */
	protected _fetchAndSendUpdates: (instance: QueryResultInterface<T, S>) => void;

	/**
	 * Is the parent store fetching around updates
	 * If the parent store is fetching around updates, we will always have the latest superset of this view's data in
	 * the updates it receives locally. In that case, even if actively tracking, no additional fetches need to be
	 * performed, the local queries and transformations can just be applied to the new data directly.
	 */
	protected _fetchAroundUpdates: boolean;

	/**
	 * Promise tracking the initial fetch if we are tracking and are not fetchingAroundUpdates
	 */
	protected _initialFetch?: Promise<T[]>;

	/**
	 * Tracks whether we're tracking this collection
	 */
	protected _isTracking?: boolean;

	/**
	 * The local copy of the data for this view
	 */
	protected _localData: T[] = [];

	/**
	 * Maps IDs to indices in localDAta
	 */
	protected _localIndex = new Map<string, number>();

	/**
	 * The observable that observers of this query transform result will be provided
	 */
	protected _observable: Observable<StoreDelta<T>>;

	/**
	 * Observers of this query transform result
	 */
	protected _observers: Observer<StoreDelta<T>>[] = [];

	/**
	 * Queries and transformations for this query transform result
	 */
	protected _queriesAndTransformations: Array<Query<T> | TransformationDescriptor<T, any>>;

	/**
	 * Updates ready to be send after the next fetch
	 */
	protected _queuedUpdate?: StoreDelta<T>;

	/**
	 * Handle to the subscription to the source store
	 */
	protected _sourceHandle?: Promise<{ unsubscribe: Function }>;

	/**
	 * Optional value that indicates the amount of time to debounce the fetch called after receiving an update.
	 */
	protected _trackingFetchDelay?: number;

	/**
	 * The store this query transform result comes from
	 */
	public readonly source: S;

	constructor(options?: QueryableStoreInterfaceOptions<any, any>) {
		if (!options) {
			throw Error('Query Transform result cannot be created without providing a source store');
		}
		const observable = new Observable<StoreDelta<any>>((observer: Observer<StoreDelta<any>>) => {
			this._observers.push(observer);
			this._handleInitialNotification(observer);
			return () => {
				const remove = (observer: Observer<StoreDelta<T>>) => {
					this._observers.splice(this._observers.indexOf(observer), 1);
					if (!this._observers.length && this._sourceHandle) {
						this._sourceHandle.then((subscription) => {
							if (!this._observers.length) {
								subscription.unsubscribe();
								this._sourceHandle = undefined;
							}

						});
					}
				};

				// Do the actual removal on the next tick so that
				// we don't remove items from the array while we're iterating through it.
				setTimeout(() => {
					remove(observer);
				});
			};
		});

		const updateInPlace = canUpdateInPlace(options.queriesAndTransformations, this);

		this.source = options.source;
		this._canUpdateInPlace = updateInPlace;
		this._observable = observable;
		this._queriesAndTransformations = options.queriesAndTransformations;
		this._isTracking = options.isTracking;
		this._trackingFetchDelay = options.trackingFetchDelay;
		this._fetchAndSendUpdates = debounce((instance: QueryResultInterface<any, any>) => {
			instance.fetch();
		}, options.trackingFetchDelay || 20);
		this._fetchAroundUpdates = options.fetchAroundUpdates;

		if (options.isTracking && !options.fetchAroundUpdates) {
			this.fetch();
		}
	}

	protected _getQueryOptions(query: Query<T>) {
		return {
			source: this.source,
			queriesAndTransformations: [ ...this._queriesAndTransformations, query ],
			trackingFetchDelay: this._trackingFetchDelay,
			fetchAroundUpdates: this._fetchAroundUpdates
		};
	}

	protected _handleInitialNotification(observer: Observer<StoreDelta<T>>) {
		observer.next({
			updates: [],
			adds: [],
			deletes: [],
			beforeAll: [],
			afterAll: this._localData.slice()
		});
	}

	protected _handleUpdate(update: StoreDelta<T>) {
		update = this._localizeUpdate(update);
		this._sendUpdate(update);
	}

	/**
	 * Removes items from adds and updates, and IDs from deletes, that don't belong in this query transform result. The
	 * observers of this view don't want to see unrelated updates. currentUpdateIndex is used when operating on batch
	 * updates. If updates are processed in a batch, an item might be added in one, and then removed in a later update. The
	 * newly added item will not yet be represented in the local data because the update needs to be localized before it
	 * can be used to update the local data. A single map can be passed as the currentUpdateIndex in multiple calls to
	 * localizeUpdate, and can then serve as a signal that even though a deleted ID isn't in the local index it is still
	 * a relevant update
	 * @param update
	 * @param instance
	 * @param currentUpdateIndex
	 * @returns {{deletes: string[], adds: any[], updates: any[], beforeAll: any[], afterAll: any[]}}
	 */
	protected _localizeUpdate(
		update: StoreDelta<T>,
		instance?: MappedQueryResultInterface<T, any>,
		currentUpdateIndex?: Set<string>
	) {

		// Don't apply range queries, sorts, etc. to adds and updates, because those don't make sense in that context
		const adds = this._queryAndTransformData(update.adds, undefined,  undefined,  true, true);
		const updates = this._queryAndTransformData(update.updates, undefined, instance, true, true);
		if (instance && currentUpdateIndex) {
			instance.identify(adds.concat(updates)).map((id) => currentUpdateIndex.add(id));
		}
		const deletes = update.deletes.filter((id) =>
			this._localIndex.has(id) || currentUpdateIndex && currentUpdateIndex.has(id)
		);
		// Applying range queries to beforeAll and afterAll may not be completely accurate, in the case that
		// we are not eagerly fetching or tracking, but the data would definitely not be accurate if we don't apply them
		// and we shouldn't be returning more data than the queries require.
		const beforeAll = this._queryAndTransformData(update.beforeAll);
		const afterAll = this._queryAndTransformData(update.afterAll);

		return {
			deletes: deletes,
			adds: adds,
			updates: updates,
			beforeAll: beforeAll,
			afterAll: afterAll
		};
	}

	/**
	 * Applies all of the provided queries and transformations to the data, with some optional changes
	 *  - If the instance and this are provided, then the localIndex will be checked and any items in it will be kept
	 * 	  even if they would be otherwise eliminated by a filter. This is used specifically for updates, since if an item
	 * 	  no longer satisfies the filters but is in the local index that means it has been modified and as a result removed
	 * 	  from the tracked filter. We still want to have access to the new data for inclusion in the `removedFromTracked`
	 * 	  update so that the user sees how the item changed to be removed from the collection.
	 *  - If `ignoreSorts` is true, then sorts are not applied. This is useful for just filtering out data when it's not
	 * 	  actually being used to represent the final, tracked, collection
	 * 	- If `ignoreNonIncrementalQueries` is true, non-incremental queries like ranges are ignored. Similar to ignoreSorts,
	 * 	  this is used when the data being transformed is not the full data set, since in that case non incremental queries
	 * 	  are meaningless.
	 *
	 * @param data
	 * @param queriesAndTransformations
	 * @param instance
	 * @param ignoreSorts
	 * @param ignoreNonIncrementalQueries
	 * @returns T[]
	 */
	protected _queryAndTransformData(
		data: any[],
		queriesAndTransformations?: Array<Query<T> | TransformationDescriptor<T, any>>,
		instance?: MappedQueryResultInterface<T, any>,
		ignoreSorts = false,
		ignoreNonIncrementalQueries = false
	): T[] {
		return (queriesAndTransformations || this._queriesAndTransformations).reduce((prev, next) => {
			if (isTransformation(next)) {
				return transformData([ next ], prev);
			}
			else {
				if ((!ignoreSorts || next.queryType !== QueryType.Sort) && (!ignoreNonIncrementalQueries || next.incremental)) {
					if (instance && isFilter(next)) {
						return next
							.or(createFilter().custom((item: T) => this._localIndex.has(instance.identify(item))))
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
	 * Sends the update if it actually represents any change in the data, and then removes observers that unsubscribed
	 * from the list.
	 * @param update
	 */
	protected _sendUpdate(update: StoreDelta<T>): void {
		// Don't send an update if nothing happened
		if (update.deletes.length || update.updates.length || update.adds.length || (
				isTracked(update) && (
					update.movedInTracked.length || update.addedToTracked.length || update.removedFromTracked.length
				)
			)) {
			this._observers.forEach((observer) => {
				if (isTracked(update)) {
					observer.next({
						updates: update.updates.slice(),
						adds: update.adds.slice(),
						deletes: update.deletes.slice(),
						afterAll: update.afterAll.slice(),
						beforeAll: update.beforeAll.slice(),
						movedInTracked: update.movedInTracked.slice(),
						removedFromTracked: update.removedFromTracked.slice(),
						addedToTracked: update.addedToTracked.slice()
					} as TrackableStoreDelta<T>);
				}
				else {
					observer.next({
						updates: update.updates.slice(),
						adds: update.adds.slice(),
						deletes: update.deletes.slice(),
						afterAll: update.afterAll.slice(),
						beforeAll: update.beforeAll.slice()
					});
				}
			});
		}
	}
	// Extension point for Mapped update
	protected _updateMappedState(newData: T[], resultsPromise: Promise<any>, nextUpdate: StoreDelta<T>) { }

	fetch(query?: Query<T>): FetchResult<T> {
		let firstQuery = new CompoundQuery();
		const queriesAndTransformations = this._queriesAndTransformations.slice();
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

		const mapped: MappedQueryResultInterface<any, any> | undefined = isMapped(this) ?
			this as MappedQueryResultInterface<any, any> : undefined;
		let nextUpdate: StoreDelta<any> = (this._queuedUpdate && mapped) ? this._queuedUpdate : {
				adds: [],
				updates: [],
				deletes: [],
				beforeAll: [],
				afterAll: []
			};
		this._currentUpdateIndex.clear();
		this._queuedUpdate = undefined;

		let resolveTotalLength: Function | undefined = undefined;
		let rejectTotalLength: Function | undefined = undefined;
		const totalLength = new Promise((resolve, reject) => {
			resolveTotalLength = resolve;
			rejectTotalLength = reject;
		});
		let resolveDataLength: Function;
		let rejectDataLength: Function;
		const dataLength = new Promise((resolve, reject) => {
			resolveDataLength = resolve;
			rejectDataLength = reject;
		});
		const fetchResult = this.source.fetch(firstQuery);
		const resultsPromise: FetchResult<T> = <any> fetchResult.then(
			(newData: any[]) => {
				// We should apply the query transform result's own queries first so that the total size of the locally
				// cached data can be determined
				newData = this._queryAndTransformData(newData, queriesAndTransformations);
				resolveDataLength(newData.length);

				this._updateMappedState(newData, resultsPromise, nextUpdate);
				if (query) {
					newData = query.apply(newData);
				}
				return newData;
			},
			(error: any) => {
				rejectDataLength(error);
				throw error;
			}
		);
		fetchResult.totalLength.then(resolveTotalLength, rejectTotalLength);
		resultsPromise.dataLength = dataLength;
		resultsPromise.totalLength = totalLength;

		if (!this._initialFetch) {
			this._initialFetch = resultsPromise;
		}

		return resultsPromise;
	}

	filter(filterOrTest: Filter<T> | ((item: T) => boolean)) {
		let filter: Filter<T>;
		if (isFilter(filterOrTest)) {
			filter = filterOrTest;
		}
		else {
			filter = createFilter<any>().custom(<(item: T) => boolean> filterOrTest);
		}

		return this.query(filter);
	}

	get(ids: string | string[]) {
		const promise: Promise<any> = this._initialFetch || Promise.resolve();
		const mapped = isMapped(this);
		return promise.then(() => {
			if (mapped) {
				if (Array.isArray(ids)) {
					return ids.map((id) => this._localData[this._localIndex.get(id)!])
						.filter((item) => Boolean(item));
				}
				else {
					return this._localData[this._localIndex.get(ids)!];
				}
			}
			else {
				return this.source.get(ids)
					.then((data) => {
						if (Array.isArray(data)) {
							return this._queryAndTransformData(data);
						}
						else if (data) {
							return this._queryAndTransformData([data])[0];
						}

						return data;
					});
			}
		});
	}

	observe(): Observable<StoreDelta<T>>;
	observe(id: string): Observable<T>;
	observe(ids: string[]): Observable<ItemUpdate<T>>;
	observe(idOrIds?: string | string[]) {
		if (!idOrIds) {
			if (!this._sourceHandle) {
				const waitForFetchPromise: Promise<any> = this._initialFetch || Promise.resolve();
				this._sourceHandle = waitForFetchPromise.then(() =>
					this.source.observe()
						.subscribe((update: StoreDelta<any>) => {
							this._handleUpdate(update);
						})
				);
			}
			return this._observable;
		}
		else if (Array.isArray(idOrIds)) {
			return this.source
				.observe(idOrIds)
				.map((update: ItemUpdate<any>) => transformItemUpdate(this._queriesAndTransformations, update));
		}
		return this.source
			.observe(idOrIds)
			.map((update: any) => transformData(this._queriesAndTransformations, update));
	}

	query(query: Query<T>): this {
		return new (<any> this.constructor)(this._getQueryOptions(query));
	}

	range(rangeOrStart: StoreRange<T> | number, count?: number) {
		let range: StoreRange<T>;
		if (typeof count !== 'undefined') {
			range = createRange<T>(<number> rangeOrStart, count);
		}
		else {
			range = <StoreRange<T>> rangeOrStart;
		}

		return this.query(range);
	}

	sort(sortOrComparator: Sort<T> | ((a: T, b: T) => number), descending?: boolean) {
		let sort: Sort<T>;
		if (isSort(sortOrComparator)) {
			sort = sortOrComparator;
		}
		else {
			sort = createSort(sortOrComparator, descending);
		}

		return this.query(sort);
	}

	transform<V>(transformation: Patch<T, V> | ((item: T) => V)): QueryResultInterface<V, S>;
	transform<V>(transformation: Patch<T, V> | ((item: T) => V), idTransform: string | ((item: V) => string)): MappedQueryResult<V, S>;
	transform<V>(
		transformation: Patch<any, V> | ((item: any) => V),
		idTransform?: string | ((item: V) => string)
	): QueryResultInterface<V, S> | MappedQueryResult<V, S> {
		const options: QueryableStoreInterfaceOptions<any, any> = {
			source: this.source,
			queriesAndTransformations: [
				...this._queriesAndTransformations,
				{ transformation: transformation, idTransform: idTransform }
			],
			trackingFetchDelay: this._trackingFetchDelay,
			fetchAroundUpdates: this._fetchAroundUpdates
		};
		if (idTransform) {
			return new MappedQueryResult<V, S>(options);
		}

		return new QueryResult<V, S>(options);
	}
}

export class MappedQueryResult<
	T, S extends QueryableStoreInterface<any, any, any>
> extends QueryResult<T, S> implements MappedQueryResultInterface<T, S> {
	protected _handleInitialNotification(observer: Observer<StoreDelta<T>>) {
		const fetchPromise: Promise<any> = this._initialFetch || Promise.resolve();
		fetchPromise.then(() => {
			const addedToTracked: { item: any; id: string; index: number; }[] = [];
			this._localIndex.forEach((index, id) => {
				addedToTracked.push({
					index: index,
					item: this._localData[index],
					id: id
				});
			});
			const trackedDelta: TrackableStoreDelta<T> = {
				updates: [],
				deletes: [],
				adds: [],
				addedToTracked: addedToTracked.slice(),
				removedFromTracked: [],
				movedInTracked: [],
				afterAll: this._localData.slice(),
				beforeAll: []
			};
			observer.next(trackedDelta);
		});
	}

	protected _handleUpdate(update: StoreDelta<T>) {
		if (this._fetchAroundUpdates || !this._isTracking) {
			update = this._localizeUpdate(update, this);
			const newData = update.afterAll;
			const ids = this.identify(newData);
			const newIndex = buildIndex(Array.isArray(ids) ? ids : [ ids ]);
			this._sendTrackedUpdate(newData, newIndex, update);
			this._localData = newData;
			this._localIndex = newIndex;
		}
		else {
			// Combine batched updates, use `currentUpdateIndex` to make sure deletes of items added and then deleted within
			// the span of the queued updates are not lost. These will be cancelled out by mergeDeltas, but both need
			// to be there to properly get cancelled out, otherwise the delete gets removed and the add survives, resulting
			// in an incorrect update
			update = this._localizeUpdate(update, this, this._currentUpdateIndex);
			this._queuedUpdate = this._queuedUpdate ?
				mergeDeltas(this, this._queuedUpdate, update) : update;
			// Unfortunately if we have a non-incremental query and we are tracking, we will need to fetch
			// after each update. This is debounced to avoid rapidly issuing fetch requests in the case that a
			// series of updates are received in a short amount of time.
			this._fetchAndSendUpdates(this);
		}
	}

	/**
	 * Compares the latest data to the previous local data to build the change records for a TrackedStoreDelta. Delegates
	 * to `sendUpdate` to actually send the update to observers.
	 * @param newData
	 * @param newIndex
	 * @param update
	 */
	protected _sendTrackedUpdate(newData: T[], newIndex: Map<string, number>, update: StoreDelta<T>) {
		const removedFromTracked: { item: T; id: string; previousIndex: number; }[] = [];
		const addedToTracked: { item: T; id: string; index: number; }[] = [];
		const movedInTracked: { item: T; id: string; previousIndex: number; index: number }[] = [];

		const updateMap = this.identify(update.updates).reduce((prev, next, index) => {
			prev.set(next, update.updates[index]);
			return prev;
		}, new Map<string, T>());
		// Check updates for removals first as it will have the latest data for items moved out of
		// the tracked collection.
		updateMap.forEach((item, id) => {
			if (!newIndex.has(id) && this._localIndex.has(id)) {
				removedFromTracked.push({
					item: item,
					id: id,
					previousIndex: this._localIndex.get(id)!
				});
			}
		});
		// Handle removals and moves
		this._localIndex.forEach((previousIndex, id) => {
			if (!newIndex.has(id) && !updateMap.has(id)) {
				removedFromTracked.push({
					item: this._localData[previousIndex],
					id: id,
					previousIndex: previousIndex
				});
			}
			else if (this._localIndex.get(id) !== newIndex.get(id)) {
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
			if (!this._localIndex.has(id)) {
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

		this._sendUpdate(trackedUpdate);
	}

	protected _updateMappedState(newData: T[], resultsPromise: Promise<any>, nextUpdate: StoreDelta<T>) {
		const ids = this.identify(newData);
		const newIndex = buildIndex(ids);
		// Update this way if this is not an initial fetch. If this is the initial fetch, then this
		// data (or subsequent data) will already be provided to observers in the initial notification, so don't
		// send a redundant one.
		if (resultsPromise !== this._initialFetch) {
			nextUpdate.beforeAll = this._localData;
			nextUpdate.afterAll = newData;
			this._sendTrackedUpdate(newData, newIndex, nextUpdate);
		}
		this._localIndex = newIndex;
		this._localData = newData;
	}

	identify(item: T): string;
	identify(items: T[]): string[];
	identify(items: T[] | T): string | string[] {
		const lastTransformation = this._queriesAndTransformations.reduce<TransformationDescriptor<any, any> | undefined>(
			(prev, next) => isTransformation(next) ? next : prev, undefined
		);
		const itemArray = Array.isArray(items) ? items : [ items ];
		if (lastTransformation) {
			const idTransform = lastTransformation.idTransform!;
			if (typeof idTransform === 'string') {
				return itemArray.map((item) => (<any> item)[idTransform]);
			}
			else {
				return itemArray.map(idTransform);
			}
		}
		return this.source.identify(items);
	}

	track(): TrackedQueryResultInterface<T, S> {
		return new TrackedQueryResult<T, S>({
			isTracking: true,
			source: this.source,
			trackingFetchDelay: this._trackingFetchDelay,
			queriesAndTransformations: this._queriesAndTransformations,
			fetchAroundUpdates: this._fetchAroundUpdates
		});
	}
}

export class TrackedQueryResult<
	T, S extends QueryableStoreInterface<any, any, any>
> extends MappedQueryResult<T, S> implements TrackedQueryResultInterface<T, S> {
	release() {
		return new MappedQueryResult<T, S>({
			isTracking: false,
			source: this.source,
			queriesAndTransformations: this._queriesAndTransformations,
			fetchAroundUpdates: this._fetchAroundUpdates
		});
	}
}
