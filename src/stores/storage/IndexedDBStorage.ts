import InMemoryStorage, { FetchResult } from './InMemoryStorage';
import { StoreOptions, CrudOptions, StoreOperation, UpdateResults } from '../store/createStore';
import {Query, QueryType} from '../query/interfaces';
import Set from '@dojo/shim/Set';
import Promise from '@dojo/shim/Promise';
import Patch from '../patch/Patch';
import CompoundQuery from '../query/CompoundQuery';
import { Filter, FilterType, FilterChainMember, BooleanOp, SimpleFilter } from '../query/createFilter';

export type Indices<T> = {
	[ P in keyof T ]?: any;
}

export interface IndexedDBOptions<T, O extends CrudOptions> extends StoreOptions<T, O> {
	/**
	 * The name to use for the database. Should be provided since this could potentially conflict
	 * with other existing databases
	 */
	dbName?: string;
	/**
	 * The name of the object store in which items should be stored. If not provided this will default
	 * to 'items'
	 */
	objectStoreName?: string;
	/**
	 * The version of the database if it already exists but the object store needs to be created. If this
	 * is creating a new database, or accessing an existing database that already has an objectStore for
	 * items, then this is not required.
	 */
	version?: number;
	/**
	 * Indicates which properties to create an index for
	 */
	indices?: Indices<T>;

}

export interface IndexQueryDescriptor {
	/**
	 * Key range to use for the query
	 */
	keyRange?: IDBKeyRange;
	/**
	 * The index to query against
	 */
	index?: IDBIndex;
	/**
	 * Indicates whether the first of two filters was used.
	 */
	firstFilterUsed?: boolean;
	/**
	 * Indicates whether the second of two filters was used
	 */
	secondFilterUsed?: boolean;
}

/**
 * A query that has been broken up according to when the queries can be applied. initialFilters and initialQueries can
 * be applied to the items and/or the accumulating collection of items incrementally, and can possibly even be converted
 * into indexedDB queries. The inMemoryQuery contains the first non-incremental query(e.g. a range query), which needs
 * to be applied to the collection as a whole to function properly. This query has to be applied after the indexedDB
 * cursor has completed iterating over the available items and a candidate set of data has been constructed.
 */
interface DividedQuery<T> {
	initialFilters: SimpleFilter<T>[];
	initialQueries: Query<T>[];
	inMemoryQuery?: Query<T>;
}

/**
 * Describes the properties of an IDBKeyRange
 */
interface KeyRangeDescriptor {
	upperBound?: any;
	lowerBound?: any;
	upperInclusive?: boolean;
	lowerInclusive?: boolean;
}

/**
 * Creates a promise that resolves when the provided request is successful, and fails when there is an error with the
 * request. If this request involves writing data, that data will not be available for querying until the transaction
 * is completed. A promise that resolves when the transaction completes can be provided, and in that case the request
 * promise will not resolve until after that promise, ensuring that any operations performed after resolution of this
 * promise will have access to the data.
 * @param request The request to wait for
 * @param transactionPromise Optional promise that indicates when a transaction is completed in case resolution should
 * occur after the data is actually available
 * @returns {Promise<any>}
 */
export function createRequestPromise(request: IDBRequest, transactionPromise?: Promise<any>): Promise<any> {
	const requestPromise = new Promise((resolve, reject) => {
		request.onsuccess = (event: any) => {
			resolve(event.target.result);
		};
		request.onerror = (event) => {
			if (request.error.name === 'ConstraintError') {
				event.preventDefault();
			}
			reject(request.error);
		};
	});

	if (transactionPromise) {
		return transactionPromise.then(() => requestPromise);
	}

	return requestPromise;
}

/**
 * Determine whether a given query is a filter
 */
function isFilter<T>(filter?: Query<T> | BooleanOp): filter is Filter<T> {
	return Boolean(
		filter !== BooleanOp.Or && filter !== BooleanOp.And && (<Query<any>> filter).queryType === QueryType.Filter
	);
}

/**
 * Gets the key for the passed in filter, or undefined if the filter does not exist, doesn't have a key, or has
 * a nested key
 * @param filter The filter to get the key for
 */
