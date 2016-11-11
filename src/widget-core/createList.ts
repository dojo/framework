import { ComposeFactory } from 'dojo-compose/compose';
import createWidgetBase from './bases/createWidgetBase';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createListMixin, { ListMixin, ListMixinState, ListStateItem } from './mixins/createListMixin';

export interface ListState<I extends ListStateItem> extends WidgetState, ListMixinState<I> { }

export type List<I extends ListStateItem> = Widget<ListState<I>> & ListMixin;

export interface ListFactory extends ComposeFactory<List<ListStateItem>, WidgetOptions<ListState<ListStateItem>>> {
	<I extends ListStateItem>(options?: WidgetOptions<ListState<I>>): List<I>;
}

const createList: ListFactory = createWidgetBase
	.mixin(createListMixin)
	.extend({
		tagName: 'dojo-list'
	});

export default createList;
