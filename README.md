# Rich Text Editor &nbsp; ![JavaScript](https://shields.io/badge/JavaScript-F7DF1E?logo=JavaScript&logoColor=000&style=flat-square) ![TypeScript](https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square)<br>

This is a class that allows you to build your own rich text editor. It provides methods for applying styles to text and leaves the interface design completely up to you.

The free version (<a href="https://andre2xu.github.io/rich_text_editor/">view demo</a>) has limited features so to access the rest you must purchase the premium version on my website [INSERT LINK HERE].<br><br>

## Features
*Free Version*
- Formats (bold, italic, underline, strikethrough)
- Text color<br><br>

*Premium Version*
- Formats
- Text color
- Text size
- Typefaces (downloaded fonts are supported)
- Undo & redo
- Copy, cut, and paste
<br><br>

## Installation
```
cd myfolder

git clone https://github.com/andre2xu/rich_text_editor.git

cd rich_text_editor

npm i

npm run build  OR  npm run watch
```

## <br>Usage
After installation, run the index.html file on a localhost server to view the demo.

See ***src/index.ts*** to learn how to use the rich text editor's public methods.

The class itself will be in the 'dist' folder after you run the build/watch script. Choose the appropriate rich text editor JS file for your project.

If you want to install the project as an npm dependency, try one of <a href="https://stackoverflow.com/questions/8088795/installing-a-local-module-using-npm" target="_blank">these methods</a>. They typically involve symbolic linking. The local module will be the 'dist' folder. I recommend making a copy of it and using that as the dependency.
<br><br>

## IMPORTANT
- You can do whatever you want with the free version but for the premium version please visit my website for more info.

- I won't be publishing this project on npm because the free version is an incomplete product and the premium one contains my proprietary code.