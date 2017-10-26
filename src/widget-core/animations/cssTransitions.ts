import { VirtualDomProperties } from './../interfaces';

let browserSpecificTransitionEndEventName = '';
let browserSpecificAnimationEndEventName = '';

function determineBrowserStyleNames(element: HTMLElement) {
	if ('WebkitTransition' in element.style) {
		browserSpecificTransitionEndEventName = 'webkitTransitionEnd';
		browserSpecificAnimationEndEventName = 'webkitAnimationEnd';
	}
	else if (('transition' in element.style) || ('MozTransition' in element.style)) {
		browserSpecificTransitionEndEventName = 'transitionend';
		browserSpecificAnimationEndEventName = 'animationend';
	}
	else {
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

	let transitionEnd = function () {
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

function exit(node: HTMLElement, properties: VirtualDomProperties, exitAnimation: string, removeNode: () => void) {
	const activeClass = properties.exitAnimationActive || `${exitAnimation}-active`;

	runAndCleanUp(node, () => {
		node.classList.add(exitAnimation);

		requestAnimationFrame(function () {
			node.classList.add(activeClass);
		});
	}, () => {
		removeNode();
	});
}

function enter(node: HTMLElement, properties: VirtualDomProperties, enterAnimation: string) {
	const activeClass = properties.enterAnimationActive || `${enterAnimation}-active`;

	runAndCleanUp(node, () => {
		node.classList.add(enterAnimation);

		requestAnimationFrame(function () {
			node.classList.add(activeClass);
		});
	}, () => {
		node.classList.remove(enterAnimation);
		node.classList.remove(activeClass);
	});
}

export default {
	enter,
	exit
};
