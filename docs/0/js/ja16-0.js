/**
 * Ja16 固有の例外クラス
 */
export class Ja16Error extends Error {
    constructor(message, char, codePoint) {
        super(`${message}: "${char}" (U+${codePoint.toString(16).toUpperCase()})`);
        this.name = "Ja16Error";
        this.char = char;
        this.codePoint = codePoint;
    }
}
/**
 * Ja16: 日本語を中心とした英数字・記号を網羅した2バイト(16bit)固定長文字セット
 * 
 * 【不変の仕様詳細】
 * 1. 固定長: 1文字を必ず16bit(Uint16相当)として解釈する。
 * 2. 0x0000-0x00FF (Base256領域):
 *    - 00-63: Base64URL準拠ソート順 (0-9, A-Z, a-z, -, _)
 *    - 64-123: 半角カタカナ (U+FF61 - U+FF9F)
 *    - 124-173: ギリシャ文字小文字 (U+03B1 - U+03C9)
 *    - 174-255: ラテン1補助のうちメタ文字を除外した可視文字 (U+00A1 - )
 * 3. 0x0100-0x0102 (制御・空白): TAB (U+0009), LF (U+000A), SPACE (U+0020)
 * 4. 0x0103-0x04FF (日本語記号・かな・全角英数):
 *    - U+3000-303F (和文記号・句読点)
 *    - U+3041-30FF (ひらがな・カタカナ)
 *    - U+FF01-FF5E (全角英数・記号)
 * 5. 0x0500-0xEEFF (漢字領域): 
 *    - IPA文字情報基盤(JIS第1〜4水準)を包含
 *    - UnicodeのCJK統合漢字(U+4E00-, U+3400-, U+F900-)を順番にマッピング
 * 6. 0xEF00-0xFFFF (予約領域)
 */
export class Ja16 {
    static #toUni = new Map();
    static #fromUni = new Map();
    static #base256ToUni = [];
    static #isInitialized = false;

    static #init() {
        if (this.#isInitialized) return;

        let ja16Idx = 0;
        const add = (ja, uni) => {
            this.#toUni.set(ja, uni);
            this.#fromUni.set(uni, ja);
            if (ja < 256) this.#base256ToUni[ja] = String.fromCodePoint(uni);
        };

        // --- SECTION 1: Base256領域 (0x0000 - 0x00FF) ---
        // 0x00-0x3F: 数字、英字大文字、英字小文字、ハイフン、アンダースコア
        const b64 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
        for (let i = 0; i < b64.length; i++) add(ja16Idx++, b64.charCodeAt(i));
        
        // 0x40-0x7B: 半角カタカナ (U+FF61 - U+FF9F)
        for (let u = 0xFF61; u <= 0xFF9F; u++) add(ja16Idx++, u);
        
        // 0x7C-0xAD: ギリシャ文字小文字 (U+03B1 - U+03C9)
        for (let u = 0x03B1; u <= 0x03C9; u++) if (ja16Idx < 256) add(ja16Idx++, u);
        
        // 0xAE-0xFF: ラテン1補助 (メタ文字 /\\"#$()[]{}*?+|^./:;=!<>@#%~,-/ を除外して充填)
        for (let u = 0x00A1; ja16Idx < 256; u++) {
            const char = String.fromCodePoint(u);
            if (!/[\\"'`$()\[\]{}*?+|^./:;=!<>@#%~,-]/.test(char)) {
                add(ja16Idx++, u);
            }
        }

        // --- SECTION 2: 現代制御コード・空白 (0x0100 - 0x0102) ---
        add(0x0100, 0x0009); // TAB
        add(0x0101, 0x000A); // LF
        add(0x0102, 0x0020); // SPACE (半角)

        // --- SECTION 3: 日本語記号・かな・全角英数 (0x0103 - 0x04FF) ---
        let subIdx = 0x0103;
        // 和文記号・句読点 (U+3000 - U+303F)
        for (let u = 0x3000; u <= 0x303F; u++) add(subIdx++, u);
        // ひらがな・カタカナ (U+3041 - U+30FF)
        for (let u = 0x3041; u <= 0x30FF; u++) add(subIdx++, u);
        // 全角英数字・全角記号 (U+FF01 - U+FF5E)
        for (let u = 0xFF01; u <= 0xFF5E; u++) add(subIdx++, u);

        // --- SECTION 4: 漢字領域 (0x0500 - 0xEEFF) ---
        // JIS第1水準〜第4水準(IPA文字情報基盤)をカバーするためのUnicode漢字ブロック充填
        let kanjiIdx = 0x0500;
        const kanjiBlocks = [
            [0x4E00, 0x9FFF], // CJK統合漢字 (基本)
            [0x3400, 0x4DBF], // CJK統合漢字 拡張A
            [0xF900, 0xFAFF]  // CJK互換漢字
        ];
        for (let [start, end] of kanjiBlocks) {
            for (let u = start; u <= end; u++) {
                if (kanjiIdx > 0xEEFF) break;
                add(kanjiIdx++, u);
            }
        }

        this.#isInitialized = true;
    }

    /**
     * UTF-8(Unicode)文字列をJa16内部コード(16bit文字列)に変換
     * 未定義文字が含まれる場合は Ja16Error を投げる
     */
    static fromUTF8(utf8str) {
        this.#init();
        let res = "";
        for (let c of utf8str) {
            const code = c.codePointAt(0);
            const ja16 = this.#fromUni.get(code);
            if (ja16 === undefined) {
                throw new Ja16Error("Ja16規格外の文字が含まれています", c, code);
            }
            res += String.fromCharCode(ja16);
        }
        return res;
    }

    /**
     * Ja16内部コード(16bit文字列)をUTF-8(Unicode)文字列に復元
     */
    static toUTF8(ja16str) {
        this.#init();
        let res = "";
        for (let i = 0; i < ja16str.length; i++) {
            const code = ja16str.charCodeAt(i);
            const uni = this.#toUni.get(code);
            if (uni === undefined) {
                throw new Error(`不正なJa16コード: 0x${code.toString(16).toUpperCase()}`);
            }
            res += String.fromCodePoint(uni);
        }
        return res;
    }

    /**
     * Ja16をBase256可視化テキスト(0x0000-0x00FF内の文字のみ)に変換
     * 1文字(16bit)を上位・下位8bitずつの2文字に分解する
     */
    static to256(ja16str) {
        this.#init();
        let result = "";
        for (let i = 0; i < ja16str.length; i++) {
            const code = ja16str.charCodeAt(i);
            result += this.#base256ToUni[(code >> 8) & 0xFF] + this.#base256ToUni[code & 0xFF];
        }
        return result;
    }

    /**
     * Base256可視化テキストを元のJa16内部コードに復元
     */
    static from256(ja16on256str) {
        this.#init();
        let result = "";
        const chars = Array.from(ja16on256str);
        if (chars.length % 2 !== 0) {
            throw new Error("Base256文字列の長さが不正です(2の倍数が必要)");
        }
        for (let i = 0; i < chars.length; i += 2) {
            const high = this.#fromUni.get(chars[i].codePointAt(0));
            const low = this.#fromUni.get(chars[i+1].codePointAt(0));
            
            if (high === undefined || high > 255 || low === undefined || low > 255) {
                throw new Error("Base256領域外の文字が含まれています");
            }
            result += String.fromCharCode((high << 8) | low);
        }
        return result;
    }
}
