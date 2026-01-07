import json
import re

def create_ja16_jis_mapping(input_file, output_file):
    """
    JIS X 0213非漢字のUnicodeリストからマッピングJSONを生成する。
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # "U+XXXX" 形式のコードポイントをすべて抽出
        unicode_hex_codes = re.findall(r'U\+([0-9A-Fa-f]{4,5})', content)
        
        if not unicode_hex_codes:
            print(f"エラー: '{input_file}' からUnicodeコードポイントが見つかりませんでした。")
            return

        # 16進数文字列を整数に変換し、ソート
        codepoints = sorted([int(code, 16) for code in unicode_hex_codes])
        
        mapping_data = []
        
        for cp in codepoints:
            mapping_data.append({
                # "ja16_code" は、全JSONを統合する際に後から割り当てる
                "ja16_code": None, 
                "char": chr(cp),
                "unicode_ref": f"U+{cp:04X}"
            })
            
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(mapping_data, f, indent=2, ensure_ascii=False)
            
        print(f"成功: {len(codepoints)}文字のJIS非漢字データを '{output_file}' に保存しました。")

    except FileNotFoundError:
        print(f"エラー: 入力ファイル '{input_file}' が見つかりません。")
    except Exception as e:
        print(f"エラーが発生しました: {e}")

# --- 実行設定 ---
if __name__ == "__main__":
    create_ja16_jis_mapping("jis_non_kanji_unicodes.txt", "ja16_jis.json")