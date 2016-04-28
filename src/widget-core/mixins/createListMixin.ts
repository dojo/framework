import { h, VNode } from 'maquette/maquette';
import { ComposeFactory } from 'dojo-compose/compose';
import { StatefulOptions } from 'dojo-compose/mixins/createStateful';
import createCachedRenderMixin, { CachedRenderMixin, CachedRenderState } from './createCachedRenderMixin';

export interface ListStateItem {
	[property: string]: any;
	id: string | number;
	label: string;
}

export interface ListMixinState extends CachedRenderState {
	items?: ListStateItem[];
}

export interface TagNames {
	list: string;
	item: string;
}

export interface ListMixin extends CachedRenderMixin<ListMixinState> {
	getChildrenNodes(): (VNode | string)[];
	tagName: string;
	tagNames: TagNames;
}

const createListMixin: ComposeFactory<ListMixin, StatefulOptions<ListMixinState>> = createCachedRenderMixin
	.mixin({
		mixin: {
			getChildrenNodes(): (VNode | string)[] {
				const list: ListMixin = this;
				if (list.state && list.state.items) {
					const items = list.state.items;
					return [ h(list.tagNames.list, items.map((item) => h(list.tagNames.item, { key: item }, [ item.label ]))) ];
				}
				return [];
			},

			tagName: 'dojo-list',
			tagNames: {
				list: 'ul',
				item: 'li'
			}
		}
	});

export default createListMixin;
