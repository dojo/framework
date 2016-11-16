import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from 'dojo-shim/Promise';
import { StoreOptions, CrudOptions, UpdateResults } from '../../../../src/store/createStore';
import createTrackableMixin, {
	TrackableOptions, TrackableMixin,
	TrackedObservableStoreMixin
} from '../../../../src/store/mixins/createTrackableMixin';
import createQueryMixin, { QueryMixin, QueryOptions } from '../../../../src/store/mixins/createQueryMixin';
import { ComposeFactory } from 'dojo-compose/compose';
import createSubcollectionStore from '../../../../src/store/createSubcollectionStore';
import createObservableStoreMixin from '../../../../src/store/mixins/createObservableStoreMixin';
import { ItemType, createData, createUpdates } from '../../support/createData';
import { ObservableStore } from '../../../../src/store/mixins/createObservableStoreMixin';
import { SubcollectionStore } from '../../../../src/store/createSubcollectionStore';
import { ObservableStoreOptions } from '../../../../src/store/mixins/createObservableStoreMixin';
import createOrderedOperationMixin from '../../../../src/store/mixins/createOrderedOperationMixin';
import createAsyncStorage from '../../support/AsyncStorage';

interface TrackableObservableQueryStore<T, O extends CrudOptions, U extends UpdateResults<T>> extends
	ObservableStore<T, O, U>,
	SubcollectionStore<T, O, U, ObservableStore<T, O, U>>,
	QueryMixin<T, O, U, ObservableStore<T, O, U>>,
	TrackableMixin<T, O, U, ObservableStore<T, O, U>> {
}

type TrackableQueryOptions<T, O extends CrudOptions> =
	TrackableOptions<T> & StoreOptions<T, CrudOptions> & QueryOptions<T> & ObservableStoreOptions<T, O>;

interface TrackableQueryStoreFactory extends ComposeFactory<TrackableObservableQueryStore<{}, {}, any>, TrackableQueryOptions<{}, {}>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: TrackableQueryOptions<T, O>): TrackableObservableQueryStore<T, O, U>;
}

