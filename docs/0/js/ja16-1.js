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
 * 1. 固定長: 1文字を必ず16bit(0x0000-0xFFFF)として解釈。歯抜け（穴）は一切なし。
 * 2. 0x0000-0x00FF (Base256領域):
 *    - 00-63: 数字(0-9), 大文字(A-Z), 小文字(a-z), _, - の順 (Base64URLセットのソート順)
 *    - 64-123: 半角カタカナ (U+FF61 - U+FF9F)
 *    - 124-173: ギリシャ文字小文字 (U+03B1 - U+03C9)
 *    - 174-255: ラテン1補助 (U+00A1-) からメタ文字(/"#$()[]{}*?+|^./:;=!<>@#%~,/)を除外して充填
 * 3. 0x0100-0x0102 (制御・空白): TAB (U+0009), LF (U+000A), SPACE (U+0020)
 * 4. 0x0103-0xFFFF (全領域穴埋め):
 *    - U+3000-303F (和文記号)
 *    - U+3041-30FF (ひらがな・カタカナ)
 *    - U+FF01-FF5E (全角英数・記号)
 *    - IPA文字情報基盤(JIS第1〜4水準)を包含: CJK統合漢字(U+4E00-, U+3400-等)で埋める
 */
export class Ja16 {
    static #toUni = new Map();
    static #fromUni = new Map();
    static #base256ToUni = [];
    static #isInitialized = false;

    static #init() {
        if (this.#isInitialized) return;

        let ja16Idx = 0;
        const add = (uni) => {
            if (ja16Idx > 0xFFFF) return;
            this.#toUni.set(ja16Idx, uni);
            this.#fromUni.set(uni, ja16Idx);
            if (ja16Idx < 256) this.#base256ToUni[ja16Idx] = String.fromCodePoint(uni);
            ja16Idx++;
        };

        // --- SECTION 1: Base256領域 (0x0000 - 0x00FF) ---
        // 0-63: 0-9, A-Z, a-z, _, -
        const b64 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-";
        for (let i = 0; i < b64.length; i++) add(b64.charCodeAt(i)); // Ja16 0x0000 - 0x003F
        // 64-123: 半角カナ
        for (let u = 0xFF61; u <= 0xFF9F; u++) add(u); // Ja16 0x0040 - 0x007B
        // 124-173: ギリシャ
        for (let u = 0x03B1; u <= 0x03C9; u++) if (ja16Idx < 256) add(u); // Ja16 0x007C - 0x00AD
        // 174-255: 安全なラテン1補助
        for (let u = 0x00A1; ja16Idx < 256; u++) {
            const c = String.fromCodePoint(u);
            if (!/[\\"'`$()\[\]{}*?+|^./:;=!<>@#%~]/.test(c)) add(u); // Ja16 0x00AE - 0x00FF
        }

        // --- SECTION 2: 現代制御コード・空白 (0x0100 - 0x0102) ---
        ja16Idx = 0x0100;
        add(0x0009); // TAB (Ja16 0x0100)
        add(0x000A); // LF (Ja16 0x0101)
        add(0x0020); // SPACE (Ja16 0x0102)

        // --- SECTION 3: 記号・かな・全角英数 (0x0103 - ) ---
        for (let u = 0x3000; u <= 0x303F; u++) add(u); // 和文記号 (Ja16 0x0103 - 0x0142)
        for (let u = 0x3041; u <= 0x309F; u++) add(u); // ひらがな (Ja16 0x0143 - 0x01A1)
        for (let u = 0x30A1; u <= 0x30FF; u++) add(u); // カタカナ (Ja16 0x01A2 - 0x0201)
        for (let u = 0xFF01; u <= 0xFF5E; u++) add(u); // 全角英数 (Ja16 0x0202 - 0x025F)

        // --- SECTION 4: 漢字領域・全領域穴埋め ( - 0xFFFF) ---
        // IPA文字情報基盤に含まれる Unicode 範囲を容量いっぱいまで詰める
        const blocks = [
            [0x4E00, 0x9FFF], // CJK統合漢字 (基本)
            [0x3400, 0x4DBF], // 拡張A
            [0xF900, 0xFAFF], // 互換
            [0x20000, 0x2A6DF] // 拡張B (サロゲートペア領域)
        ];
        for (const [start, end] of blocks) {
            for (let u = start; u <= end; u++) {
                if (ja16Idx > 0xFFFF) break;
                if (!this.#fromUni.has(u)) add(u);
            }
        }
        this.#isInitialized = true;
    }

    static fromUTF8(utf8str) {
        this.#init();
        let res = "";
        for (const c of utf8str) {
            const code = c.codePointAt(0);
            const ja16 = this.#fromUni.get(code);
            if (ja16 === undefined) {
                throw new Ja16Error("Ja16規格外の文字が含まれています", c, code);
            }
            res += String.fromCharCode(ja16);
        }
        return res;
    }

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

    static to256(ja16str) {
        this.#init();
        let result = "";
        for (let i = 0; i < ja16str.length; i++) {
            const code = ja16str.charCodeAt(i);
            result += this.#base256ToUni[(code >> 8) & 0xFF] + this.#base256ToUni[code & 0xFF];
        }
        return result;
    }

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

