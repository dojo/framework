const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { renderer, tsx, create } from '../../../../src/core/vdom';
import { createDataMiddleware } from '../../../../src/core/middleware/data';
import { createResolvers } from '../../support/util';
import { createResource, createMemoryTemplate, defaultFilter } from '../../../../src/core/resource';

const resolvers = createResolvers();

jsdomDescribe('data middleware', () => {
	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
	});

	it('get() with options', () => {
		const root = document.createElement('div');
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });

		const Thing = factory(({ middleware: { data } }) => {
			const { get, getOptions } = data();
			return <div>{JSON.stringify(get(getOptions()))}</div>;
		});

		const resource = createResource<{ hello: string }>();

		const App = create()(() => {
			return <Thing resource={resource({ data: [{ hello: '1' }] })} />;
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: '1' }])}</div>`);
	});

	it('should update when setOptions() called', () => {
		const root = document.createElement('div');
		const factory = create({ data: createDataMiddleware<{ hello: string }>() });

		let set: any;
		const Thing = factory(({ middleware: { data } }) => {
			const { get, getOptions, setOptions } = data();
			set = setOptions;
			const { pageSize = 1, pageNumber = 1 } = getOptions();
			setOptions({ pageSize, pageNumber });
			return <div>{JSON.stringify(get(getOptions()))}</div>;
		});

		const resource = createResource<{ hello: string }>();

		const App = create()(() => {
			return <Thing resource={resource({ data: [{ hello: '1' }, { hello: '2' }] })} />;
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
		const Thing = factory(({ middleware: { data } }) => {
			const { get, getOptions, setOptions } = data();
			const { pageSize = 1, pageNumber = 1 } = getOptions();
			setOptions({ pageSize, pageNumber });
			return <div>{JSON.stringify(get(getOptions()))}</div>;
		});

		const resource = createResource<{ wrong: string }>();

		const App = create()(() => {
			return (
				<Thing resource={resource({ transform: { hello: 'wrong' }, data: [{ wrong: '1' }, { wrong: '2' }] })} />
			);
		});

		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ hello: '1' }])}</div>`);
	});

	it('should not convert single fields into strings when using a transform', () => {
		const root = document.createElement('div');
		const factory = create({ data: createDataMiddleware<{ hello: number }>() });

		const Thing = factory(({ middleware: { data } }) => {
			const { get, getOptions, setOptions } = data();
			const { pageSize = 1, pageNumber = 1 } = getOptions();
			setOptions({ pageSize, pageNumber });
			return <div>{JSON.stringify(get(getOptions()))}</div>;
		});

		const resource = createResource<{ wrong: number }>();

		const App = create()(() => {
			return <Thing resource={resource({ transform: { hello: 'wrong' }, data: [{ wrong: 1 }, { wrong: 2 }] })} />;
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

		const Thing = factory(({ middleware: { data } }) => {
			const { getOrRead, isLoading } = data();
			const items = getOrRead({ pageSize: 1, pageNumber: 1 });
			const loading = isLoading({ pageSize: 1, pageNumber: 1 });
			if (loading) {
				return <div>Loading</div>;
			}
			return <div>{JSON.stringify(items)}</div>;
		});

		const App = create()(() => {
			return <Thing resource={resource()} />;
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

	// it('should transform appropriate query options when calling resource apis', () => {
	// 	const factory = create({ data: createDataMiddleware<{ value: string }>() });
	// 	const App = factory(function App({ middleware: { data } }) {
	// 		const { get } = data();
	// 		return (
	// 			<div>
	// 				{JSON.stringify(
	// 					get({
	// 						query: {
	// 							value: 'test',
	// 							foo: 'bar'
	// 						}
	// 					})
	// 				)}
	// 			</div>
	// 		);
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} transform={{ value: ['item'] }} />);
	// 	r.mount({ domNode: root });
	// 	assert.isTrue(
	// 		resourceStub.get.calledWith({ query: [{ keys: ['item'], value: 'test' }, { keys: ['foo'], value: 'bar' }] })
	// 	);
	// });

	// it('should still convert query options to resource query format when not using a transform', () => {
	// 	const factory = create({ data: dataMiddleware });
	// 	const App = factory(function App({ middleware: { data } }) {
	// 		const { get } = data();
	// 		return (
	// 			<div>
	// 				{JSON.stringify(
	// 					get({
	// 						query: {
	// 							value: 'test',
	// 							foo: 'bar'
	// 						}
	// 					})
	// 				)}
	// 			</div>
	// 		);
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} />);
	// 	r.mount({ domNode: root });
	// 	assert.isTrue(
	// 		resourceStub.get.calledWith({
	// 			query: [{ keys: ['value'], value: 'test' }, { keys: ['foo'], value: 'bar' }]
	// 		})
	// 	);
	// });

	// it('can create shared resources that share options', () => {
	// 	resourceStub.getOrRead.returns([{ value: 'foo' }, { value: 'bar' }]);
	// 	const WidgetA = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
	// 		const { getOptions, setOptions } = dataMiddleware();
	// 		setOptions({
	// 			pageNumber: 99,
	// 			pageSize: 99,
	// 			query: { value: 'test' }
	// 		});
	// 		return <div>{JSON.stringify(getOptions())}</div>;
	// 	});
	// 	const WidgetB = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
	// 		const { getOptions } = dataMiddleware();
	// 		return <div>{JSON.stringify(getOptions())}</div>;
	// 	});
	// 	const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
	// 		const { shared } = dataMiddleware();
	// 		const sharedResource = shared();
	// 		return (
	// 			<virtual>
	// 				<WidgetA resource={sharedResource} />
	// 				<WidgetB resource={sharedResource} />
	// 			</virtual>
	// 		);
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} />);
	// 	r.mount({ domNode: root });
	// 	assert.strictEqual(
	// 		root.innerHTML,
	// 		`<div>${JSON.stringify({
	// 			pageNumber: 99,
	// 			pageSize: 99,
	// 			query: { value: 'test' }
	// 		})}</div><div>${JSON.stringify({
	// 			pageNumber: 99,
	// 			pageSize: 99,
	// 			query: { value: 'test' }
	// 		})}</div>`
	// 	);
	// });

	// it('can reset a shared resource to obtain its own options', () => {
	// 	resourceStub.getOrRead.returns([{ value: 'foo' }, { value: 'bar' }]);
	// 	const WidgetA = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
	// 		const { getOptions, setOptions } = dataMiddleware({ reset: true });
	// 		setOptions({
	// 			pageNumber: 99,
	// 			pageSize: 99,
	// 			query: { value: 'testA' }
	// 		});
	// 		return <div>{JSON.stringify(getOptions())}</div>;
	// 	});
	// 	const WidgetB = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
	// 		const { getOptions, setOptions } = dataMiddleware({ reset: true });
	// 		setOptions({
	// 			pageNumber: 10,
	// 			pageSize: 10,
	// 			query: { value: 'testB' }
	// 		});
	// 		return <div>{JSON.stringify(getOptions())}</div>;
	// 	});
	// 	const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
	// 		const { shared } = dataMiddleware();
	// 		const sharedResource = shared();
	// 		return (
	// 			<virtual>
	// 				<WidgetA resource={sharedResource} />
	// 				<WidgetB resource={sharedResource} />
	// 			</virtual>
	// 		);
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} />);
	// 	r.mount({ domNode: root });
	// 	assert.strictEqual(
	// 		root.innerHTML,
	// 		`<div>${JSON.stringify({
	// 			pageNumber: 99,
	// 			pageSize: 99,
	// 			query: { value: 'testA' }
	// 		})}</div><div>${JSON.stringify({
	// 			pageNumber: 10,
	// 			pageSize: 10,
	// 			query: { value: 'testB' }
	// 		})}</div>`
	// 	);
	// });

	// it('can have a resource passed via a different property', () => {
	// 	const otherResource: any = {
	// 		getOrRead: sb.stub(),
	// 		getTotal: sb.stub(),
	// 		subscribe: sb.stub(),
	// 		unsubscribe: sb.stub(),
	// 		isLoading: sb.stub(),
	// 		isFailed: sb.stub(),
	// 		set: sb.stub(),
	// 		get: sb.stub()
	// 	};
	// 	otherResource.getOrRead.returns(['apple', 'pear']);
	// 	const Widget = create({ dataMiddleware }).properties<{ otherResource: Resource }>()(function Widget({
	// 		properties,
	// 		middleware: { dataMiddleware }
	// 	}) {
	// 		const { getOrRead, getOptions } = dataMiddleware({ resource: properties().otherResource });
	// 		return <div>{JSON.stringify(getOrRead(getOptions()))}</div>;
	// 	});
	// 	const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
	// 		const { resource } = dataMiddleware();

	// 		return <Widget resource={resource} otherResource={otherResource} />;
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} />);
	// 	r.mount({ domNode: root });
	// 	assert.strictEqual(root.innerHTML, `<div>${JSON.stringify(['apple', 'pear'])}</div>`);
	// });

	// it('can use key property to differentiate between options on same resource', () => {
	// 	resourceStub.getOrRead.returns([{ value: 'foo' }, { value: 'bar' }]);
	// 	const Widget = create({ dataMiddleware }).properties<{ otherResource: ResourceOrResourceWrapper }>()(
	// 		function Widget({ properties, middleware: { dataMiddleware } }) {
	// 			const { setOptions } = dataMiddleware();
	// 			const { setOptions: setOptions2, getOptions: getOptions2 } = dataMiddleware({
	// 				key: 'two',
	// 				resource: properties().otherResource
	// 			});
	// 			setOptions2({
	// 				pageSize: 2,
	// 				pageNumber: 2,
	// 				query: { value: 'two-query' }
	// 			});
	// 			setOptions({
	// 				pageSize: 1,
	// 				pageNumber: 1,
	// 				query: { value: 'one-query' }
	// 			});
	// 			return <div>{JSON.stringify(getOptions2())}</div>;
	// 		}
	// 	);
	// 	const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
	// 		const { resource } = dataMiddleware();

	// 		return <Widget resource={resource} otherResource={resource} />;
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} />);
	// 	r.mount({ domNode: root });
	// 	assert.strictEqual(
	// 		root.innerHTML,
	// 		`<div>${JSON.stringify({
	// 			pageSize: 2,
	// 			pageNumber: 2,
	// 			query: { value: 'two-query' }
	// 		})}</div>`
	// 	);
	// });

	// it('subscribes to resource events when using the api', () => {
	// 	const { callback } = dataMiddleware();
	// 	const data = callback({
	// 		id: 'test',
	// 		middleware: {
	// 			invalidator: invalidatorStub,
	// 			destroy: destroyStub,
	// 			diffProperty: diffPropertyStub
	// 		},
	// 		properties: () => ({
	// 			resource: resourceStub
	// 		}),
	// 		children: () => []
	// 	});

	// 	const options = {
	// 		pageNumber: 1,
	// 		pageSize: 10
	// 	};

	// 	let { getTotal, isFailed, isLoading, getOrRead } = data();
	// 	getTotal(options);
	// 	assert.isTrue(resourceStub.subscribe.calledWith('total', options, invalidatorStub));
	// 	sb.resetHistory();
	// 	isFailed(options);
	// 	assert.isTrue(resourceStub.subscribe.calledWith('failed', options, invalidatorStub));
	// 	sb.resetHistory();
	// 	getOrRead(options);
	// 	assert.isTrue(resourceStub.subscribe.calledWith('data', options, invalidatorStub));
	// 	sb.resetHistory();
	// 	isLoading(options);
	// 	assert.isTrue(resourceStub.subscribe.calledWith('loading', options, invalidatorStub));
	// });

	// it('unsubscribes from the resource when widget is removed from render', () => {
	// 	let show = true;
	// 	let invalidate: any;
	// 	const Widget = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
	// 		const { getOrRead } = dataMiddleware();
	// 		getOrRead({ pageNumber: 1, pageSize: 2, query: { value: 'test' } });
	// 		return <div>testing</div>;
	// 	});
	// 	const App = create({ dataMiddleware, invalidator })(function App({
	// 		middleware: { dataMiddleware, invalidator }
	// 	}) {
	// 		const { resource } = dataMiddleware();
	// 		invalidate = invalidator;
	// 		return show && <Widget resource={resource} />;
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} />);
	// 	r.mount({ domNode: root });
	// 	resolvers.resolveRAF();
	// 	show = false;
	// 	invalidate();
	// 	resolvers.resolveRAF();
	// 	assert.isTrue(resourceStub.unsubscribe.called);
	// });

	// it('returns loading status of resource', () => {
	// 	resourceStub.isLoading.returns(true);
	// 	const Widget = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
	// 		const { isLoading, getOptions } = dataMiddleware();
	// 		const loading = isLoading(getOptions());
	// 		return <div>{`${loading}`}</div>;
	// 	});
	// 	const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
	// 		const { resource } = dataMiddleware();
	// 		return <Widget resource={resource} />;
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} />);
	// 	r.mount({ domNode: root });

	// 	assert.strictEqual(root.innerHTML, `<div>true</div>`);
	// });

	// it('returns failed status of resource', () => {
	// 	resourceStub.isFailed.returns(true);
	// 	const Widget = create({ dataMiddleware })(function Widget({ middleware: { dataMiddleware } }) {
	// 		const { isFailed, getOptions } = dataMiddleware();
	// 		const failed = isFailed(getOptions());
	// 		return <div>{`${failed}`}</div>;
	// 	});
	// 	const App = create({ dataMiddleware })(function App({ middleware: { dataMiddleware } }) {
	// 		const { resource } = dataMiddleware();
	// 		return <Widget resource={resource} />;
	// 	});
	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App resource={resourceStub} />);
	// 	r.mount({ domNode: root });

	// 	assert.strictEqual(root.innerHTML, `<div>true</div>`);
	// });

	// it('should call create resource only once when provided a factory and data', () => {
	// 	const factory = create({ data: dataMiddleware, invalidator });
	// 	let invalidate: any;
	// 	const App = factory(function App({ middleware: { data, invalidator } }) {
	// 		invalidate = invalidator;
	// 		const { get } = data();
	// 		return <div>{JSON.stringify(get({}))}</div>;
	// 	});
	// 	const root = document.createElement('div');
	// 	const factoryStub = resourceStub;
	// 	const r = renderer(() => (
	// 		<App resource={{ resource: factoryStub, data: [{ value: 'foo' }, { value: 'bar' }] }} />
	// 	));
	// 	r.mount({ domNode: root });
	// 	resolvers.resolveRAF();
	// 	invalidate();
	// 	resolvers.resolveRAF();
	// 	assert.isTrue(factoryStub.set.calledOnce);
	// });

	// it('should call create resource again if the data passed has changed', () => {
	// 	const testData = [{ value: 'foo' }, { value: 'bar' }];
	// 	const testData2 = [{ value: 'red' }, { value: 'blue' }, { value: 'green' }];
	// 	let invalidate: any;
	// 	let useAltData = false;

	// 	const Widget = create({ data: dataMiddleware, invalidator })(function Widget({
	// 		middleware: { data, invalidator }
	// 	}) {
	// 		const { get } = data();
	// 		return <div>{JSON.stringify(get({}))}</div>;
	// 	});

	// 	const App = create({ invalidator })(function App({ middleware: { invalidator } }) {
	// 		invalidate = invalidator;
	// 		const resource = useAltData
	// 			? { resource: factoryStub, data: testData2 }
	// 			: { resource: factoryStub, data: testData };
	// 		return <Widget resource={resource} />;
	// 	});

	// 	const root = document.createElement('div');
	// 	const factoryStub = resourceStub;
	// 	const r = renderer(() => <App />);
	// 	r.mount({ domNode: root });
	// 	resolvers.resolveRAF();
	// 	useAltData = true;

	// 	invalidate();

	// 	resolvers.resolveRAF();
	// 	assert.isTrue(factoryStub.set.calledTwice);
	// });

	// it('should call create resource again if the data passed has changed using resource to set data', () => {
	// 	const testData = [{ value: 'foo' }, { value: 'bar' }];
	// 	const testData2 = [{ value: 'red' }, { value: 'blue' }, { value: 'green' }];
	// 	let invalidate: any;
	// 	let useAltData = false;
	// 	const factoryStub = (data: any) => {
	// 		return {
	// 			resource: resourceStub,
	// 			data
	// 		};
	// 	};

	// 	const Widget = create({ data: dataMiddleware, invalidator })(function Widget({
	// 		middleware: { data, invalidator }
	// 	}) {
	// 		const { get } = data();
	// 		return <div>{JSON.stringify(get({}))}</div>;
	// 	});

	// 	const App = create({ invalidator })(function App({ middleware: { invalidator } }) {
	// 		invalidate = invalidator;
	// 		return <Widget resource={useAltData ? factoryStub(testData2) : factoryStub(testData)} />;
	// 	});

	// 	const root = document.createElement('div');
	// 	const r = renderer(() => <App />);
	// 	r.mount({ domNode: root });
	// 	resolvers.resolveRAF();
	// 	useAltData = true;
	// 	invalidate();
	// 	resolvers.resolveRAF();
	// 	assert.isTrue(resourceStub.set.calledTwice);
	// });
});
