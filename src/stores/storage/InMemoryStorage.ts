import { Query, FetchResult } from '../interfaces';
import { StoreOperation, CrudOptions, StoreOptions, UpdateResults, Storage } from '../interfaces';
import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Patch from '../patch/Patch';
import { duplicate } from '@dojo/core/lang';
import uuid from '@dojo/core/uuid';

export default class InMemoryStorage<T> implements Storage<T, CrudOptions> {
	private idProperty?: keyof T;
	private idFunction?: (item: T) => string;
	private data: T[];
	private index: Map<string, number>;
	private returnsPromise: Promise<any>;
	constructor(options: StoreOptions<T, CrudOptions> = {}) {
		this.data = [];
		this.index = new Map<string, number>();
		this.idProperty = options.idProperty;
		this.idFunction = options.idFunction;
		this.returnsPromise = Promise.resolve();
	}

	private putSync(items: T[], options?: CrudOptions) {
		const ids = this.identify(items);

		const updatedItems: T[] = [];
		const oldIndices: number[] = [];
		const newIds: string[] = [];
		const newItems: T[] = [];

		ids.forEach((id, index) => {
			const oldIndex = this.index.get(id);
			if (typeof oldIndex === 'undefined') {
				newIds.push(id);
				newItems.push(items[index]);
			}
			else {
				updatedItems.push(items[index]);
				oldIndices.push(oldIndex);
			}
		});
		if (oldIndices.length && options && options.rejectOverwrite) {
			throw Error('Objects already exist in store');
		}

		const data = this.data;
		updatedItems.forEach((item, index) => {
			data[oldIndices[index]] = item;
		});
		newItems.forEach((item, index) => {
			this.index.set(newIds[index], data.push(item) - 1);
		});
		return {
			successfulData: items,
			type: StoreOperation.Put
		};
	}
	identify(items: T[]| T): string[] {
		const itemArray = Array.isArray(items) ? items : [ items ];
		const idProperty = this.idProperty;
		if (idProperty) {
			return itemArray.map((item) => item[idProperty].toString());
		}
		else if (this.idFunction) {
			return itemArray.map(this.idFunction);
		}
		else {
			return itemArray.map((item) => (<any> item).id);
		}
	}

	createId(): Promise<string> {
		return Promise.resolve(uuid());
	}

	fetch(query?: Query<T>): FetchResult<T> {
		const fullData = this.data;
		const data = (query ? query.apply(fullData) : fullData).slice();
		const returnPromise = this.returnsPromise.then(() => data);
		this.returnsPromise = returnPromise;
		(<any> returnPromise).totalLength = (<any> returnPromise).dataLength = Promise.resolve(fullData.length);
		return returnPromise as FetchResult<T>;
	}

	get(ids: string[]): Promise<T[]> {
		const data = this.data;
		const objects: T[] = [];
		return Promise.resolve(ids.reduce((prev, next) =>
			this.index.has(next) ? prev.concat( data[this.index.get(next)!] ) : prev, objects
		));
	}

	put(items: T[], options?: CrudOptions): Promise<UpdateResults<T>> {
		try {
			const result = this.putSync(items, options);
			// Don't control the order operations are executed in, but make sure that the results
			// resolve in the order they were actually executed in.
			const returnPromise = this.returnsPromise.then(() => result);
			this.returnsPromise = returnPromise;
			return returnPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	add(items: T[], options?: CrudOptions): Promise<UpdateResults<T>> {
		options = options || {};
		if (typeof options.rejectOverwrite === 'undefined') {
			options.rejectOverwrite = true;
		}

		try {
			const result = this.putSync(items, options);
			// Don't control the order operations are executed in, but make sure that the results
			// resolve in the order they were actually executed in.
			const returnPromise = this.returnsPromise.then(() => {
				result.type = StoreOperation.Add;
				return result;
			});
			this.returnsPromise = returnPromise;
			return returnPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	delete(ids: string[]): Promise<UpdateResults<T>> {
		const data = this.data;
		const idsToRemove = ids.filter((id) => {
			return this.index.has(id);
		});

		const indices: number[] = idsToRemove
			.map((id) => {
				return this.index.get(id)!;
			})
			.sort();

		idsToRemove.forEach((id) => {
			this.index.delete(id);
		});
		indices.forEach((index, indexArrayIndex) => {
			return data.splice(index - indexArrayIndex, 1);
		});
		if (indices.length) {
			const firstInvalidIndex = indices[0];
			const updateIndexForIds = this.identify(data.slice(firstInvalidIndex));
			updateIndexForIds.forEach((id, index) => {
				this.index.set(id, index + firstInvalidIndex);
			});
		}

		// Don't control the order operations are executed in, but make sure that the results
		// resolve in the order they were actually executed in.
		const returnPromise = this.returnsPromise.then(() => ({
			successfulData: idsToRemove,
			type: StoreOperation.Delete
		}));
		this.returnsPromise = returnPromise;
		return returnPromise;
	}

	patch(updates: { id: string; patch: Patch<T, T> }[]): Promise<UpdateResults<T>> {
		const data = this.data;

		const filteredUpdates = updates.filter((update) => {
			return this.index.has(update.id);
		});
		const oldIndices = filteredUpdates.map((update) => {
			return this.index.get(update.id)!;
		});

		try {
			const updatedItems = filteredUpdates.map((update, index) => {
				const item = duplicate(data[oldIndices[index]]);
				const updatedItem = update.patch.apply(item);
				data[oldIndices[index]] = updatedItem;
				return updatedItem;
			});
			// Don't control the order operations are executed in, but make sure that the results
			// resolve in the order they were actually executed in.
			const returnsPromise = this.returnsPromise.then(() => ({
				successfulData: updatedItems,
				type: StoreOperation.Patch
			}));
			this.returnsPromise = returnsPromise;
			return returnsPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	}
}
