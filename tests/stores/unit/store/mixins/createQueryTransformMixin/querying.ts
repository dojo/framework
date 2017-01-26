import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import { createData, ItemType, patches, createUpdates } from '../../../support/createData';
import createFilter from '../../../../../src/query/createFilter';
import createRange from '../../../../../src/query/createStoreRange';
import createSort from '../../../../../src/query/createSort';
import createAsyncStorage from '../../../support/AsyncStorage';
import { createQueryStore } from '../../../../../src/store/mixins/createQueryTransformMixin';
import { diff } from '../../../../../src/patch/createPatch';
import Promise from '@dojo/shim/Promise';
import { createQueryTransformResult } from '../../../../../src/store/createQueryTransformResult';

function getStoreAndDfd(test: any, useAsync = true) {
	const dfd = useAsync ? test.async(1000) : null;
	const queryStore = createQueryStore({
		data: createData()
	});

	const emptyStore = createQueryStore();

	return { dfd, queryStore, emptyStore };
}
function getStoreWithAsyncStorage(test: any, asyncOptions?: {}, useAsync = true) {
	const dfd = useAsync ? test.async(1000) : null;
	const asyncStorage = createAsyncStorage(asyncOptions);
	const queryStore = createQueryStore({ storage: asyncStorage });

	return { dfd, queryStore, asyncStorage };
}

