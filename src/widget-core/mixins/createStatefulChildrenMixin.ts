import { ComposeFactory } from 'dojo-compose/compose';
import createEvented from 'dojo-compose/mixins/createEvented';
import createStateful, { Stateful, StatefulOptions, StateChangeEvent } from 'dojo-compose/mixins/createStateful';
import Map from 'dojo-core/Map';
import Promise from 'dojo-core/Promise';
import WeakMap from 'dojo-core/WeakMap';
import { List, Map as ImmutableMap } from 'immutable/immutable';
import { Child, ChildListEvent } from './interfaces';
import { isList } from '../util/lang';

export interface ChildrenRegistry<C extends Child> {
	get<D extends C>(id: string | symbol): Promise<D>;
	identify(value: C): string | symbol;
}

export interface StatefulChildrenState {
	children?: string[];
}

export interface StatefulChildrenOptions<C extends Child, S extends StatefulChildrenState> extends StatefulOptions<S> {
	widgetRegistry?: ChildrenRegistry<C>;
}

export type StatefulChildren<C extends Child, S extends StatefulChildrenState> = Stateful<S> & {
	children: List<C> | ImmutableMap<string, C>;
}

export interface StatefulChildrenMixinFactory extends ComposeFactory<Stateful<StatefulChildrenState>, StatefulChildrenOptions<Child, StatefulChildrenState>> {
	<C extends Child>(options?: StatefulChildrenOptions<C, StatefulChildrenState>): Stateful<StatefulChildrenState>;
}

/**
 * Contains a reference to the widgetRegistry per instance
 */
const registryMap = new WeakMap<StatefulChildren<Child, StatefulChildrenState>, ChildrenRegistry<Child>>();

/**
 * Contains a Map of children IDs per instance
 */
const childrenIdMap = new WeakMap<StatefulChildren<Child, StatefulChildrenState>, Map<string, Child>>();

/**
 * Contains the last list of children we analyzed
 */
const cachedChildrenIDs = new WeakMap<StatefulChildren<Child, StatefulChildrenState>, List<string>>();

/**
 * Internal statechange listener which deals with
 */
function manageChildren(evt: StateChangeEvent<StatefulChildrenState>): void {
	const parent: StatefulChildren<Child, StatefulChildrenState> = <any> evt.target;

	const widgetRegistry = registryMap.get(parent);
	if (!widgetRegistry) {
		/* We cannot manage children via state, as we have no way of resolving
		 * the children IDs */
		return;
	}
	if (!cachedChildrenIDs.has(parent)) {
		cachedChildrenIDs.set(parent, List<string>());
	}
	const currentChildrenIDs = List(evt.state.children);
	if (currentChildrenIDs.equals(cachedChildrenIDs.get(parent))) {
		/* There are no changes to the children */
		return;
	}
	cachedChildrenIDs.set(parent, currentChildrenIDs);
	const resolvingWidgets: [ Promise<Child>, string, number ][] = [];
	let cachedChildren = childrenIdMap.get(parent);

	/* Sometimes we are dealing with children that are a list, somtimes, a Map */
	const childrenList: Child[] = [];
	const childrenMap: { [ id: string ]: Child } = {};
	const childrenIsList = isList(parent.children);

	/* Iterate through children ids, retrieving reference to widget or otherwise
	 * requesting the widget from the registry */
	currentChildrenIDs.forEach((id, key) => cachedChildren.has(id)
		? childrenIsList
			? childrenList[key] = cachedChildren.get(id)
			: childrenMap[id] = cachedChildren.get(id)
		/* Tuple of Promise, child ID, position in child list */
		: resolvingWidgets.push([ widgetRegistry.get(id), id, key ]));

	/* If we have requests for widgets outstanding, we need to wait for them to be
	 * resolved and then populate them in the children */
	if (resolvingWidgets.length) {
		Promise.all(resolvingWidgets.map(([ promise ]) => promise))
			.then((widgets) => {
				widgets.forEach((widget, idx) => {
					const [ , id, key ] = resolvingWidgets[idx];
					if (childrenIsList) {
						childrenList[key] = widget;
					}
					else {
						childrenMap[id] = widget;
					}
					cachedChildren.set(id, widget);
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

function manageChildrenState(evt: ChildListEvent<any, Child>) {
	const parent: StatefulChildren<Child, StatefulChildrenState> = evt.target;

	const widgetRegistry = registryMap.get(parent);
	if (!widgetRegistry) {
		/* We cannot manage children via state, as we have no way of resolving
		 * the children IDs */
		return;
	}

	const evtChildren = evt.children;

	const currentChildrenIDs = <List<string>> (isList(evtChildren)
		? evtChildren.map((widget) => widgetRegistry.identify(widget))
		: List(evtChildren.keys()));

	if (!currentChildrenIDs.equals(List(parent.state.children))) {
		const children = currentChildrenIDs.toArray();
		parent.setState({ children });
	}
}

const createStatefulChildrenMixin: StatefulChildrenMixinFactory = createStateful
	.mixin({
		mixin: createEvented,
		initialize(instance: StatefulChildren<Child, StatefulChildrenState>, options: StatefulChildrenOptions<Child, StatefulChildrenState>) {
			if (options) {
				const { widgetRegistry } = options;
				if (widgetRegistry) {
					registryMap.set(instance, widgetRegistry);
					childrenIdMap.set(instance, new Map<string, Child>());
					instance.own(instance.on('statechange', manageChildren));
					instance.own(instance.on('childlist', manageChildrenState));
					instance.own({
						destroy() {
							registryMap.delete(instance);
							childrenIdMap.delete(instance);
							cachedChildrenIDs.delete(instance);
						}
					});
				}
			}
		}
	});

export default createStatefulChildrenMixin;