function getKey(filter: SimpleFilter<any>): string | undefined {
	const path = filter.path;
	if (!path) {
		return undefined;
	}
	if (typeof path === 'string') {
		return path;
	}
	const segments = path.segments;
	if (segments.length === 1) {
		return segments[0];
	}
	return undefined;
}

/**
 * Creates a key range query based on the provided parameters or undefined if they are not valid
 */
function createKeyRange({ lowerBound, lowerInclusive, upperBound, upperInclusive }: KeyRangeDescriptor) {
	if (typeof lowerBound !== 'undefined' && typeof upperBound !== 'undefined') {
		return IDBKeyRange.bound(lowerBound, upperBound, !lowerInclusive, !upperInclusive);
	}
	if (typeof lowerBound !== 'undefined') {
		return IDBKeyRange.lowerBound(lowerBound, !lowerInclusive);
	}
	if (typeof upperBound !== 'undefined') {
		return IDBKeyRange.upperBound(upperBound, !upperInclusive);
	}
	return undefined;
}

/**
 * Gets the first two filters from the provided filter chain if they can be combined as a single filter(they are separated
 * by an AND)
 */
function getFilters(filterChain?: FilterChainMember<any>[]) {
	const firstFilterOrOp: SimpleFilter<any> | BooleanOp  | undefined = filterChain && filterChain[0];
	const secondFilterOrOp: SimpleFilter<any> | BooleanOp | undefined = filterChain && filterChain[2];
	let firstFilter: SimpleFilter<any> | undefined = undefined;
	let secondFilter: SimpleFilter<any> | undefined = undefined;
	if (filterChain) {
		if (isFilter(firstFilterOrOp)) {
			firstFilter = firstFilterOrOp;
			filterChain.shift();
		}
		if (firstFilter && filterChain[0] === BooleanOp.And && isFilter(secondFilterOrOp)) {
			secondFilter = secondFilterOrOp;
			filterChain.splice(0, 2);
		}
	}

	return { firstFilter, secondFilter };
}

/**
 * Checks the type of a filter and returns whether it can be used in a query against an IndexedDB index, and some
 * information about the key range to use for the query.
 * @param filter The filter to check
 * @param value The value being filtered against
 */
function checkFilter(filter: SimpleFilter<{}>, value: any): {
	keyRangeDescriptor: KeyRangeDescriptor, isFilterUsable: boolean
} {
	if (filter.filterType === FilterType.LessThan || filter.filterType === FilterType.LessThanOrEqualTo) {
		return {
			keyRangeDescriptor: {
				upperBound: value,
				upperInclusive: filter.filterType === FilterType.LessThanOrEqualTo
			},
			isFilterUsable: true
		};
	}
	if (filter.filterType === FilterType.GreaterThan || filter.filterType === FilterType.GreaterThanOrEqualTo) {
		return {
			keyRangeDescriptor: {
				lowerBound: value,
				lowerInclusive: filter.filterType === FilterType.GreaterThanOrEqualTo
			},
			isFilterUsable: true
		};
	}
	return { keyRangeDescriptor: {}, isFilterUsable: false };
}

/**
 * Updates a key range descriptor based on an additional filter, and adds a flag indicating whether the additional
 * filter resulted in a change in the key range.
 * @param filter
 * @param existingPath
 * @param value
 * @param upperBound
 * @param lowerBound
 * @param upperInclusive
 * @param lowerInclusive
 * @returns {any}
 */
function updateKeyRangeDescriptor(
	existingPath: string,
	value: any,
	{ upperBound, lowerBound, upperInclusive, lowerInclusive }: KeyRangeDescriptor,
	filter?: SimpleFilter<{}>
): { keyRangeDescriptor: KeyRangeDescriptor, isFilterUsable: boolean } {
	const defaultReturnValue = {
		keyRangeDescriptor: { upperBound, lowerBound, upperInclusive, lowerInclusive },
		isFilterUsable: false
	};
	if (!filter || getKey(filter) !== existingPath || typeof value === 'undefined') {
		return defaultReturnValue;
	}
	if ((filter.filterType === FilterType.LessThan ||
		filter.filterType === FilterType.LessThanOrEqualTo) && typeof upperBound === 'undefined') {
		return {
			keyRangeDescriptor: {
				lowerBound,
				lowerInclusive,
				upperBound: value,
				upperInclusive: filter.filterType === FilterType.LessThanOrEqualTo
			},
			isFilterUsable: true
		};
	}
	if ((filter.filterType === FilterType.GreaterThan ||
		filter.filterType === FilterType.GreaterThanOrEqualTo) && typeof lowerBound === 'undefined') {
		return {
			keyRangeDescriptor: {
				upperBound,
				upperInclusive,
				lowerBound: value,
				lowerInclusive: filter.filterType === FilterType.GreaterThanOrEqualTo
			},
			isFilterUsable: true
		};
	}
	return defaultReturnValue;
}

