import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import { duplicate } from 'dojo-core/lang';
import createSubcollectionStore from '../../../../src/store/createSubcollectionStore';
import createQueryMixin, { QueryStore } from '../../../../src/store/mixins/createQueryMixin';
import createObservableStoreMixin, { ObservableStore, ObservableStoreOptions } from '../../../../src/store/mixins/createObservableStoreMixin';
import { createData, ItemType, patches, createUpdates } from '../../support/createData';
import { SubcollectionOptions } from '../../../../src/store/createSubcollectionStore';
import { CrudOptions, Store } from '../../../../src/store/createStore';
import { UpdateResults } from '../../../../src/storage/createInMemoryStorage';
import { ComposeFactory } from 'dojo-compose/compose';
import { createFilter } from '../../../../src/query/Filter';
import { createRange } from '../../../../src/query/StoreRange';
import { createSort } from '../../../../src/query/Sort';

interface QueryStoreFactory extends ComposeFactory<QueryStore<{}, {}, any, any>, SubcollectionOptions<{}, {}, any>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: SubcollectionOptions<T, O, U>): QueryStore<T, O, U, Store<T, O, U>>;
}

type ObservableQueryStore<T, O extends CrudOptions, U extends UpdateResults<T>> = ObservableStore<T, O, U> & QueryStore<T, O, U, ObservableStore<T, O, U>>;
interface ObservableQueryFactory extends ComposeFactory<ObservableQueryStore<{}, {}, any>, SubcollectionOptions<{}, {}, any> & ObservableStoreOptions<{}, {}>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: SubcollectionOptions<T, O, U> & ObservableStoreOptions<T, O>): ObservableQueryStore<T, O, U>;
}

const createQueryStore: QueryStoreFactory = createSubcollectionStore
	.mixin(createQueryMixin());
const createObservableQueryStore: ObservableQueryFactory = createQueryStore
	.mixin(createObservableStoreMixin());

registerSuite(function(){

	function getStoreAndDfd(test: any) {
		const dfd = test.async(1000);
		const queryStore = createQueryStore<ItemType, CrudOptions, any>({
			data: createData()
		});

		const emptyStore = createQueryStore();
		const observableQueryStore: ObservableQueryStore<ItemType, CrudOptions, any> = createObservableQueryStore<ItemType, CrudOptions, any>();

		return { dfd, queryStore, emptyStore, observableQueryStore };
	}

	return {
		name: 'createQueryMixin',
		'single query': function(this: any) {
			const { dfd, queryStore } = getStoreAndDfd(this);

			queryStore.filter(function(item: ItemType) {
				return String(item.id) === '1';
			}).fetch().then(function(items) {
				assert.deepEqual(items, [ createData()[0] ], 'Didn\'t filter items propertly');
			}).then(dfd.resolve);
		},

		'nested queries': function(this: any) {
			const { dfd, queryStore } = getStoreAndDfd(this);

			queryStore.filter(function(item: ItemType) {
				return String(item.id) === '1' || String(item.id) === '2';
			}).filter(function(item: ItemType) {
				return String(item.id) === '2';
			}).fetch().then(function(items) {
				assert.deepEqual(items, [ createData()[1] ], 'Didn\'t filter items properly with nested query');
			}).then(dfd.resolve);
		},

		'should retrieve source collection\'s data with queries'(this: any) {
			const { dfd, queryStore } = getStoreAndDfd(this);
			queryStore
				.filter(createFilter<ItemType>().lessThan('value', 3))
				.sort('value', true)
				.fetch().then(dfd.callback(function(fetchedData: ItemType[]) {
					assert.deepEqual(fetchedData, [ createData()[1], createData()[0] ]);
				}));
		},

		'should delegate to source collection'(this: any) {
			const { dfd, emptyStore } = getStoreAndDfd(this);
			const subCollection = emptyStore.filter(createFilter<ItemType>().lessThan('value', 3));
			const data = createData();
			const spies = [
				sinon.spy(emptyStore, 'put'),
				sinon.spy(emptyStore, 'add'),
				sinon.spy(emptyStore, 'delete'),
				sinon.spy(emptyStore, 'patch')
			];
			subCollection.add(duplicate(data[0]));
			subCollection.put(duplicate(data[0]));
			subCollection.patch(patches[0]);
			subCollection.delete(data[0].id);

			spies.forEach(spy => assert.isTrue(spy.calledOnce));
			dfd.resolve();
		},

		'should be notified of changes in parent collection'(this: any) {
			const { dfd, observableQueryStore } = getStoreAndDfd(this);

			const data = createData();
			const updates = createUpdates();
			const calls: Array<() => any> = [
				() => observableQueryStore.put(updates[0].map(item => duplicate(item))),
				() => observableQueryStore.patch(patches),
				() => observableQueryStore.delete(data[0].id)
			];
			const subCollection = observableQueryStore.filter(createFilter<ItemType>().lessThan('value', 3));
			observableQueryStore.add(data[0]);
			subCollection.observe().subscribe(function() {
				let nextCall: () => any = calls.shift();
				if (nextCall) {
					nextCall();
				} else {
					dfd.resolve();
				}
			});
		},

		'should allow fetch with sort on a sorted store'(this: any) {
			const { dfd, queryStore } = getStoreAndDfd(this);
			const data = createData();

			queryStore.sort(createSort<ItemType>('id', true)).fetch(createSort<ItemType>('id', false))
				.then(dfd.callback(function(fetchedData: ItemType[]) {
					assert.deepEqual(fetchedData, [ data[0], data[1], data[2] ], 'Data fetched with sort was incorrect');
				}));
		},

		'should allow fetch with filter on a filtered store'(this: any) {
			const { dfd, queryStore } = getStoreAndDfd(this);
			const data = createData();

			queryStore.filter(createFilter<ItemType>().greaterThanOrEqualTo('value', 2)).fetch(createFilter<ItemType>().lessThan('value', 3))
				.then(dfd.callback(function(fetchedData: ItemType[]) {
					assert.deepEqual(fetchedData, [ data[1] ], 'Data fetched with filter was incorrect');
				}));
		},

		'should allow fetch with range on a range filtered store'(this: any) {
			const { dfd, queryStore } = getStoreAndDfd(this);
			const data = createData();

			queryStore.range(1, 2).fetch(createRange<ItemType>(1, 1))
				.then(dfd.callback(function(fetchedData: ItemType[]) {
					assert.deepEqual(fetchedData, [ data[2] ], 'Data fetched with range was incorrect');
				}));
		},

		'all query mixin APIs should work together'(this: any) {
			const { dfd, queryStore } = getStoreAndDfd(this);
			const data = createData();

			queryStore
				.filter(createFilter<ItemType>().greaterThanOrEqualTo('value', 2))
				.filter( (item) => item.value >= 2 )
				.sort( createSort<ItemType>('id', true) )
				.range(createRange<ItemType>(1, 1))
				.range(0, 1)
				.fetch().then(dfd.callback(function(fetchedData: ItemType[]) {
					assert.deepEqual(fetchedData, [ data[1] ], 'Data fetched with multiple queries was incorrect');
				}));
		}
	};
}());
