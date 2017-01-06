import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import createStore, { StoreOperation } from '../../../src/store/createStore';
import Map from 'dojo-shim/Map';
import Set from 'dojo-shim/Set';
import Promise from 'dojo-shim/Promise';
import createRange from '../../../src/query/createStoreRange';
import createFilter from '../../../src/query/createFilter';
import createJsonPointer from '../../../src/patch/createJsonPointer';
import createPatch, { Patch } from '../../../src/patch/createPatch';
import createSort from '../../../src/query/createSort';
import createOperation, { OperationType } from '../../../src/patch/createOperation';
import createCompoundQuery from '../../../src/query/createCompoundQuery';
import createInMemoryStorage from '../../../src/storage/createInMemoryStorage';
import { createData, ItemType, createUpdates, patches, patchedItems } from '../support/createData';
import createAsyncStorage from '../support/AsyncStorage';

function getStoreAndDfd(test: any, data = createData(), useAsync = true) {
	const dfd = useAsync ? test.async(1000) : null;
	const store = createStore( { data: data } );
	const emptyStore = createStore();

	return { dfd, store, emptyStore, data: createData() };
}

function getStoreWithAsyncStorage(test: any, asyncOptions?: {}, useAsync = true) {
	const dfd = useAsync ? test.async(1000) : null;
	const asyncStorage = createAsyncStorage(asyncOptions);
	const store = createStore({ storage: asyncStorage });

	return { dfd, store, asyncStorage };
}

const ids = createData().map(function(item) {
	return item.id;
});