function divideQuery<T>(query?: Query<T>): DividedQuery<T>  {
	if (query) {
		const queries = query instanceof CompoundQuery  && query.queries;
		if (query.incremental) {
			if (queries) {
				return {
					initialFilters: <SimpleFilter<T>[]> queries.filter((query) => isFilter(query)),
					initialQueries: queries.filter((query) => !isFilter(query))
				};
			}
			if (isFilter(query)) {
				return { initialFilters: [ <SimpleFilter<T>> query ], initialQueries: [] };
			}
			return { initialFilters: [], initialQueries: [ query ] };
		}
		if (queries) {
			// Incremental queries can be applied to the items as they are iterated through, but
			// non-incremental queries need to full data set available before they can be applied.
			// This locates the first non incremental query, so that the queries can be split up
			// and applied while iterating through results or after results are collected as
			// appropriate. Filters and sorts are further broken up so that filters are applied
			// individually to new items rather than the entire result set.
			let splitIndex = 0;
			queries.some((query, index) => {
				if (!query.incremental) {
					splitIndex = index;
					return true;
				}
				else {
					return false;
				}
			});
			const initialQueries = queries.slice(0, splitIndex);
			const inMemoryQueries = queries.slice(splitIndex);

			return {
				inMemoryQuery: inMemoryQueries.reduce((previousValue, nextValue) =>
					new CompoundQuery({
						query: previousValue
					}).withQuery(nextValue)
				),
				initialQueries: initialQueries.filter((query) => !isFilter(query)),
				initialFilters: <SimpleFilter<T>[]> initialQueries.filter((query) => isFilter(query))
			};
		}
		return { inMemoryQuery: query, initialQueries: [], initialFilters: [] };
	}
	return { initialQueries: [], initialFilters: [] };
}

export default class IndexedDBStorage<T> extends InMemoryStorage<T> {
	/**
	 * The name of the database
	 */
	private dbName: string;

	/**
	 * The name of the object store in which items are stored
	 */
	private objectStoreName: string;

	/**
	 * A promise that resolves when the database is finished initializing. Subsequent operations will be delayed until
	 * this promise resolves. If initialization fails, any subsequent operations will return an appropriate error as
	 * well.
	 */
	private dbInitializationPromise: Promise<any>;

	/**
	 * The database
	 */
	private db: IDBDatabase;

	/**
	 * Indices used for better query performance
	 */
	private indices: Set<string>;
	constructor(options: IndexedDBOptions<T, CrudOptions> = {}) {
		super(options);
		let resolveInitialPromise: Function;
		let rejectInitialPromise: Function;
		const initializationPromise = new Promise((resolve, reject) => {
			resolveInitialPromise = resolve;
			rejectInitialPromise = reject;
		});
		this.dbName = options.dbName || 'store-database';
		this.objectStoreName = options.objectStoreName || 'items';
		this.dbInitializationPromise = initializationPromise;
		this.indices = new Set<keyof T>();

		// IE doesn't respond well to passing an undefined version, so check whether it was provided before opening
		// the connection
		const request = options.version ? indexedDB.open(this.dbName, options.version) : indexedDB.open(this.dbName);
		let upgrading = false;

		request.onupgradeneeded = (event: any) => {
			upgrading = true;
			const db = event.target.result;
			this.db = db;

			let objectStore: IDBObjectStore;
			if (!db.objectStoreNames.contains(this.objectStoreName)) {
				objectStore = db.createObjectStore(this.objectStoreName);
			}
			else {
				objectStore = request.transaction.objectStore(this.objectStoreName);
			}
			const indices = options && options.indices;
			if (indices) {
				Object.keys(indices).forEach((index) => {
					this.indices.add(index);
					if (!objectStore.indexNames.contains(index)) {
						objectStore.createIndex(index, index);
					}
				});
			}

		};

		createRequestPromise(request).then(
			(db) => {
				this.db = db;
				resolveInitialPromise(db);
				return db;
			},
			(error) => {
				rejectInitialPromise(error);
			}
		);
	}

