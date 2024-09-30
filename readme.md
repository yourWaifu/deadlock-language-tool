Automatic language translation tool for the game Deadlock

## Features

|  feature   |   example  | result |
| --- | ----- | ---- |
| auto text | Good day | 𐑜𐑦𐑛 𐑛𐑱 |
| variables | +{points} HP for {cost} dollars | +2 HP for 4 dollars |
| formats | %s1's %s2 | Dave's Garage |
| pre/post fix | 4m/s | 4 米/秒 |
| XML | \<span class="bold"\>The \<span class="red"\>burn\</\span></span> | The burn (with style)
| escape | multiple\nlines | multiple (new line) lines

| Language | yes | no | broken | incomplete |
| ---- | ---- | ---- | ---- | ---- |
| Map Legend | ✔️ | ❌ | ⛓️‍💥 | 🏗️ |

| Language | text | variables | format | pre/post fix | XML | escape |
| ----- | ---- | ---- | ---- | ---- | ---- | ---- |
| Shavian | ✔️ | ✔️ | ⛓️‍💥 | ❌ | ✔️ | ✔️ |



## How to use

copy steamapps\common\Project8Staging\game\citadel\resource\localization to resource\localization to resources

running the script:
```
npm install
node index.js
```

copy folders in to out/resources/ to steamapps\common\Project8Staging\game\citadel\resource\localization

copy a serif and a sans serif font for your language to steamapps\common\Project8Staging\game\citadel\panorama\fonts. Edit the fonts.conf file, look for the list of fontpattern, add your font's filename there. Look for the text "SERIF - REAVER", and add your font match below, and set lang to your language, and set the font to your font's name. Here's an example
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

in steamapps\common\Project8Staging\game\citadel\cfg , open the boot.vcfg file, and set the language to your language
```
"UILanguage"		"shavian"
```
some find it easier to set it using the launch options
```
-language shavian
```