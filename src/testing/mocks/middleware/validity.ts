import { create, invalidator } from '../../../core/vdom';
import validity from '../../../core/middleware/validity';
import { DefaultMiddlewareResult } from '../../../core/interfaces';

interface ValidityResult {
	valid?: boolean;
	message?: string;
}

export function createValidityMock() {
	const mockNodes: any = {};
	let invalidate: () => void | undefined;
	const mockNode = {
		get(key: string) {
			return mockNodes[key];
		}
	};

	const factory = create({ invalidator });

	const mockValidityFactory = factory(({ id, middleware, properties, children }) => {
		const { callback } = validity();
		invalidate = middleware.invalidator;
		return callback({ id, middleware: { ...middleware, node: mockNode }, properties, children });
	});

	function mockValidity(): DefaultMiddlewareResult;
	function mockValidity(key: string, value: ValidityResult): void;
	function mockValidity(key?: string, value: ValidityResult = {}): void | DefaultMiddlewareResult {
		if (key) {
			const { valid, message: validationMessage } = value;
			mockNodes[key] = {
				validity: { valid },
				validationMessage
			};
			invalidate && invalidate();
		} else {
			return mockValidityFactory();
		}
	}

	return mockValidity;
}

export default createValidityMock;
