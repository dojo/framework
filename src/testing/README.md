# testing

Simple API for testing and asserting Dojo widget's expected virtual DOM and behavior.

-   Simple, familiar and minimal API
-   Focused on testing Dojo virtual DOM structures
-   No DOM requirement by default
-   Full functional and tsx support

## Features

-   `renderer` a renderer for rendering the thing in a test enviroment
-   `assertion` an assertion builder which can be expected against the renderer
-   `wrap` a type safe component/element selector
-   `ignore` a utility function to exclude components/elements from an assertion
-   `compare` a custom comparator for component/element properties

Please see the [reference guide](https://dojo.io/learn/testing) for more information.
