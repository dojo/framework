require.config({
	baseUrl: '../../..',
	packages: [
		{ name: 'src', location: '_build/src' },
		{ name: 'dojo-actions', location: 'node_modules/dojo-actions' },
		{ name: 'dojo-compose', location: 'node_modules/dojo-compose' },
		{ name: 'dojo-core', location: 'node_modules/dojo-core' },
		{ name: 'dojo-has', location: 'node_modules/dojo-has' },
		{ name: 'dojo-shim', location: 'node_modules/dojo-shim' },
		{ name: 'dojo-stores', location: 'node_modules/dojo-stores'},
		{ name: 'immutable', location: 'node_modules/immutable/dist', main: 'immutable' },
		{ name: 'maquette', location: 'node_modules/maquette/dist', main: 'maquette' },
		{ name: 'rxjs', location: 'node_modules/@reactivex/rxjs/dist/amd' }
	]
});

/* Requiring in the main module */
require([ 'src/examples/index' ], function () {});
