import json

def create_ja1-6_ascii_mapping(output_file):
    # マスタードキュメント 2.2項で確定済みの97文字
    # 制御文字はエスケープシーケンスで表現
    # 修正点: バックスラッシュ `\` を `\\` としてエスケープ
    ascii_chars = (
        list("0123456789") +
        list("ABCDEFGHIJKLMNOPQRSTUVWXYZ") +
        list("abcdefghijklmnopqrstuvwxyz") +
        list("_-") +
        list("!\"#$%&'()*+,-./:;<=>?@[\\]^`{|}~".replace('\\', '\\\\')) +
        ['\t', '\n', ' ']
    )
    
    # 自己検証ステップ
    if len(ascii_chars) != 97:
        print(f"【自己検証エラー】: 文字数が97ではありません。現在 {len(ascii_chars)} 文字です。出力を停止します。")
        return

    mapping_data = []
    start_address = 0x0000

    for i, char in enumerate(ascii_chars):
        ja16_code = start_address + i
        
        mapping_data.append({
            "ja16_code": f"0x{ja16_code:04X}",
            "char": char,
            "unicode_ref": f"U+{ord(char):04X}"
        })

    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(mapping_data, f, indent=2, ensure_ascii=False)
        
        print(f"成功: {len(ascii_chars)}文字のASCII抜粋データを '{output_file}' に保存しました。")
        print(f"Ja16の割り当て範囲: 0x0000 〜 0x0060")

    except Exception as e:
        print(f"エラーが発生しました: {e}")

# --- 実行 ---
if __name__ == "__main__":
    create_ja16_ascii_mapping("ja16_ascii.json")
