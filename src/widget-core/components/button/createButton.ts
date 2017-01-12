import { VNodeProperties } from 'dojo-interfaces/vdom';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetProperties, WidgetFactory } from './../../interfaces';
import createFormFieldMixin, { FormFieldMixin } from '../../mixins/createFormFieldMixin';

export interface ButtonProperties extends WidgetProperties {
	label?: string;
	name?: string;
	onClick?(event: MouseEvent): void;
}

export type Button = Widget<ButtonProperties> & FormFieldMixin<string, any> & {
	onClick(event?: MouseEvent): void;
};

export interface ButtonFactory extends WidgetFactory<Button, ButtonProperties> { }

const createButton: ButtonFactory = createWidgetBase
	.mixin(createFormFieldMixin)
	.mixin({
		mixin: {
			onClick(this: Button, event: MouseEvent) {
				this.properties.onClick && this.properties.onClick(event);
			},
			nodeAttributes: [
				function(this: Button): VNodeProperties {
					return { innerHTML: this.properties.label, onclick: this.onClick };
				}
			],
			tagName: 'button',
			type: 'button'
		}
	});

export default createButton;
