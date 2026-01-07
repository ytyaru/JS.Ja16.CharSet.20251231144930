import unicodedata

def analyze_manifest(manifest_file):
    """
    マニフェストファイルを分析し、文字数、重複、非表示文字を報告する。
    """
    try:
        with open(manifest_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()

        total_chars = len(content)
        unique_chars = len(set(content))
        
        print("--- マニフェストファイル分析結果 ---")
        print(f"総文字数 (len): {total_chars}")
        print(f"ユニーク文字数 (set): {unique_chars}")
        
        if total_chars != unique_chars:
            print(f"警告: {total_chars - unique_chars} 個の重複文字が存在します。")
            # 重複している文字を特定
            seen = set()
            dupes = [c for c in content if c in seen or seen.add(c)]
            print(f"  -> 重複: {' '.join(set(dupes))}")

        invisible_chars = []
        for char in content:
            # 'Cc' (Other, Control), 'Cf' (Other, Format), 'Zs' (Separator, Space) などを検出
            category = unicodedata.category(char)
            if category.startswith('C') or category.startswith('Z'):
                invisible_chars.append(f"U+{ord(char):04X}({category})")

        if invisible_chars:
            print(f"警告: {len(invisible_chars)} 個の非表示/制御文字が検出されました。")
            print(f"  -> 検出リスト: {', '.join(invisible_chars)}")
            
        if total_chars == unique_chars and not invisible_chars:
            print("ファイルはクリーンです。重複や主要な非表示文字はありません。")

    except Exception as e:
        print(f"エラー: {e}")

# --- 実行 ---
if __name__ == "__main__":
    analyze_manifest("aa_manifest.txt")