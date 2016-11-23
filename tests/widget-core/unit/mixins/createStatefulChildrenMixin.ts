import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createStatefulChildrenMixin from '../../../src/mixins/createStatefulChildrenMixin';
import createWidgetBase from '../../../src/bases/createWidgetBase';
import { Widget, WidgetState, WidgetOptions } from 'dojo-interfaces/widgetBases';
import Promise from 'dojo-shim/Promise';
import { Child, RegistryProvider } from '../../../src/mixins/interfaces';
import Map from 'dojo-shim/Map';
import compose from 'dojo-compose/compose';
import createDestroyable from 'dojo-compose/bases/createDestroyable';
import { h } from 'maquette';
import widgetRegistry, { widgetMap } from '../../support/mockRegistryProvider';
import { arrayEquals } from '../../../src/util/lang';

let widget1: Child;
let widget2: Child;
let widget3: Child;
let widget4: Child;

const registryProvider: RegistryProvider<Child> = {
	get(type: string) {
		if (type === 'widgets') {
			return widgetRegistry;
		}
		throw new Error('Bad registry type');
	}
};

const createStatefulChildrenList = createStatefulChildrenMixin
	.mixin({
		mixin: {
			children: []
		}
	});

const createStatefulChildrenMap = createStatefulChildrenMixin
	.mixin({
		mixin: {
			children: new Map<string, Child>()
		}
	});

function delay() {
	return new Promise((resolve) => setTimeout(resolve, 50));
}