registerSuite({
	name: 'Query-Transform Mixin - Querying',
	'single query': function(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.filter(function(item: ItemType) {
			return String(item.id) === 'item-1';
		}).fetch().then(function(items) {
			assert.deepEqual(items, [ createData()[0] ], 'Didn\'t filter items propertly');
		});
	},

	'nested queries': function(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.filter(function(item) {
			return String(item.id) === 'item-1' || String(item.id) === 'item-2';
		}).filter(function(item: ItemType) {
			return String(item.id) === 'item-2';
		}).fetch().then(function(items) {
			assert.deepEqual(items, [ createData()[1] ], 'Didn\'t filter items properly with nested query');
		});
	},

	'get'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.filter((item) => item.value > 1).get('item-1').then((item) => {
			assert.isUndefined(item, 'Shouldn\'t have returned item');
		});
	},

	'get multiple items'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.filter((item) => item.value > 1).get(['item-1', 'item-2']).then((items) => {
			assert.deepEqual(items, [], 'Shouldn\'t have returned items before they are added to local storage');
		});
	},

	'get with initial fetch'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		const queriedView = queryStore.filter((item) => item.value > 1);
		queriedView.fetch();
		return queriedView.get('item-1').then((item) => {
			assert.isUndefined(item, 'Shouldn\'t have returned filtered item with updated collection');
			return queriedView.get('item-2').then((item) => {
				assert.deepEqual(item, createData()[1], 'Should have returned item in filtered collection');
			});
		});
	},

	'get multiple items with initial fetch'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		const queriedView = queryStore.filter((item) => item.value > 1);
		queriedView.fetch();
		return queriedView.get(['item-1', 'item-2']).then((items) => {
			assert.deepEqual(items, [ createData()[1] ], 'Should only return item in filtered collection');
		});
	},

	'accessing source'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		const newItem = {
			id: '4',
			value: 4,
			nestedProperty: {
				value: 4
			}
		};

		queryStore.filter((item) => true).source.add(newItem);

		return queryStore.filter((item) => item.value < 100).fetch().then((data) => {
			assert.deepEqual(data, [
				...createData(),
				newItem
			], 'Didn\'t properly add item to source store');
		});
	},

	'fetch with query and nested queries': function(this: any) {
		const { dfd, queryStore } = getStoreAndDfd(this);
		queryStore.filter(function(item: ItemType) {
			return Boolean(item.id);
		}).filter(function(item: ItemType) {
			return String(item.id) === 'item-2' || String(item.id) === 'item-1';
		}).fetch(createFilter<ItemType>().equalTo('id', 'item-1')).then(function(items) {
			assert.deepEqual(items, [ createData()[0] ], 'Didn\'t filter items properly with nested query and query in fetch');
		}).then(dfd.resolve);
	},

	'should retrieve source collection\'s data with queries'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);
		return queryStore
			.filter(createFilter<ItemType>().lessThan('value', 3))
			.sort('value', true)
			.fetch().then(function(fetchedData) {
				assert.deepEqual(fetchedData, [ createData()[1], createData()[0] ]);
			});
	},

	'should be notified of changes in parent collection on items in query or just moved from query'(this: any) {
		const dfd = this.async(2000);
		const store = createQueryStore<ItemType>();
		const data = createData();
		const updates = createUpdates();
		const calls: Array<() => any> = [
			// If an item is moved out of range we should still get notified
			() => store.put({
				id: 'item-1',
				value: 4,
				nestedProperty: {
					value: 10
				}
			}),
			() => store.patch(patches[1]),
			// updating or deleting items in query should create notifications
			() => store.put(updates[0]),
			() => store.put(data),
			() => store.patch(patches[2]),
			() => store.delete(data[0].id)
		];
		const subCollection = store.filter(createFilter<ItemType>().lessThanOrEqualTo('value', 3));
		subCollection.observe().subscribe(function() {
			let nextCall: (() => any) | undefined = calls.shift();
			if (nextCall) {
				nextCall();
			} else {
				dfd.resolve();
			}
		});
		setTimeout(() => {
			dfd.reject(Error('Had ' + calls.length + ' operations remaining out of 5'));
		}, 1000);
		// Should get notified for adding items
		store.add(data);
	},

	'shouldn\'t get notifications for updates outside of query'(this: any) {
		const dfd = this.async(2000);
		const store = createQueryStore<{ id: string, value: number }>();
		const filteredView = store.filter(createFilter<any>().lessThan('value', 5));

		let ignoreFirst = true;
		filteredView.observe().subscribe(function() {
			if (ignoreFirst) {
				ignoreFirst = false;
				return;
			}
			dfd.reject(Error('Received a notification'));
		});

		store.add([
			{
				id: 'item-1',
				value: 6
			},
			{
				id: 'item-2',
				value: 7
			}
		]);
		store.add({ id: 'item-3', value: 8 });
		store.put([
			{
				id: 'item-1',
				value: 7
			},
			{
				id: 'item-2',
				value: 6
			}
		]);
		store.put({ id: 'item-3', value: 7 });

		store.patch([
			{ id: 'item-1', patch: diff({ id: 'item-1', value: 8 }) },
			{ id: 'item-2', patch: diff({ id: 'item-2', value: 8 }) }
		]);
		store.patch({ id: 'item-3', patch: diff({ id: 'item-3', value: 10 }) });
		store.delete(['item-1', 'item-2']);
		store.delete('item-3');

		setTimeout(dfd.resolve, 1000);
	},

	'notification for item deleted from initial data'(this: any) {
		const dfd = this.async(1000);
		const store = createQueryStore({
			data: createData()
		});
		const data = createData();
		const filtered = store.filter(createFilter<any>().greaterThan('value', 0));
		let ignoreFirst = 2;
		filtered.observe().subscribe(function(update) {
			if (ignoreFirst) {
				ignoreFirst--;
				return;
			}
			try {
				assert.deepEqual(update, {
					deletes: [ 'item-1' ],
					updates: [],
					beforeAll: data,
					afterAll: [ data[1], data[2] ],
					adds: [],
					removedFromTracked: [
						{
							id: 'item-1',
							item: data[0],
							previousIndex: 0
						}
					],
					movedInTracked: [
						{
							id: 'item-2',
							index: 0,
							previousIndex: 1,
							item: data[1]
						},
						{
							id: 'item-3',
							index: 1,
							previousIndex: 2,
							item: data[2]
						}
					],
					addedToTracked: []
				}, 'Didn\'t send proper update for delete');
			} catch (error) {
				dfd.reject(error);
			}
			dfd.resolve();
		});
		store.delete('item-1');
	},

	'notification on item deleted from initial data after fetch'(this: any) {
		const dfd = this.async(1000);
		const data = createData();
		const store = createQueryStore({
			data: data
		});
		const filtered = store.filter(createFilter<any>().greaterThan('value', 0));
		let ignoreFirst = 2;
		filtered.observe().subscribe((update) => {
			if (ignoreFirst) {
				ignoreFirst--;
				return;
			}
			try {
				assert.deepEqual(update, {
					deletes: [ 'item-1' ],
					updates: [],
					beforeAll: data,
					afterAll: [ data[1], data[2] ],
					adds: [],
					removedFromTracked: [
						{
							id: 'item-1',
							item: data[0],
							previousIndex: 0
						}
					],
					movedInTracked: [
						{
							id: 'item-2',
							index: 0,
							previousIndex: 1,
							item: data[1]
						},
						{
							id: 'item-3',
							index: 1,
							previousIndex: 2,
							item: data[2]
						}
					],
					addedToTracked: []
				}, 'Didn\'t send proper update for delete');
			} catch (error) {
				dfd.reject(error);
			}
			dfd.resolve();
		});
		filtered.fetch().then(() => {
			store.delete('item-1');
		});
	},

	'should allow fetch with sort on a sorted store'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);
		const data = createData();

		return queryStore.sort(createSort<ItemType>('id', true)).fetch(createSort<ItemType>('id', false))
			.then(function(fetchedData) {
				assert.deepEqual(fetchedData, [ data[0], data[1], data[2] ], 'Data fetched with sort was incorrect');
			});
	},

	'should allow fetch with filter on a filtered store'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);
		const data = createData();

		return queryStore.filter(createFilter<ItemType>().greaterThanOrEqualTo('value', 2)).fetch(createFilter<ItemType>().lessThan('value', 3))
			.then(function(fetchedData: ItemType[]) {
				assert.deepEqual(fetchedData, [ data[1] ], 'Data fetched with filter was incorrect');
			});
	},

	'should allow fetch with range on a range filtered store'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);
		const data = createData();

		return queryStore.range(1, 2).fetch(createRange<ItemType>(1, 1))
			.then(function(fetchedData: ItemType[]) {
				assert.deepEqual(fetchedData, [ data[2] ], 'Data fetched with range was incorrect');
			});
	},

	'all query mixin APIs should work together'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);
		const data = createData();

		return queryStore
			.range(createRange<ItemType>(0, 3))
			.filter(createFilter<ItemType>().greaterThanOrEqualTo('value', 2))
			.filter( (item) => item.value >= 2 )
			.sort( createSort<ItemType>('id', true) )
			.range(createRange<ItemType>(1, 1))
			.range(0, 1)
			.fetch().then(function(fetchedData: ItemType[]) {
				assert.deepEqual(fetchedData, [ data[1] ], 'Data fetched with multiple queries was incorrect');
			});
	},

	'unsubscribing and resubscribing'(this: any) {
		const queryStore = createQueryStore({
			fetchAroundUpdates: true,
			data: createData()
		});
		const dfd = this.async(1000);
		const filteredView = queryStore.filter((item) => item.value > 1);
		filteredView.observe().subscribe(() => {
		}).unsubscribe();
		setTimeout(() => {
			let ignoreFirst = true;
			const newObject = {
				id: 'new',
				value: 10,
				nestedProperty: {
					value: 10
				}
			};
			filteredView.observe().subscribe((delta) => {
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
			queryStore.add(newObject);
		}, 100);

	},

	'unsubscribing with another subscriber'(this: any) {
		const queryStore = createQueryStore({
			fetchAroundUpdates: true,
			data: createData()
		});
		const dfd = this.async();
		const filteredView = queryStore.filter((item) => item.value > 1);
		const newObject = {
			id: 'new',
			value: 10,
			nestedProperty: {
				value: 10
			}
		};
		let ignoreFirst = true;
		filteredView.observe().subscribe(() => {
		}).unsubscribe();
		setTimeout(() => {
			filteredView.observe().subscribe((delta) => {
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
			setTimeout(() => {
				queryStore.add(newObject);
			});
		});

	},

	'unsubscribing in update'(this: any) {
		const store = createQueryStore({
			fetchAroundUpdates: true,
			data: createData()
		});
		const dfd = this.async(1000);
		const filtered = store.filter(() => true);
		let ignoreUnsubscribeFirst = 2;
		let unsubscribed = false;
		const subscription = filtered.observe().subscribe(() => {
			if (ignoreUnsubscribeFirst) {
				ignoreUnsubscribeFirst--;
				return;
			}
			if (!unsubscribed) {
				unsubscribed = true;
			}
			subscription.unsubscribe();
		});

		let ignoreFirst = 2;
		filtered.observe().subscribe((delta) => {
			if (ignoreFirst) {
				ignoreFirst--;
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
	},

	'should throw if created without a source'(this: any) {
		assert.throw(
			() => createQueryTransformResult(), 'Query Transform result cannot be created without providing a source store'
		);
	},

	'totalLength and dataLength': {
		'totalLength should return the total number of items in storage': {
			'fetch all'(this: any) {
				const queryStore = createQueryStore({
					data: createData()
				}).filter(() => false);
				const fetchResult = queryStore.fetch();
				return fetchResult.then((data) => {
					assert.equal(0, data.length, 'Should not return any items for this query');
					return fetchResult.totalLength.then((totalLength) => {
						assert.equal(3, totalLength, 'Didn\'t return the correct totalLength');
					});
				});
			},

			'fetch with query'(this: any) {
				const queryStore = createQueryStore({
					data: createData()
				}).filter(() => false);
				const fetchResult = queryStore.fetch(createFilter<ItemType>().custom(() => false));
				return fetchResult.then((data) => {
					assert.equal(0, data.length, 'Should not return any items for this query');
					return fetchResult.totalLength.then((totalLength) => {
						assert.equal(3, totalLength, 'Didn\'t return the correct totalLength');
					});
				});
			}
		},

		'dataLength should return the number of items matching the Query Transform result\'s own queries': {
			'fetch all'(this: any) {
				const queryStore = createQueryStore({
					data: createData()
				}).filter((item) => item.value < 3);
				const fetchResult = queryStore.fetch();
				return fetchResult.then((data) => {
					assert.deepEqual(createData().slice(0, 2), data, 'Didn\'t return expected data');
					return fetchResult.dataLength.then((dataLength) => {
						assert.equal(2, dataLength, 'Didn\'t return the correct dataLength');
					});
				});
			},

			'fetch with query'(this: any) {
				const queryStore = createQueryStore({
					data: createData()
				}).filter((item) => item.value < 3);
				const fetchResult = queryStore.fetch(createFilter<ItemType>().custom((item) => item.value < 2));
				return fetchResult.then((data) => {
					assert.deepEqual(data, [ createData()[0] ], 'Didn\'t return expected data');
					return fetchResult.dataLength.then((dataLength) => {
						assert.equal(2, dataLength, 'Didn\'t return the correct dataLength');
					});
				});
			},

			'should be rejected if fetch errors'(this: any) {
				const queryStore = createQueryStore({
					storage: <any> {
						fetch() {
							const result = Promise.reject(Error('Fetch failed'));
							(<any> result).totalLength = Promise.resolve(0);
							return result;
						}
					}
				});

				const fetchResult = queryStore.filter(() => true).fetch();
				// Handle the error on the fetch result itself to avoid warnings
				fetchResult.then(undefined, () => {});
				return fetchResult.dataLength.then(
					() => {
						throw Error('Data length should not have resolved');
					},
					(error: any) => {
						assert.equal('Fetch failed', error.message);
					}
				);
			}
		}
	},

	'should continue to report correct data after multiple updates'(this: any) {
		const dfd = this.async();
		const queryStore = createQueryStore({
			data: createData()
		});

		let updateCount = 0;
		const updates = [
			{
				id: 'item-1',
				value: 3,
				nestedProperty: {
					value: 3
				}
			},
			{
				id: 'item-1',
				value: 4,
				nestedProperty: {
					value: 3
				}
			}
		];
		const sorted = queryStore.sort('value');

		const data = createData();
		sorted.observe().subscribe(dfd.rejectOnError(({ afterAll }: any) => {
			switch (updateCount) {
				case 0:
				case 1:
					break;
				case 2:
					assert.deepEqual(afterAll, [ data[1], updates[0], data[2] ], 'Wrong first update');
					break;
				case 3:
					assert.deepEqual(afterAll, [ data[1], data[2], updates[1] ], 'Wrong second update');
					dfd.resolve();
					break;
			}
			updateCount++;
		}));
		queryStore.put(updates[0]).then(() => {
			queryStore.put(updates[1]);
		});
	},

	'async storage': {
		'filtered subcollection fetch should not return items when it is done before add.'(this: any) {
			const { queryStore: store } = getStoreWithAsyncStorage(this, { put: 20, fetch: 10 }, false);
			const subcollection = store.filter(createFilter<ItemType>().greaterThanOrEqualTo('value', 2));

			store.add(createData());
			return subcollection.fetch().then(function(storeData) {
				assert.lengthOf(storeData, 0, 'should not have retrieved items');
			});
		},
		'should complete initial add before subsequent operations'(this: any) {
			const asyncStorage = createAsyncStorage();
			const store = createQueryStore({
				storage: asyncStorage,
				data: createData()
			});

			return store.get(['item-1', 'item-2', 'item-3']).then(function(items: ItemType[]) {
				assert.deepEqual(items, createData(), 'Didn\'t retrieve items from async add');
			});
		},
		'failed initial add should not prevent subsequent operations'(this: any) {
			let fail = true;
			const stub = sinon.stub(console, 'error');
			const asyncStorage = createAsyncStorage
				.around('add', function(add: () => Promise<ItemType>) {
					return function(this: any) {
						if (fail) {
							fail = false;
							return Promise.reject(Error('error'));
						}
						else {
							return add.apply(this, arguments);
						}
					};
				})();
			const data = createData();
			const store = createQueryStore({
				storage: asyncStorage,
				data: data
			});

			return store.add(data).then(function() {
				return store.get(['item-1', 'item-2', 'item-3']).then(function(items) {
					assert.isTrue(stub.called, 'Didn\'t log error for failed add');
					assert.equal('error', stub.args[0][0].message, 'Didn\'t log expected error');
					stub.restore();
					assert.isFalse(fail, 'Didn\'t fail for first operation');
					assert.deepEqual(items, data, 'Didn\'t retrieve items from add following failed initial add');
				});
			});
		}
	}
});
