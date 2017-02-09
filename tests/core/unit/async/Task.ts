import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from '@dojo/shim/Promise';
import { Thenable } from '@dojo/shim/interfaces';
import { ShimIterator } from '@dojo/shim/iterator';
import Task, { State, isTask } from '../../../src/async/Task';

let suite = {
	name: 'Task',

	'isTask()'() {
		const task = new Task((resolve) => resolve(), () => {
		});

		assert.isTrue(isTask(task), 'Should return true');
		assert.isFalse(isTask(Promise.resolve()), 'Should return false');
		assert.isFalse(isTask(true), 'Should return false');
		assert.isFalse(isTask(null), 'Should return false');
		assert.isFalse(isTask({}), 'Should return false');
		assert.isFalse(isTask(1), 'Should return false');
		assert.isFalse(isTask(NaN), 'Should return false');
	},

	'Task#cancel'(this: any) {
		let dfd = this.async();
		let cancelerCalled = false;
		let resolver: any;
		let task = new Task(
			function (resolve) {
				resolver = resolve;
			},
			function () {
				cancelerCalled = true;
			}
		).then(dfd.rejectOnError(function () {
			assert(false, 'Task should not have resolved');
		}));

		task.cancel();
		resolver();

		assert.isTrue(cancelerCalled, 'Canceler should have been called synchronously');
		assert.strictEqual(task.state, State.Canceled, 'Task should have Canceled state');

		setTimeout(dfd.callback(function () {}), 100);
	},

	'Task#cancel with no canceler'(this: any) {
		let dfd = this.async();
		let resolver: any;
		let task = new Task((resolve) => {
			resolver = resolve;
		}).then(dfd.rejectOnError(function () {
			assert(false, 'Task should not have resolved');
		}));

		task.cancel();
		resolver();

		assert.strictEqual(task.state, State.Canceled, 'Task should have canceled state');
		setTimeout(dfd.callback(() => {
		}), 100);
	},

	'Task#cancel resolved/rejected promises don\'t call canceler'(this: any) {
		let dfd = this.async();
		let cancelCalled = false;
		let task = new Task((resolve) => {
			setTimeout(() => {
				resolve();
			}, 0);
		}, () => {
			cancelCalled = true;
		});

		setTimeout(() => {
			task.cancel();
		}, 10);

		setTimeout(dfd.callback(() => {
			assert.strictEqual(task.state, State.Fulfilled, 'Task should have fulfilled state');
			assert.isFalse(cancelCalled, 'Cancel should not have been called');
		}), 100);
	},

	'Task#finally': {
		'canceled resolve'(this: any) {
			let dfd = this.async();
			let resolver: any;
			let task = new Task(
				function (resolve) {
					resolver = resolve;
				},
				function () {}
			)
			.then(dfd.rejectOnError(function () {
				assert(false, 'Task should not have resolved');
			}), dfd.rejectOnError(function () {
				assert(false, 'Task should not have rejected');
			}))
			.finally(dfd.callback(function () {
			}));

			task.cancel();
			resolver();
		},

		'canceled reject'(this: any) {
			let dfd = this.async();
			let resolver: any;
			let task = new Task(
				function (resolve, reject) {
					resolver = reject;
				},
				function () {}
			)
			.then(dfd.rejectOnError(function () {
				assert(false, 'Task should not have resolved');
			}), dfd.rejectOnError(function () {
				assert(false, 'Task should not have rejected');
			}))
			.finally(dfd.callback(function () {}));

			task.cancel();
			resolver();
		},

		'canceled with multiple children'(this: any) {
			let dfd = this.async(5000, 4);
			let resolver: any;
			let task = new Task(
				function (resolve, reject) {
					resolver = resolve;
				},
				function () {}
			).finally(function () {
				return Task.resolve(5);
			});

			let taskA = task.finally(function () {
				dfd.resolve();
				throw new Error('foo');
			});
			taskA.finally(dfd.callback(function () {}));
			task.finally(dfd.callback(function () {}));
			task.finally(dfd.callback(function () {}));

			task.cancel();
			resolver();
		},

		'canceled and resolved inside then callback'(this: any) {
			let dfd = this.async();
			let resolver: any;

			let task = new Task(
				function (resolve, reject) {
					resolver = resolve;
				},
				function () {}
			).then(function () {
				task.cancel();
				return new Promise(function (resolve, reject) {
					setTimeout(resolve);
				});
			})
			.then(dfd.rejectOnError(function () {
				assert(false, 'should not have run');
			}))
			.then(dfd.rejectOnError(function () {
				assert(false, 'should not have run');
			}))
			.finally(dfd.callback(function () {}));

			resolver();
		},

		'canceled and rejected inside then callback'(this: any) {
			let dfd = this.async();
			let resolver: any;

			let task = new Task(
				function (resolve, reject) {
					resolver = resolve;
				},
				function () {}
			).then(function () {
				task.cancel();
				return new Promise(function (resolve, reject) {
					setTimeout(reject);
				}).catch(() => {});
			})
			.then(dfd.rejectOnError(function () {
				assert(false, 'should not have run');
			}))
			.then(dfd.rejectOnError(function () {
				assert(false, 'should not have run');
			}))
			.catch(() => {})
			.finally(dfd.callback(function () {}));

			resolver();
		},

		'invoked if already canceled'(this: any) {
			const dfd = this.async();
			const task = new Task(() => {
			});
			task.cancel();

			task.finally(dfd.callback(() => {
			}));
		},

		'finally is only called once when called after cancel'(this: any) {
			let callCount = 0;
			const dfd = this.async();
			const task = new Task((resolve) => {
				setTimeout(resolve, 10);
			});
			task.cancel();
			task.finally(dfd.callback(() => {
				callCount++;
			}));

			setTimeout(dfd.callback(() => {
				assert.equal(callCount, 1);
			}), 100);
		},

		'finally is only called once when called before cancel'(this: any) {
			let callCount = 0;
			const dfd = this.async();
			const task = new Task((resolve) => {
				setTimeout(resolve, 10);
			});
			task.finally(dfd.callback(() => {
				callCount++;
			}));
			task.cancel();

			setTimeout(dfd.callback(() => {
				assert.equal(callCount, 1);
			}), 100);
		},

		'finally does not change the resolve value'(this: any) {
			const dfd = this.async();
			let task = new Task((resolve) => {
				setTimeout(resolve.bind(null, 'test'), 10);
			});
			task = task.finally(() => 'changed');
			task.then(dfd.callback((value: string) => {
				assert.strictEqual(value, 'test');
			}));
		}
	},

	'Task.resolve': {
		'returns a task'() {
			const task = Task.resolve('foo');

			assert.isFunction(task.cancel, 'A task should have a cancel function');
			assert.isFunction(task.finally, 'A task should have a finally function');

			return task.then((result) => {
				assert.strictEqual(result, 'foo', 'result should equal "foo"');
			});
		}
	}
};

