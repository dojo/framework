import { create } from '../tsx';
import { getInvalidator } from '../vdom';

const createFactory = create();

export const invalidator = createFactory(({ id }) => {
	return () => {
		const invalidate = getInvalidator(id);
		invalidate && invalidate();
	};
});
