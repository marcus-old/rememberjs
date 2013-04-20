[remember.js](http://marcusaspin.github.io/rememberjs)
==========

Remember.js is a lightweight but flexible javascript library to help you save user settings and data between sessions.
It was born out of an upcoming news reader project where I found myself continuously hassled by errors and incompatibilities when saving user settings on the client-side. I decided it was time to create a library that did everything I needed and more. So here you have it, remember.js

Usage
=====

### via HTML
To remember an input/select element, just add the data-remember attribute
For example:
```html
<input type='text' data-remember>
<input type='checkbox' data-remember>
<select data-remember>
    <option>Option 1</option>
    <option>Option 2</option>
    <option>Option 3</option>
<select>
```

### via Javascript
To remember a value using javascript, you should call
```javascript
var myElement = document.getElementById("#myElement");
new remember.Control(myElement, options);
```
with the arguments:
  * myElement - The _HTMLElement_ to remember the value of.
  * options - An optional _Object_ with the following attributes:
    * get - A _function_ that will return the value to be saved of the element stored in `javascript this.element `.
      * Example for text input: `javascript function(){ return this.element.value } `
      * Example for checkbox: `javascript function(){ return this.element.checked } `
      * Example for select: `javascript function(){ return this.element.selectedIndex } `
    * set - A _function_ to set the value of the element.
      * Example for text input: `javascript function(val){ return this.element.value = val } `
      * Example for select: `javascript function(val){ return this.element.selectedIndex = val } `
    * reset - A _function_ used to reset the value of the element to it's default. The default value is stored in `javascript this.def `.
      * Example for text input: `javascript function(){ return this.element.value = "This is the default value" } `
      * Example for select: `javascript function(){ return this.element.selectedIndex = this.def } `
    * def - The default value of the element, this will be used used by the reset function


Once all the elements are registered, use
```javascript
remember.save();
remember.load();
remember.reset();
```
to save, load and reset the elements values respectively.

For examples of correct usage and some extra features, check out the [Demo page](http://marcusaspin.github.io/rememberjs/examples.html)