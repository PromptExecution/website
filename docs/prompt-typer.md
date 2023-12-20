prompt-typer

REQUIREMENTS FOR "TYPER" ENHANCEMENT

Enhance an existing TYPESCRIPT Vue3 Vite project, with pinia store.

There is an existing component vue-web-terminal which offers a CLI experience,
ability to run commands and simulate a terminal cli experience.

ALL OUTPUT MUST BE IN TYPESCRIPT (the documentation is written in javascript)
it will (after an idle period) set the command query then execute it.

the task is in two stages:
    first we will wait for a pre-determined CONFIGURABLE timeout (~1.5s) of no keystokes or mouse-movements, which will trigger an "onIdle" Event

    during the idle event, we will inject text messages into the terminal
    the injection will need to be animated, so that it appears as if the user (or another user) is typing the text
    the content of the message for now will just be "hello\n" and that should execute the command in the terminal.
    (more messages and complex messages will be added later, so it's best to make the command injection process as flexible as possible)
    it would be nice if the injection could pause before sending "enter", also the ability to write something and then backspace (like a hint saying "Let's login!" and then removing the text and typing the command)
    at any point if the user starts moving the mouse or typing, the injection should be paused and the commands should be ignored until the user is idle & at a blank/empty line.

I will provide References:
* documentation for vue-web-command component
* examples of CSS animations for typing:


----

// src/types/vue-web-terminal.d.ts

export interface EditorConfig {
    open: boolean
    focus: boolean
    value: string
    onClose: null | Function
    onFocus?: Function
    onBlur?: Function
}

export type Position = {
    x: number
    y: number
}

export type DragConfig = {
    width: number
    height: string
    zIndex?: string
    init?: Position
    pinned?: boolean
}

export type SearchResult = {
    show: boolean
    defaultBoxRect: null
    item?: Command
}

export type ScreenType = {
    xs?: boolean
    sm?: boolean
    md?: boolean
    lg?: boolean
    xl?: boolean
}

export type Command = {
    key: string
    title?: string
    group?: string
    usage?: string
    description?: string
    example?: Array<CommandExample>
}

export type CommandExample = {
    cmd: string
    des?: string
}

export type CmdHistory = {
    cmdLog: string[],
    cmdIdx: number
}

export type Options = {
    highlight: object
    codemirror: object
}

export type MessageContentTable = {
    head: string[],
    rows: string[][]
}

export type Message = {
    type?: 'normal' | 'json' | 'code' | 'table' | 'html' | 'ansi' | 'cmdLine'
    content: string | number | object | MessageContentTable | Array<any>
    class?: 'success' | 'error' | 'info' | 'warning' | 'system'
    tag?: string,
    depth?: number
}

export type AskConfig = {
    isPassword: boolean
    question: string,
    autoReview: boolean
    callback?: (value: string) => void
}

export type CommandStoreSortFunc = (a: any, b: any) => number

export type InputFilterFunc = (str1: string, str2: string, event: InputEvent) => string | null

export type CommandFormatterFunc = (cmd: string) => string

export type TabKeyHandlerFunc = (event: Event) => undefined

export type SearchHandlerCallbackFunc = (cmd: Command) => void

export type SearchHandlerFunc = (commands: Command[], key: string, callback: SearchHandlerCallbackFunc) => void

export type TerminalApiListenerFunc = (type: string, options?: any) => any | void

export type SuccessFunc = (message?: Message | Array<Message> | string | TerminalFlash | TerminalAsk) => void

export type FailedFunc = (message: string) => void

export type PushMessageBeforeFunc = (message: Message, name: String) => void

class TerminalCallback {

    onFinishListener: Function

    finish() {
        if (this.onFinishListener != null) {
            this.onFinishListener()
        }
    }

    onFinish(callback: Function) {
        this.onFinishListener = callback
    }
}

export class TerminalAsk extends TerminalCallback {
    handler: Function

    ask(options: AskConfig) {
        if (this.handler != null) {
            this.handler(options)
        }
    }

    onAsk(callback: (config: AskConfig) => void) {
        this.handler = callback
    }
}

export class TerminalFlash extends TerminalCallback {
    handler: Function

    flush(msg: string) {
        if (this.handler != null) {
            this.handler(msg)
        }
    }

    onFlush(callback: (msg: string) => void) {
        this.handler = callback
    }
}

//  每个terminal实例最多保存100条记录
const MAX_STORE_SIZE = 100
const DEFAULT_STORAGE_KEY = 'terminal'
export class TerminalStore {
    storageKey: string = DEFAULT_STORAGE_KEY
    dataMap: Object

    constructor(key?: string) {
        if (key) {
            this.storageKey = key
        }
        let dataMapStr = window.localStorage.getItem(this.storageKey)
        if (dataMapStr) {
            this.dataMap = JSON.parse(dataMapStr)
        } else {
            this.dataMap = {}
        }
    }

    push(name: string, cmd: string) {
        let data = this.getData(name)
        if (data.cmdLog == null) {
            data.cmdLog = []
        }
        if (data.cmdLog.length === 0 || data.cmdLog[data.cmdLog.length - 1] !== cmd) {
            data.cmdLog.push(cmd)

            if (data.cmdLog.length > MAX_STORE_SIZE) {
                data.cmdLog.splice(0, data.cmdLog.length - MAX_STORE_SIZE)
            }
        }

        data.cmdIdx = data.cmdLog.length
        this.store()
    }

    store() {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.dataMap))
    }

    getData(name: string): CmdHistory {
        let data = this.dataMap[name]
        if (data == null) {
            data = {}
            this.dataMap[name] = data
        }
        return data
    }

    getLog(name: string) {
        let data = this.getData(name)
        if (!data.cmdLog) {
            data.cmdLog = []
        }
        return data.cmdLog
    }

    clear(name: string) {
        let data = this.getData(name)
        data.cmdLog = []
        data.cmdIdx = 0
        this.store()
    }

    clearAll() {
        this.dataMap = {}
        this.store()
    }

    getIdx(name: string) {
        let data = this.getData(name)
        return data.cmdIdx | 0
    }

    setIdx(name: string, idx: number) {
        this.getData(name).cmdIdx = idx
    }
}

