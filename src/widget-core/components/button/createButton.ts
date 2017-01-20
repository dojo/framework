import { VNodeProperties } from '@dojo/interfaces/vdom';
import createWidgetBase from '../../createWidgetBase';
import { Widget, WidgetProperties, WidgetFactory } from './../../interfaces';

export interface ButtonProperties extends WidgetProperties {
	label?: string;
	name?: string;
	disabled?: boolean;
	onClick?(event: MouseEvent): void;
}

export type Button = Widget<ButtonProperties> & {
	onClick(event?: MouseEvent): void;
};

export interface ButtonFactory extends WidgetFactory<Button, ButtonProperties> { }

const createButton: ButtonFactory = createWidgetBase
	.mixin({
		mixin: {
			onClick(this: Button, event: MouseEvent) {
				this.properties.onClick && this.properties.onClick(event);
			},
			nodeAttributes: [
				function(this: Button): VNodeProperties {
					const { type, properties: { label, name, disabled } } = this;
					return { type, innerHTML: label, onclick: this.onClick, name, disabled: Boolean(disabled) };
				}
			],
			tagName: 'button',
			type: 'button'
		}
	});

export default createButton;
