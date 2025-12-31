import { expect, test, describe } from "bun:test";
import { Ja16, Ja16Error } from "./ja16.js";

describe("Ja16 規格網羅性完全テスト", () => {

    test("1. 全コードポイント(0x0000-0xFFFF) 穴埋め一貫性テスト", () => {
        let definedCount = 0;
        for (let i = 0x0000; i <= 0xFFFF; i++) {
            const ja16Char = String.fromCharCode(i);
            // 全てのコードポイントで例外が出ず、双方向に復元できること
            const utf8 = Ja16.toUTF8(ja16Char);
            const backToJa16 = Ja16.fromUTF8(utf8);
            expect(backToJa16.charCodeAt(0)).toBe(i);
            definedCount++;

            // 特定仕様ポイントの厳密チェック
            if (i === 0x0000) expect(utf8).toBe("0");
            if (i === 0x0009) expect(utf8).toBe("9");
            if (i === 0x000A) expect(utf8).toBe("A");
            if (i === 0x0023) expect(utf8).toBe("Z");
            if (i === 0x003D) expect(utf8).toBe("z");
            if (i === 0x003E) expect(utf8).toBe("_"); // 順序変更後の確認
            if (i === 0x003F) expect(utf8).toBe("-"); // 順序変更後の確認
            if (i === 0x0100) expect(utf8).toBe("\t");
            if (i === 0x0101) expect(utf8).toBe("\n");
            if (i === 0x0102) expect(utf8).toBe(" ");
            if (i === 0x0143) expect(utf8).toBe("ぁ"); // 和文記号の直後
        }
        expect(definedCount).toBe(65536);
        console.log(`検証済み文字数: ${definedCount}`);
    });

    test("2. Base256領域のメタ文字排除テスト (例外: _ と -)", () => {
        // _(0x3E) と -(0x3F) 以外のメタ文字が含まれていないことを全数チェック
        const metaChars = /[\\"'`$()\[\]{}*?+|^./:;=!<>@#%~,]/;
        for (let i = 0x0000; i <= 0x00FF; i++) {
            const utf8 = Ja16.toUTF8(String.fromCharCode(i));
            expect(utf8).not.toMatch(metaChars);
        }
    });

    test("3. 巨大連結文字列による一貫性テスト", () => {
        // 全文字連結
        let bigData = "";
        for (let i = 0; i <= 0xFFFF; i++) bigData += String.fromCharCode(i);
        
        // UTF8変換・復元
        const utf8 = Ja16.toUTF8(bigData);
        const restored = Ja16.fromUTF8(utf8);
        expect(restored).toBe(bigData);

        // Base256変換・復元
        const b256 = Ja16.to256(bigData);
        expect(b256.length).toBe(bigData.length * 2);
        expect(Ja16.from256(b256)).toBe(bigData);
    });

    test("4. 自然言語文章の相互変換テスト", () => {
        const sentences = [
            "こんにちは、世界！2025年。_ -",
            "TAB\tとLF\nのテスト。",
            "漢字テスト：文字情報基盤、JIS第4水準。"
        ];

        for (const s of sentences) {
            const enc = Ja16.fromUTF8(s);
            expect(Ja16.toUTF8(enc)).toBe(s);
            const b256 = Ja16.to256(enc);
            expect(Ja16.toUTF8(Ja16.from256(b256))).toBe(s);
        }

        // 異常系: 未定義サロゲートペア（絵文字）で指定のメッセージが出るか
        expect(() => Ja16.fromUTF8("🚀")).toThrow(Ja16Error);
        expect(() => Ja16.fromUTF8("🚀")).toThrow("Ja16規格外の文字が含まれています");
    });

    test("5. Base256形式のバリデーションとエラーメッセージ確認", () => {
        // 奇数長エラー
        expect(() => Ja16.from256("ABC")).toThrow("Base256文字列の長さが不正です(2の倍数が必要)");
        
        // Base256領域外（例: "!" U+0021 は排除済み）が含まれる場合
        expect(() => Ja16.from256("A!")).toThrow("Base256領域外の文字が含まれています");
    });
});

