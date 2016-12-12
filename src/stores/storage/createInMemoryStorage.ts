import { Query } from '../query/interfaces';
import { StoreOperation, CrudOptions, StoreOptions, UpdateResults } from '../store/createStore';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import Map from 'dojo-shim/Map';
import { Patch } from '../patch/createPatch';
import { duplicate } from 'dojo-core/lang';

export interface Storage<T, O extends CrudOptions> {
	identify(items: T[]|T): string[];
	createId(): Promise<string>;
	fetch(query?: Query<T>): Promise<T[]>;
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
	nextId?: number;
	data?: T[];
	index: Map<string, number>;
}

const instanceStateMap = new WeakMap<Storage<{}, {}>, InMemoryStorageState<{}>>();

export interface StorageFactory extends ComposeFactory<Storage<{}, {}>, StoreOptions<{}, CrudOptions>> {
	<T extends {}, O extends CrudOptions>(options?: O): Storage<T, O>;
}

export interface InMemoryStorageFactory extends StorageFactory {
	<T>(options?: StoreOptions<T, CrudOptions>): Storage<T, CrudOptions>;
}

type IdObject = { [ index: string ]: string; id: string };

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
		const state = instanceStateMap.get(this);
		return Promise.resolve(String(state.nextId++));
	},

	fetch(this: Storage<{}, {}>, query?: Query<{}>): Promise<{}[]> {
		const state = instanceStateMap.get(this);
		const data = state.data || [];
		return Promise.resolve((query ? query.apply(data) : data).slice());
	},

	get(this: Storage<{}, {}>, ids: string[]): Promise<{}[]> {
		const state = instanceStateMap.get(this);
		const data = state.data || [];
		const objects: {}[] = [];
		return Promise.resolve(ids.reduce(function(prev, next) {
			return state.index.has(next) ? prev.concat( data[state.index.get(next)!] ) : prev;
		}, objects));
	},

	put(this: Storage<{}, {}>, items: {}[], options?: CrudOptions): Promise<UpdateResults<{}>> {
		const state = instanceStateMap.get(this);
		const ids = this.identify(items);

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
			return Promise.reject(new Error('Objects already exist in store'));
		}

		const data = state.data || (state.data = []);
		updatedItems.forEach(function(item, index) {
			data[oldIndices[index]] = item;
		});
		newItems.forEach(function(item, index) {
			state.index.set(newIds[index], data.push(item) - 1);
		});

		return Promise.resolve({
			successfulData: items,
			type: StoreOperation.Put
		});
	},

	add(this: Storage<{}, {}>, items: {}[], options?: CrudOptions): Promise<UpdateResults<{}>> {
		options = options || {};
		if (typeof options.rejectOverwrite === 'undefined') {
			options.rejectOverwrite = true;
		}
		return this.put(items, options).then(function(result) {
			result.type = StoreOperation.Add;
			return result;
		});
	},

	delete(this: Storage<{}, {}>, ids: string[]): Promise<UpdateResults<{}>> {
		const state = instanceStateMap.get(this);
		const data = state.data || [];
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

		return Promise.resolve({
			successfulData: idsToRemove,
			type: StoreOperation.Delete
		});
	},

	patch(this: Storage<{}, {}>, updates: { id: string; patch: Patch<{}, {}> }[]): Promise<UpdateResults<{}>> {
		const state = instanceStateMap.get(this);
		const data = state.data || (state.data = []);

		const filteredUpdates = updates.filter(function(update) {
			return state.index.has(update.id);
		});
		const oldIndices = filteredUpdates.map(function(update) {
			return state.index.get(update.id)!;
		});

		// If there is a source, the data has already been patched so we only need to sort it
		try {
			const updatedItems = filteredUpdates.map(function(update, index) {
				const item = duplicate(data[oldIndices[index]]);
				const updatedItem = update.patch.apply(item);
				data[oldIndices[index]] = updatedItem;
				return updatedItem;
			});

			return Promise.resolve({
				successfulData: updatedItems,
				type: StoreOperation.Patch
			});
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
		nextId: 1,
		index: new Map<string, number>(),
		idProperty: options.idProperty,
		idFunction: options.idFunction
	});
});

export default createInMemoryStorage;