export interface TerminalApiData {
    pool: {
        [key: string]: TerminalApiListenerFunc
    },
    options?: Options
}

export class TerminalApi {

    data: TerminalApiData

    constructor(data: TerminalApiData) {
        this.data = data
    }

    post(name: string = 'terminal', event: string, options?: any) {
        console.debug(`Api receive event '${event}' from terminal '${name}' and attach options ${options}`)
        let listener:TerminalApiListenerFunc = this.data.pool[name]
        if (listener != null) {
            return listener(event, options)
        }
    }

    pushMessage(name: string, options: Message | Array<Message> | string) {
        return this.post(name, 'pushMessage', options)
    }

    appendMessage(name: string, options: string) {
        return this.post(name, 'appendMessage', options)
    }

    fullscreen(name: string) {
        return this.post(name, "fullscreen")
    }

    isFullscreen(name: string) {
        return this.post(name, 'isFullscreen')
    }

    dragging(name: string, options: Position) {
        return this.post(name, 'dragging', options)
    }

    execute(name: string, options: string) {
        return this.post(name, 'execute', options)
    }

    focus(name: string, options: boolean) {
        return this.post(name, 'focus', options)
    }

    elementInfo(name: string) {
        return this.post(name, 'elementInfo')
    }

    textEditorOpen(name: string, options?: EditorSetting) {
        return this.post(name, 'textEditorOpen', options)
    }

    textEditorClose(name: string, options?: any): string | any {
        return this.post(name, 'textEditorClose', options)
    }
}

export interface EditorSetting {
    content: string,
    onClose: Function
}



----

vue-web-terminal


一个由 Vue
构建的支持多内容格式显示的网页端命令行窗口插件，支持表格、json、代码等多种消息格式，支持自定义消息样式、命令行库、键入搜索提示等，模拟原生终端窗口支持 ← →
光标切换和 ↑ ↓ 历史命令切换。

## 功能支持

