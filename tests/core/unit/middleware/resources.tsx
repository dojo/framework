const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { renderer, tsx, create } from '../../../../src/core/vdom';
import '../../../../src/shim/Promise';
import { createResolvers } from '../../support/util';
import { createResourceMiddleware, createResourceTemplate } from '../../../../src/core/middleware/resources';
import icache from '../../../../src/core/middleware/icache';

const resolvers = createResolvers();

describe('Resources Middleware', () => {
	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
	});

	describe('getOrRead', () => {
		it('Should support using a template directly with `getOrRead`', () => {});
		it('Should support using a template factory directly with `getOrRead', () => {});
		it('Should support passing a template to a widget with the `resource` middleware', () => {});
		it('Should support passing a template to a widget using the template factory', () => {});
		it('Should support passing a template to a widget using the short hand', () => {});
		it('Should transform data using the transform configuration', () => {});
		it('Should not call read if the request has been satisfied by one or more request', () => {});
	});

	describe('get', () => {});

	it('Return data from getOrRead using template read', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ data: { hello: string } }>() });

		const Widget = factory(({ properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			return <div>{JSON.stringify(getOrRead(template, options()))}</div>;
		});

		const template = createResourceTemplate<{ hello: string }>('hello');

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return <Widget resource={resource({ template: template({ data: [{ hello: '1' }], id }) })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: '1' }])}</div>`);
	});

	it('should update when options called', () => {
		const root = document.createElement('div');
		const factory = create({ icache, resource: createResourceMiddleware<{ data: { hello: string } }>() });
		const Widget = factory(({ id, properties, middleware: { resource, icache } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			const counter = icache.set<number>('counter', (counter = 0) => ++counter);
			return (
				<div>
					<div>{JSON.stringify(getOrRead(template, options({ size: 1 })))}</div>
					<div>{`${counter}`}</div>
					<button
						onclick={() => {
							const { page } = options();
							options({ page: page + 1 });
						}}
					/>
				</div>
			);
		});

		const template = createResourceTemplate<{ hello: string }>('hello');

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({
						template: template({ id, data: [{ hello: '1' }, { hello: '2' }, { hello: '3' }] })
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><div>${JSON.stringify([{ hello: '1' }])}</div><div>1</div><button></button></div>`
		);
		(root.children[0].children[2] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><div>${JSON.stringify([{ hello: '2' }])}</div><div>2</div><button></button></div>`
		);
		(root.children[0].children[2] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><div>${JSON.stringify([{ hello: '3' }])}</div><div>3</div><button></button></div>`
		);
	});

	it('should transform data with getOrRead', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ data: { hello: string } }>() });
		const Widget = factory(({ properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			const items = getOrRead(template, options({ page: 1, size: 1 }));
			return (
				<div>
					<div>{JSON.stringify(items)}</div>
				</div>
			);
		});

		const template = createResourceTemplate<{ wrong: string }>('wrong');

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({
						template: template({ id, data: [{ wrong: '1' }, { wrong: '2' }] }),
						transform: { hello: 'wrong' }
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div><div>${JSON.stringify([{ hello: '1' }])}</div></div>`);
	});

	it('should by able to filter with transformed data', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ data: { hello: string; foo?: string } }>() });
		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			options({ query: { hello: '2', foo: '1' } });
			return <div>{JSON.stringify(getOrRead(template, options({ query: { hello: '2', foo: '1' } })))}</div>;
		});

		const template = createResourceTemplate<{ wrong: string; foo: string }>('foo');

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({
						transform: { hello: 'wrong' },
						template: template({
							id,
							data: [{ wrong: '1', foo: '1' }, { wrong: '2', foo: '1' }, { wrong: '2', foo: '2' }]
						})
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: '2', foo: '1' }])}</div>`);
	});

	it('should by able to filter non string values by reference', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ data: { age: number } }>() });
		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			return <div>{JSON.stringify(getOrRead(template, options({ query: { age: 10 } })))}</div>;
		});

		const template = createResourceTemplate<{ age: number }>('age');

		const App = create({ resource: createResourceMiddleware() })(({ id }) => {
			return <Widget resource={template({ id, data: [{ age: 10 }, { age: 100 }, { age: 99 }] })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ age: 10 }])}</div>`);
	});

	// it('returns loading status of resource', async () => {
	// 	let resolver: (options: { data: any[]; total: number }) => void;
	// 	const promise = new Promise<{ data: any[]; total: number }>((resolve) => {
	// 		resolver = resolve;
	// 	});
	// 	const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });

	// 	const template = createResourceTemplate<{ hello: string }>({
	// 		read: (options, { put }) => {
	// 			return promise.then((res) => {
	// 				put(res, options);
	// 			});
	// 		},
	// 		find: defaultFind
	// 	});

	// 	const Widget = factory(({ id, properties, middleware: { resource } }) => {
	// 		const { getOrRead, createOptions, isLoading } = resource;
	// 		const {
	// 			resource: { template, options = createOptions(id) }
	// 		} = properties();
	// 		const items = getOrRead(template, options({ size: 1, page: 1 }));
	// 		const loading = isLoading(template, options({ size: 1, page: 1 }));
	// 		if (loading) {
	// 			return <div>Loading</div>;
	// 		}
	// 		return <div>{JSON.stringify(items)}</div>;
	// 	});

	// 	const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
	// 		return <Widget resource={resource({ template })} />;
	// 	});

	// 	const r = renderer(() => <App />);
	// 	const root = document.createElement('div');
	// 	r.mount({ domNode: root });
	// 	assert.strictEqual(root.innerHTML, `<div>Loading</div>`);
	// 	resolver!({ data: [{ hello: 'world' }], total: 1 });
	// 	await promise;
	// 	resolvers.resolveRAF();
	// 	assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: 'world' }]])}</div>`);
	// });

	it('should be able to share resource options across between widgets', () => {
		const factory = create({ resource: createResourceMiddleware<{ data: { hello: string } }>() });
		const template = createResourceTemplate<{ hello: string }>('hello');

		const WidgetOne = factory(({ properties, id, middleware: { resource } }) => {
			const { createOptions } = resource;
			const {
				resource: { options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			return (
				<button
					onclick={() => {
						options({ page: 2 });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			const items = getOrRead(template, options({ size: 1 }));
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ properties, id, middleware: { resource } }) => {
			const {
				resource: { template }
			} = properties();
			const { createOptions } = resource;
			const options = createOptions((curr, next) => ({ ...curr, ...next }));
			return (
				<div>
					<WidgetOne resource={resource({ template, options })} />
					<WidgetTwo resource={resource({ template, options })} />
				</div>
			);
		});

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Parent
					resource={resource({
						template: template({ id, data: [{ hello: 'world' }, { hello: 'world again' }] })
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world' }])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world again' }])}</div></div>`
		);
	});

	// it('should be only destroy the resource once all subscribers have been removed', () => {
	// 	const factory = create({ resource: createResourceMiddleware<{ hello: string }>(), icache });
	// 	const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);

	// 	const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
	// 		const { createOptions } = resource;
	// 		const {
	// 			resource: { options = createOptions(id) }
	// 		} = properties();
	// 		return (
	// 			<button
	// 				onclick={() => {
	// 					options({ page: 2 });
	// 				}}
	// 			/>
	// 		);
	// 	});

	// 	const WidgetTwo = factory(({ id, properties, middleware: { resource } }) => {
	// 		const { getOrRead, createOptions } = resource;
	// 		const {
	// 			resource: { template, options = createOptions(id) }
	// 		} = properties();
	// 		const items = getOrRead(template, options({ size: 1 }));
	// 		return (
	// 			<div>
	// 				<div>{JSON.stringify(items)}</div>
	// 				<button
	// 					onclick={() => {
	// 						options({ page: 3 });
	// 					}}
	// 				/>
	// 			</div>
	// 		);
	// 	});

	// 	const Parent = factory(function Parent({ id, properties, middleware: { resource, icache } }) {
	// 		const { createOptions } = resource;
	// 		const {
	// 			resource: { template, options = createOptions(id) }
	// 		} = properties();
	// 		const show = icache.getOrSet<boolean>('show', true);
	// 		return (
	// 			<div>
	// 				<button
	// 					onclick={() => {
	// 						icache.set('show', (value) => !value);
	// 					}}
	// 				/>
	// 				{show && <WidgetOne resource={resource({ template, options })} />}
	// 				{show && <WidgetTwo resource={resource({ template, options })} />}
	// 				<WidgetTwo resource={resource({ template, options })} />
	// 			</div>
	// 		);
	// 	});

	// 	const App = create({ resource: createResourceMiddleware(), icache })(function App({
	// 		id,
	// 		middleware: { icache, resource }
	// 	}) {
	// 		const show = icache.getOrSet<boolean>('show', true);
	// 		return (
	// 			<div>
	// 				{show && (
	// 					<Parent
	// 						resource={resource({
	// 							template,
	// 							initOptions: {
	// 								id,
	// 								data: [{ hello: 'world' }, { hello: 'world again' }, { hello: 'world the third' }]
	// 							}
	// 						})}
	// 					/>
	// 				)}
	// 				<button
	// 					onclick={() => {
	// 						icache.set('show', (value) => !value);
	// 					}}
	// 				/>
	// 			</div>
	// 		);
	// 	});

	// 	const r = renderer(() => <App />);
	// 	const root = document.createElement('div');
	// 	r.mount({ domNode: root });
	// 	assert.strictEqual(
	// 		root.innerHTML,
	// 		'<div><div><button></button><button></button><div><div>[[{"hello":"world"}]]</div><button></button></div><div><div>[[{"hello":"world"}]]</div><button></button></div></div><button></button></div>'
	// 	);
	// 	(root.children[0].children[0].children[1] as any).click();
	// 	resolvers.resolveRAF();
	// 	assert.strictEqual(
	// 		root.innerHTML,
	// 		'<div><div><button></button><button></button><div><div>[[{"hello":"world again"}]]</div><button></button></div><div><div>[[{"hello":"world again"}]]</div><button></button></div></div><button></button></div>'
	// 	);
	// 	(root.children[0].children[0].children[0] as any).click();
	// 	resolvers.resolveRAF();
	// 	assert.strictEqual(
	// 		root.innerHTML,
	// 		'<div><div><button></button><div><div>[[{"hello":"world again"}]]</div><button></button></div></div><button></button></div>'
	// 	);
	// 	(root.children[0].children[0].children[1].children[1] as any).click();
	// 	resolvers.resolveRAF();
	// 	assert.strictEqual(
	// 		root.innerHTML,
	// 		'<div><div><button></button><div><div>[[{"hello":"world the third"}]]</div><button></button></div></div><button></button></div>'
	// 	);
	// 	(root.children[0].children[1] as any).click();
	// 	resolvers.resolveRAF();
	// 	resolvers.resolveRAF();
	// 	assert.strictEqual(root.innerHTML, '<div><button></button></div>');
	// });

	it('should be able to share search query across widgets', () => {
		const factory = create({ resource: createResourceMiddleware<{ data: { hello: string } }>() });
		const template = createResourceTemplate<{ hello: string }>('hello');

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { createOptions } = resource;
			const {
				resource: { options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			return (
				<button
					onclick={() => {
						options({ query: { hello: 'again' } });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ id, properties, middleware: { resource } }) => {
			const { createOptions, getOrRead } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			const items = getOrRead(template, options({ size: 2 }));
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ properties, middleware: { resource } }) => {
			const { createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();

			return (
				<div>
					<WidgetOne resource={resource({ template, options })} />
					<WidgetTwo resource={resource({ template, options })} />
				</div>
			);
		});

		const App = create({ resource: createResourceMiddleware() })(({ id }) => {
			return <Parent resource={template({ id, data: [{ hello: 'world' }, { hello: 'world again' }] })} />;
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world' }, { hello: 'world again' }])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolve();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world again' }])}</div></div>`
		);
	});

	it('should update the data in the resource', () => {
		const factory = create({ resource: createResourceMiddleware<{ data: { hello: string } }>() });
		const template = createResourceTemplate<{ hello: string }>('hello');

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			const items = getOrRead(template, options({ size: 2 }));
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create({ icache, resource: createResourceMiddleware() })(
			({ id, middleware: { resource, icache } }) => {
				const data = icache.getOrSet('data', [{ hello: 'world' }, { hello: 'moon' }]);
				return (
					<div>
						<button
							onclick={() => {
								icache.set('data', [{ hello: 'mars' }, { hello: 'venus' }]);
							}}
						/>
						<WidgetOne resource={resource({ template: template({ id, data }) })} />
					</div>
				);
			}
		);

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world' }, { hello: 'moon' }])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'mars' }, { hello: 'venus' }])}</div></div>`
		);
	});

	it('should update the data in existing resources', () => {
		const factory = create({ resource: createResourceMiddleware<{ data: { hello: string } }>() });
		const template = createResourceTemplate<{ hello: string }>('hello');

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			const items = getOrRead(template, options({ size: 2 }));
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create({ icache, resource: createResourceMiddleware() })(
			({ id, middleware: { resource, icache } }) => {
				const data = icache.getOrSet('data', [{ hello: 'world' }, { hello: 'moon' }]);
				const show = icache.getOrSet('show', true);
				return (
					<div>
						<button
							onclick={() => {
								icache.set('data', [{ hello: 'mars' }, { hello: 'venus' }]);
							}}
						/>
						<button
							onclick={() => {
								icache.set('show', (show) => !show);
							}}
						/>
						{show && <WidgetOne resource={resource({ template: template({ id, data }) })} />}
					</div>
				);
			}
		);

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><button></button><div>${JSON.stringify([
				{ hello: 'world' },
				{ hello: 'moon' }
			])}</div></div>`
		);
		(root.children[0].children[1] as any).click();
		resolvers.resolveRAF();
		(root.children[0].children[1] as any).click();
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><button></button><div>${JSON.stringify([
				{ hello: 'mars' },
				{ hello: 'venus' }
			])}</div></div>`
		);
	});

	it('should be able to change the options for a resource', () => {
		const factory = create({ resource: createResourceMiddleware<{ data: { hello: string } }>() });
		const template = createResourceTemplate<{ hello: string }>('hello');

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			const items = getOrRead(template, options());
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create({ icache, resource: createResourceMiddleware() })(
			({ id, middleware: { resource, icache } }) => {
				const { createOptions } = resource;
				const options = icache.getOrSet('options', () => {
					const options = createOptions((curr, next) => ({ ...curr, ...next }), 'one');
					options({ size: 2 });
					return options;
				});
				const data = icache.getOrSet('data', [{ hello: 'world' }, { hello: 'moon' }]);
				return (
					<div>
						<button
							onclick={() => {
								icache.set('options', () => {
									const options = createOptions((curr, next) => ({ ...curr, ...next }), 'two');
									options({ size: 1 });
									return options;
								});
							}}
						/>
						<WidgetOne resource={resource({ template: template({ id, data }), options })} />
					</div>
				);
			}
		);

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world' }, { hello: 'moon' }])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world' }])}</div></div>`
		);
	});

	it('should be able to use a resource directly in a widget', () => {
		const template = createResourceTemplate<{ hello: string }>({
			idKey: 'hello',
			read: (request, controls) => {
				controls.put({ data: [{ hello: 'world' }], total: 1 }, request);
			}
		});
		const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
			const { createOptions, getOrRead } = resource;
			const options = createOptions((curr, next) => ({ ...curr, ...next }));
			const items = getOrRead(template, options());

			return (
				<div>
					<div>{JSON.stringify(items)}</div>
				</div>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div><div>[{"hello":"world"}]</div></div>');
	});

	it('should be able to use a resource directly in a widget with template options', () => {
		const template = createResourceTemplate<{ hello: string }>('hello');
		const App = create({ icache, resource: createResourceMiddleware() })(({ middleware: { resource, icache } }) => {
			const { createOptions, getOrRead } = resource;
			const options = createOptions((curr, next) => ({ ...curr, ...next }));
			const data = icache.getOrSet('data', [{ hello: 'template one' }]);
			const templateOneItems = getOrRead(template({ id: 'one', data }), options());
			const templateTwoItems = getOrRead(template({ id: 'two', data: [{ hello: 'template two' }] }), options());

			return (
				<div>
					<button
						onclick={() => {
							icache.set('data', [{ hello: 'updated template one' }]);
						}}
					/>
					{JSON.stringify(templateOneItems)}
					{JSON.stringify(templateTwoItems)}
				</div>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><button></button>[{"hello":"template one"}][{"hello":"template two"}]</div>'
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><button></button>[{"hello":"updated template one"}][{"hello":"template two"}]</div>'
		);
	});

	// it('should destroy resources when widget is removed', () => {
	// 	const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
	// 	const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);
	// 	let renderCount = 0;
	// 	let callOptions: any;
	// 	const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
	// 		const { getOrRead, createOptions } = resource;
	// 		const {
	// 			resource: { template, options = createOptions(id) }
	// 		} = properties();
	// 		renderCount++;
	// 		callOptions = options;
	// 		options({ size: 2 });
	// 		const items = getOrRead(template, options());
	// 		return <div>{JSON.stringify(items)}</div>;
	// 	});

	// 	const WidgetTwo = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
	// 		return (
	// 			<WidgetOne
	// 				resource={resource({
	// 					template,
	// 					initOptions: { id, data: [{ hello: 'world' }, { hello: 'moon' }] }
	// 				})}
	// 			/>
	// 		);
	// 	});

	// 	const App = create({ icache })(({ middleware: { icache } }) => {
	// 		const show = icache.getOrSet<boolean>('show', true);
	// 		return (
	// 			<div>
	// 				<button
	// 					onclick={() => {
	// 						icache.set<boolean>('show', (value) => !value);
	// 					}}
	// 				/>
	// 				{show && <WidgetTwo />}
	// 			</div>
	// 		);
	// 	});

	// 	const r = renderer(() => <App />);
	// 	const root = document.createElement('div');
	// 	r.mount({ domNode: root });
	// 	assert.strictEqual(
	// 		root.innerHTML,
	// 		'<div><button></button><div>[[{"hello":"world"},{"hello":"moon"}]]</div></div>'
	// 	);
	// 	(root.children[0].children[0] as any).click();
	// 	resolvers.resolveRAF();
	// 	assert.strictEqual(renderCount, 1);
	// 	assert.strictEqual(root.innerHTML, '<div><button></button></div>');
	// 	callOptions({ pageNumber: 2, pageSize: 100, query: {} });
	// 	resolvers.resolveRAF();
	// 	assert.strictEqual(renderCount, 1);
	// 	assert.strictEqual(root.innerHTML, '<div><button></button></div>');
	// });

	it('should support a resource with an unknown total', async () => {
		const promiseMap = new Map<number, any>();
		for (let i = 0; i < 5; i++) {
			let resolver: any;
			const promise = new Promise<{ data: any[]; total: number }>((resolve) => {
				resolver = resolve;
			});
			promiseMap.set(i, { i, promise, resolver });
		}

		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ data: { value: string } }>() });
		let counter = 0;

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
			} = properties();
			const page1 = getOrRead(template, options({ size: 1, page: 1 }), true);
			const page2 = getOrRead(template, options({ size: 1, page: 2 }), true);
			const page3 = getOrRead(template, options({ size: 1, page: 3 }), true);
			const page4 = getOrRead(template, options({ size: 1, page: 4 }), true);
			const page5 = getOrRead(template, options({ size: 1, page: 5 }), true);
			return (
				<div>
					<div>{JSON.stringify(page1)}</div>
					<div>{JSON.stringify(page2)}</div>
					<div>{JSON.stringify(page3)}</div>
					<div>{JSON.stringify(page4)}</div>
					<div>{JSON.stringify(page5)}</div>
					<div>{String(++counter)}</div>
				</div>
			);
		});

		const template = createResourceTemplate<{ value: string }>({
			idKey: 'value',
			read: (options, { put }) => {
				const payload = promiseMap.get(options.offset);
				if (payload) {
					const originalPromise = payload.promise;
					payload.promise = payload.promise.then((res: any) => {
						put(res, options);
					});
					return originalPromise;
				}
			}
		});

		const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
			return <Widget resource={resource({ template })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(2)!.resolver({ data: [{ value: 'page 3' }] });
		await promiseMap.get(2)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(0)!.resolver({ data: [{ value: 'page 1' }] });
		await promiseMap.get(0)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(1)!.resolver({ data: [{ value: 'page 2' }] });
		await promiseMap.get(1)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(4)!.resolver({ data: [{ value: 'page 5' }] });
		await promiseMap.get(4)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(3)!.resolver({ data: [{ value: 'page 4' }] });
		await promiseMap.get(3)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[[{"value":"page 1"}],[{"value":"page 2"}],[{"value":"page 3"}],[{"value":"page 4"}],[{"value":"page 5"}]]</div><div>2</div></div>'
		);
	});
});
