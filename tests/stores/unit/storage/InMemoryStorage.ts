import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Set from '@dojo/shim/Set';
import InMemoryStorage from '../../../src/storage/InMemoryStorage';
import Promise from '@dojo/shim/Promise';
import { StoreOperation } from '../../../src/interfaces';
import createFilter from '../../../src/query/createFilter';
import createSort from '../../../src/query/createSort';
import createRange from '../../../src/query/createStoreRange';
import CompoundQuery from '../../../src/query/CompoundQuery';
import { createData, createUpdates, ItemType, patches } from '../support/createData';

function getStorageAndDfd(test: any, option = {}) {
	const dfd = test.async(1000);
	const storage = new InMemoryStorage(option);

	return { dfd, storage, data: createData() };
}

registerSuite({
	name: 'InMemoryStorage',
	'identify': {
		'Should identify by idProperty if exists.'(this: any) {
			const storage = new InMemoryStorage<ItemType & { custId: string }>({
				idProperty: 'custId',
				idFunction: (item: ItemType) => String(item.nestedProperty.value)
			});
			const data = createData().map<ItemType & { custId: string }>((item) => {
				const newItem = { ...item };
				(newItem as any).custId = item.id + '-CID';
				return newItem as any;
			});
			assert.deepEqual(storage.identify(data), ['item-1-CID', 'item-2-CID', 'item-3-CID']);
		},
		'Should identify by idFunction if idProperty doesn\'t exist.'(this: any) {
			const storage = new InMemoryStorage({
				idFunction: (item: ItemType) => String(item.nestedProperty.value)
			});
			assert.deepEqual(storage.identify(createData()), ['3', '2', '1']);
		},
		'Should default to `id` property if neither idProperty nor idFunction exists.'(this: any) {
			const storage = new InMemoryStorage();
			assert.deepEqual(storage.identify(createData()), ['item-1', 'item-2', 'item-3']);
		},
		'Should accept identifying a single item.'(this: any) {
			const storage = new InMemoryStorage();
			assert.deepEqual(storage.identify(createData()[2]), ['item-3']);
		}
	},

	'createId'() {
		const storage = new InMemoryStorage();
		const ids: Promise<string>[] = [];
		const generateNIds = 1000; // reduced to 1,000 since IE 11 took minutes to run 100,000
		for (let i = 0; i < generateNIds; i++) {
			ids.push(storage.createId());
		}
		Promise.all(ids)
			.then((ids) => {
				assert.equal(new Set(ids).size, generateNIds, 'Not all generated IDs were unique');
			});
	},

	'add': {
		'Should add new items into storage.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data)
				.then((result) => {
					assert.deepEqual(result.successfulData, createData());
				})
				.then(dfd.resolve);
		},
		'Should return a result of type Add.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data)
				.then((result) => {
					assert.deepEqual(result.type, StoreOperation.Add);
				})
				.then(dfd.resolve);
		},
		'Should not allow adding existing items by default.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data);
			storage.add(data).catch(dfd.callback((error: Error) => {
				assert.strictEqual(error.message, 'Objects already exist in store');
			}));
		}
	},

	'put': {
		'Should put new items into storage.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			return storage.put(data)
				.then((result) => {
					assert.deepEqual(result.successfulData, createData());
				});
		},
		'Should return a result of type Put.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.put(data)
				.then((result) => {
					assert.deepEqual(result.type, StoreOperation.Put);
				})
				.then(dfd.resolve);
		},
		'Should allow adding existing items by default.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			const updates = createUpdates();

			storage.put(data);
			storage.put(updates[0])
				.then((result) => {
					assert.deepEqual(result.successfulData, updates[0]);
				})
				.then(dfd.resolve);
		}
	},

	'get': {
		'Should get single item.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.get(['item-1'])
				.then((items) => {
					assert.deepEqual(items, [data[0]]);
				})
				.then(dfd.resolve);
		},
		'Should get multiple items.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.get(['item-1', 'item-3'])
				.then((items) => {
					assert.deepEqual(items, [data[0], data[2]]);
				})
				.then(dfd.resolve);
		},
		'Should only get existing items back.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			const idNotExist = '4';
			storage.get(['item-1', 'item-3', idNotExist])
				.then((items) => {
					assert.deepEqual(items, [data[0], data[2]]);
				})
				.then(dfd.resolve);
		}
	},

	'fetch': {
		'Should fetch all the items when query is not provided.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.fetch()
				.then((items) => {
					assert.deepEqual(items, data);
				})
				.then(dfd.resolve);
		},
		'Should fetch queried items when a query is provided.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			const query = new CompoundQuery( {
				query: createFilter<ItemType>().lessThan('value', 3)
			} )
				.withQuery( createSort<ItemType>('id', true) )
				.withQuery( createRange<ItemType>(1, 1) );

			storage.add(data);
			storage.fetch(query)
				.then((items) => {
					assert.deepEqual(items, [createData()[0]]);
				})
				.then(dfd.resolve);
		}
	},

	'delete': {
		'Should delete items from storage.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			storage.add(data);
			storage.delete(['item-1', 'item-3'])
				.then((result) => {
					assert.deepEqual(result.successfulData, ['item-1', 'item-3']);
				})
				.then(dfd.resolve);
		},
		'Should return a result of type Delete.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data);
			storage.delete(['item-1', 'item-3'])
				.then((result) => {
					assert.deepEqual(result.type, StoreOperation.Delete);
				})
				.then(dfd.resolve);
		},
		'Should return empty array when deleting non-existing items.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data);
			storage.delete(['4'])
				.then((result) => {
					assert.lengthOf(result.successfulData, 0);
				})
				.then(dfd.resolve);
		}
	},

	'patch': {
		'Should return patched/updated items.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);
			const expectedItems = data.map(({ id, value, nestedProperty: { value: nestedValue } }) => ({
				id,
				value: value + 2,
				nestedProperty: {
					value: nestedValue + 2
				}
			}));

			storage.add(data);
			storage.patch(patches)
				.then((result) => {
					assert.deepEqual(result.successfulData, expectedItems);
				})
				.then(dfd.resolve);
		},

		'Should return a result of type Patch.'(this: any) {
			const { dfd, storage, data } = getStorageAndDfd(this);

			storage.add(data);
			storage.patch(patches)
				.then((result) => {
					assert.deepEqual(result.type, StoreOperation.Patch);
				})
				.then(dfd.resolve);
		}
	}
});
