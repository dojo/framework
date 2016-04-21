import { h, VNode } from 'maquette/maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import { Handle } from 'dojo-core/interfaces';
import WeakMap from 'dojo-core/WeakMap';
import { CachedRenderMixin, CachedRenderState, CachedRenderParent } from './createCachedRenderMixin';
import createContainerMixin, { ContainerMixin, ContainerChild, ContainerMixinState, ContainerMixinOptions } from './createContainerMixin';

export interface TabbedState extends ContainerMixinState { }

export interface TabbedChildState extends CachedRenderState {
	/**
	 * Whether the current child is the active/visible child
	 */
	active?: boolean;

	/**
	 * Should this child be allowed to be closed/destroyed
	 */
	closable?: boolean;

	/**
	 * Should this child represent that it is in a changed state that is not persisted
	 */
	changed?: boolean;
}

export interface TabbedChild extends ContainerChild, CachedRenderMixin<TabbedChildState> {
	/**
	 * The childs parent
	 */
	parent?: CachedRenderParent;
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
			/* TODO: actually close the tab */
			console.log('close');
			return;
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
					return [
						h('div.tab-label', { onclick: tabListeners.onclickTabListener }, [ tab.state.label ]),
						/* TODO: only show the close when the tab state is closable */
						h('div.tab-close', { onclick: tabListeners.onclickTabCloseListener }, [ 'X' ])
					];
				}

				/* We need to generate a set of VDom the represents the buttons */
				/* TODO: Allow the location of the tab bar to be set (top/left/bottom/right) */
				const tabs: VNode[] = [];
				const childrenNodes: VNode[] = [];
				tabbed.children.forEach((tab, key) => {
					if (tab === activeTab) {
						const activeTabVNode = tab.render();
						activeTabVNode.properties.classes['visible'] = true;
						childrenNodes.push(activeTabVNode);
						tabs.push(h(tabbed.tagNames.tab + '.active', { key: tab }, getTabChildVNode(tab)));
					}
					else {
						/* TODO: Having trouble changing the classes on the subnodes, so once visible always visible,
						 * The only choice was to just omit non visible nodes from the VDom, though I am not sure
						 * this makes a lot of sense, because with a big render, it is a lot of DOM to add and remove
						 */
						tabs.push(h(tabbed.tagNames.tab, { key: tab }, getTabChildVNode(tab)));
					}
				});

				return [ h(tabbed.tagNames.tabBar, tabs), ...childrenNodes ];
			}
		}
	}) as TabbedMixinFactory;

export default createTabbedMixin;