registerSuite({
	name: 'mixins/createStatefulChildrenMixin',

	beforeEach() {
		widgetRegistry.reset();
		widget1 = <Child> widgetMap.get('widget1');
		widget2 = <Child> widgetMap.get('widget2');
		widget3 = <Child> widgetMap.get('widget3');
		widget4 = <Child> widgetMap.get('widget4');
	},

	'List children': {
		creation(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				registryProvider,
				state: {
					children: [ 'widget1' ]
				}
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget1' ]);
				assert.isTrue(arrayEquals([ widget1 ], parent.children));
			}), 50);
		},
		setState(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				registryProvider
			});

			parent.setState({ children: [ 'widget2' ] });

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget2' ]);
				assert.isTrue(arrayEquals([ widget2 ], parent.children));
			}), 50);
		},
		'caching widgets'(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				registryProvider
			});

			parent.setState({ children: [ 'widget1' ]});

			setTimeout(() => {
				widgetRegistry.stack = [];
				parent.setState({ children: [ 'widget1', 'widget2' ] });
				setTimeout(dfd.callback(() => {
					assert.deepEqual(widgetRegistry.stack, [ 'widget2' ], 'should not have called the widget registry');
					assert.isTrue(arrayEquals([ widget1, widget2 ], parent.children));

					parent.setState({ children: [ 'widget2', 'widget1' ] });
					assert.isTrue(arrayEquals([ widget2, widget1 ], parent.children), 'should synchronously update children when cached');
				}), 100);
			}, 100);
		},
		'cached widgets should be removed on destroy'(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenList({
				registryProvider
			});

			parent.setState({ children: [ 'widget1', 'widget2' ] });

			setTimeout(() => {
				widget2.destroy();
				parent.setState({ children: [ 'widget1' ] });

				setTimeout(dfd.callback(() => {
					assert.isTrue(arrayEquals([ widget1 ], parent.children), 'Should not');
				}), 100);
			}, 100);
		},
		'childList'(this: any) {
			const dfd = this.async();

			const parent = createStatefulChildrenList({
				registryProvider
			});

			parent.emit({
				type: 'childlist',
				target: parent,
				children: [ widget1, widget3 ]
			});

			setTimeout(() => {
				assert.deepEqual(parent.state.children, [ 'widget1', 'widget3' ]);
				parent.emit({
					type: 'childlist',
					target: parent,
					children: [ widget2, widget3 ]
				});
				setTimeout(dfd.callback(() => {
					assert.deepEqual(parent.state.children, [ 'widget2', 'widget3' ]);
				}), 50);
			}, 50);
		}
	},

	'Map children': {
		creation(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				registryProvider,
				state: {
					children: [ 'widget1' ]
				}
			});

			setTimeout(dfd.callback(() => {
				assert.deepEqual(widgetRegistry.stack, [ 'widget1' ]);
				assert.equal(parent.children.size, 1);
				assert.equal(parent.children.get('widget1'), widget1);
			}), 50);
		},
		setState(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				registryProvider
			});

			parent.setState({ children: [ 'widget2' ] });

			setTimeout(dfd.callback(() => {
				assert.equal(parent.children.size, 1);
				assert.equal(parent.children.get('widget2'), widget2);
			}), 50);
		},
		'caching widgets'(this: any) {
			const dfd = this.async();
			const parent = createStatefulChildrenMap({
				registryProvider
			});

			parent.setState({ children: [ 'widget1' ]});

			setTimeout(() => {
				widgetRegistry.stack = [];
				parent.setState({ children: [ 'widget1', 'widget2' ] });
				setTimeout(dfd.callback(() => {
					assert.deepEqual(widgetRegistry.stack, [ 'widget2' ], 'should not have called the widget registry');
					assert.equal(parent.children.size, 2);
					assert.equal(parent.children.get('widget1'), widget1);
					assert.equal(parent.children.get('widget2'), widget2);
				}), 100);
			}, 100);
		},
		'childList'(this: any) {
			const dfd = this.async();

			const parent = createStatefulChildrenList({
				registryProvider
			});

			parent.emit({
				type: 'childlist',
				target: parent,
				children: new Map([['widget1', widget1], ['widget3', widget3]])
			});

			setTimeout(() => {
				assert.deepEqual(parent.state.children, [ 'widget1', 'widget3' ]);
				parent.emit({
					type: 'childlist',
					target: parent,
					children: new Map([['widget2', widget2], ['widget3', widget3]])
				});
				setTimeout(dfd.callback(() => {
					assert.deepEqual(parent.state.children, [ 'widget2', 'widget3' ]);
				}), 50);
			}, 50);
		}
	},

	'Avoids updating children if there are no changes'() {
		const parent = createStatefulChildrenList({
			registryProvider
		});

		let setCount = 0;
		const { set: setChildren } = Object.getOwnPropertyDescriptor(createStatefulChildrenList.prototype, 'children');
		Object.defineProperty(parent, 'children', {
			set(value: any) {
				setCount++;
				setChildren!.call(parent, value);
			}
		});

		parent.setState({ children: [ 'widget1' ]});
		return delay().then(() => {
			assert.equal(setCount, 1);
			parent.setState({ children: [ 'widget1' ]});
			return delay();
		}).then(() => {
			assert.equal(setCount, 1);
		});
	},

	'Avoids updating state if there are no changes'() {
		const parent = createStatefulChildrenList({
			registryProvider
		});

		let setCount = 0;
		const { setState } = parent;
		parent.setState = (state: any) => {
			setCount++;
			return setState.call(parent, state);
		};

		parent.emit({
			type: 'childlist',
			target: parent,
			children: [ widget1 ]
		});

		return delay().then(() => {
			assert.equal(setCount, 1);

			parent.emit({
				type: 'childlist',
				target: parent,
				children: [ widget1 ]
			});

			return delay();
		}).then(() => {
			assert.equal(setCount, 1);
		});
	},
	destroy() {
		const parent = createStatefulChildrenList({
			registryProvider
		});

		return delay().then(() => {
			assert.doesNotThrow(() => {
				parent.destroy();
			});
		});
	},

	'emits error if registry rejects get()'(this: any) {
		let rejectingRegistry = Object.create(widgetRegistry);
		const expected = new Error();
		rejectingRegistry.get = () => Promise.reject(expected);

		const dfd = this.async(250);

		const parent = createStatefulChildrenList({
			registryProvider: {
				get(type: string) {
					if (type === 'widgets') {
						return rejectingRegistry;
					}
					throw new Error('Bad registry type');
				}
			},
			state: {
				children: [ 'widget1' ]
			}
		});

		parent.on('error', dfd.callback((evt: any) => {
			assert.strictEqual(evt.target, parent);
			assert.strictEqual(evt.error, expected);
		}));
	},

	'latest state determines the children'() {
		const { has } = widgetRegistry;
		let registry = Object.create(widgetRegistry);

		const parent = createStatefulChildrenList({
			registryProvider: {
				get(type: string) {
					if (type === 'widgets') {
						return registry;
					}
					throw new Error('Bad registry type');

				}
			},
			state: {
				children: [ 'widget1' ]
			}
		});

		let resolveFirst: () => void;
		let resolveSecond: () => void;
		return delay().then(() => {
			registry.has = (id: string) => {
				return new Promise((resolve) => {
					const first = has.call(registry, id);
					resolveFirst = () => resolve(first);
				});
			};

			parent.setState({
				children: [ 'widget2' ]
			});

			assert.ok(resolveFirst);
		}).then(() => {
			registry.has = (id: string) => {
				return new Promise((resolve) => {
					const second = has.call(registry, id);
					resolveSecond = () => resolve(second);
				});
			};

			parent.setState({
				children: [ 'widget3' ]
			});

			assert.ok(resolveSecond);
			resolveSecond();

			return delay();
		}).then(() => {
			assert.isTrue(arrayEquals([ widget3 ], parent.children));

			resolveFirst();
			return delay();
		}).then(() => {
			assert.isTrue(arrayEquals([ widget3 ], parent.children));
		});
	},

	'only changed later state takes precedence over previous updates'() {
		const { has } = widgetRegistry;
		let registry = Object.create(widgetRegistry);

		const parent = createStatefulChildrenList({
			registryProvider: {
				get(type: string) {
					if (type === 'widgets') {
						return registry;
					}
					throw new Error('Bad registry type');

				}
			},
			state: {
				children: [ 'widget1' ]
			}
		});

		let resolveFirst: () => void;
		let resolveSecond: () => void;
		return delay().then(() => {
			registry.has = (id: string) => {
				return new Promise((resolve) => {
					const first = has.call(registry, id);
					resolveFirst = () => resolve(first);
				});
			};

			parent.setState({
				children: [ 'widget2' ]
			});

			assert.ok(resolveFirst);
		}).then(() => {
			registry.has = (id: string) => {
				return new Promise((resolve) => {
					const second = has.call(registry, id);
					resolveSecond = () => resolve(second);
				});
			};

			parent.setState({
				children: [ 'widget2' ]
			});

			assert.notOk(resolveSecond);

			resolveFirst();
			return delay();
		}).then(() => {
			assert.isTrue(arrayEquals([ widget2 ], parent.children));

			return delay();
		});
	},

	'#createChild()': {
		'creation during mixin'() {
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.createChild(createWidgetBase, <WidgetOptions<WidgetState>> {
								render() {
									return h('div');
								}
							})
							.then((createdChild) => {
								resolve([ instance, createdChild ]);
							});
						}
					});

				createFoo({
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');
						}
					},
					id: 'parent'
				});
			})
			.then(([ foo, result ]) => {
				const [ id ] = result;
				assert.include(id, 'parent-child');
				assert.deepEqual(foo.state.children, [ id ]);
			});
		},

		'append children'() {
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.setState({ children: [ 'foo' ] });
							instance.createChild(createWidgetBase, <WidgetOptions<WidgetState>> {
								render() {
									return h('div');
								}
							})
							.then((createdChild) => {
								resolve([ instance, createdChild ]);
							});
						}
					});

				createFoo({
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');
						}
					},
					id: 'parent'
				});
			})
			.then(([ foo, result ]) => {
				const [ id ] = result;
				assert.include(id, 'parent-child');
				assert.deepEqual(foo.state.children, [ 'foo', id ]);
			});
		},

		'creation during mixin - with setting ID'() {
			return new Promise<[string, Widget<WidgetState>]>((resolve) => {
			const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.createChild(createWidgetBase, <WidgetOptions<WidgetState>> {
								render() {
									return h('div');
								},
								id: 'foo'
							})
							.then(resolve);
						}
					});

				createFoo({
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');

						}
					},
					id: 'parent'
				});
			})
			.then((result) => {
				const [ id ] = result;
				assert.strictEqual(id, 'foo');
			});
		},

		'non-registry rejects'(this: any) {
			const dfd = this.async();
			const stateful = createStatefulChildrenMixin();
			stateful.createChild(createWidgetBase)
				.then(() => {
					throw new Error('Should not have called');
				}, dfd.callback((err: Error) => {
					assert.instanceOf(err, Error);
					assert.strictEqual(err.message, 'Unable to resolve registry');
				}));
		}
	},

	'#createChildren()': {
		'with map'() {
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.createChildren({
								foo: { factory: createWidgetBase },
								bar: { factory: createWidgetBase }
							})
							.then((createdChildren) => {
								resolve([ instance, createdChildren ]);
							});
						}
					});

					createFoo({
						id: 'foo',
						registryProvider: {
							get(type: string) {
								if (type === 'widgets') {
									return registry;
								}
								throw new Error('Bad registry type');

							}
						}
					});
			})
			.then(([ widget, { foo, bar } ]) => {
				assert(foo);
				assert(bar);
				assert.include(foo.id, 'foo-child');
				assert.include(bar.id, 'foo-child');
				assert.strictEqual(foo.widget.render().vnodeSelector, 'div');
				assert.strictEqual(bar.widget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ foo.id, bar.id ]);
			});
		},

		'with map append children'() {
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.setState({ children: [ 'foo' ]});
							instance.createChildren({
								foo: { factory: createWidgetBase },
								bar: { factory: createWidgetBase }
							})
							.then((createdChildren) => {
								resolve([ instance, createdChildren ]);
							});
						}
					});

				createFoo({
					id: 'foo',
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');
						}
					}
				});
			})
			.then(([widget, { foo, bar }]) => {
				assert(foo);
				assert(bar);
				assert.include(foo.id, 'foo-child');
				assert.include(bar.id, 'foo-child');
				assert.strictEqual(foo.widget.render().vnodeSelector, 'div');
				assert.strictEqual(bar.widget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ 'foo', foo.id, bar.id ]);
			});
		},

		'with map and options.id'() {
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.createChildren({
								foo: { factory: createWidgetBase, options: { id: 'foo' } },
								bar: { factory: createWidgetBase, options: { id: 'bar' } }
							})
							.then(resolve);
						}
					});

				createFoo({
					id: 'foo',
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');

						}
					}
				});
			})
			.then(({ foo, bar }) => {
				assert(foo);
				assert(bar);
				assert.strictEqual(foo.id, 'foo');
				assert.strictEqual(bar.id, 'bar');
				assert.strictEqual(foo.widget.render().vnodeSelector, 'div');
				assert.strictEqual(bar.widget.render().vnodeSelector, 'div');
			});
		},

		'destroy with map destroys children'() {
			let destroyCount = 0;
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createDestroyRenderable = createWidgetBase
					.mixin({
						mixin: createDestroyable,
						initialize(instance) {
							instance.own({
								destroy() {
									destroyCount++;
								}
							});
						}
					});

				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.createChildren({
								foo: { factory: createDestroyRenderable, options: { id: 'foo' } },
								bar: { factory: createDestroyRenderable, options: { id: 'bar' } }
							})
							.then((createdChildren) => {
								resolve([ instance, createdChildren ]);
							});
						}
					});

				createFoo({
					id: 'foo',
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');

						}
					}
				});
			}).then(([ foo ]) => {
				assert.strictEqual(destroyCount, 0);
				return foo.destroy();
			})
			.then(() => {
				assert.strictEqual(destroyCount, 2);
			});
		},

		'with array'() {
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.createChildren([ [ createWidgetBase, {} ], [ createWidgetBase, {} ] ])
							.then((createdChildren) => {
								resolve([ instance, createdChildren ]);
							});
						}
					});

				createFoo({
					id: 'foo',
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');

						}
					}
				});
			})
			.then(([ widget, [ a, b ] ]) => {
				assert(a);
				assert(b);
				const [ aID, aWidget ] = a;
				const [ bID, bWidget ] = b;
				assert.include(aID, 'foo-child');
				assert.include(bID, 'foo-child');
				assert.strictEqual(aWidget.render().vnodeSelector, 'div');
				assert.strictEqual(bWidget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ aID, bID ]);
			});
		},

		'with array append children'() {
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.setState({ children: [ 'foo' ]});
							instance.createChildren([ [ createWidgetBase, {} ], [ createWidgetBase, {} ] ])
							.then((createdChildren) => {
								resolve([ instance, createdChildren ]);
							});
						}
					});

				createFoo({
					id: 'foo',
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');

						}
					}
				});
			})
			.then(([ widget, [ a, b ] ]) => {
				assert(a);
				assert(b);
				const [ aID, aWidget ] = a;
				const [ bID, bWidget ] = b;
				assert.include(aID, 'foo-child');
				assert.include(bID, 'foo-child');
				assert.strictEqual(aWidget.render().vnodeSelector, 'div');
				assert.strictEqual(bWidget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ 'foo', aID, bID ]);
			});
		},

		'with array and options.id'() {
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.createChildren([ [ createWidgetBase, { id: 'foo' } ], [ createWidgetBase, { id: 'bar' } ] ])
														.then((createdChildren) => {
								resolve([ instance, createdChildren ]);
							});
						}
					});

				createFoo({
					id: 'foo',
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');

						}
					}
				});
			})
			.then(([ widget, [ a, b ] ]) => {
				assert(a);
				assert(b);
				const [ aID, aWidget ] = a;
				const [ bID, bWidget ] = b;
				assert.strictEqual(aID, 'foo');
				assert.strictEqual(bID, 'bar');
				assert.strictEqual(aWidget.render().vnodeSelector, 'div');
				assert.strictEqual(bWidget.render().vnodeSelector, 'div');
				assert.deepEqual(widget.state.children, [ aID, bID ]);
			});
		},

		'destroy with array destroys children'() {
			let destroyCount = 0;
			return new Promise((resolve) => {
				const registry = Object.create(widgetRegistry);
				const createDestroyRenderable = createWidgetBase
					.mixin({
						mixin: createDestroyable,
						initialize(instance) {
							instance.own({
								destroy() {
									destroyCount++;
								}
							});
						}
					});

				const createFoo = compose({})
					.mixin({
						mixin: createStatefulChildrenMixin,
						initialize(instance) {
							instance.createChildren([
								[ createDestroyRenderable, { id: 'foo' } ],
								[ createDestroyRenderable, { id: 'bar' } ]
							])
							.then((createdChildren) => {
								resolve([ instance, createdChildren ]);
							});
						}
					});

				createFoo({
					id: 'foo',
					registryProvider: {
						get(type: string) {
							if (type === 'widgets') {
								return registry;
							}
							throw new Error('Bad registry type');

						}
					}
				});
			})
			.then(([ foo ]) => {
				assert.strictEqual(destroyCount, 0);
				return foo.destroy();
			})
			.then(() => {
				assert.strictEqual(destroyCount, 2);
			});
		},

		'non-registry rejects'(this: any) {
			const dfd = this.async();
			const stateful = createStatefulChildrenMixin();
			stateful.createChildren({})
				.then(() => {
					throw new Error('Should not have been called');
				}, dfd.callback((err: Error) => {
					assert.instanceOf(err, Error);
					assert.strictEqual(err.message, 'Unable to resolve registry');
				}));
		}
	}
});
