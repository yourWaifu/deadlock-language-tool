| 語言 | Language | 𐑤𐑨𐑙𐑜𐑢𐑦𐑡 |
| -- | -- | -- |
| 中文（繁體） | [English](readme.md) | [𐑖𐑱𐑝𐑰𐑩𐑯](readme.en_Shaw.md) |

遊戲 Deadlock 的自動語言翻譯工具

注意：這是自動翻譯的

## 目錄

[功能](#特徵) ● [如何使用](#如何使用)

## 特徵

|     |是的|沒有 |破碎|不完整 | 和英語一樣 |
| ----| ----| ----| ----| ---- | ---- |
|地圖圖例| ✔️ | ❌ | ⛓️‍💥 | 🏗️ | 🇬🇧 |

|語言 | 文字 | 變數 | 格式 | 附上| XML | 新線路 |
| -----| ----| ----| ----| ----| ----| ----- |
|中文（繁體）| ✔️ | ✔️ | ❌ | ❌ | ✔️ | ✔️ |

| 特點 | 範例 | 結果 | 能夠 |
| --- | ----- | ---- | ---- |
| 自動文字 | Good day | 再會 | ✔️ |
| 變數 | +{points} HP for {cost} gold | 4 金幣+2 HP | ✔️ |
| 格式 | %s1's %s2 | 戴夫的車庫 | 🏗️ |
| 詞綴 | 4m/s | 4米/秒 | ❌ |
| XML | \<span class="bold"\>With \<span class="red"\>impact\</span>\</span> |  | ✔️ |
| 新線路 | multiple\nlines |  | ✔️ |
| 複數 | {d:spectators} Spectator#\|#{d:spectators} Spectators | 5 Spectators | ❌ |
| 影像 | <img src="https://github.com/user-attachments/assets/0cbedda8-c17a-4b75-b5f0-a1f6b35d5758" height="32" alt="killing_blow_english_png"/> | <img src="https://github.com/user-attachments/assets/07477e93-9712-4dcf-a0c4-927c7ee042bf" height="32" alt="killing_blow_korean_png"/> | 🏗️     |

## 如何使用

步驟1：複製steamapps\common\Project8Staging\game\citadel\resource\localization到resource\localization到resources

步驟2：運行腳本：
```
npm install
node tchinese.js
```

步驟 3：將 out/resources/ 中的資料夾複製到 steamapps\common\Project8Staging\game\citadel\resource\localization

步驟4：在 steamapps\common\Project8Staging\game\citadel\cfg 中，開啟 boot.vcfg 文件，並將語言設定為您的語言。

```
"UILanguage"		"tchinese"
```

並使用 Steam 上的啟動選項進行設定。
```
-language tchinese
```

步驟 4：啟動遊戲檢查字體是否正常運作。如果文字看起來不正確或未顯示，請閱讀以下步驟。否則，你就可以走了。

將適合您的語言的襯線字體和無襯線字體複製到 steamapps\common\Project8Staging\game\citadel\panorama\fonts 。編輯 fonts.conf 文件，尋找 fontpattern 列表，在其中新增字體的檔案名稱。尋找文字“SERIF - REAVER”，然後在下面添加您的字體匹配，並將 lang 設定為您的語言，並將字體設定為您的字體名稱。這是一個例子，作為參考，複製這個是不行的。
```
<fontpattern>Serif-Regular</fontpattern>
<fontpattern>SansSerif-Regular</fontpattern>

<match>
    <test name="family">
        <string>Forevs Demo</string>
    </test>
    <test name="lang">
        <string>zh_Hant</string>
    </test>
    <edit name="family" mode="assign" binding="strong">
        <string>Serif</string>
    </edit>
</match>

<match>
    <test name="family">
        <string>Retail Demo</string>
    </test>
    <test name="lang">
        <string>zh_Hant</string>
    </test>
    <edit name="family" mode="assign" binding="strong">
        <string>SansSerif</string>
    </edit>
</match>
```
