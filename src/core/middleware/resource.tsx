import { create, invalidator, destroy, diffProperty } from '../vdom';
import { RawCache } from './resourceCache';
import { auto } from '../diff';

const factory = create({ invalidator, destroy, diffProperty });

// how do we create a raw cache per template
// we could inject the cache into the resource cache middleware, we could make it not a middleware and factory per template in the middleware
// would just merge the resource cache middleware with the main resource middleware, this is what i've done for now

// i think this is fine

// we need to think about "init", at the moment that is called at the beginning and populates all the data - what should it do? init should be function maybe?
// It would help if we could align the paths for resource templates that require an init and onces that don't

// init
// inits
// read: () => {
// 	put('')

// }

// createTemplate((initoptions) => {
// 	const data = imit
// 	return {
// 		read:
// 		find,
// 	}
// })

// invalidate behaviour:
//
// widgets invalidate when their most recent request is fulfilled
// widgets invalidate when they use options that have been changed, use means either as part of a request or reading the options generally in some way

// Options updates, this is down to the owner to process the "instruction" rather than it automatically be done. resources will then compare the new options aganast the old oprions

// const options((currentOptions, newOptions) => {
// 	return updatedOptions;
// }, 'id');

// options invalidations - options are created by middleware that has access to the owner invalidator only - when passed around we want to register
// widgets that have called the function to be notified when options change.

// get transform to support partial transforms
// remove find, only support read options, supply get api works in mem,
// enable extending the template as widget author
// put/get use

// The template cache, this holds the RawCache instance and request inprogress flags
const templateCacheMap = new Map<any, { raw: RawCache; inprogress: Map<any, any> }>();

// The options cache, holds the actual options, subscribers, and the options setter function
const optionsCacheMap = new Map<
	string,
	{ options: { page: number; size: number }; subscribers: Set<any>; setter: () => any }
>();

// The reverse look up for the owning id, this is so that widgets passed a resource options can add their invalidator to subscribers
const optionsSetterToOwnerIdMap = new Map<any, any>();

// this should be on the template
const ttl = 10000;

interface ResourceTemplate {
	idKey?: string;
	read: (req: any, controls: any) => void | Promise<void>;
}

interface ResourceTemplateFactory<O extends { id: string }> {
	(templateOptions: O): ResourceTemplate;
}

export function createTemplate(template: ResourceTemplate): ResourceTemplate;
export function createTemplate<
	O extends { id: string },
	T extends ResourceTemplateFactory<O> = ResourceTemplateFactory<O>
>(template: T): (options: O) => { template: T; templateOptions: O };
export function createTemplate<O extends { id: string }>(template: any): any {
	if (typeof template === 'function') {
		const template = (templateOptions: O) => {
			return {
				template,
				templateOptions
			};
		};
		return template;
	}
	return { ...template };
}

interface TemplateProperty<DATA, TEMPLATE extends ResourceTemplate> {
	template: (option: any) => TEMPLATE;
	templateOptions: { data: DATA[] };
}

interface DefaultTemplateOptions<DATA> {
	id: string;
	data: DATA[];
}

interface Properties<DATA, TEMPLATE extends ResourceTemplate> {
	resource: DefaultTemplateOptions<DATA> | TemplateProperty<DATA, TEMPLATE>;
}

