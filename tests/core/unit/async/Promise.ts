import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import Promise, { State } from 'src/async/Promise';

let suite = {
	name: 'Promise',

	'class type': function () {
		assert.instanceOf(Promise.all([]), Promise);
		assert.instanceOf(Promise.race([]), Promise);
		assert.instanceOf(Promise.resolve(0), Promise);
		assert.instanceOf(Promise.reject(0), Promise);
	},

	// ensure extended promise passes all the standard Promise tests
	'.all': {
		'empty array': function () {
			let dfd = this.async();
			Promise.all([]).then(dfd.callback((value: any[]) => {
				assert.isArray(value);
				assert.deepEqual(value, []);
			}));
		},

		'mixed values and resolved': function () {
			let dfd = this.async();
			Promise.all([ 0, Promise.resolve(1), Promise.resolve(2) ]).then(
				dfd.callback((value: number[]) => {
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
				dfd.rejectOnError(() => {
					assert(false, 'Should not have resolved');
				}),
				dfd.callback((error: Error) => {
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

			Promise.all([ normal, foreign ]).then(dfd.callback((value: number[]) => {
				assert.deepEqual(value, [ 1, 2 ]);
			}));
		},

		'non-callable thenables': function () {
			let dfd = this.async();
			let normal = Promise.resolve(1);
			let foreign = <any> { then: 'foo' };

			Promise.all([ normal, foreign ]).then(dfd.callback((value: number[]) => {
				assert.deepEqual(value, [ 1, foreign ]);
			}));
		},

		'sparse array': function () {
			let dfd = this.async();
			let iterable: any[] = [];

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
			let dfd = this.async();
			let iterable = [ 0, 1 ];

			Promise.all(iterable).then(dfd.callback((value: number[]) => {
				assert.notStrictEqual(value, iterable);
			}));
		}
	},

	'.race': {
		'empty array': function () {
			let dfd = this.async();
			Promise.race([]).then(dfd.rejectOnError(() => {
				assert.fail(false, true, 'Promise should not have resolved');
			}));
			setTimeout(dfd.callback(() => {}), 10);
		},

		'mixed values and resolved': function () {
			let dfd = this.async();
			Promise.race([ 0, Promise.resolve(1), Promise.resolve(2) ])
				.then(dfd.callback((value: any) => {
					assert.strictEqual(value, 0);
				}));
		},

		'reject if any rejected': function () {
			let dfd = this.async();
			let pending = new Promise<void>(() => {});
			let rejected = Promise.reject(new Error('rejected'));

			Promise.race<any>([ pending, rejected ])
				.then(dfd.rejectOnError(() => {
					assert(false, 'Should not have resolved');
				}), dfd.callback((error: Error) => {
					assert.strictEqual(error.message, 'rejected');
				}));
		},

		'foreign thenables': function () {
			let dfd = this.async();
			let normal = Promise.resolve(1);
			let foreign = <any> {
				then: (f: Function) => {
					f(2);
				}
			};

			Promise.race([ normal, foreign ]).then(dfd.callback((value: any) => {
				assert.strictEqual(value, 1);
			}));
		}
	},

	'construct from Promise': {
		resolved: function () {
			let dfd = this.async();
			let promise = new Promise(Promise.resolve(5));
			promise.then(dfd.callback(function (value: any) {
				assert.strictEqual(value, 5);
			}));
		},

		rejected: function () {
			let dfd = this.async();
			let promise = new Promise(Promise.reject('foo'));
			promise.then(dfd.rejectOnError(function (value: any) {
				assert.fail(false, true, 'Promise should not have resolved');
			}), dfd.callback(function (error: any) {
				assert.strictEqual(error, 'foo');
			}));
		},

		'post-resolved': function () {
			let dfd = this.async();
			let resolver: (value: any) => void;
			let p = new Promise(function (resolve, reject) {
				resolver = resolve;
			});
			let promise = new Promise(p);
			promise.then(dfd.callback(function (value: any) {
				assert.strictEqual(value, 7);
			}));

			setTimeout(function () {
				resolver(7);
			});
		},

		'post-rejected': function () {
			let dfd = this.async();
			let resolver: (value: any) => void;
			let p = new Promise(function (resolve, reject) {
				resolver = reject;
			});
			let promise = new Promise(p);
			promise.then(dfd.rejectOnError(function (value: any) {
				assert.fail(false, true, 'Promise should not have resolved');
			}), dfd.callback(function (error: any) {
				assert.strictEqual(error, 'foo');
			}));

			setTimeout(function () {
				resolver('foo');
			});
		}
	},

	'#then': {
		fulfillment: function () {
			let dfd = this.async();
			Promise.resolve(5).then(dfd.callback((value: number) => {
				assert.strictEqual(value, 5);
			}));
		},

		identity: function () {
			let dfd = this.async();

			Promise.resolve(5).then(null, dfd.rejectOnError((value: Error) => {
				assert(false, 'Should not have resolved');
			})).then(dfd.callback((value: number) => {
				assert.strictEqual(value, 5);
			}));
		},

		'resolve once': function () {
			let dfd = this.async();
			let evilPromise = {
				then: (f?: Function, r?: Function) => {
					f(1);
					f(2);
				}
			};

			let calledAlready = false;
			Promise.resolve(evilPromise).then(dfd.rejectOnError((value: number) => {
				assert.strictEqual(calledAlready, false, 'resolver should not have been called');
				calledAlready = true;
				assert.strictEqual(value, 1, 'resolver called with unexpected value');
			})).then(dfd.resolve, dfd.reject);
		},

		'self-resolution': function () {
			let dfd = this.async();
			let resolve: (value?: any) => void;
			let promise = new Promise<void>((_resolve: (value?: any) => void) => {
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
			let dfd = this.async();
			let error = new Error('foo');
			Promise.reject(error).catch(dfd.callback((err: Error) => {
				assert.strictEqual(err, error);
			}));
		},

		identity: function () {
			let dfd = this.async();
			let error = new Error('foo');
			Promise.reject(error)
				.then(dfd.rejectOnError(() => {
					assert(false, 'Should not be resolved');
				}))
				.catch(dfd.callback((err: Error) => {
					assert.strictEqual(err, error);
				}));
		},

		'resolver throws': function () {
			let dfd = this.async();

			let error = new Error('foo');
			let promise = new Promise(() => {
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
				.then(() => {
					throw error;
				})
				.catch(dfd.callback((err: Error) => {
					assert.strictEqual(err, error);
				}));
		},

		'then throws': {
			'from resolver': function () {
				let dfd = this.async();
				let error = new Error('foo');
				let foreign = <any> {
					then: (f: Function) => {
						throw error;
					}
				};

				let promise = new Promise((resolve: Function) => {
					resolve(foreign);
				});
				promise.catch(dfd.callback((err: Error) => {
					assert.strictEqual(err, error);
				}));
			},

			'from handler': function () {
				let dfd = this.async();
				let error = new Error('foo');
				let foreign = <any> {
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
	},

	'#finally': {
		'called for resolved Promise': function () {
			let dfd = this.async();
			Promise.resolve(5).finally(dfd.callback(() => {}));
		},

		'called for rejected Promise': function () {
			let dfd = this.async();
			Promise.reject(5).finally(dfd.callback(() => {}));
		},

		'value passes through': function () {
			let dfd = this.async();
			Promise.resolve(5).finally(() => {}).then(dfd.callback((value: any) => assert.strictEqual(value, 5)));
		},

		'rejection passes through': function () {
			let dfd = this.async();
			Promise.reject(new Error('foo')).finally(() => {}).then(
				dfd.rejectOnError(() => assert(false, 'Should not have resolved')),
				dfd.callback((reason: any) => assert.propertyVal(reason, 'message', 'foo'))
			);
		},

		'returned value is ignored': function () {
			let dfd = this.async();
			Promise.resolve(5).finally((): any => {
				return 4;
			}).then(
				dfd.callback((value: any) => assert.strictEqual(value, 5)),
				dfd.rejectOnError(() => assert(false, 'Should not have rejected'))
			);
		},

		'returned resolved promise is ignored': function () {
			let dfd = this.async();
			Promise.resolve(5).finally((): any => {
				return Promise.resolve(4);
			}).then(
				dfd.callback((value: any) => assert.strictEqual(value, 5)),
				dfd.rejectOnError(() => assert(false, 'Should not have rejected'))
			);
		},

		'thrown error rejects': function () {
			let dfd = this.async();
			Promise.resolve(5).finally(() => {
				throw new Error('foo');
			}).then(
				dfd.rejectOnError((value: any) => assert(false, 'Should not have rejected')),
				dfd.callback((reason: any) => assert.propertyVal(reason, 'message', 'foo'))
			);
		},

		'returned rejected promise rejects': function () {
			let dfd = this.async();
			Promise.resolve(5).finally(() => {
				return Promise.reject('foo');
			}).then(
				dfd.rejectOnError((value: any) => assert(false, 'Should not have rejected')),
				dfd.callback((reason: any) => assert.strictEqual(reason, 'foo'))
			);
		}
	},

	'state inspection': {
		pending: function () {
			let promise = new Promise((resolve, reject) => {});
			assert.strictEqual(promise.state, State.Pending);
		},

		resolved: function () {
			let dfd = this.async();
			var promise = Promise.resolve(5);
			promise.then(dfd.callback(() => assert.strictEqual(promise.state, State.Fulfilled)));
		},

		rejected: function () {
			let dfd = this.async();
			var promise = Promise.reject(5);
			promise.catch(dfd.callback(() => assert.strictEqual(promise.state, State.Rejected)));
		}
	}
};

registerSuite(suite);
