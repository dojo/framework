import { SubcollectionStore, SubcollectionOptions } from '../createSubcollectionStore';
import { CrudOptions, Store } from '../createStore';
import { UpdateResults } from '../../storage/createInMemoryStorage';
import { ObservableStore, ItemUpdate, StoreDelta } from './createObservableStoreMixin';
import { Observable, Observer } from 'rxjs';
import { ComposeMixinDescriptor } from 'dojo-compose/compose';
import { after } from 'dojo-compose/aspect';
import Map from 'dojo-shim/Map';
import WeakMap from 'dojo-shim/WeakMap';
import { Query } from '../../query/createQuery';

export interface TrackedStoreDelta<T> extends StoreDelta<T> {
	removedFromTracked: { item: T; id: string; previousIndex: number; }[];
	addedToTracked: { item: T; id: string; index: number; }[];
	movedInTracked: { item: T; id: string; previousIndex: number; index: number }[];
}

export interface TrackedObservableStoreMixin<T> {
	observe(): Observable<TrackedStoreDelta<T>>;
}

export interface TrackableMixin<T, O extends CrudOptions, U extends UpdateResults<T>, C extends ObservableStore<T, O, U>> {
	track(): TrackedObservableStoreMixin<T> & C & this;
	release(): ObservableStore<T, O, U> & C & this;
}

export type TrackableStore<T, O extends CrudOptions, U extends UpdateResults<T>, C extends ObservableStore<T, O, U>> = TrackableMixin<T, O, U, C> & C;

export interface TrackableOptions<T> {
	isTracking?: boolean;
	sourceQuery?: Query<T, T>;
	fetchAroundUpdates?: boolean;
	wasFetchingAroundUpdates?: boolean;
}
interface TrackableState<T> {
	isTracking: boolean;
	localData: T[];
	idToIndex: Map<string, number>;
	observable?: Observable<TrackedStoreDelta<T>>;
	observers: Observer<TrackedStoreDelta<T>>[];
	toRemoveIndices: number[];
	sourceQuery?: Query<T, T>;
	fetchAroundUpdates?: boolean;
	wasFetchingAroundUpdates?: boolean;
}

const instanceStateMap = new WeakMap<TrackableStore<any, any, any, any>, TrackableState<any>>();

interface TrackableSubCollection<
	T, O extends CrudOptions, U extends UpdateResults<T>, C extends ObservableStore<T, O, U>
> extends ObservableStore<T, O, U>, SubcollectionStore<T, O, U, C>, TrackableMixin<T, O, U, C> {}

function buildTrackedUpdate<T, O extends CrudOptions, U extends UpdateResults<T>>(state: TrackableState<T>, store: Store<T, O, U>) {
	return function(update: StoreDelta<T>) {
		const removedFromTracked: { item: T; id: string; previousIndex: number; }[] = [];
		const addedToTracked: { item: T; id: string; index: number; }[] = [];
		const movedInTracked: { item: T; id: string; previousIndex: number; index: number }[] = [];

		// Handle deletes
		let deletedIndices: number[] = [];
		const trackedDeletes = update.deletes.filter(function(id) {
			if (state.idToIndex.has(id)) {
				const index = state.idToIndex.get(id);
				deletedIndices.push(index);
				removedFromTracked.push({
					item: state.localData[index],
					id: id,
					previousIndex: index
				});
				state.idToIndex.delete(id);
				return true;
			}
		});

		let newData: T[];

		if (update.afterAll) {
			newData = update.afterAll;
		}
		else {
			newData = state.localData.slice().concat(update.adds);

			store.identify(update.updates).forEach(function(id, index) {
				if (state.idToIndex.has(id)) {
					newData[state.idToIndex.get(id)] = update.updates[index];
				}
				else {
					newData.push(update.updates[index]);
				}
			});

			deletedIndices.sort().reverse().forEach(function(removeIndex) {
				newData.splice(removeIndex, 1);
			});
		}

		if (state.sourceQuery) {
			newData = state.sourceQuery.apply(newData);
		}
		const trackedUpdates: T[] = [];
		const trackedAdds: T[] = [];
		const newIndex = new Map<string, number>();
		const newIds = store.identify(newData);
		newIds.forEach(function(id, index) {
			newIndex.set(id, index);
		});

		const updateIds = store.identify(update.updates);

		updateIds.forEach(function(id, updateIndex) {
			if (!newIndex.has(id) && state.idToIndex.has(id)) {
				trackedUpdates.push(update.updates[updateIndex]);
				const index = state.idToIndex.get(id);
				removedFromTracked.push({
					item: update.updates[updateIndex],
					previousIndex: index,
					id: id
				});
			}
			else if (newIndex.has(id) && state.idToIndex.has(id)) {
				trackedUpdates.push(update.updates[updateIndex]);
				const previouxIndex = state.idToIndex.get(id);
				const index = newIndex.get(id);
				movedInTracked.push({
					item: newData[index],
					id: id,
					previousIndex: previouxIndex,
					index: index
				});
			}
		});

		const updateAndAddIds = updateIds.concat(store.identify(update.adds));
		updateAndAddIds.forEach(function(id, itemIndex) {
			if (newIndex.has(id) && !state.idToIndex.has(id)) {
				if (itemIndex < update.updates.length) {
					trackedUpdates.push(update.updates[itemIndex]);
				}
				else {
					trackedAdds.push(update.adds[itemIndex - update.updates.length]);
				}
				trackedAdds.push();
				const index = newIndex.get(id);
				addedToTracked.push({
					item: newData[index],
					id: id,
					index: index
				});
			}
		});

		// Check for items pushed into or out of range
		newIds.forEach((id, index) => {
			if (!state.idToIndex.has(id) && updateAndAddIds.indexOf(id) < 0) {
				addedToTracked.push({
					item: newData[index],
					id: id,
					index: newIndex.get(id)
				});
			}
		});

		store.identify(state.localData).forEach((id, index) => {
			if (!newIndex.has(id) && trackedDeletes.indexOf(id) < 0 && updateAndAddIds.indexOf(id) < 0) {
				removedFromTracked.push({
					item: state.localData[index],
					id: id,
					previousIndex: index
				});
			}
		});

		const trackedUpdate: TrackedStoreDelta<T> = {
			beforeAll: state.localData,
			afterAll: newData,
			updates: trackedUpdates,
			adds: trackedAdds,
			deletes: trackedDeletes,
			removedFromTracked: removedFromTracked,
			movedInTracked: movedInTracked,
			addedToTracked: addedToTracked
		};

		// Don't send an update if nothing happened withing the scope of this tracked.
		if (trackedUpdates.length || trackedAdds.length || trackedDeletes.length || removedFromTracked.length ||
			movedInTracked.length || addedToTracked.length
		) {
			state.localData = newData;
			state.idToIndex = newIndex;
			state.observers.forEach(function(observer) {
				observer.next(trackedUpdate);
			});

			state.toRemoveIndices.sort().reverse().forEach(function(index) {
				state.observers.splice(index, 1);
			});

			state.toRemoveIndices = [];
		}
	};
}

