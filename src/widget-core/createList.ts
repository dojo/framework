import { ComposeFactory } from 'dojo-compose/compose';
import createWidget, { Widget, WidgetState, WidgetOptions } from './createWidget';
import createListMixin, { ListMixin, ListMixinState } from './mixins/createListMixin';

export interface ListState extends WidgetState, ListMixinState { }

export interface List extends Widget<ListState>, ListMixin { }

export interface ListFactory extends ComposeFactory<List, WidgetOptions<ListState>> { }

const createList: ListFactory = createWidget
	.mixin(createListMixin);

export default createList;