	/**
	 * Determines whether the provided filter can be applied as a query on an indexed property in the object
	 * store, and if so applies it and returns . Otherwise returns undefined
	 * @param objectStore The object store to retrieve an index from
	 * @param filter The first filter to use to generate a key range
	 * @param secondFilter An additional filter to use to generate a key range
	 */
	protected getKeyRangeAndIndex(
		objectStore: IDBObjectStore, filter?: SimpleFilter<any>, secondFilter?: SimpleFilter<any>
	): IndexQueryDescriptor {
		const valueOne = filter && filter.value;
		if (filter && typeof valueOne !== 'undefined') {
			const pathOne = getKey(filter);
			if (pathOne) {
				if (this.indices.has(pathOne) && objectStore.indexNames.contains(pathOne)) {
					const index = objectStore.index(pathOne);
					if (filter.filterType === FilterType.EqualTo) {
						return { keyRange: IDBKeyRange.only(filter.value), index, firstFilterUsed: true };
					}

					const { keyRangeDescriptor, isFilterUsable: firstFilterUsed } = checkFilter(filter, valueOne);
					const valueTwo = secondFilter && secondFilter.value;
					const {
						keyRangeDescriptor: updatedDescriptor, isFilterUsable: secondFilterUsed
					} = updateKeyRangeDescriptor(pathOne, valueTwo, keyRangeDescriptor, secondFilter);

					return {
						keyRange: createKeyRange(updatedDescriptor),
						index,
						firstFilterUsed,
						secondFilterUsed
					};
				}
			}
		}

		return {};
	}

	/**
	 * Creates a new transaction, and returns a promise that will resolve when that transaction is completed, and a reference
	 * to the object store specified by the objectStoreName property. Provides a read only transaction
	 * unless write access is required.
	 * @param needsWriteAccess Whether this request requires write access.
	 */
	protected getTransactionAndObjectStore<T>(needsWriteAccess?: boolean) {
		const db = this.db;
		if (!db) {
			throw Error('Can\'t create transaction because database does not exist');
		}
		const transaction = needsWriteAccess ?
			db.transaction(this.objectStoreName, 'readwrite') : db.transaction(this.objectStoreName);
		const transactionPromise = new Promise((resolve, reject) => {
			transaction.oncomplete = () => {
				resolve();
			};
			transaction.onerror = transaction.onabort = (event: any) => {
				reject(event.target.error);
			};
		});
		return { transactionPromise, objectStore: transaction.objectStore(this.objectStoreName) };
	}

	/**
	 * Creates a cursor request based on the provided filters, and object store.
	 * Potentially modifies initialFilters depending on whether some filters can be used to generate an IDBKeyRange to apply
	 * to the DB
	 * @param initialFilters
	 * @param objectStore
	 * @returns {IDBRequest}
	 */
	protected createCursorRequest(initialFilters: SimpleFilter<T>[], objectStore: IDBObjectStore) {
		const filterChain = initialFilters[0] && initialFilters[0].filterChain;
		let { firstFilter, secondFilter } = getFilters(filterChain);
		if (filterChain && !filterChain.length) {
			initialFilters.shift();
		}
		let { keyRange, index, firstFilterUsed, secondFilterUsed } = this.getKeyRangeAndIndex(
			objectStore, firstFilter, secondFilter
		);
		if (!secondFilterUsed && secondFilter) {
			initialFilters.unshift(secondFilter);
		}
		if (!firstFilterUsed && firstFilter) {
			initialFilters.unshift(firstFilter);
		}
		if (keyRange && index) {
			return index.openCursor(keyRange);
		}
		else {
			return objectStore.openCursor();
		}
	}

