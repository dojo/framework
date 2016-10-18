import { SubcollectionStore, SubcollectionOptions } from '../createSubcollectionStore';
import { CrudOptions, Store } from '../createStore';
import { UpdateResults } from '../../storage/createInMemoryStorage';
import { ObservableStore, ItemUpdate, StoreDelta } from './createObservableStoreMixin';
import { Observable, Observer } from 'rxjs';
import { ComposeMixinDescriptor } from 'dojo-compose/compose';
import Map from 'dojo-shim/Map';
import WeakMap from 'dojo-shim/WeakMap';
import Promise from 'dojo-shim/Promise';
import {Query} from '../../query/createQuery';

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
}
interface TrackableState<T> {
	isTracking: boolean;
	localData: T[];
	idToIndex: Map<string, number>;
	observable?: Observable<TrackedStoreDelta<T>>;
	observers: Observer<TrackedStoreDelta<T>>[];
	toRemoveIndices: number[];
	sourceQuery?: Query<T, T>;
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

		let newDataPromise: Promise<T[]>;

		if (update.afterAll) {
			newDataPromise = Promise.resolve(
				state.sourceQuery ? state.sourceQuery.apply(update.afterAll) : update.afterAll
			);
		}
		else if (state.sourceQuery && !state.sourceQuery.incremental) {
			newDataPromise = store.fetch();
		}
		else {
			let newData = state.localData.slice().concat(update.adds);

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

			if (state.sourceQuery) {
				newDataPromise = Promise.resolve(state.sourceQuery.apply(newData));
			}
		}

		newDataPromise.then(function(newData) {
			const trackedUpdates: T[] = [];
			const trackedAdds: T[] = [];
			const newIndex = new Map<string, number>();
			store.identify(newData).forEach(function(id, index) {
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
		});
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
			return this.createSubcollection({
				isTracking: true
			});
		},

		release(this: TrackableSubCollection<T, O, U, C>) {
			return this.createSubcollection({
				isTracking: false
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
				toRemoveIndices: []
			});

			if (options.isTracking && instance.source) {
				const state = instanceStateMap.get(instance);
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
