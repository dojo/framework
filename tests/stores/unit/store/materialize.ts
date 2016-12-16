import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import { createData, ItemType, createUpdates } from '../support/createData';
import { createQueryStore } from '../../../src/store/mixins/createQueryTransformMixin';
import { createObservableStore, StoreDelta } from '../../../src/store/mixins/createObservableStoreMixin';
import materialize from '../../../src/store/materialize';
import { CrudOptions, Store } from '../../../src/store/createStore';
import { delay } from 'dojo-core/async/timing';

type TransformedObject = {
	_value: number;
	_nestedProperty: {
		_value: number;
	};
	_id: string;
};

registerSuite({
	name: 'materialize',

	'Should apply updates to target store'(this: any) {
		const dfd = this.async();
		const targetStore = createObservableStore<TransformedObject, CrudOptions>({
			idProperty: '_id'
		});
		const trackableQueryStore = createQueryStore({
			data: createData()
		});
		const trackedCollection = trackableQueryStore
			.transform((item) => ({
				_value: item.value,
				_nestedProperty: {
					_value: item.nestedProperty.value
				},
				_id: item.id
			}), '_id')
			.filter(function(item) {
				return item._value > 1;
			})
			.range(0, 100)
			.track();

		let ignoreFirst = true;
		let initialUpdateFromSource = false;
		targetStore.observe().subscribe(dfd.rejectOnError(({ adds, deletes }: StoreDelta<any>) => {
			if (ignoreFirst) {
				ignoreFirst = false;
				return;
			}

			if (!initialUpdateFromSource) {
				initialUpdateFromSource = true;
				assert.deepEqual(adds, [
					{
						_id: '2',
						_value: 2,
						_nestedProperty: {
							_value: 2
						}
					},
					{
						_id: '3',
						_value: 3,
						_nestedProperty: {
							_value: 1
						}
					}
				], 'Didn\'t add initial data to target store');
			}
			else {
				assert.deepEqual(deletes, [ '2' ]);
				dfd.resolve();
			}
		}));

		materialize({ source: trackedCollection, target: targetStore });
		trackableQueryStore.delete('2');
	},

	'Should stop applying updates after destroying handle'(this: any) {
		const dfd = this.async();
		const targetStore = createObservableStore<TransformedObject, CrudOptions>({
			idProperty: '_id'
		});
		const trackableQueryStore = createQueryStore({
			data: createData()
		});
		const trackedCollection = trackableQueryStore
			.transform((item) => ({
				_value: item.value,
				_nestedProperty: {
					_value: item.nestedProperty.value
				},
				_id: item.id
			}), '_id')
			.filter(function(item) {
				return item._value > 1;
			})
			.range(0, 100)
			.track();

		let ignoreFirst = true;
		let initialUpdateFromSource = false;
		targetStore.observe().subscribe(dfd.rejectOnError(({ adds }: StoreDelta<any>) => {
			if (ignoreFirst) {
				ignoreFirst = false;
				return;
			}

			if (!initialUpdateFromSource) {
				initialUpdateFromSource = true;
				assert.deepEqual(adds, [
					{
						_id: '2',
						_value: 2,
						_nestedProperty: {
							_value: 2
						}
					},
					{
						_id: '3',
						_value: 3,
						_nestedProperty: {
							_value: 1
						}
					}
				], 'Didn\'t add initial data to target store');
				handle.destroy();
				trackableQueryStore.delete('2');
				setTimeout(dfd.resolve, 300);
			}
			else {
				dfd.reject(Error('Shouldn\'t have received another update after handle was destroyed'));
			}
		}));

		const handle = materialize({ source: trackedCollection, target: targetStore });
	},

	'Should use apply function if provided'(this: any) {
		const dfd = this.async();
		const targetStore = createObservableStore<TransformedObject, CrudOptions>({
			idProperty: '_id'
		});
		const trackableQueryStore = createQueryStore({
			data: createData()
		});
		const trackedCollection = trackableQueryStore
			.transform((item) => ({
				_value: item.value,
				_nestedProperty: {
					_value: item.nestedProperty.value
				},
				_id: item.id
			}), '_id')
			.filter(function(item) {
				return item._value > 1;
			})
			.range(0, 100)
			.track();

		let ignoreFirst = true;
		targetStore.observe().subscribe(dfd.rejectOnError((update: StoreDelta<any>) => {
			if (ignoreFirst) {
				ignoreFirst = false;
				return;
			}
			dfd.reject(Error('Shouldn\'t have received another update since apply function was used'));
		}));

		let initialUpdateFromSource = false;
		materialize({
			source: trackedCollection,
			target: targetStore,
			apply: dfd.rejectOnError((target: Store<any, any, any>, { afterAll, deletes }: StoreDelta<any>, source: any) => {
				if (!initialUpdateFromSource) {
					initialUpdateFromSource = true;
					assert.deepEqual(afterAll, [
						{
							_id: '2',
							_value: 2,
							_nestedProperty: {
								_value: 2
							}
						},
						{
							_id: '3',
							_value: 3,
							_nestedProperty: {
								_value: 1
							}
						}
					], 'Didn\'t add initial data to target store');
				}
				else {
					assert.deepEqual(deletes, [ '2' ]);
					dfd.resolve();
				}
			})
		});

		trackableQueryStore.delete('2');
	},

	'Shouldn\'t make any updates if initial update is empty'(this: any) {
		const dfd = this.async(1000);
		const targetStore = createQueryStore<ItemType>();
		const trackableQueryStore = createQueryStore<ItemType>();
		const trackedCollection = trackableQueryStore.filter(() => true).track();

		targetStore.add = dfd.reject.bind(dfd, Error('Shouldn\'t have called add on targetStore'));

		materialize({
			source: trackedCollection,
			target: targetStore
		});

		setTimeout(dfd.resolve, 200);
	},

	'Should add new items to targetStore'(this: any) {
		const targetStore = createQueryStore<ItemType>();
		const trackableQueryStore = createQueryStore<ItemType>();
		const trackedCollection = trackableQueryStore.filter(() => true).track();

		const spy = sinon.spy(targetStore, 'add');

		materialize({
			source: trackedCollection,
			target: targetStore
		});

		trackableQueryStore.add(createData());

		return delay(100)(() => {
			assert.isTrue(spy.calledOnce, 'Should have called add on target store once');
			assert.deepEqual(spy.args[0][0], createData());
		});
	},

	'Should update items in target store'(this: any) {
		const targetStore = createQueryStore<ItemType>();
		const trackableQueryStore = createQueryStore<ItemType>();
		const trackedCollection = trackableQueryStore.filter(() => true).track();

		const spy = sinon.spy(targetStore, 'put');

		materialize({
			source: trackedCollection,
			target: targetStore
		});

		trackableQueryStore.add(createData());
		trackableQueryStore.put(createUpdates()[0]);

		return delay(100)(() => {
			assert.isTrue(spy.calledOnce, 'Should have called add on target store once');
			assert.deepEqual(spy.args[0][0], createUpdates()[0]);
		});
	}
});
