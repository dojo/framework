intern.registerPlugin('custom-elements', async function() {
	const scripts = ['./node_modules/@webcomponents/webcomponentsjs/webcomponents-lite.js'];
	if (window.customElements) {
		scripts.unshift('./node_modules/@webcomponents/webcomponentsjs/custom-elements-es5-adapter.js');
	}

	await intern.loadScript(scripts);
});
