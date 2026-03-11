import Cropper from "cropperjs";
import { CROPPER_TEMPLATE } from "../constants/cropperTemplate";

/**
 * imgElement と設定から切り抜き済みCanvasを生成する
 * @param {HTMLImageElement} imgElement - 読み込み済みの画像要素
 * @param {object} cropConfig - 切り抜き設定 { selection: {x, y, width, height}, transform: [...] }
 * @returns {Promise<HTMLCanvasElement>} 切り抜かれたCanvas要素
 */
export async function performCropping(imgElement, cropConfig) {
  const tempCropper = new Cropper(imgElement, { template: CROPPER_TEMPLATE });
  await tempCropper.getCropperImage().$ready();

  const selection = tempCropper.getCropperSelection();
  const image = tempCropper.getCropperImage();

  // 1. まず、画像と選択範囲の状態を完全に復元する
  image.$setTransform(...cropConfig.transform);
  selection.x = cropConfig.selection.x;
  selection.y = cropConfig.selection.y;
  selection.width = cropConfig.selection.width;
  selection.height = cropConfig.selection.height;

  // 2. 復元後の正しい表示幅から比率を出す
  const zoomScale = cropConfig.transform[0];
  const baseImageWidth = cropConfig.baseSize.width;
  const currentDisplayedWidth = baseImageWidth * zoomScale;
  
  // selection.width は「表示上のサイズ」なので、これに対して
  // 「オリジナル画像幅 / 現在の表示幅」を掛ければオリジナルサイズに戻る
  const ratio = imgElement.naturalWidth / currentDisplayedWidth;
  
  const targetWidth = selection.width * ratio;
  const targetHeight = selection.height * ratio;

  // 3. 【重要】計算したサイズを明示的に渡す
  const canvas = await selection.$toCanvas({
    width: Math.round(targetWidth),
    height: Math.round(targetHeight)
  });

  tempCropper.destroy();
  return canvas;
}

/**
 * Canvas要素をBlobに変換する
 * @param {HTMLCanvasElement} canvas - 対象のCanvas要素
 * @param {string} [type="image/png"] - MIMEタイプ（"image/jpeg", "image/webp" など）
 * @param {number} [quality=1.0] - 1.0を指定して劣化を最小限にする
 * @returns {Promise<Blob>}
 */
export const canvasToBlob = (canvas, type = "image/png", quality = 1.0) => {
  return new Promise((resolve, reject) => {
    // type に基づいて Blob に変換
    // JPEG/WebP の場合は第3引数で画質を指定可能
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error(`${type} への変換に失敗しました`));
        }
      },
      type,
      quality,
    );
  });
};

/**
 * @typedef {Object} CanvasItem
 * @property {string} name - 元のファイル名（拡張子付き）
 * @property {HTMLCanvasElement} canvas - 処理済みのCanvas要素
 */

/**
 * 1つのCanvasアイテムを、ZIP保存用のデータ構造（Blobと新しい拡張子のファイル名）に変換する
 *
 * @param {CanvasItem} canvasItem - 変換対象のCanvasと名前のセット
 * @param {string} [type="image/png"] - 出力する画像のMIMEタイプ
 * @returns {Promise<{name: string, blob: Blob}>} ZIPに追加するためのファイル名とBlobのオブジェクト
 */
export const convertToZipItem = async (canvasItem, type = "image/png") => {
  // 1. 指定された形式でBlobに変換（前述のutilsを使用）
  const blob = await canvasToBlob(canvasItem.canvas, type);

  // 2. MIMEタイプから拡張子を決定 (例: "image/jpeg" -> "jpg")
  // ※PNGの場合はそのまま "png"、JPEGの場合は "jpg" に変換する
  let extension = type.split("/")[1];
  if (extension === "jpeg") extension = "jpg";

  // 3. 元の拡張子を除去して新しい拡張子を付ける
  const fileName = `${canvasItem.name.replace(/\.[^/.]+$/, "")}.${extension}`;

  return { name: fileName, blob };
};
