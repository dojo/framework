import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import IndexedDBStorage, { createRequestPromise } from '../../../src/storage/IndexedDBStorage';
import Promise from '@dojo/shim/Promise';
import { StoreOperation, CrudOptions } from '../../../src/store/createStore';
import createFilter from '../../../src/query/createFilter';
import createSort from '../../../src/query/createSort';
import createRange from '../../../src/query/createStoreRange';
import CompoundQuery from '../../../src/query/CompoundQuery';
import { createData, createUpdates, ItemType, patches } from '../support/createData';
import { Storage } from '../../../src/storage/InMemoryStorage';
import {QueryType, Query} from '../../../src/query/interfaces';
import JsonPointer from '../../../src/patch/JsonPointer';
import {BooleanOp} from '../../../src/query/createFilter';

registerSuite((function(){
	const isIndexedDbAvailable = typeof indexedDB !== 'undefined';
	const storage: Storage<ItemType, CrudOptions> = isIndexedDbAvailable ? new IndexedDBStorage<ItemType>({
		dbName: 'test-db'
	}) : <any> null;

	return {
		name: 'IndexedDBStorage',

		setup(this: any) {
			if (!isIndexedDbAvailable) {
				this.skip();
			}
			else {
				storage.delete(['1', '2', '3']);
			}
		},

		beforeEach() {
			return storage.delete(createData().map((item) => item.id));
		},

		'add': {
			'Should add new items into storage.'(this: any) {
				const data = createData();
				return storage.add(data).then((result) => {
					assert.deepEqual(result.successfulData, data);
				});
			},
			'Should return a result of type Add.'(this: any) {
				return storage.add(createData()).then((result) => {
					assert.deepEqual(result.type, StoreOperation.Add);
				});
			},
			'Should not allow adding existing items by default.'(this: any) {
				const data = createData();
				return storage.add(data).then(() => storage.add(data).catch(function(error) {
					assert.ok(error, 'Should have thrown an error when adding an existing item');
				}));
			},
			'Should default rejectOverwrite to true when options are provided and it is not specified'(this: any) {
				const data = createData();
				return storage.add(data, {}).then(() => storage.add(data).catch(function(error) {
					assert.ok(error, 'Should have thrown an error when adding an existing item');
				}));
			},
			'Should allow adding existing items when rejectOverwrite is set to false.'(this: any) {
				const data = createData();
				return storage.add(data).then(
					() => storage.add(
							data, { rejectOverwrite: false }
						)
						.then(result => {
							assert.deepEqual(result.successfulData, data);
						})
				);
			}
		},

		'put': {
			beforeEach() {
				return createRequestPromise(indexedDB.open('test-db')).then((db) => {
					const objectStore = db.transaction('items', 'readwrite').objectStore('items');
					return Promise.all(createData().map((item) => createRequestPromise(objectStore.delete(item.id))));
				});
			},

			'Should put new items into storage.'(this: any) {
				const data = createData();
				return storage.put(data).then((result) => {
					assert.deepEqual(result.successfulData, data);
				});
			},
			'Should return a result of type Put.'(this: any) {
				return storage.put(createData()).then((result) => {
					assert.deepEqual(result.type, StoreOperation.Put);
				});
			},
			'Should allow adding existing items by default.'(this: any) {
				const updates = createUpdates();

				storage.put(createData());
				return storage.put(updates[0]).then((result) => {
					assert.deepEqual(result.successfulData, updates[0]);
				});
			}
		},

		'get': {
			'Should get single item.'(this: any) {
				const data = createData();
				return storage.add(data).then(() => storage.get([ 'item-1' ]).then((items) => {
					assert.deepEqual(items, [ createData()[0] ]);
				}));
			},
			'Should get multiple items.'(this: any) {
				const data = createData();
				return storage.add(data).then(() => storage.get(['item-1', 'item-3']).then((items) => {
					assert.deepEqual(items, [ data[0], data[2] ]);
				}));
			},
			'Should only get existing items back.'(this: any) {
				const data = createData();
				const nonexistentId = '4';
				return storage.add(data).then(() => storage.get(['item-1', 'item-3', nonexistentId]).then((items) => {
					assert.deepEqual(items, [data[0], data[2]]);
				}));
			}
		},

		'fetch': {
			'Should fetch all the items when query is not provided.'(this: any) {
				const data = createData();
				return storage.add(data).then(() => storage.fetch().then((items) => {
					assert.deepEqual(items, data);
				}));
			},
			'Should fetch queried items when a query is provided.'(this: any) {
				const data = createData();
				const query = new CompoundQuery({
						query: createFilter<ItemType>().lessThan('value', 3)
					})
					.withQuery(createSort<ItemType>('id', true))
					.withQuery(createRange<ItemType>(1, 1));

				return storage.add(data).then(() => storage.fetch(query).then((items) => {
					assert.deepEqual(items, [ data[0] ]);
				}));
			},
			'incremental query'(this: any) {
				const data = createData();
				const query = createFilter<ItemType>()
					.equalTo('id', 'item-1');

				return storage.add(data).then(() => storage.fetch(query).then((items) => {
					assert.deepEqual(items, [ data[0] ]);
				}));
			},
			'incremental query(not a filter)'(this: any) {
				const data = createData();

				return storage.add(data).then(() => storage.fetch(createSort<ItemType>('value', true)).then((items) => {
					assert.deepEqual(items, data.reverse());
				}));
			},
			'queries after non-incremental query'(this: any) {
				const data = createData();
				const query = new CompoundQuery({
						query: createRange<ItemType>(0, 3)
					})
					.withQuery(createFilter<ItemType>().greaterThan('value', 1))
					.withQuery(createFilter<ItemType>().lessThan('value',  3));

				return storage.add(data).then(() => storage.fetch(query).then((items) => {
					assert.deepEqual(items, [ data[1] ]);
				}));
			},
			'queries around non-incremental query'(this: any) {
				const data = createData();
				const query = new CompoundQuery({
						query: createFilter<ItemType>().greaterThan('value', 1)
					})
					.withQuery(createRange<ItemType>(0, 2))
					.withQuery(createFilter<ItemType>().lessThan('value',  3));

				return storage.add(data).then(() => storage.fetch(query).then((items) => {
					assert.deepEqual(items, [ data[1] ]);
				}));
			},
			'non-incremental query'(this: any) {
				const data = createData();
				const query = createRange<ItemType>(0, 2);

				return storage.add(data).then(() => storage.fetch(query).then((items) => {
					assert.deepEqual(items, [ data[0], data[1] ]);
				}));
			},

			'incremental compound query'(this: any) {
				const data = createData();
				const query = new CompoundQuery<ItemType>({
						query: createFilter<any>().custom(() => true)
					})
					.withQuery(createFilter<any>().custom((item) => item.value === 3));
				return storage.add(data).then(() => storage.fetch(query).then((items) => {
					assert.deepEqual(items, [ data[2] ], 'Didn\'t properly filter items');
				}));
			},

			'nested compound queries'(this: any) {
				const data = createData();
				const query = new CompoundQuery<ItemType>({
					query: new CompoundQuery({
						query: createFilter<ItemType>().custom((item) => item.value === 1)
					})
				});

				return storage.add(data).then(() => storage.fetch(query).then((items) => {
					assert.deepEqual(items, [ data[0] ], 'Didn\'t property apply nested compund query');
				}));
			},

			'redundant filters should not be called'(this: any) {
				const data = createData();
				const spy = sinon.spy();
				const query = new CompoundQuery({
						query: createFilter<ItemType>().custom((item) => false)
					})
					.withQuery(new CompoundQuery<ItemType>({
						query: {
							queryType: QueryType.Filter,
							apply: spy,
							toString() {
								return '';
							},
							incremental: true
						}
					}));

				return storage.add(data).then(() => storage.fetch(query).then((items) => {
					assert.strictEqual(items.length, 0, 'Shouldn\'t have returned any items');
					assert.isFalse(spy.called, 'Should not have called redundant query');
				}));
			}
		},

		'delete': {
			'Should delete items from storage.'(this: any) {
				const data = createData();
				return storage.add(data).then(() => storage.delete(['item-1', 'item-3']).then((result) => {
					assert.deepEqual(result.successfulData, ['item-1', 'item-3']);
				}));
			},
			'Should return a result of type Delete.'(this: any) {
				const data = createData();

				return storage.add(data).then(() => storage.delete(['item-1', 'item-3']).then((result) => {
					assert.deepEqual(result.type, StoreOperation.Delete);
				}));
			},
			'Should return ids even when deleting non-existing items.'(this: any) {
				const data = createData();

				return storage.add(data).then(() => storage.delete(['4']).then((result) => {
					assert.deepEqual(result.successfulData, ['4']);
				}));
			}
		},

		'patch': {
			'Should return patched/updated items.'(this: any) {
				const data = createData();
				const expectedItems = data.map(({id, value, nestedProperty: {value: nestedValue}}) => ({
					id,
					value: value + 2,
					nestedProperty: {
						value: nestedValue + 2
					}
				}));

				return storage.add(data).then(() => storage.patch(patches).then((result) => {
					assert.deepEqual(result.successfulData, expectedItems);
				}));
			},

			'Should return a result of type Patch.'(this: any) {
				const data = createData();

				return storage.add(data).then(() => storage.patch(patches).then((result) => {
					assert.deepEqual(result.type, StoreOperation.Patch);
				}));
			}
		},

		'indices': {
			'should create indices for specified properties'(this: any) {
				const dfd = this.async(1000);
				const request = indexedDB.deleteDatabase('another-test-db-1');
				request.onsuccess = request.onerror = () => {
					new IndexedDBStorage<ItemType>({
						dbName: 'another-test-db-1',
						indices: {
							value: true
						}
					});
					setTimeout(() => {
						const request = indexedDB.open('another-test-db-1');
						request.onsuccess = dfd.callback((event: any) => {
							const objectStore = event.target.result.transaction('items').objectStore('items');
							assert.isTrue(objectStore.indexNames.contains('value'), 'Didn\'t add specified index');
						});
					}, 100);
				};
			},

			'should not error if specifying an existing index'(this: any) {
				const dfd = this.async(1000);
				const request = indexedDB.deleteDatabase('another-test-db-2');
				request.onsuccess = request.onerror = () => {
					new IndexedDBStorage<ItemType>({
						dbName: 'another-test-db-2',
						indices: {
							value: true
						}
					});
					setTimeout(() => {
						indexedDB.open('another-test-db-2').onsuccess = (event: any) => {
							event.target.result.close();
						};
						setTimeout(dfd.rejectOnError(() => {
							assert.doesNotThrow(() => {
								new IndexedDBStorage<ItemType>({
									dbName: 'another-test-db-2',
									version: 10,
									indices: {
										value: true
									}
								});
							});
							setTimeout(dfd.callback(() => {
							}), 100);
						}), 100);
					}, 100);
				};
			},

			'should search using indices if first filter is a simple comparator type'(this: any) {
				const dfd = this.async();
				const request = indexedDB.deleteDatabase('another-test-db-3');
				const spy = sinon.spy();
				const queries: Query<any>[] = [
					createFilter<any>().equalTo('value', 1),
					createFilter<any>().greaterThanOrEqualTo('value', 2),
					createFilter<any>().greaterThan('value', 2),
					createFilter<any>().lessThanOrEqualTo('value', 2),
					createFilter<any>().lessThan('value', 2),
					// With JSON Pointer
					createFilter<any>().equalTo(new JsonPointer('value'), 1),
					createFilter<any>().greaterThanOrEqualTo(new JsonPointer('value'), 2),
					createFilter<any>().greaterThan(new JsonPointer('value'), 2),
					createFilter<any>().lessThanOrEqualTo(new JsonPointer('value'), 2),
					createFilter<any>().lessThan(new JsonPointer('value'), 2)
				];
				queries.forEach((query) => {
					query.apply = spy;
				});
				request.onsuccess = request.onerror = () => {
					const storage = new IndexedDBStorage<ItemType>({
						dbName: 'another-test-db-3',
						indices: {
							value: true
						}
					});

					storage.add(createData()).then(() => {
						Promise.all(queries.map((query) => storage.fetch(query))).then(dfd.callback((results: ItemType[][]) => {
							assert.isFalse(spy.called, 'Should not have called spy for any of the queries');
							const data = createData();
							assert.deepEqual(results[0], [ data[0] ], 'First query should have returned first item');
							assert.deepEqual(results[1], data.slice(1), 'Second query should have returned last two items');
							assert.deepEqual(results[2], [ data[2] ], 'Third query should have returned last item');
							assert.deepEqual(results[3], data.slice(0, 2), 'Fourth query should have returned first two items');
							assert.deepEqual(results[4], [ data[0] ], 'Last query should have returned first item');

							// With JSON Pointers
							assert.deepEqual(results[5], [ data[0] ], 'First query should have returned first item(JSON Pointer)');
							assert.deepEqual(results[6], data.slice(1), 'Second query should have returned last two items(JSON Pointer)');
							assert.deepEqual(results[7], [ data[2] ], 'Third query should have returned last item(JSON Pointer)');
							assert.deepEqual(results[8], data.slice(0, 2), 'Fourth query should have returned first two items(JSON Pointer)');
							assert.deepEqual(results[9], [ data[0] ], 'Last query should have returned first item(JSON Pointer)');
						}));
					});
				};
			},

			'should search using indices with first two filters combined if appropriate'(this: any) {
				const dfd = this.async(1000);
				const request = indexedDB.deleteDatabase('another-test-db-4');
				const spy = sinon.spy();
				const queries: Query<any>[] = [
					createFilter<any>().greaterThanOrEqualTo('value', 2).lessThanOrEqualTo('value', 2),
					createFilter<any>().greaterThan('value', 1).lessThan('value', 3),
					createFilter<any>().lessThanOrEqualTo('value', 2).greaterThanOrEqualTo('value', 2),
					createFilter<any>().lessThan('value', 3).greaterThan('value', 1)
				];
				queries.forEach((query) => {
					query.apply = spy;
				});
				request.onsuccess = request.onerror = () => {
					const storage = new IndexedDBStorage<ItemType>({
						dbName: 'another-test-db-4',
						indices: {
							value: true
						}
					});

					storage.add(createData()).then(() => {
						Promise.all(queries.map((query) => storage.fetch(query))).then(dfd.callback((results: ItemType[][]) => {
							assert.isFalse(spy.called, 'Should not have called spy for any of the queries');
							const data = createData();
							assert.deepEqual(results[0], [ data[1] ], 'First query should have returned second item');
							assert.deepEqual(results[1], [ data[1] ], 'Second query should have returned second item');
							assert.deepEqual(results[2], [ data[1] ], 'Third query should have returned second item');
							assert.deepEqual(results[3], [ data[1] ], 'Fourth query should have returned second item');
						}));
					});
				};
			},

			'should still apply subsequent filters in filter applied to index'(this: any) {
				const dfd = this.async(1000);
				const request = indexedDB.deleteDatabase('another-test-db-5');
				const queries: Query<any>[] = [
					createFilter<any>()
						.greaterThanOrEqualTo('value', 1)
						.lessThanOrEqualTo('value', 3)
						.greaterThan('value', 1)
						.lessThan('value', 3),
					createFilter<any>().greaterThan('value', 1).lessThan('value', 4).notEqualTo('value', 3),
					createFilter<any>().lessThanOrEqualTo('value', 3).greaterThanOrEqualTo('value', 1).equalTo('value', 2),
					createFilter<any>().lessThan('value', 4).greaterThan('value', 0).equalTo('value', 2)
				];
				request.onsuccess = request.onerror = () => {
					const storage = new IndexedDBStorage<ItemType>({
						dbName: 'another-test-db-5',
						indices: {
							value: true
						}
					});

					storage.add(createData()).then(() => {
						Promise.all(queries.map((query) => storage.fetch(query))).then(dfd.callback((results: ItemType[][]) => {
							const data = createData();
							assert.deepEqual(results[0], [ data[1] ], 'First query should have returned second item');
							assert.deepEqual(results[1], [ data[1] ], 'Second query should have returned second item');
							assert.deepEqual(results[2], [ data[1] ], 'Third query should have returned second item');
							assert.deepEqual(results[3], [ data[1] ], 'Fourth query should have returned second item');
						}));
					});
				};
			}
		},

		'shouldn\'t overwrite existing store'(this: any) {
			const dbName = 'another-test-db';
			const storeName = 'another-test-store';
			const dfd = this.async();
			const request = indexedDB.deleteDatabase(dbName);
			request.onsuccess = request.onerror = () => {
				const request = indexedDB.open(dbName);
				request.onupgradeneeded = (event: any) => {
					const db = event.target.result;
					db.createObjectStore(storeName);
				};
				request.onsuccess = (event: any) => {
					storage.add(createData());
					const db = event.target.result;
					const objectStore = db
						.transaction(storeName, 'readwrite')
						.objectStore(storeName);
					const item = createData()[0];
					const request = objectStore.add(item, 'item-1');
					request.onerror = () => {
						dfd.reject(Error('Unable to add item to db'));
					};
					request.onsuccess = () => {
						db.close();
						const newStorage = new IndexedDBStorage<ItemType>({
							dbName: dbName,
							objectStoreName: storeName,
							version: 10
						});

						return newStorage.fetch().then(dfd.callback((data: ItemType[]) => {
							assert.deepEqual(data, [ item ], 'Shouldn\'t have deleted data');
						}), dfd.reject);
					};
				};

				request.onerror = () => {
					dfd.reject('Unable to create database');
				};
			};
		},

		'should fail operations if database startup fails'(this: any) {
			const dfd = this.async();
			const stub = sinon.stub(indexedDB, 'open', () => {
				const requestStub: any = {};
				setTimeout(() => {
					requestStub.error = { message: 'Failed to open database' };
					requestStub.onerror();
				}, 1000);
				return requestStub;
			});

			new IndexedDBStorage({
				dbName: 'test-db'
			}).add(createData()).then(
				() => {
					stub.restore();
					dfd.reject('Should have failed');
				},
				dfd.callback((error: any) => {
					stub.restore();
					assert.strictEqual(
						error.message, 'Failed to open database', 'Should have failed with DB error message'
					);
				})
			);
		},

		'should use a default db name if none is provided'(this: any) {
			const request = indexedDB.deleteDatabase('store-database');
			const dfd = this.async();
			const data = createData();
			request.onsuccess = request.onerror = () => {
				const storage = new IndexedDBStorage();
				storage.add(data).then(() => {
					storage.fetch().then(dfd.callback((fetchedData: ItemType[]) => {
						assert.deepEqual(fetchedData, data, 'Didn\'t use default database and store data');
					}), dfd.reject);
				}, dfd.reject);
			};
		},

		'should have totalLength property on fetch results': {
			'fetch all'(this: any) {
				const data = createData();
				return storage.add(data).then(() => storage.fetch().totalLength.then((totalLength) => {
					assert.equal(3, totalLength, 'Didn\'t return the correct total length');
				}));
			},

			'filtered fetch'(this: any) {
				const data = createData();
				return storage.add(data).then(() => storage.fetch(
					createFilter<any>().lessThan('value', 2)
				).totalLength.then((totalLength) => {
					assert.equal(3, totalLength, 'Didn\'t return the correct total length');
				}));
			}
		},

		'should handle unusually formed filters'(this: any) {
			const dfd = this.async(1000);
			const request = indexedDB.deleteDatabase('another-test-db-6');
			const filterWithNoPath = createFilter<any>().greaterThan('value', 2);
			const filterStartingWithBooleanOp = createFilter<any>();
			filterStartingWithBooleanOp.filterChain!.push(BooleanOp.And);
			(<any> filterWithNoPath.filterChain![0]).path = undefined;
			const queries: Query<any>[] = [
				// Second filter exists but can't be used
				createFilter<any>().greaterThanOrEqualTo('value', 2).equalTo('value', 3),
				// First filter targets the correct property but is not an
				// appropriate filter type
				createFilter<any>().notEqualTo('value', 1).lessThan('value', 3),
				filterWithNoPath,
				// Both have the correct path but cannot be cast to a
				// range
				createFilter<any>().notEqualTo('value', 1).notEqualTo('value', 3),
				// Empty filter chain starting with boolean op,
				filterStartingWithBooleanOp
			];
			request.onsuccess = request.onerror = () => {
				const storage = new IndexedDBStorage<ItemType>({
					dbName: 'another-test-db-6',
					indices: {
						value: true
					}
				});

				storage.add(createData()).then(() => {
					Promise.all(queries.map((query) => storage.fetch(query))).then(dfd.callback((results: ItemType[][]) => {
						const data = createData();
						assert.deepEqual(results[0], [ data[2] ], 'First query should have returned last item');
						assert.deepEqual(results[1], [ data[1] ], 'Second query should have returned second item');
						assert.deepEqual(results[2], [ data[2] ], 'Third query should have returned last item');
						assert.deepEqual(results[3], [ data[1] ], 'Fourth query should have returned second item');
						assert.deepEqual(results[4], data, 'Fourth query should have returned all items');
					}));
				});
			};
		},

		'should throw an error if database doesn\'t exist when trying to create a transaction'(this: any) {
			assert.throws(() => {
				class TestGetTransactionThrows extends IndexedDBStorage<any> {
					constructor() {
						try { super(); } catch (ignore) { }
						this.getTransactionAndObjectStore();
					}
				}
				new TestGetTransactionThrows();
			}, 'Can\'t create transaction because database does not exist');
		}
	};
})());