const middleware = factory.properties<{ options?: any }>()(
	({ id, properties, middleware: { destroy, invalidator, diffProperty } }) => {
		const destroyFuncs: Function[] = [];
		diffProperty('options', properties, (curr, next) => {
			if (curr === next) {
				return next;
			}
			const id = optionsSetterToOwnerIdMap.get(next.options);
			if (id) {
				const optionsWrapper = optionsCacheMap.get(id);
				if (optionsWrapper && !optionsWrapper.subscribers.has(invalidator)) {
					optionsWrapper.subscribers.add(invalidator);
					destroyFuncs.push(() => {
						optionsWrapper.subscribers.delete(invalidator);
					});
				}
			}
			return next.options;
		});
		destroy(() => {
			destroyFuncs.forEach((des) => des());
		});
		return {
			createOptions(
				setter: (
					curr: { page: number; size: number },
					next: { page?: number; size?: number }
				) => { page: number; size: number },
				optionsId = id
			) {
				const existingOptions = optionsCacheMap.get(optionsId);
				if (existingOptions) {
					return existingOptions.setter;
				}
				const optionsWrapper = {
					options: {
						page: 1,
						size: 1
					},
					subscribers: new Set(),
					setter: () => {}
				};
				optionsWrapper.subscribers.add(invalidator);
				function setOptions(newOptions?: { page?: number; size?: number }): { page: number; size: number } {
					if (!newOptions) {
						optionsWrapper.subscribers.add(invalidator);
						//subscribe to options changes
						return { ...optionsWrapper.options };
					}
					const updatedOptions = setter(optionsWrapper.options, newOptions);
					if (auto(updatedOptions, optionsWrapper.options, 5)) {
						optionsWrapper.options = updatedOptions;
						optionsWrapper.subscribers.forEach((i) => {
							i();
						});
					}
					return optionsWrapper.options;
				}
				destroyFuncs.push(() => {
					optionsCacheMap.delete(id);
				});
				optionsWrapper.setter = setOptions;
				optionsCacheMap.set(optionsId, optionsWrapper);
				optionsSetterToOwnerIdMap.set(setOptions, optionsId);
				destroyFuncs.push(() => optionsSetterToOwnerIdMap.delete(setOptions));
				return setOptions;
			},
			// basic template support, no transform etc
			getOrRead: (templateOrWrapper: any, options: any) => {
				const template = templateOrWrapper.template ? templateOrWrapper.template : templateOrWrapper;
				let caches = templateCacheMap.get(template);
				if (!caches) {
					caches = {
						raw: new RawCache(),
						inprogress: new Map()
					};
					templateCacheMap.set(template, caches);
				}
				const { raw: cache, inprogress } = caches;
				const request = {
					start: options.page * options.size - options.size,
					end: options.page * options.size,
					query: ''
				};

				const stringifiedRequest = JSON.stringify(request);
				const requestInFlight = inprogress.get(stringifiedRequest);
				if (requestInFlight) {
					return undefined;
				}
				const syntheticIds: string[] = [];
				for (let i = 0; i < request.end - request.start; i++) {
					syntheticIds[i] = `${request.query}/${request.start + i}`;
				}
				const incompletes: string[] = [];
				let shouldRead = false;
				const items: any[] = [];
				syntheticIds.forEach((syntheticId, idx) => {
					const item = cache.get(syntheticId);
					if (item) {
						if (item.pending) {
							incompletes.push(syntheticId);
						} else if (item.mtime - Date.now() + ttl < 0) {
							incompletes.push(syntheticId);
							shouldRead = true;
							items[idx] = item.value;
						} else {
							items[idx] = item.value;
						}
					} else {
						incompletes.push(syntheticId);
						shouldRead = true;
					}
				});
				if (incompletes.length) {
					cache.subscribe(incompletes, () => {
						invalidator();
					});
				} else {
					return items;
				}
				if (shouldRead) {
					syntheticIds.forEach((syntheticId, idx) => {
						cache.addSyntheticId(syntheticId);
					});
					const put = ({
						start,
						end,
						items,
						idKey
					}: {
						start: number;
						end: number;
						items: any[];
						idKey: string;
					}) => {
						items.forEach((item, idx) => {
							const syntheticId = syntheticIds[idx]
								? syntheticIds[idx]
								: `${request.query}/${start + idx}`;
							cache.set(syntheticId, {
								idKey,
								value: item,
								pending: false,
								mtime: Date.now()
							});
						});
						inprogress.set(stringifiedRequest, false);
					};
					inprogress.set(stringifiedRequest, true);
					template.read(request, { put });
					let items: any[] = [];
					for (let i = 0; i < syntheticIds.length; i++) {
						const syntheticId = syntheticIds[i];
						const item = cache.get(syntheticId);
						if (item && !item.pending) {
							items[i] = item.value;
						} else {
							return undefined;
						}
					}
					return items;
				}
			}
		};
	}
);

export function createResourceMiddleware<
	O extends { template: { [index: string]: (...args: any[]) => void }; data: any }
>() {
	return middleware.withType<
		{ getOrRead: any; createOptions: any },
		Properties<O['data'], O['template'] & ResourceTemplate>
	>();
}

// interface MyTemplate {
// 	save: () => void;
// }

// type MyTemplate = {
// 	save: (item: { foo: string }) => void;
// }

// const a = createResourceMiddleware<{ data: { label: string; value: string }; template: MyTemplate }>();

// const Widget = create({ resource: a })(({ properties, middleware: { resource } }) => {
// 	return 'widget';
// });

// const options = {
// 	page: 1,
// 	size: 20,
// 	query: { foo: { value: '', type: 'exact/find' }, bar: { value: '', type: 'filter' } }
// };

// const template: (options: any) => { template: (options: any) => MyTemplate; templateOptions: any } = createTemplate<{
// 	id: string;
// 	data: { label: ''; value: '' }[];
// }>((options) => {
// 	return {
// 		read: () => {},
// 		save: () => {}
// 	};
// }) as any;

// const App = create({ resource: a })(({ middleware: { resource } }) => {
// 	resource.save(template);
// 	return (
// 		<div>
// 			<Widget resource={{ data: [{ label: '', value: '' }], id: '' }} />
// 			<Widget resource={template({ data: [{ label: '', value: '' }], id: '' })} />
// 		</div>
// 	);
// });
