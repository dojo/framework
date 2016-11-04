import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { createData, ItemType, patches, createUpdates } from '../support/createData';
import { CrudOptions } from '../../../src/store/createStore';
import createSubcollectionStore from '../../../src/store/createSubcollectionStore';
import createAsyncStorage from '../support/AsyncStorage';

function getStoreAndDfd(test: any) {
	const dfd = test.async(1000);
	const store = createSubcollectionStore<ItemType, CrudOptions>();
	const Subcollection = store.createSubcollection();

	return { dfd, store, Subcollection };
}
function getStoreWithAsyncStorage(test: any, asyncOptions?: {} ) {
	const dfd = test.async(1000);
	const asyncStorage = createAsyncStorage(asyncOptions);
	const store = createSubcollectionStore({ storage: asyncStorage });

	return { dfd, store, asyncStorage };
}

registerSuite({
	name: 'createSubcollectionStore',

	'initialize with data': function(this: any) {
		const dfd = this.async(1000);
		createSubcollectionStore({
			data: createData()
		}).fetch().then(function(data) {
			assert.deepEqual(data, createData(), 'Didn\'t initialize properly with data');
		}).then(dfd.resolve);
	},

	'should delegate to parent store': {
		add(this: any) {
			const { dfd, store, Subcollection } = getStoreAndDfd(this);
			const data = createData();
			Subcollection.add(data[0]);
			store.fetch().then(function(results) {
				assert.deepEqual(results, [ data[0] ], 'Didn\'t add item to source store');
			}).then(dfd.resolve);
		},

		put(this: any) {
			const { dfd, store, Subcollection } = getStoreAndDfd(this);
			const data = createData();
			Subcollection.put(data[0]);
			store.fetch().then(function(results) {
				assert.deepEqual(results, [ data[0] ], 'Didn\'t put item in source store');
			}).then(dfd.resolve);
		},

		patch(this: any) {
			const { dfd, store, Subcollection } = getStoreAndDfd(this);
			const data = createData();
			Subcollection.add(data[0]);
			Subcollection.patch(patches[0]);
			store.fetch().then(function(results) {
				assert.deepEqual(results, [ patches[0].patch.apply(createData()[0]) ],
							'Didn\'t patch item in source store');
			}).then(dfd.resolve);
		},

		delete(this: any) {
			const { dfd, store, Subcollection } = getStoreAndDfd(this);
			const data = createData();
			Subcollection.add(data[0]);
			Subcollection.delete(data[0].id);
			store.fetch().then(function(results) {
				assert.lengthOf(results, 0, 'Didn\'t delete item from source');
			}).then(dfd.resolve);
		},

		get(this: any) {
			const { dfd, store, Subcollection } = getStoreAndDfd(this);
			const data = createData();
			store.add(data[0]);
			Subcollection.get(data[0].id).then(function(results) {
				assert.deepEqual(results, [ data[0] ], 'Didn\'t get item from source');
			}).then(dfd.resolve);
		},

		fetch(this: any) {
			const { dfd, store, Subcollection } = getStoreAndDfd(this);
			const data = createData();
			store.add(data[0]);
			Subcollection.fetch().then(function(results) {
				assert.deepEqual(results, [ data[0] ], 'Didn\'t fetch items from source');
			}).then(dfd.resolve);
		},
		createId(this: any) {
			const { dfd, store, Subcollection } = getStoreAndDfd(this);
			Subcollection.createId();
			store.createId().then(function(id) {
				assert.strictEqual(id, '2');
			}).then(dfd.resolve);
		}
	},

	'should behave normally with no source': (function() {
		function getStoreAndDfd(test: any) {
			const dfd = test.async(1000);
			const store = createSubcollectionStore<ItemType, CrudOptions>();

			return { dfd: dfd, store: store };
		}

		return {
			add(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const data = createData();
				store.add(data[0]);
				store.fetch().then(function(results) {
					assert.deepEqual(results, [ data[0] ], 'Didn\'t add item to source store');
				}).then(dfd.resolve);
			},

			put(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const data = createData();
				store.put(data[0]);
				store.fetch().then(function(results) {
					assert.deepEqual(results, [ data[0] ], 'Didn\'t put item in source store');
				}).then(dfd.resolve);
			},

			patch(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const data = createData();
				store.add(data[0]);
				store.patch(patches[0]);
				store.fetch().then(function(results) {
					assert.deepEqual(results, [ patches[0].patch.apply(createData()[0]) ],
						'Didn\'t patch item in source store');
				}).then(dfd.resolve);
			},

			delete(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const data = createData();
				store.add(data[0]);
				store.delete(data[0].id);
				store.fetch().then(function(results) {
					assert.equal(results.length, 0, 'Didn\'t delete item from source');
				}).then(dfd.resolve);
			},

			get(this: any) {
				const { dfd, store } = getStoreAndDfd(this);
				const data = createData();
				store.add(data[0]);
				store.get(data[0].id).then(function(results) {
					assert.deepEqual(results, [ data[0] ], 'Didn\'t get item from source');
				}).then(dfd.resolve);
			}
		};
	})(),

	'async storage': {
		'fetch should not return items when it is done before add.'(this: any) {
			const { dfd, store } = getStoreWithAsyncStorage(this, { put: 20, fetch: 10 });
			store.add(createData());
			store.fetch().then(function(storeData) {
				assert.lengthOf(storeData, 0, 'should not have retrieved items');
			}).then(dfd.resolve);
		},
		'should complete initial add before subsequent operations'(this: any) {
			const dfd = this.async(1000);
			const asyncStorage = createAsyncStorage();
			const store = createSubcollectionStore({
				storage: asyncStorage,
				data: createData()
			});

			store.get(['1', '2', '3']).then(dfd.callback(function(items: ItemType[]) {
				assert.deepEqual(items, createData(), 'Didn\'t retrieve items from async add');
			}));
		},
		'failed initial add should not prevent subsequent operations'(this: any) {
			const dfd = this.async(1000);
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

			store.add(data).then(function() {
				store.get(['1', '2', '3']).then(dfd.callback(function(items: ItemType[]) {
					assert.isFalse(fail, 'Didn\'t fail for first operation');
					assert.deepEqual(items, data, 'Didn\'t retrieve items from add following failed initial add');
				}));
			});
		},
		'SubcollectionStore async operations should be done in the order specified by the user.'(this: any) {
			const{ dfd, store } = getStoreWithAsyncStorage(this);

			store.add(createData()).then(function(result) {
				assert.deepEqual(result, createData(), 'Should have returned all added items');
			}).then(function() {
				return store.put(createUpdates()[0]);
			}).then(function(result) {
				assert.deepEqual(result, createUpdates()[0], 'Should have returned all updated items');
			}).then(function() {
				return store.delete(['1']);
			}).then(function(result) {
				assert.deepEqual(result, ['1'], 'Should have returned all deleted ids');
			}).then(dfd.resolve);
		},
		'Subcollection async operations should be done in the order specified by the user.'(this: any) {
			const{ dfd, store } = getStoreWithAsyncStorage(this);
			const subcollection = store.createSubcollection();

			subcollection.add(createData()).then(function(result) {
				assert.deepEqual(result, createData(), 'Should have returned all added items');
				return subcollection.put(createUpdates()[0]);
			}).then(function(result) {
				assert.deepEqual(result, createUpdates()[0], 'Should have returned all updated items');
				return subcollection.delete(['1']);
			}).then(function(result) {
				assert.deepEqual(result, ['1'], 'Should have returned all deleted ids');
			}).then(dfd.resolve);
		}
	}

});
