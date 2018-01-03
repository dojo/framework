const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import sendEvent from '../../support/sendEvent';
import { createResolvers } from './../../support/util';
import { v } from '../../../src/d';
import { ProjectorMixin } from '../../../src/main';
import Drag, { DragResults } from '../../../src/meta/Drag';
import { WidgetBase } from '../../../src/WidgetBase';
import { ThemedMixin } from '../../../src/mixins/Themed';

const resolvers = createResolvers();

const emptyResults: DragResults = {
	delta: { x: 0, y: 0 },
	isDragging: false
};

registerSuite('support/meta/Drag', {
	beforeEach() {
		resolvers.stub();
	},

	afterEach() {
		resolvers.restore();
	},

	tests: {
		'standard rendering'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v('div', {
						innerHTML: 'hello world',
						key: 'root'
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[emptyResults, emptyResults],
				'should have been called twice, both empty results'
			);

			assert.strictEqual(
				(div.firstChild as HTMLElement).getAttribute('touch-action'),
				'none',
				'Should have set touch-action attribute to none'
			);
			assert.strictEqual(
				(div.firstChild as HTMLElement).style.touchAction,
				'none',
				'Should have set touch-action type to none'
			);

			document.body.removeChild(div);
		},

		'standard rendering with a number key'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get(1234));
					return v('div', {
						innerHTML: 'hello world',
						key: 1234
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[emptyResults, emptyResults],
				'should have been called twice, both empty results'
			);

			document.body.removeChild(div);
		},

		'pointer dragging a node'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v('div', {
						innerHTML: 'hello world',
						key: 'root',
						styles: {
							width: '100px',
							height: '100px'
						}
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: true,
					button: 0,
					clientX: 100,
					clientY: 50,
					offsetX: 10,
					offsetY: 5,
					pageX: 100,
					pageY: 50,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 110,
					clientY: 55,
					offsetX: 10,
					offsetY: 5,
					pageX: 110,
					pageY: 55,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 105,
					clientY: 45,
					offsetX: 10,
					offsetY: 5,
					pageX: 105,
					pageY: 45,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[
					emptyResults,
					emptyResults,
					{
						delta: { x: 0, y: 0 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: 10, y: 5 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: -5, y: -10 },
						isDragging: false,
						start: {
							client: { x: 110, y: 55 },
							offset: { x: 10, y: 5 },
							page: { x: 110, y: 55 },
							screen: { x: 1100, y: 1050 }
						}
					}
				],
				'the stack of should represent a drag state'
			);

			document.body.removeChild(div);
		},

		'delta should be culmative between renders'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v('div', {
						innerHTML: 'hello world',
						key: 'root',
						styles: {
							width: '100px',
							height: '100px'
						}
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: true,
					button: 0,
					clientX: 100,
					clientY: 50,
					offsetX: 10,
					offsetY: 5,
					pageX: 100,
					pageY: 50,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 105,
					clientY: 55,
					offsetX: 10,
					offsetY: 5,
					pageX: 105,
					pageY: 55,
					screenX: 1100,
					screenY: 1050
				}
			});

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 110,
					clientY: 60,
					offsetX: 10,
					offsetY: 5,
					pageX: 110,
					pageY: 60,
					screenX: 1100,
					screenY: 1050
				}
			});

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 115,
					clientY: 65,
					offsetX: 10,
					offsetY: 5,
					pageX: 115,
					pageY: 65,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 120,
					clientY: 70,
					offsetX: 10,
					offsetY: 5,
					pageX: 120,
					pageY: 70,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[
					emptyResults,
					emptyResults,
					{
						delta: { x: 0, y: 0 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: 15, y: 15 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: 5, y: 5 },
						isDragging: false,
						start: {
							client: { x: 115, y: 65 },
							offset: { x: 10, y: 5 },
							page: { x: 115, y: 65 },
							screen: { x: 1100, y: 1050 }
						}
					}
				],
				'the stack of should represent a drag state'
			);

			document.body.removeChild(div);
		},

		'render not done between drag and pointer up should be culmative'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v('div', {
						innerHTML: 'hello world',
						key: 'root',
						styles: {
							width: '100px',
							height: '100px'
						}
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: true,
					button: 0,
					clientX: 100,
					clientY: 50,
					offsetX: 10,
					offsetY: 5,
					pageX: 100,
					pageY: 50,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 105,
					clientY: 55,
					offsetX: 10,
					offsetY: 5,
					pageX: 105,
					pageY: 55,
					screenX: 1100,
					screenY: 1050
				}
			});

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 110,
					clientY: 60,
					offsetX: 10,
					offsetY: 5,
					pageX: 110,
					pageY: 60,
					screenX: 1100,
					screenY: 1050
				}
			});

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 115,
					clientY: 65,
					offsetX: 10,
					offsetY: 5,
					pageX: 115,
					pageY: 65,
					screenX: 1100,
					screenY: 1050
				}
			});

			sendEvent(div.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 120,
					clientY: 70,
					offsetX: 10,
					offsetY: 5,
					pageX: 120,
					pageY: 70,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[
					emptyResults,
					emptyResults,
					{
						delta: { x: 0, y: 0 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: 20, y: 20 },
						isDragging: false,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					}
				],
				'the stack of should represent a drag state'
			);

			document.body.removeChild(div);
		},

		'movement ignored when start event missing'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v('div', {
						innerHTML: 'hello world',
						key: 'root',
						styles: {
							width: '100px',
							height: '100px'
						}
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 115,
					clientY: 65,
					offsetX: 10,
					offsetY: 5,
					pageX: 115,
					pageY: 65,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 120,
					clientY: 65,
					offsetX: 10,
					offsetY: 5,
					pageX: 120,
					pageY: 70,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[emptyResults, emptyResults],
				'the widget does not invalidate on ignored events'
			);

			document.body.removeChild(div);
		},

		'dragging where descendent is target'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v(
						'div',
						{
							key: 'root',
							styles: {
								width: '100px',
								height: '100px'
							}
						},
						[
							v('div', {
								innerHTML: 'Hello World',
								key: 'child'
							})
						]
					);
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild!.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: true,
					button: 0,
					clientX: 100,
					clientY: 50,
					offsetX: 10,
					offsetY: 5,
					pageX: 100,
					pageY: 50,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild!.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 110,
					clientY: 55,
					offsetX: 10,
					offsetY: 5,
					pageX: 110,
					pageY: 55,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild!.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 105,
					clientY: 45,
					offsetX: 10,
					offsetY: 5,
					pageX: 105,
					pageY: 45,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[
					emptyResults,
					emptyResults,
					{
						delta: { x: 0, y: 0 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: 10, y: 5 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: -5, y: -10 },
						isDragging: false,
						start: {
							client: { x: 110, y: 55 },
							offset: { x: 10, y: 5 },
							page: { x: 110, y: 55 },
							screen: { x: 1100, y: 1050 }
						}
					}
				],
				'dragging should be attributed to parent node'
			);

			document.body.removeChild(div);
		},

		'dragging untracked node should not report results'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('child2'));
					return v(
						'div',
						{
							key: 'root',
							styles: {
								width: '100px',
								height: '100px'
							}
						},
						[
							v('div', {
								innerHTML: 'Hello World',
								key: 'child1'
							}),
							v('div', {
								innerHTML: 'Hello World',
								key: 'child2'
							})
						]
					);
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild!.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: true,
					button: 0,
					clientX: 100,
					clientY: 50,
					offsetX: 10,
					offsetY: 5,
					pageX: 100,
					pageY: 50,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild!.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 110,
					clientY: 55,
					offsetX: 10,
					offsetY: 5,
					pageX: 110,
					pageY: 55,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild!.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 105,
					clientY: 45,
					offsetX: 10,
					offsetY: 5,
					pageX: 105,
					pageY: 45,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(dragResults, [emptyResults, emptyResults], 'there should be no drag results');

			document.body.removeChild(div);
		},

		'non-primary button node dragging should be ignored'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v('div', {
						innerHTML: 'hello world',
						key: 'root',
						styles: {
							width: '100px',
							height: '100px'
						}
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: true,
					button: 1,
					clientX: 100,
					clientY: 50,
					offsetX: 10,
					offsetY: 5,
					pageX: 100,
					pageY: 50,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 110,
					clientY: 55,
					offsetX: 10,
					offsetY: 5,
					pageX: 110,
					pageY: 55,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 105,
					clientY: 45,
					offsetX: 10,
					offsetY: 5,
					pageX: 105,
					pageY: 45,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(dragResults, [emptyResults, emptyResults], 'the stack of should represent a drag state');

			document.body.removeChild(div);
		},

		'two finger touch should stop dragging'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v('div', {
						innerHTML: 'hello world',
						key: 'root',
						styles: {
							width: '100px',
							height: '100px'
						}
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: true,
					button: 0,
					clientX: 100,
					clientY: 50,
					offsetX: 10,
					offsetY: 5,
					pageX: 100,
					pageY: 50,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: false,
					button: 0,
					clientX: 150,
					clientY: 100,
					offsetX: 10,
					offsetY: 5,
					pageX: 150,
					pageY: 100,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 110,
					clientY: 55,
					offsetX: 10,
					offsetY: 5,
					pageX: 110,
					pageY: 55,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 105,
					clientY: 45,
					offsetX: 10,
					offsetY: 5,
					pageX: 105,
					pageY: 45,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[
					emptyResults,
					emptyResults,
					{
						delta: { x: 0, y: 0 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: 0, y: 0 },
						isDragging: false
					}
				],
				'the stack of should represent a drag state'
			);

			document.body.removeChild(div);
		},

		'other invalidation properly reports empty delta'() {
			const dragResults: DragResults[] = [];

			class TestWidget extends ProjectorMixin(ThemedMixin(WidgetBase)) {
				render() {
					dragResults.push(this.meta(Drag).get('root'));
					return v('div', {
						innerHTML: 'hello world',
						key: 'root',
						styles: {
							width: '100px',
							height: '100px'
						}
					});
				}
			}

			const div = document.createElement('div');

			document.body.appendChild(div);

			const widget = new TestWidget();
			widget.append(div);

			resolvers.resolve();
			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerdown', {
				eventInit: {
					bubbles: true,
					isPrimary: true,
					button: 0,
					clientX: 100,
					clientY: 50,
					offsetX: 10,
					offsetY: 5,
					pageX: 100,
					pageY: 50,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointermove', {
				eventInit: {
					bubbles: true,
					clientX: 110,
					clientY: 55,
					offsetX: 10,
					offsetY: 5,
					pageX: 110,
					pageY: 55,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			widget.invalidate();

			resolvers.resolve();

			sendEvent(div.firstChild as Element, 'pointerup', {
				eventInit: {
					bubbles: true,
					clientX: 105,
					clientY: 45,
					offsetX: 10,
					offsetY: 5,
					pageX: 105,
					pageY: 45,
					screenX: 1100,
					screenY: 1050
				}
			});

			resolvers.resolve();

			assert.deepEqual(
				dragResults,
				[
					emptyResults,
					emptyResults,
					{
						delta: { x: 0, y: 0 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: 10, y: 5 },
						isDragging: true,
						start: {
							client: { x: 100, y: 50 },
							offset: { x: 10, y: 5 },
							page: { x: 100, y: 50 },
							screen: { x: 1100, y: 1050 }
						}
					},
					{
						delta: { x: 0, y: 0 },
						isDragging: true
					},
					{
						delta: { x: -5, y: -10 },
						isDragging: false,
						start: {
							client: { x: 110, y: 55 },
							offset: { x: 10, y: 5 },
							page: { x: 110, y: 55 },
							screen: { x: 1100, y: 1050 }
						}
					}
				],
				'the stack of should represent a drag state'
			);

			document.body.removeChild(div);
		}
	}
});
