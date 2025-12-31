import { expect, test, describe } from "bun:test";
import { Ja16, Ja16Error } from "./ja16.js";

describe("Ja16 規格網羅性完全テスト (全コードポイント全文字検証)", () => {

    test("1. 全領域(0x0000-0xFFFF)の仕様一致と相互変換テスト", () => {
        let count = 0;
        const b64Str = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";

        for (let i = 0x0000; i <= 0xFFFF; i++) {
            const ja16Char = String.fromCharCode(i);
            const utf8 = Ja16.toUTF8(ja16Char);
            
            // --- 0x0000 - 0xFFFF 全文字の相互変換整合性確認 ---
            const back = Ja16.fromUTF8(utf8);
            expect(back.charCodeAt(0)).toBe(i);

            // --- セクション別・詳細コードポイント検証 ---

            // SECTION 1: Base256
            if (i >= 0x0000 && i <= 0x003F) {
                expect(utf8).toBe(b64Str[i]);
            } else if (i >= 0x0040 && i <= 0x007E) {
                expect(utf8).toBe(String.fromCodePoint(0xFF61 + (i - 0x0040)));
            } else if (i >= 0x007F && i <= 0x0097) {
                expect(utf8).toBe(String.fromCodePoint(0x03B1 + (i - 0x007F)));
            } else if (i >= 0x0098 && i <= 0x00FF) {
                const meta = /[\\"'`$()\[\]{}*?+|^./:;=!<>@#%~,]/;
                expect(utf8).not.toMatch(meta);
                expect(utf8.codePointAt(0)).toBeGreaterThanOrEqual(0x00A1);
            }
            
            // SECTION 2: 制御・空白
            else if (i === 0x0100) expect(utf8).toBe("\t");
            else if (i === 0x0101) expect(utf8).toBe("\n");
            else if (i === 0x0102) expect(utf8).toBe(" ");

            // SECTION 3: 記号・かな・全角英数
            else if (i >= 0x0103 && i <= 0x0142) {
                expect(utf8).toBe(String.fromCodePoint(0x3000 + (i - 0x0103)));
            } else if (i >= 0x0143 && i <= 0x01A1) {
                expect(utf8).toBe(String.fromCodePoint(0x3041 + (i - 0x0143)));
            } else if (i >= 0x01A2 && i <= 0x0200) {
                expect(utf8).toBe(String.fromCodePoint(0x30A1 + (i - 0x01A2)));
            } else if (i >= 0x0201 && i <= 0x025E) {
                expect(utf8).toBe(String.fromCodePoint(0xFF01 + (i - 0x0201)));
            }
            
            // SECTION 4: 漢字領域 (開始位置の特定)
            else if (i === 0x025F) {
                expect(utf8).toBe("一"); // U+4E00
            }

            count++;
        }
        expect(count).toBe(65536);
    });

    test("2. Base256可視化整合性テスト", () => {
        // 全文字に対してto256 -> from256が機能するか
        for (let i = 0x0000; i <= 0xFFFF; i += 100) { // 高速化のためステップ実行
            const ja16 = String.fromCharCode(i);
            const b256 = Ja16.to256(ja16);
            expect(b256.length).toBe(2);
            expect(Ja16.from256(b256)).toBe(ja16);
        }
    });

    test("3. エラーハンドリングとメッセージの完全一致テスト", () => {
        // 規格外文字 (絵文字)
        const emoji = "🚀";
        expect(() => Ja16.fromUTF8(emoji)).toThrow(Ja16Error);
        expect(() => Ja16.fromUTF8(emoji)).toThrow("Ja16規格外の文字が含まれています");

        // Base256形式エラー (奇数長)
        expect(() => Ja16.from256("ABC")).toThrow("Base256文字列の長さが不正です(2の倍数が必要)");

        // Base256形式エラー (範囲外文字 '!' U+0021)
        expect(() => Ja16.from256("A!")).toThrow("Base256領域外の文字が含まれています");
    });

    test("4. 巨大データ変換整合性テスト", () => {
        let allChars = "";
        for (let i = 0; i <= 0xFFFF; i++) allChars += String.fromCharCode(i);
        const utf8 = Ja16.toUTF8(allChars);
        expect(Ja16.fromUTF8(utf8)).toBe(allChars);
        const b256 = Ja16.to256(allChars);
        expect(Ja16.from256(b256)).toBe(allChars);
    });
});

