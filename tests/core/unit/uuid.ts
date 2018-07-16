const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import uuid from '../../../src/core/uuid';

registerSuite('uuid functions', {
	'v4 uuid'() {
		const firstId = uuid();

		assert.isDefined(firstId);
		assert.match(
			firstId,
			new RegExp('^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$', 'ig')
		);

		const secondId = uuid();

		assert.match(
			secondId,
			new RegExp('^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$', 'ig')
		);
		assert.notEqual(firstId, secondId);
	}
});
