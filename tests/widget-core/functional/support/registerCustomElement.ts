import { WidgetBase } from '../../../src/WidgetBase';
import { WidgetProperties } from '../../../src/interfaces';
import { v } from '../../../src/d';
import registerCustomElement from '../../../src/registerCustomElement';

interface TestButtonProperties extends WidgetProperties {
	label: string;
	suffix: string;
	onClick: () => void;
}

class TestButton extends WidgetBase<TestButtonProperties> {
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

class ChildWrapper extends WidgetBase {
	render() {
		return v('div', {}, this.children);
	}
}

registerCustomElement(function () {
	return {
		tagName: 'test-button',
		widgetConstructor: TestButton,
		attributes: [
			{
				attributeName: 'label'
			},
			{
				attributeName: 'label-suffix',
				propertyName: 'suffix'
			}
		],
		events: [
			{
				propertyName: 'onClick',
				eventName: 'button-click'
			}
		]
	};
});

registerCustomElement(function () {
	return {
		tagName: 'no-attributes',
		widgetConstructor: TestButton,
		properties: [
			{
				propertyName: 'buttonLabel',
				widgetPropertyName: 'label'
			}
		],
		events: [
			{
				propertyName: 'onClick',
				eventName: 'button-click'
			}
		]
	};
});

registerCustomElement(function () {
	return {
		tagName: 'child-wrapper',
		widgetConstructor: ChildWrapper
	};
});
