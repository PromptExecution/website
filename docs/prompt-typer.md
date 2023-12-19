prompt-typer

REQUIREMENTS FOR "TYPER" ENHANCEMENT

Enhance an existing TYPESCRIPT Vue3 Vite project, with pinia store.

There is an existing component vue-command which offers a CLI experience,
ability to run commands and simulate a terminal cli experience.

Today we are going to extend vue-command so that it can be used as an interactive prompt-typer.


the task is in two stages:
    first we will wait for a pre-determined CONFIGURABLE timeout (~1.5s) of no keystokes or mouse-movements, which will trigger an "idle" Event

    during the idle event, we will inject text messages into the terminal
    the injection will need to be animated, so that it appears as if the user (or another user) is typing the text
    the content of the message for now will just be "hello\n" and that should execute the command in the terminal.
    (more messages and complex messages will be added later, so it's best to make the command injection process as flexible as possible)
    it would be nice if the injection could pause before sending "enter", also the ability to write something and then backspace (like a hint saying "Let's login!" and then removing the text and typing the command)
    at any point if the user starts moving the mouse or typing, the injection should be paused and the commands should be ignored until the user is idle & at a blank/empty line.

I will provide References:
* documentation for vue-command component
* examples of CSS animations for typing:







----


vue-command
A fully working, most feature-rich Vue.js terminal emulator. See the demo and check the demo source code. Now with Vue.js 3 support!

Let's start with a dead simple example. We want to send "Hello world" to Stdout when entering hello-world.

```
<template>
  <vue-command :commands="commands" />
</template>

<script>
import VueCommand, { createStdout } from "vue-command";
import "vue-command/dist/vue-command.css";

export default {
  components: {
    VueCommand,
  },

  data: () => ({
    commands: {
      "hello-world": () => createStdout("Hello world"),
    },
  }),
};
</script>
```

```
Properties
Some properties can be mutated by the terminal. Therefore, adding the v-model directive is required.

Property	Description	Type	Default value	Required	Two-way binding
commands	See Commands	Object	{}	No	No
cursor-position	Cursor position	Number	0	No	Yes
dispatched-queries	Non-empty dispatched queries	Set	new Set()	No	Yes
event-resolver	See Event resolver	Function	newDefaultEventResolver	No	No
font	Terminal font	String	''	No	No
help-text	Command help	String	''	No	Yes
help-timeout	Command help timeout	Number	3000	No	No
hide-bar	Hides the bar	Boolean	false	No	No
hide-buttons	Hides the buttons	Boolean	false	No	No
hide-prompt	Hides the prompt	Boolean	false	No	No
hide-title	Hides the title	Boolean	false	No	No
history	Terminal history	Array	[]	No	Yes
history-position	Points to the latest dispatched query entry	Number	0	No	Yes
interpreter	See Interpreter	Function	null	No	No
invert	Inverts the terminals colors	Boolean	false	No	No
is-fullscreen	Terminal fullscreen mode	Boolean	false	No	Yes
options-resolver	See Options resolver	Function	null	No	No
parser	Query parser	Function	defaultParser	No	No
prompt	Terminal prompt	String	~$	No	No
show-help	Show query help	Boolean	false	No	No
title	Terminal title	String	~$	No	No
query	Terminal query	String	''	No	Yes
Commands
commands must be an object containing key-value pairs where key is the command and the value is a function that will be called with the parsed arguments. The function can return a Promise and must return or resolve a Vue.js component. To return strings or a new query, use one of the convenient helper methods.

Any component that is not the query component can inject the context. The context includes the parsed and raw query as fields.

Event resolver
It's possible to provide an array property eventResolver which is called when the terminal is mounted. Each event resolver will be called with the terminals references and exposed values.

The libraries defaultHistoryEventResolver makes usage of that and allows to cycle through commands with ↑/↓.

Options resolver
The terminal provides a built-in autocompletion for the given commands. As soon as the query has been autocompleted by the terminal, it's calling the options resolver provided as property. The resolver is called with the program, parsed query and a setter to update the query.

Interpreter
An interpreter allows to execute arbitrary code after the query has been dispatched and to not rely on missing functionality which includes pipes, streams or running multiple commands in parallel.

The interpreter is a property function that is called with the unparsed query right after the query component calls dispatch and terminates it at the same time. After the call, you must use the properties and exposed functions to reach the desired behaviour.
```

```
Library
Library provides helper methods to render terminal related content.

Function	Parameters	Description
createCommandNotFound	command, text = 'command not found', name = 'VueCommandNotFound'	Creates a command not found component
createStderr	formatterOrText, name = 'VueCommandStderr'	Creates a "stderr" component
createStdout	formatterOrText, name = 'VueCommandStdout'	Creates a "stdout" component
createQuery		Creates a query component
defaultHistoryEventResolver	refs, eventProvider	The default history event resolver
defaultParser	query	The default parser
defaultSignalEventResolver	refs, eventProvider	The default signal event resolver
jsonFormatter	value	See Formatters
listFormatter	...lis	See Formatters
newDefaultEventResolver		Returns a new default event resolver
newDefaultHistory		Returns a new default history
tableFormatter	rows	See Formatters
textFormatter	text, innerHtml = false	See Formatters
Helper methods can be imported by name:

import { createStdout, createQuery } from "vue-command";
Formatters
The first argument of createStdout can be either a primitive (Boolean, Number or String) or a formatter. A formatter formats the content as a list or table or something else.

Function	Parameters
jsonFormatter	value
listFormatter	...lis
tableFormatter	rows
textFormatter	text, innerHtml = false
Formatters can be imported by name:

import { listFormatter } from "vue-command";
Provided
Identifier	Type	Parameters
addDispatchedQuery	Function	dispatchedQuery
appendToHistory	Function	...components
dispatch	Function	query
decrementHistory	Function
exit	Function
context	Object
helpText	String
helpTimeout	Number
hidePrompt	Boolean
incrementHistory	Function
optionsResolver	Function	program, parsedQuery, setQuery
parser	Function	query
programs	Array
sendSignal	Function	signal
setCursorPosition	Function	cursorPosition
setFullscreen	Function	isFullscreen
setHistoryPosition	Function	historyPosition
setQuery	Function	query
showHelp	Boolean
signals	Object
slots	Object
terminal	Object
Provider can be injected into your component by name:

inject: ["exit", "terminal"],
Exposed
Identifier	Type	Parameters
addDispatchedQuery	Function	dispatchedQuery
appendToHistory	Function	...components
decrementHistory	Function
dispatch	Function	query
exit	Function
incrementHistory	Function
programs	Array
sendSignal	Function	signal
setCursorPosition	Function	cursorPosition
setFullscreen	Function	isFullscreen
setHistoryPosition	Function	historyPosition
setQuery	Function	query
signals	Object
terminal	Object
Events
Name	Description
closeClicked	Emitted on button close click
minimizeClicked	Emitted on button minimize click
fullscreenClicked	Emitted on button fullscreen click
Signals
You can send and receive signals like SIGINT, SIGTERM or SIGKILL. SIGINT is the only implemented signal for now. When the user presses Ctrl + c, you can listen to this event by providing a signal name and a callback:

const signals = inject("signals");
const sigint = () => {
  // Tear down component
};
signals.on("SIGINT", sigint);
To unsubscribe from the signal, pass the same signal name and callback you used to subscribe to the signal.

signals.off("SIGINT", sigint);
```



---
CSS animations for typing


/* Animation */
p {
  animation: animated-text 4s steps(29,end) 1s 1 normal both,
             animated-cursor 600ms steps(29,end) infinite;
}

/* text animation */

@keyframes animated-text{
  from{width: 0;}
  to{width: 472px;}
}

/* cursor animations */

@keyframes animated-cursor{
  from{border-right-color: rgba(0,255,0,.75);}
  to{border-right-color: transparent;}
}


body {
    background-color:#333;
  }

  .output {
    text-align:center;
    font-family: 'Source Code Pro', monospace;
    color:white;
    h1 {
      font-size:30px;
    }
  }

  /* Cursor Styling */

  .cursor::after {
    content:'';
    display:inline-block;
    margin-left:3px;
    background-color:white;
    animation-name:blink;
    animation-duration:0.5s;
    animation-iteration-count: infinite;
  }
  h1.cursor::after {
    height:24px;
    width:13px;
  }
  p.cursor::after {
    height:13px;
    width:6px;
  }

  @keyframes blink {
    0% {
      opacity:1;
    }
    49% {
      opacity:1;
    }
    50% {
      opacity:0;
    }
    100% {
      opacity:0;
    }
  }


Please break down this task step by step with working code examples and some comments to explain.