registerSuite(function() {
	let createTrackableQueryStore = createSubcollectionStore
		.mixin(createOrderedOperationMixin())
		.mixin(createObservableStoreMixin())
		.mixin(createQueryMixin())
		.mixin(createTrackableMixin()) as TrackableQueryStoreFactory;
	let trackableQueryStore: TrackableObservableQueryStore<ItemType, TrackableOptions<ItemType>, UpdateResults<ItemType>>;
	function testObservableStore(
		store: ObservableStore<ItemType, CrudOptions, UpdateResults<ItemType>>,
		dfd: any,
		isFetching = true,
		errorMessage?: string
	) {
		return new Promise(resolve => {
			let firstUpdate = true;
			let resolved = false;
			store.observe().subscribe(update => {
				try {
					if (isFetching) {
						assert.ok(update.beforeAll, 'Didn\'t have before all property');
						assert.ok(update.afterAll, 'Didn\'t have after all property');
					} else {
						assert.notOk(update.beforeAll, 'Had before all property');
						assert.notOk(update.afterAll, 'Had after all property');
					}
					if (firstUpdate) {
						firstUpdate = false;
					}
					else if (!resolved) {
						resolved = true;
						resolve();
					}
				} catch (error) {
					if (errorMessage) {
						dfd.reject(Error(errorMessage));
					}
					else {
						dfd.reject(error);
					}
				}
			});

			store.delete(['1', '2', '3', 'new', 'ignored']);
			store.add(createData());
		});
	}
	function testFetchingQueryStore(
		trackedCollection: TrackedObservableStoreMixin<ItemType> & TrackableObservableQueryStore<
			ItemType,
			TrackableOptions<ItemType>,
			UpdateResults<ItemType>
		>,
		dfd: any,
		errorMessage?: string
	) {
		return new Promise(function(resolve) {
			let notifiedOnDelete = false;
			let notifiedOnAddition = false;
			let notifiedOnUpdateIntoCollection = false;
			let notifiedOnMoveInCollection = false;

			trackedCollection.observe().subscribe(function(update) {
				try {
					if (!notifiedOnDelete) {
						assert.equal(update.removedFromTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.removedFromTracked[0], {
							previousIndex: 0,
							item: { id: '2', value: 2, nestedProperty: { value: 2 } },
							id: '2'
						}, 'Didn\'t send proper delete notification');
						assert.deepEqual(update.beforeAll, [
							{ id: '2', value: 2, nestedProperty: { value: 2 } },
							{ id: '3', value: 3, nestedProperty: { value: 1 } }
						], 'Didn\'t have proper starting data');
						assert.deepEqual(update.afterAll, [
							{ id: '3', value: 3, nestedProperty: { value: 1 } }
						], 'Didn\'t have proper ending data');
						notifiedOnDelete = true;
					}
					else if (!notifiedOnAddition) {
						assert.equal(update.addedToTracked.length, 1, 'Had wrong number of additions');
						assert.deepEqual(update.addedToTracked[0], {
							index: 1,
							item: { id: 'new', value: 10, nestedProperty: { value: 10 } },
							id: 'new'
						}, 'Didn\'t send correct update for added item');
						assert.deepEqual(update.beforeAll, [
							{ id: '3', value: 3, nestedProperty: { value: 1 } }
						], 'Didn\'t have proper starting data');
						assert.deepEqual(update.afterAll, [
							{ id: '3', value: 3, nestedProperty: { value: 1 } },
							{ id: 'new', value: 10, nestedProperty: { value: 10 } }
						], 'Didn\'t have proper ending data');
						notifiedOnAddition = true;
					}
					else if (!notifiedOnUpdateIntoCollection) {
						assert.equal(update.addedToTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.addedToTracked[0], {
							index: 1,
							item: { id: 'ignored', value: 5, nestedProperty: { value: 5 } },
							id: 'ignored'
						}, 'Didn\'t send correct update for item moved into tracking by update');
						assert.deepEqual(update.beforeAll, [
							{ id: '3', value: 3, nestedProperty: { value: 1 } },
							{ id: 'new', value: 10, nestedProperty: { value: 10 } }
						], 'Didn\'t have proper starting data');
						assert.deepEqual(update.afterAll, [
							{ id: '3', value: 3, nestedProperty: { value: 1 } },
							{ id: 'ignored', value: 5, nestedProperty: { value: 5 } },
							{ id: 'new', value: 10, nestedProperty: { value: 10 } }
						], 'Didn\'t have proper ending data');
						notifiedOnUpdateIntoCollection = true;
					}
					else if (!notifiedOnMoveInCollection) {
						assert.equal(update.movedInTracked.length, 1, 'Had wrong number of  updates');
						assert.deepEqual(update.movedInTracked[0], {
							index: 1,
							previousIndex: 2,
							item: { id: 'new', value: 4, nestedProperty: { value: 10 }},
							id: 'new'
						}, 'Didn\'t send correct update for item moved within tracking');
						assert.deepEqual(update.beforeAll, [
							{ id: '3', value: 3, nestedProperty: { value: 1 } },
							{ id: 'ignored', value: 5, nestedProperty: { value: 5 } },
							{ id: 'new', value: 10, nestedProperty: { value: 10 } }
						], 'Didn\'t have proper starting data');
						assert.deepEqual(update.afterAll, [
							{ id: '3', value: 3, nestedProperty: { value: 1 } },
							{ id: 'new', value: 4, nestedProperty: { value: 10 }},
							{ id: 'ignored', value: 5, nestedProperty: { value: 5 } }
						], 'Didn\'t have proper ending data');
						notifiedOnMoveInCollection = true;
						resolve();
					}
				} catch (error) {
					if (errorMessage) {
						dfd.reject(Error(errorMessage));
					}
					else {
						dfd.reject(error);
					}
				}
			});

			trackableQueryStore.delete('2');
			trackableQueryStore.add({ id: 'new', value: 10, nestedProperty: { value: 10 }});
			// Shouldn't create a notification
			trackableQueryStore.add({ id: 'ignored', value: -1, nestedProperty: { value: -1 } });
			// Should have no effect, release doesn't occur in place
			trackableQueryStore = trackableQueryStore.release();
			trackableQueryStore.put({
				id: 'ignored',
				value: 5,
				nestedProperty: {
					value: 5
				}
			});
			trackableQueryStore.put({
				id: 'new',
				value: 4,
				nestedProperty: {
					value: 10
				}
			});
		});
	}

	return {
		name: 'createTrackableMixin',
		beforeEach: function() {
			trackableQueryStore = createTrackableQueryStore({
				data: createData()
			});
		},

		'alternate query and release': function(this: any) {
			const dfd = this.async(1000);
			const trackedCollection = trackableQueryStore
				.filter(function(item) {
					return item.value > 1;
				})
				.sort('value')
				.track();

			let notifiedOnDelete = false;
			let notifiedOnAddition = false;
			let notifiedOnUpdateIntoCollection = false;
			let notifiedOnMoveInCollection = false;

			const subscription = trackedCollection.observe().subscribe(function(update) {
				try {
					if (!notifiedOnDelete) {
						assert.equal(update.removedFromTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.removedFromTracked[0], {
							previousIndex: 0,
							item: { id: '2', value: 2, nestedProperty: { value: 2 } },
							id: '2'
						}, 'Didn\'t send proper delete notification');
						notifiedOnDelete = true;
					}
					else if (!notifiedOnAddition) {
						assert.equal(update.addedToTracked.length, 1, 'Had wrong number of additions');
						assert.deepEqual(update.addedToTracked[0], {
							index: 1,
							item: { id: 'new', value: 10, nestedProperty: { value: 10 } },
							id: 'new'
						}, 'Didn\'t send correct update for added item');
						notifiedOnAddition = true;
					}
					else if (!notifiedOnUpdateIntoCollection) {
						assert.equal(update.addedToTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.addedToTracked[0], {
							index: 1,
							item: { id: 'ignored', value: 5, nestedProperty: { value: 5 } },
							id: 'ignored'
						}, 'Didn\'t send correct update for item moved into tracking by update');
						notifiedOnUpdateIntoCollection = true;
					}
					else if (!notifiedOnMoveInCollection) {
						assert.equal(update.movedInTracked.length, 1, 'Had wrong number of  updates');
						assert.deepEqual(update.movedInTracked[0], {
							index: 1,
							previousIndex: 2,
							item: { id: 'new', value: 4, nestedProperty: { value: 10 }},
							id: 'new'
						}, 'Didn\'t send correct update for item moved within tracking');
						notifiedOnMoveInCollection = true;
					}
					else {
						assert.equal(update.removedFromTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.removedFromTracked[0], {
							previousIndex: 1,
							item: { id: 'new', value: -1, nestedProperty: { value: -1 } },
							id: 'new'
						}, 'Didn\'t send proper delete notification');

						subscription.unsubscribe();
						dfd.resolve();
					}
				} catch (error) {
					dfd.reject(error);
				}
			});

			trackableQueryStore.delete('2');
			trackableQueryStore.add({ id: 'new', value: 10, nestedProperty: { value: 10 }});
			trackableQueryStore.add({ id: 'ignored', value: -1, nestedProperty: { value: -1 } });
			trackableQueryStore.put({
				id: 'ignored',
				value: 5,
				nestedProperty: {
					value: 5
				}
			});
			trackableQueryStore.put({
				id: 'new',
				value: 4,
				nestedProperty: {
					value: 10
				}
			});
			trackableQueryStore.put({
				id: 'new',
				value: -1,
				nestedProperty: {
					value: -1
				}
			});
		},

		'alternate query and release with fetch around update': function(this: any) {
			const dfd = this.async(1000);
			trackableQueryStore = createTrackableQueryStore({
				data: createData(),
				fetchAroundUpdates: true
			});
			const trackedCollection = trackableQueryStore
				.filter(function(item) {
					return item.value > 1;
				})
				.sort('value')
				.track();
			testFetchingQueryStore(trackedCollection, dfd).then(dfd.resolve);
		},

		'fetchAroundUpdates should be maintained across tracking, releasing, and querying': {
			'fetchAroundUpdates = true'(this: any) {
				const dfd = this.async(1000);
				trackableQueryStore = createTrackableQueryStore({
					data: createData(),
					fetchAroundUpdates: true
				});
				let trackedCollection = trackableQueryStore
					.filter(item => {
						return item.value > 1;
					})
					.sort('value')
					.track();
				testFetchingQueryStore(trackedCollection, dfd, 'Starting').then(() => {
					return testObservableStore(trackedCollection.release(), dfd, true, 'Starting observed');
				}).then(() => {
					trackedCollection = trackedCollection
						.release()
						.filter(item => {
							return item.value > 1;
						})
						.track();
					return testFetchingQueryStore(trackedCollection, dfd, 'Released fetching');
				}).then(() => {
					return testObservableStore(trackedCollection.release(), dfd, true, 'Released observed');
				}).then(() => {
					trackedCollection = trackedCollection
						.release()
						.release()
						.track()
						.track();
					return testFetchingQueryStore(trackedCollection, dfd, 'Back to back calls fetching');
				}).then(() => {
					return testObservableStore(trackedCollection.release(), dfd, true, 'Back to back calls observed');
				}).then(() => {
					trackedCollection = trackedCollection
						.range(0, 100)
						.track();
					return testFetchingQueryStore(trackedCollection, dfd, 'Range fetching');
				}).then(() => {
					return testObservableStore(trackedCollection.release(), dfd, true, 'Range observed');
				}).then(() => {
					trackedCollection = trackedCollection
						.release()
						.range(0, 100)
						.track();
					return testFetchingQueryStore(trackedCollection, dfd, 'Released Range fetching');
				}).then(() => {
					return testObservableStore(trackedCollection.release(), dfd, true, 'Released Range observed');
				}).then(dfd.resolve);
			},

			'fetchAroundUpdates = false'(this: any) {
				const dfd = this.async(1000);
				trackableQueryStore = createTrackableQueryStore({
					data: createData(),
					fetchAroundUpdates: false
				});
				let trackedCollection = trackableQueryStore
					.filter(item => {
						return item.value > 1;
					})
					.sort('value')
					.track();
				testFetchingQueryStore(trackedCollection, dfd, 'Starting').then(() => {
					return testObservableStore(trackedCollection.release(), dfd, false, 'Starting observed');
				}).then(() => {
					trackedCollection = trackedCollection
						.release()
						.filter(item => {
							return item.value > 1;
						})
						.track();
					return testFetchingQueryStore(trackedCollection, dfd, 'Released fetching');
				}).then(() => {
					return testObservableStore(trackedCollection.release(), dfd, false, 'Released observed');
				}).then(() => {
					trackedCollection = trackedCollection
						.release()
						.release()
						.track()
						.track();
					return testFetchingQueryStore(trackedCollection, dfd, 'Back to back calls fetching');
				}).then(() => {
					return testObservableStore(trackedCollection.release(), dfd, false, 'Back to back calls observed');
				}).then(() => {
					trackedCollection = trackedCollection
						.range(0, 100)
						.track();
					return testFetchingQueryStore(trackedCollection, dfd, 'Range fetching');
				}).then(() => {
					return testObservableStore(trackedCollection.release(), dfd, false, 'Range observed');
				}).then(() => {
					trackedCollection = trackedCollection
						.release()
						.range(0, 100)
						.track();
					return testFetchingQueryStore(trackedCollection, dfd, 'Released Range fetching');
				}).then(() => {
					return testObservableStore(trackedCollection.release(), dfd, false, 'Released Range observed');
				}).then(dfd.resolve);
			}
		},

		'tracking with a range query': {
			'full range'(this: any) {
				const dfd = this.async(1000);
				trackableQueryStore = createTrackableQueryStore({
					data: createData(),
					fetchAroundUpdates: true
				});
				const trackedCollection = trackableQueryStore
					.filter(function(item) {
						return item.value > 1;
					})
					.sort('value')
					.range(0, 100)
					.track();
				testFetchingQueryStore(trackedCollection, dfd).then(dfd.resolve);
			},
			'full range, not initially fetching around updates'(this: any) {
				const dfd = this.async(1000);
				trackableQueryStore = createTrackableQueryStore({
					data: createData()
				});
				const trackedCollection = trackableQueryStore
					.filter(function(item) {
						return item.value > 1;
					})
					.sort('value')
					.range(0, 100)
					.track();
				testFetchingQueryStore(trackedCollection, dfd).then(dfd.resolve);
			},
			'item pushed into collection'(this: any)	{
				const dfd = this.async(1000);
				trackableQueryStore = createTrackableQueryStore({
					data: createData(),
					fetchAroundUpdates: true
				});
				const trackedCollection = trackableQueryStore
					.sort('value')
					.range(1, 2)
					.track();

				trackedCollection.observe().subscribe(function(update) {
					try {
						assert.equal(update.removedFromTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.removedFromTracked[0], {
							previousIndex: 1,
							item: { id: '3', value: 3, nestedProperty: { value: 1 } },
							id: '3'
						}, 'Didn\'t send proper delete notification');
						assert.equal(update.addedToTracked.length, 1, 'Had wrong number of additions');
						assert.deepEqual(update.addedToTracked[0], {
							index: 0,
							item: { id: '1', value: 1, nestedProperty: { value: 3 } },
							id: '1'
						}, 'Didn\'t send correct update for added item');
						dfd.resolve();
					} catch (error) {
						dfd.reject(error);
					}
				});
				trackableQueryStore.put({
					id: '0',
					value: 0,
					nestedProperty: { value: 10 }
				});
			}
		},

		'should be able to tracking a store without a query': function(this: any) {
			const dfd = this.async(1000);
			let firstUpdate = true;

			trackableQueryStore.track().observe().subscribe(update => {
				try {
					if (firstUpdate) {
						firstUpdate = false;
						assert.deepEqual(update.deletes, [ '1' ], 'Should contain ID of deleted item');
					}
					else {
						assert.deepEqual(update.adds, [ createData()[0] ], 'Should contain added item');
						dfd.resolve();
					}
				} catch (error) {
					dfd.reject(error);
				}
			});
			trackableQueryStore.delete('1');
			trackableQueryStore.add(createData()[0]);
		},

		'add data after initialization': function(this: any) {
			const dfd = this.async(1000);
			trackableQueryStore = createTrackableQueryStore<ItemType, CrudOptions, UpdateResults<ItemType>>();
			trackableQueryStore.track().observe().subscribe(update => {
				try {
					assert.deepEqual(update.adds, createData(), 'Should contain added items');
					dfd.resolve();
				} catch (error) {
					dfd.reject(error);
				}
			});
			trackableQueryStore.add(createData());
		},
		'async storage': {
			'tracked subcollection async operations should be done in the order specified by the user.'(this: any) {
				const dfd = this.async(1000);
				const trackableQueryStore = createTrackableQueryStore({
					storage: createAsyncStorage()
				});

				const trackedCollection = trackableQueryStore
					.filter(function(item: ItemType) {
						return item.value > 1;
					})
					.sort('value')
					.track();

				const updates = createUpdates();

				trackedCollection.add(createData()).then(function(result) {
					assert.deepEqual(result, createData(), 'should have returned all added items');
					return trackedCollection.put(updates[0]);
				}).then(function(result) {
					assert.deepEqual(result, updates[0], 'should have returned all updated items');
					return trackedCollection.delete(['2']);
				}).then(function(result) {
					assert.deepEqual(result, ['2'], 'should have returned all deleted ids');
					return trackedCollection.fetch();
				}).then(function(result) {
					assert.deepEqual(result, [ updates[0][0], updates[0][2] ], 'should have returned all filtered items');
				}).then(dfd.resolve);
			},

			'tracked collection should filter out items that are not being tracked'(this: any) {
				const dfd = this.async(1000);
				const trackableQueryStore = createTrackableQueryStore({
					storage: createAsyncStorage()
				});
				const data = createData();

				const trackedCollection = trackableQueryStore
					.filter(function(item: ItemType) {
						return item.value > 1;
					})
					.sort('value')
					.track();

				let count = 0;
				trackedCollection.observe().subscribe(function(update: any) {
					count++;

					if (count === 1) {
						assert.deepEqual(update.adds, [ data[1], data[2] ]);
					}
					else if (count === 2) {
						assert.deepEqual(update.deletes, [ '2' ]);
						dfd.resolve();
					}
				});
				trackedCollection.add(createData());
				trackedCollection.delete(['1', '2']);
			},

			'ordered mixin should queue up operations in the order they are called, regardless of the behavior of the async storage'(this: any) {
				const dfd = this.async(1000);
				const trackableQueryStore = createTrackableQueryStore({
					storage: createAsyncStorage({ fetch: 10, delete: 20, put: 30 })
				});

				const trackedCollection = trackableQueryStore
					.filter(function(item: ItemType) {
						return item.value > 1;
					})
					.sort('value')
					.track();

				trackedCollection.add(createData());
				trackedCollection.put(createUpdates()[0]);
				trackedCollection.delete(['1', '2']);
				// fetch still got executed last, even if it takes the least amount of time
				trackedCollection.fetch()
					.then(function(result) {
						assert.deepEqual(result, [ createUpdates()[0][2] ]);
					})
					.then(dfd.resolve);
			}
		}
	};
});
