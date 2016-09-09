import compose, { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, StatefulOptions, StateChangeEvent, State } from 'dojo-compose/mixins/createStateful';
import Map from 'dojo-shim/Map';
import Promise from 'dojo-shim/Promise';
import WeakMap from 'dojo-shim/WeakMap';
import { List, Map as ImmutableMap } from 'immutable';
import { Child, ChildListEvent, CreatableRegistry, RegistryProvider } from './interfaces';
import { isList } from '../util/lang';

export interface StatefulChildrenState {
	/**
	 * Any children that the widget should "own"
	 */
	children?: string[];
}

export interface StatefulChildrenOptions<C extends Child, S extends StatefulChildrenState> extends StatefulOptions<S> {
	/**
	 * The registry provider that should be used to resolve a widget registry and subsequently, widgets
	 */
	registryProvider?: RegistryProvider<C>;
}

export interface CreateChildrenMap<C extends Child, O extends StatefulOptions<State>> {
	[label: string]: {
		factory: ComposeFactory<C, O>;
		options?: O;
	};
}

/**
 * Interface that represents and item from a returned `.createChildren()` map
 */
export interface CreateChildrenResultsItem<C extends Child> {
	id: string;
	widget: C;
}

/**
 * Interface that describes the children results returned from `.createChildren()`
 */
export interface CreateChildrenResults<C extends Child> {
	[label: string]: CreateChildrenResultsItem<C>;
}

export type StatefulChildren<C extends Child, S extends StatefulChildrenState> = Stateful<S> & {
	/**
	 * The children that are associated with this widget
	 */
	children: List<C> | ImmutableMap<string, C>;

	/**
	 * Creates an instance based on the supplied factory and adds the child to this parent
	 * returning a promise which resolves with the ID and the instace.
	 *
	 * @param factory The factory to use to create the child
	 * @param options Any options that should be used when creating the child
	 */
	createChild<D extends C, O extends StatefulOptions<S>, S extends State>(
		factory: ComposeFactory<D, O>, options?: O): Promise<[string, D]>;

	/**
	 * Creates a set or map of instances based upon the supplied data
	 *
	 * @param children the set or map of children factories and options
	 */
	createChildren(children: [ComposeFactory<C, any>, any][]): Promise<[string, any][]>;
	createChildren(children: CreateChildrenMap<C, any>): Promise<CreateChildrenResults<C>>;

	/**
	 * The ID for this widget
	 */
	id?: string;
}

export interface StatefulChildrenMixinFactory extends ComposeFactory<StatefulChildren<Child, StatefulChildrenState>, StatefulChildrenOptions<Child, StatefulChildrenState>> {
	<C extends Child>(options?: StatefulChildrenOptions<C, StatefulChildrenState>): StatefulChildren<C, StatefulChildrenState>;
}

interface ManagementState {
	/**
	 * A map of children to widget instances, so they don't have to be requested subsequently from the registry
	 */
	cache?: Map<string, Child>;

	/**
	 * The current set of children widgets
	 */
	current?: List<string>;

	/**
	 * A generation number to avoid race conditions when managing children
	 */
	generation: number;

	/**
	 * A instance UID to be used when generating child widget IDs
	 */
	childrenUID: number;

	/**
	 * This widget's ID which was potentially passed in creation options
	 */
	id: string | undefined;

	/**
	 * A reference to the widget registry that is used for resolving and creating children
	 */
	registry: CreatableRegistry<Child>;
}

/**
 * Map that holds state for manageChildren and manageChildrenState by widget instance.
 */
const managementMap = new WeakMap<StatefulChildren<Child, StatefulChildrenState>, ManagementState>();

/**
 * Internal statechange listener which deals with managing the children when a state
 * change occurs on the parent
 *
 * @param evt The state change event of the parent
 */
function manageChildren(evt: StateChangeEvent<StatefulChildrenState>): void {
	const parent: StatefulChildren<Child, StatefulChildrenState> = <any> evt.target;

	/* Assume this function cannot be called without the widget being in the management map */
	const internalState = managementMap.get(parent);
	/* Initialize cache */
	if (!internalState.cache) {
		internalState.cache = new Map<string, Child>();
	}
	/* Initialize current children IDs */
	if (!internalState.current) {
		internalState.current = List<string>();
	}
	/* Increment the generation vector. Used when children are replaced asynchronously to ensure
	 * no newer state is overriden. */
	const generation = ++internalState.generation;

	const currentChildrenIDs = List(evt.state.children);
	if (currentChildrenIDs.equals(internalState.current)) {
		/* There are no changes to the children */
		return;
	}

	internalState.current = currentChildrenIDs;
	const resolvingWidgets: [ Promise<Child>, string, number ][] = [];

	/* Sometimes we are dealing with children that are a list, somtimes, a Map */
	const childrenList: Child[] = [];
	const childrenMap: { [ id: string ]: Child } = {};
	const childrenIsList = isList(parent.children);

	/* Iterate through children ids, retrieving reference to widget or otherwise
	 * requesting the widget from the registry */
	currentChildrenIDs.forEach((id, key) => internalState.cache.has(id)
		? childrenIsList
			? childrenList[key] = internalState.cache.get(id)
			: childrenMap[id] = internalState.cache.get(id)
		/* Tuple of Promise, child ID, position in child list */
		: resolvingWidgets.push([ internalState.registry.get(id), id, key ]));

	/* If we have requests for widgets outstanding, we need to wait for them to be
	 * resolved and then populate them in the children */
	if (resolvingWidgets.length) {
		Promise.all(resolvingWidgets.map(([ promise ]) => promise))
			.then((widgets) => {
				/* Only replace children if there is no newer state that either already has, or soon will,
				 * replace the original listeners. */
				if (internalState.generation !== generation) {
					return;
				}

				widgets.forEach((widget, idx) => {
					const [ , id, key ] = resolvingWidgets[idx];
					if (childrenIsList) {
						childrenList[key] = widget;
					}
					else {
						childrenMap[id] = widget;
					}
					internalState.cache.set(id, widget);
				});
				/* Some parents have a List, some have a Map, so setting them varies */
				parent.children = isList(parent.children) ? List(childrenList) : ImmutableMap<string, Child>(childrenMap);
			}, (error) => {
				/* A promise got rejected for some reason */
				parent.emit({
					type: 'error',
					target: parent,
					error: error
				});
			});
	}
	else {
		/* Otherwise we can just set the children */
		parent.children = isList(parent.children) ? List(childrenList) : ImmutableMap<string, Child>(childrenMap);
	}
}

