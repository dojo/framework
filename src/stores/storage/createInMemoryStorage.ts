import { Query } from '../query/interfaces';
import { StoreOperation, CrudOptions, StoreOptions, UpdateResults } from '../store/createStore';
import compose, { ComposeFactory } from '@dojo/compose/compose';
import Promise from '@dojo/shim/Promise';
import WeakMap from '@dojo/shim/WeakMap';
import Map from '@dojo/shim/Map';
import { Patch } from '../patch/createPatch';
import { duplicate } from '@dojo/core/lang';
import uuid from '@dojo/core/uuid';

export interface FetchResult<T> extends Promise<T[]> {
	/**
	 * A Promise that resolves to the total number of items in the underlying storage.
	 */
	totalLength: Promise<number>;
	/**
	 * For a store, this is identical to totalLength. For a QueryTransformResult, this resolves to the number of items
	 * that match the QueryTransformResult's queries
	 */
	dataLength: Promise<number>;
}

export interface Storage<T, O extends CrudOptions> {
	identify(items: T[]|T): string[];
	createId(): Promise<string>;
	fetch(query?: Query<T>): FetchResult<T>;
	get(ids: string[]): Promise<T[]>;
	put(items: T[], options?: O): Promise<UpdateResults<T>>;
	add(items: T[], options?: O): Promise<UpdateResults<T>>;
	delete(ids: string[]): Promise<UpdateResults<T>>;
	patch(updates: { id: string; patch: Patch<T, T> }[], options?: O): Promise<UpdateResults<T>>;
	isUpdate(item: T): Promise<{ isUpdate: boolean; item: T, id: string }>;
}

export interface InMemoryStorageState<T> {
	idProperty?: string;
	idFunction?: (item: T) => string;
	data: T[];
	index: Map<string, number>;
	returnsPromise: Promise<any>;
}

const instanceStateMap = new WeakMap<Storage<{}, {}>, InMemoryStorageState<{}>>();

export interface StorageFactory extends ComposeFactory<Storage<{}, {}>, StoreOptions<{}, CrudOptions>> {
	<T extends {}, O extends CrudOptions>(options?: O): Storage<T, O>;
}

export interface InMemoryStorageFactory extends StorageFactory {
	<T>(options?: StoreOptions<T, CrudOptions>): Storage<T, CrudOptions>;
}

type IdObject = { [ index: string ]: string; id: string };