* 支持消息格式：文本、表格、json、代码/多行文本、html、ansi
* 支持内容[实时回显](#实时回显)
* 支持[用户问答输入](#用户询问输入)
* 支持`Highlight.js`、`Codemirror.js`代码高亮
* 支持 ← → 键光标切换
* 支持 ↑ ↓ 键历史命令切换
* 支持Fullscreen全屏显示
* 支持窗口拖拽
* 支持多行文本编辑
* 支持自定义命令库和命令搜索提示，Tab键快捷填充
* 支持用户输入过滤
* 提供方便的API方法：执行命令、推送消息、模拟拖拽、获取DOM信息、全屏等
* 提供多个Slots插槽支持自定义样式

![vue-web-terminal](./public/vue-web-terminal.gif)

> 一句话描述：
>
> 它并不具备执行某个具体命令的能力，这个能力需要开发者自己去实现，它负责的事情是在网页上以终端界面的形式从用户那拿到想要执行的命令，然后交给开发者去实现，执行完之后再交给它展示给用户。

# 在线体验

在线Demo：[https://tzfun.github.io/vue-web-terminal/](https://tzfun.github.io/vue-web-terminal/)

[![Edit Vue Template](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/silly-scooby-l8wk9b)

# 快速上手

npm安装vue-web-terminal，`2.x.x`版本对应vue2，`3.x.x`版本对应vue3，建议下载对应大版本的最新版。

```shell
#  install for vue2
npm install vue-web-terminal@2.xx --save

#  install for vue3
npm install vue-web-terminal@3.xx --save
```

main.js中载入 Terminal 插件

```js
import Terminal from 'vue-web-terminal'

// for vue2
Vue.use(Terminal)

// for vue3
const app = createApp(App).use(Terminal)
```

使用示例

```vue

<template>
  <div id="app">
    <terminal name="my-terminal" @exec-cmd="onExecCmd"></terminal>
  </div>
</template>

<script>
import Terminal from "vue-web-terminal"

export default {
  name: 'App',
  components: {Terminal},
  methods: {
    onExecCmd(key, command, success, failed) {
      if (key === 'fail') {
        failed('Something wrong!!!')
      } else {
        let allClass = ['success', 'error', 'system', 'info', 'warning'];

        let clazz = allClass[Math.floor(Math.random() * allClass.length)];
        success({
          type: 'normal',
          class: clazz,
          tag: '成功',
          content: command
        })
      }
    }
  }
}
</script>

<style>
body, html, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
}
</style>
```

# 插件文档

## Attributes

terminal标签支持的属性参数表

| 参数                   | 说明                                                                        | 类型       | 默认值                                              |
|----------------------|---------------------------------------------------------------------------|----------|--------------------------------------------------|
| name                 | Terminal实例名称，同一页面的name必须唯一，API中使用也需用到此值                                   | string   | terminal                                         |
| context              | 上下文内容                                                                     | string   | /vue-web-terminal                                |
| context-suffix       | 上下文后缀符号                                                                   | string   | \>                                               |
| title                | 窗口头部显示的标题                                                                 | string   | vue-web-terminal                                 |
| show-header          | 是否显示窗口头部，此开关会影响[拖拽功能](#拖拽功能)，只有显示头部才能使用默认提供的拖拽功能                          | boolean  | true                                             |
| init-log             | Terminal初始化时显示的日志，是由[消息对象](#消息对象)组成的数组，设为`null`则不显示                       | array    | 略                                                |
| auto-help            | 是否打开命令行自动搜索提示功能                                                           | boolean  | true                                             |
| enable-example-hint  | 是否显示右上角命令样例提示，前提是开启了`auto-help`                                           | boolean  | true                                             |
| command-store        | 自定义的命令库，搜索提示功能会扫描此库，见[命令定义格式](#命令定义)                                      | array    | [内置命令](#内置命令)                                    |
| command-store-sort   | 命令行库排序，自定义命令库的显示排序规则                                                      | function | function(a,b)                                    |
| input-filter         | 自定义输入过滤，返回值为过滤后的字符串，必须是纯文本，不能带html标签                                      | function | function(当前输入字符char, 输入框内字符串value, input事件event) |
| drag-conf            | 拖拽窗口配置项，**如果不配置此项宽高将会100%填充父元素，窗口宽高等同于父元素宽高**                             | object   | 见[拖拽功能](#拖拽功能)                                   |
| command-formatter    | 命令显示格式化函数，一般用于输入命令高亮显示，传入当前命令返回新的命令，支持html。如果不设置将使用内部定义的高亮样式              | function | function(cmd)                                    |
| tab-key-handler      | 用户键入Tab键时的逻辑处理方法，可配合`helpCmd`这个slot使用                                     | function | function(event)                                  |
| search-handler       | 用户自定义命令搜索提示实现，callback需接收一个命令对象，具体格式见[命令定义格式](#命令定义)，可配合`helpCmd`这个slot使用 | function | function(commandStore, key, callback)            |
| scroll-mode          | 滚动条模式                                                                     | string   | smooth                                           |
| push-message-before  | 在推送消息显示之前触发的钩子函数                                                          | function | function(message, name)                          |
| log-size-limit       | 限制显示日志的最大条数                                                               | number   | 200                                              |

> 下面是已移除属性
>
> * ~~**show-log-time**~~: `2.0.14`和`3.0.13`版本之后移除
> * ~~**warn-log-byte-limit**~~: `2.1.0`和`3.1.0`版本之后移除
> * ~~**warn-log-limit-enable**~~: `2.1.1`和`3.1.1`版本之后移除
> * ~~**init-log-delay**~~: `2.1.1`和`3.1.1`版本之后移除

## Events

terminal标签支持的事件表

| 事件名称            | 说明                                                                                                   | 回调参数                                       |
|-----------------|------------------------------------------------------------------------------------------------------|--------------------------------------------|
| exec-cmd        | 执行自定义命令时触发。`success`和`failed`为回调函数，**必须调用两个回调其中之一才会回显**！其中`success`回调参数含义见下方说明，`failed`回调参数为一个string | `(cmdKey, command, success, failed, name)` |
| before-exec-cmd | 用户敲下回车之后执行命令之前触发                                                                                     | `(cmdKey, command, name)`                  |
| on-keydown      | 当获取命令输入光标焦点时，按下任意键触发                                                                                 | `(event, name)`                            |
| on-click        | 用户点击按钮时触发，参数`key`为按钮唯一识别，已有按钮：`close`, `minScreen`, `fullScreen`, `title`, `pin`                     | `(key, name)`                              |
| init-before     | 生命周期函数，插件初始化之前触发                                                                                     | `(name)`                                   |
| init-complete   | 生命周期函数，插件初始化完成之后触发                                                                                   | `(name)`                                   |
| on-active       | 窗口活跃时触发                                                                                              | `(name)`                                   |
| on-inactive     | 窗口由活跃状态变为不活跃状态时触发                                                                                    | `(name)`                                   |

**特别说明**：exec-cmd的`success`回调参数支持多种数据类型，不同数据类型执行逻辑也会不同：

* 不传任何参数，立即结束本次执行
* 传入一个[消息对象](#消息对象)，将会向记录中追加一条消息，并立即结束本次执行
* 传入一个[消息对象](#消息对象)数组，将会向记录中追加多条消息，并立即结束本次执行
* 传入一个`TerminalFlash`对象，将会进入[实时回显](#实时回显)处理逻辑，本次执行并不会结束，直到调用`finish()`
* 传入一个`TerminalAsk`对象，将会进入[用户询问输入](#用户询问输入)处理逻辑，本次执行并不会结束，直到调用`finish()`

> 注意：
>
> 从`2.1.7`和`3.1.3`版本开始，事件的驼峰命名被移除，如果你的版本是在这之后，请使用中划线命名，比如`@exec-cmd="onExecCmd"`
> [issue#41](https://github.com/tzfun/vue-web-terminal/issues/41)

## Slots

Terminal支持以下自定义插槽，此功能在`2.0.11`和`3.0.8`版本及之后支持。

| 插槽名称       | 参数                   | 说明                                        |
|------------|----------------------|-------------------------------------------|
| header     | /                    | 自定义header样式，仍然会保留拖拽区域                     |
| helpBox    | { showHeader, item } | 自定义命令搜索结果提示框，item为搜索结果                    |
| normal     | { message }          | 自定义`normal`类型消息                           |
| json       | { message }          | 自定义`json`类型消息                             |
| table      | { message }          | 自定义`table`类型消息                            |
| code       | { message }          | 自定义`code`类型消息                             |
| html       | { message }          | 自定义`html`类型消息                             |
| flash      | { content }          | 自定义实时回显样式                                 |
| helpCmd    | { item }             | 自定义命令搜索提示样式                               |
| textEditor | { data }             | 自定义文本编辑器样式，更多关于文本编辑器的使用方法见[文本编辑器](#文本编辑器) |

example:

```vue

<terminal :name="name" @exec-cmd="onExecCmd">
<template #header>
  This is my custom header
</template>

<template #json="data">
  {{ data.message }}
</template>

<template #helpBox="{showHeader, item}">
  {{ item }}
</template>

<template #textEditor="{data}">
        <textarea name="editor" class="t-text-editor" v-model="data.value"
                  @focus="data.onFocus" @blur="data.onBlur"></textarea>
  <div class="t-text-editor-floor" align="center">
    <button class="t-text-editor-floor-btn" @click="_textEditorClose(false)">Cancel</button>
    <button class="t-text-editor-floor-btn" @click="_textEditorClose(true)">Save & Close(Ctrl + S)</button>
  </div>
</template>
</terminal>
```

## API

本插件提供了一些 API 可以使用 Js 主动向插件发起事件请求。你有两种方式调用API：

1). **获取全局API对象**

注意：**全局API接口调用都需要用到Terminal的`name`**

旧版本兼容方式（不推荐）

```js
import Terminal from "vue-web-terminal"

//  调用API
Terminal.$api.pushMessage('my-terminal', 'hello world!')
```

新版本方式（推荐）

```js
import {api as TerminalApi} from "vue-web-terminal"

//  调用API
TerminalApi.pushMessage('my-terminal', 'hello world!')
```

2). **获取实例调用API**

这种方法调用所有的API接口都不需要传入name

```js
//  vue template code
<terminal ref='myTerminal'></terminal>

//  ......

//  vue js code
this.$refs.myTerminal.pushMessage('hello world!')
```

> 已移除api
>
> * ~~**getPosition**~~: `2.0.14`和`3.0.13`版本之后移除，请使用`elementInfo()`
> * ~~**updateContext**~~: `2.1.3`和`3.1.3`版本之后移除，直接修改绑定的 context 变量即可修改上下文

### pushMessage()

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=loop)

向Terminal推送一条或多条消息

```js
//  推送一条消息
let message = {
    class: 'warning',
    content: 'This is a wanning message.'
}
TerminalApi.pushMessage('my-terminal', message)

//  推送多条消息
let messages = [
    {content: "message 1"},
    {content: "message 2"},
    {content: "message 3"}
]
TerminalApi.pushMessage('my-terminal', messages)
```

### appendMessage()

> `3.2.0`版本新增

向最后一条消息追加内容。仅当最后一条消息存在，且其 type 为 normal、ansi、code、html时才会追加，否则 push 一条新消息。

```js
TerminalApi.appendMessage('my-terminal', "this is append content")
```

### fullscreen()

使当前terminal进入或退出全屏

```js
TerminalApi.fullscreen('my-terminal')
```

### isFullscreen()

判断当前是否处于全屏状态

```js
//  true or false
let fullscreen = TerminalApi.isFullscreen('my-terminal')
```

### dragging()

当开启[拖拽功能](#拖拽功能)时可以使用下面这种方式来改变窗口位置，其中参数`x`
是terminal左边框到浏览器可视范围左边框的距离，`y`是terminal上边框到浏览器可视范围上边框的距离，单位px。

```js
TerminalApi.dragging('my-terminal', {
    x: 100,
    y: 200
})
```

### execute()

可以使用 API 向Terminal执行一个命令，执行过程会回显在Terminal窗口中，这是一种用 JS 模拟用户执行命令的方式

```js
TerminalApi.execute('my-terminal', 'help :local')
```

### focus()

获取Terminal输入焦点，插件内有三处输入点：

* 命令行输入，focus方法传入`true`则表示强制获取输入焦点，否则只会获得光标焦点并使terminal触发`on-active`事件。
* [Ask用户输入](#用户询问输入)焦点，当处于ask模式下获取相应的输入焦点
* [文本编辑器](#文本编辑器)焦点，当处于文本编辑模式下获取相应的输入框焦点，如果你用了slot来自定义实现，需要在slot中提供focus事件的入口

```js
TerminalApi.focus('my-terminal', true)
```

### elementInfo()

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=info)

获取Terminal窗口DOM信息，你可以通过此 API 获取Terminal的窗口宽度高度、显示内容的宽度高度、所在位置、单字符宽度等，单位为px

> 注意：如果你的窗口已创建但未显示在页面（比如用了`v-show`控制显示），可能会出现部分信息失效的问题。

```js
let info = TerminalApi.elementInfo('my-terminal')
```

info数据结构如下：

```json
{
  "pos": {
    "x": 100,
    "y": 100
  },
  "screenWidth": 700,
  "screenHeight": 500,
  "clientWidth": 690,
  "clientHeight": 490,
  "charWidth": {
    "en": 7.2,
    "cn": 14
  }
}
```

下面这张图清晰地描述了这些值的含义：

![ele-info.png](public/ele-info.png)

### textEditorOpen()

此API调用后将会打开文本编辑器，使用示例：

```js
TerminalApi.textEditorOpen('my-terminal', {
    content: 'This is the preset content',
    onClose: (value, options) => {
        console.log('Final content: ', value, "options:", options)
    }
})
```

content是打开编辑器时预置的内容，如果你不想预置任何内容可以不填此参数，当用户点击Close或主动调用`textEditorClose()`
方法时会触发`onClose`回调，参数value为当前编辑器内的文本内容和传入参数选项。

更多关于文本编辑器的使用方法见[文本编辑器](#文本编辑器)

### textEditorClose()

此方法用于关闭当前打开的文本编辑器，调用后会触发打开时的`onClose`回调。

```js
TerminalApi.textEditorClose('my-terminal', true)

TerminalApi.textEditorClose('my-terminal', false)
```

## 消息对象

本插件定义了消息对象，任何一个需要被以记录的形式显示在Terminal上的信息都是一个消息对象，`exec-cmd`事件的`success()`
回调和`pushMessage`api都会用到它。

| 属性      | 说明                             | 类型                       | 可选值                               |
|---------|--------------------------------|--------------------------|-----------------------------------|
| content | 必填，消息内容，不同消息格式的内容格式不一样，具体规则见下文 | string、json、object、array | /                                 |
| type    | 消息格式类型，默认值为`normal`            | string                   | normal、json、code、table、html、ansi  |
| class   | 消息级别，仅类型为`normal`有效            | string                   | success、error、system、info、warning |
| tag     | 标签，仅类型为`normal`有效              | string                   | /                                 |

### normal 普通文本

content为字符串格式，支持html标签。它支持slot重写样式，详情见[Slots](#Slots)

> 此处支持的html标签与`html`类型的消息区别在于：`normal`消息的父元素是行内元素，`html`的父元素是块级元素

```json
{
  "type": "normal",
  "content": "This is a text message",
  "class": "success",
  "tag": "Tag success"
}
```

### json

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=json)

json类型的消息会被显示为json编辑窗口，type为`json`，content需传一个json对象。

```json
{
  "type": "json",
  "content": {
    "key": "value",
    "num": 1
  }
}
```

### code

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=code)

code类型消息可以更友好的显示代码和多行文本，type为`code`，content类型为字符串。它支持highlight和codemirror的高亮显示。

```json
{
  "type": "json",
  "content": "import Terminal from 'vue-web-terminal'\n\nVue.use(Terminal)"
}
```

#### highlight.js 代码高亮

code类型消息支持 `highlight.js` 高亮显示。

首先你需要配置 **Highlight.js**
，在main.js入口安装，详细配置见[https://www.npmjs.com/package/highlight.js](https://www.npmjs.com/package/highlight.js)

```js
import Terminal from 'vue-web-terminal'
import hljs from 'highlight.js'
import java from 'highlight.js/lib/languages/java'
import vuePlugin from "@highlightjs/vue-plugin"
import 'highlight.js/styles/tomorrow-night-bright.css'

hljs.registerLanguage('java', java)
Vue.use(vuePlugin)
Vue.use(Terminal, {highlight: true})
```

vue2版本依赖推荐，vue3使用最新的版本即可

```json
{
  "@highlightjs/vue-plugin": "^1.0.2",
  "highlight.js": "^10.7.3"
}
```

#### codemirror 代码高亮

code类型消息也支持 `codemirror`
高亮显示，详细配置见[https://www.npmjs.com/package/vue-codemirror](https://www.npmjs.com/package/vue-codemirror)

同样只需要在main.js入口安装即可，vue2版本推荐：`"vue-codemirror": "^4.0.6"`

```js
import VueCodemirror from 'vue-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/theme/darcula.css'
import 'codemirror/mode/clike/clike.js'
import 'codemirror/addon/edit/closebrackets.js'

Vue.use(VueCodemirror)
Vue.use(Terminal, {
    codemirror: {
        tabSize: 4,
        mode: 'text/x-java',
        theme: "darcula",
        lineNumbers: true,
        line: true,
        smartIndent: true
    }
})
```

### table

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=table)

type为`table`时content为表格配置，`head`为表头，`rows`为每行的数据，支持html标签

```json
{
  "type": "table",
  "content": {
    "head": [
      "title1",
      "title2",
      "title3",
      "title4"
    ],
    "rows": [
      [
        "name1",
        "hello world",
        "this is a test1",
        "xxxxxxxx"
      ],
      [
        "name2",
        "hello world",
        "this is a test2 test2",
        "xxxxxxxx"
      ]
    ]
  }
}
```

### html

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=ls)

type为`html`时可自定义内容格式，content为html标签构成

```js
function execCmd(key, command, success) {
    // ...
    success({
        type: 'html',
        content: `
          <ul class="custom-content">
            <li class="t-dir">dir 1</li>
            <li class="t-dir">dir 2</li>
            <li class="t-dir">dir 3</li>
            <li class="t-file">file 1</li>
            <li class="t-file">file 2</li>
            <li class="t-file">file 3</li>
          </ul>
          `
    })
    // ...
}
```

### ansi

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=ansi)

type为`ansi`时可以显示ANSI控制码样式，**目前仅支持着色控制，包含`xterm-256color`色系，其余控制码会被过滤**

```js
function execCmd(key, command, success) {
    // ...
    success({
        type: 'ansi',
        content: '\x1B[1;34mThis are some blue text.\x1B[0m\n\x1B[30;43mThis is a line of text with a background color.\x1B[0m\n\x1B[92;5mThis is blink text.\x1B[0m'
    })
    // ...
}
```

## 命令定义

用于help和命令帮助搜索，这里的命令定义仅作为显示用，没有具体的执行逻辑，命令的执行逻辑你应该在[Events](#Events)的`exec-cmd`
事件中实现。

如果开启了命令帮助搜索功能，在实例化Terminal之前需要传入自定义命令库，传入的命令库为命令数组，以下是命令格式定义规则：

| 参数          | 说明                             | 类型     |
|-------------|--------------------------------|--------|
| key         | 命令关键字，必填                       | string |
| title       | 显示标题                           | string |
| group       | 分组，可自定义，内置的`help`命令可以按照此字段进行筛选 | string |
| usage       | 使用方法                           | string |
| description | 详细描述                           | string |
| example     | 使用示例，见[命令示例格式](#命令示例格式)        | array  |

### 命令示例格式

示例格式比较简单，它是一个json数组，json对象的`des`为描述，`cmd`为具体的命令，json格式如下：

```json
[
  {
    "des": "获取所有任务信息",
    "cmd": "task -o pack"
  },
  {
    "des": "获取任务进度",
    "cmd": "task -o query"
  }
]
```

### 命令Help

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=help%20open)

插件内置了help命令可以方便使用者查看命令的使用方法，前提是这些命令已经提前[定义](#命令定义)
好了，通过help命令可以查看命令的key、分组、解释样例信息。

```shell

# 显示全部命令信息
help

# 模糊搜索命令，搜索build前缀的命令
help build*

# 模糊搜索名，搜索带有event的命令
help *event*

# 按分组搜索，搜索关键词需要以":"开头，搜索分组为server的所有命令
help :server

```

### 内置命令

Terminal默认内置有以下命令，且不可替代

```json
[
  {
    "key": "help",
    "title": "Help",
    "group": "local",
    "usage": "help [pattern]",
    "description": "Show command document.",
    "example": [
      {
        "des": "Get help documentation for exact match commands.",
        "cmd": "help open"
      },
      {
        "des": "Get help documentation for fuzzy matching commands.",
        "cmd": "help *e*"
      },
      {
        "des": "Get help documentation for specified group, match key must start with ':'.",
        "cmd": "help :groupA"
      }
    ]
  },
  {
    "key": "clear",
    "title": "Clear logs",
    "group": "local",
    "usage": "clear [history]",
    "description": "Clear screen or history.",
    "example": [
      {
        "cmd": "clear",
        "des": "Clear all records on the current screen."
      },
      {
        "cmd": "clear history",
        "des": "Clear command history."
      }
    ]
  },
  {
    "key": "open",
    "title": "Open page",
    "group": "local",
    "usage": "open <url>",
    "description": "Open a specified page.",
    "example": [
      {
        "cmd": "open blog.beifengtz.com"
      }
    ]
  }
]
```

## 高级功能

### 拖拽功能

开启拖拽功能需要将`show-header`设置为true并配置`drag-conf`，你可以通过dragConf的`width`和`height`
来配置窗口大小，可以通过`init`控制窗口初始化位置，下面是一个简单的示例。

```vue

<terminal name="my-terminal"
          show-header
          :drag-conf="{width: 700, height: 500, init:{ x: 50, y: 50 }}">
</terminal>
```

dragConf完整配置结构如下：

| 参数     | 说明                                                                | 类型            |
|--------|-------------------------------------------------------------------|---------------|
| width  | 拖拽窗口宽度，可以是数字（单位px）也可以是百分比（相对于浏览器窗口）                               | number/string |
| height | 拖拽窗口高度，同宽度                                                        | number/string |
| zIndex | 窗口层级，此值可以修改并被terminal监听，可用于多窗口层级的控制，默认100                         | number        |
| init   | 窗口初始化位置，如果不填则默认位置在浏览器窗口中央，其中x和y的单位为px，``` {"x": 700, "y": 500}``` | object        |
| pinned | 固定窗口，固定后将无法拖拽，当点击按钮修改此值时会在`on-click`事件中触发 pin                     | boolean       |

![dragging.gif](public/dragging.gif)

除了鼠标控制之外你还可以[调用API移动窗口位置](#dragging--)

### 拖拽缩放窗口

当配置了`drag-conf`，窗口讲开启拖拽缩放功能，缩放触控区域在窗口的四个角上。

### 实时回显

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=flash)

Terminal默认的消息都是以追加的模式显示，当你只需要显示执行的过程，执行结束后这些内容不想存在于记录中的时候，实时回显是不错的选择。
例如`gradle`或`npm`下载依赖包时，下载进度条动画展示的过程。

在[Events](#Events)的`exec-cmd`事件回调中，`success`回调函数支持传入实时回显的处理对象。

通过`new TerminalFlash()`创建一个flash对象，传入success回调中，flash对象提供两个方法：

* `flush(string)`: 更新当前显示的内容
* `finish()`: 结束执行

```js
import {Flash as TerminalFlash} from 'vue-web-terminal'

let flash = new TerminalFlash()
success(flash)

let count = 0
let flashInterval = setInterval(() => {
    flash.flush(`This is flash content: ${count}`)

    if (++count >= 20) {
        clearInterval(flashInterval)
        flash.finish()
    }
}, 200)
```

> 旧版本的`Terminal.$Flash`调用方式仍然兼容，但不推荐

### 用户询问输入

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=ask)

当需要向用户询问时，使用此功能可以获取到用户输入的内容，例如登录时需要用户输入用户名密码的场景。

在[Events](#Events)的`exec-cmd`事件回调中，`success`回调函数支持传入用户输入的处理对象。

通过`new TerminalAsk()`创建一个新的ask对象，传入success回调中，ask对象提供两个方法：

* `ask(options)`: 发起一个用户询问输入，options是一个对象，其属性解释如下（*号表示必填）：
  * `question`: string，询问的问题，或者可以理解为用户输入的前缀字串
  * `callback`: function，用户键入回车时的回调，参数值为用户输入的内容
  * `autoReview`: bool，用户键入回车时是否自动追加当前的显示内容
  * `isPassword`: bool，是否是密码输入
* `finish()`: 结束执行

```js
import {Ask as TerminalAsk} from 'vue-web-terminal'

let asker = new TerminalAsk()
success(asker)

asker.ask({
    question: 'Please input github username: ',
    autoReview: true,
    callback: value => {
        console.log(value)
        asker.ask({
            question: 'Please input github password: ',
            autoReview: true,
            isPassword: true,
            callback: () => {
                //    do something
                asker.finish()
            }
        })
    }
})
```

### 文本编辑器

[在线Demo演示](https://tzfun.github.io/vue-web-terminal/?cmd=edit)

#### 使用API

当要对多行文本编辑时可以使用API：`textEditorOpen()`、`textEditorClose()`，具体介绍详情请见[API](#API)部分，下面是一个简单的示例：

```js
TerminalApi.textEditorOpen('my-terminal', {
    content: 'Please edit this file',
    onClose: (value, options) => {
        console.log("用户编辑完成，文本结果：", value, "options:", options)
    }
})
```

#### Slot自定义样式

如果你对默认样式不太喜欢，可以使用Slot自定义编辑器的样式（比如改成 Codemirror或者VS Code ?），参数为data，其中data有三个属性是你需要关心的：

* `value`：编辑的文本内容，你需要在你实现的编辑器中用`v-model`绑定它
* `onFoucs`：获取焦点事件，你需要在你实现的编辑器中绑定`@focus`事件
* `onBlur`：失去焦点事件，你需要在你实现的编辑器中绑定`@blur`事件

**自定义快捷键**

插件提供了一个`onKeydown`事件，此事件是你控制**活跃状态**
下Terminal快捷键最好的方法，这里以文本编辑器为例，设定用户按快捷键`Ctrl + S`就表示完成编辑并保存

```vue

<template>
  <terminal :name="name" @exec-cmd="onExecCmd" @on-keydown="onKeydown">
    <template #textEditor="{ data }">
      <textarea name="editor"
                class="t-text-editor"
                v-model="data.value"
                @focus="data.onFocus"
                @blur="data.onBlur"></textarea>

      <div class="t-text-editor-floor" align="center">
        <button class="t-text-editor-floor-btn" @click="_textEditorClose(false)">Cancel</button>
        <button class="t-text-editor-floor-btn" @click="_textEditorClose(true)">Save & Close</button>
      </div>

    </template>
  </terminal>
</template>

<script>
import {Terminal, api as TerminalApi} from "vue-web-terminal";

export default {
  name: "TerminalOldDemo",
  components: {Terminal},
  data() {
    return {
      name: "my-terminal",
      enableTextEditor: false
    }
  },
  method: {
    onExecCmd(key, command, success, failed, name) {
      if (key === 'edit') {
        TerminalApi.textEditorOpen(this.name, {
          content: 'Please edit this file',
          onClose: (value) => {
            this.enableTextEditor = false
            success({
              type: "code",
              content: value
            })
          }
        })
        this.enableTextEditor = true
      }
    },
    onKeydown(event) {
      if (this.enableTextEditor && event.key === 's' && event.ctrlKey) {
        this._textEditorClose(true)
        event.preventDefault()
      }
    },
    _textEditorClose(option) {
      TerminalApi.textEditorClose(this.name, option)
    }
  }
}
</script>
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
