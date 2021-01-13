const { it, afterEach, beforeEach } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
// const { assert } = intern.getPlugin('chai');
import { renderer, tsx, create } from '../../../../src/core/vdom';
import '../../../../src/shim/Promise';
import { createResolvers } from '../../support/util';
import { createResourceTemplate, createResourceMiddleware } from '../../../../src/core/middleware/r';

const resolvers = createResolvers();

// declare const resource: any; // Resource<{ label: string }>;
// declare const readOptionsData: any; // ReadOptionsData;

const data: any[] = [];
for (let i = 0; i < 300; i++) {
	data.push({ id: `${i}` });
}

describe('r', () => {
	beforeEach(() => {
		resolvers.stub();
	});
	afterEach(() => {
		resolvers.restore();
	});

	it('default', () => {
		const root = document.createElement('div');
		const resource = createResourceMiddleware();
		const factory = create({ resource });
		const template = createResourceTemplate<{ id: string }>();
		const Foo = create({ resource: createResourceMiddleware<{ data: { id: string } }>() })(
			({ properties, middleware: { resource } }) => {
				const { getOrRead, createOptions } = resource;
				let {
					resource: { template, options }
				} = properties();
				if (!options) {
					options = createOptions((curr, next) => ({ ...curr, ...next }));
					options({ size: 5 });
				}
				return (
					<div>
						<div>foo start</div>
						<div>{JSON.stringify(getOrRead(template, options()))}</div>
						<div>foo end</div>
					</div>
				);
			}
		);

		const App = factory(({ middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const options = createOptions((curr, next) => {
				return { ...curr, ...next };
			});
			options({ size: 10 });
			return (
				<div>
					<div>{JSON.stringify(getOrRead(template({ id: '', data }), options()))}</div>
					<button
						onclick={() => {
							options({ page: 2 });
						}}
					/>
					<Foo resource={resource({ template: template({ id: '', data }), options })} />
					<Foo resource={resource({ template: template({ id: '', data }) })} />
				</div>
			);
		});
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		console.log(root.innerHTML);
		debugger;
		(root as any).children[0].children[1].click();
		resolvers.resolve();
		console.log(root.innerHTML);
	});

	it('data', () => {
		const root = document.createElement('div');
		const resource = createResourceMiddleware();
		const factory = create({ resource });
		const Foo = create({ resource: createResourceMiddleware<{ data: { id: string } }>() })(
			({ properties, middleware: { resource } }) => {
				const { getOrRead, createOptions } = resource;
				let {
					resource: { template, options }
				} = properties();
				if (!options) {
					options = createOptions((curr, next) => ({ ...curr, ...next }));
					options({ size: 5 });
				}
				return (
					<div>
						<div>foo start</div>
						<div>{JSON.stringify(getOrRead(template, options()))}</div>
						<div>foo end</div>
					</div>
				);
			}
		);

		const App = factory(() => {
			return (
				<div>
					<Foo resource={{ id: '', data }} />
					<Foo resource={{ id: '', data }} />
				</div>
			);
		});
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		console.log(root.innerHTML);
		debugger;
	});

	it('normal', () => {
		const root = document.createElement('div');
		const resource = createResourceMiddleware();
		const factory = create({ resource });

		const template = createResourceTemplate<{ id: string }>({
			read: async (request, { put }) => {
				put({ data: data.slice(request.offset, request.offset + request.size), total: data.length }, request);
			}
		});
		const Foo = create({ resource: createResourceMiddleware<{ data: { id: string } }>() })(
			({ properties, middleware: { resource } }) => {
				const { getOrRead, createOptions } = resource;
				let {
					resource: { template, options }
				} = properties();
				if (!options) {
					options = createOptions((curr, next) => ({ ...curr, ...next }));
					options({ size: 5 });
				}
				return (
					<div>
						<div>foo start</div>
						<div>{JSON.stringify(getOrRead(template, options()))}</div>
						<div>foo end</div>
					</div>
				);
			}
		);

		const App = factory(({ middleware: { resource } }) => {
			const { getOrRead, createOptions } = resource;
			const options = createOptions((curr, next) => {
				return { ...curr, ...next };
			});
			options({ size: 10 });
			return (
				<div>
					<div>{JSON.stringify(getOrRead(template, options()))}</div>
					<button
						onclick={() => {
							options({ page: 2 });
						}}
					/>
					<Foo resource={resource({ template, options })} />
					<Foo resource={resource({ template })} />
				</div>
			);
		});
		const r = renderer(() => <App />);
		r.mount({ domNode: root });
		console.log(root.innerHTML);
		debugger;
		(root as any).children[0].children[1].click();
		resolvers.resolve();
		console.log(root.innerHTML);
	});

	// it('types', () => {
	// 	const defaultTemplate = createResourceTemplate<{ label: string }>();
	// 	const templateWithOptions = createResourceTemplate<{ foo: string }, { bar: string }>((options) => ({
	// 		read: () => {
	// 			console.log(options);
	// 		}
	// 	}));
	// 	const standardTemplate = createResourceTemplate<{ foo: string }>({
	// 		read: () => {}
	// 	});
	// 	const standardTemplateWithMatching = createResourceTemplate<{ label: string }>({
	// 		read: () => {}
	// 	});

	// 	// expected an error as no resource data interface passed
	// 	// const untypedTemplate = createResourceTemplate({
	// 	// 	read: () => {}
	// 	// });

	// 	resource.getOrRead(defaultTemplate({ data: [], id: '' }), readOptionsData);
	// 	resource.getOrRead(templateWithOptions({ bar: '', id: '' }), readOptionsData);
	// 	resource.getOrRead(standardTemplate, readOptionsData);

	// 	// const test: ResourceDetails<{ label: string }> = resource({ template: standardTemplate });
	// 	// const testWithMatching: ResourceDetails<{ label: string }> = resource({ template: standardTemplateWithMatching });

	// 	const Widget = create({ resource: createResourceMiddleware<{ data: { label: string } }>() })(
	// 		({ properties, middleware: { resource } }) => {
	// 			const { createOptions } = resource;
	// 			const {
	// 				resource: { template, options = createOptions((curr, next) => ({ ...curr, ...next })) }
	// 			} = properties();
	// 			resource.getOrRead(template, options());
	// 			resource.getOrRead(defaultTemplate({ data: [], id: '' }), options());
	// 			resource.getOrRead(templateWithOptions({ bar: '', id: '' }), options());
	// 			resource.getOrRead(standardTemplate, options());
	// 			return <div />;
	// 		}
	// 	);

	// 	<Widget resource={resource({ template: standardTemplateWithMatching })} />;
	// 	<Widget resource={resource({ template: standardTemplate })} />; // missing transform
	// 	<Widget resource={resource({ template: standardTemplate, transform: { label: 'foo' } })} />;
	// 	<Widget resource={resource({ template: standardTemplate, transform: { label: 'unknown' } })} />; // incorrect transform
	// 	<Widget resource={defaultTemplate({ id: 'sss', data: [{ label: '' }] })} />;
	// 	//<Widget resource={defaultTemplate({ id: 'sss', data: [{ foo: '' }] })} />; // incorrect data
	// 	//<Widget resource={defaultTemplate({ data: [{ label: '' }] })} />; // missing id
	// 	<Widget resource={{ id: 'sss', data: [{ label: '' }] }} />;
	// });
});
