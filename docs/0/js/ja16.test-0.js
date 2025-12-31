import { expect, test, describe } from "bun:test";
import { Ja16, Ja16Error } from "./ja16.js";

// Ja16 クラスと Ja16Error クラスが定義されている前提
describe("Ja16 規格網羅性完全テスト", () => {

    test("1. 全コードポイントの双方向一貫性と仕様一致テスト", () => {
        let definedCount = 0;

        for (let i = 0x0000; i <= 0xFFFF; i++) {
            // Ja16の内部コードからUnicodeへの変換を試みる
            const utf8 = Ja16.toUTF8(String.fromCharCode(i));
            
            // 予約領域(0xEF00-0xFFFF)以外で、定義されているはずの箇所を確認
            if (i < 0xEF00) {
                // 1.1 相互変換の完全性
                const backToJa16 = Ja16.fromUTF8(utf8);
                expect(backToJa16.charCodeAt(0)).toBe(i);
                definedCount++;

                // 1.2 特定の仕様ポイントの抜き打ちチェック
                if (i === 0x0000) expect(utf8).toBe("0");
                if (i === 0x003F) expect(utf8).toBe("_");
                if (i === 0x0100) expect(utf8).toBe("\t");
                if (i === 0x0101) expect(utf8).toBe("\n");
                if (i === 0x0102) expect(utf8).toBe(" ");
                if (i === 0x0200) expect(utf8).toBe("ぁ");
                if (i === 0x0500) expect(utf8).toBe("一");
            }
        }
        console.log(`検証済み定義済み文字数: ${definedCount} 文字`);
    });

    test("2. Base256領域のメタ文字完全排除テスト", () => {
        // 全Ja16文字(0-65535)をto256し、使われている文字が安全か確認
        // 実際には上位8bit/下位8bitの組み合わせなので、内部のbase256表をチェックすれば十分
        const metaChars = /[\\"'`$()\[\]{}*?+|^./:;=!<>@#%~,-]/;
        
        for (let i = 0x0000; i <= 0xFFFF; i++) {
            const encoded = Ja16.to256(String.fromCharCode(i));
            expect(encoded.length).toBe(2);
            expect(encoded[0]).not.toMatch(metaChars);
            expect(encoded[1]).not.toMatch(metaChars);
        }
    });

    test("3. 巨大連結文字列による一貫性テスト", () => {
        let allChars = "";
        // 定義されている全文字(0x0000 - 0xEEFF)を連結
        for (let i = 0x0000; i < 0xEEFF; i++) {
            allChars += String.fromCharCode(i);
        }

        // UTF8変換テスト
        const utf8 = Ja16.toUTF8(allChars);
        const restored = Ja16.fromUTF8(utf8);
        expect(restored).toBe(allChars);

        // Base256変換テスト
        const b256 = Ja16.to256(allChars);
        const restoredFrom256 = Ja16.from256(b256);
        expect(restoredFrom256).toBe(allChars);
        expect(b256.length).toBe(allChars.length * 2);
    });

    test("4. 自然言語文章の相互変換テスト", () => {
        const sentences = [
            "こんにちは、世界！2025年。- _",
            "TAB\tとLF\nのテスト。",
            "JIS第4水準漢字の範囲: 𠀋" // これはサロゲートペアなのでエラーになるはず
        ];

        // 正常系
        const normal = sentences[0];
        expect(Ja16.toUTF8(Ja16.fromUTF8(normal))).toBe(normal);
        
        const symbols = sentences[1];
        expect(Ja16.toUTF8(Ja16.fromUTF8(symbols))).toBe(symbols);

        // 異常系 (サロゲートペア/未定義文字)
        expect(() => Ja16.fromUTF8("🚀")).toThrow(Ja16Error);
        expect(() => Ja16.fromUTF8("𠀋")).toThrow(Ja16Error);
    });

    test("5. Base256形式のバリデーションテスト", () => {
        // 奇数長のデータはエラー
        expect(() => Ja16.from256("ABC")).toThrow(/長さが不正/);
        
        // Base256領域外の文字(例: '!')が含まれる場合のエラー
        // ※ '!' はマッピング時に排除されているため、toUni.get('!') は undefined になる
        expect(() => Ja16.from256("A!")).toThrow();
    });
});

