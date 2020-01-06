import { create, invalidator } from '../../../core/vdom';
import { DefaultMiddlewareResult } from '../../../core/interfaces';

interface ValidityResult {
	valid?: boolean;
	message?: string;
}

export function createValidityMock() {
	const values: { [key: string]: ValidityResult } = {};
	let invalidate: () => void | undefined;

	const factory = create({ invalidator });

	const mockValidityFactory = factory(({ middleware: { invalidator } }) => {
		invalidate = invalidator;
		return {
			get(key: string | number, _value: string) {
				return values[key] || { valid: undefined, message: '' };
			}
		};
	});

	function mockValidity(): DefaultMiddlewareResult;
	function mockValidity(key: string, value: ValidityResult): void;
	function mockValidity(key?: string, value?: ValidityResult): void | DefaultMiddlewareResult {
		if (key && value) {
			values[key] = value;
			invalidate && invalidate();
		} else {
			return mockValidityFactory();
		}
	}

	return mockValidity;
}

export default createValidityMock;
