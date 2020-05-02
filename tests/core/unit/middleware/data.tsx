const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { renderer, tsx, create } from '../../../../src/core/vdom';
import { createDataMiddleware } from '../../../../src/core/middleware/data';
import { createResolvers } from '../../support/util';
import { createResource, createMemoryTemplate, defaultFilter } from '../../../../src/core/resource';
import icache from '../../../../src/core/middleware/icache';

const resolvers = createResolvers();

jsdomDescribe('data middleware', () => {
	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
	});

	it('get with options', () => {
		const root = document.createElement('div');
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });

		const Widget = factory(({ middleware: { data } }) => {
			const { get, getOptions } = data();
			return <div>{JSON.stringify(get(getOptions()))}</div>;
		});

		const resource = createResource<{ hello: string }>();

		const App = create()(() => {
			return <Widget resource={resource({ data: [{ hello: '1' }] })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: '1' }])}</div>`);
	});

	it('should update when setOptions called', () => {
		const root = document.createElement('div');
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });

		let set: any;
		const Widget = factory(({ middleware: { data } }) => {
			const { get, getOptions, setOptions } = data();
			set = setOptions;
			const { pageSize = 1, pageNumber = 1 } = getOptions();
			setOptions({ pageSize, pageNumber });
			return <div>{JSON.stringify(get(getOptions()))}</div>;
		});

		const resource = createResource<{ hello: string }>();

		const App = create()(() => {
			return <Widget resource={resource({ data: [{ hello: '1' }, { hello: '2' }] })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: '1' }])}</div>`);
		set({ pageNumber: 2 });
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: '2' }])}</div>`);
	});

	it('should transform data', () => {
		const root = document.createElement('div');
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });
		const Widget = factory(({ middleware: { data } }) => {
			const { get, getOptions, setOptions, getTotal } = data();
			const { pageSize = 1, pageNumber = 1 } = getOptions();
			setOptions({ pageSize, pageNumber });
			return (
				<div>
					<div>{JSON.stringify(get(getOptions()))}</div>
					<div>{`${getTotal(getOptions())}`}</div>
				</div>
			);
		});

		const resource = createResource<{ wrong: string }>();

		const App = create()(() => {
			return (
				<Widget
					resource={resource({ transform: { hello: 'wrong' }, data: [{ wrong: '1' }, { wrong: '2' }] })}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div><div>${JSON.stringify([{ hello: '1' }])}</div><div>2</div></div>`);
	});

	it('should by able to filter with transformed data', () => {
		const root = document.createElement('div');
		const factory = create({ data: createDataMiddleware<{ hello: string; foo?: string }>() });
		const Widget = factory(({ middleware: { data } }) => {
			const { getOrRead, getOptions, setOptions } = data();
			const {
				query: {}
			} = getOptions();
			setOptions({ ...getOptions(), query: { hello: '2', foo: '1' } });
			return <div>{JSON.stringify(getOrRead(getOptions()))}</div>;
		});

		const resource = createResource<{ wrong: string; foo: string }>(
			createMemoryTemplate({ filter: defaultFilter })
		);

		const App = create()(() => {
			return (
				<Widget
					resource={resource({
						transform: { hello: 'wrong' },
						data: [{ wrong: '1', foo: '1' }, { wrong: '2', foo: '1' }, { wrong: '2', foo: '2' }]
					})}
				/>
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: '2', foo: '1' }])}</div>`);
	});

	it('should not convert fields into strings when using a transform', () => {
		const root = document.createElement('div');
		const factory = create({ data: createDataMiddleware<{ hello: number }>() });

		const Widget = factory(({ middleware: { data } }) => {
			const { getOrRead, getOptions, setOptions } = data();
			const { pageSize = 1, pageNumber = 1 } = getOptions();
			setOptions({ pageSize, pageNumber });
			return <div>{JSON.stringify(getOrRead(getOptions()))}</div>;
		});

		const resource = createResource<{ wrong: number }>();

		const App = create()(() => {
			return (
				<Widget resource={resource({ transform: { hello: 'wrong' }, data: [{ wrong: 1 }, { wrong: 2 }] })} />
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: 1 }])}</div>`);
	});

	it('returns loading status of resource', async () => {
		let resolver: (options: { data: any[]; total: number }) => void;
		const promise = new Promise<{ data: any[]; total: number }>((resolve) => {
			resolver = resolve;
		});
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });

		const resource = createResource<{ hello: string }>({
			read: () => {
				return promise;
			}
		});

		const Widget = factory(({ middleware: { data } }) => {
			const { getOrRead, isLoading } = data();
			const items = getOrRead({ pageSize: 1, pageNumber: 1 });
			const loading = isLoading({ pageSize: 1, pageNumber: 1 });
			if (loading) {
				return <div>Loading</div>;
			}
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create()(() => {
			return <Widget resource={resource()} />;
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>Loading</div>`);
		resolver!({ data: [{ hello: 'world' }], total: 1 });
		await promise;
		resolvers.resolveRAF();
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: 'world' }])}</div>`);
	});

	it('returns failed status of resource', async () => {
		let rejector: () => void;
		const promise = new Promise<{ data: any[]; total: number }>((_, reject) => {
			rejector = reject;
		});
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });

		const resource = createResource<{ hello: string }>({
			read: () => {
				return promise;
			}
		});

		const Widget = factory(({ middleware: { data } }) => {
			const { getOrRead, isLoading, isFailed } = data();
			const items = getOrRead({ pageSize: 1, pageNumber: 1 });
			const loading = isLoading({ pageSize: 1, pageNumber: 1 });
			const failed = isFailed({ pageSize: 1, pageNumber: 1 });
			if (loading) {
				return <div>Loading</div>;
			}
			if (failed) {
				return <div>Failed</div>;
			}
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create()(() => {
			return <Widget resource={resource()} />;
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
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });
		const resource = createResource<{ hello: string }>();

		const WidgetOne = factory(({ middleware: { data } }) => {
			const { setOptions, getOptions } = data();
			return (
				<button
					onclick={() => {
						setOptions({ ...getOptions(), pageNumber: 2 });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ middleware: { data } }) => {
			const { getOrRead, setOptions, getOptions } = data();
			const { pageNumber = 1, pageSize = 1 } = getOptions();
			setOptions({ pageNumber, pageSize });
			const items = getOrRead(getOptions());
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ middleware: { data } }) => {
			const { shared } = data();
			return (
				<div>
					<WidgetOne resource={shared()} />
					<WidgetTwo resource={shared()} />
				</div>
			);
		});

		const App = create()(() => {
			return <Parent resource={resource({ data: [{ hello: 'world' }, { hello: 'world again' }] })} />;
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

	it('should be force unique instance of resource when using reset', () => {
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });
		const resource = createResource<{ hello: string }>();

		const WidgetOne = factory(({ middleware: { data } }) => {
			const { setOptions, getOptions } = data();
			return (
				<button
					onclick={() => {
						setOptions({ ...getOptions(), pageNumber: 2 });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ middleware: { data } }) => {
			const { getOrRead, setOptions, getOptions } = data({ reset: true });
			const { pageNumber = 1, pageSize = 1 } = getOptions();
			setOptions({ pageNumber, pageSize });
			const items = getOrRead(getOptions());
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ middleware: { data } }) => {
			const { shared } = data();
			return (
				<div>
					<WidgetOne resource={shared()} />
					<WidgetTwo resource={shared()} />
				</div>
			);
		});

		const App = create()(() => {
			return <Parent resource={resource({ data: [{ hello: 'world' }, { hello: 'world again' }] })} />;
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
			`<div><button></button><div>${JSON.stringify([{ hello: 'world' }])}</div></div>`
		);
	});

	it('should be able to share search query across widgets', () => {
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });
		const resource = createResource<{ hello: string }>(createMemoryTemplate({ filter: defaultFilter }));

		const WidgetOne = factory(({ middleware: { data } }) => {
			const { setOptions, getOptions } = data();
			return (
				<button
					onclick={() => {
						setOptions({ ...getOptions(), query: { hello: 'again' } });
					}}
				/>
			);
		});

		const WidgetTwo = factory(({ middleware: { data } }) => {
			const { getOrRead, setOptions, getOptions } = data();
			const { pageNumber = 1, pageSize = 2, query = {} } = getOptions();
			setOptions({ pageNumber, pageSize, query });
			const items = getOrRead(getOptions());
			return <div>{JSON.stringify(items)}</div>;
		});

		const Parent = factory(({ middleware: { data } }) => {
			const { shared } = data();

			return (
				<div>
					<WidgetOne resource={shared()} />
					<WidgetTwo resource={shared()} />
				</div>
			);
		});

		const App = create()(() => {
			return <Parent resource={resource({ data: [{ hello: 'world' }, { hello: 'world again' }] })} />;
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world' }, { hello: 'world again' }])}</div></div>`
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(
			root.innerHTML,
			`<div><button></button><div>${JSON.stringify([{ hello: 'world again' }])}</div></div>`
		);
	});

	it('should update the data in the resource', () => {
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });
		const resource = createResource<{ hello: string }>(createMemoryTemplate({ filter: defaultFilter }));

		const WidgetOne = factory(({ middleware: { data } }) => {
			const { getOrRead, setOptions, getOptions } = data();
			const { pageNumber = 1, pageSize = 2, query = {} } = getOptions();
			setOptions({ pageNumber, pageSize, query });
			const items = getOrRead(getOptions());
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
					<WidgetOne resource={resource({ data })} />
				</div>
			);
		});

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

	it('should destroy resources when widget is removed', () => {
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });
		const resource = createResource<{ hello: string }>(createMemoryTemplate({ filter: defaultFilter }));
		let renderCount = 0;
		let callSetOptions: any;
		const WidgetOne = factory(({ middleware: { data } }) => {
			const { getOrRead, setOptions, getOptions } = data();
			renderCount++;
			callSetOptions = setOptions;
			const { pageNumber = 1, pageSize = 2, query = {} } = getOptions();
			setOptions({ pageNumber, pageSize, query });
			const items = getOrRead(getOptions());
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
					{show && <WidgetOne resource={resource({ data: [{ hello: 'world' }, { hello: 'moon' }] })} />}
				</div>
			);
		});

		const r = renderer(() => <App />);
		const root = document.createElement('div');
		r.mount({ domNode: root });
		assert.strictEqual(
			root.innerHTML,
			'<div><button></button><div>[{"hello":"world"},{"hello":"moon"}]</div></div>'
		);
		(root.children[0].children[0] as any).click();
		resolvers.resolveRAF();
		assert.strictEqual(renderCount, 1);
		assert.strictEqual(root.innerHTML, '<div><button></button></div>');
		callSetOptions({ pageNumber: 2, pageSize: 100, query: {} });
		resolvers.resolveRAF();
		assert.strictEqual(renderCount, 1);
		assert.strictEqual(root.innerHTML, '<div><button></button></div>');
	});
});