function putSync(instance: Storage<{}, {}>, items: {}[], options?: CrudOptions) {
	const state = instanceStateMap.get(instance);
	const ids = instance.identify(items);

	const updatedItems: {}[] = [];
	const oldIndices: number[] = [];
	const newIds: string[] = [];
	const newItems: {}[] = [];

	ids.forEach(function(id, index) {
		const oldIndex = state.index.get(id);
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

	const data = state.data;
	updatedItems.forEach(function(item, index) {
		data[oldIndices[index]] = item;
	});
	newItems.forEach(function(item, index) {
		state.index.set(newIds[index], data.push(item) - 1);
	});
	return {
		successfulData: items,
		type: StoreOperation.Put
	};
}

const createInMemoryStorage: InMemoryStorageFactory = compose<Storage<IdObject, CrudOptions>, StoreOptions<{}, CrudOptions>>({
	identify(this: Storage<{}, {}>, items: IdObject[]| IdObject): string[] {
		const state = instanceStateMap.get(this);
		const itemArray = Array.isArray(items) ? <IdObject []> items : [ <IdObject> items ];
		if (state.idProperty) {
			const idProperty: string = state.idProperty;
			return itemArray.map((item) => {
				return item[idProperty];
			});
		}
		else if (state.idFunction) {
			return itemArray.map(state.idFunction);
		}
		else {
			return itemArray.map(function(item) {
				return item.id;
			});
		}
	},

	createId(this: Storage<{}, {}>): Promise<string> {
		return Promise.resolve(uuid());
	},

	fetch(this: Storage<{}, {}>, query?: Query<{}>): FetchResult<{}> {
		const state = instanceStateMap.get(this);
		const fullData = state.data;
		const data = (query ? query.apply(fullData) : fullData).slice();
		const returnPromise = state.returnsPromise.then(() => data);
		state.returnsPromise = returnPromise;
		(<any> returnPromise).totalLength = (<any> returnPromise).dataLength = Promise.resolve(fullData.length);
		return returnPromise as FetchResult<{}>;
	},

	get(this: Storage<{}, {}>, ids: string[]): Promise<{}[]> {
		const state = instanceStateMap.get(this);
		const data = state.data;
		const objects: {}[] = [];
		return Promise.resolve(ids.reduce(function(prev, next) {
			return state.index.has(next) ? prev.concat( data[state.index.get(next)!] ) : prev;
		}, objects));
	},

	put(this: Storage<{}, {}>, items: {}[], options?: CrudOptions): Promise<UpdateResults<{}>> {
		const state = instanceStateMap.get(this);
		try {
			const result = putSync(this, items, options);
			// Don't control the order operations are executed in, but make sure that the results
			// resolve in the order they were actually executed in.
			const returnPromise = state.returnsPromise.then(() => result);
			state.returnsPromise = returnPromise;
			return returnPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	},

	add(this: Storage<{}, {}>, items: {}[], options?: CrudOptions): Promise<UpdateResults<{}>> {
		options = options || {};
		const state = instanceStateMap.get(this);
		if (typeof options.rejectOverwrite === 'undefined') {
			options.rejectOverwrite = true;
		}

		try {
			const result = putSync(this, items, options);
			// Don't control the order operations are executed in, but make sure that the results
			// resolve in the order they were actually executed in.
			const returnPromise = state.returnsPromise.then(() => {
				result.type = StoreOperation.Add;
				return result;
			});
			state.returnsPromise = returnPromise;
			return returnPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	},

	delete(this: Storage<{}, {}>, ids: string[]): Promise<UpdateResults<{}>> {
		const state = instanceStateMap.get(this);
		const data = state.data;
		const idsToRemove = ids.filter(function(id) {
			return state.index.has(id);
		});

		const indices: number[] = idsToRemove
			.map(function(id) {
				return state.index.get(id)!;
			})
			.sort();

		idsToRemove.forEach(function(id) {
			state.index.delete(id);
		});
		indices.forEach(function(index, indexArrayIndex) {
			return data.splice(index - indexArrayIndex, 1);
		});
		if (indices.length) {
			const firstInvalidIndex = indices[0];
			const updateIndexForIds = this.identify(data.slice(firstInvalidIndex));
			updateIndexForIds.forEach(function(id, index) {
				state.index.set(id, index + firstInvalidIndex);
			});
		}

		// Don't control the order operations are executed in, but make sure that the results
		// resolve in the order they were actually executed in.
		const returnPromise = state.returnsPromise.then(() => ({
			successfulData: idsToRemove,
			type: StoreOperation.Delete
		}));
		state.returnsPromise = returnPromise;
		return returnPromise;
	},

	patch(this: Storage<{}, {}>, updates: { id: string; patch: Patch<{}, {}> }[]): Promise<UpdateResults<{}>> {
		const state = instanceStateMap.get(this);
		const data = state.data;

		const filteredUpdates = updates.filter(function(update) {
			return state.index.has(update.id);
		});
		const oldIndices = filteredUpdates.map(function(update) {
			return state.index.get(update.id)!;
		});

		try {
			const updatedItems = filteredUpdates.map(function(update, index) {
				const item = duplicate(data[oldIndices[index]]);
				const updatedItem = update.patch.apply(item);
				data[oldIndices[index]] = updatedItem;
				return updatedItem;
			});
			// Don't control the order operations are executed in, but make sure that the results
			// resolve in the order they were actually executed in.
			const returnsPromise = state.returnsPromise.then(() => ({
				successfulData: updatedItems,
				type: StoreOperation.Patch
			}));
			state.returnsPromise = returnsPromise;
			return returnsPromise;
		} catch (error) {
			return Promise.reject(error);
		}
	},

	isUpdate(this: Storage<{}, {}>, item: {}): Promise<{ isUpdate: boolean; item: {}; id: string }> {
		const state = instanceStateMap.get(this);
		const id = this.identify([ item ])[0];
		const isUpdate = state.index.has(id);
		return Promise.resolve({
			id: id,
			item: item,
			isUpdate: isUpdate
		});
	}
}, <T, O>(instance: Storage<T, O>, options?: StoreOptions<T, CrudOptions>) => {
	options = options || {};
	instanceStateMap.set(instance, {
		data: [],
		index: new Map<string, number>(),
		idProperty: options.idProperty,
		idFunction: options.idFunction,
		returnsPromise: Promise.resolve()
	});
});

export default createInMemoryStorage;
