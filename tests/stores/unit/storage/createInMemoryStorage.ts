import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Set from 'dojo-shim/Set';
import createInMemoryStorage from '../../../src/storage/createInMemoryStorage';
import Promise from 'dojo-shim/Promise';
import { StoreOperation } from '../../../src/store/createStore';
import createFilter from '../../../src/query/createFilter';
import createSort from '../../../src/query/createSort';
import createRange from '../../../src/query/createStoreRange';
import createCompoundQuery from '../../../src/query/createCompoundQuery';
import { createData, createUpdates, ItemType, patches } from '../support/createData';

function getStorageAndDfd(test: any, option = {}) {
	const dfd = test.async(1000);
	const storage = createInMemoryStorage( option );

	return { dfd, storage, data: createData() };
}

registerSuite({
	name: 'createInMemoryStorage',
	'identify': {
		'Should identify by idProperty if exists.'(this: any) {
			const storage = createInMemoryStorage({
				idProperty: 'custId',
				idFunction: function(item: ItemType) {
					return item.nestedProperty.value;
				}
			});
			const data = createData();
			data.forEach( function(item, indx) {
				(item as any).custId = item.id + '-CID';
			});
			assert.deepEqual(storage.identify(data), ['item-1-CID', 'item-2-CID', 'item-3-CID']);
		},
		'Should identify by idFunction if idProperty doesn\'t exist.'(this: any) {
			const storage = createInMemoryStorage({
				idFunction: function(item: ItemType) {
					return item.nestedProperty.value;
				}
			});
			assert.deepEqual(storage.identify(createData()), [3, 2, 1]);
		},
		'Should default to `id` property if neither idProperty nor idFunction exists.'(this: any) {
			const storage = createInMemoryStorage();
			assert.deepEqual(storage.identify(createData()), ['item-1', 'item-2', 'item-3']);
		},
		'Should accept identifying a single item.'(this: any) {
			const storage = createInMemoryStorage();
			assert.deepEqual(storage.identify(createData()[2]), ['item-3']);
		}
	},

	'createId'() {
		const storage = createInMemoryStorage();
		const ids: Promise<string>[] = [];
		const generateNIds = 1000; // reduced to 1,000 since IE 11 took minutes to run 100,000
		for (let i = 0; i < generateNIds; i++) {
			ids.push(storage.createId());
		}
		Promise.all(ids).then(function(ids) {
			assert.equal(new Set(ids).size, generateNIds, 'Not all generated IDs were unique');
		});
	},

	'add': {
		'Should add new items into storage.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data).then(function(result) {
				assert.deepEqual(result.successfulData, createData());
			}).then(dfd.resolve);
		},
		'Should return a result of type Add.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data).then(function(result) {
				assert.deepEqual(result.type, StoreOperation.Add);
			}).then(dfd.resolve);
		},
		'Should not allow adding existing items by default.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data);
			storage.add(data).catch(dfd.callback(function (error: Error) {
				assert.strictEqual(error.message, 'Objects already exist in store');
			}));
		}
	},

	'put': {
		'Should put new items into storage.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.put(data).then(function(result) {
				assert.deepEqual(result.successfulData, createData());
			}).then(dfd.resolve);
		},
		'Should return a result of type Put.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.put(data).then(function(result) {
				assert.deepEqual(result.type, StoreOperation.Put);
			}).then(dfd.resolve);
		},
		'Should allow adding existing items by default.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			const updates = createUpdates();

			storage.put(data);
			storage.put(updates[0]).then(function (result) {
				assert.deepEqual(result.successfulData, updates[0]);
			}).then(dfd.resolve);
		}
	},

	'get': {
		'Should get single item.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.get(['item-1']).then(function(items) {
				assert.deepEqual(items, [data[0]]);
			}).then(dfd.resolve);
		},
		'Should get multiple items.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.get(['item-1', 'item-3']).then(function(items) {
				assert.deepEqual(items, [ data[0], data[2] ]);
			}).then(dfd.resolve);
		},
		'Should only get existing items back.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			const idNotExist = '4';
			storage.get(['item-1', 'item-3', idNotExist]).then(function(items) {
				assert.deepEqual(items, [ data[0], data[2] ]);
			}).then(dfd.resolve);
		}
	},

	'fetch': {
		'Should fetch all the items when query is not provided.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.fetch().then(function(items) {
				assert.deepEqual(items, data);
			}).then(dfd.resolve);
		},
		'Should fetch queried items when a query is provided.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			const query = createCompoundQuery( {
				query: createFilter().lessThan('value', 3)
			} )
				.withQuery( createSort('id', true) )
				.withQuery( createRange(1, 1) );

			storage.add(data);
			storage.fetch(query).then(function(items) {
				assert.deepEqual(items, [createData()[0]]);
			}).then(dfd.resolve);
		}
	},

	'delete': {
		'Should delete items from storage.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.delete(['item-1', 'item-3']).then(function(result) {
				assert.deepEqual(result.successfulData, [ 'item-1', 'item-3' ]);
				// TODO (not implemented yet) assert.deepEqual(result.currentItems, createData()[1]);
			}).then(dfd.resolve);
		},
		'Should return a result of type Delete.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data);
			storage.delete(['item-1', 'item-3']).then(function(result) {
				assert.deepEqual(result.type, StoreOperation.Delete);
			}).then(dfd.resolve);
		},
		'Should return empty array when deleting non-existing items.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data);
			storage.delete(['4']).then(function(result) {
				assert.lengthOf(result.successfulData, 0);
			}).then(dfd.resolve);
		}
	},

	'patch': {
		'Should return patched/updated items.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			const expectedItems = data.map(function( {id, value, nestedProperty: { value: nestedValue }} ) {
				return {
					id,
					value: value + 2,
					nestedProperty: {
						value: nestedValue + 2
					}
				};
			});

			storage.add(data);
			storage.patch(patches).then(function(result) {
				assert.deepEqual(result.successfulData, expectedItems);
			}).then(dfd.resolve);
		},

		'Should return a result of type Patch.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data);
			storage.patch(patches).then(function(result) {
				assert.deepEqual(result.type, StoreOperation.Patch);
			}).then(dfd.resolve);
		}
	},

	'isUpdate': {
		'Should return `isUpdate=false` when item doesn\'t exist.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.isUpdate(data[0]).then(function(result) {
				assert.isFalse(result.isUpdate);
			}).then(dfd.resolve);
		},
		'Should return `isUpdate=true` when item exists.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.isUpdate(data[0]).then(function(result) {
				assert.isTrue(result.isUpdate);
			}).then(dfd.resolve);
		}
	}
});
