import global from '../../../../src/shim/global';
const { assert } = intern.getPlugin('chai');
const { after, afterEach, beforeEach, before, describe, it } = intern.getInterface('bdd');
const { describe: jsdomDescribe } = intern.getPlugin('jsdom');
import { AnimationEffectTiming } from '../../../../src/shim/WebAnimations';
import WebAnimation from '../../../../src/widget-core/meta/WebAnimation';
import { WidgetBase } from '../../../../src/widget-core/WidgetBase';
import { v } from '../../../../src/widget-core/d';
import { spy, stub } from 'sinon';

let animationExists = false;
let globalAnimation: any;
let globalKeyframeEffect: any;

jsdomDescribe('WebAnimation', () => {
	let effects: any;
	let controls: any;
	let timing: AnimationEffectTiming;
	let animate: any;

	class TestWidget extends WidgetBase {
		render() {
			(this.meta(WebAnimation) as any).animate('animated', animate);

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
	let widget: any;
	let meta: any;
	let metaStub: any;

	before(async () => {
		globalAnimation = global.Animation;
		globalKeyframeEffect = global.KeyframeEffect;
		global.KeyframeEffect = class {
			constructor(...args: any[]) {
				keyframeCtorStub(...args);
			}
		};
		global.Animation = class {
			constructor(...args: any[]) {
				animationCtorStub(...args);
			}
			get startTime() {
				return 0;
			}
			get currentTime(): number | undefined {
				return animationExists ? 500 : undefined;
			}
			get playState() {
				return animationExists ? 'running' : undefined;
			}
			get playbackRate() {
				return 1;
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
			set currentTime(time: number | undefined) {
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
		};
	});

	after(() => {
		global.KeyframeEffect = globalKeyframeEffect;
		global.Animation = globalAnimation;
	});

	beforeEach(() => {
		effects = [{ height: '0px' }, { height: '10px' }];
		controls = {};
		timing = {};
		animate = {
			id: 'animation',
			effects
		};
		animationExists = false;
	});

	describe('integration', () => {
		it('creates an animation player for each node with animations', () => {
			widget = new TestWidget();
			meta = widget.getMeta();

			const addSpy = spy(meta, 'animate');

			widget.__render__();
			assert.isTrue(addSpy.calledOnce);
		});
		it('clears animations after new animations have been added', () => {
			widget = new TestWidget();
			meta = widget.getMeta();

			const addSpy = spy(meta, 'animate');
			const clearSpy = spy(meta, 'afterRender');

			widget.__render__();
			assert.isTrue(addSpy.calledOnce);
			assert.isTrue(clearSpy.calledOnce);
			assert.isTrue(clearSpy.calledAfter(addSpy));
		});
	});

	describe('player', () => {
		beforeEach(() => {
			keyframeCtorStub.resetHistory();
			animationCtorStub.resetHistory();
			pauseStub.resetHistory();
			playStub.resetHistory();
			reverseStub.resetHistory();
			cancelStub.resetHistory();
			finishStub.resetHistory();
			startStub.resetHistory();
			currentStub.resetHistory();
			playbackRateStub.resetHistory();
			metaNode = document.createElement('div');

			widget = new TestWidget();
			meta = widget.getMeta();
			metaStub = stub(meta as any, 'getNode').returns(metaNode);
		});

		afterEach(() => {
			metaStub.restore();
		});

		it('creates new KeyframeEffect and Animation for each WebAnimation node', () => {
			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(animationCtorStub.calledOnce);
		});
		it('reuses previous KeyframeEffect and Player when animation is still valid', () => {
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

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(
				keyframeCtorStub.firstCall.calledWithMatch(metaNode, [{ height: '0px' }, { height: '10px' }], {
					duration: 2
				})
			);
		});
		it('starts animations paused', () => {
			widget.__render__();
			assert.isTrue(pauseStub.calledOnce);
			assert.isTrue(playStub.notCalled);
		});
		it('plays when play set to true', () => {
			animate.controls = {
				play: true
			};

			widget.__render__();
			assert.isTrue(playStub.calledOnce);
			assert.isTrue(pauseStub.notCalled);
		});
		it('reverses when reverse set to true', () => {
			animate.controls = {
				reverse: true
			};

			widget.__render__();
			assert.isTrue(reverseStub.calledOnce);
		});
		it('cancels when cancel set to true', () => {
			animate.controls = {
				cancel: true
			};

			widget.__render__();
			assert.isTrue(cancelStub.calledOnce);
		});
		it('finishes when finish set to true', () => {
			animate.controls = {
				finish: true
			};

			widget.__render__();
			assert.isTrue(finishStub.calledOnce);
		});
		it('sets playback rate when passed', () => {
			animate.controls = {
				playbackRate: 2
			};

			widget.__render__();
			assert.isTrue(playbackRateStub.calledOnce);
		});
		it('can set start time', () => {
			animate.controls = {
				startTime: 2
			};

			widget.__render__();
			assert.isTrue(startStub.calledOnce);
			assert.isTrue(startStub.firstCall.calledWith(2));
		});
		it('can set current time', () => {
			animate.controls = {
				currentTime: 2
			};

			widget.__render__();
			assert.isTrue(currentStub.calledOnce);
			assert.isTrue(currentStub.firstCall.calledWith(2));
		});
		it('will execute effects function if one is passed', () => {
			const fx = stub().returns([]);
			animate.effects = fx;

			widget.__render__();
			assert.isTrue(fx.calledOnce);
		});
		it('clears down used animations on next render if theyve been removed', () => {
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

			widget.__render__();
			assert.isTrue(onFinishStub.calledOnce);
		});
		it('will call oncancel function if passed', () => {
			const onCancelStub = stub();
			animate.controls = {
				onCancel: onCancelStub
			};

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

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledOnce);
			assert.isTrue(
				keyframeCtorStub.firstCall.calledWithMatch(metaNode, [{ height: '0px' }, { height: '10px' }], {})
			);
		});
		it('does not create animation if function does not return properties', () => {
			animate = () => undefined;

			widget.__render__();
			assert.isTrue(keyframeCtorStub.notCalled);
		});
		it('can have multiple animations on a single node', () => {
			animate = [
				{
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
				}
			];

			widget.__render__();
			assert.isTrue(keyframeCtorStub.calledTwice);
		});

		describe('get info', () => {
			beforeEach(() => {
				widget = new TestWidget();
				meta = widget.getMeta();
				metaStub = stub(meta as any, 'getNode').returns(metaNode);
			});

			afterEach(() => {
				metaStub.restore();
			});

			it('returns undefined for non existant animation', () => {
				widget.render();

				const info = meta.get('nonAnimation');

				assert.isUndefined(info);
			});

			it('returns animation info when get is called', () => {
				animationExists = true;
				animate.duration = 1000;
				animate.controls = {
					play: true
				};

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
