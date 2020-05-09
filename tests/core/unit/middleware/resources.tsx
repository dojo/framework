const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { renderer, tsx, create } from '../../../../src/core/vdom';
import { createResolvers } from '../../support/util';
import {
	createMemoryResourceTemplate,
	createResourceTemplate,
	createResourceMiddleware
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

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			return <div>{JSON.stringify(getOrRead(options()))}</div>;
		});

		const memoryTemplate = createMemoryResourceTemplate<{ hello: string }>();

		const App = create()(() => {
			return <Widget resource={memoryTemplate({ data: [{ hello: '1' }] })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: '1' }]])}</div>`);
	});

	it('should update when options called', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });

		let set: any;
		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			set = options;
			options({ size: 1 });
			return <div>{JSON.stringify(getOrRead(options()))}</div>;
		});

		const template = createMemoryResourceTemplate<{ hello: string }>();

		const App = create()(() => {
			return <Widget resource={template({ data: [{ hello: '1' }, { hello: '2' }] })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: '1' }]])}</div>`);
		set({ page: 2 });
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([[{ hello: '2' }]])}</div>`);
	});

	it('should transform data with getOrRead', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options, meta } = resource();
			const items = getOrRead(options({ page: 1, size: 1 }));
			const metaInfo = meta(options());
			return (
				<div>
					<div>{JSON.stringify(items)}</div>
					<div>{`${metaInfo!.total}`}</div>
				</div>
			);
		});

		const template = createMemoryResourceTemplate<{ wrong: string }>();

		const App = create()(() => {
			return (
				<Widget
					resource={template({ transform: { hello: 'wrong' }, data: [{ wrong: '1' }, { wrong: '2' }] })}
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
		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			options({ query: { hello: '2', foo: '1' } });
			return <div>{JSON.stringify(getOrRead(options()))}</div>;
		});

		const memoryTemplate = createMemoryResourceTemplate<{ wrong: string; foo: string }>();

		const App = create()(() => {
			return (
				<Widget
					resource={memoryTemplate({
						transform: { hello: 'wrong' },
						data: [{ wrong: '1', foo: '1' }, { wrong: '2', foo: '1' }, { wrong: '2', foo: '2' }]
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
		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			return <div>{JSON.stringify(getOrRead(options({ query: { age: 10 } })))}</div>;
		});

		const memoryTemplate = createMemoryResourceTemplate<{ age: number }>();

		const App = create()(() => {
			return (
				<Widget
					resource={memoryTemplate({
						data: [{ age: 10 }, { age: 100 }, { age: 99 }]
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

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			options({ size: 1 });
			return <div>{JSON.stringify(getOrRead(options()))}</div>;
		});

		const template = createMemoryResourceTemplate<{ wrong: number }>();

		const App = create()(() => {
			return (
				<Widget resource={template({ transform: { hello: 'wrong' }, data: [{ wrong: 1 }, { wrong: 2 }] })} />
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
			}
		});

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, isLoading, options } = resource();
			const items = getOrRead(options({ size: 1, page: 1 }));
			const loading = isLoading(options({ size: 1, page: 1 }));
			if (loading) {
				return <div>Loading</div>;
			}
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create()(() => {
			return <Widget resource={template()} />;
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
		const promise = new Promise<{ data: any[]; total: number }>((_, reject) => {
			rejector = reject;
		});
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });

		const template = createResourceTemplate<{ hello: string }>({
			read: (options, { put }) => {
				return promise.then((res) => {
					put(res, options);
				});
			}
		});

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, isLoading, isFailed, options } = resource();
			const items = getOrRead(options({ size: 1, page: 1 }));
			const loading = isLoading(options({ size: 1, page: 1 }));
			const failed = isFailed(options({ size: 1, page: 1 }));
			if (loading) {
				return <div>Loading</div>;
			}
			if (failed) {
				return <div>Failed</div>;
			}
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create()(() => {
			return <Widget resource={template()} />;
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

	it('should be able to share basic resource across between widgets', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createMemoryResourceTemplate<{ hello: string }>();

		const WidgetOne = factory(({ middleware: { resource } }) => {
			const { options } = resource();
			return (
				<button
					onclick={() => {
						options({ page: 2 });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			options({ size: 1 });
			const items = getOrRead(options());
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ middleware: { resource } }) => {
			const { shared } = resource();
			return (
				<div>
					<WidgetOne resource={shared()} />
					<WidgetTwo resource={shared()} />
				</div>
			);
		});

		const App = create()(() => {
			return <Parent resource={template({ data: [{ hello: 'world' }, { hello: 'world again' }] })} />;
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

	it('should be force unique instance of resource when using reset', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createMemoryResourceTemplate<{ hello: string }>();

		const WidgetOne = factory(({ middleware: { resource } }) => {
			const { options } = resource();
			return (
				<button
					onclick={() => {
						options({ ...options(), page: 2 });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource({ reset: true });
			options({ size: 1 });
			const items = getOrRead(options());
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ middleware: { resource } }) => {
			const { shared } = resource();
			return (
				<div>
					<WidgetOne resource={shared()} />
					<WidgetTwo resource={shared()} />
				</div>
			);
		});

		const App = create()(() => {
			return <Parent resource={template({ data: [{ hello: 'world' }, { hello: 'world again' }] })} />;
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
			`<div><button></button><div>${JSON.stringify([[{ hello: 'world' }]])}</div></div>`
		);
	});

	it('should be able to share search query across widgets', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createMemoryResourceTemplate<{ hello: string }>();

		const WidgetOne = factory(({ middleware: { resource } }) => {
			const { options } = resource();
			return (
				<button
					onclick={() => {
						options({ ...options(), query: { hello: 'again' } });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			const { page = 1, size = 2, query = {} } = options();
			options({ page, size, query });
			const items = getOrRead(options());
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ middleware: { resource } }) => {
			const { shared } = resource();

			return (
				<div>
					<WidgetOne resource={shared()} />
					<WidgetTwo resource={shared()} />
				</div>
			);
		});

		const App = create()(() => {
			return <Parent resource={template({ data: [{ hello: 'world' }, { hello: 'world again' }] })} />;
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
		const template = createMemoryResourceTemplate<{ hello: string }>();

		const WidgetOne = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			options({ size: 2 });
			const items = getOrRead(options());
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create({ icache })(({ middleware: { icache } }) => {
			const data = icache.getOrSet('data', [{ hello: 'world' }, { hello: 'moon' }]);
			return (
				<div>
					<button
						onclick={() => {
							icache.set('data', [{ hello: 'mars' }, { hello: 'venus' }]);
						}}
					/>
					<WidgetOne resource={template({ data })} />
				</div>
			);
		});

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

	it('should destroy resources when widget is removed', () => {
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const template = createMemoryResourceTemplate<{ hello: string }>();
		let renderCount = 0;
		let callOptions: any;
		const WidgetOne = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			renderCount++;
			callOptions = options;
			options({ size: 2 });
			const items = getOrRead(options());
			return <div>{JSON.stringify(items)}</div>;
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
					{show && <WidgetOne resource={template({ data: [{ hello: 'world' }, { hello: 'moon' }] })} />}
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

	it('should support an override template', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ hello: string }>() });
		const overrideTemplate = createMemoryResourceTemplate<{ boo: string }>();

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			const { getOrRead: customGetOrRead, options: customOptions } = resource({
				override: {
					resource: overrideTemplate({ transform: { hello: 'boo' }, data: [{ boo: '2' }] }),
					key: 'hello'
				}
			});
			return (
				<div>
					<div>{JSON.stringify(getOrRead(options()))}</div>
					<div>{JSON.stringify(customGetOrRead(customOptions()))}</div>
				</div>
			);
		});

		const memoryTemplate = createMemoryResourceTemplate<{ hello: string }>();

		const App = create()(() => {
			return <Widget resource={memoryTemplate({ data: [{ hello: '1' }] })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><div>${JSON.stringify([[{ hello: '1' }]])}</div><div>${JSON.stringify([
				[{ hello: '2' }]
			])}</div></div>`
		);
	});

	it('should support changing data for an override template', () => {
		const root = document.createElement('div');
		const factory = create({ icache, resource: createResourceMiddleware<{ hello: string }>() });
		const overrideTemplate = createMemoryResourceTemplate<{ boo: string }>();

		const Widget = factory(({ middleware: { icache, resource } }) => {
			const data = icache.getOrSet('data', [{ boo: 'world' }, { boo: 'moon' }]);
			const { getOrRead, options } = resource();
			const { getOrRead: customGetOrRead, options: customOptions } = resource({
				override: {
					resource: overrideTemplate({ transform: { hello: 'boo' }, data }),
					key: 'hello'
				}
			});
			return (
				<div>
					<button
						onclick={() => {
							icache.set('data', [{ boo: 'mars' }, { boo: 'venus' }]);
						}}
					/>
					<div>{JSON.stringify(getOrRead(options()))}</div>
					<div>{JSON.stringify(customGetOrRead(customOptions()))}</div>
				</div>
			);
		});

		const memoryTemplate = createMemoryResourceTemplate<{ hello: string }>();

		const App = create()(() => {
			return <Widget resource={memoryTemplate({ data: [{ hello: '1' }] })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: '1' }]])}</div><div>${JSON.stringify([
				[{ hello: 'world' }, { hello: 'moon' }]
			])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolve();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([[{ hello: '1' }]])}</div><div>${JSON.stringify([
				[{ hello: 'mars' }, { hello: 'venus' }]
			])}</div></div>`
		);
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

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options, isLoading } = resource();
			const allItems = getOrRead(options({ size: 1, page: [1, 2, 3, 4, 5] }));
			if (isLoading(options())) {
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

		const memoryTemplate = createResourceTemplate<{ value: string }>({
			read: (options, { put }) => {
				const payload = promiseMap.get(options.offset);
				if (payload) {
					return payload.promise.then((res: any) => {
						put(res, options);
					});
				}
			}
		});

		const App = create()(() => {
			return <Widget resource={memoryTemplate()} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(2)!.resolver({ data: [{ value: 'page 3' }], total: 5 });
		await promiseMap.get(2)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>2</div></div>');
		promiseMap.get(0)!.resolver({ data: [{ value: 'page 1' }], total: 5 });
		await promiseMap.get(0)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>3</div></div>');
		promiseMap.get(1)!.resolver({ data: [{ value: 'page 2' }], total: 5 });
		await promiseMap.get(1)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>4</div></div>');
		promiseMap.get(4)!.resolver({ data: [{ value: 'page 5' }], total: 5 });
		await promiseMap.get(4)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>5</div></div>');
		promiseMap.get(3)!.resolver({ data: [{ value: 'page 4' }], total: 5 });
		await promiseMap.get(3)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[[{"value":"page 1"}],[{"value":"page 2"}],[{"value":"page 3"}],[{"value":"page 4"}],[{"value":"page 5"}]]</div><div>6</div></div>'
		);
	});

	it('should transform data for multiple pages', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ value: string }>() });

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			const items = getOrRead(options({ size: 5, page: [1, 2] }));
			if (items) {
				return (
					<div>
						<div>{JSON.stringify(items.flat())}</div>
					</div>
				);
			}
		});

		const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
		let data: { foo: string }[] = [];
		for (let i = 0; i < 20; i++) {
			data.push({ foo: `Item ${i}` });
		}

		const App = create()(() => {
			return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[{"value":"Item 0"},{"value":"Item 1"},{"value":"Item 2"},{"value":"Item 3"},{"value":"Item 4"},{"value":"Item 5"},{"value":"Item 6"},{"value":"Item 7"},{"value":"Item 8"},{"value":"Item 9"}]</div></div>'
		);
	});

	it('can pass a resource wrapper to a widget', () => {
		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ value: string }>() });

		const Child = factory(({ middleware: { resource } }) => {
			const { getOrRead, options } = resource();
			const items = getOrRead(options({ size: 5, page: 2 }));
			if (items) {
				return (
					<div>
						<div>{JSON.stringify(items.flat())}</div>
					</div>
				);
			}
		});

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options, resource: myResource } = resource();
			const items = getOrRead(options({ size: 5, page: 1 }));
			if (items) {
				return (
					<div>
						<div>{JSON.stringify(items.flat())}</div>
						<Child resource={myResource} />
					</div>
				);
			}
		});

		const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
		let data: { foo: string }[] = [];
		for (let i = 0; i < 20; i++) {
			data.push({ foo: `Item ${i}` });
		}

		const App = create()(() => {
			return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[{"value":"Item 0"},{"value":"Item 1"},{"value":"Item 2"},{"value":"Item 3"},{"value":"Item 4"}]</div><div><div>[{"value":"Item 5"},{"value":"Item 6"},{"value":"Item 7"},{"value":"Item 8"},{"value":"Item 9"}]</div></div></div>'
		);
	});

	it('should be able bootstrap custom template', async () => {
		let resolver: any;
		const promise = new Promise<{ data: any[]; total: number }>((resolve) => {
			resolver = resolve;
		});

		const root = document.createElement('div');
		const factory = create({ resource: createResourceMiddleware<{ value: string }>() });
		let counter = 0;

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options, isLoading } = resource();
			const allItems = getOrRead(options({ size: 2, page: [1, 2, 3] }));
			if (isLoading(options())) {
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

		const memoryTemplate = createResourceTemplate<{ value: string }>({
			init: (data, { put }) => {
				put({ data, total: data.length }, { offset: 0, size: 30, query: {} });
			},
			read: (options, { put }) => {
				return promise.then((res) => {
					put(res, options);
				});
			}
		});

		const App = create()(() => {
			return (
				<Widget
					resource={memoryTemplate({
						data: [
							{ value: 'page 1' },
							{ value: 'page 2' },
							{ value: 'page 3' },
							{ value: 'page 4' },
							{ value: 'page 5' }
						]
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

		const Widget = factory(({ middleware: { resource } }) => {
			const { getOrRead, options, isLoading } = resource();
			const allItems = getOrRead(options({ size: 1, page: [1, 2, 3, 4, 5] }));
			if (isLoading(options())) {
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

		const memoryTemplate = createResourceTemplate<{ value: string }>({
			read: (options, { put }) => {
				const payload = promiseMap.get(options.offset);
				if (payload) {
					return payload.promise.then((res: any) => {
						put(res, options);
					});
				}
			}
		});

		const App = create()(() => {
			return <Widget resource={memoryTemplate()} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>1</div></div>');
		promiseMap.get(2)!.resolver({ data: [{ value: 'page 3' }], total: 0 });
		await promiseMap.get(2)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>2</div></div>');
		promiseMap.get(0)!.resolver({ data: [{ value: 'page 1' }], total: 0 });
		await promiseMap.get(0)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>3</div></div>');
		promiseMap.get(1)!.resolver({ data: [{ value: 'page 2' }], total: 0 });
		await promiseMap.get(1)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>4</div></div>');
		promiseMap.get(4)!.resolver({ data: [{ value: 'page 5' }], total: 0 });
		await promiseMap.get(4)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, '<div><div>Loading</div><div>5</div></div>');
		promiseMap.get(3)!.resolver({ data: [{ value: 'page 4' }], total: 0 });
		await promiseMap.get(3)!.promise;
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			'<div><div>[[{"value":"page 1"}],[{"value":"page 2"}],[{"value":"page 3"}],[{"value":"page 4"}],[{"value":"page 5"}]]</div><div>6</div></div>'
		);
	});
	describe('find', () => {
		it('should return undefined if the query does not match any items', () => {
			const root = document.createElement('div');
			const factory = create({ resource: createResourceMiddleware<{ value: string }>() });

			const Widget = factory(({ middleware: { resource } }) => {
				const { find, options } = resource();
				const item = find(options(), { start: 0, query: { value: 'Unknown' } });
				return (
					<div>
						<div>{JSON.stringify(item)}</div>
					</div>
				);
			});

			const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
			let data: { foo: string }[] = [];
			for (let i = 0; i < 200; i++) {
				if (i % 10 === 0) {
					data.push({ foo: `Item Golden ${i}` });
				} else {
					data.push({ foo: `Item ${i}` });
				}
			}

			const App = create()(() => {
				return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
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
				find: () => {
					return promise;
				},
				read: (options, { put }) => {
					put({ data: [], total: 19 }, options);
				}
			});
			const factory = create({ resource: createResourceMiddleware<{ value: string }>() });

			const Widget = factory(({ middleware: { resource } }) => {
				const { find, options, isLoading } = resource();
				let item = find(options(), { start: 0, query: { value: 'Unknown' } });
				item = find(options(), { start: 0, query: { value: 'Unknown' } });
				if (isLoading(options(), { start: 0, query: { value: 'Unknown' } })) {
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

			const App = create()(() => {
				return <Widget resource={template({ transform: { value: 'hello' } })} />;
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
		describe('contains (default)', () => {
			it('Should find the first matching item', () => {
				const root = document.createElement('div');
				const factory = create({ resource: createResourceMiddleware<{ value: string }>() });

				const Widget = factory(({ middleware: { resource } }) => {
					const { find, options } = resource();
					const item = find(options(), { start: 0, query: { value: 'Golden' } });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});

				const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					if (i % 10 === 0) {
						data.push({ foo: `Item Golden ${i}` });
					} else {
						data.push({ foo: `Item ${i}` });
					}
				}

				const App = create()(() => {
					return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
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

				const Widget = factory(({ middleware: { resource } }) => {
					const { find, options } = resource();
					const item = find(options(), { start: 95, query: { value: 'Golden' } });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});

				const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					if (i % 10 === 0) {
						data.push({ foo: `Item Golden ${i}` });
					} else {
						data.push({ foo: `Item ${i}` });
					}
				}

				const App = create()(() => {
					return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
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

				const Widget = factory(({ middleware: { resource } }) => {
					const { find, options } = resource();
					const item = find(options(), { start: 0, query: { value: '2' }, type: 'start' });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});

				const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					data.push({ foo: `${i} Item` });
				}

				const App = create()(() => {
					return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
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

				const Widget = factory(({ middleware: { resource } }) => {
					const { find, options } = resource();
					const item = find(options(), { start: 95, query: { value: '2' }, type: 'start' });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});

				const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
				let data: { foo: string }[] = [];
				for (let i = 0; i < 201; i++) {
					data.push({ foo: `${i} Item` });
				}

				const App = create()(() => {
					return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
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

				const Widget = factory(({ middleware: { resource } }) => {
					const { find, options } = resource();
					const item = find(options(), { start: 0, query: { value: 'Item Golden 20' }, type: 'exact' });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});

				const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					if (i % 10 === 0) {
						data.push({ foo: `Item Golden ${i}` });
					} else {
						data.push({ foo: `Item ${i}` });
					}
				}

				const App = create()(() => {
					return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
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

				const Widget = factory(({ middleware: { resource } }) => {
					const { find, options } = resource();
					const item = find(options(), { start: 95, query: { value: 'Item Golden 90' }, type: 'exact' });
					if (item) {
						return (
							<div>
								<div>{JSON.stringify(item)}</div>
							</div>
						);
					}
				});

				const memoryTemplate = createMemoryResourceTemplate<{ foo: string }>();
				let data: { foo: string }[] = [];
				for (let i = 0; i < 200; i++) {
					if (i % 10 === 0) {
						data.push({ foo: `Item Golden ${i}` });
					} else {
						data.push({ foo: `Item ${i}` });
					}
				}

				const App = create()(() => {
					return <Widget resource={memoryTemplate({ transform: { value: 'foo' }, data })} />;
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
