import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import PromiseWrapper, { Executor, PromiseShim, State, Thenable } from 'src/Promise';

interface Promise<T> {
	state?: State;
	then<U>(
		onFulfilled?: (value?: T) => (U | Thenable<U>),
		onRejected?: (reason?: Error) => (U | Thenable<U>)
	): Promise<U>;
	catch<U>(onRejected: (reason?: Error) => (U | Thenable<U>)): Promise<U>;
	finally?(callback: () => void | Thenable<any>): Promise<T>;
}
interface PromiseConstructor {
	prototype: Promise<any>;
	new <T>(executor: Executor<T>): Promise<T>;
	all<T>(items: (T | Thenable<T>)[]): Promise<T>;
	race<T>(items: (T | Thenable<T>)[]): Promise<T>;
	reject<T>(reason: any): Promise<T>;
	resolve<T>(value: (T | Thenable<T>)): Promise<T>;
}

function tests(PromiseType: PromiseConstructor) {
	return {
		'.all': {
			'empty array': function () {
				let dfd = this.async();
				PromiseType.all([]).then(dfd.callback(function (value: any[]) {
					assert.isArray(value);
					assert.deepEqual(value, []);
				}));
			},

			'mixed values and resolved': function () {
				let dfd = this.async();
				PromiseType.all([ 0, PromiseType.resolve(1), PromiseType.resolve(2) ]).then(
					dfd.callback(function (value: number[]) {
						assert.isArray(value);
						assert.deepEqual(value, [ 0, 1, 2 ]);
					})
				);
			},

			'reject if any rejected': function () {
				let dfd = this.async();
				let pending = new PromiseType<void>(function () {});
				let rejected = PromiseType.reject(new Error('rejected'));

				PromiseType.all<any>([ pending, rejected ]).then(
					dfd.rejectOnError(function () {
						assert(false, 'Should not have resolved');
					}),
					dfd.callback(function (error: Error) {
						assert.strictEqual(error.message, 'rejected');
					})
				);
			},

			'foreign thenables': function () {
				let dfd = this.async();
				let normal = PromiseType.resolve(1);
				let foreign = <any> {
					then: function (f: Function) {
						f(2);
					}
				};

				PromiseType.all([ normal, foreign ]).then(dfd.callback(function (value: number[]) {
					assert.deepEqual(value, [ 1, 2 ]);
				}));
			},

			'non-callable thenables': function () {
				let dfd = this.async();
				let normal = PromiseType.resolve(1);
				let foreign = <any> { then: 'foo' };

				PromiseType.all([ normal, foreign ]).then(dfd.callback(function (value: number[]) {
					assert.deepEqual(value, [ 1, foreign ]);
				}));
			},

			'sparse array': function () {
				let dfd = this.async();
				let iterable: any[] = [];

				iterable[0] = PromiseType.resolve(0);
				iterable[3] = PromiseType.resolve(3);

				PromiseType.all(iterable).then(dfd.callback(function (value: number[]) {
					assert.strictEqual(value[0], 0);
					assert.isUndefined(value[1]);
					assert.isUndefined(value[2]);
					assert.strictEqual(value[3], 3);
				}));
			},

			'value not input': function () {
				let dfd = this.async();
				let iterable = [ 0, 1 ];

				PromiseType.all(iterable).then(dfd.callback(function (value: number[]) {
					assert.notStrictEqual(value, iterable);
				}));
			}
		},

		'.race': {
			'empty array': function () {
				let dfd = this.async();
				PromiseType.race([]).then(dfd.rejectOnError(function () {
					assert.fail(false, true, 'Promise should not have resolved');
				}));
				setTimeout(dfd.callback(function () {}), 10);
			},

			'mixed values and resolved': function () {
				let dfd = this.async();
				PromiseType.race([ 0, PromiseType.resolve(1), PromiseType.resolve(2) ])
					.then(dfd.callback(function (value: any) {
						assert.strictEqual(value, 0);
					}));
			},

			'reject if any rejected': function () {
				let dfd = this.async();
				let pending = new PromiseType<void>(function () {});
				let rejected = PromiseType.reject(new Error('rejected'));

				PromiseType.race<any>([ pending, rejected ])
					.then(dfd.rejectOnError(function () {
						assert(false, 'Should not have resolved');
					}), dfd.callback(function (error: Error) {
						assert.strictEqual(error.message, 'rejected');
					}));
			},

			'foreign thenables': function () {
				let dfd = this.async();
				let normal = PromiseType.resolve(1);
				let foreign = <any> {
					then: function (f: Function) {
						f(2);
					}
				};

				PromiseType.race([ normal, foreign ]).then(dfd.callback(function (value: any) {
					assert.strictEqual(value, 1);
				}));
			}
		},

		'#catch': {
			rejection: function () {
				let dfd = this.async();
				let error = new Error('foo');
				PromiseType.reject(error).catch(dfd.callback(function (err: Error) {
					assert.strictEqual(err, error);
				}));
			},

			identity: function () {
				let dfd = this.async();
				let error = new Error('foo');
				PromiseType.reject(error)
					.then(dfd.rejectOnError(function () {
						assert(false, 'Should not be resolved');
					}))
					.catch(dfd.callback(function (err: Error) {
						assert.strictEqual(err, error);
					}));
			},

			'resolver throws': function () {
				let dfd = this.async();

				let error = new Error('foo');
				let promise = new PromiseType(function () {
					throw error;
				});

				promise.catch(dfd.callback(function (err: Error) {
					assert.strictEqual(err, error);
				}));
			},

			'handler throws': function () {
				let dfd = this.async();
				let error = new Error('foo');
				PromiseType.resolve(5)
					.then(function () {
						throw error;
					})
					.catch(dfd.callback(function (err: Error) {
						assert.strictEqual(err, error);
					}));
			},

			'then throws': {
				'from resolver': function () {
					let dfd = this.async();
					let error = new Error('foo');
					let foreign = <any> {
						then: function (f: Function) {
							throw error;
						}
					};

					let promise = new PromiseType(function (resolve: Function) {
						resolve(foreign);
					});
					promise.catch(dfd.callback(function (err: Error) {
						assert.strictEqual(err, error);
					}));
				},

				'from handler': function () {
					let dfd = this.async();
					let error = new Error('foo');
					let foreign = <any> {
						then: function (f: Function) {
							throw error;
						}
					};

					PromiseType.resolve(5)
						.then(function () {
							return foreign;
						})
						.catch(dfd.callback(function (err: Error) {
							assert.strictEqual(err, error);
						}));
				}
			}
		},

		'#finally': {
			'called for resolved Promise': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(dfd.callback(function () {}));
			},

			'called for rejected Promise': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.reject(new Error('foo')).finally(dfd.callback(function () {}));
			},

			'value passes through': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(function () {}).then(dfd.callback(function (value: any) {
					assert.strictEqual(value, 5);
				}));
			},

			'rejection passes through': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.reject(new Error('foo')).finally(function () {}).then(dfd.rejectOnError(function () {
					assert(false, 'Should not have resolved');
				}), dfd.callback(function (reason: any) {
					assert.propertyVal(reason, 'message', 'foo');
				}));
			},

			'returned value is ignored': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(function (): any {
					return 4;
				}).then(dfd.callback(function (value: any) {
					assert.strictEqual(value, 5);
				}), dfd.rejectOnError(function () {
					assert(false, 'Should not have rejected');
				}));
			},

			'returned resolved promise is ignored': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(function (): any {
					return PromiseType.resolve(4);
				}).then(dfd.callback(function (value: any) {
					assert.strictEqual(value, 5);
				}), dfd.rejectOnError(function () {
					assert(false, 'Should not have rejected');
				}));
			},

			'thrown error rejects': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(function () {
					throw new Error('foo');
				}).then(dfd.rejectOnError(function (value: any) {
					assert(false, 'Should not have rejected');
				}), dfd.callback(function (reason: any) {
					assert.propertyVal(reason, 'message', 'foo');
				}));
			},

			'returned rejected promise rejects': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(function () {
					return PromiseType.reject(new Error('foo'));
				}).then(dfd.rejectOnError(function (value: any) {
					assert(false, 'Should not have rejected');
				}), dfd.callback(function (reason: any) {
					assert.propertyVal(reason, 'message', 'foo');
				}));
			}
		},

		'#then': {
			fulfillment: function () {
				let dfd = this.async();
				PromiseType.resolve(5).then(dfd.callback(function (value: number) {
					assert.strictEqual(value, 5);
				}));
			},

			identity: function () {
				let dfd = this.async();

				PromiseType.resolve(5).then(null, dfd.rejectOnError(function (value: Error) {
					assert(false, 'Should not have resolved');
				})).then(dfd.callback(function (value: number) {
					assert.strictEqual(value, 5);
				}));
			},

			'resolve once': function () {
				let dfd = this.async();
				let evilPromise = {
					then: function (f?: Function, r?: Function) {
						f(1);
						f(2);
					}
				};

				let calledAlready = false;
				PromiseType.resolve(evilPromise).then(dfd.rejectOnError(function (value: number) {
					assert.strictEqual(calledAlready, false, 'resolver should not have been called');
					calledAlready = true;
					assert.strictEqual(value, 1, 'resolver called with unexpected value');
				})).then(dfd.resolve, dfd.reject);
			},

			'self-resolution': function () {
				let dfd = this.async();
				let resolve: (value?: any) => void;
				let promise = new PromiseType<void>(function (_resolve: (value?: any) => void) {
					resolve = _resolve;
				});

				resolve(promise);

				promise.then(
					dfd.rejectOnError(function () {
						assert(false, 'Should not be resolved');
					}),
					dfd.callback(function (error: Error) {
						assert.instanceOf(error, TypeError, 'rejected with non-Error');
					})
				);
			}
		},

		'state inspection': {
			pending: function () {
				let promise = new PromiseType(function (resolve, reject) {});
				assert.strictEqual(promise.state, State.Pending);
			},

			resolved: function () {
				let dfd = this.async();
				let promise = new PromiseType(function (resolve, reject) {
					resolve(5);
				});
				promise.then(dfd.callback(function () {
					assert.strictEqual(promise.state, State.Fulfilled);
				}));
			},

			rejected: function () {
				let dfd = this.async();
				let promise = PromiseType.reject(new Error('foo'));
				promise.catch(dfd.callback(function () {
					assert.strictEqual(promise.state, State.Rejected);
				}));
			}
		}
	};
}

registerSuite({
	name: 'Promise',

	PromiseShim: tests(<any>PromiseShim),
	PromiseWrapper: tests(PromiseWrapper)
});
