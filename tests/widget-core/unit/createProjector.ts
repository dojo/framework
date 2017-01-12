import 'dojo/has!host-node?../support/loadJsdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createProjector from '../../src/createProjector';

registerSuite({
	name: 'projector',

	'createProjector creates a widget with the projector mixin'() {
		const projector = createProjector();

		assert.isDefined(projector.replace);
		assert.isDefined(projector.merge);
		assert.isDefined(projector.append);
	}
});
