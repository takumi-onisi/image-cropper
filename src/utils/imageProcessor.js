import Cropper from "cropperjs";
import { CROPPER_TEMPLATE } from "../constants/cropperTemplate";

/**
 * imgElement と設定から切り抜き済みCanvasを生成する
 * @param {HTMLImageElement} imgElement - 読み込み済みの画像要素
 * @param {object} cropConfig - 切り抜き設定 { selection: {x, y, width, height}, transform: [...] }
 * @returns {Promise<HTMLCanvasElement>} 切り抜かれたCanvas要素
 */
export async function performCropping(imgElement, cropConfig) {
  // Cropperのインスタンス生成
  const tempCropper = new Cropper(imgElement, { template: CROPPER_TEMPLATE });

  // 準備完了を待機
  await tempCropper.getCropperImage().$ready();

  const selection = tempCropper.getCropperSelection();
  const image = tempCropper.getCropperImage();

  // 設定の適用
  selection.x = cropConfig.selection.x;
  selection.y = cropConfig.selection.y;
  selection.width = cropConfig.selection.width;
  selection.height = cropConfig.selection.height;
  image.$setTransform(...cropConfig.transform);

  // 切り抜き実行
  const canvas = await selection.$toCanvas();

  // 後片付け
  tempCropper.destroy();

  return canvas;
}
