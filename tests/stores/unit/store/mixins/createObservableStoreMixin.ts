import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import Promise from 'dojo-shim/Promise';
import createObservableStoreMixin, {
	ObservableStore,
		ObservableStoreOptions, StoreDelta, ItemUpdate } from '../../../../src/store/mixins/createObservableStoreMixin';
import { ItemType, createData, createUpdates, patches, patchedItems } from '../../support/createData';
import createStore, { CrudOptions } from '../../../../src/store/createStore';
import createInMemoryStorage, { UpdateResults } from '../../../../src/storage/createInMemoryStorage';
import { ComposeFactory } from 'dojo-compose/compose';
import { SubcollectionStore, SubcollectionOptions } from '../../../../src/store/createSubcollectionStore';
import createOrderedOperationMixin from '../../../../src/store/mixins/createOrderedOperationMixin';

interface ObservableStoreFactory extends ComposeFactory<ObservableStore<{}, {}, any>, ObservableStoreOptions<{}, {}>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: ObservableStoreOptions<T, O>): ObservableStore<T, O, U>;
}

type SubcollectionObservableStore<T, O extends CrudOptions, U extends UpdateResults<T>> = ObservableStore<T, O, U> & SubcollectionStore<T, O, U, ObservableStore<T, O, U>>;
interface ObservableSubcollectionStoreFactory extends ComposeFactory<SubcollectionStore<{}, {}, any, ObservableStore<{}, {}, any>>, SubcollectionOptions<{}, {}, any> & ObservableStoreOptions<{}, {}>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: SubcollectionOptions<T, O, U> & ObservableStoreOptions<T, O>): SubcollectionStore<T, O, U, ObservableStore<T, O, U>>;
}

const createObservableStore: ObservableStoreFactory = createStore
	.mixin(createObservableStoreMixin());

function getStoreAndDfd(test: any) {
	const dfd = test.async(1000);
	const observableStore: ObservableStore<ItemType, CrudOptions, UpdateResults<ItemType>> = createObservableStore( { data: createData() } );
	const emptyObservableStore = createObservableStore();
	const fetchingObservableStore: ObservableStore<ItemType, CrudOptions, UpdateResults<ItemType>> = createObservableStore( {
		data: createData(),
		fetchAroundUpdates: true
	});

	return { dfd, observableStore, emptyObservableStore, data: createData(), fetchingObservableStore};
}

