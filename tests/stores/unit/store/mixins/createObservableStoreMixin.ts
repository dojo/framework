import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import {
	createObservableStore, ObservableStore, StoreDelta, ItemUpdate
} from '../../../../src/store/mixins/createObservableStoreMixin';
import { ItemType, createData, createUpdates, patches, patchedItems } from '../../support/createData';
import { CrudOptions, UpdateResults } from '../../../../src/store/createStore';
import createAsyncStorage from '../../support/AsyncStorage';
import createInMemoryStorage from '../../../../src/storage/createInMemoryStorage';
import Set from 'dojo-shim/Set';

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
function getStoreWithAsyncStorage(test: any, asyncOptions?: {}, useAsync = true) {
	const dfd = useAsync ? test.async(1000) : null;
	const asyncStorage = createAsyncStorage(asyncOptions);
	const observableStore = createObservableStore({ storage: asyncStorage });

	return { dfd, observableStore, asyncStorage };
}

registerSuite({
	name: 'observableStoreMixin',

	'with basic store': (function() {
		const ids = createData().map(function(item) {
			return item.id;
		});
		return {
			'should be able to observe the whole store': {
				'initial updates'(this: any) {
					const { dfd, observableStore, data } = getStoreAndDfd(this);
					let firstUpdate = true;
					observableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
						try {
							if (firstUpdate) {
								firstUpdate = false;
								assert.deepEqual(update, {
									updates: [],
									deletes: [],
									adds: [],
									beforeAll: [],
									afterAll: []
								}, 'Didn\'t send the proper initial update');
							}
							else {
								assert.deepEqual(update, {
									updates: [],
									deletes: [],
									adds: data,
									beforeAll: [],
									afterAll: data
								}, 'Didn\'t send the proper initial update');
								dfd.resolve();
							}
						} catch (error) {
							dfd.reject(error);
						}
					});
				},
				put(this: any) {
					const { dfd, observableStore, data } = getStoreAndDfd(this);
					const updates = createUpdates();
					let ignoreFirst = 2;
					observableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						try {
							assert.deepEqual(update, {
								updates: [ updates[0][0] ],
								deletes: [],
								beforeAll: data,
								afterAll: [ updates[0][0], data[1], data[2] ],
								adds: []
							}, 'Didn\'t send the proper update');
						} catch (error) {
							dfd.reject(error);
						}
						dfd.resolve();
					});
					observableStore.put(updates[0][0]);
				},

				patch(this: any) {
					const { dfd, observableStore, data } = getStoreAndDfd(this);
					let ignoreFirst = 2;
					observableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						// Patch operate on the item itself in a memory store. This means that any references
						// to that item will be updated immediately
						const item = patches[0].patch.apply(createData()[0]);
						try {
							assert.deepEqual(update, {
								updates: [ item ],
								deletes: [],
								beforeAll: data,
								afterAll: [ item, data[1], data[2] ],
								adds: []
							}, 'Didn\'t send the proper update');
						} catch (error) {
							dfd.reject(error);
						}
						dfd.resolve();
					});
					observableStore.patch(patches[0]);
				},

				add(this: any) {
					const { dfd, emptyObservableStore: observableStore, data } = getStoreAndDfd(this);
					let ignoreFirst = true;
					observableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
						if (ignoreFirst) {
							ignoreFirst = false;
							return;
						}
						try {
							assert.deepEqual(update, {
								updates: [],
								deletes: [],
								beforeAll: [],
								afterAll: [ data[0] ],
								adds: [ data[0] ]
							});
						} catch (error) {
							dfd.reject(error);
						}
						dfd.resolve();
					});
					observableStore.add(data[0]);
				},

				delete(this: any) {
					const { dfd, observableStore, data } = getStoreAndDfd(this);
					let ignoreFirst = 2;
					observableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						try {
							assert.deepEqual(update, {
								updates: [],
								deletes: [ ids[0] ],
								beforeAll: data,
								afterAll: [ data[1], data[2] ],
								adds: []
							});
						} catch (error) {
							dfd.reject(error);
						}
						dfd.resolve();
					});
					observableStore.delete(ids[0]);
				},

				'with fetch around updates': {
					'initial update'(this: any) {
						const { dfd, fetchingObservableStore, data } = getStoreAndDfd(this);
						fetchingObservableStore.observe().subscribe(dfd.callback((update: StoreDelta<ItemType>) => {
							assert.deepEqual(update, {
								updates: [],
								adds: [],
								deletes: [],
								afterAll: data,
								beforeAll: []
							}, 'Didn\'t send initial update with data');
						}));
					},
					put(this: any) {
						const { dfd, fetchingObservableStore, data } = getStoreAndDfd(this);
						const updates = createUpdates();
						let ignoreFirst = true;
						fetchingObservableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
							if (ignoreFirst) {
								ignoreFirst = false;
								return;
							}
							try {
								assert.deepEqual(update, {
									updates: [ updates[0][0] ],
									deletes: [],
									beforeAll: data,
									afterAll: [ updates[0][0], data[1], data[2] ],
									adds: []
								}, 'Didn\'t send the proper update');
							} catch (error) {
								dfd.reject(error);
							}
							dfd.resolve();
						});
						fetchingObservableStore.put(updates[0][0]);
					},

					patch(this: any) {
						const { dfd, fetchingObservableStore, data} = getStoreAndDfd(this);
						patches[0].patch.apply(data[0]);
						let ignoreFirst = true;
						fetchingObservableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
							if (ignoreFirst) {
								ignoreFirst = false;
								return;
							}
							try {
								// Patch operate on the item itself in a memory store. This means that any references
								// to that item will be updated immediately
								assert.deepEqual(update, {
									updates: [ data[0] ],
									deletes: [],
									beforeAll: createData(),
									afterAll: data,
									adds: []
								}, 'Didn\'t send the proper update');
							} catch (error) {
								dfd.reject(error);
							}
							dfd.resolve();
						});
						fetchingObservableStore.patch(patches[0]);
					},

					add(this: any) {
						const { dfd, data } = getStoreAndDfd(this);
						const fetchingObservableStore = createObservableStore({
							fetchAroundUpdates: true
						});
						let ignoreFirst = true;
						fetchingObservableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
							if (ignoreFirst) {
								ignoreFirst = false;
								return;
							}
							try {
								assert.deepEqual(update, {
									updates: [],
									deletes: [],
									beforeAll: [],
									afterAll: [ data[0] ],
									adds: [ data[0] ]
								});
							} catch (error) {
								dfd.reject(error);
							}
							dfd.resolve();
						});
						fetchingObservableStore.add(data[0]);
					},

					delete(this: any) {
						const { dfd, fetchingObservableStore, data } = getStoreAndDfd(this);
						let ignoreFirst = true;
						fetchingObservableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
							if (ignoreFirst) {
								ignoreFirst = false;
								return;
							}
							try {
								assert.deepEqual(update, {
									updates: [],
									deletes: [ids[0]],
									beforeAll: data,
									afterAll: [data[1], data[2]],
									adds: []
								});
							} catch (error) {
								dfd.reject(error);
							}
							dfd.resolve();
						});
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
						}, undefined, dfd.callback(function() {
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
									item: undefined,
									id: data[0].id
								}, 'Didn\'t send the right update for first delete operation'
												);
								firstDelete = true;
							}
							else if (!secondDelete) {
								assert.deepEqual(update, {
									item: undefined,
									id: data[1].id
								}, 'Didn\'t send the right update for second delete operation'
												);
								secondDelete = true;
							}
							else if (!thirdDelete) {
								assert.deepEqual(update, {
									item: undefined,
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
					}, undefined, dfd.callback(function() {
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

				let ignoreFirst = true;
				observableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}
					try {
						assert.deepEqual(update.adds, data, 'Should have received an update for all three items added');
					} catch (error) {
						dfd.reject(error);
					}
					dfd.resolve();
				});
				observableStore.add(data);
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

			'when operation fails in an ordered store, the error should be sent the observable way.'(this: any) {
				const dfd = this.async(1000);
				const store = createObservableStore({
					data: createData()
				});

				const updates = createUpdates();

				store.add(updates[0][2]).then(
					dfd.reject,
					dfd.callback(function (error: Error) {
						assert.equal(error.message, 'Objects already exist in store', 'Didn\'t reject with appropriate error message');
					}));
			},

			'deleting ID not in local cache'(this: any) {
				const dfd = this.async(1000);
				const preLoadedStorage = createInMemoryStorage();
				preLoadedStorage.add(createData());
				const store = createObservableStore({
					storage: preLoadedStorage
				});

				let ignoreFirst = true;
				store.observe().subscribe(dfd.rejectOnError((update: StoreDelta<ItemType>) => {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}

					assert.deepEqual(update, {
						updates: [],
						deletes: [ '1' ],
						adds: [],
						afterAll: [],
						beforeAll: []
					});
					dfd.resolve();
				}));
				store.delete('1');
			},

			'unsubscribing and resubscribing'(this: any) {
				const store = createObservableStore({
					fetchAroundUpdates: true,
					data: createData()
				});
				const dfd = this.async(1000);
				store.observe().subscribe(() => {
					dfd.reject(Error('Shouldn\'t receive updates for unsubscribed observer'));
				}).unsubscribe();

				const newObject = {
					id: 'new',
					value: 10,
					nestedProperty: {
						value: 10
					}
				};
				let ignoreFirst = true;
				store.observe().subscribe((delta) => {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}

					try {
						assert.deepEqual(delta.adds, [ newObject ], 'Observable not functioning properly after unsubscribing');
						dfd.resolve();
					} catch (error) {
						dfd.reject(error);
					}
				});
				store.add(newObject);
			},

			'unsubscribing in update'(this: any) {
				const store = createObservableStore({
					fetchAroundUpdates: true,
					data: createData()
				});
				const dfd = this.async(1000);
				let ignoreUnsubscribeFirst = true;
				let unsubscribed = false;
				const subscription = store.observe().subscribe(() => {
					if (ignoreUnsubscribeFirst) {
						ignoreUnsubscribeFirst = false;
						return;
					}
					if (!unsubscribed) {
						unsubscribed = true;
					}
					subscription.unsubscribe();
				});

				let ignoreFirst = true;
				store.observe().subscribe((delta) => {
					if (ignoreFirst) {
						ignoreFirst = false;
						return;
					}

					try {
						assert.deepEqual(delta.adds, [ newObject ], 'Observable not functioning properly after unsubscribing');
						assert.isTrue(unsubscribed, 'Should have unsubscribed');
						dfd.resolve();
					} catch (error) {
						dfd.reject(error);
					}
				});
				const newObject = {
					id: 'new',
					value: 10,
					nestedProperty: {
						value: 10
					}
				};
				store.add(newObject);
			}
		};
	})(),

	'async storage': {
		'filtered subcollection async operations should be done in the order specified by the user.'(this: any) {
			const { observableStore } = getStoreWithAsyncStorage(this, undefined, false);
			const data = createData();
			const updates = createUpdates();

			return observableStore.add(createData()).then(function(result) {
				assert.deepEqual(result, data, 'Should have returned all added items');
				return observableStore.put(updates[0]);
			}).then(function(result) {
				assert.deepEqual(result, updates[0], 'Should have returned all updated items');
				return observableStore.delete(['2']);
			}).then(function(result) {
				assert.deepEqual(result, ['2'], 'Should have returned all deleted ids');
				return observableStore.fetch();
			}).then(function(result) {
				assert.deepEqual(result, [ updates[0][0], updates[0][2] ], 'Should have returned all filtered items');
			});
		},

		'should be able to observe the whole store'(this: any) {
			const { dfd, observableStore } = getStoreWithAsyncStorage(this);
			const data = createData();

			let ignoreFirst = true;
			observableStore.observe().subscribe((update: StoreDelta<ItemType>) => {
				if (ignoreFirst) {
					ignoreFirst = false;
					return;
				}
				try {
					assert.deepEqual(update, {
						updates: [],
						deletes: [],
						beforeAll: [],
						afterAll: [data[0]],
						adds: [data[0]]
					});
				} catch (error) {
					dfd.reject(error);
				}
				dfd.resolve();
			});
			observableStore.add(data[0]);
		},
		'should be able to observe single id'(this: any) {
			const { dfd, observableStore } = getStoreWithAsyncStorage(this, { get: 50, put: 10 });
			const data = createData();
			const updatedItem = createUpdates()[0][0];
			let firstUpdate = true;

			observableStore.add(data[0]).then(function() {
				observableStore.observe('1').subscribe(function(update: ItemType) {
					try {
						if (firstUpdate) {
							firstUpdate = false;
							assert.deepEqual(update, createUpdates()[0][0], 'Didn\'t send the updated item in the initial notification');
							setTimeout(dfd.resolve, 100);
						}
						else {
							throw Error('Should not have received a second update');
						}
					} catch (error) {
						dfd.reject(error);
					}
				});

				observableStore.put(updatedItem);
			});
		},
		'should be able to observe with initial items'(this: any) {
			const { dfd, asyncStorage } = getStoreWithAsyncStorage(this, { put: 50, get: 10 });
			const observableStore = createObservableStore({ storage: asyncStorage, data: createData() });
			const data = createData();

			observableStore.observe('1').subscribe(function(update: ItemType) {
				try {
					assert.deepEqual(update, data[0], 'Didn\'t send the initial notification for item');
					dfd.resolve();
				} catch (error) {
					dfd.reject(error);
				}
			});
		},
		'should only send one update if all items were updated before get finished'(this: any) {
			const { dfd, observableStore } = getStoreWithAsyncStorage(this, { put: 10, get: 80 });
			observableStore.add(createData()).then(() => {

				const updates = createUpdates()[0];
				const numbersFound = new Set<string>();
				let updatesReceived = 0;
				observableStore.observe([ '1', '2', '3' ]).subscribe(dfd.rejectOnError(({ id, item }: ItemUpdate<ItemType>) => {
					assert.deepEqual(item, updates[Number(id) - 1], 'Didn\'t receive correct initial update for item one');
					updatesReceived++;
					numbersFound.add(id);
					if (numbersFound.size === 3) {
						setTimeout(dfd.resolve, 100);
					}
					else if (updatesReceived >= 3) {
						dfd.reject(Error('Shouldn\'t have received any more updates'));
					}
				}));
				observableStore.put(updates);
			});
		}
	}
});
