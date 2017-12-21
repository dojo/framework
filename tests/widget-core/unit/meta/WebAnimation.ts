import global from '@dojo/shim/global';
const { assert } = intern.getPlugin('chai');
const { beforeEach, before, describe, it} = intern.getInterface('bdd');
import WebAnimation, { AnimationControls, AnimationTimingProperties } from '../../../src/meta/WebAnimation';
import { WidgetBase } from '../../../src/WidgetBase';
import { v } from '../../../src/d';
import { spy, stub } from 'sinon';

describe('WebAnimation', () => {

	let effects: any;
	let controls: AnimationControls;
	let timing: AnimationTimingProperties;
	let animate: any;

	class TestWidget extends WidgetBase {
		render() {
			this.meta(WebAnimation).animate('animated', animate);

			return v('div', {}, [
				v('div', {
					key: 'animated'
				})
			]);
		}

		callInvalidate() {
			this.invalidate();
		}

		getMeta() {
			return this.meta(WebAnimation);
		}
	}

	const keyframeCtorStub = stub();
	const animationCtorStub = stub();
	const pauseStub = stub();
	const playStub = stub();
	const reverseStub = stub();
	const cancelStub = stub();
	const finishStub = stub();
	const startStub = stub();
	const currentStub = stub();
	const playbackRateStub = stub();
	let metaNode: HTMLElement;

	beforeEach(() => {
		effects = [
			{ height: '0px' },
			{ height: '10px' }
		];
		controls = {};
		timing = {};
		animate = {
			id: 'animation',
			effects
		};
	});

	describe('integration', () => {
		it('creates an animation player for each node with animations', () => {
			const widget = new TestWidget();
			const meta = widget.getMeta();

			const addSpy = spy(meta, 'animate');

			widget.__render__();
			assert.isTrue(addSpy.calledOnce);
		});
		it('clears animations after new animations have been added', () => {
			const widget = new TestWidget();
			const meta = widget.getMeta();

			const addSpy = spy(meta, 'animate');
			const clearSpy = spy(meta, 'afterRender');

			widget.__render__();
			assert.isTrue(addSpy.calledOnce);
			assert.isTrue(clearSpy.calledOnce);
			assert.isTrue(clearSpy.calledAfter(addSpy));
		});
	});

	describe('player', () => {
		before(() => {
			class KeyframeEffectMock {
				constructor(...args: any[]) {
					keyframeCtorStub(...args);
				}
			}
			class AnimationMock {
				constructor(...args: any[]) {
					animationCtorStub(...args);
				}
				pause() {
					pauseStub();
				}
				play() {
					playStub();
				}
				reverse() {
					reverseStub();
				}
				cancel() {
					cancelStub();
				}
				finish() {
					finishStub();
				}
				set startTime(time: number) {
					startStub(time);
				}
				set currentTime(time: number) {
					currentStub(time);
				}
				set onfinish(onFinish: () => {}) {
					onFinish();
				}
				set oncancel(onCancel: () => {}) {
					onCancel();
				}
				set playbackRate(rate: number) {
					playbackRateStub(rate);
				}
			}
			global.KeyframeEffect = KeyframeEffectMock;
			global.Animation = AnimationMock;
		});

		beforeEach(() => {
			keyframeCtorStub.reset();
			animationCtorStub.reset();
			pauseStub.reset();
			playStub.reset();
			reverseStub.reset();
			cancelStub.reset();
			finishStub.reset();
			startStub.reset();
			currentStub.reset();
			playbackRateStub.reset();
			metaNode = document.createElement('div');
		});

		it('creates new KeyframeEffect and Animation for each WebAnimation node', () => {
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(animationCtorStub.calledOnce);
		});
		it('reuses previous KeyframeEffect and Player when animation is still valid', () => {
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			widget.callInvalidate();
			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(animationCtorStub.calledOnce);
		});
		it('passed timing and node info to keyframe effect', () => {
			animate.timing = {
				duration: 2
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(keyframeCtorStub.firstCall.calledWithMatch(
				metaNode,
				[
					{ height: '0px' },
					{ height: '10px' }
				],
				{
					duration: 2
				}
			));
		});
		it('starts animations paused', () => {
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(pauseStub.calledOnce);
			assert.isTrue(playStub.notCalled);
		});
		it('plays when play set to true', () => {
			animate.controls = {
				play: true
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(playStub.calledOnce);
			assert.isTrue(pauseStub.notCalled);
		});
		it('reverses when reverse set to true', () => {
			animate.controls = {
				reverse: true
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(reverseStub.calledOnce);
		});
		it('cancels when cancel set to true', () => {
			animate.controls = {
				cancel: true
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(cancelStub.calledOnce);
		});
		it('finishes when finish set to true', () => {
			animate.controls = {
				finish: true
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(finishStub.calledOnce);
		});
		it('sets playback rate when passed', () => {
			animate.controls = {
				playbackRate: 2
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(playbackRateStub.calledOnce);
		});
		it('can set start time', () => {
			animate.controls = {
				startTime: 2
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(startStub.calledOnce);
			assert.isTrue(startStub.firstCall.calledWith(2));
		});
		it('can set current time', () => {
			animate.controls = {
				currentTime: 2
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(currentStub.calledOnce);
			assert.isTrue(currentStub.firstCall.calledWith(2));
		});
		it('will execute effects function if one is passed', () => {
			const fx = stub().returns([]);
			animate.effects = fx;
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(fx.calledOnce);
		});
		it('clears down used animations on next render if theyve been removed', () => {
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(cancelStub.notCalled);

			widget.callInvalidate();
			animate = undefined;

			widget.__render__();
			assert.isTrue(cancelStub.calledOnce);
		});
		it('will call onfinish function if passed', () => {
			const onFinishStub = stub();
			animate.controls = {
				onFinish: onFinishStub
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(onFinishStub.calledOnce);
		});
		it('will call oncancel function if passed', () => {
			const onCancelStub = stub();
			animate.controls = {
				onCancel: onCancelStub
			};
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(onCancelStub.calledOnce);
		});
		it('can return a function instead of properties object', () => {
			const animateReturn = {
				id: 'animation',
				effects,
				controls,
				timing
			};
			animate = () => animateReturn;

			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(keyframeCtorStub.firstCall.calledWithMatch(
				metaNode,
				[
					{ height: '0px' },
					{ height: '10px' }
				],
				{}
			));
		});
		it('does not create animation if function does not return properties', () => {
			animate = () => undefined;

			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.notCalled);
		});
		it('can have multiple animations on a single node', () => {
			animate = [{
				id: 'animation1',
				effects,
				controls,
				timing
			},
			{
				id: 'animation2',
				effects,
				controls,
				timing
			}];
			const widget = new TestWidget();
			const meta = widget.getMeta();
			stub(meta, 'getNode').returns(metaNode);

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledTwice);
		});

		describe('get info', () => {
			beforeEach(() => {
				global.Animation = class {
					constructor() {}
					play() {}
					pause() {}
					get startTime() { return 0; }
					get currentTime() { return 500; }
					get playState() { return 'running'; }
					get playbackRate() { return 1; }
				};
			});

			it('returns undefined for non existant animation', () => {
				const widget = new TestWidget();
				const meta = widget.getMeta();
				stub(meta, 'getNode').returns(metaNode);

				widget.render();

				const info = meta.get('nonAnimation');

				assert.isUndefined(info);
			});

			it('returns animation info when get is called', () => {
				animate.duration = 1000;
				animate.controls = {
					play: true
				};

				const widget = new TestWidget();
				const meta = widget.getMeta();
				stub(meta, 'getNode').returns(metaNode);

				widget.render();

				const info = meta.get('animation');

				assert.deepEqual(info, {
					startTime: 0,
					currentTime: 500,
					playState: 'running',
					playbackRate: 1
				});
			});
		});

	});
});
