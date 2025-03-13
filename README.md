# Rich Text Editor &nbsp; ![JavaScript](https://shields.io/badge/JavaScript-F7DF1E?logo=JavaScript&logoColor=000&style=flat-square) ![TypeScript](https://shields.io/badge/TypeScript-3178C6?logo=TypeScript&logoColor=FFF&style=flat-square)<br>

This is a class that allows you to build your own rich text editor. It provides methods for applying styles to text and leaves the interface design completely up to you.

The free version (<a href="https://andre2xu.github.io/rich_text_editor/">view demo</a>) has limited features so to access the rest you must purchase the premium version on my [Patreon Shop](https://patreon.com/AndrewsPetProjects?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink).<br><br>

## Features
*Free Version*
- Formats (bold, italic, underline, strikethrough)
- Text color<br><br>

*Premium Version*
- Formats
- Text color
- Text size
- Typefaces (custom fonts are supported)
- Undo & redo
- Copy, cut, and paste
- Style clearing
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
After installation, run the index.html file on a localhost server to view the demo. To learn how to use the rich text editor class, see  ***src/index.ts***.

If you want to use this in a project you have two options after generating the dist folder:

- Copy the mjs/cjs file in the dist folder into your project and treat it like a local JS file (recommended way).

- Run the command `npm run package` to convert the entire project folder into an npm package, then do `npm install /path/to/rich_text_editor_package` in your project. This creates a symbolic link to the package.

If you go with the latter approach, this is how you import the class:
- For mjs: `import RichTextEditor from '@andre2xu/rich-text-editor/dist/rich-text-editor.mjs.js';`

- For cjs: `const RichTextEditor = require('@andre2xu/rich-text-editor/dist/rich-text-editor.cjs.js)';`
<br><br>

## IMPORTANT
- You can do whatever you want with the free version but for the premium version please visit my website for more info.

- I won't be publishing this project on npm because the free version is an incomplete product and the premium one contains my proprietary code.

- The free version is not perfect. It has bugs that have been fixed in the premium version. I had to rewrite a lot of the logic to make it more robust to different edge cases.
<br><br>

## Licensing
The MIT license only applies to the free version. The premium version will have a different license.