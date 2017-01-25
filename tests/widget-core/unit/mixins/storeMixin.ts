import compose from '@dojo/compose/compose';
import * as registerSuite from 'intern!object';
import Promise from '@dojo/shim/Promise';
import * as assert from 'intern/chai!assert';
import storeMixinFactory from '../../../src/mixins/storeMixin';
import { createObservableStore, ObservableStore } from '@dojo/stores/store/mixins/createObservableStoreMixin';

let store: ObservableStore<{}, {}, any>;

const storeMixinWithProperties = compose({
	properties: <any> {},
	invalidate() {},
	diffProperties(this: any, previousProperties: any, newProperties: any) {}
}, (instance, options: any) => {
	if (options) {
		instance.properties = options.properties;
	}
}).mixin(storeMixinFactory);

registerSuite({
	name: 'mixins/storeMixin',
	beforeEach() {
		store = createObservableStore({
			data: [
				{ id: '1', foo: 'bar' },
				{ id: '2', foo: 'bar' }
			]
		});
	},
	observe: {
		'throw error if `store` property is not passed'() {
			assert.throws(() => storeMixinWithProperties({properties: { id: '1' } }), Error);
		},
		observe() {
			const properties = {
				id: '1',
				store
			};
			const storeMixin = storeMixinWithProperties({ properties });
			let stateChangeCount = 0;

			const promise = new Promise((resolve, reject) => {
				storeMixin.on('state:changed', ({ state }: any) => {
					stateChangeCount++;
					try {
						assert.equal(stateChangeCount, 1);
						assert.deepEqual(state, { id: '1', foo: 'bar'});
						resolve();
					} catch (err) {
						reject(err);
					}
				});
			});

			storeMixin.diffProperties({}, properties);
			storeMixin.observe();
			storeMixin.observe();
			return promise;
		},
		'throws error if observe called with a different id'() {
			const storeMixin = storeMixinWithProperties({ properties: { id: '1', store } });

			storeMixin.observe();
			storeMixin.properties.id = '2';
			assert.throws(() => storeMixin.observe(), Error);

		}
	},
	getState() {
		const storeMixin = storeMixinWithProperties({ properties: { id: '1', store } });

		const promise = new Promise((resolve, reject) => {
			storeMixin.on('state:changed', () => {
				try {
					assert.deepEqual(storeMixin.state, { id: '1', foo: 'bar'});
					resolve();
				} catch (err) {
					reject(err);
				}
			});
		});

		storeMixin.observe();
		assert.deepEqual(storeMixin.state, Object.create(null));
		return promise;
	},
	setState: {
		'when observing a single item'() {
			const storeMixin = storeMixinWithProperties({ properties: { id: '1', store } });
			let intialStateChange = true;

			const promise = new Promise((resolve, reject) => {
				storeMixin.on('state:changed', () => {
					try {
						if (intialStateChange) {
							intialStateChange = false;
							assert.deepEqual(storeMixin.state, { id: '1', foo: 'bar'});
						}
						else {
							assert.deepEqual(storeMixin.state, { id: '1', foo: 'baz', baz: 'qux' });
							resolve();
						}
					} catch (err) {
						reject(err);
					}
				});
			});

			storeMixin.observe();
			assert.deepEqual(storeMixin.state, Object.create(null));
			storeMixin.setState({ id: '1', foo: 'baz', baz: 'qux' });
			return promise;
		},
		'when observing the whole store'() {
			const store = createObservableStore({
				data: [
					{ id: '1', foo: 'bar' },
					{ id: '2', foo: 'bar' }
				]
			});

			const storeMixin = storeMixinWithProperties({ properties: { store } });
			let intialStateChange = true;

			const promise = new Promise((resolve, reject) => {
				storeMixin.on('state:changed', () => {
					try {
						if (intialStateChange) {
							intialStateChange = false;
							assert.isOk(storeMixin.state);
							assert.lengthOf(storeMixin.state['data'], 2);
							assert.deepEqual(storeMixin.state, { data: [
								{ id: '1', foo: 'bar'}, { id: '2', foo: 'bar' }
							] });
						}
						else {
							assert.isOk(storeMixin.state);
							assert.lengthOf(storeMixin.state['data'], 2);
							assert.deepEqual(storeMixin.state, { data: [
								{ id: '1', foo: 'baz', baz: 'qux'}, { id: '2', foo: 'bar' }
							]});
							resolve();
						}
					} catch (err) {
						reject(err);
					}
				});
			});

			storeMixin.observe();
			storeMixin.setState({ id: '1', foo: 'baz', baz: 'qux' });

			return promise;
		},
		'throws error if no id can be determined'() {
			const storeMixin = storeMixinWithProperties({ properties: { store } });
			storeMixin.observe();
			assert.throws(() => storeMixin.setState({ foo: 'baz', baz: 'qux' }), Error);
		}
	},
	'on "state:changed event'() {
		let invalidateCalled = false;
		const storeMixin = storeMixinWithProperties.mixin({
			mixin: {
				invalidate(): void {
					invalidateCalled = true;
				}
			}
		})({ properties: { id: '1', store } });

		storeMixin.emit({ type: 'state:changed' });
		assert.isTrue(invalidateCalled);
	},
	'on "properties:changed" event': {
		'initial properties'() {
			const storeMixin = storeMixinWithProperties({ properties: { id: '1', store } });

			const promise = new Promise((resolve, reject) => {
				storeMixin.on('state:changed', () => {
					try {
						assert.deepEqual(storeMixin.state, { id: '1', foo: 'bar' });
						resolve();
					} catch (err) {
						reject(err);
					}
				});
			});

			return promise;
		},

		'call destroy on observe handle if store has been updated.'() {
			const initialProperties = {
				id: '1',
				store
			};
			const storeMixin = storeMixinWithProperties({ properties: initialProperties });
			const newStore = createObservableStore({ data: [ { id: '1', foo: 'bar' } ]});
			let intialStateChange = true;

			const promise = new Promise((resolve, reject) => {
				storeMixin.on('state:changed', ({ target }: any) => {
					try {
						if (intialStateChange) {
							intialStateChange = false;
							assert.equal(target.properties.store, store);
							const updatedProperties = {
								store: newStore,
								id: '1'
							};
							storeMixin.properties = updatedProperties;
							storeMixin.emit({
								type: 'properties:changed',
								target: storeMixin,
								properties: updatedProperties,
								changedPropertyKeys: [ 'store' ]
							});
						}
						else {
							assert.equal(target.properties.store, newStore);
							resolve();
						}
					} catch (err) {
						reject(err);
					}
				});
			});

			storeMixin.emit({
				type: 'properties:changed',
				target: storeMixin,
				properties: initialProperties,
				changedPropertyKeys: [ 'store', 'id' ]
			});

			return promise;
		},
		'call destroy on observe handle if id has been updated.'() {
			const initialProperties = {
				id: '1',
				store
			};
			const storeMixin = storeMixinWithProperties({ properties: initialProperties });
			let intialStateChange = true;
			const promise = new Promise((resolve, reject) => {
				storeMixin.on('state:changed', ({ target }: any) => {
					try {
						if (intialStateChange) {
							intialStateChange = false;
							assert.equal(target.properties.id, '1');
							const updatedProperties = {
								store,
								id: '2'
							};
							storeMixin.properties = updatedProperties;
							storeMixin.emit({
								type: 'properties:changed',
								target: storeMixin,
								properties: updatedProperties,
								changedPropertyKeys: [ 'id' ]
							});
						}
						else {
							assert.equal(target.properties.id, '2');
							resolve();
						}
					} catch (err) {
						reject(err);
					}
				});
			});

			storeMixin.emit({
				type: 'properties:changed',
				target: storeMixin,
				properties: initialProperties,
				changedPropertyKeys: [ 'store', 'id' ]
			});

			return promise;
		}
	}
});
