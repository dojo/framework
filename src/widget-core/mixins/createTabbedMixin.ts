import { h, VNode } from 'maquette/maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import createDestroyable from 'dojo-compose/mixins/createDestroyable';
import { EventedListener, TargettedEventObject } from 'dojo-compose/mixins/createEvented';
import { StateChangeEvent } from 'dojo-compose/mixins/createStateful';
import { Handle } from 'dojo-core/interfaces';
import { List } from 'immutable/immutable';
import WeakMap from 'dojo-core/WeakMap';
import { CachedRenderMixin, CachedRenderState, CachedRenderParent } from './createCachedRenderMixin';
import { Closeable, CloseableState } from './createCloseableMixin';
import createContainerMixin, { ContainerMixin, ContainerChild, ContainerMixinState, ContainerMixinOptions } from './createContainerMixin';

export interface TabbedState extends ContainerMixinState { }

export interface TabbedChildState extends CachedRenderState, CloseableState {
	/**
	 * Whether the current child is the active/visible child
	 */
	active?: boolean;

	/**
	 * Should this child represent that it is in a changed state that is not persisted
	 */
	changed?: boolean; /* TODO: Implement this feature, currently it does not affect anything */
}

export interface TabbedChild extends ContainerChild, Closeable<TabbedChildState>, CachedRenderMixin<TabbedChildState> {
	/**
	 * The childs parent
	 */
	parent?: CachedRenderParent;

	on(type: 'close', listener: EventedListener<CloseEvent>): Handle;
	on(type: 'statechange', listener: EventedListener<StateChangeEvent<TabbedChildState>>): Handle;
	on(type: string, listener: EventedListener<TargettedEventObject>): Handle;
}

export interface TabbedMixin<C extends TabbedChild, S extends TabbedState> extends ContainerMixin<C, S> {
	/**
	 * Tag names used by sub parts of this widget
	 */
	tagNames: {
		tabBar: string;
		tab: string;
	};

	/**
	 * The currently active (visible) child
	 */
	activeChild: C;
}

/**
 * A utility function that sets the supplied tab as the active tab on the supplied tabbed mixin
 * @param tabbed The tabbed mixin to set the active child on
 * @param activeTab The tab to make active/visible
 */
function setActiveTab(tabbed: TabbedMixin<TabbedChild, TabbedState>, activeTab: TabbedChild) {
	if (activeTab.parent === tabbed) {
		tabbed.children.forEach((tab) => {
			if (tab !== activeTab && tab.state.active) {
				tab.setState({ active: false });
			}
		});
		if (!activeTab.state.active) {
			activeTab.setState({ active: true });
		}
	}
}

/**
 * Return the currently active tab, if no tab is active, the first tab will be made active
 * @param tabbed The tabbed mixin to return the active child for
 */
function getActiveTab(tabbed: TabbedMixin<TabbedChild, TabbedState>): TabbedChild {
	let activeTab = tabbed.children.find((tab) => tab.state.active);
	/* TODO: when a tab closes, instead of going back to the previous active tab, it will always
	 * revert to the first tab, maybe it would be better to keep track of a stack of tabs? */
	if (!activeTab) {
		activeTab = tabbed.children.first();
	}
	if (activeTab) {
		setActiveTab(tabbed, activeTab);
	}
	return activeTab;
}

interface TabListeners {
	/**
	 * The listener for when a tab is clicked on (selected)
	 */
	onclickTabListener(evt: MouseEvent): boolean;

	/**
	 * The listener for when the close button is clicked
	 */
	onclickTabCloseListener(evt: MouseEvent): boolean;
}

/**
 * A weakmap of tabs and their listeners
 */
const tabListenersMap = new WeakMap<TabbedChild, TabListeners>();

/**
 * A utility function that sets the listeners for a tab which are then passed in the generated VDom.  The function
 * returns a handle that can be used to clean up the listeners
 * @param tabbed The tabbed mixin that should be effected when the listeners fire
 * @param tab The tab that the listeners are referring to
 */
