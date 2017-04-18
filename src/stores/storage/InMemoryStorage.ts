import { duplicate } from '@dojo/core/lang';
import uuid from '@dojo/core/uuid';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';
import { Query, FetchResult, StoreOperation, CrudOptions, StoreOptions, UpdateResults, Storage  } from '../interfaces';
import Patch from '../patch/Patch';

export default class InMemoryStorage<T> implements Storage<T, CrudOptions> {
	private _data: T[]= [];
	private _idFunction?: (item: T) => string;
	private _idProperty?: keyof T;
	private _index= new Map<string, number>();
	private _returnsPromise: Promise<any> = Promise.resolve();

	constructor(options: StoreOptions<T, CrudOptions> = {}) {
		this._idFunction = options.idFunction;
		this._idProperty = options.idProperty;
	}

	private _putSync(items: T[], options?: CrudOptions) {
		const ids = this.identify(items);

		const updatedItems: T[] = [];
		const oldIndices: number[] = [];
		const newIds: string[] = [];
		const newItems: T[] = [];

		ids.forEach((id, index) => {
			const oldIndex = this._index.get(id);
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

		const data = this._data;
		updatedItems.forEach((item, index) => {
			data[oldIndices[index]] = item;
		});
		newItems.forEach((item, index) => {
			this._index.set(newIds[index], data.push(item) - 1);
		});
		return {
			successfulData: items,
			type: StoreOperation.Put
		};
	}

	add(items: T[], options?: CrudOptions): Promise<UpdateResults<T>> {
		options = options || {};
		if (typeof options.rejectOverwrite === 'undefined') {
			options.rejectOverwrite = true;
		}

		try {
			const result = this._putSync(items, options);
			// Don't control the order operations are executed in, but make sure that the results
			// resolve in the order they were actually executed in.
			const returnPromise = this._returnsPromise.then(() => {
				result.type = StoreOperation.Add;
				return result;
			});
			this._returnsPromise = returnPromise;
			return returnPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	createId(): Promise<string> {
		return Promise.resolve(uuid());
	}

	delete(ids: string[]): Promise<UpdateResults<T>> {
		const data = this._data;
		const idsToRemove = ids.filter((id) => this._index.has(id));

		const indices: number[] = idsToRemove.map((id) => this._index.get(id) || 0).sort();

		idsToRemove.forEach((id) => {
			this._index.delete(id);
		});
		indices.forEach((index, indexArrayIndex) => {
			return data.splice(index - indexArrayIndex, 1);
		});
		if (indices.length) {
			const firstInvalidIndex = indices[0];
			const updateIndexForIds = this.identify(data.slice(firstInvalidIndex));
			updateIndexForIds.forEach((id, index) => {
				this._index.set(id, index + firstInvalidIndex);
			});
		}

		// Don't control the order operations are executed in, but make sure that the results
		// resolve in the order they were actually executed in.
		const returnPromise = this._returnsPromise.then(() => ({
			successfulData: idsToRemove,
			type: StoreOperation.Delete
		}));
		this._returnsPromise = returnPromise;
		return returnPromise;
	}

	fetch(query?: Query<T>): FetchResult<T> {
		const fullData = this._data;
		const data = (query ? query.apply(fullData) : fullData).slice();
		const returnPromise = this._returnsPromise.then(() => data);
		this._returnsPromise = returnPromise;
		(<any> returnPromise).totalLength = (<any> returnPromise).dataLength = Promise.resolve(fullData.length);
		return returnPromise as FetchResult<T>;
	}

	get(ids: string[]): Promise<T[]> {
		const data = this._data;
		const objects: T[] = [];
		return Promise.resolve(ids.reduce((prev, next) =>
			this._index.has(next) ? prev.concat( data[this._index.get(next)!] ) : prev, objects
		));
	}

	identify(items: T[]| T): string[] {
		const itemArray = Array.isArray(items) ? items : [ items ];
		const idProperty = this._idProperty;
		if (idProperty) {
			return itemArray.map((item) => item[idProperty].toString());
		}
		else if (this._idFunction) {
			return itemArray.map(this._idFunction);
		}

		return itemArray.map((item) => (<any> item).id);
	}

	patch(updates: { id: string; patch: Patch<T, T> }[]): Promise<UpdateResults<T>> {
		const data = this._data;

		const filteredUpdates = updates.filter((update) => {
			return this._index.has(update.id);
		});
		const oldIndices = filteredUpdates.map((update) => {
			return this._index.get(update.id)!;
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
			const returnsPromise = this._returnsPromise.then(() => ({
				successfulData: updatedItems,
				type: StoreOperation.Patch
			}));
			this._returnsPromise = returnsPromise;
			return returnsPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	}

	put(items: T[], options?: CrudOptions): Promise<UpdateResults<T>> {
		try {
			const result = this._putSync(items, options);
			// Don't control the order operations are executed in, but make sure that the results
			// resolve in the order they were actually executed in.
			const returnPromise = this._returnsPromise.then(() => result);
			this._returnsPromise = returnPromise;
			return returnPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	}
}
