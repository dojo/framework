import { DNode } from 'dojo-interfaces/widgetBases';
import d from './../util/d';
import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './../bases/createWidgetBase';
import { Widget, WidgetState, WidgetOptions } from 'dojo-interfaces/widgetBases';

export interface ListStateItem {
	[property: string]: any;
	id: string | number;
	label: string;
}

export interface ListMixinState<I extends ListStateItem> extends WidgetState {
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
}

/**
 * A mixin that provides the functionality to render a list of items that are in its state
 */
export type ListMixin = List & Widget<ListMixinState<ListStateItem>>;

export interface ListMixinFactory extends ComposeFactory<ListMixin, WidgetOptions<ListMixinState<ListStateItem>>> {}

const createListMixin: ListMixinFactory = createWidgetBase
	.mixin({
		mixin: <List> {
			tagNames: {
				list: 'ul',
				item: 'li'
			}
		}
	})
	.extend({
		childNodeRenderers: [
			function(this: ListMixin): DNode[] {
				if (this.state && this.state.items) {
					const items = this.state.items;
					return [ d(this.tagNames.list, {}, items.map((item) => d(this.tagNames.item, { key: item, innerHTML: item.label }))) ];
				}
				return [];
			}
		]
	});

export default createListMixin;