function setTabListeners(tabbed: TabbedMixin<TabbedChild, TabbedState>, tab: TabbedChild): Handle {
	/* TODO: There is an edge case where if a child tab is moved from one tabbed panel to another without being destroyed */
	tabListenersMap.set(tab, {
		onclickTabListener(evt: MouseEvent): boolean {
			evt.preventDefault();
			setActiveTab(tabbed, tab);
			return true;
		},
		onclickTabCloseListener(evt: MouseEvent): boolean {
			evt.preventDefault();
			tab.close().then((result) => {
				/* while Maquette schedules a render on DOM events, close happens async, therefore we have to
				 * invalidate the tabbed when resolved, otherwise the tab panel won't reflect the actual
				 * children */
				if (result) {
					tabbed.invalidate();
				};
			});
			return true;
		}
	});
	return {
		destroy() {
			const tabListeners = tabListenersMap.get(tab);
			if (tabListeners) {
				tabListenersMap.delete(tab);
			}
		}
	};
}

/**
 * Return (or initilize) the tab listeners for a tab
 * @param tabbed The tabbed mixin that the listerns refer to
 * @param tab The tab that the listeners should be retrieved for
 */
function getTabListeners(tabbed: TabbedMixin<TabbedChild, TabbedState>, tab: TabbedChild): TabListeners {
	if (!tabListenersMap.has(tab)) {
		/* When the tab is destroyed, it will remove its listeners */
		tab.own(setTabListeners(tabbed, tab));
	}
	return tabListenersMap.get(tab);
}

export interface TabbedMixinFactory extends ComposeFactory<TabbedMixin<TabbedChild, ContainerMixinOptions<TabbedState>>, ContainerMixinOptions<TabbedState>> {}

const childrenNodesCache = new WeakMap<TabbedMixin<TabbedChild, TabbedState>, VNode[]>();

let tabbedList = List<TabbedMixin<TabbedChild, TabbedState>>();

const createTabbedMixin = createContainerMixin
	.mixin({
		mixin: {
			tagName: 'dojo-panel-mixin',
			tagNames: {
				tabBar: 'ul',
				tab: 'li'
			},

			get activeChild(): TabbedChild {
				return getActiveTab(this);
			},

			set activeChild(value: TabbedChild) {
				setActiveTab(this, value);
			},

			getChildrenNodes(): (VNode | string)[] {
				const tabbed: TabbedMixin<TabbedChild, TabbedState> = this;
				const activeTab = getActiveTab(tabbed);

				function getTabChildVNode(tab: TabbedChild): (VNode | string)[] {
					const tabListeners = getTabListeners(tabbed, tab);
					const nodes = [ h('div.tab-label', { onclick: tabListeners.onclickTabListener }, [ tab.state.label ]) ];
					if (tab.state.closeable) {
						nodes.push(h('div.tab-close', { onclick: tabListeners.onclickTabCloseListener }, [ 'X' ]));
					}
					return nodes;
				}

				/* We need to generate a set of VDom the represents the buttons */
				/* TODO: Allow the location of the tab bar to be set (top/left/bottom/right) */
				const tabs: VNode[] = [];
				let childrenNodes = childrenNodesCache.get(tabbed);

				/* Best to discard the childrenNodes array if the sizes don't match, otherwise
				 * we can get some vdom generation issues when adding or removing tabs */
				if (!childrenNodes || childrenNodes.length !== tabbed.children.size) {
					childrenNodes = Array(tabbed.children.size);
					childrenNodesCache.set(tabbed, childrenNodes);
				}

				tabbed.children.forEach((tab, key) => {
					const isActiveTab = tab === activeTab;
					if (isActiveTab || (childrenNodes[key] && childrenNodes[key].properties.classes['visible'])) {
						tab.invalidate();
						const tabVNode = tab.render();
						tabVNode.properties.classes['visible'] = isActiveTab;
						childrenNodes[key] = tabVNode;
					}
					/* else, this tab isn't active and hasn't been previously rendered */

					tabs.push(h(tabbed.tagNames.tab, {
						key: tab,
						classes: { active: isActiveTab },
						'data-tab-id': `${tabbed.state.id || tabbedList.indexOf(tabbed)}-${tab.state.id || key}`
					}, getTabChildVNode(tab)));
				});

				return [ h(tabbed.tagNames.tabBar, tabs), h('div.panels', childrenNodes) ];
			}
		}
	})
	.mixin({
		mixin: createDestroyable,
		initialize(instance: TabbedMixin<TabbedChild, TabbedState>) {
			tabbedList = tabbedList.push(instance);
			instance.own({
				destroy() {
					childrenNodesCache.delete(instance);
					tabbedList = tabbedList.delete(tabbedList.indexOf(instance));
				}
			});
		}
	}) as TabbedMixinFactory;

export default createTabbedMixin;
