import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createMemoryStore from 'src/util/createMemoryStore';

registerSuite({
	name: 'util/createMemoryStore',
	'creation': {
		'no options'() {
			const store = createMemoryStore();
			assert.strictEqual(store.idProperty, 'id');
			assert.isFunction(store.add);
			assert.isFunction(store.get);
			assert.isFunction(store.put);
			assert.isFunction(store.delete);
			assert.isFunction(store.patch);
			assert.isFunction(store.fromArray);
		},
		'options idProperty'() {
			const store = createMemoryStore({
				idProperty: 'foo'
			});
			assert.strictEqual(store.idProperty, 'foo');
		},
		'options data'() {
			const store = createMemoryStore({
				data: [
					{ id: 1, foo: 'bar' },
					{ id: 2, foo: 'baz' },
					{ id: 3, foo: 'qat' },
					{ id: 4, foo: 'qux' }
				]
			});
			return store.get(3).then((item) => {
				assert.deepEqual(item, { id: 3, foo: 'qat' });
			});
		}
	},
	'add()': {
		'resolves to value'() {
			const store = createMemoryStore();
			return store.add({
				id: 1,
				foo: 'bar'
			}).then((value) => {
				assert.deepEqual(value, { id: 1, foo: 'bar' });
			});
		},
		'can be chained'() {
			const store = createMemoryStore();
			return store
				.add({ id: 1, foo: 'bar' })
				.add({ id: 2, foo: 'baz' })
				.then((result) => {
					assert.deepEqual(result, { id: 2, foo: 'baz' });
					return store.get(1).then((item) => {
						assert.deepEqual(item, { id: 1, foo: 'bar' });
					});
				});
		},
		'add duplicate rejects'() {
			const store = createMemoryStore();
			return store
				.add({ id: 1, foo: 'bar' })
				.add({ id: 1, foo: 'baz' })
				.then(() => {
					throw new Error('Should have rejected');
				}, (error) => {
					assert.instanceOf(error, Error);
					assert.include(error.message, 'Duplicate ID');
				});
		// },
		// 'add duplicate reject still chains'() {
		// 	const store = createMemoryStore();
		// 	const p = store
		// 		.add({ id: 1, foo: 'bar' })
		// 		.add({ id: 1, foo: 'baz' });

		// 	console.log(p);

		// 	return p
		// 		.add({ id: 2, foo: 'qat' })
		// 		.then(() => {
		// 			console.log('resolve');
		// 		}, () => {
		// 			console.log('reject');
		// 		});
		}
	},
	'fromArray()'() {
		const store = createMemoryStore();
		return store.fromArray([
				{ id: 1, foo: 'bar' },
				{ id: 2, foo: 'baz' },
				{ id: 3, foo: 'qat' },
				{ id: 4, foo: 'qux' }
			])
			.then(() => {
				return store.get(2).then((item) => {
					assert.deepEqual(item, { id: 2, foo: 'baz' });
					return store.get(4).then((item) => {
						assert.deepEqual(item, { id: 4, foo: 'qux' });
					});
				});
			});
	},
	'static fromArray()'() {
		const store = createMemoryStore.fromArray([
			{ id: 1, foo: 'bar' },
			{ id: 2, foo: 'baz' },
			{ id: 3, foo: 'qat' },
			{ id: 4, foo: 'qux' }
		]);

		return store.get(2).then((item) => {
			assert.deepEqual(item, { id: 2, foo: 'baz' });
			return store.get(4).then((item) => {
				assert.deepEqual(item, { id: 4, foo: 'qux' });
			});
		});
	},
	'patch()': {
		'partial'() {
			const store = createMemoryStore({
				data: [
					{ id: 1, foo: 'bar' }
				]
			});

			return store
				.patch({ foo: 'qat', bar: 1 }, { id: 1 })
				.then((item) => {
					assert.deepEqual(item, { id: 1, foo: 'qat', bar: 1 });
				});
		},
		'missing rejects'() {
			const store = createMemoryStore();

			return store
				.patch({ foo: 'qat', bar: 1}, { id: 1 })
				.then(() => {
					throw new Error('Should have rejected');
				}, (error) => {
					assert.instanceOf(error, Error);
					assert.strictEqual(error.message, 'Object with ID "1" not found, unable to patch.');
				});
		},
		'missing id rejects'() {
			const store = createMemoryStore();

			return store
				.patch({ foo: 'qat', bar: 1})
				.then(() => {
					throw new Error('Should have rejected');
				}, (error) => {
					assert.instanceOf(error, Error);
					assert.strictEqual(error.message, 'Object ID must either be passed in "partial.id" or "options.id"');
				});
		}
	},
	'observer()': {
		'subscribe'() {
			const dfd = this.async();
			const store = createMemoryStore<{ id: number; foo: string; }>();
			store
				.add({ id: 1, foo: 'bar' })
				.then(() => {
					const subscription = store.observe(1).subscribe(dfd.callback((item: { id: number; foo: string; }) => {
						assert.deepEqual(item, { id: 1, foo: 'bar' });
						subscription.unsubscribe();
					}));
				});
		},
		'receive updates'() {
			const dfd = this.async();
			const store = createMemoryStore({
				data: [
					{ id: 1, foo: 'bar' }
				]
			});

			let count = 0;

			const subscription = store.observe(1).subscribe((item) => {
				count++;
				if (count === 1) {
					assert.deepEqual(item, { id: 1, foo: 'bar' });
				}
				else if (count === 2) {
					assert.deepEqual(item, { id: 1, foo: 'baz' });
					subscription.unsubscribe();
					dfd.resolve();
				}
				else {
					dfd.reject(new Error('Wrong number of calls: ' + count));
				}
			});

			store.get(1).then((item) => {
				item.foo = 'baz';
				store.put(item);
			});
		},
		'subscribe to missing id'() {
			const dfd = this.async();
			let callbackCount = 0;
			let errorCount = 0;
			let completeCount = 0;
			const store = createMemoryStore();
			store.observe(1).subscribe(() => {
				callbackCount++;
			}, () => {
				errorCount++;
			}, () => {
				completeCount++;
			});

			setTimeout(dfd.callback(() => {
				assert.strictEqual(callbackCount, 0);
				assert.strictEqual(errorCount, 1);
				assert.strictEqual(completeCount, 0);
			}), 10);
		}
	},
	'delete()': {
		'by id'() {
			const store = createMemoryStore({
				data: [
					{ id: 1, foo: 'bar' },
					{ id: 2, foo: 'baz' },
					{ id: 3, foo: 'qat' }
				]
			});

			return store.delete(2)
				.then((result) => {
					assert.isTrue(result);
					return store.get(2)
						.then((result) => {
							assert.isUndefined(result);
						});
				});
		},
		'by object'() {
			const item = { id: 1, foo: 'bar' };
			const store = createMemoryStore({
				data: [ item ]
			});

			return store.delete(item)
				.then((result) => {
					assert.isTrue(result);
				});
		},
		'not in store'() {
			const store = createMemoryStore();

			return store.delete('foo')
				.then((result) => {
					assert.isFalse(result);
				});
		},
		'complete observable'() {
			const dfd = this.async();
			const stack: any[] = [];
			let complete = false;
			let errorCalled = false;
			const store = createMemoryStore({
				data: [ { id: 1, foo: 'foo' }]
			});
			store.observe(1).subscribe((item) => {
				stack.push(item);
			}, () => {
				errorCalled = true;
			}, () => {
				complete = true;
			});

			setTimeout(() => {
				store.delete(1);
			}, 10);

			setTimeout(dfd.callback(() => {
				assert.strictEqual(stack.length, 1);
				assert.isTrue(complete);
				assert.isFalse(errorCalled);
			}), 20);
		}
	}
});
