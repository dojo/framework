// const { it, afterEach, beforeEach } = intern.getInterface('bdd');
// const { describe } = intern.getPlugin('jsdom');
// // const { assert } = intern.getPlugin('chai');
// import { renderer, tsx, create } from '../../../../src/core/vdom';
// import '../../../../src/shim/Promise';
// import { createResolvers } from '../../support/util';
// // import resource from '../../../../src/core/middleware/resource';

// const resolvers = createResolvers();

// const data: any[] = [];
// for (let i = 0; i < 300; i++) {
// 	data.push({ id: `${i}` });
// }

// // createResourceTemplate({});
// // createResourceTemplate((initoptions) => {});

// // resource({ template, options, })

// // template({ })

// // resource - middlesware
// // const options = resource.createOptions(id)

// // const anObjectThat = resource({ template, options, { id: '' } })
// // const anObjectThat = template({ data })

// // <Foo resource={template({data})} />

// // {
// // 	template,
// // 	initOptions
// // }

// // {
// // 	template,
// // 	options,
// // 	transform
// // }

// describe('Resources Middleware', () => {
// 	beforeEach(() => {
// 		resolvers.stub();
// 	});
// 	afterEach(() => {
// 		resolvers.restore();
// 	});

// it('getOrRead with options', () => {
// 	const root = document.createElement('div');
// 	const factory = create({ resource });

// 	const template: any = {
// 		read: (request: any, { put }: any) => {
// 			put({
// 				start: request.start,
// 				end: request.end,
// 				idKey: 'id',
// 				items: data.slice(request.start, request.end)
// 			});
// 		}
// 	};

// 	const Foo =  factory.properties<{ options: any }>()(({ properties, middleware: { resource } }) => {
// 		const { options } = properties();
// 		const { getOrRead } = resource;
// 		return (
// 			<div>
// 				<div>foo start</div>
// 				<div>{JSON.stringify(getOrRead(template, options()))}</div>
// 				<div>foo end</div>
// 			</div>
// 		);
// 	});

// 	const App = factory(({ middleware: { resource } }) => {
// 		const { getOrRead, createOptions } = resource;
// 		const options = createOptions((curr, next) => {
// 			return { ...curr, ...next };
// 		});
// 		return (
// 			<div>
// 				<div>{JSON.stringify(getOrRead(template, options()))}</div>
// 				<button onclick={() => {
// 					options({ page: 2 });
// 				}}></button>
// 				<Foo options={options}/>
// 			</div>
// 		);
// 	});

// 	const r = renderer(() => <App />);
// 	r.mount({ domNode: root });
// 	console.log(root.innerHTML);
// 	debugger;
// 	(root as any).children[0].children[1].click();
// 	resolvers.resolve();
// 	console.log(root.innerHTML);
// 	debugger;
// assert.strictEqual(root.innerHTML, `<div>${JSON.stringify([{ id: '0' }])}</div>`);
// });
// });