/**
 * Internal function to manage the state of the children when a child list event occurs
 *
 * @param evt The child list event from the parent
 */
function manageChildrenState(evt: ChildListEvent<any, Child>) {
	const parent: StatefulChildren<Child, StatefulChildrenState> = evt.target;

	/* Assume this function cannot be called without the widget being in the management map */
	const { registry } = managementMap.get(parent);

	const evtChildren = evt.children;

	const currentChildrenIDs = <List<string>> (isList(evtChildren)
		? evtChildren.map((widget) => registry.identify(widget))
		: List(evtChildren.keys()));

	if (!currentChildrenIDs.equals(List(parent.state.children))) {
		const children = currentChildrenIDs.toArray();
		parent.setState({ children });
	}
}

function isCreateChildrenMap<C extends Child, O extends StatefulOptions<S>, S extends State>(value: any): value is CreateChildrenMap<C, O> {
	return typeof value === 'object' && !Array.isArray(value);
}

const createStatefulChildrenMixin = compose({
		createChildren(
			this: StatefulChildren<Child, StatefulChildrenState>,
			children: CreateChildrenMap<Child, StatefulOptions<State>> | [ComposeFactory<Child, StatefulOptions<State>>, StatefulOptions<State>][]
		): Promise<[string, Child][]> | Promise<CreateChildrenResults<Child>> {
			if (managementMap.has(this)) {
				const management = managementMap.get(this);
				const { registry, id } = management;
				if (isCreateChildrenMap(children)) {
					/* Because we have a map, but Promise.all only takes an array, we have to "flatten" the map into
					 * two arrays, of promises and labels */
					const promises: Promise<[ string, Child ]>[] = [];
					const labels: string[] = [];
					for (const label in children) {
						const { factory, options = {} } = children[label];
						if (!options.id) {
							/* See createChild for explination of this logic */
							options.id = `${id || this.id}-child-${++management.childrenUID}`;
						}
						promises.push(registry.create(factory, options));
						labels.push(label);
					}
					return Promise
						.all(promises)
						.then((items) => {
							/* create a handle which will destroy the children created */
							const instances = items.map(([ , child ]) => child );
							this.own({
								destroy() {
									return instances.map((instance) => instance.destroy());
								}
							});

							/* Now we need to constitute our map to return it */
							const results: CreateChildrenResults<Child> = {};
							const newChildren = items.map(([ id, widget ], idx) => {
								results[labels[idx]] = { id, widget };
								return id;
							});
							const children = this.state.children ? [ ...this.state.children, ...newChildren ] : newChildren;
							this.setState({ children });
							return results;
						});
				}
				else {
					return Promise
						.all(children.map(([ factory, options ]) => {
							if (!options.id) {
								/* depending upon the construction lifecycle, the this.id may not have been properly set and will
								 * auto-generate an ID, therefore we have copied the ID out of options, if it was present and will
								 * use that as a base for autogenerating the child widget's ID */
								options.id = `${id || this.id}-child-${++management.childrenUID}`;
							}
							return registry.create(factory, options);
						}))
						.then((items) => {
							/* create a handle which will destroy the children created */
							const instances = items.map(([ , child ]) => child );
							this.own({
								destroy() {
									return instances.map((instance) => instance.destroy());
								}
							});

							const newChildren = items.map(([ id ]) => id);
							const children = this.state.children ? [ ...this.state.children, ...newChildren ] : newChildren;
							this.setState({ children });
							return items;
						});
				}
			}
			return Promise.reject(new Error('Unable to resolve registry'));
		},

		createChild<C extends Child>(
			this: StatefulChildren<Child, StatefulChildrenState>,
			factory: ComposeFactory<C, any>,
			options: any = {}
		): Promise<[string, C]> {
			return this.createChildren([ [ factory, options ] ]).then(([ tuple ]) => tuple);
		}
	})
	.mixin(createStateful)
	.mixin({
		mixin: createEvented,
		initialize(
			instance: StatefulChildren<Child, StatefulChildrenState>,
			{ registryProvider, id }: StatefulChildrenOptions<Child, StatefulChildrenState> = {}
		) {
			if (registryProvider) {
				const registry = registryProvider.get('widgets');
				managementMap.set(instance, {
					registry,
					generation: 0,
					childrenUID: 0,
					id
				});

				instance.own(instance.on('statechange', manageChildren));
				instance.own(instance.on('childlist', manageChildrenState));
			}
		}
	}) as StatefulChildrenMixinFactory;

export default createStatefulChildrenMixin;
