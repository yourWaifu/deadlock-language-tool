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