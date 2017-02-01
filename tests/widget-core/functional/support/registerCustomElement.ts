import createWidgetBase from '../../../src/createWidgetBase';
import { v } from '../../../src/d';
import { WidgetProperties, Widget } from '../../../src/interfaces';
import registerCustomElement from '../../../src/registerCustomElement';

interface TestButtonProperties extends WidgetProperties {
	label: string;
	suffix: string;
	onClick: () => void;
}

type TestButton = Widget<TestButtonProperties> & {
	onClick: () => void;
};

const createTestButton = createWidgetBase.mixin({
	mixin: {
		onClick(this: TestButton) {
			this.properties.onClick && this.properties.onClick();
		},

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
});

registerCustomElement(function () {
	return {
		tagName: 'test-button',
		widgetFactory: createTestButton,
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
		widgetFactory: createTestButton,
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
