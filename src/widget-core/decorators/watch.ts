import handleDecorator, { DecoratorHandler } from './handleDecorator';

export function watch(): DecoratorHandler {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('afterConstructor', function(this: any) {
			if (propertyKey) {
				let _value: any = this[propertyKey];
				Object.defineProperty(this, propertyKey, {
					set(value: any) {
						_value = value;
						this.invalidate();
					},
					get() {
						return _value;
					}
				});
			}
		});
	});
}

export default watch;