registerSuite({
	name: 'observableStoreMixin',

	'with basic store': (function() {
		const ids = createData().map(function(item) {
			return item.id;
		});
		return {
			'should be able to observe the whole store': {
				put(this: any) {
					const { dfd, observableStore } = getStoreAndDfd(this);
					const updates = createUpdates();
					const subscription = observableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
						assert.deepEqual(update, {
							updates: [ updates[0][0] ],
							deletes: [],
							beforeAll: undefined,
							afterAll: undefined,
							adds: []
						}, 'Didn\'t send the proper update');
						subscription.unsubscribe();
					}));
					observableStore.put(updates[0][0]);
				},

				patch(this: any) {
					const { dfd, observableStore } = getStoreAndDfd(this);
					observableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
						// Patch operate on the item itself in a memory store. This means that any references
						// to that item will be updated immediately
						assert.deepEqual(update, {
							updates: [ patches[0].patch.apply(createData()[0]) ],
							deletes: [],
							beforeAll: undefined,
							afterAll: undefined,
							adds: []
						}, 'Didn\'t send the proper update');
					}));
					observableStore.patch(patches[0]);
				},

				add(this: any) {
					const { dfd, emptyObservableStore: observableStore, data } = getStoreAndDfd(this);
					observableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
						assert.deepEqual(update, {
							updates: [],
							deletes: [],
							beforeAll: undefined,
							afterAll: undefined,
							adds: [ data[0] ]
						});
					}));
					observableStore.add(data[0]);
				},

				delete(this: any) {
					const { dfd, observableStore } = getStoreAndDfd(this);
					observableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
						assert.deepEqual(update, {
							updates: [],
							deletes: [ ids[0] ],

							beforeAll: undefined,
							afterAll: undefined,
							adds: []
						});
					}));
					observableStore.delete(ids[0]);
				},

				'with fetch around updates': {
					put(this: any) {
						const { dfd, fetchingObservableStore, data } = getStoreAndDfd(this);
						const updates = createUpdates();
						fetchingObservableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
							assert.deepEqual(update, {
								updates: [ updates[0][0] ],
								deletes: [],
								beforeAll: data,
								afterAll: [ updates[0][0], data[1], data[2] ],
								adds: []
							}, 'Didn\'t send the proper update');
						}));
						fetchingObservableStore.put(updates[0][0]);
					},

					patch(this: any) {
						const { dfd, fetchingObservableStore, data} = getStoreAndDfd(this);
						patches[0].patch.apply(data[0]);
						fetchingObservableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
							// Patch operate on the item itself in a memory store. This means that any references
							// to that item will be updated immediately
							assert.deepEqual(update, {
								updates: [ data[0] ],
								deletes: [],
								beforeAll: createData(),
								afterAll: data,
								adds: []
							}, 'Didn\'t send the proper update');
						}));
						fetchingObservableStore.patch(patches[0]);
					},

					add(this: any) {
						const { dfd, data } = getStoreAndDfd(this);
						const fetchingObservableStore = createObservableStore({
							fetchAroundUpdates: true
						});
						fetchingObservableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
							assert.deepEqual(update, {
								updates: [],
								deletes: [],
								beforeAll: [],
								afterAll: [ data[0] ],
								adds: [ data[0] ]
							});
						}));
						fetchingObservableStore.add(data[0]);
					},

					delete(this: any) {
						const { dfd, fetchingObservableStore, data } = getStoreAndDfd(this);
						fetchingObservableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
							assert.deepEqual(update, {
								updates: [],
								deletes: [ ids[0] ],
								beforeAll: data,
								afterAll: [ data[1], data[2] ],
								adds: []
							});
						}));
						fetchingObservableStore.delete(ids[0]);
					}
				}
			},

			'should be able to observe items by ids': {
				'observing a single id': {
					put(this: any) {
						const { dfd, observableStore } = getStoreAndDfd(this);
						const updatedItem = createUpdates()[0][0];
						let firstUpdate = true;
						observableStore.observe(ids[0]).subscribe(function(update: ItemType) {
							try {
								if (firstUpdate) {
									firstUpdate = false;
									assert.deepEqual(update, createData()[0], 'Didn\'t send the initial notification for item');
								} else {
									assert.deepEqual(update, updatedItem, 'Didn\'t send the correct update');
									dfd.resolve();
								}
							} catch (error) {
								dfd.reject(error);
							}
						});
						observableStore.put(updatedItem);
					},

					patch(this: any) {
						const { dfd, observableStore } = getStoreAndDfd(this);
						const patch = patches[0];
						let firstUpdate = true;
						observableStore.observe(ids[0]).subscribe(function(update: ItemType) {
							if (firstUpdate) {
								firstUpdate = false;
								assert.deepEqual(update, createData()[0], 'Didn\'t send the initial notification for item');
							}
							else {
								assert.deepEqual(update, patchedItems[0], 'Didn\'t send the correct update');
								dfd.resolve();
							}
						});
						observableStore.patch(patch);
					},

					delete(this: any) {
						const { dfd, observableStore } = getStoreAndDfd(this);
						let updatePassed = false;
						let firstUpdate = true;
						observableStore.observe(ids[0]).subscribe(function(update: ItemType) {
							try {
								if (firstUpdate) {
									firstUpdate = false;
									assert.deepEqual(update, createData()[0], 'Didn\'t send the initial notification for item');
									updatePassed = true;
								}
								else {
									throw Error('Shouldn\'t have sent another update before completing');
								}
							} catch (error) {
								dfd.reject(error);
							}
						}, null, dfd.callback(function() {
							assert.isTrue(updatePassed, 'Should have updated before completing');
						}));
						observableStore.delete(ids[0]);
					}
				},
				'observing a single id multiple times'(this: any) {
					const { dfd, observableStore } = getStoreAndDfd(this);
					const updatedItem = createUpdates()[0][0];
					let count = 0;
					function next(update: ItemType) {
						count++;
						if (count <= 2) {
							// skip initial updates.
							return;
						}
						assert.deepEqual(update, updatedItem, 'Didn\'t send the correct update');
						if (count === 4) {
							dfd.resolve();
						}
					}

					observableStore.observe(ids[0]).subscribe(next);
					observableStore.observe(ids[0]).subscribe(next);
					observableStore.put(updatedItem);
				},
				'observing multiple ids': function(this: any) {
					const { dfd, observableStore } = getStoreAndDfd(this);
					const data = createData();

					let initialUpdate = 0;

					let putUpdate = false;
					const put = createUpdates()[0][0];

					let patchUpdate = false;
					const patched = patches[1].patch.apply(createData()[1]);
					const patch = patches[1];

					let firstDelete = false;
					let secondDelete = false;
					let thirdDelete = false;
					observableStore.observe(ids).subscribe(function(update: ItemUpdate<ItemType>) {
						try {
							if (initialUpdate < 3) {
								if (initialUpdate !== 1) {
									assert.deepEqual(update, {
										item: data[initialUpdate],
										id: data[initialUpdate].id
									}, 'Didn\'t send proper initial update'
													);
								}
								initialUpdate++;
								return;
							}
							if (!putUpdate) {
								assert.deepEqual(update, {
									item: put,
									id: put.id
								}, 'Didn\'t send the right update for put operation'
												);
								putUpdate = true;
							}
							else if (!patchUpdate) {
								assert.deepEqual(update, {
									item: patched,
									id: patched.id
								}, 'Didn\'t send the right update for patch operation'
												);
								patchUpdate = true;
							}
							else if (!firstDelete) {
								assert.deepEqual(update, {
									item: null,
									id: data[0].id
								}, 'Didn\'t send the right update for first delete operation'
												);
								firstDelete = true;
							}
							else if (!secondDelete) {
								assert.deepEqual(update, {
									item: null,
									id: data[1].id
								}, 'Didn\'t send the right update for second delete operation'
												);
								secondDelete = true;
							}
							else if (!thirdDelete) {
								assert.deepEqual(update, {
									item: null,
									id: data[2].id
								}, 'Didn\'t send the right update for third delete operation'
												);
								thirdDelete = true;
							}
							else {
								throw Error('Shouldn\'t have received another update');
							}

						} catch (error) {
							dfd.reject(error);
						}
					}, null, dfd.callback(function() {
						assert.isTrue(
							putUpdate && patchUpdate && firstDelete && secondDelete && thirdDelete,
							'Didn\'t send all updates before completing observable'
						);
					}));
					observableStore.put(put);
					observableStore.patch(patch);
					observableStore.delete([ ids[0], ids[1] ]);
					observableStore.delete(ids[2]);
				},
				'observing multiple ids multiple times'(this: any) {
					const { dfd, observableStore } = getStoreAndDfd(this);
					const updatedItem = createUpdates()[0][0];
					let count = 0;
					function next(update: ItemUpdate<ItemType>) {
						count++;
						if (count <= 6) {
							// skip initial updates.
							return;
						}
						assert.deepEqual(update.item, updatedItem, 'Didn\'t send the correct update');
						if (count === 8) {
							dfd.resolve();
						}
					}

					observableStore.observe(ids).subscribe(next);
					observableStore.observe(ids).subscribe(next);
					observableStore.put(updatedItem);
				}

			},

			'should receive an update when subscribed before initial items are stored'(this: any) {
				const { dfd, emptyObservableStore: observableStore, data } = getStoreAndDfd(this);

				observableStore.observe().subscribe(dfd.callback(function(update: StoreDelta<ItemType>) {
					assert.deepEqual(update.adds, data, 'Should have received an update for all three items added');
				}));
				observableStore.add(data);
			},

			'should not receive an update when subscribed after initial items were stored'(this: any) {
				const { dfd, observableStore } = getStoreAndDfd(this);
				const updateData = createUpdates()[0][2];

				observableStore.fetch().then(function(data: ItemType[]) {
					try {
						assert.isTrue(data.length > 0, 'initial items should have been stored.');
					} catch (e) {
						dfd.reject(e);
					}

					observableStore.observe().subscribe(function(update: StoreDelta<ItemType>) {
						try {
							assert.isTrue(update.adds.length === 0, 'Should not receive initial adds made before subscription');
							assert.deepEqual(update.updates, [updateData], 'Should only receive updates made after subscription');
							dfd.resolve();
						} catch (e) {
							dfd.reject(e);
						}
					});

					observableStore.put(updateData);
				});
			},

			'should not allow observing on non-existing ids'(this: any) {
				const { dfd, observableStore, data } = getStoreAndDfd(this);
				const idNotExist = '4';

				observableStore.observe(idNotExist).subscribe(function success() {
					dfd.reject(new Error('Should not call success callback.'));
				}, function error() {
					dfd.resolve();
				});
			},
			'should include non-existing ids in the error message.'(this: any) {
				const { dfd, observableStore, data } = getStoreAndDfd(this);
				const idNotExist = '4';
				const idExisting = '2';
				observableStore.observe([idExisting, idNotExist]).subscribe(
					function success() {},
					dfd.callback(function(error: Error) {
						assert.isTrue(error.message.indexOf(idExisting) === -1, `${idExisting} should not be included in the error message`);
						assert.isTrue(error.message.indexOf(idNotExist) !== -1, `${idNotExist} should be included in the error message`);
					}));
			},
			'should overwrite dirty data by default'(this: any) {
				const { dfd, observableStore, data } = getStoreAndDfd(this);
				const updates = createUpdates();
				observableStore.put(updates[0][0]);
				observableStore.put(updates[1][0]).subscribe(dfd.callback(function(result: UpdateResults<ItemType>) {
					assert.deepEqual(result.successfulData[0], updates[1][0], 'Should have taken the second update');
				}));
			},

			'observing multiple ids with an ordered store': function(this: any) {
				const dfd = this.async(1000);
				const data = createData();

				let initialUpdate = 0;

				let putUpdate = false;
				const put = createUpdates()[0][0];

				let patchUpdate = false;
				const patched = patches[1].patch.apply(createData()[1]);
				const patch = patches[1];

				let firstDelete = false;
				let secondDelete = false;
				let thirdDelete = false;
				const observableStore = createObservableStore
					.mixin(createOrderedOperationMixin())({
						data: createData()
					});
				observableStore.observe(ids).subscribe(function(update: ItemUpdate<ItemType>) {
					try {
						if (initialUpdate < 3) {
							// No special case because patch happens after add
							assert.deepEqual(update, {
									item: data[initialUpdate],
									id: data[initialUpdate].id
								}, 'Didn\'t send proper initial update'
							);
							initialUpdate++;
							return;
						}
						if (!putUpdate) {
							assert.deepEqual(update, {
									item: put,
									id: put.id
								}, 'Didn\'t send the right update for put operation'
							);
							putUpdate = true;
						}
						else if (!patchUpdate) {
							assert.deepEqual(update, {
									item: patched,
									id: patched.id
								}, 'Didn\'t send the right update for patch operation'
							);
							patchUpdate = true;
						}
						else if (!firstDelete) {
							assert.deepEqual(update, {
									item: null,
									id: data[0].id
								}, 'Didn\'t send the right update for first delete operation'
							);
							firstDelete = true;
						}
						else if (!secondDelete) {
							assert.deepEqual(update, {
									item: null,
									id: data[1].id
								}, 'Didn\'t send the right update for second delete operation'
							);
							secondDelete = true;
						}
						else if (!thirdDelete) {
							assert.deepEqual(update, {
									item: null,
									id: data[2].id
								}, 'Didn\'t send the right update for third delete operation'
							);
							thirdDelete = true;
						}
						else {
							throw Error('Shouldn\'t have received another update');
						}

					} catch (error) {
						dfd.reject(error);
					}
				}, null, dfd.callback(function() {
					assert.isTrue(
						putUpdate && patchUpdate && firstDelete && secondDelete && thirdDelete,
						'Didn\'t send all updates before completing observable'
					);
				}));
				observableStore.put(put);
				observableStore.patch(patch);
				observableStore.delete([ ids[0], ids[1] ]);
				observableStore.delete(ids[2]);
			},

			'when operation fails in an ordered store, the error should be sent the observable way.'(this: any) {
				const dfd = this.async(1000);
				const store = createObservableStore
					.mixin(createOrderedOperationMixin())({
						data: createData()
					});

				const updates = createUpdates();

				store.add(updates[0][2]).then(
					dfd.reject,
					dfd.callback(function (error: Error) {
						assert.equal(error.message, 'Objects already exist in store', 'Didn\'t reject with appropriate error message');
					}));
			},
			'when operation fails in an ordered store, the error should be sent the promise way.'(this: any) {
				const dfd = this.async(1000);
				const storage = createInMemoryStorage();
				sinon.stub(storage, 'fetch').returns(Promise.reject(Error('failed')));
				const store = createObservableStore
					.mixin(createOrderedOperationMixin())({ storage });

				store.fetch().then(
					dfd.reject,
					dfd.callback(function(error: Error) {
						assert.equal(error.message, 'failed', 'Didn\'t reject with appropriate error message');
					})
				);
			}
		};
	})()
});