function createTrackableMixin<T, O extends CrudOptions, U extends UpdateResults<T>, C extends ObservableStore<T, O, U>>(): ComposeMixinDescriptor<
	ObservableStore<T, O, U> & SubcollectionStore<T, O, U, any>,
	SubcollectionOptions<T, O, U>,
	TrackableMixin<T, O, U, C>,
	TrackableOptions<T>
> {
	const TrackableMixin: TrackableMixin<T, O, U, C> = {
		track(this: TrackableSubCollection<T, O, U, TrackedObservableStoreMixin<T> & C>) {
			const state = instanceStateMap.get(this);
			return this.createSubcollection({
				isTracking: true,
				fetchAroundUpdates: !state.sourceQuery || !state.sourceQuery.incremental,
				wasFetchingAroundUpdates: state.fetchAroundUpdates || state.wasFetchingAroundUpdates
			});
		},

		release(this: TrackableSubCollection<T, O, U, C>) {
			const state = instanceStateMap.get(this);
			return this.createSubcollection({
				isTracking: false,
				fetchAroundUpdates: state.wasFetchingAroundUpdates,
				wasFetchingAroundUpdates: state.wasFetchingAroundUpdates
			});
		}
	};
	return {
		mixin: TrackableMixin,
		initialize: function(instance: TrackableSubCollection<T, O, U, C>, options?: TrackableOptions<T>) {
			options = options || {};
			instanceStateMap.set(instance, {
				isTracking: Boolean(options.isTracking),
				sourceQuery: options.sourceQuery,
				localData: [],
				idToIndex: new Map<string, number>(),
				observers: [],
				toRemoveIndices: [],
				fetchAroundUpdates: options.fetchAroundUpdates,
				wasFetchingAroundUpdates: options.wasFetchingAroundUpdates
			});

			const state = instanceStateMap.get(instance);
			if (options.isTracking && instance.source) {
				instance.fetch().then(function(data) {
					state.localData = data;
					instance.identify(data).forEach(function(id, index) {
						state.idToIndex.set(id, index);
					});
				});

				state.observable = new Observable<TrackedStoreDelta<T>>(function(observer: Observer<TrackedStoreDelta<T>>) {
					state.observers.push(observer);
					return () => {
						return state.toRemoveIndices.push(state.observers.indexOf(observer));
					};
				}.bind(instance));

				instance.source.observe().subscribe(buildTrackedUpdate(state, instance));
			}

			const subcollectionStore = <SubcollectionStore<any, any, any, any>> <any> instance;
			subcollectionStore.getOptions = after(
				subcollectionStore.getOptions,
				function(this: any, options?: { fetchAroundUpdates?: boolean }) {
					const state = instanceStateMap.get(this);
					options.fetchAroundUpdates = state.fetchAroundUpdates || state.wasFetchingAroundUpdates;

					return options;
				}
			);
		},
		aspectAdvice: {
			around: {
				observe(observe: (idOrIds?: string | string[]) => Observable<StoreDelta<T>> | Observable<ItemUpdate<T>>) {
					return function(this: TrackableSubCollection<T, O, U, C>, idOrIds?: string | string[]) {
						if (idOrIds || !instanceStateMap.get(this).isTracking) {
							return observe.call(this, idOrIds);
						}
						else {
							return instanceStateMap.get(this).observable;
						}
					};
				}
			}
		}
	};
}

export default createTrackableMixin;
