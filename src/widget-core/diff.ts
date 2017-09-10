import { PropertyChangeRecord } from './interfaces';
import { WIDGET_BASE_TYPE } from './Registry';

function isObjectOrArray(value: any): boolean {
	return Object.prototype.toString.call(value) === '[object Object]' || Array.isArray(value);
}

export function always(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: true,
		value: newProperty
	};
}

export function ignore(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: false,
		value: newProperty
	};
}

export function reference(previousProperty: any, newProperty: any): PropertyChangeRecord {
	return {
		changed: previousProperty !== newProperty,
		value: newProperty
	};
}

export function shallow(previousProperty: any, newProperty: any): PropertyChangeRecord {
	let changed = false;

	const validOldProperty = previousProperty && isObjectOrArray(previousProperty);
	const validNewProperty = newProperty && isObjectOrArray(newProperty);

	if (!validOldProperty || !validNewProperty) {
		return {
			changed: true,
			value: newProperty
		};
	}

	const previousKeys = Object.keys(previousProperty);
	const newKeys = Object.keys(newProperty);

	if (previousKeys.length !== newKeys.length) {
		changed = true;
	}
	else {
		changed = newKeys.some((key) => {
			return newProperty[key] !== previousProperty[key];
		});
	}
	return {
		changed,
		value: newProperty
	};
}

export function auto(previousProperty: any, newProperty: any): PropertyChangeRecord {
	let result;
	if (typeof newProperty === 'function') {
		if (newProperty._type === WIDGET_BASE_TYPE) {
			result = reference(previousProperty, newProperty);
		}
		else {
			result = ignore(previousProperty, newProperty);
		}
	}
	else if (isObjectOrArray(newProperty)) {
		result = shallow(previousProperty, newProperty);
	}
	else {
		result = reference(previousProperty, newProperty);
	}
	return result;
}
