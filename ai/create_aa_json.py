import json

def create_ja16_aa_mapping(manifest_file, output_file, start_address_hex):
    """
    AA文字マニフェストからJa16のマッピングJSONを生成する。
    """
    try:
        # 1. マニフェストファイルをUTF-8で読み込む
        with open(manifest_file, 'r', encoding='utf-8') as f:
            content = f.read().strip()
        
        # 2. 文字をUnicodeコードポイント順にソート
        sorted_chars = sorted(list(content))
        
        # 3. 開始アドレスを10進数に変換
        start_address = int(start_address_hex, 16)
        
        mapping_data = []
        current_address = start_address
        
        # 4. 1文字ずつマッピングデータを作成
        for char in sorted_chars:
            ja16_codepoint_hex = f"0x{current_address:04X}"
            unicode_codepoint_hex = f"U+{ord(char):04X}"
            
            mapping_data.append({
                "ja16_code": ja16_codepoint_hex,
                "char": char,
                "unicode_ref": unicode_codepoint_hex
            })
            
            current_address += 1
            
        # 5. JSONファイルとして保存
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(mapping_data, f, indent=2, ensure_ascii=False)
            
        print(f"成功: {len(sorted_chars)}文字のマッピングデータを '{output_file}' に保存しました。")
        print(f"Ja16の割り当て範囲: {hex(start_address)} 〜 {hex(current_address - 1)}")

    except FileNotFoundError:
        print(f"エラー: 入力ファイル '{manifest_file}' が見つかりません。")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

# --- 実行設定 ---
if __name__ == "__main__":
    # 入力ファイル名（2,712文字のテキスト）
    INPUT_MANIFEST = "aa_manifest_full.txt" # aa_manifest.txt
    
    # 出力JSONファイル名
    OUTPUT_JSON = "ja16_aa.json" # ja16_aa_mapping.json
    
    # Ja16におけるAAブロックの開始アドレス（仮）
    # これは非漢字領域の先頭 0x0061 から始まるものとする
    START_ADDRESS_HEX = "0x0061" 
    
    create_ja16_aa_mapping(INPUT_MANIFEST, OUTPUT_JSON, START_ADDRESS_HEX)
