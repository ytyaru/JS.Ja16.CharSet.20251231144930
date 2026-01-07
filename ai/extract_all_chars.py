from fontTools.ttLib import TTFont

# --- 設定 ---
FONT_FILE = 'Saitamaar.woff2'
OUTPUT_FILE = 'aa_manifest_full.txt'

# --- メイン処理 ---
try:
    font = TTFont(FONT_FILE)
    codes = font.getBestCmap().keys()

    def is_excluded(cp):
        if cp <= 0x007F: return True
        if 0x3000 <= cp <= 0x30FF: return True
        if 0x4E00 <= cp <= 0x9FFF: return True
        if 0x2200 <= cp <= 0x25FF: return True
        return False

    # 非表示文字も含めて、すべての文字をリスト化
    result_chars = [chr(c) for c in sorted(codes) if not is_excluded(c)]
    
    # ファイルへ直接書き出す
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write(''.join(result_chars))
        
    print(f"成功: {len(result_chars)} 文字を '{OUTPUT_FILE}' に保存しました。")
    print("このファイルには非表示文字も含まれています。")

except FileNotFoundError:
    print(f"エラー: フォントファイル '{FONT_FILE}' が見つかりません。")
except Exception as e:
    print(f"エラー: {e}")