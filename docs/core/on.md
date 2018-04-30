# On

`dojo-core/on` provides event handling support with methods to attach and emit events.

## 'emit'

Dispatch event to target.

```ts
import { emit } from '@dojo/core/on';

var button = document.getElementById('button');
var DOMEventObject = {
	type: 'click',
	bubbles: true,
	cancelable: true
};

emit(button, DOMEventObject);

```
## 'on'

Adds event listener to target.

```ts
import { on } from '@dojo/core/on';

var button = document.getElementById('button');

on(button, 'click', function (event) {
	console.log(event.target.id);
});

```
## .once.

Attach an event that can only be called once to a target.

```ts
import { once } from '@dojo/core/on';

var button = document.getElementById('button');
once(button, 'click', function (event) {
	console.log(event.target.id);
	console.log('this event has been removed')
});

```
## 'pausable'

Attach an event that can be paused to a target.

```ts
import { pausable } from '@dojo/core/on';

var button = document.getElementById('button');
var buttonClickHandle = pausable(button, 'click', function (event) {
	console.log(event.target.id);
});

buttonClickHandle.pause(); // when paused the event will not fire
buttonClickHandle.resume(); // after resuming the event will begin to fire again if triggered

```
