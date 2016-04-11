import 'dojo/has!host-node?../support/loadJsdom';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as Immutable from 'immutable/immutable';
import { h, createProjector } from 'maquette/maquette';
import * as rx from 'rxjs/Rx';

registerSuite({
	name: 'integrations',
	immutable() {
		assert(Immutable);
	},
	maquette: {
		basic() {
			const projector = createProjector({});
			function render() {
				return h('div.landscape', [
					h('div', {
						classes: {
							'saucer': true,
							'foo': true
						}
					} , [ 'Greetings' ])
				]);
			}

			projector.append(document.body, render);
			const nodes = document.querySelectorAll('.landscape');
			assert.strictEqual(nodes.length, 1);
			assert.strictEqual(nodes[0].childNodes.length, 1);
			assert.strictEqual(nodes[0].parentElement, document.body);
			assert.strictEqual(nodes[0].firstChild.firstChild.textContent, 'Greetings');
			assert.strictEqual((<HTMLDivElement> nodes[0].firstChild).className, 'saucer foo');
		}
	},
	rx() {
		assert(rx);
	}
});
