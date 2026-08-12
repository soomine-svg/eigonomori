/**
 * えいごのもり カメラ翻訳バックエンド (Google Apps Script)
 *
 * 流れ: アプリから写真(base64)を受け取る
 *       → GoogleドライブのOCRで英語の文字を読み取る(一時ファイルは即削除)
 *       → Google翻訳(LanguageApp)で日本語化
 *       → JSONで返す
 *
 * 費用: ゼロ。Googleアカウントの標準機能のみ。
 * 注意: デプロイURLを知っている人は誰でも使えます(家族用なので許容)。
 *
 * 設置手順(しをりさん作業・約5分):
 *   1. script.google.com → 新しいプロジェクト
 *   2. このファイルの中身を貼り付け
 *   3. 左メニュー「サービス」の＋ → 「Drive API」を追加(バージョンv2のまま)← これを忘れると動きません
 *   4. デプロイ → 新しいデプロイ → 種類:ウェブアプリ
 *      - 実行ユーザー: 自分
 *      - アクセス: 全員
 *   5. 出てきたURL(https://script.google.com/macros/s/xxxx/exec)をClaudeに渡す
 *      → index.html の GAS_URL に差し込んでpushします
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var b64 = data.image.indexOf(",") !== -1 ? data.image.split(",")[1] : data.image;
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), "image/jpeg", "eigonomori-ocr.jpg");

    // 画像をOCRつきでGoogleドキュメントに変換して文字を取り出す
    // (mimeTypeは指定しない: ocr:true が画像→ドキュメント変換を行う)
    var file = Drive.Files.insert(
      { title: "eigonomori-ocr-temp" },
      blob,
      { ocr: true, ocrLanguage: "en" }
    );
    var text = "";
    try {
      text = DocumentApp.openById(file.id).getBody().getText().trim();
    } finally {
      Drive.Files.remove(file.id); // 一時ファイルは必ず削除
    }

    var ja = text ? LanguageApp.translate(text, "en", "ja") : "";
    return ContentService.createTextOutput(JSON.stringify({ ok: true, text: text, ja: ja }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
