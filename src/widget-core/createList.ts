import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createListMixin, { ListMixin, ListMixinState, ListStateItem } from './mixins/createListMixin';

export interface ListState<I extends ListStateItem> extends WidgetState, ListMixinState<I> { }

export type List<I extends ListStateItem> = Widget<ListState<I>> & ListMixin;

export interface ListFactory extends ComposeFactory<List<ListStateItem>, WidgetOptions<ListState<ListStateItem>>> {
	<I extends ListStateItem>(options?: WidgetOptions<ListState<I>>): List<I>;
}

const createList: ListFactory = createWidget
	.mixin(createListMixin)
	.extend({
		tagName: 'dojo-list'
	});

export default createList;
