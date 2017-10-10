import { Thenable } from '../../src/interfaces';
import Promise from '../../src/Promise';
import { ShimIterator } from '../../src/iterator';
import '../../src/Symbol';
import { Tests } from 'intern/lib/interfaces/object';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

export type TypeUnderTest = typeof Promise;

/* tslint:disable-next-line:variable-name */
export function addPromiseTests(suite: any, Promise: TypeUnderTest) {
	suite['.all'] = {
		'empty array': function () {
			let dfd = this.async();
			let promise = Promise.all([]).then(dfd.callback(function (value: any[]) {
				assert.isArray(value);
				assert.deepEqual(value, []);
			}));
			assert.instanceOf(promise, Promise, 'promise should have expected type');
		},

		'mixed values and resolved': function () {
			let dfd = this.async();
			Promise.all([ 0, Promise.resolve(1), Promise.resolve(2) ]).then(
				dfd.callback(function (value: number[]) {
					assert.isArray(value);
					assert.deepEqual(value, [ 0, 1, 2 ]);
				})
			);
		},

		'iterable argument': function () {
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

		'reject if any rejected': function () {
			let dfd = this.async();
			let pending = new Promise<void>(function () {});
			let rejected = Promise.reject(new Error('rejected'));

			Promise.all<any>([ pending, rejected ]).then(
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

		'non-callable thenables': function () {
			let dfd = this.async();
			let normal = Promise.resolve(1);
			let foreign = <any> { then: 'foo' };

			Promise.all([ normal, foreign ]).then(dfd.callback(function (value: number[]) {
				assert.deepEqual(value, [ 1, foreign ]);
			}));
		},

		'sparse array': <Tests> {
			tests: {
				all() {
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

				race() {
					let dfd = this.async();
					let iterable: any[] = [];

					iterable[1] = Promise.resolve(1);
					iterable[3] = Promise.resolve(3);

					Promise.race(iterable).then(dfd.callback(function (value: number) {
						assert.isUndefined(value);
					}));
				}
			}
		},

		'value not input': function () {
			let dfd = this.async();
			let iterable = [ 0, 1 ];

			Promise.all(iterable).then(dfd.callback(function (value: number[]) {
				assert.notStrictEqual(value, iterable);
			}));
		},

		'non-promise thenables': function () {
			let dfd = this.async();
			let thenable = {
				then(resolve: (_: string) => void) {
					resolve('test');
				}
			};

			Promise.all<any>([ 'hello', thenable ]).then((results: any[]) => {
				assert.deepEqual(results, [ 'hello', 'test' ]);
				dfd.resolve();
			});
		}
	};

	suite['.race'] = {
		'empty array': function () {
			let dfd = this.async();
			Promise.race([]).then(dfd.rejectOnError(function () {
				assert.fail(false, true, 'Promise should not have resolved');
			}));
			setTimeout(dfd.callback(function () {}), 10);
		},

		'mixed values and resolved': function () {
			let dfd = this.async();
			Promise.race([ 0, Promise.resolve(1), Promise.resolve(2) ])
				.then(dfd.callback(function (value: any) {
					assert.strictEqual(value, 0);
				}));
		},

		'iterable argument': function () {
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

		'reject if any rejected': function () {
			let dfd = this.async();
			let pending = new Promise<void>(function () {});
			let rejected = Promise.reject(new Error('rejected'));

			Promise.race<any>([ pending, rejected ])
				.then(dfd.rejectOnError(function () {
					assert(false, 'Should not have resolved');
				}), dfd.callback(function (error: Error) {
					assert.strictEqual(error.message, 'rejected');
				}));
		},

		'foreign thenables': function () {
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
		error() {
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

		'rejected thenable'() {
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
		'simple value'() {
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

		thenable() {
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
		rejection: function () {
			let dfd = this.async();
			let error = new Error('foo');
			Promise.reject(error).catch(dfd.callback(function (err: Error) {
				assert.strictEqual(err, error);
			}));
		},

		identity: function () {
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

		'resolver throws': function () {
			let dfd = this.async();

			let error = new Error('foo');
			let promise = new Promise(function () {
				throw error;
			});

			promise.catch(dfd.callback((err: Error) => {
				assert.strictEqual(err, error);
			}));
		},

		'handler throws': function () {
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

		'then throws': <Tests> {
			'from resolver': function () {
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

			'from handler': function () {
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
				'from resolver': function () {
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

				'from handler': function () {
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

	suite['#then'] = {
		fulfillment: function () {
			let dfd = this.async();
			Promise.resolve(5).then(dfd.callback(function (value: number) {
				assert.strictEqual(value, 5);
			}));
		},

		identity: function () {
			let dfd = this.async();
			Promise.resolve(5).then(undefined, dfd.rejectOnError(function (value: Error) {
				assert(false, 'Should not have resolved');
			})).then(dfd.callback(function (value: number) {
				assert.strictEqual(value, 5);
			}));
		},

		'resolve once': function () {
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
			})).then(() => dfd.resolve(), () => dfd.reject());
		}
	};

	suite.constructed = {
		resolved() {
			let dfd = this.async();
			let resolver: any;
			let resolved = false;
			new Promise(function (resolve, reject) {
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

		rejected() {
			let dfd = this.async();
			let resolver: any;
			let resolved = false;
			new Promise(function (resolve, reject) {
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

let suite = {
	Promise: {}
};

addPromiseTests(suite.Promise, Promise);

registerSuite('Promise', suite);
