import { expect, test, describe } from "bun:test";
import { Ja16, Ja16Error } from "./ja16.js";

describe("Ja16 規格網羅性完全テスト", () => {

    test("1. 全コードポイント(0x0000-0xFFFF) 穴埋め一貫性テスト", () => {
        let definedCount = 0;
        for (let i = 0x0000; i <= 0xFFFF; i++) {
            const ja16Char = String.fromCharCode(i);
            const utf8 = Ja16.toUTF8(ja16Char);
            const backToJa16 = Ja16.fromUTF8(utf8);
            expect(backToJa16.charCodeAt(0)).toBe(i);
            definedCount++;

            // --- 特定仕様ポイントの厳密チェック ---
            
            // A. Base256領域 (0x0000-0x00FF)
            if (i >= 0x0000 && i <= 0x003F) {
                // 00-63: 0-9, A-Z, a-z, _, -
                const b64 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
                expect(utf8).toBe(b64[i]);
            }
            
            if (i >= 0x0040 && i <= 0x007B) {
                // 64-123: 半角カタカナ (U+FF61 - U+FF9F)
                const expectedHalfKana = String.fromCodePoint(0xFF61 + (i - 0x0040));
                expect(utf8).toBe(expectedHalfKana);
            }
            
            if (i >= 0x007C && i <= 0x0094) {
                // 124-148: ギリシャ文字小文字 (U+03B1 - U+03C9)
                const expectedGreek = String.fromCodePoint(0x03B1 + (i - 0x007C));
                expect(utf8).toBe(expectedGreek);
            }
            
            if (i >= 0x0095 && i <= 0x00FF) {
                // 149-255: 安全なラテン1補助 (U+00A1 - )
                const metaChars = /[\\"'`$()\[\]{}*?+|^./:;=!<>@#%~,]/;
                expect(utf8).not.toMatch(metaChars);
                expect(utf8.codePointAt(0)).toBeGreaterThanOrEqual(0x00A1);
            }

            // B. セクション2 & 3 & 4 の境界チェック
            if (i === 0x0100) expect(utf8).toBe("\t");
            if (i === 0x0101) expect(utf8).toBe("\n");
            if (i === 0x0102) expect(utf8).toBe(" ");
            
            if (i === 0x0103) expect(utf8).toBe("　"); // U+3000
            if (i === 0x0143) expect(utf8).toBe("ぁ"); // U+3041
            if (i === 0x01A2) expect(utf8).toBe("ァ"); // U+30A1
            if (i === 0x0202) expect(utf8).toBe("！"); // U+FF01
            if (i === 0x0260) expect(utf8).toBe("一"); // 漢字開始位置 (0x0202 + 0x5E = 0x260)
        }
        expect(definedCount).toBe(65536);
    });

    test("2. Base256領域のメタ文字排除テスト (例外: _ と -)", () => {
        const metaChars = /[\\"'`$()\[\]{}*?+|^./:;=!<>@#%~,]/;
        for (let i = 0x0000; i <= 0x00FF; i++) {
            const utf8 = Ja16.toUTF8(String.fromCharCode(i));
            expect(utf8).not.toMatch(metaChars);
        }
    });

    test("3. 巨大連結文字列による一貫性テスト", () => {
        let bigData = "";
        for (let i = 0; i <= 0xFFFF; i++) bigData += String.fromCharCode(i);
        const utf8 = Ja16.toUTF8(bigData);
        const restored = Ja16.fromUTF8(utf8);
        expect(restored).toBe(bigData);

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
        expect(() => Ja16.fromUTF8("🚀")).toThrow(Ja16Error);
        expect(() => Ja16.fromUTF8("🚀")).toThrow("Ja16規格外の文字が含まれています");
    });

    test("5. Base256形式のバリデーションとエラーメッセージ確認", () => {
        expect(() => Ja16.from256("ABC")).toThrow("Base256文字列の長さが不正です(2の倍数が必要)");
        expect(() => Ja16.from256("A!")).toThrow("Base256領域外の文字が含まれています");
    });
});