	fetch(query?: Query<T>): FetchResult<T> {
		let resolveTotalLength: (totalLength: number) => void;
		let rejectTotalLength: (error: any) => void;
		const totalLength = new Promise((resolve, reject) => {
			resolveTotalLength = resolve;
			rejectTotalLength = reject;
		});
		const fetchResult: FetchResult<T> = <any> this.dbInitializationPromise.then(
			() => {
				return new Promise((resolve) => {
					const { objectStore } = this.getTransactionAndObjectStore();
					const request = objectStore.count();
					const totalLengthPromise = createRequestPromise(request);
					totalLengthPromise.then(() => {
						resolveTotalLength(request.result);
					}, rejectTotalLength);
					let items: T[] = [];
					const { initialQueries, initialFilters, inMemoryQuery } = divideQuery(query);

					this.createCursorRequest(initialFilters, objectStore).onsuccess = (event: any) => {
						const cursor = event.target.result;
						if (cursor) {
							// Apply filters and if the new item is not filtered, apply other
							// queries to the collection after adding it in.
							const newItems = initialFilters.reduce((prev, next) => {
								if (prev.length) {
									return next.apply(prev);
								} else {
									return prev;
								}
							}, [ cursor.value ]);
							if (newItems.length) {
								items = initialQueries.reduce(
									(prev, next) => next.apply(prev), [ ...items, newItems[0] ]
								);
							}
							cursor.continue();
						}
						else {
							resolve(inMemoryQuery ? inMemoryQuery.apply(items) : items);
						}
					};
				});
			}
		);
		fetchResult.totalLength = totalLength;
		return fetchResult;
	}

	get(ids: string[]): Promise<T[]> {
		return this.dbInitializationPromise.then(() => {
			const { objectStore } = this.getTransactionAndObjectStore();
			return Promise.all(ids.map((id) => {
				const request = objectStore.get(id);
				return createRequestPromise(request).then(function() {
					return request.result;
				});
			}))
				.then((data) => data.filter((item) => Boolean(item)));
		});
	}

	put(items: T[], options?: CrudOptions): Promise<UpdateResults<T>> {
		return this.dbInitializationPromise.then(() => {
			const { transactionPromise, objectStore } = this.getTransactionAndObjectStore(true);
			const rejectOverwrite = options && options.rejectOverwrite;
			const ids = this.identify(items);
			return Promise.all(items.map((item, index) => {
				const id = ids[index];
				return createRequestPromise(
					rejectOverwrite ? objectStore.add(item, id) : objectStore.put(item, id), transactionPromise
				)
					.then(() => item);
			}))
				.then((updatedItems) => ({
					type: StoreOperation.Put,
					successfulData: updatedItems
				}));
		});
	}

	add(items: T[], { rejectOverwrite = true, id }: CrudOptions = { rejectOverwrite: true } ): Promise<UpdateResults<T>> {
		return this.put(items, { rejectOverwrite, id }).then((results) => {
			results.type = StoreOperation.Add;
			return results;
		});
	}

	delete(ids: string[]): Promise<UpdateResults<T>> {
		return this.dbInitializationPromise.then(() => {
			const { transactionPromise, objectStore } = this.getTransactionAndObjectStore(true);
			return Promise.all(ids.map((id) => createRequestPromise(
				objectStore.delete(id), transactionPromise
			)
				.then(() => id)))
				.then((ids) => ({
					type: StoreOperation.Delete,
					successfulData: ids
				}));
		});
	}

	patch(updates: { id: string; patch: Patch<T, T> }[]): Promise<UpdateResults<T>> {
		return this.dbInitializationPromise.then(() => {
			const { transactionPromise, objectStore } = this.getTransactionAndObjectStore(false);
			return Promise.all(updates.map(
				(update) => createRequestPromise(objectStore.get(update.id), transactionPromise).then(
					(item) => {
						const { transactionPromise, objectStore } = this.getTransactionAndObjectStore(true);
						const updated = update.patch.apply(item);
						return createRequestPromise(
							objectStore.put(updated, update.id), transactionPromise
						)
							.then(() => updated);
					}
				)
			))
				.then((updatedItems) => ({
					type: StoreOperation.Patch,
					successfulData: updatedItems
				}));
		});
	}
}
