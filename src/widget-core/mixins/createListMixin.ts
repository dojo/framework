import { h, VNode } from 'maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import createStateful, { Stateful, StatefulOptions, State } from 'dojo-compose/mixins/createStateful';

export interface ListStateItem {
	[property: string]: any;
	id: string | number;
	label: string;
}

export interface ListMixinState<I extends ListStateItem> extends State {
	/**
	 * Any items that are to be rendered by the list
	 */
	items?: I[];
}

export interface TagNames {
	/**
	 * The tag name for the list item
	 */
	list: string;

	/**
	 * The tag name for the list items
	 */
	item: string;
}

export interface List {
	/**
	 * A map of tag names to use with the list items
	 */
	tagNames: TagNames;

	/**
	 * Return an array of VNodes/strings the represent the rendered results of the list of this instance
	 */
	getChildrenNodes(): (VNode | string)[];
}

/**
 * A mixin that provides the functionality to render a list of items that are in its state
 */
export type ListMixin = List & Stateful<ListMixinState<ListStateItem>>;

export interface ListMixinFactory extends ComposeFactory<ListMixin, StatefulOptions<ListMixinState<ListStateItem>>> {
	<I extends ListStateItem>(options?: StatefulOptions<ListMixinState<I>>): List;
}

const createListMixin: ListMixinFactory = createStateful
	.mixin({
		mixin: <List> {
			getChildrenNodes(this: ListMixin): (VNode | string)[] {
				if (this.state && this.state.items) {
					const items = this.state.items;
					return [ h(this.tagNames.list, items.map((item) => h(this.tagNames.item, { key: item }, [ item.label ]))) ];
				}
				return [];
			},

			tagNames: {
				list: 'ul',
				item: 'li'
			}
		}
	});

export default createListMixin;
