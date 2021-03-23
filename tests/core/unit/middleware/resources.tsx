const { describe, it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { renderer, tsx, create } from '../../../../src/core/vdom';
import { invalidator } from '../../../../src/core/vdom';
import '../../../../src/shim/Promise';
import { createResolvers } from '../../support/util';
import {
	createResourceMiddleware,
	createResourceTemplate,
	DefaultApi,
	ReadOptionsData,
	ReadRequest
} from '../../../../src/core/middleware/resources';
import icache from '../../../../src/core/middleware/icache';
import { spy } from 'sinon';
import { findIndex } from '../../../../src/shim/array';

const resolvers = createResolvers();

interface TestData {
	value: string;
}

const testData: TestData[] = [];
for (let i = 0; i < 200; i++) {
	testData.push({ value: `${i}` });
}

function testOptionsSetter({ size = 5, offset, query }: any, next: any) {
	return { offset, size, query, ...next };
}

jsdomDescribe('Resources Middleware', () => {
	let promiseArray: [Promise<void>, Function][] = [];

	function createPromise() {
		let res: any;
		const originalPromise = new Promise<void>((_res) => {
			res = _res;
		});
		promiseArray.push([originalPromise, res]);
		return originalPromise;
	}

	beforeEach(() => {
		promiseArray = [];
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
	});

	describe('Resource Reading', () => {
		it('Should support using a template directly to read using default template', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should support using a template directly reading with meta using default template', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read, meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"value":"0"},"status":"read"},{"value":{"value":"1"},"status":"read"},{"value":{"value":"2"},"status":"read"},{"value":{"value":"3"},"status":"read"},{"value":{"value":"4"},"status":"read"}],"meta":{"status":"read","total":200}}</div>'
			);
		});
		it('Should support using a template factory directly to read resource data using the default template', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>('value');
			const App = factory(function App({ id, middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template({ id, data: testData }));
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});

		it('Should support passing a template to a widget with the `resource` middleware', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return <Widget resource={resource({ template: testTemplate })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should support passing a template to a widget using the template factory', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>('value');
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return <Widget resource={resource({ template: testTemplate({ id, data: testData }) })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});

		it('Should be able to infer the resource data from widget for the default template', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource });
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});
			const testTemplate = createResourceTemplate(Widget, 'value');

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return <Widget resource={resource({ template: testTemplate({ id, data: testData }) })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});

		it('Should be able to infer the resource data from widget', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource }).properties<{ foo?: string }>();
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});
			const testTemplate = createResourceTemplate(Widget, {
				idKey: 'value',
				read: (request, { put }) => {
					const { offset } = request;
					put({ data: [...testData].slice(offset), total: testData.length }, request);
				}
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return <Widget resource={resource({ template: testTemplate })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});

		it('Should be able to infer the resource data from widget for custom template with options', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource });
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});
			const testTemplate = createResourceTemplate(Widget, ({ data }: { data: TestData[] }) => ({
				idKey: 'value',
				read: (request, { put }) => {
					const { offset } = request;
					put({ data: data.slice(offset), total: data.length }, request);
				}
			}));

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return <Widget resource={resource({ template: testTemplate({ id, data: testData }) })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});

		it('Should be able to infer the resource data and api from widget', () => {
			const resource = createResourceMiddleware<TestData, { scan: (request: ReadRequest) => void }>();
			const factory = create({ resource });
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { scan }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read: scan });
				return <div>{JSON.stringify(data)}</div>;
			});

			const testTemplate = createResourceTemplate(Widget, {
				idKey: 'value',
				scan: (request, { put }) => {
					const { offset } = request;
					put({ data: [...testData].slice(offset), total: testData.length }, request);
				}
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return <Widget resource={resource({ template: testTemplate })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});

		it('Should be able to infer the resource data and api from widget for custom template with options', () => {
			const resource = createResourceMiddleware<TestData, { scan: (request: ReadRequest) => void }>();
			const factory = create({ resource });
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { scan }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read: scan });
				return <div>{JSON.stringify(data)}</div>;
			});
			const testTemplate = createResourceTemplate(Widget, ({ data }: { data: TestData[] }) => ({
				idKey: 'value',
				scan: (request, { put }) => {
					const { offset } = request;
					put({ data: data.slice(offset), total: data.length }, request);
				}
			}));

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return <Widget resource={resource({ template: testTemplate({ id, data: testData }) })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});

		it('Should support passing a template to a widget using the short hand', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource });
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create()(function App({ id }) {
				return <Widget resource={{ id, data: testData, idKey: 'value' }} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('should update data when options changed', () => {
			const factory = create({ resource: createResourceMiddleware<TestData>() });
			const Widget = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const {
					resource: { options = createOptions(testOptionsSetter) }
				} = properties();
				const data = get(options({ size: 1 }), { read });
				return (
					<div>
						<div>{JSON.stringify(data)}</div>
						<button
							onclick={() => {
								const { offset, size } = options();
								options({ offset: offset + size });
							}}
						/>
					</div>
				);
			});

			const template = createResourceTemplate<TestData>('value');

			const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
				return <Widget resource={resource({ template: template({ id, data: testData }) })} />;
			});

			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<div><div>[{"value":"0"}]</div><button></button></div>');
			(domNode.children[0].children[1] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(domNode.innerHTML, '<div><div>[{"value":"1"}]</div><button></button></div>');
			(domNode.children[0].children[1] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(domNode.innerHTML, '<div><div>[{"value":"2"}]</div><button></button></div>');
		});
		it('Should be able to change the options used for a resource', () => {
			const factory = create({ resource: createResourceMiddleware<TestData>() });
			const template = createResourceTemplate<TestData>('value');

			const WidgetOne = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const {
					resource: { options = createOptions(testOptionsSetter) }
				} = properties();
				const items = get(options(), { read });
				return <div>{JSON.stringify(items)}</div>;
			});

			const App = create({ icache, resource: createResourceMiddleware() })(
				({ id, middleware: { resource, icache } }) => {
					const { createOptions } = resource;
					const options = icache.getOrSet('options', () => {
						const options = createOptions(testOptionsSetter, 'one');
						options({ size: 2 });
						return options;
					});
					return (
						<div>
							<button
								onclick={() => {
									icache.set('options', () => {
										const options = createOptions(testOptionsSetter, 'two');
										options({ size: 1 });
										return options;
									});
								}}
							/>
							<WidgetOne resource={resource({ template: template({ id, data: testData }), options })} />
						</div>
					);
				}
			);

			const r = renderer(() => <App />);
			const root = document.createElement('div');
			r.mount({ domNode: root });
			assert.strictEqual(root.innerHTML, '<div><button></button><div>[{"value":"0"},{"value":"1"}]</div></div>');
			(root.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(root.innerHTML, '<div><button></button><div>[{"value":"0"}]</div></div>');
		});
		it('Should transform data using the transform configuration', () => {
			const resource = createResourceMiddleware<{ id: string }>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return <Widget resource={resource({ template: testTemplate, transform: { id: 'value' } })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"id":"0"},{"id":"1"},{"id":"2"},{"id":"3"},{"id":"4"}]</div>'
			);
		});
		it('Should transform data using the transform configuration with meta getOrRead', () => {
			const resource = createResourceMiddleware<{ id: string }>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read, meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return <Widget resource={resource({ template: testTemplate, transform: { id: 'value' } })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"id":"0"},"status":"read"},{"value":{"id":"1"},"status":"read"},{"value":{"id":"2"},"status":"read"},{"value":{"id":"3"},"status":"read"},{"value":{"id":"4"},"status":"read"}],"meta":{"status":"read","total":200}}</div>'
			);
		});
		it('Should transform queries using the transform configuration', () => {
			const resource = createResourceMiddleware<{ id: string }>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>('value');
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options({ query: { id: '1' } }), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return (
					<Widget
						resource={resource({
							template: testTemplate({ id, data: testData }),
							transform: { id: 'value' }
						})}
					/>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"id":"1"},{"id":"10"},{"id":"11"},{"id":"12"},{"id":"13"}]</div>'
			);
		});
		it('Should transform queries using the transform configuration with meta getOrRead', () => {
			const resource = createResourceMiddleware<{ id: string }>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>('value');
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options({ query: { id: '1' } }), { read, meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return (
					<Widget
						resource={resource({
							template: testTemplate({ id, data: testData }),
							transform: { id: 'value' }
						})}
					/>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"id":"1"},"status":"read"},{"value":{"id":"10"},"status":"read"},{"value":{"id":"11"},"status":"read"},{"value":{"id":"12"},"status":"read"},{"value":{"id":"13"},"status":"read"}],"meta":{"status":"read","total":119}}</div>'
			);
		});
		it('Should by able to filter with transformed data and not transform properties', () => {
			const factory = create({ resource: createResourceMiddleware<TestData & { foo?: string }>() });
			const Widget = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions(testOptionsSetter) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);
				const data = get(options({ query: { value: '2', foo: '1' } }), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const template = createResourceTemplate<{ id: string; foo: string }>('foo');

			const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
				return (
					<Widget
						resource={resource({
							transform: { value: 'id' },
							template: template({
								id,
								data: [{ id: '1', foo: '1' }, { id: '2', foo: '1' }, { id: '3', foo: '2' }]
							})
						})}
					/>
				);
			});

			const r = renderer(() => <App />);
			const domNode = document.createElement('div');
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, `<div>${JSON.stringify([{ value: '2', foo: '1' }])}</div>`);
		});

		it('Can pass property template to child that nested transforms', () => {
			const listFactory = create({ resource: createResourceMiddleware<{ value: string; label: string }>() });

			const List = listFactory(function List({ properties, middleware: { resource } }) {
				const {
					resource: { template, options = resource.createOptions((curr, next) => ({ ...curr, ...next })) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);
				const items = get(options({ query: { value: 'id' } }), { read }) || [];
				return <ul>{items.map((item) => <li>{item.label}</li>)}</ul>;
			});

			const widgetFactory = create({ resource: createResourceMiddleware<{ id: string; desc: string }>() });

			const Widget = widgetFactory(function Widget({ properties, middleware: { resource } }) {
				const {
					resource: { template, options = resource.createOptions((curr, next) => ({ ...curr, ...next })) }
				} = properties();
				return <List resource={resource({ template, options, transform: { value: 'id', label: 'desc' } })} />;
			});

			const template = createResourceTemplate<{ uuid: string; description: string }>('uuid');

			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return (
					<Widget
						resource={resource({
							transform: { id: 'uuid', desc: 'description' },
							template: template({
								data: [{ uuid: 'id', description: 'desc' }, { uuid: '2', description: 'full' }],
								id: ''
							})
						})}
					/>
				);
			});

			const r = renderer(() => <App />);
			const domNode = document.createElement('div');
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<ul><li>desc</li></ul>');
		});

		it('Should by able to filter non string values by reference with getOrRead', () => {
			const root = document.createElement('div');
			const factory = create({ resource: createResourceMiddleware<{ value: number }>() });
			const Widget = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions((curr, next) => ({ ...curr, ...next })) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);
				const result = get(options({ query: { value: 10 } }), { read });
				return <div>{JSON.stringify(result)}</div>;
			});

			const template = createResourceTemplate<{ value: number }>('value');

			const App = create({ resource: createResourceMiddleware() })(({ id }) => {
				return <Widget resource={template({ id, data: [{ value: 10 }, { value: 100 }, { value: 99 }] })} />;
			});

			const r = renderer(() => <App />);
			r.mount({ domNode: root });
			assert.strictEqual(root.innerHTML, '<div>[{"value":10}]</div>');
		});
		it('Should not call read if the request has been satisfied by one or more request', () => {
			const resource = createResourceMiddleware<{ value: string }>();
			const factory = create({ resource });
			const rawTemplate = {
				idKey: 'value' as const,
				read: (req: any, controls: any) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			};
			const testTemplate = createResourceTemplate<TestData>(rawTemplate);
			const readSpy = spy(rawTemplate, 'read');
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(({ size = 3 }, next) => ({ size, ...next }));
				const req1 = get(options({ offset: 0 }), { read });
				const req2 = get(options({ offset: 3 }), { read });
				const req3 = get(options({ offset: 2, size: 2 }), { read });
				return (
					<div>
						{JSON.stringify(req1)}
						{JSON.stringify(req2)}
						{JSON.stringify(req3)}
					</div>
				);
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return <Widget resource={resource({ template: testTemplate })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(readSpy.callCount, 2);
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"}][{"value":"3"},{"value":"4"},{"value":"5"}][{"value":"2"},{"value":"3"}]</div>'
			);
		});
		it('Should return undefined while the request is being fulfilled', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					const prom = createPromise();
					prom.then(() => {
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							req
						);
					});
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<div></div>');
			const [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should return meta status for inflight requests', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					const prom = createPromise();
					prom.then(() => {
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							req
						);
					});
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read, meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"status":"reading"},{"status":"reading"},{"status":"reading"},{"status":"reading"},{"status":"reading"}],"meta":{"status":"reading"}}</div>'
			);
			const [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"value":"0"},"status":"read"},{"value":{"value":"1"},"status":"read"},{"value":{"value":"2"},"status":"read"},{"value":{"value":"3"},"status":"read"},{"value":{"value":"4"},"status":"read"}],"meta":{"status":"read","total":200}}</div>'
			);
		});
		it('Should not read if a matching request is already in flight', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					const prom = createPromise();
					prom.then(() => {
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							req
						);
					});
				}
			});
			const readSpy = spy(template.template.template() as any, 'read');
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const page1 = get(options(), { read });
				const page2 = get(options(), { read });
				return (
					<div>
						{JSON.stringify(page1)}
						{JSON.stringify(page2)}
					</div>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(readSpy.callCount, 1);
			assert.strictEqual(domNode.innerHTML, '<div></div>');
			const [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(readSpy.callCount, 1);
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}][{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should not call read while the requested items are already being fulfilled', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					const prom = createPromise();
					prom.then(() => {
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							req
						);
					});
				}
			});
			const readSpy = spy(template.template.template() as any, 'read');
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const req1 = get(options({ offset: 0 }), { read });
				const req2 = get(options({ offset: 5 }), { read });
				const req3 = get(options({ offset: 2, size: 2 }), { read });
				return (
					<div>
						{JSON.stringify(req1)}
						{JSON.stringify(req2)}
						{JSON.stringify(req3)}
					</div>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(readSpy.callCount, 2);
			assert.strictEqual(domNode.innerHTML, '<div></div>');
			let [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			[prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(readSpy.callCount, 2);
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"}][{"value":"5"},{"value":"6"}][{"value":"2"},{"value":"3"}]</div>'
			);
		});
		it('Can optimistically put data into the resource', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put(
						{ data: filteredData.slice(offset, offset + size * 2), total: filteredData.length },
						req
					);
				}
			});
			const readSpy = spy(template.template.template() as any, 'read');
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const page1 = get(options({ size: 2, offset: 0 }), { read });
				const page2 = get(options({ size: 2, offset: 2 }), { read });
				return (
					<div>
						{JSON.stringify(page1)}
						{JSON.stringify(page2)}
					</div>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(readSpy.callCount, 1);
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"}][{"value":"2"},{"value":"3"}]</div>'
			);
		});
		it('Items that are not fulfilled are assumed orphaned', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					const modifier = offset === 0 && size === 4 ? 2 : 0;
					let filteredData = [...testData];
					controls.put(
						{ data: filteredData.slice(offset, offset + size - modifier), total: filteredData.length },
						req
					);
				}
			});
			const readSpy = spy(template.template.template() as any, 'read');
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const page1 = get(options({ size: 4, offset: 0 }), { read });
				const page2 = get(options({ size: 3, offset: 6 }), { read });
				const page3 = get(options({ size: 9, offset: 0 }), { read });
				return (
					<div>
						{JSON.stringify(page1)}
						{JSON.stringify(page2)}
						{JSON.stringify(page3)}
					</div>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(readSpy.callCount, 3);
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"}][{"value":"6"},{"value":"7"},{"value":"8"}][{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"},{"value":"5"},{"value":"6"},{"value":"7"},{"value":"8"}]</div>'
			);
		});
		it('Items that are orphaned are reset if a request it received that has pending items after the orphans', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource, invalidator });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const prom = createPromise();
					prom.then(() => {
						const { size, offset } = req;
						const modifier = offset === 0 && size === 4 ? 2 : 0;
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size - modifier), total: filteredData.length },
							req
						);
					});
				}
			});
			const readSpy = spy(template.template.template() as any, 'read');
			const testOptions = [{ size: 4, offset: 0 }, { size: 3, offset: 6 }, { size: 9, offset: 0 }];
			let option = testOptions.shift();
			const App = factory(function App({ middleware: { resource, invalidator } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(option), { read });
				return (
					<div>
						<button
							onclick={() => {
								option = testOptions.shift();
								invalidator();
							}}
						/>
						{JSON.stringify(data)}
					</div>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(readSpy.callCount, 1);
			assert.strictEqual(domNode.innerHTML, '<div><button></button></div>');
			let [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(readSpy.callCount, 1);
			assert.strictEqual(domNode.innerHTML, '<div><button></button>[{"value":"0"},{"value":"1"}]</div>');
			(domNode.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			promiseArray.pop();
			assert.strictEqual(readSpy.callCount, 2);
			assert.strictEqual(domNode.innerHTML, '<div><button></button></div>');
			(domNode.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(readSpy.callCount, 3);
			assert.strictEqual(domNode.innerHTML, '<div><button></button></div>');
			[prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(readSpy.callCount, 3);
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"},{"value":"5"},{"value":"6"},{"value":"7"},{"value":"8"}]</div>'
			);
		});
		it('Should be able to update the data in using a template factory with resource middleware', () => {
			const factory = create({ resource: createResourceMiddleware<TestData>() });
			const template = createResourceTemplate<TestData>('value');

			const WidgetOne = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions(testOptionsSetter) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);
				const items = get(options(), { read });
				return <div>{JSON.stringify(items)}</div>;
			});

			const App = create({ icache, resource: createResourceMiddleware() })(
				({ id, middleware: { resource, icache } }) => {
					const reverse = icache.getOrSet('reverse', false);
					return (
						<div>
							<button
								onclick={() => {
									icache.set('reverse', () => true);
								}}
							/>
							<WidgetOne
								resource={resource({
									template: template({ id, data: reverse ? [...testData].reverse() : testData })
								})}
							/>
						</div>
					);
				}
			);

			const r = renderer(() => <App />);
			const root = document.createElement('div');
			r.mount({ domNode: root });
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div></div>'
			);
			(root.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>[{"value":"199"},{"value":"198"},{"value":"197"},{"value":"196"},{"value":"195"}]</div></div>'
			);
		});
		it('Should be able to update the data in using a template factory', () => {
			const factory = create({ resource: createResourceMiddleware<TestData>() });
			const template = createResourceTemplate<TestData>('value');

			const WidgetOne = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions(testOptionsSetter) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);
				const items = get(options(), { read });
				return <div>{JSON.stringify(items)}</div>;
			});

			const App = create({ icache })(({ id, middleware: { icache } }) => {
				const reverse = icache.getOrSet('reverse', false);
				return (
					<div>
						<button
							onclick={() => {
								icache.set('reverse', () => true);
							}}
						/>
						<WidgetOne resource={template({ id, data: reverse ? [...testData].reverse() : testData })} />
					</div>
				);
			});

			const r = renderer(() => <App />);
			const root = document.createElement('div');
			r.mount({ domNode: root });
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div></div>'
			);
			(root.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>[{"value":"199"},{"value":"198"},{"value":"197"},{"value":"196"},{"value":"195"}]</div></div>'
			);
		});
		it('Should be able to update the data in using a shorthand', () => {
			const factory = create({ resource: createResourceMiddleware<TestData>() });
			const WidgetOne = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions(testOptionsSetter) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);

				const items = get(options(), { read });
				return <div>{JSON.stringify(items)}</div>;
			});

			const App = create({ icache })(({ id, middleware: { icache } }) => {
				const reverse = icache.getOrSet('reverse', false);
				return (
					<div>
						<button
							onclick={() => {
								icache.set('reverse', () => true);
							}}
						/>
						<WidgetOne
							resource={{ id, data: reverse ? [...testData].reverse() : testData, idKey: 'value' }}
						/>
					</div>
				);
			});

			const r = renderer(() => <App />);
			const root = document.createElement('div');
			r.mount({ domNode: root });
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div></div>'
			);
			(root.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>[{"value":"199"},{"value":"198"},{"value":"197"},{"value":"196"},{"value":"195"}]</div></div>'
			);
		});
		it('Should be able to share resource options across between widgets', () => {
			const factory = create({ resource: createResourceMiddleware<TestData>() });
			const template = createResourceTemplate<TestData>('value');

			const WidgetOne = factory(({ properties, middleware: { resource } }) => {
				const { createOptions } = resource;
				const {
					resource: { options = createOptions(testOptionsSetter) }
				} = properties();
				return (
					<button
						onclick={() => {
							options({ offset: 5 });
						}}
					/>
				);
			});

			const WidgetTwo = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions(testOptionsSetter) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);
				const items = get(options({ size: 1 }), { read });
				return <div>{JSON.stringify(items)}</div>;
			});

			const Parent = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template }
				} = properties();
				const { createOptions } = resource;
				const options = createOptions(testOptionsSetter);
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
							template: template({ id, data: testData })
						})}
					/>
				);
			});

			const r = renderer(() => <App />);
			const root = document.createElement('div');
			r.mount({ domNode: root });
			assert.strictEqual(root.innerHTML, '<div><button></button><div>[{"value":"0"}]</div></div>');
			(root.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(root.innerHTML, '<div><button></button><div>[{"value":"5"}]</div></div>');
		});
		it('Should be able to share search query across widgets', () => {
			const factory = create({ resource: createResourceMiddleware<TestData>() });
			const template = createResourceTemplate<TestData>('value');

			const WidgetOne = factory(({ properties, middleware: { resource } }) => {
				const { createOptions } = resource;
				const {
					resource: { options = createOptions(testOptionsSetter) }
				} = properties();
				return (
					<button
						onclick={() => {
							options({ query: { value: '99' } });
						}}
					/>
				);
			});

			const WidgetTwo = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions(testOptionsSetter) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);

				const items = get(options({ size: 2 }), { read });
				return <div>{JSON.stringify(items)}</div>;
			});

			const Parent = factory(({ properties, middleware: { resource } }) => {
				const { createOptions } = resource;
				const {
					resource: { template, options = createOptions(testOptionsSetter) }
				} = properties();

				return (
					<div>
						<WidgetOne resource={resource({ template, options })} />
						<WidgetTwo resource={resource({ template, options })} />
					</div>
				);
			});

			const App = create({ resource: createResourceMiddleware() })(({ id }) => {
				return <Parent resource={template({ id, data: testData })} />;
			});

			const r = renderer(() => <App />);
			const root = document.createElement('div');
			r.mount({ domNode: root });
			assert.strictEqual(root.innerHTML, '<div><button></button><div>[{"value":"0"},{"value":"1"}]</div></div>');
			(root.children[0].children[0] as any).click();
			resolvers.resolve();
			assert.strictEqual(
				root.innerHTML,
				'<div><button></button><div>[{"value":"99"},{"value":"199"}]</div></div>'
			);
		});
		it('Should support the end of the data with `getOrRead`', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, 5), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions((curr, next) => ({ ...curr, ...next }));
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should throw error if undefined is passed to template', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const App = factory(function App({ middleware: { resource } }) {
				let error = false;
				try {
					resource.template(undefined);
				} catch {
					error = true;
				}
				return <div>{`${error}`}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<div>true</div>');
		});
		it('Should throw error if an undefined template is passed to `resource`', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const App = factory(function App({ middleware: { resource } }) {
				let error = false;
				try {
					resource({ template: undefined });
				} catch {
					error = true;
				}
				return <div>{`${error}`}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<div>true</div>');
		});
		it('Should support passing a template through multiple widgets with the `resource` middleware', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const Wrapper = factory(function App({ properties, middleware: { resource } }) {
				const { createOptions } = resource;
				const {
					resource: { template, options = createOptions(testOptionsSetter) }
				} = properties();
				return <Widget resource={resource({ template, options })} />;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return <Wrapper resource={resource({ template: testTemplate })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should support passing a template through multiple widgets using the template factory', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>('value');
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const Wrapper = factory(function App({ properties, middleware: { resource } }) {
				const { createOptions } = resource;
				const {
					resource: { template, options = createOptions(testOptionsSetter) }
				} = properties();
				return <Widget resource={resource({ template, options })} />;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return <Wrapper resource={resource({ template: testTemplate({ id, data: testData }) })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should support passing a template through multiple widgets using the short hand', () => {
			const resource = createResourceMiddleware<TestData>();
			const factory = create({ resource });
			const Widget = factory(function Widget({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return <div>{JSON.stringify(data)}</div>;
			});

			const Wrapper = factory(function Wrapper({ properties, middleware: { resource } }) {
				const { createOptions } = resource;
				const {
					resource: { template, options = createOptions(testOptionsSetter) }
				} = properties();
				return <Widget resource={resource({ template, options })} />;
			});

			const App = create()(function App({ id }) {
				return <Wrapper resource={{ id, data: testData, idKey: 'value' }} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
	});
	describe('get', () => {
		it('Should return the requested data using `get`', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				const data = get(options());
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should return the request data with meta using `get`', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				const data = get(options(), { meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"value":"0"},"status":"read"},{"value":{"value":"1"},"status":"read"},{"value":{"value":"2"},"status":"read"},{"value":{"value":"3"},"status":"read"},{"value":{"value":"4"},"status":"read"}],"meta":{"status":"read","total":200}}</div>'
			);
		});
		it('Should be able to `get` a resource by id', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				let [item] = get(['3']);
				if (!item) {
					get(options(), { read });
					[item] = get(['3']);
				}

				return <div>{JSON.stringify(item)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<div>{"value":"3"}</div>');
		});
		it('Should return partial data using `get` when the request is pending', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					const prom = createPromise();
					prom.then(() => {
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							req
						);
					});
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				const data = get(options());
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<div>[null,null,null,null,null]</div>');
			const [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should return partial data with meta using `get` when the request is pending', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					const prom = createPromise();
					prom.then(() => {
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							req
						);
					});
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				const data = get(options(), { meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"status":"reading"},{"status":"reading"},{"status":"reading"},{"status":"reading"},{"status":"reading"}],"meta":{"status":"reading"}}</div>'
			);
			const [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"value":"0"},"status":"read"},{"value":{"value":"1"},"status":"read"},{"value":{"value":"2"},"status":"read"},{"value":{"value":"3"},"status":"read"},{"value":{"value":"4"},"status":"read"}],"meta":{"status":"read","total":200}}</div>'
			);
		});
		it('Should return partial data using `get` when the request is partially pending', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					if (offset === 0) {
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							req
						);
					} else {
						const prom = createPromise();
						prom.then(() => {
							let filteredData = [...testData];
							controls.put(
								{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
								req
							);
						});
					}
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				get(options({ offset: 5 }), { read });
				const data = get(options({ size: 10, offset: 0 }));
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"},null,null,null,null,null]</div>'
			);
			const [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"},{"value":"5"},{"value":"6"},{"value":"7"},{"value":"8"},{"value":"9"}]</div>'
			);
		});
		it('Should return partial data with meta using `get` when the request is partially pending', async () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					if (offset === 0) {
						let filteredData = [...testData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							req
						);
					} else {
						const prom = createPromise();
						prom.then(() => {
							let filteredData = [...testData];
							controls.put(
								{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
								req
							);
						});
					}
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				get(options({ offset: 5 }), { read });
				const data = get(options({ size: 10, offset: 0 }), { meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"value":"0"},"status":"read"},{"value":{"value":"1"},"status":"read"},{"value":{"value":"2"},"status":"read"},{"value":{"value":"3"},"status":"read"},{"value":{"value":"4"},"status":"read"},{"status":"reading"},{"status":"reading"},{"status":"reading"},{"status":"reading"},{"status":"reading"}],"meta":{"status":"reading","total":200}}</div>'
			);
			const [prom, res] = promiseArray.pop()!;
			res();
			await prom;
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"value":"0"},"status":"read"},{"value":{"value":"1"},"status":"read"},{"value":{"value":"2"},"status":"read"},{"value":{"value":"3"},"status":"read"},{"value":{"value":"4"},"status":"read"},{"value":{"value":"5"},"status":"read"},{"value":{"value":"6"},"status":"read"},{"value":{"value":"7"},"status":"read"},{"value":{"value":"8"},"status":"read"},{"value":{"value":"9"},"status":"read"}],"meta":{"status":"read","total":200}}</div>'
			);
		});
		it('Should return partial data using `get` when the request has not been fulfilled', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				const data = get(options({ size: 10 }));
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"},null,null,null,null,null]</div>'
			);
		});
		it('Should return partial data with meta using `get` when the request has not been fulfilled', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				const data = get(options({ size: 10 }), { meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"value":"0"},"status":"read"},{"value":{"value":"1"},"status":"read"},{"value":{"value":"2"},"status":"read"},{"value":{"value":"3"},"status":"read"},{"value":{"value":"4"},"status":"read"},{"status":"unread"},{"status":"unread"},{"status":"unread"},{"status":"unread"},{"status":"unread"}],"meta":{"status":"unread","total":200}}</div>'
			);
		});
		it('Should transform data using the transform configuration using `get`', () => {
			const resource = createResourceMiddleware<{ id: string }>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read });
				const data = get(options());
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return <Widget resource={resource({ template: testTemplate, transform: { id: 'value' } })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"id":"0"},{"id":"1"},{"id":"2"},{"id":"3"},{"id":"4"}]</div>'
			);
		});
		it('Should transform data using the transform configuration with meta `get`', () => {
			const resource = createResourceMiddleware<{ id: string }>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>({
				idKey: 'value',
				read: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options(), { read, meta: true });
				const data = get(options(), { meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return <Widget resource={resource({ template: testTemplate, transform: { id: 'value' } })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"id":"0"},"status":"read"},{"value":{"id":"1"},"status":"read"},{"value":{"id":"2"},"status":"read"},{"value":{"id":"3"},"status":"read"},{"value":{"id":"4"},"status":"read"}],"meta":{"status":"read","total":200}}</div>'
			);
		});
		it('Should transform queries using the transform configuration using `get`', () => {
			const resource = createResourceMiddleware<{ id: string }>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>('value');
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options({ query: { id: '1' } }), { read });
				const data = get(options({ query: { id: '1' } }));
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return (
					<Widget
						resource={resource({
							template: testTemplate({ id, data: testData }),
							transform: { id: 'value' }
						})}
					/>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"id":"1"},{"id":"10"},{"id":"11"},{"id":"12"},{"id":"13"}]</div>'
			);
		});
		it('Should transform queries using the transform configuration with meta `get`', () => {
			const resource = createResourceMiddleware<{ id: string }>();
			const factory = create({ resource });
			const testTemplate = createResourceTemplate<TestData>('value');
			const Widget = factory(function App({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { read }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				get(options({ query: { id: '1' } }), { meta: true, read });
				const data = get(options({ query: { id: '1' } }), { meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});

			const App = create({ resource: createResourceMiddleware() })(function App({
				id,
				middleware: { resource }
			}) {
				return (
					<Widget
						resource={resource({
							template: testTemplate({ id, data: testData }),
							transform: { id: 'value' }
						})}
					/>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"id":"1"},"status":"read"},{"value":{"id":"10"},"status":"read"},{"value":{"id":"11"},"status":"read"},{"value":{"id":"12"},"status":"read"},{"value":{"id":"13"},"status":"read"}],"meta":{"status":"read","total":119}}</div>'
			);
		});
		it('Should by able to filter with transformed data and not transform properties with `get`', () => {
			const factory = create({ resource: createResourceMiddleware<TestData & { foo?: string }>() });
			const Widget = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions(testOptionsSetter) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);

				get(options({ query: { value: '2', foo: '1' } }), { read });
				const data = get(options({ query: { value: '2', foo: '1' } }));
				return <div>{JSON.stringify(data)}</div>;
			});

			const template = createResourceTemplate<{ id: string; foo: string }>('foo');

			const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
				return (
					<Widget
						resource={resource({
							transform: { value: 'id' },
							template: template({
								id,
								data: [{ id: '1', foo: '1' }, { id: '2', foo: '1' }, { id: '3', foo: '2' }]
							})
						})}
					/>
				);
			});

			const r = renderer(() => <App />);
			const domNode = document.createElement('div');
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<div>[{"value":"2","foo":"1"},null,null,null,null]</div>');
		});
		it('Should by able to filter non string values by reference with `get`', () => {
			const root = document.createElement('div');
			const factory = create({ resource: createResourceMiddleware<{ value: number }>() });
			const Widget = factory(({ properties, middleware: { resource } }) => {
				const {
					resource: { template, options = resource.createOptions((curr, next) => ({ ...curr, ...next })) }
				} = properties();
				const {
					get,
					template: { read }
				} = resource.template(template);

				get(options({ query: { value: 10 } }), { read });
				const data = get(options({ query: { value: 10 } }));
				return <div>{JSON.stringify(data)}</div>;
			});

			const template = createResourceTemplate<{ value: number }>('value');

			const App = create({ resource: createResourceMiddleware() })(({ id }) => {
				return <Widget resource={template({ id, data: [{ value: 10 }, { value: 100 }, { value: 99 }] })} />;
			});

			const r = renderer(() => <App />);
			r.mount({ domNode: root });
			assert.strictEqual(
				root.innerHTML,
				'<div>[{"value":10},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]</div>'
			);
		});

		it('Should be able to use `get` passed to the template controls', () => {
			const root = document.createElement('div');
			const testTemplate = createResourceTemplate<
				TestData & { label: string },
				DefaultApi & { update: (id: string) => void }
			>({
				idKey: 'value',
				read: (req, { get, put }) => {
					const item = get(req);
					if (item) {
						put({ data: item, total: 1 }, req);
					} else {
						put({ data: [{ value: '1', label: 'Original' }], total: 1 }, req);
					}
				},
				update: (id, { get, put }) => {
					const [item] = get([id]);
					if (item) {
						put([{ ...item, label: 'Updated' }]);
					}
				}
			});

			const App = create({ resource: createResourceMiddleware() })(({ id, middleware: { resource } }) => {
				const {
					get,
					createOptions,
					template: { update, read }
				} = resource.template(testTemplate);
				get(createOptions(() => ({}))(), { read });
				update('1');
				const item = get(createOptions(() => ({}))(), { read });
				return <div>{JSON.stringify(item)}</div>;
			});

			const r = renderer(() => <App />);
			r.mount({ domNode: root });
			assert.strictEqual(root.innerHTML, '<div>[{"value":"1","label":"Updated"}]</div>');
		});
	});
	describe('Custom Api', () => {
		it('Should support using a template with a custom api', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData, { reader: (req: ReadOptionsData) => void }>({
				idKey: 'value',
				reader: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { reader }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read: reader });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should support using a template directly reading with meta using a custom template api', () => {
			const resource = createResourceMiddleware();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData, { reader: (req: ReadOptionsData) => void }>({
				idKey: 'value',
				reader: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { reader }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read: reader, meta: true });
				return <div>{JSON.stringify(data)}</div>;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>{"data":[{"value":{"value":"0"},"status":"read"},{"value":{"value":"1"},"status":"read"},{"value":{"value":"2"},"status":"read"},{"value":{"value":"3"},"status":"read"},{"value":{"value":"4"},"status":"read"}],"meta":{"status":"read","total":200}}</div>'
			);
		});
		it('Should be able to define the required custom api for a widget', () => {
			const resource = createResourceMiddleware<TestData, { scan: (request: ReadOptionsData) => void }>();
			const factory = create({ resource });
			const template = createResourceTemplate<TestData, { scan: (req: ReadOptionsData) => void }>({
				idKey: 'value',
				scan: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const Widget = factory(function Widget({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { scan }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read: scan });
				return <div>{JSON.stringify(data)}</div>;
			});
			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return <Widget resource={resource({ template })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
		it('Should be able infer the required custom api from a widget when creating the template', () => {
			const resource = createResourceMiddleware<TestData, { scan: (request: ReadOptionsData) => void }>();
			const factory = create({ resource });

			const Widget = factory(function Widget({ properties, middleware: { resource } }) {
				const {
					resource: { template }
				} = properties();
				const {
					get,
					createOptions,
					template: { scan }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read: scan });
				return <div>{JSON.stringify(data)}</div>;
			});

			const template = createResourceTemplate(Widget, {
				idKey: 'value',
				scan: (req, controls) => {
					const { size, offset } = req;
					let filteredData = [...testData];
					controls.put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, req);
				}
			});
			const App = create({ resource: createResourceMiddleware() })(function App({ middleware: { resource } }) {
				return <Widget resource={resource({ template })} />;
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div>[{"value":"0"},{"value":"1"},{"value":"2"},{"value":"3"},{"value":"4"}]</div>'
			);
		});
	});
	describe('Saving Resources', () => {
		it('should be able to use custom template apis to save resources', () => {
			interface CustomTestData extends TestData {
				label: string;
			}
			const customTestData: CustomTestData[] = [];
			for (let i = 0; i < 200; i++) {
				customTestData.push({ value: `${i}`, label: `Original Label ${i}` });
			}

			const template = createResourceTemplate<
				CustomTestData,
				{ save: (item: CustomTestData) => void } & DefaultApi
			>({
				idKey: 'value',
				save: (request, controls) => {
					const index = findIndex(customTestData, (item) => request.value == item.value);
					if (index !== -1) {
						customTestData[index] = request;
					}
					controls.put([request]);
				},
				read: (request, controls) => {
					const { size, offset } = request;
					let filteredData = [...customTestData];
					controls.put(
						{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
						request
					);
				}
			});
			const resource = createResourceMiddleware();
			const factory = create({ resource });

			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read, save }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read });
				return (
					<div>
						<button
							onclick={() => {
								save({ value: '1', label: 'Updated Label 1' });
							}}
						/>
						<div>{JSON.stringify(data)}</div>
					</div>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button><div>[{"value":"0","label":"Original Label 0"},{"value":"1","label":"Original Label 1"},{"value":"2","label":"Original Label 2"},{"value":"3","label":"Original Label 3"},{"value":"4","label":"Original Label 4"}]</div></div>'
			);
			(domNode.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button><div>[{"value":"0","label":"Original Label 0"},{"value":"1","label":"Updated Label 1"},{"value":"2","label":"Original Label 2"},{"value":"3","label":"Original Label 3"},{"value":"4","label":"Original Label 4"}]</div></div>'
			);
		});
	});
	describe('Creating Resources', () => {
		it('should be able to use custom template apis to create new resources', () => {
			interface CustomTestData extends TestData {
				label: string;
			}
			const customTestData: CustomTestData[] = [];
			for (let i = 0; i < 4; i++) {
				if (i === 2) {
					continue;
				}
				customTestData.push({ value: `${i}`, label: `Original Label ${i}` });
			}

			const template = createResourceTemplate<
				CustomTestData,
				{ save: (item: CustomTestData) => void } & DefaultApi
			>({
				idKey: 'value',
				save: (request, controls) => {
					customTestData.push(request);
					customTestData.sort((a, b) => parseInt(a.value) - parseInt(b.value));
					controls.put([request]);
				},
				read: (request, controls) => {
					const { size, offset } = request;
					let filteredData = [...customTestData];
					controls.put(
						{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
						request
					);
				}
			});
			const resource = createResourceMiddleware();
			const factory = create({ resource });

			const App = factory(function App({ middleware: { resource } }) {
				const {
					get,
					createOptions,
					template: { read, save }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read }) || [];
				return (
					<div>
						<button
							onclick={() => {
								save({ value: '2', label: 'New Label 2' });
							}}
						/>
						<div>{data.map((item) => <div>{JSON.stringify([get([item.value])])}</div>)}</div>
					</div>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button><div><div>[[{"value":"0","label":"Original Label 0"}]]</div><div>[[{"value":"1","label":"Original Label 1"}]]</div><div>[[{"value":"3","label":"Original Label 3"}]]</div></div></div>'
			);
			(domNode.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button><div><div>[[{"value":"0","label":"Original Label 0"}]]</div><div>[[{"value":"1","label":"Original Label 1"}]]</div><div>[[{"value":"2","label":"New Label 2"}]]</div><div>[[{"value":"3","label":"Original Label 3"}]]</div></div></div>'
			);
		});

		it('should be able to use custom template apis to create new resources with an async template', async () => {
			interface CustomTestData extends TestData {
				label: string;
			}
			const customTestData: CustomTestData[] = [];
			for (let i = 0; i < 4; i++) {
				if (i === 2) {
					continue;
				}
				customTestData.push({ value: `${i}`, label: `Original Label ${i}` });
			}

			const promises: [Promise<any>, () => void][] = [];
			let readCounter = 0;

			const template = createResourceTemplate<
				CustomTestData,
				{ save: (item: CustomTestData) => void } & DefaultApi
			>({
				idKey: 'value',
				save: async (request, controls) => {
					customTestData.push(request);
					customTestData.sort((a, b) => parseInt(a.value) - parseInt(b.value));
					controls.put([request]);
				},
				read: (request, controls) => {
					readCounter++;
					let resolver: any;
					const promise = new Promise((res) => {
						resolver = res;
					});
					promises.push([promise, resolver]);
					return promise.then(() => {
						const { size, offset } = request;
						let filteredData = [...customTestData];
						controls.put(
							{ data: filteredData.slice(offset, offset + size), total: filteredData.length },
							request
						);
					});
				}
			});
			const resource = createResourceMiddleware();
			const factory = create({ resource, invalidator });

			const App = factory(function App({ middleware: { resource, invalidator } }) {
				const {
					get,
					createOptions,
					template: { read, save }
				} = resource.template(template);
				const options = createOptions(testOptionsSetter);
				const data = get(options(), { read }) || [];
				return (
					<div>
						<button
							onclick={() => {
								save({ value: '2', label: 'New Label 2' });
							}}
						/>
						<button
							onclick={() => {
								invalidator();
							}}
						/>
						<div>{data.map((item) => <div>{JSON.stringify([get([item.value])])}</div>)}</div>
					</div>
				);
			});
			const domNode = document.createElement('div');
			const r = renderer(() => <App />);
			r.mount({ domNode });
			assert.strictEqual(domNode.innerHTML, '<div><button></button><button></button><div></div></div>');
			assert.strictEqual(readCounter, 1);
			let [promise, resolve] = promises.shift()!;
			resolve();
			await promise;
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button><button></button><div><div>[[{"value":"0","label":"Original Label 0"}]]</div><div>[[{"value":"1","label":"Original Label 1"}]]</div><div>[[{"value":"3","label":"Original Label 3"}]]</div></div></div>'
			);
			assert.strictEqual(readCounter, 1);
			(domNode.children[0].children[0] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button><button></button><div><div>[[{"value":"0","label":"Original Label 0"}]]</div><div>[[{"value":"1","label":"Original Label 1"}]]</div><div>[[{"value":"3","label":"Original Label 3"}]]</div></div></div>'
			);
			assert.strictEqual(readCounter, 2);
			(domNode.children[0].children[1] as any).click();
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button><button></button><div><div>[[{"value":"0","label":"Original Label 0"}]]</div><div>[[{"value":"1","label":"Original Label 1"}]]</div><div>[[{"value":"3","label":"Original Label 3"}]]</div></div></div>'
			);
			assert.strictEqual(readCounter, 2);
			[promise, resolve] = promises.shift()!;
			resolve();
			await promise;
			resolvers.resolveRAF();
			assert.strictEqual(
				domNode.innerHTML,
				'<div><button></button><button></button><div><div>[[{"value":"0","label":"Original Label 0"}]]</div><div>[[{"value":"1","label":"Original Label 1"}]]</div><div>[[{"value":"2","label":"New Label 2"}]]</div><div>[[{"value":"3","label":"Original Label 3"}]]</div></div></div>'
			);
			assert.strictEqual(readCounter, 2);
		});
	});
});
