import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { createData, patches } from '../../../support/createData';
import { createQueryStore } from '../../../../../src/store/mixins/createQueryTransformMixin';
import createFilter from '../../../../../src/query/createFilter';
import Set from 'dojo-shim/Set';

function getStoreAndDfd(test: any, useAsync = true) {
	const dfd = useAsync ? test.async(1000) : null;
	const queryStore = createQueryStore({
		data: createData()
	});

	const emptyStore = createQueryStore();

	return { dfd, queryStore, emptyStore };
}

registerSuite({
	name: 'Query-Transform Mixin - Transform',
	'single transformations'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.transform(
			(item) => ({ newValue: `${item.id}-${item.value}` })
		).fetch().then((data) => {
			assert.deepEqual(data, [
				{ newValue: 'item-1-1' },
				{ newValue: 'item-2-2' },
				{ newValue: 'item-3-3' }
			], 'Didn\'t transform data');
		});
	},

	'chained transformations'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.transform(
			(item) => ({ newValue: `${item.id}-${item.value}` })
		).transform(
			(item) => ({ newerValue: `${item.newValue}-+` })
		).fetch().then((data) => {
			assert.deepEqual(data, [
				{ newerValue: 'item-1-1-+' },
				{ newerValue: 'item-2-2-+' },
				{ newerValue: 'item-3-3-+' }
			], 'Didn\'t transform data');
		});
	},

	'queries and transformations'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.filter(
			(item) => item.value >= 2
		).transform(
			(item) => ({ id: item.id, _value: item.value + 1 })
		).filter(
			(item) => item._value >= 4
		).transform(
			(item) => ({ id: item.id, __value: item._value + 1 })
		).fetch().then((data) => {
			assert.deepEqual(data, [ { id: 'item-3', __value: 5 } ], 'Didn\'t work with queries and transformations');
		});
	},

	'get'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		const transformedView = queryStore.filter(
			(item) => item.value <= 2
		).transform(
			(item) => ({ id: item.id, _value: item.value + 1 })
		).filter(
			(item) => item._value <= 4
		).transform(
			(item) => ({ id: item.id, __value: item._value + 1 })
		);
		return transformedView.fetch().then(() => transformedView.get('item-1').then((data) => {
			assert.deepEqual(data, { id: 'item-1', __value: 3 }, 'Didn\'t work with queries and transformations');
		}));
	},

	'get with multiple ids'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		const transformedView = queryStore.filter(
			(item) => item.value <= 2
		).transform(
			(item) => ({ id: item.id, _value: item.value + 1 })
		).filter(
			(item) => item._value <= 4
		).transform(
			(item) => ({ id: item.id, __value: item._value + 1 })
		);
		return transformedView.fetch().then(() => transformedView.get([ 'item-1', 'item-2' ]).then((data) => {
			assert.deepEqual(data, [ { id: 'item-1', __value: 3 }, { id: 'item-2', __value: 4 } ], 'Didn\'t work with queries and transformations');
		}));

	},

	'get with mapped transformation'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		const transformedView = queryStore.filter(
			(item) => item.value <= 2
		).transform(
			(item) => ({ id: item.id, _value: item.value + 1 }), 'id'
		).filter(
			(item) => item._value <= 4
		).transform(
			(item) => ({ id: item.id, __value: item._value + 1 }), 'id'
		);
		return transformedView.fetch().then(() => transformedView.get('item-1').then((data) => {
			assert.deepEqual(data, { id: 'item-1', __value: 3 }, 'Didn\'t work with queries and transformations');
		}));
	},

	'get multiple ids with mapped transformation'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		const transformedView = queryStore.filter(
			(item) => item.value <= 2
		).transform(
			(item) => ({ id: item.id, _value: item.value + 1 }), 'id'
		).filter(
			(item) => item._value <= 4
		).transform(
			(item) => ({ id: item.id, __value: item._value + 1 }), 'id'
		);
		return transformedView.fetch().then(() => transformedView.get([ 'item-1', 'item-2' ]).then((data) => {
			assert.deepEqual(data, [ { id: 'item-1', __value: 3 }, { id: 'item-2', __value: 4 } ], 'Didn\'t work with queries and transformations');
		}));
	},
	'applying additional queries in fetch'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.filter(
			(item) => item.value >= 2
		).transform(
			(item) => ({ id: item.id, _value: item.value + 1 })
		).fetch(createFilter<any>().custom(
			(item) => item._value >= 4
		)).then((data) => {
			assert.deepEqual(data, [ { id: 'item-3', _value: 4 } ], 'Didn\'t work with query in fetch');
		});
	},

	'observing items': {
		'single item': {
			'single transformation': {
				'initial update'(this: any) {
					const { dfd, queryStore } = getStoreAndDfd(this);

					queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).observe('item-1').subscribe(dfd.callback((update: { newValue: string }) => {
						assert.deepEqual(update, {
							newValue: 'item-1-1'
						}, 'Didn\'t receive once transformed update for single observed item');
					}));
				},
				'mutation update'(this: any) {
					const { dfd, queryStore } = getStoreAndDfd(this);

					let ignoreFirst = true;
					queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).observe('item-1').subscribe((update: { newValue: string }) => {
						if (ignoreFirst) {
							ignoreFirst = false;
							return;
						}
						try {
							assert.deepEqual(update, {
								newValue: 'item-1-100'
							}, 'Didn\'t receive once transformed update for single observed item');
						} catch (error) {
							dfd.reject(error);
						}
						dfd.resolve();
					});

					queryStore.put({
						id: 'item-1',
						value: 100,
						nestedProperty: {
							value: 1
						}
					});
				},
				'completion'(this: any) {
					const { dfd, queryStore } = getStoreAndDfd(this);

					queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).observe('item-1').subscribe(() => {}, undefined, dfd.resolve);

					queryStore.delete('item-1');
				}
			},
			'chained transformations': {
				'initial update'(this: any) {
					const { dfd, queryStore } = getStoreAndDfd(this);

					const chainedTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					chainedTransformation.observe('item-1').subscribe(dfd.callback((update: { newerValue: string }) => {
						assert.deepEqual(update, {
							newerValue: 'item-1-1-+'
						}, 'Didn\'t receive chained transformed update for single observed item');
					}));
				},
				'mutation update'(this: any) {
					const { dfd, queryStore } = getStoreAndDfd(this);

					const chainedTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					let ignoreFirst = true;
					chainedTransformation.observe('item-1').subscribe((update) => {
						if (ignoreFirst) {
							ignoreFirst = false;
							return;
						}
						try {
							assert.deepEqual(update, {
								newerValue: 'item-1-100-+'
							}, 'Didn\'t receive chained transformed update for single observed item');
						} catch (error) {
							dfd.reject(error);
						}
						dfd.resolve();
					});

					queryStore.put({
						id: 'item-1',
						value: 100,
						nestedProperty: {
							value: 1
						}
					});
				},
				'completion'(this: any) {
					const { dfd, queryStore } = getStoreAndDfd(this);

					queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					).observe('item-1').subscribe(() => {}, undefined, dfd.resolve);

					queryStore.delete('item-1');
				}
			}
		},

		'multiple items': {
			'single transformation': {
				'initial updates'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const singleTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					);

					let idsUpdated = new Set<string>();
					singleTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						try {
							if (update.id === 'item-1') {
								idsUpdated.add('item-1');
								assert.deepEqual(update, {
									id: 'item-1',
									item: {
										newValue: 'item-1-1'
									}
								}, 'Didn\'t receive once transformed update for first observed item');
							}
							else if (update.id === 'item-2') {
								idsUpdated.add('item-2');
								assert.deepEqual(update, {
									id: 'item-2',
									item: {
										newValue: 'item-2-2'
									}
								}, 'Didn\'t receive once transformed update for second observed item');
							}
							if (idsUpdated.has('item-1') && idsUpdated.has('item-2')) {
								dfd.resolve();
							}
						} catch (error) {
							dfd.reject(error);
						}
					});
				},
				'mutation updates'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const singleTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					);

					let idsUpdated = new Set<string>();
					let ignoreFirst = 2;
					singleTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						try {
							if (update.id === 'item-1') {
								idsUpdated.add('item-1');
								assert.deepEqual(update, {
									id: 'item-1',
									item: {
										newValue: 'item-1-100'
									}
								}, 'Didn\'t receive once transformed update for first observed item');
							}
							else if (update.id === 'item-2') {
								idsUpdated.add('item-2');
								assert.deepEqual(update, {
									id: 'item-2',
									item: {
										newValue: 'item-2-200'
									}
								}, 'Didn\'t receive once transformed update for second observed item');
							}
							if (idsUpdated.has('item-1') && idsUpdated.has('item-2')) {
								dfd.resolve();
							}
						} catch (error) {
							dfd.reject(error);
						}
					});
					queryStore.put([ {
						id: 'item-1',
						value: 100,
						nestedProperty: {
							value: 1
						}
					}, {
						id: 'item-2',
						value: 200,
						nestedProperty: {
							value: 1
						}
					} ]);
				},
				'delete update'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const singleTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					);

					let ignoreFirst = 2;
					singleTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						try {
							assert.deepEqual(update, {
								id: 'item-1',
								item: undefined
							}, 'Didn\'t receive once transformed update for first observed item');
							dfd.resolve();
						} catch (error) {
							dfd.reject(error);
						}
					});
					queryStore.delete('item-1');
				},
				'completion'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const singleTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					);

					singleTransformation.observe(['item-1', 'item-2']).subscribe(() => {}, undefined, dfd.resolve);
					queryStore.delete([ 'item-1', 'item-2' ]);
				}
			},
			'chained transformations': {
				'initial updates'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const chainedTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					let idsUpdated = new Set<string>();
					chainedTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						try {
							if (update.id === 'item-1') {
								idsUpdated.add('item-1');
								assert.deepEqual(update, {
									id: 'item-1',
									item: {
										newerValue: 'item-1-1-+'
									}
								}, 'Didn\'t receive once transformed update for first observed item');
							}
							else if (update.id === 'item-2') {
								idsUpdated.add('item-2');
								assert.deepEqual(update, {
									id: 'item-2',
									item: {
										newerValue: 'item-2-2-+'
									}
								}, 'Didn\'t receive once transformed update for second observed item');
							}
							if (idsUpdated.has('item-1') && idsUpdated.has('item-2')) {
								dfd.resolve();
							}
						} catch (error) {
							dfd.reject(error);
						}
					});
				},
				'mutation updates'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const chainedTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					let idsUpdated = new Set<string>();
					let ignoreFirst = 2;
					chainedTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						try {
							if (update.id === 'item-1') {
								idsUpdated.add('item-1');
								assert.deepEqual(update, {
									id: 'item-1',
									item: {
										newerValue: 'item-1-100-+'
									}
								}, 'Didn\'t receive once transformed update for first observed item');
							}
							else if (update.id === 'item-2') {
								idsUpdated.add('item-2');
								assert.deepEqual(update, {
									id: 'item-2',
									item: {
										newerValue: 'item-2-200-+'
									}
								}, 'Didn\'t receive once transformed update for second observed item');
							}
							if (idsUpdated.has('item-1') && idsUpdated.has('item-2')) {
								dfd.resolve();
							}
						} catch (error) {
							dfd.reject(error);
						}
					});
					queryStore.put([ {
						id: 'item-1',
						value: 100,
						nestedProperty: {
							value: 1
						}
					}, {
						id: 'item-2',
						value: 200,
						nestedProperty: {
							value: 1
						}
					} ]);
				},
				'delete update'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const chainedTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					let ignoreFirst = 2;
					chainedTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						try {
							assert.deepEqual(update, {
								id: 'item-1',
								item: undefined
							}, 'Didn\'t receive once transformed update for first observed item');
							dfd.resolve();
						} catch (error) {
							dfd.reject(error);
						}
					});
					queryStore.delete('item-1');
				},
				'completion'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const chainedTransformation = queryStore.transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					);

					chainedTransformation.observe(['item-1', 'item-2']).subscribe(() => {}, undefined, dfd.resolve);
					queryStore.delete([ 'item-1', 'item-2' ]);
				}
			},
			'queries shouldn\'t affect targeted observation': {
				'initial updates'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const chainedTransformation = queryStore.filter(
						(item) => item.value < 2
					).transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).filter(
						(item) => item.newValue.charAt(0) === 'item-1'
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					let idsUpdated = new Set<string>();
					chainedTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						try {
							if (update.id === 'item-1') {
								idsUpdated.add('item-1');
								assert.deepEqual(update, {
									id: 'item-1',
									item: {
										newerValue: 'item-1-1-+'
									}
								}, 'Didn\'t receive once transformed update for first observed item');
							}
							else if (update.id === 'item-2') {
								idsUpdated.add('item-2');
								assert.deepEqual(update, {
									id: 'item-2',
									item: {
										newerValue: 'item-2-2-+'
									}
								}, 'Didn\'t receive once transformed update for second observed item');
							}
							if (idsUpdated.has('item-1') && idsUpdated.has('item-2')) {
								dfd.resolve();
							}
						} catch (error) {
							dfd.reject(error);
						}
					});
				},
				'mutation updates'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const chainedTransformation = queryStore.filter(
						(item) => item.value < 2
					).transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).filter(
						(item) => item.newValue.charAt(0) === 'item-1'
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					let idsUpdated = new Set<string>();
					let ignoreFirst = 2;
					chainedTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						try {
							if (update.id === 'item-1') {
								idsUpdated.add('item-1');
								assert.deepEqual(update, {
									id: 'item-1',
									item: {
										newerValue: 'item-1-100-+'
									}
								}, 'Didn\'t receive once transformed update for first observed item');
							}
							else if (update.id === 'item-2') {
								idsUpdated.add('item-2');
								assert.deepEqual(update, {
									id: 'item-2',
									item: {
										newerValue: 'item-2-200-+'
									}
								}, 'Didn\'t receive once transformed update for second observed item');
							}
							if (idsUpdated.has('item-1') && idsUpdated.has('item-2')) {
								dfd.resolve();
							}
						} catch (error) {
							dfd.reject(error);
						}
					});
					queryStore.put([ {
						id: 'item-1',
						value: 100,
						nestedProperty: {
							value: 1
						}
					}, {
						id: 'item-2',
						value: 200,
						nestedProperty: {
							value: 1
						}
					} ]);
				},
				'delete update'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const chainedTransformation = queryStore.filter(
						(item) => item.value < 2
					).transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).filter(
						(item) => item.newValue.charAt(0) === 'item-1'
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					let ignoreFirst = 2;
					chainedTransformation.observe(['item-1', 'item-2']).subscribe((update) => {
						if (ignoreFirst) {
							ignoreFirst--;
							return;
						}
						try {
							assert.deepEqual(update, {
								id: 'item-1',
								item: undefined
							}, 'Didn\'t receive once transformed update for first observed item');
							dfd.resolve();
						} catch (error) {
							dfd.reject(error);
						}
					});
					queryStore.delete('item-1');
				},
				'completion'(this: any) {
					const {dfd, queryStore} = getStoreAndDfd(this);

					const chainedTransformation = queryStore.filter(
						(item) => item.value < 2
					).transform(
						(item) => ({ newValue: `${item.id}-${item.value}` })
					).filter(
						(item) => item.newValue.charAt(0) === 'item-1'
					).transform(
						(item) => ({ newerValue: `${item.newValue}-+` })
					);

					chainedTransformation.observe(['item-1', 'item-2']).subscribe(() => {}, undefined, dfd.resolve);
					queryStore.delete([ 'item-1', 'item-2' ]);
				}
			}
		}
	},

	'observing the whole result': {
		'initial update'(this: any) {
			const {dfd, queryStore} = getStoreAndDfd(this);

			const chainedTransformation = queryStore.filter(
				(item) => item.value <= 2
			).transform(
				(item) => ({ newValue: `${item.id}-${item.value}` })
			).filter(
				(item) => item.newValue.indexOf('item-1') > -1
			).transform(
				(item) => ({ newerValue: `${item.newValue}-+` })
			);

			let ignoreFirst = true;
			chainedTransformation.observe().subscribe((update) => {
				if (ignoreFirst) {
					ignoreFirst = false;
					return;
				}
				try {
					assert.deepEqual(update, {
						adds: [ { newerValue: 'item-1-1-+' } ],
						updates: [],
						deletes: [],
						beforeAll: [],
						afterAll: [ { newerValue: 'item-1-1-+' } ]
					}, 'Didn\'t properly filter before and after transforms when observing the whole result');
				} catch (error) {
					dfd.reject(error);
				}
				dfd.resolve();
			});
		},

		'initial update with idTransforms'(this: any) {
			const {dfd, queryStore} = getStoreAndDfd(this);

			const chainedTransformation = queryStore.filter(
				(item) => item.value <= 2
			).transform(
				// Loses 'mapped' status when no idTransform is specified
				(item) => ({ newValue: `${item.id}-${item.value}` })
			).filter(
				(item) => item.newValue.indexOf('item-1') > -1
			).transform(
				// Can become mapped again by specifying idTransform on last transformation, since all that matters
				// is that the final state can be identified
				(item) => ({ newerValue: `${item.newValue}-+` }), 'newerValue'
			);

			let ignoreFirst = true;
			chainedTransformation.observe().subscribe((update) => {
				if (ignoreFirst) {
					ignoreFirst = false;
					return;
				}
				try {
					assert.deepEqual(update, {
						adds: [ { newerValue: 'item-1-1-+' } ],
						updates: [],
						deletes: [],
						beforeAll: [],
						afterAll: [ { newerValue: 'item-1-1-+' } ],
						addedToTracked: [
							{
								item: { newerValue: 'item-1-1-+' },
								index: 0,
								id: 'item-1-1-+'
							}
						],
						removedFromTracked: [],
						movedInTracked: []
					}, 'Didn\'t properly filter before and after transforms when observing the whole result');
				} catch (error) {
					dfd.reject(error);
				}
				dfd.resolve();
			});
		}
	},

	'id transform': {
		'idTransform function'(this: any) {
			const { queryStore } = getStoreAndDfd(this, false);

			const transformedStore = queryStore.transform(
				(item) => ({ newValue: `${item.id}-${item.value}` }), (item) => item.newValue + '-+'
			);
			return transformedStore.fetch().then((data) => transformedStore.identify(data)).then((ids) => {
				assert.deepEqual(
					ids,
					[ 'item-1-1-+', 'item-2-2-+', 'item-3-3-+'	],
					'Didn\'t properly identify items using idTransform function'
				);
			});
		},

		'idTransform property'(this: any) {
			const { queryStore } = getStoreAndDfd(this, false);

			const transformedStore = queryStore.transform(
				(item) => ({ newValue: `${item.id}-${item.value}` }), 'newValue'
			);
			return transformedStore.fetch().then((data) => transformedStore.identify(data)).then((ids) => {
				assert.deepEqual(
					ids,
					[ 'item-1-1', 'item-2-2', 'item-3-3' ],
					'Didn\'t properly identify items using idTransform property'
				);
			});
		},

		'multiple transformations'(this: any) {
			const { queryStore } = getStoreAndDfd(this, false);

			const transformedStore = queryStore.transform(
				(item) => ({ newValue: `${item.id}-${item.value}` }), 'newValue'
			).transform(
				(item) => ({ newerValue: `${item.newValue}-+` }), 'newerValue'
			);
			return transformedStore.fetch().then((data) => transformedStore.identify(data)).then((ids) => {
				assert.deepEqual(
					ids,
					[ 'item-1-1-+', 'item-2-2-+', 'item-3-3-+' ],
					'Didn\'t properly identify items using idTransform property in chained transforms'
				);
			});
		}
	},

	'transform with a patch'(this: any) {
		const { queryStore } = getStoreAndDfd(this, false);

		return queryStore.transform(patches[0].patch).fetch().then((data) => {
			assert.deepEqual(data, createData().map((item) => patches[0].patch.apply(item)), 'Didn\'t use patch properly for transformation');
		});
	}
});
