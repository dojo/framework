import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createStore, { StoreOperation, StoreOptions, CrudOptions, Store, UpdateResults} from '../../../../src/store/createStore';
import createTransactionMixin, { TransactionStore } from '../../../../src/store/mixins/createTransactionMixin';
import { createData, ItemType, createUpdates, patches, patchedItems } from '../../support/createData';
import { ComposeFactory } from '@dojo/compose/compose';
import createAsyncStorage from '../../support/AsyncStorage';

interface TransactionStoreFactory extends ComposeFactory<TransactionStore<{}, {}, any, any>, any> {
	<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>>(options?: StoreOptions<T, O>): TransactionStore<T, O, U, C>;
}

const createTransactionStore: TransactionStoreFactory = createStore
	.mixin(createTransactionMixin());

registerSuite(function(){

	function getStoreAndDfd(test: any, useAsync = true) {
		const dfd = useAsync ? test.async(1000) : null;

		const transactionStore = createTransactionStore();

		return { dfd, transactionStore, data: createData() };
	}

	return {
		name: 'createTransactionMixin',

		'should allow chaining of operations'(this: any) {
			const { dfd, transactionStore, data } = getStoreAndDfd(this);
			const updates = createUpdates();

			transactionStore.transaction()
				.add(data)
				.put(updates[0])
				.delete(data[0].id)
				.commit()
				.subscribe(
					function next() {
					},
					function error() {
					},
					function completed() {
						transactionStore.fetch().then(dfd.callback(function(data: ItemType[]) {
							assert.deepEqual(data, updates[0].slice(1));
						}));
					}
				);
		},
		'should receive all action results in order at once in an array.'(this: any) {
			const { dfd, transactionStore, data } = getStoreAndDfd(this);
			const updates = createUpdates();
			transactionStore.transaction()
				.add(data)
				.put(updates[0])
				.delete(data[0].id)
				.commit()
				.subscribe(dfd.callback(function(result: UpdateResults<ItemType>[]) {
					assert.lengthOf(result, 3);
					assert.strictEqual(result[0].type, StoreOperation.Add, '1st action should be of type "Add"');
					assert.deepEqual(result[0].successfulData, createData());
					assert.strictEqual(result[1].type, StoreOperation.Put, '2nd action should be of type "Put"');
					assert.deepEqual(result[1].successfulData, createUpdates()[0]);
					assert.strictEqual(result[2].type, StoreOperation.Delete, '3rd action should be of type "Delete"');
					assert.deepEqual(result[2].successfulData, ['item-1']);
					dfd.resolve();
				}));
		},
		'Patch which operates in place should not update previous operation result.'(this: any) {
			const { dfd, transactionStore, data } = getStoreAndDfd(this);
			transactionStore.transaction()
				.add(data)
				.patch(patches[0])
				.commit()
				.subscribe(dfd.callback(function(result: UpdateResults<ItemType>[]) {
					assert.lengthOf(result, 2);
					assert.strictEqual(result[0].type, StoreOperation.Add, '1st action should be of type "Add"');
					assert.deepEqual(result[0].successfulData, createData());
					assert.strictEqual(result[1].type, StoreOperation.Patch, '2nd action should be of type "Patch"');
					assert.deepEqual(result[1].successfulData, [
						patchedItems[0]
					]);
					dfd.resolve();
				}));
		},
		'should resolve as a thenable when all parts of a transaction have completed': function(this: any) {
			const { transactionStore, data } = getStoreAndDfd(this, false);
			const updates = createUpdates();

			return transactionStore.transaction()
				.add(data)
				.put(updates[0])
				.delete(data[0].id)
				.commit()
				.then(function() {
					return transactionStore.fetch().then(function(data) {
						assert.deepEqual(data, [ updates[0][1], updates[0][2] ],
							'Transaction didn\'t properly resolve after all operations completed');
					});
				});
		},
		'should be able to abort and start a new transaction.': function(this: any) {
			const { transactionStore, data } = getStoreAndDfd(this, false);
			const updates = createUpdates();

			transactionStore.transaction()
				.add(data)
				.put(updates[0])
				.delete(data[0].id)
				.abort()

				.transaction()
				.add(data)
				.put(updates[0])
				.commit()
				.then(function() {
					return transactionStore.fetch().then(function(data) {
						assert.deepEqual(data, updates[0],
									'Transaction didn\'t properly resolve after all operations completed');
					});
				});
		},
		'should queue up operations in order, regardless of the behavior of the async storage.'(this: any) {
			const transactionStore = createTransactionStore({
				storage: createAsyncStorage({ delete: 10, put: 30 })
			});
			const data = createData();
			const updates = createUpdates();

			return transactionStore.transaction()
				.add(data)
				.put(updates[0])
				.delete(data[0].id)
				.commit()
				.then(function() {
					return transactionStore.fetch().then(function(data) {
						assert.deepEqual(data, [ updates[0][1], updates[0][2] ],
									'Transaction didn\'t properly resolve after all operations completed');
					});
				});
		}
	};
}());
