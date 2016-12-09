import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { createData, ItemType, patches, createUpdates } from '../support/createData';
import { CrudOptions } from '../../../src/store/createStore';
import createSubcollectionStore from '../../../src/store/createSubcollectionStore';
import createAsyncStorage from '../support/AsyncStorage';

function getStoreAndDfd() {
	const store = createSubcollectionStore<ItemType, CrudOptions>();
	const subcollection = store.createSubcollection();

	return { store: store, subcollection: subcollection };
}
function getStoreWithAsyncStorage(asyncOptions?: {}) {
	const asyncStorage = createAsyncStorage(asyncOptions);
	const store = createSubcollectionStore({ storage: asyncStorage });

	return { store, asyncStorage };
}

registerSuite({
	name: 'createSubcollectionStore',

	'initialize with data': function(this: any) {
		return createSubcollectionStore({
			data: createData()
		}).fetch().then(function(data) {
			assert.deepEqual(data, createData(), 'Didn\'t initialize properly with data');
		});
	},

	'should delegate to parent store': (function(){
		return {
			add(this: any) {
				const { store, subcollection } = getStoreAndDfd();
				const data = createData();
				subcollection.add(data[0]);
				return store.fetch().then(function(results) {
					assert.deepEqual(results, [ data[0] ], 'Didn\'t add item to source store');
				});
			},

			put(this: any) {
				const { store, subcollection } = getStoreAndDfd();
				const data = createData();
				subcollection.put(data[0]);
				return store.fetch().then(function(results) {
					assert.deepEqual(results, [ data[0] ], 'Didn\'t put item in source store');
				});
			},

			patch(this: any) {
				const { store, subcollection } = getStoreAndDfd();
				const data = createData();
				subcollection.add(data[0]);
				subcollection.patch(patches[0]);
				return store.fetch().then(function(results) {
					assert.deepEqual(results, [ patches[0].patch.apply(createData()[0]) ],
						'Didn\'t patch item in source store');
				});
			},

			delete(this: any) {
				const { store, subcollection } = getStoreAndDfd();
				const data = createData();
				subcollection.add(data[0]);
				subcollection.delete(data[0].id);
				return store.fetch().then(function(results) {
					assert.lengthOf(results, 0, 'Didn\'t delete item from source');
				});
			},

			get(this: any) {
				const { store, subcollection } = getStoreAndDfd();
				const data = createData();
				store.add(data[0]);
				return subcollection.get(data[0].id).then(function(results) {
					assert.deepEqual(results, data[0], 'Didn\'t get item from source');
				});
			},

			fetch(this: any) {
				const { store, subcollection } = getStoreAndDfd();
				const data = createData();
				store.add(data[0]);
				return subcollection.fetch().then(function(results) {
					assert.deepEqual(results, [ data[0] ], 'Didn\'t fetch items from source');
				});
			},
			createId(this: any) {
				const { store, subcollection } = getStoreAndDfd();
				subcollection.createId();
				return store.createId().then(function(id) {
					assert.strictEqual(id, '2');
				});
			}
		};
	})(),

	'should behave normally with no source': (function() {

		return {
			add(this: any) {
				const { store } = getStoreAndDfd();
				const data = createData();
				store.add(data[0]);
				return store.fetch().then(function(results) {
					assert.deepEqual(results, [ data[0] ], 'Didn\'t add item to source store');
				});
			},

			put(this: any) {
				const { store } = getStoreAndDfd();
				const data = createData();
				store.put(data[0]);
				return store.fetch().then(function(results) {
					assert.deepEqual(results, [ data[0] ], 'Didn\'t put item in source store');
				});
			},

			patch(this: any) {
				const { store } = getStoreAndDfd();
				const data = createData();
				store.add(data[0]);
				store.patch(patches[0]);
				return store.fetch().then(function(results) {
					assert.deepEqual(results, [ patches[0].patch.apply(createData()[0]) ],
						'Didn\'t patch item in source store');
				});
			},

			delete(this: any) {
				const { store } = getStoreAndDfd();
				const data = createData();
				store.add(data[0]);
				store.delete(data[0].id);
				return store.fetch().then(function(results) {
					assert.equal(results.length, 0, 'Didn\'t delete item from source');
				});
			},

			get(this: any) {
				const { store } = getStoreAndDfd();
				const data = createData();
				store.add(data[0]);
				return store.get(data[0].id).then(function(results) {
					assert.deepEqual(results, data[0], 'Didn\'t get item from source');
				});
			}
		};
	})(),

	'async storage': {
		'fetch should not return items when it is done before add.'(this: any) {
			const { store } = getStoreWithAsyncStorage({ put: 20, fetch: 10 });
			store.add(createData());
			return store.fetch().then(function(storeData) {
				assert.lengthOf(storeData, 0, 'should not have retrieved items');
			});
		},
		'should complete initial add before subsequent operations'(this: any) {
			const asyncStorage = createAsyncStorage();
			const store = createSubcollectionStore({
				storage: asyncStorage,
				data: createData()
			});

			return store.get(['1', '2', '3']).then(function(items) {
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
			const store = createSubcollectionStore({
				storage: asyncStorage,
				data: data
			});

			return store.add(data).then(function() {
				return store.get(['1', '2', '3']).then(function(items) {
					assert.isFalse(fail, 'Didn\'t fail for first operation');
					assert.deepEqual(items, data, 'Didn\'t retrieve items from add following failed initial add');
				});
			});
		},
		'SubcollectionStore async operations should be done in the order specified by the user.'(this: any) {
			const{ store } = getStoreWithAsyncStorage();

			return store.add(createData()).then(function(result) {
				assert.deepEqual(result, createData(), 'Should have returned all added items');
			}).then(function() {
				return store.put(createUpdates()[0]);
			}).then(function(result) {
				assert.deepEqual(result, createUpdates()[0], 'Should have returned all updated items');
			}).then(function() {
				return store.delete(['1']);
			}).then(function(result) {
				assert.deepEqual(result, ['1'], 'Should have returned all deleted ids');
			});
		},
		'Subcollection async operations should be done in the order specified by the user.'(this: any) {
			const{ store } = getStoreWithAsyncStorage();
			const subcollection = store.createSubcollection();

			return subcollection.add(createData()).then(function(result) {
				assert.deepEqual(result, createData(), 'Should have returned all added items');
				return subcollection.put(createUpdates()[0]);
			}).then(function(result) {
				assert.deepEqual(result, createUpdates()[0], 'Should have returned all updated items');
				return subcollection.delete(['1']);
			}).then(function(result) {
				assert.deepEqual(result, ['1'], 'Should have returned all deleted ids');
			});
		}
	}
});
