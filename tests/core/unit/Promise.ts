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
				var dfd = this.async();
				PromiseType.all([]).then(dfd.callback((value: any[]) => {
					assert.isArray(value);
					assert.deepEqual(value, []);
				}));
			},

			'mixed values and resolved': function () {
				var dfd = this.async();
				PromiseType.all([ 0, PromiseType.resolve(1), PromiseType.resolve(2) ]).then(
					dfd.callback((value: number[]) => {
						assert.isArray(value);
						assert.deepEqual(value, [ 0, 1, 2 ]);
					})
				);
			},

			'reject if any rejected': function () {
				var dfd = this.async();
				var pending = new PromiseType<void>(function () {});
				var rejected = PromiseType.reject(new Error('rejected'));

				PromiseType.all<any>([ pending, rejected ]).then(
					dfd.rejectOnError(() => {
						assert(false, 'Should not have resolved');
					}),
					dfd.callback((error: Error) => {
						assert.strictEqual(error.message, 'rejected');
					})
				);
			},

			'foreign thenables': function () {
				var dfd = this.async();
				var normal = PromiseType.resolve(1);
				var foreign = <any> {
					then: function (f: Function) {
						f(2);
					}
				};

				PromiseType.all([ normal, foreign ]).then(dfd.callback((value: number[]) => {
					assert.deepEqual(value, [ 1, 2 ]);
				}));
			},

			'non-callable thenables': function () {
				var dfd = this.async();
				var normal = PromiseType.resolve(1);
				var foreign = <any> { then: 'foo' };

				PromiseType.all([ normal, foreign ]).then(dfd.callback((value: number[]) => {
					assert.deepEqual(value, [ 1, foreign ]);
				}));
			},

			'sparse array': function () {
				var dfd = this.async();
				var iterable: any[] = [];

				iterable[0] = PromiseType.resolve(0);
				iterable[3] = PromiseType.resolve(3);

				PromiseType.all(iterable).then(dfd.callback((value: number[]) => {
					assert.strictEqual(value[0], 0);
					assert.isUndefined(value[1]);
					assert.isUndefined(value[2]);
					assert.strictEqual(value[3], 3);
				}));
			},

			'value not input': function () {
				var dfd = this.async();
				var iterable = [ 0, 1 ];

				PromiseType.all(iterable).then(dfd.callback((value: number[]) => {
					assert.notStrictEqual(value, iterable);
				}));
			}
		},

		'.race': {
			'empty array': function () {
				var dfd = this.async();
				PromiseType.race([]).then(dfd.rejectOnError(() => {
					assert.fail(false, true, 'Promise should not have resolved');
				}));
				setTimeout(dfd.callback(() => {}), 10);
			},

			'mixed values and resolved': function () {
				var dfd = this.async();
				PromiseType.race([ 0, PromiseType.resolve(1), PromiseType.resolve(2) ])
					.then(dfd.callback((value: any) => {
						assert.strictEqual(value, 0);
					}));
			},

			'reject if any rejected': function () {
				var dfd = this.async();
				var pending = new PromiseType<void>(() => {});
				var rejected = PromiseType.reject(new Error('rejected'));

				PromiseType.race<any>([ pending, rejected ])
					.then(dfd.rejectOnError(() => {
						assert(false, 'Should not have resolved');
					}), dfd.callback((error: Error) => {
						assert.strictEqual(error.message, 'rejected');
					}));
			},

			'foreign thenables': function () {
				var dfd = this.async();
				var normal = PromiseType.resolve(1);
				var foreign = <any> {
					then: (f: Function) => {
						f(2);
					}
				};

				PromiseType.race([ normal, foreign ]).then(dfd.callback((value: any) => {
					assert.strictEqual(value, 1);
				}));
			}
		},

		'#catch': {
			rejection: function () {
				var dfd = this.async();
				var error = new Error('foo');
				PromiseType.reject(error).catch(dfd.callback((err: Error) => {
					assert.strictEqual(err, error);
				}));
			},

			identity: function () {
				var dfd = this.async();
				var error = new Error('foo');
				PromiseType.reject(error)
					.then(dfd.rejectOnError(() => {
						assert(false, 'Should not be resolved');
					}))
					.catch(dfd.callback((err: Error) => {
						assert.strictEqual(err, error);
					}));
			},

			'resolver throws': function () {
				var dfd = this.async();

				var error = new Error('foo');
				var promise = new PromiseType(() => {
					throw error;
				});

				promise.catch(dfd.callback((err: Error) => {
					assert.strictEqual(err, error);
				}));
			},

			'handler throws': function () {
				var dfd = this.async();
				var error = new Error('foo');
				PromiseType.resolve(5)
					.then(() => {
						throw error;
					})
					.catch(dfd.callback((err: Error) => {
						assert.strictEqual(err, error);
					}));
			},

			'then throws': {
				'from resolver': function () {
					var dfd = this.async();
					var error = new Error('foo');
					var foreign = <any> {
						then: (f: Function) => {
							throw error;
						}
					};

					var promise = new PromiseType((resolve: Function) => {
						resolve(foreign);
					});
					promise.catch(dfd.callback((err: Error) => {
						assert.strictEqual(err, error);
					}));
				},

				'from handler': function () {
					var dfd = this.async();
					var error = new Error('foo');
					var foreign = <any> {
						then: (f: Function) => {
							throw error;
						}
					};

					PromiseType.resolve(5)
						.then(() => {
							return foreign;
						})
						.catch(dfd.callback((err: Error) => {
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
				PromiseType.resolve(5).finally(dfd.callback(() => {}));
			},

			'called for rejected Promise': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.reject(new Error('foo')).finally(dfd.callback(() => {}));
			},

			'value passes through': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(() => {}).then(dfd.callback((value: any) => assert.strictEqual(value, 5)));
			},

			'rejection passes through': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.reject(new Error('foo')).finally(() => {}).then(
					dfd.rejectOnError(() => assert(false, 'Should not have resolved')),
					dfd.callback((reason: any) => assert.propertyVal(reason, 'message', 'foo'))
				);
			},

			'returned value is ignored': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally((): any => {
					return 4;
				}).then(
					dfd.callback((value: any) => assert.strictEqual(value, 5)),
					dfd.rejectOnError(() => assert(false, 'Should not have rejected'))
				);
			},

			'returned resolved promise is ignored': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally((): any => {
					return PromiseType.resolve(4);
				}).then(
					dfd.callback((value: any) => assert.strictEqual(value, 5)),
					dfd.rejectOnError(() => assert(false, 'Should not have rejected'))
				);
			},

			'thrown error rejects': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(() => {
					throw new Error('foo');
				}).then(
					dfd.rejectOnError((value: any) => assert(false, 'Should not have rejected')),
					dfd.callback((reason: any) => assert.propertyVal(reason, 'message', 'foo'))
				);
			},

			'returned rejected promise rejects': function () {
				if (!PromiseType.prototype.finally) {
					this.skip();
					return;
				}
				let dfd = this.async();
				PromiseType.resolve(5).finally(() => {
					return PromiseType.reject(new Error('foo'));
				}).then(
					dfd.rejectOnError((value: any) => assert(false, 'Should not have rejected')),
					dfd.callback((reason: any) => assert.propertyVal(reason, 'message', 'foo'))
				);
			}
		},

		'#then': {
			fulfillment: function () {
				var dfd = this.async();
				PromiseType.resolve(5).then(dfd.callback((value: number) => {
					assert.strictEqual(value, 5);
				}));
			},

			identity: function () {
				var dfd = this.async();

				PromiseType.resolve(5).then(null, dfd.rejectOnError((value: Error) => {
					assert(false, 'Should not have resolved');
				})).then(dfd.callback((value: number) => {
					assert.strictEqual(value, 5);
				}));
			},

			'resolve once': function () {
				var dfd = this.async();
				var evilPromise = {
					then: (f?: Function, r?: Function) => {
						f(1);
						f(2);
					}
				};

				var calledAlready = false;
				PromiseType.resolve(evilPromise).then(dfd.rejectOnError((value: number) => {
					assert.strictEqual(calledAlready, false, 'resolver should not have been called');
					calledAlready = true;
					assert.strictEqual(value, 1, 'resolver called with unexpected value');
				})).then(dfd.resolve, dfd.reject);
			},

			'self-resolution': function () {
				var dfd = this.async();
				var resolve: (value?: any) => void;
				var promise = new PromiseType<void>((_resolve: (value?: any) => void) => {
					resolve = _resolve;
				});

				resolve(promise);

				promise.then(
					dfd.rejectOnError(() => {
						assert(false, 'Should not be resolved');
					}),
					dfd.callback((error: Error) => {
						assert.instanceOf(error, TypeError, 'rejected with non-Error');
					})
				);
			}
		},

		'state inspection': {
			pending: function () {
				let promise = new PromiseType((resolve, reject) => {});
				assert.strictEqual(promise.state, State.Pending);
			},

			resolved: function () {
				let dfd = this.async();
				let promise = new PromiseType((resolve, reject) => {
					resolve(5);
				});
				promise.then(dfd.callback(() => assert.strictEqual(promise.state, State.Fulfilled)));
			},

			rejected: function () {
				let dfd = this.async();
				var promise = PromiseType.reject(new Error('foo'));
				promise.catch(dfd.callback(() => assert.strictEqual(promise.state, State.Rejected)));
			}
		}
	};
}

registerSuite({
	name: 'Promise',

	PromiseShim: tests(<any>PromiseShim),
	PromiseWrapper: tests(PromiseWrapper)
});