registerSuite({
	name: 'createStore',

	'initialize store'(this: any) {
		const { store, data } = getStoreAndDfd(this, createData(), false);

		return store.fetch().then(function(fetchedData) {
			assert.deepEqual(fetchedData, data, 'Fetched data didn\'t match provided data');
		});
	},

	'basic operations': {
		'get': {
			'get one item by id should return the item'(this: any) {
				const { store } = getStoreAndDfd(this, undefined, true);
				return store.get('item-1').then(item => {
					assert.deepEqual(item, createData()[0]);
				});
			},
			'get multiple items by an array of ids should return the items array'(this: any) {
				const { store } = getStoreAndDfd(this, undefined, true);
				return store.get(['item-1', 'item-2', 'item-3']).then(items => {
					assert.isTrue(Array.isArray(items));
					assert.deepEqual(items, createData());
				});
			}
		},

		'add': {
			'should add new items'(this: any) {
				const { emptyStore: store, data } = getStoreAndDfd(this, undefined, false);
				// Add items
				store.add([ data[0], data[1] ]);
				store.add(data[2]);
				return store.fetch().then(function(storeData) {
					assert.deepEqual(storeData, data, 'Didn\'t add items');
				});
			},

			'add action with existing items should fail'(this: any) {
				const { store } = getStoreAndDfd(this, undefined, false);
				const updates = createUpdates();

				return store.add(updates[0][2]).then().catch(function (error: any) {
					assert.equal(error.message, 'Objects already exist in store',
						'Didn\'t reject with appropriate error message');
				});
			},

			'add action with `rejectOverwrite=false` in options should overwrite existing data': function(this: any) {
				const { store } = getStoreAndDfd(this, undefined, false);
				const updates = createUpdates();
				// Update items with add
				return store.add(updates[0][2], { rejectOverwrite: false }).then(function(items) {
					assert.deepEqual(items, [ updates[0][2] ], 'Didn\'t successfully return item');
				});
			}
		},
		'put': {
			'should add new items'(this: any) {
				const { data, emptyStore: store } = getStoreAndDfd(this, undefined, false);
				// Add items with put
				store.put([ data[0], data[1] ]);
				store.put(data[2]);
				return store.fetch().then(function(storeData) {
					assert.deepEqual(storeData, data, 'Didn\'t add items');
				});
			},

			'should update existing items'(this: any) {
				const { store } = getStoreAndDfd(this, undefined, false);
				const updates = createUpdates();
				// Add items with put
				store.put([ updates[0][0], updates[0][1] ]);
				store.put(updates[0][2]);
				return store.fetch().then(function(storeData) {
					assert.deepEqual(storeData, updates[0], 'Didn\'t update items');
				});
			},
			'put action with existing items should fail with `rejectOverwrite=true`': function(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const updates = createUpdates();
				// Update existing items with put
				store.put([ updates[0][0], updates[0][1] ], { rejectOverwrite: true }).then(
					dfd.reject,
					dfd.callback(function(error: Error) {
						assert.equal(error.message, 'Objects already exist in store', 'Didn\'t reject with appropriate error message');
					}));
			}
		},

		'patch': {
			'should allow patching with a single update'(this: any) {
				const { store } = getStoreAndDfd(this, undefined, false);
				store.patch(patches[0]);
				return store.fetch().then(function(storeData) {
					assert.deepEqual(storeData[0], patches[0].patch.apply(createData()[0]),
						'Should have patched item');
				});
			},

			'should allow patching with a single object'(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const update = createUpdates()[0][0];
				store.patch(update);
				store.fetch().then(function(storeData) {
					const updateCopy = createUpdates()[0][0];
					assert.deepEqual(update, updateCopy, 'Shouldn\'t have modified passed object');
					assert.deepEqual(storeData[0], updateCopy, 'Should have patched item');
				}).then(dfd.resolve);
			},

			'should allow patching with an array'(this: any) {
				const { store, data: copy } = getStoreAndDfd(this, undefined, false);
				store.patch(patches);
				return store.fetch().then(function(storeData) {
					assert.deepEqual(storeData, patches.map((patchObj, i) => patchObj.patch.apply(copy[i])),
						'Should have patched all items');
				});
			},

			'should allow patching with a Map'(this: any) {
				const { store, data: copy } = getStoreAndDfd(this, undefined, false);

				const map = new Map<string, Patch<ItemType, ItemType>>();
				patches.forEach(patch => map.set(patch.id, patch.patch));

				store.patch(map);
				return store.fetch().then(function(storeData) {
					assert.deepEqual(storeData, patches.map((patchObj, i) => patchObj.patch.apply(copy[i])),
						'Should have patched all items');
				});
			},

			'should allow patching with an array of items'(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				store.patch(createUpdates()[0]);
				store.fetch().then(function(data) {
					assert.deepEqual(data, createUpdates()[0], 'Should have patched objects based on provided items');
				}).then(dfd.resolve);
			},

			'should allow patching with an object and id in options'(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const update = createUpdates()[0][0];
				// This should never really be done
				update.id = 'new id';
				store.patch(update, { id: 'item-1' });
				store.fetch().then(function(storeData) {
					const updateCopy = createUpdates()[0][0];
					updateCopy.id = 'new id';
					assert.deepEqual(storeData[0], updateCopy, 'Should have patched item');
				}).then(dfd.resolve);
			},

			'should fail when patch is not applicable.'(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const operation = createOperation(OperationType.Replace, ['prop1'], 2);
				const patch = createPatch([operation]);

				store.patch({ id: 'item-1', patch }).then(
					dfd.rejectOnError(function () {
						assert(false, 'Should not have resolved');
					}),
					dfd.callback(function(error: Error) {
						assert.equal(error.message, 'Cannot replace undefined path: prop1 on object',
								'Didn\'t reject with appropriate error message');
					})
				);
			}
		},
		'delete': {
			'should allow deleting a single item'(this: any) {
				const { store, data: copy } = getStoreAndDfd(this, undefined, false);
				store.delete(ids[0]);
				return store.fetch().then(function(data: ItemType[]) {
					assert.deepEqual(data, [copy[1], copy[2]], 'Didn\'t delete item');
				});
			},

			'should allow deleting multiple items'(this: any) {
				const { store } = getStoreAndDfd(this, undefined, false);
				store.delete(ids);
				return store.fetch().then(function(data) {
					assert.deepEqual(data, [], 'Didn\'t delete items');
				});
			},

			'should fail when storage deletion fails.'(this: any) {
				const dfd = this.async(1000);

				const storage = createInMemoryStorage();
				sinon.stub(storage, 'delete').returns(Promise.reject(Error('failed')));
				const store = createStore({ storage });

				store.delete(ids[0]).then(
					dfd.rejectOnError(function () {
						assert(false, 'Should not have resolved');
					}),
					dfd.callback(function(error: Error) {
						assert.equal(error.message, 'failed', 'Didn\'t reject with appropriate error message');
					})
				);
			}
		},
		'identify': {
			'identify one item should return its id'(this: any) {
				const { store, data } = getStoreAndDfd(this, undefined, false);
				const id = store.identify(data[0]);
				assert.strictEqual(id, data[0].id);
			},
			'identify multiple items should return an array of ids'(this: any) {
				const { store, data } = getStoreAndDfd(this, undefined, false);
				const ids = store.identify(data);
				assert.isTrue(Array.isArray(ids));
				assert.deepEqual(ids, data.map(({id}) => id));
			}
		}
	},

	'fetch': {
		'should fetch with sort applied'(this: any) {
			const { store, data } = getStoreAndDfd(this, undefined, false);

			return store.fetch(createSort<ItemType>('id', true))
				.then(function(fetchedData) {
					assert.deepEqual(fetchedData, [ data[2], data[1], data[0] ], 'Data fetched with sort was incorrect');
				});
		},

		'should fetch with filter applied'(this: any) {
			const { store, data } = getStoreAndDfd(this, undefined, false);

			return store.fetch(createFilter<ItemType>().lessThan('value', 2))
				.then(function(fetchedData) {
					assert.deepEqual(fetchedData, [ data[0] ], 'Data fetched with filter was incorrect');
				});
		},

		'should fetch with range applied'(this: any) {
			const { store, data } = getStoreAndDfd(this, undefined, false);

			return store.fetch(createRange<ItemType>(1, 2))
				.then(function(fetchedData) {
					assert.deepEqual(fetchedData, [ data[1], data[2] ], 'Data fetched with range was incorrect');
				});
		},

		'should fetch with CompoundQuery applied'(this: any) {
			const { store, data } = getStoreAndDfd(this, undefined, false);

			return store.fetch(
				createCompoundQuery({
					query: createFilter<ItemType>()
						.deepEqualTo(createJsonPointer('nestedProperty', 'value'), 2)
						.or()
						.deepEqualTo(createJsonPointer('nestedProperty', 'value'), 3)
				}).withQuery(createSort<ItemType>(createJsonPointer('nestedProperty', 'value')))
			)
				.then(function(fetchedData) {
					assert.deepEqual(fetchedData, [ data[1], data[0] ], 'Data fetched with queries was incorrect');
				});
		}
	},

	'crud operations should return an observable': function(this: any) {
		const data = createData();
		const { dfd, store } = getStoreAndDfd(this, [data[0]]);

		store.add(data[1]).subscribe(function(updateResults) {
			assert.equal(updateResults.type, StoreOperation.Add, 'Update results had wrong type');
			assert.deepEqual(updateResults.successfulData, [ data[1] ], 'Update results had wrong item');

			store.put(data[2]).subscribe(function(updateResults) {
				assert.equal(updateResults.type, StoreOperation.Put, 'Update results had wrong type');
				assert.deepEqual(updateResults.successfulData, [ data[2] ], 'Update results had wrong item');

				store.patch(patches[0]).subscribe(function(updateResults) {
					assert.equal(updateResults.type, StoreOperation.Patch, 'Update results had wrong type');
					assert.deepEqual(updateResults.successfulData, [ patchedItems[0] ], 'Update results had wrong item');

					store.delete(data[0].id).subscribe(function(updateResults) {
						assert.equal(updateResults.type, StoreOperation.Delete, 'Update results had wrong type');
						assert.deepEqual(updateResults.successfulData, [ data[0].id ], 'Update results had wrong id');
					}, dfd.reject, dfd.resolve);
				});
			});
		});
	},

	'should allow a property or function to be specified as the id': function(this: any) {
		const data = createData();
		const updates = createUpdates();
		const store = createStore({
			data: updates[0],
			idProperty: 'value'
		});
		const idFunctionStore = createStore({
			idFunction: (item: ItemType) => item.id + '-id',
			data: data
		});

		assert.deepEqual(store.identify(updates[0]), [2, 3, 4], 'Should have used value property as the id');
		assert.deepEqual(idFunctionStore.identify(data), ['item-1-id', 'item-2-id', 'item-3-id'], 'Should have used id function to create item ids');
	},

	'should execute calls in order in which they are called'(this: any) {
		const { dfd, data, emptyStore: store } = getStoreAndDfd(this);
		const updates = createUpdates();
		let retrievalCount = 0;

		store.add(data[0]);
		store.get(data[0].id).then(item => {
			retrievalCount++;
			try {
				assert.deepEqual(item, data[0], 'Should have received initial item');
			} catch (e) {
				dfd.reject(e);
			}
		});
		store.put(updates[0][0]);
		store.get(data[0].id).then(item => {
			retrievalCount++;
			try {
				assert.deepEqual(item, updates[0][0], 'Should have received updated item');
			} catch (e) {
				dfd.reject(e);
			}
		});

		store.put(updates[1][0]);
		store.get(data[0].id).then(item => {
			try {
				assert.equal(retrievalCount, 2, 'Didn\'t perform gets in order');
				assert.deepEqual(item, updates[1][0], 'Should have received second updated item');
			} catch (e) {
				dfd.reject(e);
			}
			dfd.resolve();
		});
	},

	'should generate unique ids': function(this: any) {
		const ids: Promise<string>[] = [];
		const store =  createStore();
		const generateNIds = 1000; // reduced to 1,000 since IE 11 took minutes to run 100,000
		for (let i = 0; i < generateNIds; i++) {
			ids.push(store.createId());
		}
		Promise.all(ids).then(function(ids) {
			assert.equal(new Set(ids).size, generateNIds, 'Not all generated IDs were unique');
		});
	},

	'should be able to get all updates by treating as a promise': {
		add(this: any) {
			const { emptyStore: store, data } = getStoreAndDfd(this, undefined, false);
			return store.add(data).then(function(result) {
				assert.deepEqual(result, data, 'Should have returned all added items');
			});

		},

		'use catch': function(this: any) {
			const { dfd, data } = getStoreAndDfd(this);
			const store = createStore({
				data: [ data[0], data[1] ]
			});
			const catchSpy = sinon.spy();
			store.add(data[2]).catch(catchSpy).then(function(results) {
				assert.isFalse(catchSpy.called, 'Shouldn\'t have called error handler');
				assert.deepEqual(results, [ data[2] ], 'Didn\'t add item');
			}).then(dfd.resolve);
		},

		'add with conflicts should fail': function(this: any) {
			const { dfd,  data } = getStoreAndDfd(this);
			const store = createStore({
				data: [ data[0], data[1] ]
			});
			store.add(data).then(dfd.reject, dfd.resolve);
		},

		put(this: any) {
			const { store, data } = getStoreAndDfd(this, undefined, false);
			store.put(data).then(function(result) {
				return assert.deepEqual(result, data, 'Should have returned all updated items');
			});
		},

		'put with conflicts should override': function(this: any) {
			const {  data } = getStoreAndDfd(this, undefined, false);
			const store = createStore({
				data: [ data[0], data[1] ]
			});
			return store.put(data).then(function(result) {
				assert.deepEqual(result, data, 'Should have returned all updated items');
			});
		},

		patch(this: any) {
			const { store, data } = getStoreAndDfd(this, undefined, false);
			const expectedResult = data.map(function(item) {
				item.value += 2;
				item.nestedProperty.value += 2;
				return item;
			});
			return store.patch(patches).then(function(result) {
				assert.deepEqual(result, expectedResult, 'Should have returned all patched items');
			});
		},
		delete(this: any) {
			const { store } = getStoreAndDfd(this, undefined, false);
			return store.delete(ids).then(function(result) {
				assert.deepEqual(result, ids, 'Should have returned all deleted ids');
			});
		}
	},

	'should have totalLength property on fetch results': {
		'fetch all'(this: any) {
			const { store } = getStoreAndDfd(this, undefined, false);
			return store.fetch().totalLength.then((totalLength) => {
				assert.equal(3, totalLength, 'Didn\'t return the correct total length');
			});
		},

		'filtered fetch'(this: any) {
			const { store } = getStoreAndDfd(this, undefined, false);
			return store.fetch(createFilter<any>().lessThan('value', 2)).totalLength.then((totalLength) => {
				assert.equal(3, totalLength, 'Didn\'t return the correct total length');
			});
		}
	},

	'async storage': {
		'async operation should not be done immediately.'(this: any) {
			const{ store } = getStoreWithAsyncStorage(this, { put: 50}, false);

			const start = Date.now();
			return store.add(createData()).then(function() {
				const finish = Date.now();
				assert.isAbove(finish - start, 25);
			});
		},
		'should complete initial add before subsequent operations'(this: any) {
			const asyncStorage = createAsyncStorage();
			const store = createStore({
				storage: asyncStorage,
				data: createData()
			});

			return store.get(['item-1', 'item-2', 'item-3']).then(function(items) {
				assert.deepEqual(items, createData(), 'Didn\'t retrieve items from async add');
			});
		},
		'failed initial add should not prevent subsequent operations'(this: any) {
			let fail = true;
			const asyncStorage = createAsyncStorage
				.around('add', function(add: () => Promise<ItemType>) {
					return function(this: any) {
						if (fail) {
							fail = false;
							return Promise.reject(Error('Error'));
						}
						else {
							return add.apply(this, arguments);
						}
					};
				})();
			const data = createData();
			const store = createStore({
				storage: asyncStorage,
				data: data
			});

			return store.add(data).then(function() {
				return store.get(['item-1', 'item-2', 'item-3']).then(function(items) {
					assert.isFalse(fail, 'Didn\'t fail for first operation');
					assert.deepEqual(items, data, 'Didn\'t retrieve items from add following failed initial add');
				});
			});
		},
		'fetch should not return items when it is done before add.'(this: any) {
			const { store } = getStoreWithAsyncStorage(this, { put: 20, fetch: 10 }, false);
			store.add(createData());
			return store.fetch().then(function(storeData) {
				assert.lengthOf(storeData, 0, 'should not have retrieved items');
			});
		},
		'async operations should be done in the order specified by the user.'(this: any) {
			const{ store } = getStoreWithAsyncStorage(this, undefined, false);

			return store.add(createData()).then(function(result) {
				assert.deepEqual(result, createData(), 'Should have returned all added items');
				return store.put(createUpdates()[0]);
			}).then(function(result) {
				assert.deepEqual(result, createUpdates()[0], 'Should have returned all updated items');
				return store.delete(ids[0]);
			}).then(function(result) {
				assert.deepEqual(result, [ids[0]], 'Should have returned all deleted ids');
			});
		}
	}
});
