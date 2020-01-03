import { SupportedClassName } from '../interfaces';

let browserSpecificTransitionEndEventName = '';
let browserSpecificAnimationEndEventName = '';

function determineBrowserStyleNames(element: HTMLElement) {
	if ('WebkitTransition' in element.style) {
		browserSpecificTransitionEndEventName = 'webkitTransitionEnd';
		browserSpecificAnimationEndEventName = 'webkitAnimationEnd';
	} else if ('transition' in element.style || 'MozTransition' in element.style) {
		browserSpecificTransitionEndEventName = 'transitionend';
		browserSpecificAnimationEndEventName = 'animationend';
	} else {
		throw new Error('Your browser is not supported');
	}
}

function initialize(element: HTMLElement) {
	if (browserSpecificAnimationEndEventName === '') {
		determineBrowserStyleNames(element);
	}
}

function runAndCleanUp(element: HTMLElement, startAnimation: () => void, finishAnimation: () => void) {
	initialize(element);

	let finished = false;

	let transitionEnd = function() {
		if (!finished) {
			finished = true;
			element.removeEventListener(browserSpecificTransitionEndEventName, transitionEnd);
			element.removeEventListener(browserSpecificAnimationEndEventName, transitionEnd);

			finishAnimation();
		}
	};

	startAnimation();

	element.addEventListener(browserSpecificAnimationEndEventName, transitionEnd);
	element.addEventListener(browserSpecificTransitionEndEventName, transitionEnd);
}

function exit(node: HTMLElement, exitAnimation: string, active?: SupportedClassName) {
	const exitAnimationClasses = exitAnimation.split(' ');
	const activeClasses =
		active && active !== true ? active.split(' ') : exitAnimationClasses.map((className) => `${className}-active`);

	runAndCleanUp(
		node,
		() => {
			exitAnimationClasses.forEach((className) => node.classList.add(className));

			requestAnimationFrame(function() {
				activeClasses.forEach((className) => node.classList.add(className));
			});
		},
		() => {
			node && node.parentNode && node.parentNode.removeChild(node);
		}
	);
}

function enter(node: HTMLElement, enterAnimation: string, active?: SupportedClassName) {
	const enterAnimationClasses = enterAnimation.split(' ');
	const activeClasses =
		active && active !== true ? active.split(' ') : enterAnimationClasses.map((className) => `${className}-active`);

	runAndCleanUp(
		node,
		() => {
			enterAnimationClasses.forEach((className) => node.classList.add(className));

			requestAnimationFrame(function() {
				activeClasses.forEach((className) => node.classList.add(className));
			});
		},
		() => {
			enterAnimationClasses.forEach((className) => node.classList.remove(className));
			activeClasses.forEach((className) => node.classList.remove(className));
		}
	);
}

export default {
	enter,
	exit
};
