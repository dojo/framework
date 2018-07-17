# TypeScript and Dojo

## TypeScript Roadmap Items

The following table lists TypeScript roadmap items or issues that are of interest to Dojo.

|Item|Version|Issue|Reason|
|----|-------|-----|------|
|Generic rest/spread|2.6|[Microsoft/TypeScript#10727](https://github.com/Microsoft/TypeScript/issues/10727)|It is part of the path to variadic kinds and we often model types that would benefit from rest/spread|
|Variadic Kinds|*?*|[Microsoft/TypeScript#5453](https://github.com/Microsoft/TypeScript/issues/5453)|Currently, there are use cases with mixins where aggregating types is necessary|
|Support generic type inferrence over higher order functions|*?*|[Microsoft/TypeScript#9366](https://github.com/Microsoft/TypeScript/issues/9366)|While [Microsoft/TypeScript#16072](https://github.com/Microsoft/TypeScript/pull/16072) for 2.4 is a partial solution, there are still situations where we get "stuck" with the type system modelling some higher order functions.|
|Support for project references|*?*|[Microsoft/TypeScript#3469](https://github.com/Microsoft/TypeScript/issues/3469)|Allow multiple TypeScript only projects/packages to work together without having to use transpiled code|
|Support decorators in class expressions|*?*|[Microsoft/TypeScript#](https://github.com/Microsoft/TypeScript/issues/7342)|In `shim`, we have started using class expressions and cannot use some of our visibility decorators|

## Delivered Roadmap Items

The following items have been delivered that have potential impact on Dojo:

|Item|Version|Issue|Reason|
|----|-------|-----|------|
|ESNext import()|2.4|[Microsoft/TypeScript#14495](https://github.com/Microsoft/TypeScript/issues/14495)|Allows Dojo to support dynamic import statements per the ESM update in ES8 or ES9|
|Stricter generic checks|2.4|[Microsoft/TypeScript#16368](https://github.com/Microsoft/TypeScript/pull/16368)|Better contraints on generic checking helps eliminate design time errors|
|Weak Type Detection|2.4|[Microsoft/TypeScript#16047](https://github.com/Microsoft/TypeScript/pull/16047)|Weak types are properly detected and constrained.  Helps eliminate errors in code where an object has all optional properties, one of the things we have been challenged with in real world code|
|Generic type parameters|2.3|[Microsoft/TypeScript#2175](https://github.com/Microsoft/TypeScript/issues/2175)|Default values for generic type variables|
[Async iterations and Generator down levelling]|2.3|[Microsoft/TypeScript#12346](https://github.com/Microsoft/TypeScript/pull/12346)|This allows us to support non-ES6+ environments with Dojo, as well as ES8 for await of|
|Language Service Plugins|2.3|[Microsoft/TypeScript#12231](https://github.com/Microsoft/TypeScript/pull/12231)|Easier to extend TypeScript language services with additional capabilities|
|Mixins/Traits|2.2|[Microsoft/TypeScript#311](https://github.com/Microsoft/TypeScript/issues/311)|Ability to better support mixin type functionality via [Microsoft/TypeScript#13743](https://github.com/Microsoft/TypeScript/pull/13743), [Microsoft/TypeScript#13604](https://github.com/Microsoft/TypeScript/pull/13604), [Microsoft/TypeScript#13924](https://github.com/Microsoft/TypeScript/issues/13924), and [Microsoft/TypeScript#14017](https://github.com/Microsoft/TypeScript/issues/14017)|
|`async`/`await` down levelling|2.1|[Microsoft/TypeScript#1664](https://github.com/Microsoft/TypeScript/issues/1664)|This allows us to support non-ES6+ environments with Dojo|
|Supporting "partial" types|2.1|[Microsoft/TypeScript#4889](https://github.com/Microsoft/TypeScript/issues/4889)|Makes it easier to say that an interface implements some items from another interface|
|ES8 Object property spread/rest|2.1|[Microsoft/TypeScript#2103](https://github.com/Microsoft/TypeScript/issues/2103)|Set to be ratified in ES8, this is available in TS2.1|
|`lib` modularization|2.0|[Microsoft/TypeScript#6974](https://github.com/Microsoft/TypeScript/issues/6974)|While there was a broader issue around ganular targetting, the `lib` feature has allowed us to meet our needs.|
|Better Loader Plugin Support|2.0|[Microsoft/TypeScript#6615](https://github.com/Microsoft/TypeScript/issues/6615)|This allows us to properly type plugins.|
|Function `this` typing|2.0|[Microsoft/TypeScript#3694](https://github.com/Microsoft/TypeScript/issues/3694)|There are several use cases in Dojo where typing `this` within a function will improve code safety|
|Implicit index signatures|2.0|[Microsoft/TypeScript#7029](https://github.com/Microsoft/TypeScript/issues/7029)|Several of the Dojo core APIs would benefit from being able to pass object literals without explicitly typing them|
|Read Only Properties|2.0|[Microsoft/TypeScript#6532](https://github.com/Microsoft/TypeScript/pull/6532)|Allows specification of interfaces that do not allow property reassignment, which can better refect runtime behaviour|
|"Native UMD"|2.0|[Microsoft/TypeScript#7125](https://github.com/Microsoft/TypeScript/issues/7125)|Solves the problem of exporting interfaces for re-importing, hopefully avoiding collisions|
|String Literal Types|1.8|[Microsoft/TypeScript#5185](https://github.com/Microsoft/TypeScript/issues/5185)|There are many instances where a string literal type will assist in making Dojo more usable|
|F-Bounded Polymorphism|1.8|[Microsoft/TypeScript#5949](https://github.com/Microsoft/TypeScript/issues/5949)|The ability for generics to refer to other generics within the same argument list addresses a couple challenges in Dojo|
|Augmenting global type interfaces from within modules|1.8|[Microsoft/TypeScript#4166](https://github.com/Microsoft/TypeScript/issues/4166)|There are several instances when we are feature detecting within a module but need to alter the global interface as we shim in functionality|
|`this` based type guards|1.8|[Microsoft/TypeScript#5906](https://github.com/Microsoft/TypeScript/issues/5906)|Accepting a polymorphic `this` as a type guard solves some use cases in Dojo|


## Uncomitted Issues

The following table lists issues that are important to Dojo, but the TypeScript team have yet to commit to them in the roadmap:

|Item|Issue|Reason|
|----|-----|------|
|Annotate immediately-invoked functions for CFA|[Microsoft/TypeScript#11498](https://github.com/Microsoft/TypeScript/issues/11498)|We have several redundant guards in callbacks because narrowing gets reset in function scope, though we know the callback will be invoked in turn (related: [Microsoft/Typescript#17449](https://github.com/Microsoft/TypeScript/issues/17449))|
|`this` as a Generic Argument|[Microsoft/TypeScript#6223](https://github.com/Microsoft/TypeScript/issues/6223)|Polymorphic `this` is a legitimate way of type guarding on extended/composed classes|
|Mixin classes when targeting ES2015+|[Microsoft/TypeScript#17088](https://github.com/Microsoft/TypeScript/issues/17088)|When targeting ES2015+ but using Dojo targeted at ES5, you end up with a run-time issue, this means all downstream code would also need to target ES5|
