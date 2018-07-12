import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { DNode } from '../../../src/interfaces';

export interface ButtonProperties {
	id: string;
	label: string;
	onClick: () => void;
}

export class Button extends WidgetBase<ButtonProperties> {
	protected render(): DNode {
		const { id, label, onClick } = this.properties;

		return v('div', { classes: ['col-sm-6', 'smallpad'] }, [
			v(
				'button',
				{
					id,
					classes: ['btn', 'btn-primary', 'btn-block'],
					onclick: onClick
				},
				[label]
			)
		]);
	}
}
