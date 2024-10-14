| Language | 語言                           | 𐑤𐑨𐑙𐑜𐑢𐑦𐑡                      |
| -------- | ----------------------------- | --------------------------- |
| English | [中文（繁體）](readme.zh_Hant.md)| [𐑖𐑱𐑝𐑰𐑩𐑯](readme.en_Shaw.md) |

Automatic language translation tool for the game Deadlock. Not a replacement for human translators, just better then nothing.

## Table of contents

[Features](#features) ● [How to use](#how-to-use)

## Features

|            | yes | no   | broken | incomplete | same as english |
| ---------- | --- | ---- | ------ | ---------- | --------------- |
| Map Legend | ✔️ | ❌   | ⛓️‍💥    | 🏗️         | 🇬🇧              |

| Language              | text | variables | format | affix | XML | new lines |
| --------------------- | ---- | --------- | ------ | ----- | --- | --------- |
| Shavian               | ✔️  | ✔️        | ⛓️‍💥    | 🇬🇧    | ✔️  | ✔️       |
| Chinese (Traditional) | ✔️  | ✔️        | ❌    | ❌    | ✔️ | ✔️        |
| Japanese              | ✔️  | ❌        | ❌    | ❌    | ❌ | ❌        |
| Thai                  | ✔️  | ❌        | ❌    | ❌    | ❌ | ❌        |

|  feature  |   example                                                            | result         | able to |
| --------- | -------------------------------------------------------------------- | -------------- | ------- |
| auto text | Good day                                                             | 再會           | ✔️      |
| variables | +{points} HP for {cost} gold                                         | 4ゴールドでHP+2 | ✔️     |
| formats   | %s1's %s2                                                            | Dave's Garage  | 🏗️     |
| affix     | 4m/s                                                                 | 4米/秒         | ❌     |
| XML       | \<span class="bold"\>With \<span class="red"\>impact\</span>\</span> |                | ✔️     |
| new lines | multiple\nlines                                                      |                | ✔️     |
| plurals   | {d:spectators} Spectator#|#{d:spectators} Spectators                 | 5 Spectators   | ❌     |

## How to use

step 1: copy steamapps\common\Project8Staging\game\citadel\resource\localization to resource\localization to resources

step 2: running the script:
```
npm install
node shavian.js
```

step 3: copy folders in out/resources/ to steamapps\common\Project8Staging\game\citadel\resource\localization

step 4: in steamapps\common\Project8Staging\game\citadel\cfg , open the boot.vcfg file, and set the language to your language. I'll use shavian as an example.
```
"UILanguage"		"shavian"
```
and also set it using the launch options on Steam. Again, use your language, not the example.
```
-language shavian
```

step 4: Check if fonts are working by launching the game. If text does not look right or does not show up, read the following steps below. Otherwise, you can skip this step.

copy a serif and a sans serif font for your language to steamapps\common\Project8Staging\game\citadel\panorama\fonts . Edit the fonts.conf file, look for the list of fontpattern, add your font's filename there. Look for the text "SERIF - REAVER", and add your font match below, and set lang to your language, and set the font to your font's name. Here's an example, use as a reference, copying this will not work.
```
<fontpattern>Ormin-Regular</fontpattern>
<fontpattern>InterAlia-Regular</fontpattern>

<match>
    <test name="family">
        <string>Forevs Demo</string>
    </test>
    <test name="lang">
        <string>shavian</string>
    </test>
    <edit name="family" mode="assign" binding="strong">
        <string>Ormin</string>
    </edit>
</match>

<match>
    <test name="family">
        <string>Retail Demo</string>
    </test>
    <test name="lang">
        <string>shavian</string>
    </test>
    <edit name="family" mode="assign" binding="strong">
        <string>Inter Alia</string>
    </edit>
</match>
```

step 5: Package up your resources into a zip to publish.

Please note that out/cache.buffer can be used to prevent redos of already translated text. If you like to translate all text again, delete the cache.buffer file.

**Finished**