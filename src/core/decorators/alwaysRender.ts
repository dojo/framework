import { WidgetBase } from './../WidgetBase';
import { handleDecorator } from './handleDecorator';
import { beforeProperties } from './beforeProperties';

export function alwaysRender() {
	return handleDecorator((target, propertyKey) => {
		beforeProperties(function(this: WidgetBase) {
			this.invalidate();
		})(target);
	});
}

export default alwaysRender;
