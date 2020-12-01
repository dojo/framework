const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { renderer, tsx, create } from '../../../../src/core/vdom';
import testRenderer, { assertion } from '../../../../src/testing/renderer';
import Map from '../../../../src/shim/Map';
import '../../../../src/shim/Promise';
import { createResolvers } from '../../support/util';
import {
	createResourceMiddleware,
	memoryTemplate,
	createResourceTemplate,
	createMemoryResourceTemplate,
	createResourceTemplateWithInit,
	defaultFind
} from '../../../../src/core/middleware/resources';
import icache from '../../../../src/core/middleware/icache';

const resolvers = createResolvers();

describe('Resources Middleware', () => {
	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
	});

	it('getOrRead with options', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			return <div>{JSON.stringify(getOrRead(template, options()))}</div>;
		});

		const template = createResourceTemplate<{ hello: string }>();

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return <Widget resource={resource({ template, initOptions: { data: [{ hello: '1' }], id } })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: '1' }]])}</div>`);
	});

	it('should update when options called', () => {
		const root = document.createElement('div');
		const factory = create({ icache, resource: createResourceMiddleware<{ hello: string }>() });

		let set: any;
		const Widget = factory(({ id, properties, middleware: { resource, icache } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const counter = icache.set<number>('counter', (counter = 0) => ++counter);
			set = options;
			return (
				<div>
					<div>{JSON.stringify(getOrRead(template, options({ size: 1 })))}</div>
					<div>{`${counter}`}</div>
				</div>
			);
		});

		const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({ template, initOptions: { id, data: [{ hello: '1' }, { hello: '2' }] } })}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div><div>${JSON.stringify([[{ hello: '1' }]])}</div><div>1</div></div>`);
		set({ page: 1, query: {} });
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, `<div><div>${JSON.stringify([[{ hello: '1' }]])}</div><div>1</div></div>`);
		set({ page: 2 });
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, `<div><div>${JSON.stringify([[{ hello: '2' }]])}</div><div>2</div></div>`);
	});

	it('should provide a default if no resource property is passed', () => {
		const factory = create({ resource: createResourceMiddleware<{}>() });
		const Widget = factory(({ properties }) => {
			const { resource } = properties();
			return resource && <div>contents</div>;
		});

		const r = testRenderer(() => <Widget resource={undefined as any} />);
		r.expect(assertion(() => <div>contents</div>));
	});

	it('should convert resource options to a resource prop', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			return <div>{JSON.stringify(getOrRead(template, options()))}</div>;
		});

		const template = createMemoryResourceTemplate<{ hello: string }>();
		const r = renderer(() => (
			<Widget resource={{ template, initOptions: { data: [{ hello: '1' }], id: 'id' } } as any} />
		));
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: '1' }]])}</div>`);
	});

	it('should be able to perform a read with a meta request', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { createOptions, meta } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const metaInfo = meta(template, options(), true);
			return (
				<div>
					<div>{`${metaInfo!.total}`}</div>
				</div>
			);
		});

		const template = createResourceTemplate<{ hello: string }>({
			read: (request, controls) => {
				controls.put({ data: [{ hello: 'world' }, { hello: 'world' }], total: 2 }, request);
			},
			find: defaultFind
		});

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return <Widget resource={resource({ template })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div><div>2</div></div>`);
	});

	it('should transform data with getOrRead', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions, meta } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const items = getOrRead(template, options({ page: 1, size: 1 }));
			const metaInfo = meta(template, options());
			return (
				<div>
					<div>{JSON.stringify(items)}</div>
					<div>{`${metaInfo!.total}`}</div>
				</div>
			);
		});

		const template = createResourceTemplateWithInit<{ wrong: string }, { data: { wrong: string }[] }>({
			...memoryTemplate
		});

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({
						template,
						initOptions: { id, data: [{ wrong: '1' }, { wrong: '2' }] },
						transform: { hello: 'wrong' }
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div><div>${JSON.stringify([[{ hello: '1' }]])}</div><div>2</div></div>`);
	});

	it('should by able to filter with transformed data', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: string; foo?: string }>() });
		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			options({ query: { hello: '2', foo: '1' } });
			return <div>{JSON.stringify(getOrRead(template, options({ query: { hello: '2', foo: '1' } })))}</div>;
		});

		const template = createResourceTemplate<
			{ wrong: string; foo: string },
			{ data: { wrong: string; foo: string }[] }
		>(memoryTemplate);

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({
						transform: { hello: 'wrong' },
						template,
						initOptions: {
							id,
							data: [{ wrong: '1', foo: '1' }, { wrong: '2', foo: '1' }, { wrong: '2', foo: '2' }]
						}
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: '2', foo: '1' }]])}</div>`);
	});

	it('should by able to filter non string values by reference', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ age: number }>() });
		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			return <div>{JSON.stringify(getOrRead(template, options({ query: { age: 10 } })))}</div>;
		});

		const template = createResourceTemplate<{ age: number }, { data: { age: number }[] }>(memoryTemplate);

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({
						template,
						initOptions: { id, data: [{ age: 10 }, { age: 100 }, { age: 99 }] }
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ age: 10 }]])}</div>`);
	});

	it('should not convert fields into strings when using a transform', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: number }>() });
		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			return <div>{JSON.stringify(getOrRead(template, options({ size: 1 })))}</div>;
		});

		const template = createResourceTemplate<{ wrong: number }, { data: { wrong: number }[] }>(memoryTemplate);

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({
						template,
						transform: { hello: 'wrong' },
						initOptions: { id, data: [{ wrong: 1 }, { wrong: 2 }] }
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: 1 }]])}</div>`);
	});

	it('returns loading status of resource', async () => {
		let resolver: (options: { data: any[]; total: number }) => void;
		const promise = new Promise<{ data: any[]; total: number }>((resolve) => {
			resolver = resolve;
		});
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });

		const template = createResourceTemplate<{ hello: string }>({
			read: (options, { put }) => {
				return promise.then((res) => {
					put(res, options);
				});
			},
			find: defaultFind
		});

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions, isLoading } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const items = getOrRead(template, options({ size: 1, page: 1 }));
			const loading = isLoading(template, options({ size: 1, page: 1 }));
			if (loading) {
				return <div>Loading</div>;
			}
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
			return <Widget resource={resource({ template })} />;
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>Loading</div>`);
		resolver!({ data: [{ hello: 'world' }], total: 1 });
		await promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: 'world' }]])}</div>`);
	});

	it('returns failed status of resource', async () => {
		let rejector: () => void;
		let promise = new Promise<any>((_, reject) => {
			rejector = reject;
		});
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });

		const template = createResourceTemplate<{ hello: string }>({
			read: (options, { put }) => {
				const originalPromise = promise;
				promise = promise.then((res) => {
					put(res, options);
				});
				return originalPromise;
			},
			find: defaultFind
		});

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions, isLoading, isFailed } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const items = getOrRead(template, options({ size: 1, page: 1 }));
			const loading = isLoading(template, options({ size: 1, page: 1 }));
			const failed = isFailed(template, options({ size: 1, page: 1 }));
			if (loading) {
				return <div>Loading</div>;
			}
			if (failed) {
				return <div>Failed</div>;
			}
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
			return <Widget resource={resource({ template })} />;
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>Loading</div>`);
		rejector!();
		try {
			await promise;
			assert.fail('The promise should be rejected');
		} catch {
			resolvers.resolveRAF();
			assert.strictEqual(root.innerHTML, `<div>Failed</div>`);
		}
	});

	it('should be able to share resource options across between widgets', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);

		const WidgetOne = factory(({ properties, id, middleware: { resource } }) => {
			const { createOptions } = resource;
			const {
				resource: { options = createOptions(id) }
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
				resource: { template, options = createOptions(id) }
			} = properties();
			const items = getOrRead(template, options({ size: 1 }));
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ properties, id, middleware: { resource } }) => {
			const {
				resource: { template }
			} = properties();
			const { createOptions } = resource;
			const options = createOptions(id);
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
						template,
						initOptions: { id, data: [{ hello: 'world' }, { hello: 'world again' }] }
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: 'world' }]])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: 'world again' }]])}</div></div>`
		);
	});

	it('should be only destroy the resource once all subscribers have been removed', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>(), icache });
		const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { createOptions } = resource;
			const {
				resource: { options = createOptions(id) }
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
				resource: { template, options = createOptions(id) }
			} = properties();
			const items = getOrRead(template, options({ size: 1 }));
			return (
				<div>
					<div>{JSON.stringify(items)}</div>
					<button
						onclick={() => {
							options({ page: 3 });
						}}
					/>
				</div>
			);
		});

		const Parent = factory(function Parent({ id, properties, middleware: { resource, icache } }) {
			const { createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const show = icache.getOrSet<boolean>('show', true);
			return (
				<div>
					<button
						onclick={() => {
							icache.set('show', (value) => !value);
						}}
					/>
					{show && <WidgetOne resource={resource({ template, options })} />}
					{show && <WidgetTwo resource={resource({ template, options })} />}
					<WidgetTwo resource={resource({ template, options })} />
				</div>
			);
		});

		const App = create({ resource: createResourceMiddleware(), icache })(function App({
			id,
			middleware: { icache, resource }
		}) {
			const show = icache.getOrSet<boolean>('show', true);
			return (
				<div>
					{show && (
						<Parent
							resource={resource({
								template,
								initOptions: {
									id,
									data: [{ hello: 'world' }, { hello: 'world again' }, { hello: 'world the third' }]
								}
							})}
						/>
					)}
					<button
						onclick={() => {
							icache.set('show', (value) => !value);
						}}
					/>
				</div>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div><button></button><button></button><div><div>[[{"hello":"world"}]]</div><button></button></div><div><div>[[{"hello":"world"}]]</div><button></button></div></div><button></button></div>'
		);
		(root.children[0].children[0].children[1] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div><button></button><button></button><div><div>[[{"hello":"world again"}]]</div><button></button></div><div><div>[[{"hello":"world again"}]]</div><button></button></div></div><button></button></div>'
		);
		(root.children[0].children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div><button></button><div><div>[[{"hello":"world again"}]]</div><button></button></div></div><button></button></div>'
		);
		(root.children[0].children[0].children[1].children[1] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div><button></button><div><div>[[{"hello":"world the third"}]]</div><button></button></div></div><button></button></div>'
		);
		(root.children[0].children[1] as any).click();
		resolvers.resolveRAF();
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><button></button></div>');
	});

	it('should be able to share search query across widgets', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { createOptions } = resource;
			const {
				resource: { options = createOptions(id) }
			} = properties();
			return (
				<button
					onclick={() => {
						options({ ...options(), query: { hello: 'again' } });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ id, properties, middleware: { resource } }) => {
			const { createOptions, getOrRead } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const items = getOrRead(template, options({ size: 2 }));
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ id, properties, middleware: { resource } }) => {
			const { createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();

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
						template,
						initOptions: { id, data: [{ hello: 'world' }, { hello: 'world again' }] }
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: 'world' }, { hello: 'world again' }]])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: 'world again' }]])}</div></div>`
		);
	});

	it('should update the data in the resource', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
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
						<WidgetOne resource={resource({ template, initOptions: { id, data } })} />
					</div>
				);
			}
		);

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: 'world' }, { hello: 'moon' }]])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: 'mars' }, { hello: 'venus' }]])}</div></div>`
		);
	});

	it('should update the data in existing resources', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
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
						{show && <WidgetOne resource={resource({ template, initOptions: { id, data } })} />}
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
				[{ hello: 'world' }, { hello: 'moon' }]
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
				[{ hello: 'mars' }, { hello: 'venus' }]
			])}</div></div>`
		);
	});

	it('should be able to change the options for a resource', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);

		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const items = getOrRead(template, options());
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create({ icache, resource: createResourceMiddleware() })(
			({ id, middleware: { resource, icache } }) => {
				const { createOptions } = resource;
				const options = icache.getOrSet('options', () => {
					const options = createOptions('one');
					options({ size: 2 });
					return options;
				});
				const data = icache.getOrSet('data', [{ hello: 'world' }, { hello: 'moon' }]);
				return (
					<div>
						<button
							onclick={() => {
								icache.set('options', () => {
									const options = createOptions('two');
									options({ size: 1 });
									return options;
								});
							}}
						/>
						<WidgetOne resource={resource({ template, options, initOptions: { id, data } })} />
					</div>
				);
			}
		);

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: 'world' }, { hello: 'moon' }]])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: 'world' }]])}</div></div>`
		);
	});

	it('should be able to use a resource directly in a widget', () => {
		const template = createResourceTemplate<{ hello: string }>({
			read: (request, controls) => {
				controls.put({ data: [{ hello: 'world' }], total: 1 }, request);
			},
			find: defaultFind
		});
		const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
			const { createOptions, getOrRead, find } = resource;
			const options = createOptions('test');
			const [items] = getOrRead(template, options());
			const item = find(template, { start: 0, query: { hello: 'world' }, options: options() });

			return (
				<div>
					<div>{JSON.stringify(item)}</div>
					<div>{JSON.stringify(items)}</div>
				</div>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div>{"item":{"hello":"world"},"index":0,"page":1,"pageIndex":0}</div><div>[{"hello":"world"}]</div></div>'
		);
	});

	it('should be able to use a resource directly in a widget with init options', () => {
		const template = createResourceTemplate<{ hello: string }, { other: string; data: { hello: string }[] }>(
			memoryTemplate
		);
		const App = create({ icache, resource: createResourceMiddleware() })(({ middleware: { resource, icache } }) => {
			const { createOptions, getOrRead } = resource;
			const options = createOptions('test');
			const data = icache.getOrSet('data', [{ hello: 'template one' }]);
			const [templateOneItems] = getOrRead(template, options(), { id: 'one', other: 'random', data });
			const [templateTwoItems] = getOrRead(template, options(), {
				id: 'two',
				other: 'random',
				data: [{ hello: 'template two' }]
			});

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

	it('should destroy resources when widget is removed', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createResourceTemplate<{ hello: string }, { data: { hello: string }[] }>(memoryTemplate);
		let renderCount = 0;
		let callOptions: any;
		const WidgetOne = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			renderCount++;
			callOptions = options;
			options({ size: 2 });
			const items = getOrRead(template, options());
			return <div>{JSON.stringify(items)}</div>;
		});

		const WidgetTwo = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<WidgetOne
					resource={resource({
						template,
						initOptions: { id, data: [{ hello: 'world' }, { hello: 'moon' }] }
					})}
				/>
			);
		});

		const App = create({ icache })(({ middleware: { icache } }) => {
			const show = icache.getOrSet<boolean>('show', true);
			return (
				<div>
					<button
						onclick={() => {
							icache.set<boolean>('show', (value) => !value);
						}}
					/>
					{show && <WidgetTwo />}
				</div>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><button></button><div>[[{"hello":"world"},{"hello":"moon"}]]</div></div>'
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(renderCount, 1);
		assert.strictEqual(root.innerHTML, '<div><button></button></div>');
		callOptions({ pageNumber: 2, pageSize: 100, query: {} });
		resolvers.resolveRAF();
		assert.strictEqual(renderCount, 1);
		assert.strictEqual(root.innerHTML, '<div><button></button></div>');
	});

	it('should be able to request multiple pages that have not already been read', async () => {
		const promiseMap = new Map<number, any>();
		for (let i = 0; i < 5; i++) {
			let resolver: any;
			const promise = new Promise<{ data: any[]; total: number }>((resolve) => {
				resolver = resolve;
			});
			promiseMap.set(i, { i, promise, resolver });
		}

		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
		let counter = 0;

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions, isLoading } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const allItems = getOrRead(template, options({ size: 1, page: [1, 2, 3, 4, 5] }));
			if (isLoading(template, options())) {
				return (
					<div>
						<div>Loading</div>
						<div>{String(++counter)}</div>
					</div>
				);
			}
			return (
				<div>
					<div>{JSON.stringify(allItems)}</div>
					<div>{String(++counter)}</div>
				</div>
			);
		});

		const template = createResourceTemplate<{ value: string }>({
			read: (options, { put }) => {
				const payload = promiseMap.get(options.offset);
				if (payload) {
					const originalPromise = payload.promise;
					payload.promise = payload.promise.then((res: any) => {
						put(res, options);
					});
					return originalPromise;
				}
			},
			find: defaultFind
		});

		const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
			return <Widget resource={resource({ template })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(2)!.resolver({ data: [{ value: 'page 3' }], total: 5 });
		await promiseMap.get(2)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(0)!.resolver({ data: [{ value: 'page 1' }], total: 5 });
		await promiseMap.get(0)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(1)!.resolver({ data: [{ value: 'page 2' }], total: 5 });
		await promiseMap.get(1)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(4)!.resolver({ data: [{ value: 'page 5' }], total: 5 });
		await promiseMap.get(4)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(3)!.resolver({ data: [{ value: 'page 4' }], total: 5 });
		await promiseMap.get(3)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[[{"value":"page 1"}],[{"value":"page 2"}],[{"value":"page 3"}],[{"value":"page 4"}],[{"value":"page 5"}]]</div><div>2</div></div>'
		);
	});

	it('should transform data for multiple pages', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ value: string }>() });

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const items = getOrRead(template, options({ size: 5, page: [1, 2] }));
			if (items) {
				return (
					<div>
						<div>{JSON.stringify(items.flat())}</div>
					</div>
				);
			}
		});

		const template = createResourceTemplate<{ foo: string }, { data: { foo: string }[] }>(memoryTemplate);
		let data: { foo: string }[] = [];
		for (let i = 0; i < 20; i++) {
			data.push({ foo: `Item ${i}` });
		}

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return <Widget resource={resource({ template, transform: { value: 'foo' }, initOptions: { id, data } })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[{"value":"Item 0"},{"value":"Item 1"},{"value":"Item 2"},{"value":"Item 3"},{"value":"Item 4"},{"value":"Item 5"},{"value":"Item 6"},{"value":"Item 7"},{"value":"Item 8"},{"value":"Item 9"}]</div></div>'
		);
	});

	it('should be able bootstrap custom template', async () => {
		let resolver: any;
		let promise = new Promise<any>((resolve) => {
			resolver = resolve;
		});

		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
		let counter = 0;

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions, isLoading } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const allItems = getOrRead(template, options({ size: 2, page: [1, 2, 3] }));
			if (isLoading(template, options())) {
				return (
					<div>
						<div>Loading</div>
						<div>{String(++counter)}</div>
					</div>
				);
			}
			return (
				<div>
					<div>{JSON.stringify(allItems)}</div>
					<div>{String(++counter)}</div>
				</div>
			);
		});

		const template = createResourceTemplate<{ value: string }, { data: { value: string }[] }>({
			init: ({ data }, { put }) => {
				put({ data, total: data.length }, { offset: 0, size: 30, query: {} });
			},
			read: (options, { put }) => {
				let originalPromise = promise;
				promise = promise.then((res) => {
					put(res, options);
				});
				return originalPromise;
			},
			find: defaultFind
		});

		const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
			return (
				<Widget
					resource={resource({
						template,
						initOptions: {
							id,
							data: [
								{ value: 'page 1' },
								{ value: 'page 2' },
								{ value: 'page 3' },
								{ value: 'page 4' },
								{ value: 'page 5' }
							]
						}
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		resolver({ data: [{ value: 'page 5' }, { value: 'page 6' }], total: 6 });
		await promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[[{"value":"page 1"},{"value":"page 2"}],[{"value":"page 3"},{"value":"page 4"}],[{"value":"page 5"},{"value":"page 6"}]]</div><div>2</div></div>'
		);
	});

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
		const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
		let counter = 0;

		const Widget = factory(({ id, properties, middleware: { resource } }) => {
			const { getOrRead, createOptions, isLoading } = resource;
			const {
				resource: { template, options = createOptions(id) }
			} = properties();
			const allItems = getOrRead(template, options({ size: 1, page: [1, 2, 3, 4, 5] }));
			if (isLoading(template, options())) {
				return (
					<div>
						<div>Loading</div>
						<div>{String(++counter)}</div>
					</div>
				);
			}
			return (
				<div>
					<div>{JSON.stringify(allItems)}</div>
					<div>{String(++counter)}</div>
				</div>
			);
		});

		const template = createResourceTemplate<{ value: string }>({
			read: (options, { put }) => {
				const payload = promiseMap.get(options.offset);
				if (payload) {
					const originalPromise = payload.promise;
					payload.promise = payload.promise.then((res: any) => {
						put(res, options);
					});
					return originalPromise;
				}
			},
			find: defaultFind
		});

		const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
			return <Widget resource={resource({ template })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(2)!.resolver({ data: [{ value: 'page 3' }], total: 0 });
		await promiseMap.get(2)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(0)!.resolver({ data: [{ value: 'page 1' }], total: 0 });
		await promiseMap.get(0)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(1)!.resolver({ data: [{ value: 'page 2' }], total: 0 });
		await promiseMap.get(1)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(4)!.resolver({ data: [{ value: 'page 5' }], total: 0 });
		await promiseMap.get(4)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(3)!.resolver({ data: [{ value: 'page 4' }], total: 0 });
		await promiseMap.get(3)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[[{"value":"page 1"}],[{"value":"page 2"}],[{"value":"page 3"}],[{"value":"page 4"}],[{"value":"page 5"}]]</div><div>2</div></div>'
		);
	});
	describe('find', () => {
		it('should return undefined if the query does not match any items', () => {
			const root = document.createElement('div');
			const factory = create({ resource: createResourceMiddleware<{ value: string }>() });

			const Widget = factory(({ id, properties, middleware: { resource } }) => {
				const { createOptions, find } = resource;
				const {
					resource: { template, options = createOptions(id) }
				} = properties();
				const item = find(template, { options: options(), start: 0, query: { value: 'Unknown' } });
				return (
					<div>
						<div>{JSON.stringify(item)}</div>
					</div>
				);
			});

			const template = createResourceTemplate<{ foo: string }, { data: { foo: string }[] }>(memoryTemplate);
			let data: { foo: string }[] = [];
			for (let i = 0; i < 200; i++) {
				if (i % 10 === 0) {
					data.push({ foo: `Item Golden ${i}` });
				} else {
					data.push({ foo: `Item ${i}` });
				}
			}

			const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
				return (
					<Widget resource={resource({ template, transform: { value: 'foo' }, initOptions: { data, id } })} />
				);
			});

			const r = renderer(() => <App />);
			r.mount({ domNode: root });
			assert.strictEqual(root.innerHTML, '<div><div></div></div>');
		});
		it('should invalidate once an async find request has been completed', async () => {
			let resolver: (options: any) => void;
			const promise = new Promise<any>((resolve) => {
				resolver = resolve;
			});
			const template = createResourceTemplate<{ hello: string }>({
				find: async (options, { put }) => {
					const res = await promise;
					put(res, options);
				},
				read: (options, { put }) => {
					put({ data: [], total: 19 }, options);
				}
			});
			const factory = create({ resource: createResourceMiddleware<{ value: string }>() });

			const Widget = factory(({ id, properties, middleware: { resource } }) => {
				const { createOptions, find, isLoading } = resource;
				const {
					resource: { template, options = createOptions(id) }
				} = properties();
				const item = find(template, { options: options(), start: 0, query: { value: 'Unknown' } });
				if (isLoading(template, { options: options(), start: 0, query: { value: 'Unknown' } })) {
					return 'Loading';
				}
				return (
					<div>
						<div>{JSON.stringify(item)}</div>
					</div>
				);
			});

			let data: { foo: string }[] = [];
			for (let i = 0; i < 200; i++) {
				data.push({ foo: `Item ${i}` });
			}

			const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
				return <Widget resource={resource({ template, transform: { value: 'hello' } })} />;
			});

			const r = renderer(() => <App />);
			const root = document.createElement('div');
			r.mount({ domNode: root });
			assert.strictEqual(root.innerHTML, 'Loading');
			resolver!({ item: { hello: 'world' }, page: 1, index: 10, pageIndex: 10 });
			await promise;
			resolvers.resolveRAF();
			assert.strictEqual(
				root.innerHTML,
				'<div><div>{"item":{"value":"world"},"page":1,"index":10,"pageIndex":10}</div></div>'
			);
		});

		it('should only try and filter against known items', () => {
			const data: any = {};
			for (let i = 0; i < 200; i++) {
				const page = Math.floor(i / 30) + 1;
				const item = { value: `Item ${i}` };
				const pageData = data[page] || [];
				pageData.push(item);
				data[page] = pageData;
			}
			const template = createResourceTemplate<{ value: string }>({
				find: defaultFind,
				read: (request, { put }) => {
					const { offset, size } = request;
					const page = Math.floor(offset / size) + 1;
					const pageData = data[page];
					put({ data: pageData, total: 200 }, request);
				}
			});
			const factory = create({ icache, resource: createResourceMiddleware<{ value: string }>() });

			const Widget = factory(({ id, properties, middleware: { icache, resource } }) => {
				const searchTerm = icache.getOrSet('search', 'Item 65');
				const { createOptions, find, getOrRead } = resource;
				const {
					resource: { template, options = createOptions(id) }
				} = properties();
				getOrRead(template, options({ page: 1 }));
				getOrRead(template, options({ page: 2 }));
				getOrRead(template, options({ page: 3 }));
				const item = find(template, {
					options: options(),
					start: 60,
					type: 'exact',
					query: { value: searchTerm }
				});
				return (
					<div>
						<button
							onclick={() => {
								icache.set('search', 'Item 1');
							}}
						/>
						<div>{JSON.stringify(item)}</div>
					</div>
				);
			});

			const App = create({ resource: createResourceMiddleware() })(({ middleware: { resource } }) => {
				return <Widget resource={resource({ template })} />;
			});

			const r = renderer(() => <App />);
			const root = document.createElement('div');
			r.mount({ domNode: root });
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>{"item":{"value":"Item 65"},"index":65,"page":3,"pageIndex":5}</div></div>'
			);
			(root.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>{"item":{"value":"Item 1"},"index":1,"page":1,"pageIndex":1}</div></div>'
			);
		});

		describe('contains (default)', () => {
			it('Should find the first matching item', () => {
				const root = document.createElement('div');
				const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
				const Widget = factory(({ id, properties, middleware: { resource } }) => {
					const { createOptions, find } = resource;
					const {
						resource: { template, options = createOptions(id) }
					} = properties();
					const item = find(template, { options: options(), start: 0, query: { value: 'Golden' } });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});
				const template = createResourceTemplate<{ foo: string }, { data: { foo: string }[] }>(memoryTemplate);
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					if (i % 10 === 0) {
						data.push({ foo: `Item Golden ${i}` });
					} else {
						data.push({ foo: `Item ${i}` });
					}
				}
				const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
					return (
						<Widget
							resource={resource({ template, transform: { value: 'foo' }, initOptions: { id, data } })}
						/>
					);
				});
				const r = renderer(() => <App />);
				r.mount({ domNode: root });
				assert.strictEqual(
					root.innerHTML,
					'<div><div>{"item":{"value":"Item Golden 0"},"index":0,"page":1,"pageIndex":0}</div></div>'
				);
			});
			it('Should find the next matching item using the start index', () => {
				const root = document.createElement('div');
				const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
				const Widget = factory(({ id, properties, middleware: { resource } }) => {
					const { createOptions, find } = resource;
					const {
						resource: { template, options = createOptions(id) }
					} = properties();
					const item = find(template, { options: options(), start: 95, query: { value: 'Golden' } });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});
				const template = createResourceTemplate<{ foo: string }, { data: { foo: string }[] }>(memoryTemplate);
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					if (i % 10 === 0) {
						data.push({ foo: `Item Golden ${i}` });
					} else {
						data.push({ foo: `Item ${i}` });
					}
				}
				const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
					return (
						<Widget
							resource={resource({ template, transform: { value: 'foo' }, initOptions: { id, data } })}
						/>
					);
				});
				const r = renderer(() => <App />);
				r.mount({ domNode: root });
				assert.strictEqual(
					root.innerHTML,
					'<div><div>{"item":{"value":"Item Golden 100"},"index":100,"page":4,"pageIndex":10}</div></div>'
				);
			});
		});
		describe('start', () => {
			it('Should find the first matching item', () => {
				const root = document.createElement('div');
				const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
				const Widget = factory(({ id, properties, middleware: { resource } }) => {
					const { createOptions, find } = resource;
					const {
						resource: { template, options = createOptions(id) }
					} = properties();
					const item = find(template, { options: options(), start: 0, query: { value: '2' }, type: 'start' });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});
				const template = createResourceTemplate<{ foo: string }, { data: { foo: string }[] }>(memoryTemplate);
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					data.push({ foo: `${i} Item` });
				}
				const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
					return (
						<Widget
							resource={resource({ template, transform: { value: 'foo' }, initOptions: { id, data } })}
						/>
					);
				});
				const r = renderer(() => <App />);
				r.mount({ domNode: root });
				assert.strictEqual(
					root.innerHTML,
					'<div><div>{"item":{"value":"2 Item"},"index":2,"page":1,"pageIndex":2}</div></div>'
				);
			});
			it('Should find the next matching item using the start index', () => {
				const root = document.createElement('div');
				const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
				const Widget = factory(({ id, properties, middleware: { resource } }) => {
					const { createOptions, find } = resource;
					const {
						resource: { template, options = createOptions(id) }
					} = properties();
					const item = find(template, {
						options: options(),
						start: 95,
						query: { value: '2' },
						type: 'start'
					});
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});
				const template = createResourceTemplate<{ foo: string }, { data: { foo: string }[] }>(memoryTemplate);
				let data: { foo: string }[] = [];
				for (let i = 0; i < 201; i++) {
					data.push({ foo: `${i} Item` });
				}
				const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
					return (
						<Widget
							resource={resource({ template, transform: { value: 'foo' }, initOptions: { id, data } })}
						/>
					);
				});
				const r = renderer(() => <App />);
				r.mount({ domNode: root });
				assert.strictEqual(
					root.innerHTML,
					'<div><div>{"item":{"value":"200 Item"},"index":200,"page":7,"pageIndex":20}</div></div>'
				);
			});
		});
		describe('exact', () => {
			it('Should find the first matching item', () => {
				const root = document.createElement('div');
				const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
				const Widget = factory(({ id, properties, middleware: { resource } }) => {
					const { createOptions, find } = resource;
					const {
						resource: { template, options = createOptions(id) }
					} = properties();
					const item = find(template, {
						options: options(),
						start: 0,
						query: { value: 'Item Golden 20' },
						type: 'exact'
					});
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});
				const template = createResourceTemplate<{ foo: string }, { data: { foo: string }[] }>(memoryTemplate);
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					if (i % 10 === 0) {
						data.push({ foo: `Item Golden ${i}` });
					} else {
						data.push({ foo: `Item ${i}` });
					}
				}
				const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
					return (
						<Widget
							resource={resource({ template, transform: { value: 'foo' }, initOptions: { id, data } })}
						/>
					);
				});
				const r = renderer(() => <App />);
				r.mount({ domNode: root });
				assert.strictEqual(
					root.innerHTML,
					'<div><div>{"item":{"value":"Item Golden 20"},"index":20,"page":1,"pageIndex":20}</div></div>'
				);
			});
			it('Should find the next matching item using the start index', () => {
				const root = document.createElement('div');
				const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
				const Widget = factory(({ id, properties, middleware: { resource } }) => {
					const { createOptions, find } = resource;
					const {
						resource: { template, options = createOptions(id) }
					} = properties();
					const item = find(template, {
						options: options(),
						start: 95,
						query: { value: 'Item Golden 90' },
						type: 'exact'
					});
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});
				const template = createResourceTemplate<{ foo: string }, { data: { foo: string }[] }>(memoryTemplate);
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					if (i % 10 === 0) {
						data.push({ foo: `Item Golden ${i}` });
					} else {
						data.push({ foo: `Item ${i}` });
					}
				}
				const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
					return (
						<Widget
							resource={resource({ template, transform: { value: 'foo' }, initOptions: { id, data } })}
						/>
					);
				});
				const r = renderer(() => <App />);
				r.mount({ domNode: root });
				assert.strictEqual(
					root.innerHTML,
					'<div><div>{"item":{"value":"Item Golden 90"},"index":90,"page":4,"pageIndex":0}</div></div>'
				);
			});
		});
	});
});
