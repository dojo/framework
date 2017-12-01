import { WidgetBase } from '../../../src/WidgetBase';
import { WidgetProperties } from '../../../src/interfaces';
import { v } from '../../../src/d';
import customElement from '../../../src/decorators/customElement';

interface TestButtonProperties extends WidgetProperties {
	label: string;
	suffix: string;
	onClick: () => void;
}

@customElement<TestButtonProperties>({
	tag: 'test-button',
	attributes: [ 'label', 'suffix' ],
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
		const { label = '', suffix = '' } = this.properties;

		return v('button', {
			onclick
		}, [
			label + ((suffix !== '') ? (' ' + suffix) : '')
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
