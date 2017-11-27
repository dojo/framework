import { By, WebDriver, WebElement, Condition } from 'selenium-webdriver';
import { config } from './common';

interface PathPart {
	tagName: string;
	index: number;
}

let useShadowRoot = false;

export function setUseShadowRoot(val: boolean | undefined) {
	useShadowRoot = Boolean(val);
}

function convertPath(path: string): Array<PathPart> {
	let parts = path.split(/\//).filter(v => !!v);
	let res: Array<PathPart> = [];
	for (let part of parts) {
		let components = part.split(/\[|]/).filter(v => !!v);
		let tagName = components[0];
		let index = 0;
		if (components.length === 2) {
			index = Number(components[1]);
			if (!index) {
				console.log('Index can\'t be parsed', components[1]);
				throw 'Index can\'t be parsed ' + components[1];
			}
		}
		else {
			index = 1;
		}
		res.push({tagName, index});
	}
	return res;
}

// Fake findByXPath for simple XPath expressions to allow usage with shadow dom
async function findByXPath(node: WebElement, path: string): Promise<WebElement | null> {
	let paths = convertPath(path);
	let n = node;
	try {
		for (let p of paths) {
			let elems = await n.findElements(By.css(p.tagName + ':nth-child(' + (p.index) + ')'));

			if (elems === null || elems.length === 0) {
				console.log('not found');
				return null;
			}

			n = elems[0];
		}
	} catch (e) {
		// Can happen for StaleElementReferenceError
		return null;
	}

	return n;
}

function waitForCondition(driver: WebDriver) {
	return async function(text: string, fn: (driver: WebDriver) => Promise<boolean>, timeout: number): Promise<boolean> {
		return await driver.wait(new Condition<boolean>(text, fn), timeout);
	};
}

// driver.findElement(By.xpath("//tbody/tr[1]/td[1]")).getText().then(...) can throw a stale element error:
// thus we're using a safer way here:
export async function testTextContains(driver: WebDriver, xpath: string, text: string, timeout = config.TIMEOUT) {
	return waitForCondition(driver)(`testTextContains ${xpath} ${text}`,
		async function(driver): Promise<any> {
			try {
				const shadowRootElm = await shadowRoot(driver);
				const elm = await findByXPath(shadowRootElm, xpath);
				if (elm === null) {
					return false;
				}
				let v = await elm.getText();
				return v && v.indexOf(text) > -1;
			} catch (err) {
				console.log('ignoring error in testTextContains for xpath = ' + xpath + ' text = ' + text, err.toString().split('\n')[0]);
			}
		}, timeout);
}

export function testTextNotContained(driver: WebDriver, xpath: string, text: string, timeout = config.TIMEOUT) {
	return waitForCondition(driver)(`testTextNotContained ${xpath} ${text}`,
		async function(driver) {
			try {
				const shadowRootElm = await shadowRoot(driver);
				const elem = await findByXPath(shadowRootElm, xpath);
				if (elem === null) { return false; }
				let v = await elem.getText();
				return Boolean(v && v.indexOf(text) === -1);
			} catch (err) {
				console.log('ignoring error in testTextNotContained for xpath = ' + xpath + ' text = ' + text, err.toString().split('\n')[0]);
				return false;
			}
		}, timeout);
}

export function testClassContains(driver: WebDriver, xpath: string, text: string, timeout = config.TIMEOUT) {
	return waitForCondition(driver)(`testClassContains ${xpath} ${text}`,
		async function(driver) {
			try {
				const shadowRootElm = await shadowRoot(driver);
				const elem = await findByXPath(shadowRootElm, xpath);
				if (elem === null) { return false; }
				let v = await elem.getAttribute('class');
				return Boolean(v && v.indexOf(text) > -1);
			} catch (err) {
				console.log('ignoring error in testClassContains for xpath = ' + xpath + ' text = ' + text, err.toString().split('\n')[0]);
				return false;
			}
		}, timeout);
}

export function testElementLocatedByXpath(driver: WebDriver, xpath: string, timeout = config.TIMEOUT) {
	return waitForCondition(driver)(`testElementLocatedByXpath ${xpath}`,
		async function(driver) {
			try {
				const shadowRootElm = await shadowRoot(driver);
				const elem = await findByXPath(shadowRootElm, xpath);
				return elem ? true : false;
			} catch (err) {
				console.log('ignoring error in testElementLocatedByXpath for xpath = ' + xpath, err.toString());
				return false;
			}
		}, timeout);
}

export function testElementNotLocatedByXPath(driver: WebDriver, xpath: string, timeout = config.TIMEOUT) {
	return waitForCondition(driver)(`testElementNotLocatedByXPath ${xpath}`,
		async function(driver) {
			try {
				const shadowRootElm = await shadowRoot(driver);
				const elem = await findByXPath(shadowRootElm, xpath);
				return elem ? false : true;
			} catch (err) {
				console.log('ignoring error in testElementNotLocatedByXPath for xpath = ' + xpath, err.toString().split('\n')[0]);
				return false;
			}
	}, timeout);
}

export function testElementLocatedById(driver: WebDriver, id: string, timeout = config.TIMEOUT) {
	return waitForCondition(driver)(`testElementLocatedById ${id}`,
		async function(driver) {
			try {
				await shadowRoot(driver);
				return true;
			} catch (err) {
				console.log('ignoring error in testElementLocatedById for id = ' + id, err.toString().split('\n')[0]);
				return false;
			}
		}, timeout);
	}

async function retry<T>(retryCount: number, driver: WebDriver, fun: (driver: WebDriver, retryCount: number) => Promise<T>): Promise<T | undefined> {
	for (let i = 0; i < retryCount; i++) {
		try {
			return fun(driver, i);
		} catch (err) {
			console.log('retry failed');
		}
	}
}

// Stale element prevention. For aurelia even after a testElementLocatedById clickElementById for the same id can fail
// No idea how that can be explained
export function clickElementById(driver: WebDriver, id: string) {
	return retry(5, driver, async function (driver) {
		let elem = await shadowRoot(driver);
		elem = await elem.findElement(By.id(id));
		await elem.click();
	});
}

export function clickElementByXPath(driver: WebDriver, xpath: string) {
	return retry(5, driver, async function(driver, count) {
		if (count > 1 && config.LOG_DETAILS) { console.log('clickElementByXPath ', xpath, ' attempt #', count); }
		const shadowRootElm = await shadowRoot(driver);
		const elem = await findByXPath(shadowRootElm, xpath);
		if (elem) {
			await elem.click();
		}
	});
}

export async function getTextByXPath(driver: WebDriver, xpath: string): Promise<any> {
	return await retry(5, driver, async function(driver, count) {
		if (count > 1 && config.LOG_DETAILS) { console.log('getTextByXPath ', xpath, ' attempt #', count); }
		const shadowRootElm = await shadowRoot(driver);
		const elem = await findByXPath(shadowRootElm, xpath);
		if (elem) {
			return await elem.getText();
		}
	});
}

async function shadowRoot(driver: WebDriver): Promise<WebElement> {
	return useShadowRoot ? await driver.executeScript('return document.querySelector("main-element").shadowRoot') as WebElement
		: await driver.findElement(By.tagName('body'));
}
