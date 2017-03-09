import {
	Storage, Query, CrudOptions, UpdateResults, Store, StoreOptions, PatchArgument, FetchResult, PatchMapEntry,
	StoreObservable
} from '../interfaces';
import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import { duplicate } from '@dojo/core/lang';
import { Observer, Observable } from '@dojo/core/Observable';
import Patch, { diff } from '../patch/Patch';
import _createStoreObservable from './createStoreObservable';
import InMemoryStorage from '../storage/InMemoryStorage';
function isPatchArray(patches: any[]): patches is { id: string; patch: Patch<any, any>}[] {
	return isPatch(patches[0]);
}

function isPatch(patchObj: any): patchObj is {id: string; patch: Patch<any, any> } {
	const patch = patchObj && patchObj.patch;
	const id = patchObj && patchObj.id;
	return typeof id === 'string' && patch && Array.isArray(patch.operations) && typeof patch.apply === 'function' &&
		typeof patch.toString === 'function';
}

function createStoreObservable(storeResultsPromise: Promise<UpdateResults<{}>>) {

	return _createStoreObservable(
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
}

export default class StoreBase<T> implements Store<T, CrudOptions, UpdateResults<T>> {
	private storage: Storage<T, CrudOptions>;
	private initialAddPromise: Promise<any>;
	constructor(options?: StoreOptions<T, CrudOptions>) {
		if (!options) {
			options = {};
		}
		const data: T[] | undefined = options.data;
		this.storage = options.storage || new InMemoryStorage(options);
		this.initialAddPromise = Promise.resolve();
		if (data) {
			this.initialAddPromise = this.add(data).catch((error) => {
				console.error(error);
			});
		}
	}

	get(ids: string[]): Promise<T[]>;
	get(id: string): Promise<T | undefined>;
	get(ids: string[] | string): Promise<T[] | T | undefined> {
		return this.initialAddPromise.then<T[] | T | undefined>(() => {
			if (Array.isArray(ids)) {
				return this.storage.get(ids).then((items) => items.filter((item) => Boolean(item)));
			}
			else {
				return this.storage.get([ids]).then(items => items[0]);
			}
		});
	}

	add(items: T[] | T, options?: CrudOptions): StoreObservable<T, UpdateResults<T>> {
		const storeResultsPromise = this.initialAddPromise.then(() => {
			return this.storage.add(Array.isArray(items) ? items : [ items ], options);
		});
		return createStoreObservable(storeResultsPromise);
	}

	put(items: T[] | T, options?: CrudOptions): StoreObservable<T, UpdateResults<T>> {
		const storeResultsPromise = this.initialAddPromise.then(() => {
			return this.storage.put(Array.isArray(items) ? items : [ items ], options);
		});

		return createStoreObservable(storeResultsPromise);
	}

	patch(updates: PatchArgument<T>, options?: CrudOptions): StoreObservable<T, UpdateResults<T>> {
		let patchEntries: PatchMapEntry<any, any>[] = [];
		if (Array.isArray(updates)) {
			if (isPatchArray(updates)) {
				patchEntries = updates;
			}
			else {
				patchEntries = updates.map(({ id }, index) => {
					const dupe = duplicate(updates[index]);
					delete dupe.id;
					return { id: id, patch: diff(dupe)};
				});
			}
		}
		else if (updates instanceof Map) {
			updates.forEach(function(value, key) {
				patchEntries.push({
					id: key,
					patch: value
				});
			});
		}
		else if (isPatch(updates)) {
			patchEntries = [ updates ];
		}
		else {
			const dupe = duplicate(updates);
			const idInOptions = (options && options.id);
			const id = idInOptions || dupe.id;
			if (!idInOptions) {
				delete dupe.id;
			}
			patchEntries = [ { id: id, patch: diff(dupe) }];
		}

		const storeResultsPromise = this.initialAddPromise.then(() => {
			return this.storage.patch(patchEntries);
		});

		return createStoreObservable(storeResultsPromise);
	}

	delete(ids: string | string[]): StoreObservable<String, UpdateResults<T>> {
		const storeResultsPromise = this.initialAddPromise.then(() => {
			return this.storage.delete(Array.isArray(ids) ? ids : [ ids ]);
		});

		return createStoreObservable(storeResultsPromise);
	}

	fetch(query?: Query<T>) {
		let resolveTotalLength: (totalLength: number) => void;
		let rejectTotalLength: (error: any) => void;
		const totalLength = new Promise((resolve, reject) => {
			resolveTotalLength = resolve;
			rejectTotalLength = reject;
		});
		const fetchResult: FetchResult<T> = <any> this.initialAddPromise.then(() => {
			const result = this.storage.fetch(query);
			result.totalLength.then(resolveTotalLength, rejectTotalLength);
			return result;
		});
		fetchResult.totalLength = fetchResult.dataLength = totalLength;

		return fetchResult;
	}

	identify(items: T[]): string[];
	identify(items: T): string;
	identify(items: T | T[]): string | string[] {
		if (Array.isArray(items)) {
			return this.storage.identify(items);
		}
		else {
			return this.storage.identify([items])[0];
		}
	}

	createId() {
		return this.storage.createId();
	}
}
