import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import Promise, { PromiseShim, Thenable, Executor } from 'src/Promise';

export interface PromiseConstructor {
	new <T>(executor: Thenable<T> | Executor<T>): (PromiseShim<T> | Promise<T>);
	all<T>(items: (T | Thenable<T>)[]): (PromiseShim<T> | Promise<T>);
	race<T>(items: (T | Thenable<T>)[]): (PromiseShim<T> | Promise<T>);
	reject<T>(reason: any): (PromiseShim<T> | Promise<T>);
	resolve<T>(value: (T | Thenable<T>)): (PromiseShim<T> | Promise<T>);
}

function tests(PromiseType: PromiseConstructor) {
	return {
		'.all': {
			'empty array': function () {
				var dfd = this.async();
				Promise.all([]).then(dfd.callback((value: any[]) => {
					assert.isArray(value);
					assert.deepEqual(value, []);
				}));
			},

			'mixed values and resolved': function () {
				var dfd = this.async();
				Promise.all([ 0, Promise.resolve(1), Promise.resolve(2) ]).then(
					dfd.callback((value: number[]) => {
						assert.isArray(value);
						assert.deepEqual(value, [ 0, 1, 2 ]);
					})
				);
			},

			'reject if any rejected': function () {
				var dfd = this.async();
				var pending = new Promise<void>(function () {});
				var rejected = Promise.reject(new Error('rejected'));

				Promise.all<any>([ pending, rejected ]).then(
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
				var normal = Promise.resolve(1);
				var foreign = <any> {
					then: function (f: Function) {
						f(2);
					}
				};

				Promise.all([ normal, foreign ]).then(dfd.callback((value: number[]) => {
					assert.deepEqual(value, [ 1, 2 ]);
				}));
			},

			'non-callable thenables': function () {
				var dfd = this.async();
				var normal = Promise.resolve(1);
				var foreign = <any> { then: 'foo' };

				Promise.all([ normal, foreign ]).then(dfd.callback((value: number[]) => {
					assert.deepEqual(value, [ 1, foreign ]);
				}));
			},

			'sparse array': function () {
				var dfd = this.async();
				var iterable: any[] = [];

				iterable[0] = Promise.resolve(0);
				iterable[3] = Promise.resolve(3);

				Promise.all(iterable).then(dfd.callback((value: number[]) => {
					assert.strictEqual(value[0], 0);
					assert.isUndefined(value[1]);
					assert.isUndefined(value[2]);
					assert.strictEqual(value[3], 3);
				}));
			},

			'value not input': function () {
				var dfd = this.async();
				var iterable = [ 0, 1 ];

				Promise.all(iterable).then(dfd.callback((value: number[]) => {
					assert.notStrictEqual(value, iterable);
				}));
			}
		},

		'.race': {
			'empty array': function () {
				var dfd = this.async();
				Promise.race([]).then(dfd.rejectOnError(() => {
					assert.fail(false, true, 'Promise should not have resolved');
				}));
				setTimeout(dfd.callback(() => {}), 10);
			},

			'mixed values and resolved': function () {
				var dfd = this.async();
				Promise.race([ 0, Promise.resolve(1), Promise.resolve(2) ])
					.then(dfd.callback((value: any) => {
						assert.strictEqual(value, 0);
					}));
			},

			'reject if any rejected': function () {
				var dfd = this.async();
				var pending = new Promise<void>(() => {});
				var rejected = Promise.reject(new Error('rejected'));

				Promise.race<any>([ pending, rejected ])
					.then(dfd.rejectOnError(() => {
						assert(false, 'Should not have resolved');
					}), dfd.callback((error: Error) => {
						assert.strictEqual(error.message, 'rejected');
					}));
			},

			'foreign thenables': function () {
				var dfd = this.async();
				var normal = Promise.resolve(1);
				var foreign = <any> {
					then: (f: Function) => {
						f(2);
					}
				};

				Promise.race([ normal, foreign ]).then(dfd.callback((value: any) => {
					assert.strictEqual(value, 1);
				}));
			}
		},

		'#then': {
			fulfillment: function () {
				var dfd = this.async();
				Promise.resolve(5).then(dfd.callback((value: number) => {
					assert.strictEqual(value, 5);
				}));
			},

			identity: function () {
				var dfd = this.async();

				Promise.resolve(5).then(null, dfd.rejectOnError((value: Error) => {
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
				Promise.resolve(evilPromise).then(dfd.rejectOnError((value: number) => {
					assert.strictEqual(calledAlready, false, 'resolver should not have been called');
					calledAlready = true;
					assert.strictEqual(value, 1, 'resolver called with unexpected value');
				})).then(dfd.resolve, dfd.reject);
			},

			'self-resolution': function () {
				var dfd = this.async();
				var resolve: (value?: any) => void;
				var promise = new Promise<void>((_resolve: (value?: any) => void) => {
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

		'#catch': {
			rejection: function () {
				var dfd = this.async();
				var error = new Error('foo');
				Promise.reject(error).catch(dfd.callback((err: Error) => {
					assert.strictEqual(err, error);
				}));
			},

			identity: function () {
				var dfd = this.async();
				var error = new Error('foo');
				Promise.reject(error)
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
				var promise = new Promise(() => {
					throw error;
				});

				promise.catch(dfd.callback((err: Error) => {
					assert.strictEqual(err, error);
				}));
			},

			'handler throws': function () {
				var dfd = this.async();
				var error = new Error('foo');
				Promise.resolve(5)
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

					var promise = new Promise((resolve: Function) => {
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

					Promise.resolve(5)
						.then(() => {
							return foreign;
						})
						.catch(dfd.callback((err: Error) => {
							assert.strictEqual(err, error);
						}));
				}
			}
		}
	};
}

registerSuite({
	name: 'Promise',

	PromiseShim: tests(PromiseShim),
	PlatformPromise: tests(Promise)
});
