import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { createData, ItemType, patches } from '../support/createData';
import { CrudOptions } from '../../../src/store/createStore';
import createSubcollectionStore from '../../../src/store/createSubcollectionStore';

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

	'should delegate to parent store': (function(){
		function getStoreAndDfd(test: any) {
			const dfd = test.async(1000);
			const store = createSubcollectionStore<ItemType, CrudOptions>();
			const Subcollection = store.createSubcollection();

			return { dfd: dfd, store: store, Subcollection: Subcollection };
		}
		return {
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
		};
	})(),

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
	})()
});