/* tslint:disable-next-line:variable-name */
function addPromiseTests(suite: any, Promise: any) {
	suite['.all'] = {
		'empty array': function (this: any) {
			let dfd = this.async();
			let promise = Promise.all([]).then(dfd.callback(function (value: any[]) {
				assert.isArray(value);
				assert.deepEqual(value, []);
			}));
			assert.instanceOf(promise, Promise, 'promise should have expected type');
		},

		'mixed values and resolved': function (this: any) {
			let dfd = this.async();
			Promise.all([ 0, Promise.resolve(1), Promise.resolve(2) ]).then(
				dfd.callback(function (value: number[]) {
					assert.isArray(value);
					assert.deepEqual(value, [ 0, 1, 2 ]);
				})
			);
		},

		'iterable argument': function (this: any) {
			let dfd = this.async();
			Promise.all({
				[Symbol.iterator]() {
					return new ShimIterator<number | Thenable<number>>([
						0, Promise.resolve(1), Promise.resolve(2)
					]);
				}
			}).then(
				dfd.callback(function (value: number[]) {
					assert.isArray(value);
					assert.deepEqual(value, [ 0, 1, 2 ]);
				})
			);
		},

		'reject if any rejected': function (this: any) {
			let dfd = this.async();
			let pending = new Promise(function () {});
			let rejected = Promise.reject(new Error('rejected'));

			Promise.all([ pending, rejected ]).then(
				dfd.rejectOnError(function () {
					assert(false, 'Should not have resolved');
				}),
				dfd.callback(function (error: Error) {
					assert.strictEqual(error.message, 'rejected');
				})
			);
		},

		'foreign thenables': function (this: any) {
			let dfd = this.async();
			let normal = Promise.resolve(1);
			let foreign = <any> {
				then: function (f: Function) {
					f(2);
				}
			};

			Promise.all([ normal, foreign ]).then(dfd.callback(function (value: number[]) {
				assert.deepEqual(value, [ 1, 2 ]);
			}));
		},

		'non-callable thenables': function (this: any) {
			let dfd = this.async();
			let normal = Promise.resolve(1);
			let foreign = <any> { then: 'foo' };

			Promise.all([ normal, foreign ]).then(dfd.callback(function (value: number[]) {
				assert.deepEqual(value, [ 1, foreign ]);
			}));
		},

		'sparse array': {
			all(this: any) {
				let dfd = this.async();
				let iterable: any[] = [];

				iterable[1] = Promise.resolve(1);
				iterable[3] = Promise.resolve(3);

				Promise.all(iterable).then(dfd.callback(function (value: number[]) {
					assert.isUndefined(value[0]);
					assert.strictEqual(value[1], 1);
					assert.isUndefined(value[2]);
					assert.strictEqual(value[3], 3);
				}));
			},

			race(this: any) {
				let dfd = this.async();
				let iterable: any[] = [];

				iterable[1] = Promise.resolve(1);
				iterable[3] = Promise.resolve(3);

				Promise.race(iterable).then(dfd.callback(function (value: number) {
					assert.isUndefined(value);
				}));
			}
		},

		'value not input': function (this: any) {
			let dfd = this.async();
			let iterable = [ 0, 1 ];

			Promise.all(iterable).then(dfd.callback(function (value: number[]) {
				assert.notStrictEqual(value, iterable);
			}));
		}
	};

	suite['.race'] = {
		'empty array': function (this: any) {
			let dfd = this.async();
			Promise.race([]).then(dfd.rejectOnError(function () {
				assert.fail(false, true, 'Promise should not have resolved');
			}));
			setTimeout(dfd.callback(function () {}), 10);
		},

		'mixed values and resolved': function (this: any) {
			let dfd = this.async();
			Promise.race([ 0, Promise.resolve(1), Promise.resolve(2) ])
				.then(dfd.callback(function (value: any) {
					assert.strictEqual(value, 0);
				}));
		},

		'iterable argument': function (this: any) {
			let dfd = this.async();
			Promise.race({
				[Symbol.iterator]() {
					return new ShimIterator<number | Thenable<number>>([
						0, Promise.resolve(1), Promise.resolve(2)
					]);
				}
			}).then(
				dfd.callback(function (value: any) {
					assert.strictEqual(value, 0);
				})
			);
		},

		'reject if any rejected': function (this: any) {
			let dfd = this.async();
			let pending = new Promise(function () {});
			let rejected = Promise.reject(new Error('rejected'));

			Promise.race([ pending, rejected ])
				.then(dfd.rejectOnError(function () {
					assert(false, 'Should not have resolved');
				}), dfd.callback(function (error: Error) {
					assert.strictEqual(error.message, 'rejected');
				}));
		},

		'foreign thenables': function (this: any) {
			let dfd = this.async();
			let normal = Promise.resolve(1);
			let foreign = <any> {
				then: function (f: Function) {
					f(2);
				}
			};

			Promise.race([ normal, foreign ]).then(dfd.callback(function (value: any) {
				assert.strictEqual(value, 1);
			}));
		}
	};

	suite['.reject'] = {
		error(this: any) {
			let dfd = this.async();
			let resolved = false;
			let promise = Promise.reject(new Error('foo')).then(
				dfd.rejectOnError(function () {
					resolved = true;
					assert(false, 'should not have resolved');
				}),
				dfd.callback(function (error: Error) {
					resolved = true;
					assert.instanceOf(error, Error, 'error value should be an Error');
					assert.propertyVal(error, 'message', 'foo', 'error value should have expected message');
				})
			);

			assert.instanceOf(promise, Promise, 'promise should have expected type');
			assert.isFalse(resolved, 'promise should not have resolved synchronously');
		},

		'rejected thenable'(this: any) {
			let dfd = this.async();
			let resolved = false;
			let thenable = <any> {
				then: function (f: Function, r: Function) {
					r(new Error('foo'));
				}
			};
			Promise.resolve(thenable).then(
				dfd.rejectOnError(function () {
					resolved = true;
					assert(false, 'should not have rejected');
				}),
				dfd.callback(function (error: Error) {
					resolved = true;
					// value should be resolved value of thenable
					assert.instanceOf(error, Error, 'error value should be an Error');
					assert.propertyVal(error, 'message', 'foo', 'error value should have expected message');
				})
			);

			assert.isFalse(resolved, 'promise should not have resolved synchronously');
		}
	};

	suite['.resolve'] = {
		'simple value'(this: any) {
			let dfd = this.async();
			let resolved = false;
			let promise = Promise.resolve('foo').then(
				dfd.callback(function (value: any) {
					resolved = true;
					assert.equal(value, 'foo', 'unexpected resolution value');
				}),
				dfd.rejectOnError(function () {
					resolved = true;
					assert(false, 'should not have rejected');
				})
			);

			assert.instanceOf(promise, Promise, 'promise should have expected type');
			assert.isFalse(resolved, 'promise should not have resolved synchronously');
		},

		thenable(this: any) {
			let dfd = this.async();
			let resolved = false;
			let thenable = <any> {
				then: function (f: Function) {
					f(2);
				}
			};
			Promise.resolve(thenable).then(
				dfd.callback(function (value: any) {
					resolved = true;
					// value should be resolved value of thenable
					assert.equal(value, 2, 'unexpected resolution value');
				}),
				dfd.rejectOnError(function () {
					resolved = true;
					assert(false, 'should not have rejected');
				})
			);

			assert.isFalse(resolved, 'promise should not have resolved synchronously');
		}
	};

	suite['#catch'] = {
		rejection: function (this: any) {
			let dfd = this.async();
			let error = new Error('foo');
			Promise.reject(error).catch(dfd.callback(function (err: Error) {
				assert.strictEqual(err, error);
			}));
		},

		identity: function (this: any) {
			let dfd = this.async();
			let error = new Error('foo');
			Promise.reject(error)
				.then(dfd.rejectOnError(function () {
					assert(false, 'Should not be resolved');
				}))
				.catch(dfd.callback(function (err: Error) {
					assert.strictEqual(err, error);
				}));
		},

		'resolver throws': function (this: any) {
			let dfd = this.async();

			let error = new Error('foo');
			let promise = new Promise(function () {
				throw error;
			});

			promise.catch(dfd.callback((err: Error) => {
				assert.strictEqual(err, error);
			}));
		},

		'handler throws': function (this: any) {
			let dfd = this.async();
			let error = new Error('foo');
			Promise.resolve(5)
				.then(function () {
					throw error;
				})
				.catch(dfd.callback(function (err: Error) {
					assert.strictEqual(err, error);
				}));
		},

		'then throws': {
			'from resolver': function (this: any) {
				let dfd = this.async();
				let error = new Error('foo');
				let foreign = <any> {
					then: (f: Function) => {
						throw error;
					}
				};

				let promise = new Promise(function (resolve: Function) {
					resolve(foreign);
				});
				promise.catch(dfd.callback(function (err: Error) {
					assert.strictEqual(err, error);
				}));
			},

			'from handler': function (this: any) {
				let dfd = this.async();
				let error = new Error('foo');
				let foreign = <any> {
					then: function (f: Function) {
						throw error;
					}
				};

				Promise.resolve(5)
					.then(function () {
						return foreign;
					})
					.catch(dfd.callback(function (err: Error) {
						assert.strictEqual(err, error);
					}));
			},

			'then throws': {
				'from resolver': function (this: any) {
					let dfd = this.async();
					let error = new Error('foo');
					let foreign = <any> {
						then: function (f: Function) {
							throw error;
						}
					};

					let promise = new Promise(function (resolve: Function) {
						resolve(foreign);
					});
					promise.catch(dfd.callback(function (err: Error) {
						assert.strictEqual(err, error);
					}));
				},

				'from handler': function (this: any) {
					let dfd = this.async();
					let error = new Error('foo');
					let foreign = <any> {
						then: function (f: Function) {
							throw error;
						}
					};

					Promise.resolve(5)
						.then(function () {
							return foreign;
						})
						.catch(dfd.callback(function (err: Error) {
							assert.strictEqual(err, error);
						}));
				}
			}
		}
	};

	suite['#finally'] = {
		'called for resolved Promise': function (this: any) {
			let dfd = this.async();
			Promise.resolve(5).finally(dfd.callback(function () {}));
		},

		'called for rejected Promise': function (this: any) {
			let dfd = this.async();
			Promise.reject(new Error('foo')).catch(() => {
			}).finally(dfd.callback(function () {
			}));
		},

		'value passes through': function (this: any) {
			let dfd = this.async();
			Promise.resolve(5).finally(function () {}).then(dfd.callback(function (value: any) {
				assert.strictEqual(value, 5);
			}));
		},

		'rejection passes through': function (this: any) {
			let dfd = this.async();
			Promise.reject(new Error('foo')).finally(function () {}).then(dfd.rejectOnError(function () {
				assert(false, 'Should not have resolved');
			}), dfd.callback(function (reason: any) {
				assert.propertyVal(reason, 'message', 'foo');
			}));
		},

		'returned value is ignored': function (this: any) {
			let dfd = this.async();
			Promise.resolve(5).finally(function (): any {
				return 4;
			}).then(dfd.callback(function (value: any) {
				assert.strictEqual(value, 5);
			}), dfd.rejectOnError(function () {
				assert(false, 'Should not have rejected');
			}));
		},

		'returned resolved promise is ignored': function (this: any) {
			let dfd = this.async();
			Promise.resolve(5).finally(function (): any {
				return Promise.resolve(4);
			}).then(dfd.callback(function (value: any) {
				assert.strictEqual(value, 5);
			}), dfd.rejectOnError(function () {
				assert(false, 'Should not have rejected');
			}));
		},

		'thrown error rejects': function (this: any) {
			let dfd = this.async();
			Promise.resolve(5).finally(function () {
				throw new Error('foo');
			}).then(dfd.rejectOnError(function (value: any) {
				assert(false, 'Should not have rejected');
			}), dfd.callback(function (reason: any) {
				assert.propertyVal(reason, 'message', 'foo');
			}));
		},

		'returned rejected promise rejects': function (this: any) {
			let dfd = this.async();
			Promise.resolve(5).finally(function () {
				return Promise.reject(new Error('foo'));
			}).then(dfd.rejectOnError(function (value: any) {
				assert(false, 'Should not have rejected');
			}), dfd.callback(function (reason: any) {
				assert.propertyVal(reason, 'message', 'foo');
			}));
		},

		'returned resolved promise on rejection rejects': function (this: any) {
			let dfd = this.async();
			Promise.reject(new Error('foo')).finally(function () {
				return Promise.resolve(5);
			}).then(dfd.rejectOnError(function (value: any) {
				assert(false, 'Should not have rejected');
			}), dfd.callback(function (reason: any) {
				assert.propertyVal(reason, 'message', 'foo');
			}));
		}
	};

	suite['#then'] = {
		fulfillment: function (this: any) {
			let dfd = this.async();
			Promise.resolve(5).then(dfd.callback(function (value: number) {
				assert.strictEqual(value, 5);
			}));
		},

		identity: function (this: any) {
			let dfd = this.async();
			Promise.resolve(5).then(null, dfd.rejectOnError(function (value: Error) {
				assert(false, 'Should not have resolved');
			})).then(dfd.callback(function (value: number) {
				assert.strictEqual(value, 5);
			}));
		},

		'resolve once': function (this: any) {
			let dfd = this.async();
			let evilPromise = {
				then: (f?: Function, r?: Function) => {
					if (f) {
						f(1);
						f(2);
					}
				}
			};

			let calledAlready = false;
			Promise.resolve(evilPromise).then(dfd.rejectOnError(function (value: number) {
				assert.strictEqual(calledAlready, false, 'resolver should not have been called');
				calledAlready = true;
				assert.strictEqual(value, 1, 'resolver called with unexpected value');
			})).then(dfd.resolve, dfd.reject);
		}
	};

	suite.constructed = {
		resolved(this: any) {
			let dfd = this.async();
			let resolver: any;
			let resolved = false;
			new Promise(function (resolve: any, reject: any) {
				resolver = resolve;
			}).then(
				dfd.callback(function () {
					resolved = true;
				}),
				dfd.rejectOnError(function () {
					assert(false, 'should not have rejected');
				})
			);
			assert.isFalse(resolved, 'should not be resolved');
			resolver();
		},

		rejected(this: any) {
			let dfd = this.async();
			let resolver: any;
			let resolved = false;
			new Promise(function (resolve: any, reject: any) {
				resolver = reject;
			}).then(
				dfd.rejectOnError(function () {
					assert(false, 'should not have resolved');
				}),
				dfd.callback(function () {
					resolved = true;
				})
			);
			assert.isFalse(resolved, 'should not be resolved');
			resolver();
		}
	};
}

addPromiseTests(suite, Task);

registerSuite(suite);
