import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { createData, ItemType, createUpdates } from '../../../support/createData';
import { ObservableStore } from '../../../../../src/store/mixins/createObservableStoreMixin';
import { CrudOptions } from '../../../../../src/store/createStore';
import { UpdateResults } from '../../../../../src/store/createStore';
import { QueryStore, createQueryStore } from '../../../../../src/store/mixins/createQueryTransformMixin';
import { TrackableStoreDelta, MappedQueryTransformResult } from '../../../../../src/store/createQueryTransformResult';
import Promise from '@dojo/shim/Promise';
import createFilter from '../../../../../src/query/createFilter';

registerSuite(function() {
	let trackableQueryStore: QueryStore<ItemType, ObservableStore<ItemType, CrudOptions, UpdateResults<ItemType>>>;

	function testFetchingQueryStore(
		trackedCollection: QueryStore<ItemType, ObservableStore<ItemType, CrudOptions, UpdateResults<ItemType>>>,
		trackResult: MappedQueryTransformResult<
			ItemType, QueryStore<ItemType, ObservableStore<ItemType, CrudOptions, UpdateResults<ItemType>>>
		>,
		dfd: any,
		isFetchingAroundUpdates = false
	) {
		return new Promise(function(resolve) {
			let ignoreFirst = true;
			trackResult
				.track()
				.observe()
				.subscribe(function(update) {
					try {
						if (ignoreFirst) {
							ignoreFirst = false;
							return;
						}
						if (isFetchingAroundUpdates) {
							isFetchingAroundUpdates = false;
							return;
						}
						// Check deleted item
						assert.equal(update.removedFromTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.removedFromTracked[0], {
							previousIndex: 0,
							item: { id: 'item-2', value: 2, nestedProperty: { value: 2 } },
							id: 'item-2'
						}, 'Didn\'t send proper delete notification');

						// Check added items
						assert.equal(update.addedToTracked.length, 2, 'Had wrong number of additions');
						assert.deepEqual(update.addedToTracked[0], {
							index: 1,
							item: { id: 'new', value: 4, nestedProperty: { value: 10 } },
							id: 'new'
						}, 'Didn\'t send correct update for added item');
						assert.deepEqual(update.addedToTracked[1], {
							index: 2,
							item: { id: 'ignored', value: 5, nestedProperty: { value: 5 } },
							id: 'ignored'
						}, 'Didn\'t send correct update for item moved into tracking by update');

						// Check moved item
						assert.equal(update.movedInTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.movedInTracked[0], {
							index: 0,
							previousIndex: 1,
							item: { id: 'item-3', value: 3, nestedProperty: { value: 1 }},
							id: 'item-3'
						}, 'Didn\'t send correct update for item moved within tracking');
						resolve();
					} catch (error) {
						dfd.reject(error);
					}
				});

			trackedCollection.delete('item-2');
			trackedCollection.add({ id: 'new', value: 10, nestedProperty: { value: 10 }});
			// Shouldn't create a notification
			trackedCollection.add({ id: 'ignored', value: -1, nestedProperty: { value: -1 } });
			trackedCollection.put({
				id: 'ignored',
				value: 5,
				nestedProperty: {
					value: 5
				}
			});
			trackedCollection.put({
				id: 'new',
				value: 4,
				nestedProperty: {
					value: 10
				}
			});
		});
	}
	function testFetchingQueryStoreWithDelayedOperations(
		trackedCollection: QueryStore<ItemType, ObservableStore<ItemType, CrudOptions, UpdateResults<ItemType>>>,
		trackResult: MappedQueryTransformResult<
			ItemType, QueryStore<ItemType, ObservableStore<ItemType, CrudOptions, UpdateResults<ItemType>>>
		>,
		dfd: any
	) {
		return new Promise(function(resolve) {
			let notifiedOnDelete = false;
			let notifiedOnAddition = false;
			let notifiedOnUpdateIntoCollection = false;
			let notifiedOnMoveInCollection = false;
			let ignoreFirst = true;

			trackResult
				.track()
				.observe()
				.subscribe(function(update) {
					try {
						if (ignoreFirst) {
							ignoreFirst = false;
						}
						else if (!notifiedOnDelete) {
							assert.equal(update.removedFromTracked.length, 1, 'Had wrong number of updates');
							assert.deepEqual(update.removedFromTracked[0], {
								previousIndex: 0,
								item: { id: 'item-2', value: 2, nestedProperty: { value: 2 } },
								id: 'item-2'
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
							assert.equal(update.movedInTracked.length, 2, 'Had wrong number of  updates');
							assert.deepEqual(update.movedInTracked[0], {
								index: 2,
								previousIndex: 1,
								item: { id: 'ignored', value: 5, nestedProperty: { value: 5 }},
								id: 'ignored'
							}, 'Didn\'t send correct update for item moved within tracking');
							assert.deepEqual(update.movedInTracked[1], {
								index: 1,
								previousIndex: 2,
								item: { id: 'new', value: 4, nestedProperty: { value: 10 }},
								id: 'new'
							}, 'Didn\'t send correct update for item moved within tracking');
							notifiedOnMoveInCollection = true;
							resolve();
						}
					} catch (error) {
						dfd.reject(error);
					}
			});

			trackedCollection.delete('item-2');
			setTimeout(() => {
				trackedCollection.add({ id: 'new', value: 10, nestedProperty: { value: 10 }});
				// Shouldn't create a notification
				trackedCollection.add({ id: 'ignored', value: -1, nestedProperty: { value: -1 } });
				setTimeout(() => {
					trackedCollection.put({
						id: 'ignored',
						value: 5,
						nestedProperty: {
							value: 5
						}
					});
					setTimeout(() => {
						trackedCollection.put({
							id: 'new',
							value: 4,
							nestedProperty: {
								value: 10
							}
						});
					}, 300);
				}, 300);
			}, 300);
		});
	}

	return {
		name: 'Query-Transform Mixin - Tracking',
		beforeEach: function() {
			trackableQueryStore = createQueryStore({
				data: createData()
			});
		},

		'updating in place': {
			'put()'(this: any) {
				const dfd = this.async(1000);
				const trackedCollection = trackableQueryStore
					.filter(function(item) {
						return item.value > 1;
					})
					.sort('value')
					.track();

				trackableQueryStore.put({
					id: 'item-1',
					value: 5,
					nestedProperty: {
						value: 5
					}
				});

				let ignoreFirst = true;
				trackedCollection.observe().subscribe((update: TrackableStoreDelta<ItemType>) => {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}
					try {
						assert.equal(update.removedFromTracked.length, 0, 'Shouldn\'t have any removals');
						assert.equal(update.addedToTracked.length, 1, 'Should have one addition');
						assert.equal(update.movedInTracked.length, 0, 'Shouldn\'t have any moves within tracked');

						assert.deepEqual(update.addedToTracked[0], {
							index: 2,
							item: {id: 'item-1', value: 5, nestedProperty: {value: 5}},
							id: 'item-1'
						});
					} catch (error) {
						dfd.reject(error);
					}
					dfd.resolve();
				});
			}
		},

		'not tracking or fetching with simple queries': function(this: any) {
			const dfd = this.async(1000);
			const trackedCollection = trackableQueryStore
				.filter(function(item) {
					return item.value > 1;
				})
				.sort('value')
				.track();

			let ignoreFirst = true;

			trackedCollection.observe().subscribe(function(update) {
				try {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}
					// Check deleted item
					assert.equal(update.removedFromTracked.length, 1, 'Had wrong number of updates');
					assert.deepEqual(update.removedFromTracked[0], {
						previousIndex: 0,
						item: { id: 'item-2', value: 2, nestedProperty: { value: 2 } },
						id: 'item-2'
					}, 'Didn\'t send proper delete notification');

					// Check added items
					assert.equal(update.addedToTracked.length, 1, 'Had wrong number of additions');
					assert.deepEqual(update.addedToTracked[0], {
						index: 1,
						item: { id: 'ignored', value: 5, nestedProperty: { value: 5 } },
						id: 'ignored'
					}, 'Didn\'t send correct update for item moved into tracking by update');

					// Check moved item
					assert.equal(update.movedInTracked.length, 1, 'Had wrong number of updates');
					assert.deepEqual(update.movedInTracked[0], {
						index: 0,
						previousIndex: 1,
						item: { id: 'item-3', value: 3, nestedProperty: { value: 1 }},
						id: 'item-3'
					}, 'Didn\'t send correct update for item moved within tracking');
					dfd.resolve();
				} catch (error) {
					dfd.reject(error);
				}
			});

			trackableQueryStore.delete('item-2');
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

		'tracking with a range query': {
			'full range'(this: any) {
				const dfd = this.async(1000);
				trackableQueryStore = createQueryStore({
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
				testFetchingQueryStore(trackableQueryStore, trackedCollection, dfd, true).then(dfd.resolve);
			},
			'releaseed with range query can\'t should only filter "afterAll"'(this: any) {
				const dfd = this.async(1000);
				const trackableQueryStore = createQueryStore<ItemType>();
				const untrackedCollection = trackableQueryStore.range(0, 1).track().release();
				const data = createData();

				let ignoreFirst = true;
				untrackedCollection.observe().subscribe(dfd.rejectOnError(({ adds, afterAll }: TrackableStoreDelta<ItemType>) => {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}

					assert.deepEqual(afterAll, [ data[0] ], 'Should have applied query to afterAll');
					assert.deepEqual(adds, data, 'Shouldn\'t have applied range query to adds');
					dfd.resolve();
				}));
				trackableQueryStore.add(data);

			},
			'full range - delay between operations'(this: any) {
				const dfd = this.async(5000);
				trackableQueryStore = createQueryStore({
					data: createData()
				});
				const trackedCollection = trackableQueryStore
					.filter(function(item) {
						return item.value > 1;
					})
					.sort('value')
					.range(0, 100)
					.track();
				testFetchingQueryStoreWithDelayedOperations(trackableQueryStore, trackedCollection, dfd).then(dfd.resolve);
			},
			'full range, not initially fetching around updates'(this: any) {
				const dfd = this.async(1000);
				trackableQueryStore = createQueryStore({
					data: createData()
				});
				const trackedCollection = trackableQueryStore
					.filter(function(item) {
						return item.value > 1;
					})
					.sort('value')
					.range(0, 100)
					.track();
				testFetchingQueryStore(trackableQueryStore, trackedCollection, dfd).then(dfd.resolve);
			},
			'item pushed into collection'(this: any)	{
				const dfd = this.async(1000);
				trackableQueryStore = createQueryStore({
					data: createData()
				});
				const trackedCollection = trackableQueryStore
					.sort('value')
					.range(1, 2)
					.track();

				let ignoreFirst = true;
				trackedCollection.observe().subscribe(function(update) {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}
					try {
						assert.equal(update.removedFromTracked.length, 1, 'Had wrong number of updates');
						assert.deepEqual(update.removedFromTracked[0], {
							previousIndex: 1,
							item: { id: 'item-3', value: 3, nestedProperty: { value: 1 } },
							id: 'item-3'
						}, 'Didn\'t send proper delete notification');
						assert.equal(update.addedToTracked.length, 1, 'Had wrong number of additions');
						assert.deepEqual(update.addedToTracked[0], {
							index: 0,
							item: { id: 'item-1', value: 1, nestedProperty: { value: 3 } },
							id: 'item-1'
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

		'should be able to track a store without a noop query': function(this: any) {
			const dfd = this.async(1000);
			let firstUpdate = true;
			const data = createData();
			trackableQueryStore.query(createFilter<ItemType>().custom(() => true)).track().observe().subscribe(update => {
				try {
					if (firstUpdate) {
						firstUpdate = false;
						assert.deepEqual(update.addedToTracked, [
							{
								id: 'item-1',
								index: 0,
								item: data[0]
							},
							{
								id: 'item-2',
								index: 1,
								item: data[1]
							},
							{
								id: 'item-3',
								index: 2,
								item: data[2]
							}
						], 'Should contain initial items');
					}
					else {
						assert.deepEqual(update, {
							addedToTracked: [],
							adds: [],
							afterAll: [ data[1], data[2], data[0] ],
							beforeAll: data,
							deletes: [],
							movedInTracked: [
								{
									id: 'item-1',
									previousIndex: 0,
									index: 2,
									item: data[0]
								},
								{
									id: 'item-2',
									previousIndex: 1,
									index: 0,
									item: data[1]
								},
								{
									id: 'item-3',
									previousIndex: 2,
									index: 1,
									item: data[2]
								}
							],
							removedFromTracked: [],
							updates: [
								data[0]
							]
						}, 'Wrong update for delete followed by addition');

						dfd.resolve();
					}
				} catch (error) {
					dfd.reject(error);
				}
			});
			trackableQueryStore.delete('item-1');
			trackableQueryStore.add(createData()[0]);
		},

		'add data after initialization': function(this: any) {
			const dfd = this.async(1000);
			trackableQueryStore = createQueryStore<ItemType>();
			let ignoreFirst = true;
			trackableQueryStore.query(createFilter<ItemType>().custom(() => true)).track().observe().subscribe(update => {
				if (ignoreFirst) {
					ignoreFirst = false;
					return;
				}
				try {
					assert.deepEqual(update.adds, createData(), 'Should contain added items');
					dfd.resolve();
				} catch (error) {
					dfd.reject(error);
				}
			});
			trackableQueryStore.add(createData());
		},

		'should receive a notification of initial data': function(this: any) {
			const dfd = this.async(1000);
			trackableQueryStore = createQueryStore({
				data: createData()
			});
			trackableQueryStore
				.filter((item) => item.value > 0)
				.range(0, 100)
				.track()
				.observe()
				.subscribe(dfd.callback((update: TrackableStoreDelta<ItemType>) => {
					const data = createData();
					assert.deepEqual(update.addedToTracked, [
						{
							id: 'item-1',
							index: 0,
							item: data[0]
						},
						{
							id: 'item-2',
							index: 1,
							item: data[1]
						},
						{
							id: 'item-3',
							index: 2,
							item: data[2]
						}
					], 'Should contain initially added items');
				}));
		},

		'tracked collection should filter out items that are not being tracked and remove updates that cancel out'(this: any) {
			const dfd = this.async(1000);
			const data = createData();

			trackableQueryStore.delete(data.map((item) => item.id)).then(() => {
				const trackedCollection = trackableQueryStore
					.filter(function(item: ItemType) {
						return item.value > 1;
					})
					.sort('value')
					.track();

				let ignoreFirst = true;
				trackedCollection.observe().subscribe(function(update: any) {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}

					try {
						assert.deepEqual(update, {
							adds: [ data[2] ],
							updates: [],
							deletes: [],
							movedInTracked: [],
							removedFromTracked: [],
							addedToTracked: [ { id: 'item-3', index: 0, item: data[2] } ],
							beforeAll: [],
							afterAll: [ data[2] ]
						}, 'Should have cancelled out delete and add, and filtered out the other non-tracked delete');
						dfd.resolve();
					} catch (error) {
						dfd.reject(error);
					}
				});
				trackableQueryStore.add(createData());
				trackableQueryStore.delete(['item-1', 'item-2']);
			});
		},

		'should not receive same update data twice'(this: any) {
			const dfd = this.async(1000);
			const data = createData();
			const updates = createUpdates()[0];
			const trackableQueryStore = createQueryStore<ItemType>();
			const trackedCollection = trackableQueryStore
				.filter(function(item: ItemType) {
					return item.value > 1;
				})
				.sort('value')
				.track();

			let ignoreFirst = true;
			let add = true;
			trackedCollection.observe().subscribe(dfd.rejectOnError(({ adds, updates, addedToTracked, movedInTracked}: TrackableStoreDelta<ItemType>) => {
				if (ignoreFirst) {
					ignoreFirst = false;
					return;
				}

				if (add) {
					assert.deepEqual(adds, data.slice(1), 'Should have included adds');
					assert.deepEqual(addedToTracked, data.slice(1).map((item, index) => ({
						id: item.id, item: item, index: index
					})), 'Should have included items added to tracked');
					add = false;
				}
				else {
					assert.strictEqual(adds.length, 0, 'Shouldn\'t have included any adds');
					assert.deepEqual(updates, updates, 'Should have included updates');
					assert.deepEqual(addedToTracked, [ updates[0] ].map((item, index) => ({
						id: item.id, item: item, index: 0
					})), 'Should have included items added to tracked');
					assert.deepEqual(movedInTracked, updates.slice(1).map((item, index) => ({
						id: item.id, item: item, previousIndex: index, index: index + 1
					})), 'Should have included items moved in tracked');
					dfd.resolve();
				}
			}));

			trackableQueryStore.add(data).then(() => {
				setTimeout(() => {
					trackableQueryStore.put(updates);
				}, 50);
			});
		}
	};
});
