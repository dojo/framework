import { WidgetBase } from '../../../src/WidgetBase';
import { WidgetProperties } from '../../../src/interfaces';
import { v } from '../../../src/d';
import customElement from '../../../src/decorators/customElement';

interface TestButtonProperties extends WidgetProperties {
	label: string;
	labelSuffix: string;
	onClick: () => void;
}

@customElement<TestButtonProperties>({
	tag: 'test-button',
	attributes: [ 'label', 'labelSuffix' ],
	events: [ 'onClick' ]
})
@customElement<TestButtonProperties>({
	tag: 'no-attributes',
	properties: [ 'label' ],
	events: [ 'onClick' ]
})
export class TestButton extends WidgetBase<TestButtonProperties> {
	onClick(this: TestButton) {
		this.properties.onClick && this.properties.onClick();
	}

	render(this: TestButton) {
		const { onClick : onclick } = this;
		const { label = '', labelSuffix = '' } = this.properties;

		return v('button', {
			onclick
		}, [
			label + ((labelSuffix !== '') ? (' ' + labelSuffix) : '')
		]);
	}
}

@customElement({
	tag: 'child-wrapper'
})
export class ChildWrapper extends WidgetBase {
	render() {
		return v('div', {}, this.children);
	}
}
